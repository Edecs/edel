import React, { useState, useEffect } from "react";
import { getDatabase, ref, onValue, set, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import "./CoursePage.css";

function CoursePage() {
  const [mainCourses, setMainCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [subCourses, setSubCourses] = useState([]);
  const [selectedSubCourse, setSelectedSubCourse] = useState("");
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
  const [media, setMedia] = useState({
    images: [],
    videos: [],
  });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  const db = getDatabase();

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
        setSubCourses(subCoursesArray); // لا يوجد فلتر هنا بناءً على القسم
        setSelectedSubCourse("");
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

  const handleAddAnswer = () => {
    setAnswers([...answers, { text: "", correct: false }]);
  };

  const filteredCourses = mainCourses.filter(
    (course) => course.department === currentUserDepartment
  );
  const handleAddMedia = async () => {
    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
    );

    // بناء قائمة الوسائط الحالية
    const currentMedia = {
      images: media.images.concat(newImageUrl ? [{ url: newImageUrl }] : []),
      videos: media.videos.concat(newVideoUrl ? [{ url: newVideoUrl }] : []),
    };

    await set(mediaRef, currentMedia);
    setNewImageUrl("");
    setNewVideoUrl("");
  };

  useEffect(() => {
    if (selectedCourse && selectedSubCourse) {
      const mediaRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
      );

      const unsubscribeMedia = onValue(mediaRef, (snapshot) => {
        const mediaData = snapshot.val();
        setMedia(mediaData || { images: [], videos: [] }); // تعيين البيانات المستردة إلى الحالة
      });

      return () => unsubscribeMedia();
    }
  }, [db, selectedCourse, selectedSubCourse]);

  return (
    <div className="course-page">
      <h1>Courses Management</h1>

      <details>
        <summary>Add Course</summary>
        <div className="course-management-content">
          <div className="add-course-section">
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
            <h2>Add New Course</h2>
            <input
              type="text"
              placeholder="Enter new course name"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
            />
            <h2>Upload Course Thumbnail</h2>
            <input
              type="text"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="Enter thumbnail URL (Dropbox link)"
            />
            <button onClick={handleAddCourse}>Add Course</button>
            <div className="add-sub-course-section">
              <h2>Sub-Courses</h2>

              <div className="add-sub-course-form">
                <input
                  type="text"
                  value={newSubCourseName}
                  onChange={(e) => setNewSubCourseName(e.target.value)}
                  placeholder="Add new sub-course"
                />
                <button onClick={handleAddSubCourse}>Add Sub-Course</button>
              </div>
            </div>
          </div>
        </div>
      </details>

      <details>
        <summary>Edit Questions</summary>
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
                <h3>Questions List</h3>
                {questions.map((question) => (
                  <div key={question.id} className="question-item">
                    <div className="question-content">
                      <h4>{question.text}</h4>
                      <button onClick={() => handleEditQuestion(question)}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteQuestion(question.id)}>
                        Delete
                      </button>
                    </div>

                    {editQuestionIndex === question.id && (
                      <div className="edit-question-form">
                        <h3>Edit Question</h3>
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

                                  if (!newAnswers.some((ans) => ans.correct)) {
                                    newAnswers[index].correct = true;
                                  }

                                  setAnswers(newAnswers);
                                }}
                              />
                              Correct Answer
                            </label>
                          </div>
                        ))}
                        <button onClick={handleUpdateQuestion}>
                          Update Question
                        </button>
                        {error && <p className="error-message">{error}</p>}
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => setShowPopup(true)}>
                  Add New Question
                </button>
                <h2>Media</h2>
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
                  {media.images.map((mediaItem, index) => (
                    <img
                      key={index}
                      src={mediaItem.url}
                      alt={`Media ${index}`}
                    />
                  ))}
                  {media.videos.map((mediaItem, index) => (
                    <video key={index} src={mediaItem.url} controls />
                  ))}
                </div>{" "}
              </div>
            )}
          </div>
        </div>
      </details>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h2>Add New Question</h2>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter new question"
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
                      newAnswers[index].correct = !newAnswers[index].correct;
                      setAnswers(newAnswers);
                    }}
                  />
                  Correct Answer
                </label>
              </div>
            ))}
            <button onClick={handleAddAnswer}>Add Answer</button>
            <button onClick={handleAddNewQuestion}>Add Question</button>
            <button onClick={() => setShowPopup(false)}>Close</button>
            {error && <p className="error-message">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursePage;
