import React, { useState, useEffect, useRef } from "react";
import {
  getDatabase,
  ref,
  onValue,
  set,
  remove,
  get,
  push,
} from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

import "./CoursePage.css";

function CoursePage() {
  const [mainCourses, setMainCourses] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
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
  // دالة لتحرير السؤال
  const handleEditQuestion = (question) => {
    setIsEditMode(true);
    setNewQuestion(question.text);
    setAnswers(question.answers);
    setEditQuestionIndex(question.id);
    setIsModalOpen(true);
  };
  const handleUpdateQuestion = async () => {
    if (!newQuestion.trim()) {
      setError("Question text cannot be empty.");
      return;
    }

    const questionData = {
      text: newQuestion,
      answers: answers,
    };

    try {
      if (isEditMode) {
        // في حالة التحرير، نقوم بتحديث السؤال
        const questionRef = ref(
          db,
          `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions/${editQuestionIndex}`
        );
        await set(questionRef, questionData);
      } else {
        // في حالة الإضافة، نضيف سؤالاً جديدًا
        const newQuestionRef = push(
          ref(
            db,
            `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
          )
        );
        await set(newQuestionRef, questionData);
      }

      setNewQuestion("");
      setAnswers([{ text: "", correct: false }]);
      setEditQuestionIndex(null);
      setError("");
      setIsModalOpen(false);
    } catch (error) {
      setError("Failed to save question: " + error.message);
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

  const [duration, setDuration] = useState(""); // إضافة التعريف

  const handleAddSubCourse = async () => {
    if (!newSubCourseName || !duration) {
      alert("Please enter both the sub-course name and duration.");
      return;
    }

    const startDate = new Date(); // تاريخ بداية الكورس (وقت الإضافة)
    const newSubCourse = {
      name: newSubCourseName,
      duration: duration, // المدة بالأيام
      startDate: startDate.toISOString(), // تحويل التاريخ إلى نص
    };

    try {
      const subCoursesRef = ref(db, "subCourses");
      const newSubCourseRef = push(subCoursesRef);
      await set(newSubCourseRef, newSubCourse);
      setSubCourses([
        ...subCourses,
        { id: newSubCourseRef.key, ...newSubCourse },
      ]);

      setNewSubCourseName("");
      setDuration(""); // إعادة ضبط المدخلات
    } catch (error) {
      console.error("Error adding sub-course: ", error);
    }
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
      setIsEditMode(false);
      setNewQuestion("");
      setAnswers([{ text: "", correct: false }]);
      setIsModalOpen(true);
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
      videos: newVideoUrl
        ? [{ url: newVideoUrl, id: Date.now() + 100000 }]
        : [], // زيادة ID الفيديوهات
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
    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
    );

    try {
      const snapshot = await get(mediaRef);
      const existingMedia = snapshot.val();

      if (!existingMedia) {
        setError("No media found");
        return;
      }

      if (mediaType === "images" && existingMedia.images) {
        existingMedia.images = existingMedia.images.filter(
          (item) => item.id !== mediaId
        );
      } else if (mediaType === "videos" && existingMedia.videos) {
        existingMedia.videos = existingMedia.videos.filter(
          (item) => item.id !== mediaId
        );
      } else {
        return;
      }

      await set(mediaRef, existingMedia);
      setMedia(existingMedia);
    } catch (error) {
      setError("Failed to delete media: " + error.message);
    }
  };

  // Rest of your code...
  useEffect(() => {
    if (selectedCourse && selectedSubCourse) {
      const durationRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/duration`
      );

      const unsubscribe = onValue(durationRef, (snapshot) => {
        if (snapshot.exists()) {
          setDuration(snapshot.val()); // تحديث المدة تلقائيًا من الريل تايم داتابيز
        } else {
          setDuration(""); // إعادة التصفير في حال عدم وجود مدة مسجلة
        }
      });

      return () => unsubscribe();
    }
  }, [db, selectedCourse, selectedSubCourse]);

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
  // تأكد من أن دالة clearPopupFields مكتوبة بشكل صحيح
  const clearPopupFields = () => {
    setNewQuestion(""); // تصفير السؤال
    setAnswers([]); // مسح قائمة الإجابات
    setIsEditMode(false); // تصفير وضع التحرير
  };
  useEffect(() => {
    const fetchSubCourses = async () => {
      const subCoursesRef = ref(db, "subCourses");
      try {
        const snapshot = await get(subCoursesRef);
        if (snapshot.exists()) {
          const subCoursesData = snapshot.val();
          const currentDate = new Date();

          const loadedSubCourses = Object.keys(subCoursesData)
            .map((key) => {
              const data = subCoursesData[key];
              const startDate = new Date(data.startDate);

              // حساب وقت الانتهاء بالساعات
              const endDate = new Date(
                startDate.getTime() + Number(data.duration) * 60 * 60 * 1000
              );

              return {
                id: key,
                ...data,
                isExpired: currentDate > endDate,
              };
            })
            .filter((subCourse) => !subCourse.isExpired);

          setSubCourses(loadedSubCourses);
        }
      } catch (error) {
        console.error("Error fetching subCourses:", error);
      }
    };

    fetchSubCourses();
  }, [db]);
  const handleSaveDuration = async () => {
    const totalSeconds =
      Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);

    if (totalSeconds <= 0) {
      alert("الرجاء إدخال مدة صالحة!");
      return;
    }

    // تأكد من وجود كورس فرعي محدد
    if (!selectedCourse || !selectedSubCourse) {
      alert("يرجى اختيار الكورس والكورس الفرعي أولا!");
      return;
    }

    try {
      const durationRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/duration`
      );

      await set(durationRef, totalSeconds); // حفظ المدة في الريل تايم داتابيز
      setDuration(totalSeconds); // تحديث الحالة محليًا
      alert(`تم حفظ المدة: ${totalSeconds} ثانية`);
    } catch (error) {
      console.error("خطأ في حفظ المدة:", error);
    }
  };

  return (
    <div className="course">
      <header>
        <h1 className="header-h1">Courses Management</h1>
      </header>
      <div className="course-page">
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
                  <div className="add-sub-course-form">
                    <input
                      type="text"
                      placeholder="Enter new course name"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                    />
                  </div>

                  {/* مربع تحميل صورة الدورة */}
                  <h2>Upload Course Thumbnail</h2>
                  <div className="add-sub-course-form">
                    <input
                      type="text"
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder="Enter thumbnail URL (Dropbox link)"
                    />
                  </div>
                  <div className="button-container">
                    <button className="cinter" onClick={handleAddCourse}>
                      Add Course
                    </button>
                  </div>
                </div>
              </div>

              {/* حاوية المربعات */}
              {/* مربع إضافة دورة جديدة */}
              <div className="courses-container">
                <h2>Sub Courses</h2>
                <ul className="sub-course-buttons">
                  {subCourses.map((subCourse) => (
                    <li key={subCourse.id} value={subCourse.id} disabled>
                      {subCourse.name}
                    </li>
                  ))}
                </ul>

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
                  <div className="button-container">
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
                  <h2>ٍSelect Main Course</h2>

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
                  <h2>Select Sub Course</h2>
                  <select
                    value={selectedSubCourse}
                    onChange={(e) => {
                      const selected = subCourses.find(
                        (sc) => sc.id === e.target.value
                      );
                      if (selected.isExpired) {
                        alert("This sub-course has expired.");
                      } else {
                        setSelectedSubCourse(e.target.value);
                      }
                    }}
                    className="dropdown"
                  >
                    <option value="" disabled>
                      Select a sub-course
                    </option>
                    {subCourses.map((subCourse) => (
                      <option key={subCourse.id} value={subCourse.id}>
                        {subCourse.name}{" "}
                        {subCourse.isExpired ? "(Expired)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSubCourse && (
                <div className="questions-list">
                  <div className="gg1">
                    <h2>Questions </h2>
                    <button
                      className="right"
                      onClick={() => setShowPopup(true)}
                    >
                      Add New
                    </button>
                  </div>
                  <div className="duration-container">
                    <label>Hours:</label>
                    <input
                      type="number"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="Enter hours"
                      min="0"
                    />

                    <label>Minutes:</label>
                    <input
                      type="number"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="Enter minutes"
                      min="0"
                    />

                    <label>Seconds:</label>
                    <input
                      type="number"
                      value={seconds}
                      onChange={(e) => setSeconds(e.target.value)}
                      placeholder="Enter seconds"
                      min="0"
                    />

                    <button onClick={handleSaveDuration}>Save Duration</button>

                    <p>Saved Duration: {duration} seconds</p>
                  </div>
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
                        {isModalOpen && (
                          <div className="popup-overlay">
                            <div className="popup-content">
                              <button
                                className="close-popup-btn"
                                onClick={() => {
                                  setIsModalOpen(false);
                                  clearPopupFields(); // تنظيف الحقول عند الإغلاق
                                }}
                              >
                                X
                              </button>
                              <h3>
                                {isEditMode
                                  ? "Edit Question"
                                  : "Add New Question"}
                              </h3>

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
                                  <label className="align-left">
                                    <input
                                      type="checkbox"
                                      checked={answer.correct}
                                      onChange={() => {
                                        const newAnswers = [...answers];
                                        newAnswers[index].correct =
                                          !newAnswers[index].correct;

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
                              <button
                                onClick={() => {
                                  handleUpdateQuestion();
                                  clearPopupFields(); // تنظيف الحقول بعد الحفظ
                                }}
                              >
                                {isEditMode ? "Save Changes" : "Add Question"}
                              </button>

                              {error && (
                                <p className="error-message">{error}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <details>
                    <summary>Upload Media for Selected Sub-course</summary>
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
                    <div className="a1">
                      <button className="a2" onClick={handleAddMedia}>
                        Add Media
                      </button>
                    </div>
                    <div className="media-display">
                      {media.images &&
                        media.images
                          .sort((a, b) => a.id - b.id)
                          .map((mediaItem) => (
                            <div key={mediaItem.id} className="media-item1">
                              <img
                                src={mediaItem.url}
                                alt={`Media ${mediaItem.id}`}
                              />
                              <div className="delete-button-container">
                                <button
                                  className="vim"
                                  onClick={() =>
                                    handleDeleteMedia("images", mediaItem.id)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}

                      {media.videos &&
                        media.videos
                          .sort((a, b) => a.id - b.id)
                          .map((mediaItem) => (
                            <div key={mediaItem.id} className="media-item1">
                              <video src={mediaItem.url} controls />
                              <div className="delete-button-container">
                                <button
                                  className="vim"
                                  onClick={() =>
                                    handleDeleteMedia("videos", mediaItem.id)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                    </div>
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
              <h4 className="gg">Question:</h4>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Enter new question"
              />
              <div className="Add-answer">
                <div className="gg">
                  <h4>Answers: </h4>
                </div>
                <button className="right2" onClick={handleAddAnswer}>
                  Add New
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
    </div>
  );
}

export default CoursePage;
