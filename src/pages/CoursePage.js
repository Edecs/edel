import React, { useState, useEffect } from "react";
import { getDatabase, ref, onValue, set, remove } from "firebase/database";
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

  // Newly added state for the popup
  const [showPopup, setShowPopup] = useState(false);

  const [newCourseName, setNewCourseName] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [newSubCourseName, setNewSubCourseName] = useState("");

  const db = getDatabase();

  // Load main courses
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

  // Load sub-courses
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
        setSelectedSubCourse("");
      });

      return () => unsubscribe();
    }
  }, [db, selectedCourse]);

  // Load questions
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

  // Handle editing a question
  const handleEditQuestion = (question) => {
    setNewQuestion(question.text);
    setAnswers(question.answers);
    setEditQuestionIndex(question.id);
  };

  // Handle updating a question
  const handleUpdateQuestion = async () => {
    if (!newQuestion.trim() || answers.every((a) => !a.text)) {
      setError("Question and at least one answer are required.");
      return;
    }

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
      setAnswers([{ text: "", correct: false }]); // Reset answers
      setEditQuestionIndex(null);
      setError("");
    } catch (error) {
      setError("Failed to update question: " + error.message);
    }
  };

  // Handle deleting a question
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

  // Function to handle adding a new course
  const handleAddCourse = () => {
    if (!newCourseName.trim() || !thumbnail.trim()) {
      setError("Course name and thumbnail are required.");
      return;
    }

    const courseRef = ref(db, `courses/mainCourses/${newCourseName}`);
    set(courseRef, { name: newCourseName, thumbnail: thumbnail });

    setNewCourseName("");
    setThumbnail("");
  };

  // Function to handle adding a new sub-course
  const handleAddSubCourse = () => {
    if (!newSubCourseName.trim() || !selectedCourse) {
      setError("Sub-course name and selected main course are required.");
      return;
    }

    const subCourseRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${newSubCourseName}`
    );
    set(subCourseRef, { name: newSubCourseName });

    setNewSubCourseName("");
  };

  // Function to handle adding a new question
  const handleAddNewQuestion = async () => {
    if (!newQuestion.trim() || answers.every((a) => !a.text)) {
      setError("Question and at least one answer are required.");
      return;
    }

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
      setAnswers([{ text: "", correct: false }]); // Reset answers
      setShowPopup(false); // Close popup
      setError("");
    } catch (error) {
      setError("Failed to add question: " + error.message);
    }
  };

  // Function to handle adding a new answer input
  const handleAddAnswer = () => {
    setAnswers([...answers, { text: "", correct: false }]);
  };

  return (
    <div className="course-page">
      <h1>Courses Management</h1>
      <details>
        <summary>Add Course</summary>
        <div className="course-management-content">
          <div className="add-course-section">
            <h2>Main Courses</h2>
            <div className="course-buttons">
              {mainCourses.map((course) => (
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
          </div>

          <div className="add-sub-course-section">
            <h2>Sub-Courses</h2>
            <div className="sub-course-buttons">
              {subCourses.map((subCourse) => (
                <div key={subCourse.id} className="sub-course-item">
                  {subCourse.name}
                </div>
              ))}
            </div>

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
                  {mainCourses.map((course) => (
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
                                  // Toggle the correct answer
                                  newAnswers[index].correct =
                                    !newAnswers[index].correct;

                                  // Ensure at least one answer is marked as correct
                                  if (!newAnswers.some((ans) => ans.correct)) {
                                    newAnswers[index].correct = true; // Set the current answer as correct
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
