import React, { useState, useEffect, useRef } from "react";
import { getDatabase, ref, onValue, set, remove, get } from "firebase/database";
import { getAuth } from "firebase/auth";
import "./CoursePage.css";

function CoursePage() {
  const [mainCourses, setMainCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [subCourses, setSubCourses] = useState([]);
  const [selectedSubCourse, setSelectedSubCourse] = useState("");
  const selectedSubCourseRef = useRef(""); // Use ref to store the selected sub-course
  const [error, setError] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [answers, setAnswers] = useState([{ text: "", correct: false }]);
  const [editQuestionIndex, setEditQuestionIndex] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [newSubCourseName, setNewSubCourseName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserDepartment, setCurrentUserDepartment] = useState("");
  const [media, setMedia] = useState({ images: [], videos: [] });
  const [newImageUrl, setNewImageUrl] = useState("");
  const filteredCourses = mainCourses.filter(
    (course) => course.department === currentUserDepartment
  );

  const [newVideoUrl, setNewVideoUrl] = useState("");

  const db = getDatabase();

  useEffect(() => {
    selectedSubCourseRef.current = selectedSubCourse;
  }, [selectedSubCourse]);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const userEmail = user.email;
      const usersRef = ref(db, "users");
      onValue(
        usersRef,
        (snapshot) => {
          const usersData = snapshot.val();
          const userData = Object.values(usersData).find(
            (u) => u.email === userEmail
          );
          if (userData) {
            setCurrentUserRole(userData.role);
            setCurrentUserDepartment(userData.department || "");
          } else {
            console.error("User data not found for email:", userEmail);
          }
        },
        (error) => {
          console.error("Error fetching user data:", error);
        }
      );
    }
  }, [db]);

  useEffect(() => {
    const coursesRef = ref(db, "courses/mainCourses");
    const unsubscribe = onValue(coursesRef, (snapshot) => {
      const coursesData = snapshot.val();
      const coursesArray = coursesData
        ? Object.keys(coursesData).map((key) => ({
            id: key,
            ...coursesData[key],
          }))
        : [];
      setMainCourses(coursesArray);
    });

    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    if (selectedCourse) {
      const subCoursesRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses`
      );
      const unsubscribe = onValue(subCoursesRef, (snapshot) => {
        const subCoursesData = snapshot.val();
        const subCoursesArray = subCoursesData
          ? Object.keys(subCoursesData).map((key) => ({
              id: key,
              ...subCoursesData[key],
            }))
          : [];
        setSubCourses(subCoursesArray);

        // Re-set selectedSubCourse from the ref to avoid losing the selected sub-course
        if (selectedSubCourseRef.current) {
          setSelectedSubCourse(selectedSubCourseRef.current);
        }
      });

      return () => unsubscribe();
    }
  }, [db, selectedCourse]);

  useEffect(() => {
    if (selectedCourse && selectedSubCourse) {
      const questionsRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
      );

      const unsubscribeQuestions = onValue(questionsRef, (snapshot) => {
        const questionsData = snapshot.val();
        const questionsArray = questionsData
          ? Object.keys(questionsData).map((key) => ({
              id: key,
              ...questionsData[key],
            }))
          : [];
        setQuestions(questionsArray);
      });

      return () => unsubscribeQuestions();
    }
  }, [db, selectedCourse, selectedSubCourse]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEditQuestion = (question) => {
    setNewQuestion(question.text);
    setAnswers(question.answers);
    setEditQuestionIndex(question.id);
  };

  const handleUpdateQuestion = async () => {
    const questionRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions/${editQuestionIndex}`
    );

    try {
      await set(questionRef, {
        text: newQuestion,
        answers: answers,
      });
      setNewQuestion("");
      setAnswers([{ text: "", correct: false }]);
      setEditQuestionIndex(null);
      setError("");
    } catch (error) {
      setError("Failed to update question: " + error.message);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const questionRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions/${questionId}`
    );

    try {
      await remove(questionRef);
    } catch (error) {
      setError("Failed to delete question: " + error.message);
    }
  };

  const handleAddCourse = () => {
    const courseRef = ref(db, `courses/mainCourses/${newCourseName}`);
    set(courseRef, {
      name: newCourseName,
      thumbnail: thumbnail,
      department: currentUserDepartment,
    });

    setNewCourseName("");
    setThumbnail("");
  };

  const handleAddSubCourse = () => {
    const subCourseRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${newSubCourseName}`
    );
    set(subCourseRef, { name: newSubCourseName });

    setNewSubCourseName("");
  };

  const handleAddNewQuestion = async () => {
    const newQuestionRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions/${newQuestion}`
    );

    try {
      await set(newQuestionRef, {
        text: newQuestion,
        answers: answers,
      });
      setNewQuestion("");
      setAnswers([{ text: "", correct: false }]);
      setShowPopup(false);
      setError("");
    } catch (error) {
      setError("Failed to add question: " + error.message);
    }
  };

  const handleEditAnswer = (answer) => {
    const questionToEdit = questions.find((q) =>
      q.answers.some((a) => a.id === answer.id)
    );
    if (questionToEdit) {
      setNewQuestion(questionToEdit.text); // Set the question being edited
      const answerIndex = questionToEdit.answers.findIndex(
        (a) => a.id === answer.id
      );
      const answerToEdit = questionToEdit.answers[answerIndex];
      setAnswers((prevAnswers) => {
        const updatedAnswers = [...prevAnswers];
        updatedAnswers[answerIndex] = answerToEdit; // Update the specific answer being edited
        return updatedAnswers;
      });
      setEditQuestionIndex(questionToEdit.id); // You might need to adjust this depending on how you structure editing
    }
  };

  const handleAddAnswer = () => {
    setAnswers([...answers, { text: "", correct: false }]);
  };
  const handleDeleteAnswer = async (answerId) => {
    const questionRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions/${editQuestionIndex}/answers/${answerId}`
    );

    try {
      await remove(questionRef);
    } catch (error) {
      setError("Failed to delete answer: " + error.message);
    }
  };

  const handleAddMedia = async () => {
    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
    );

    const newMedia = {
      images: newImageUrl ? [{ url: newImageUrl, id: Date.now() }] : [],
      videos: newVideoUrl ? [{ url: newVideoUrl, id: Date.now() }] : [],
    };

    if (newMedia.images.length > 0 || newMedia.videos.length > 0) {
      try {
        const snapshot = await get(mediaRef);
        const existingMedia = snapshot.val() || { images: [], videos: [] };

        const currentMedia = {
          images: Array.isArray(existingMedia.images)
            ? existingMedia.images
            : [],
          videos: Array.isArray(existingMedia.videos)
            ? existingMedia.videos
            : [],
        };

        currentMedia.images.push(...newMedia.images);
        currentMedia.videos.push(...newMedia.videos);

        await set(mediaRef, currentMedia);
        setNewImageUrl("");
        setNewVideoUrl("");
        setMedia(currentMedia);
      } catch (error) {
        setError("Failed to add media: " + error.message);
      }
    } else {
      setError("Please provide at least one image or video URL.");
    }
  };

  const handleDeleteMedia = async (mediaType, mediaId) => {
    console.log(`Deleting ${mediaType} with ID: ${mediaId}`);
    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
    );

    try {
      const snapshot = await get(mediaRef);
      const existingMedia = snapshot.val();

      if (!existingMedia) {
        console.error("No media found");
        setError("No media found");
        return;
      }

      console.log("Existing media:", existingMedia);

      // تحديد الوسائط الموجودة، وتعديل فقط النوع المحدد (images أو videos)
      if (mediaType === "images" && existingMedia.images) {
        existingMedia.images = existingMedia.images.filter(
          (item) => item.id !== mediaId
        );
      } else if (mediaType === "videos" && existingMedia.videos) {
        existingMedia.videos = existingMedia.videos.filter(
          (item) => item.id !== mediaId
        );
      } else {
        console.error("Invalid media type or no media to delete");
        return;
      }

      console.log("Updated media:", existingMedia);

      // تحديث البيانات في قاعدة البيانات
      await set(mediaRef, existingMedia);

      const newSnapshot = await get(mediaRef);
      console.log("Media after update:", newSnapshot.val());

      setMedia(existingMedia); // تحديث الحالة للواجهة الأمامية
    } catch (error) {
      console.error("Error during delete:", error);
      setError("Failed to delete media: " + error.message);
    }
  };

  // Rest of your code...

  useEffect(() => {
    if (selectedCourse && selectedSubCourse) {
      const mediaRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
      );
      const unsubscribe = onValue(mediaRef, (snapshot) => {
        const mediaData = snapshot.val() || { images: [], videos: [] };
        setMedia(mediaData);
      });

      return () => unsubscribe();
    }
  }, [db, selectedCourse, selectedSubCourse]);

  // Rest of your JSX...

  return (
    <div className="course-page">
      <h1>Courses Management</h1>

      <details>
        <summary>Add New</summary>
        <div className="course-management-content">
          <div className="add-course-section">
            <div className="courses-container">
              <h2>Main Courses</h2>

              <div className="course-buttons">
                {filteredCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourse(course.id);
                    }}
                  >
                    {course.name}
                  </button>
                ))}
              </div>
              <div className="course-form-box">
                <h2>Add New Course</h2>
                <div className="add-course-form">
                  <input
                    type="text"
                    placeholder="Enter new course name"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                  />
                </div>

                {/* مربع تحميل صورة الدورة */}
                <h2>Upload Course Thumbnail</h2>
                <div className="add-course-form">
                  <input
                    type="text"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    placeholder="Enter thumbnail URL (Dropbox link)"
                  />
                  <button onClick={handleAddCourse}>Add Course</button>
                </div>
              </div>
            </div>

            {/* حاوية المربعات */}
            <div className="forms-container">
              {/* مربع إضافة دورة جديدة */}
              <div className="courses-container">
                <h2>Sub Courses</h2>
                <div className="sub-course-buttons">
                  {subCourses.map((subCourse) => (
                    <button key={subCourse.id} value={subCourse.id} disabled>
                      {subCourse.name}
                    </button>
                  ))}
                </div>

                {/* مربع إضافة الدورات الفرعية */}
                <div className="sub-course-box">
                  <h2>Add Sub Courses</h2>
                  <div className="add-sub-course-form">
                    <input
                      type="text"
                      value={newSubCourseName}
                      onChange={(e) => setNewSubCourseName(e.target.value)}
                      placeholder="Add new sub-course"
                    />
                  </div>
                  <button className="a1" onClick={handleAddSubCourse}>
                    Add Sub-Course
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>

      <details>
        <summary>Manage Content</summary>
        <div className="course-media-container">
          <div className="course-selection-container">
            <div className="course-selection">
              <div className="course-dropdown">
                <h2>Main Courses</h2>

                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="dropdown"
                >
                  <option value="" disabled>
                    Select a main course
                  </option>
                  {filteredCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="course-dropdown">
                <h2>Sub Courses</h2>
                <select
                  value={selectedSubCourse}
                  onChange={(e) => setSelectedSubCourse(e.target.value)}
                  className="dropdown"
                  disabled={!selectedCourse}
                >
                  <option value="" disabled>
                    Select a sub-course
                  </option>
                  {subCourses.map((subCourse) => (
                    <option key={subCourse.id} value={subCourse.id}>
                      {subCourse.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSubCourse && (
              <div className="questions-list">
                <h2>Questions </h2>

                {questions.map((question) => (
                  <div key={question.id} className="question-item">
                    <div className="question-content">
                      <h4>{question.text}</h4>

                      {/* عرض الإجابات تحت السؤال */}
                      <div className="answers-container">
                        <div className="answer-list">
                          {question.answers.map((answer) => (
                            <div key={answer.id} className="answer-content">
                              <p>{answer.text}</p>
                            </div>
                          ))}
                        </div>

                        <div className="action-buttons">
                          <button
                            onClick={() => {
                              setIsModalOpen(true);
                              handleEditQuestion(question);
                            }}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      {/* الزر الذي يفتح النافذة المنبثقة */}

                      {/* إذا كانت النافذة مفتوحة، نقوم بعرض الـ popup */}
                      {isModalOpen && (
                        <div className="modal-overlay">
                          <div className="modal-content">
                            <h3>Edit</h3>
                            <input
                              type="text"
                              value={newQuestion}
                              onChange={(e) => setNewQuestion(e.target.value)}
                              placeholder="Enter question"
                            />
                            <h4>Answers:</h4>
                            {answers.map((answer, index) => (
                              <div key={index}>
                                <input
                                  type="text"
                                  value={answer.text}
                                  onChange={(e) => {
                                    const newAnswers = [...answers];
                                    newAnswers[index].text = e.target.value;
                                    setAnswers(newAnswers);
                                  }}
                                  placeholder="Enter answer"
                                />
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={answer.correct}
                                    onChange={() => {
                                      const newAnswers = [...answers];
                                      newAnswers[index].correct =
                                        !newAnswers[index].correct;

                                      // تأكد من أن هناك إجابة واحدة صحيحة على الأقل
                                      if (
                                        !newAnswers.some((ans) => ans.correct)
                                      ) {
                                        newAnswers[index].correct = true;
                                      }

                                      setAnswers(newAnswers);
                                    }}
                                  />
                                  Correct Answer
                                </label>
                              </div>
                            ))}
                            <button
                              className="add-answer-btn"
                              onClick={handleAddAnswer}
                            >
                              Add Answer
                            </button>
                            <button onClick={handleUpdateQuestion}>Save</button>
                            <button onClick={() => setIsModalOpen(false)}>
                              Close
                            </button>{" "}
                            {/* زر لإغلاق الـ popup */}
                            {error && <p className="error-message">{error}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowPopup(true)}>
                  Add New Question
                </button>
                <details>
                  <summary>Media</summary>
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Add Image URL"
                  />
                  <input
                    type="text"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="Add Video URL"
                  />
                  <button onClick={handleAddMedia}>Add Media</button>
                  {/* عرض الوسائط المحملة */}
                  <div className="media-display">
                    {media.images &&
                      media.images
                        .sort((a, b) => a.id - b.id)
                        .map((mediaItem) => (
                          <div key={mediaItem.id} className="media-item">
                            <img
                              src={mediaItem.url}
                              alt={`Media ${mediaItem.id}`}
                            />
                            <button
                              onClick={() =>
                                handleDeleteMedia("images", mediaItem.id)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        ))}

                    {media.videos &&
                      media.videos
                        .sort((a, b) => a.id - b.id)
                        .map((mediaItem) => (
                          <div key={mediaItem.id} className="media-item">
                            <video src={mediaItem.url} controls />
                            <button
                              onClick={() =>
                                handleDeleteMedia("videos", mediaItem.id)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                  </div>{" "}
                </details>
              </div>
            )}
          </div>
        </div>
      </details>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <button
              className="close-popup-btn"
              onClick={() => setShowPopup(false)}
            >
              X
            </button>
            <h3>Add New Question</h3>
            <h4>Question:</h4>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter new question"
            />
            <div className="Add-answer">
              <h4>Answers: </h4>
              <button className="add-answer-btn" onClick={handleAddAnswer}>
                Add Answer
              </button>
            </div>
            {answers.map((answer, index) => (
              <div key={index}>
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[index].text = e.target.value;
                    setAnswers(newAnswers);
                  }}
                  placeholder="Enter answer"
                />
                <label className="align-left">
                  <input
                    type="checkbox"
                    checked={answer.correct}
                    onChange={() => {
                      const newAnswers = [...answers];
                      newAnswers[index].correct = !newAnswers[index].correct;
                      setAnswers(newAnswers);
                    }}
                  />
                  Correct Answer
                </label>
              </div>
            ))}
            <button
              className="save-question-btn"
              onClick={handleAddNewQuestion}
            >
              Save
            </button>

            {error && <p className="error-message">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursePage;
