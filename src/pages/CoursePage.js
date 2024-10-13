import React, { useState, useEffect } from "react";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  remove,
} from "firebase/database";
import "./CoursePage.css";

function CoursePage() {
  const [mainCourses, setMainCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [subCourses, setSubCourses] = useState([]);
  const [selectedSubCourse, setSelectedSubCourse] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [answers, setAnswers] = useState([{ text: "", correct: false }]);
  const [questions, setQuestions] = useState([]);
  const [editQuestionIndex, setEditQuestionIndex] = useState(null);
  const [editAnswerIndex, setEditAnswerIndex] = useState(null);
  const [error, setError] = useState("");
  const [media, setMedia] = useState({ images: [], videos: [] });
  const [newMediaLink, setNewMediaLink] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newSubCourseName, setNewSubCourseName] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [selectedButton, setSelectedButton] = useState(null); // إضافة حالة لتخزين الزر المحدد
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingSubCourses, setIsLoadingSubCourses] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

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
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnail(reader.result); // Set the thumbnail URL
      };
      reader.readAsDataURL(file); // Read the file as a data URL
    }
  };
  useEffect(() => {
    setIsLoadingCourses(true);
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
      setIsLoadingCourses(false);
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

  // Load questions and media
  useEffect(() => {
    if (selectedCourse && selectedSubCourse) {
      const questionsRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
      );
      const imagesRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/images`
      );
      const videosRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/videos`
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

      const unsubscribeImages = onValue(imagesRef, (snapshot) => {
        const imagesData = snapshot.val();
        const imagesArray = imagesData ? Object.values(imagesData) : [];
        setMedia((prev) => ({ ...prev, images: imagesArray }));
      });

      const unsubscribeVideos = onValue(videosRef, (snapshot) => {
        const videosData = snapshot.val();
        const videosArray = videosData ? Object.values(videosData) : [];
        setMedia((prev) => ({ ...prev, videos: videosArray }));
      });
    }
  }, [db, selectedCourse, selectedSubCourse]);

  // Add media from Dropbox link
  const handleAddMediaFromLink = () => {
    if (!newMediaLink.trim()) {
      setError("The media link cannot be empty");
      return;
    }

    let mediaType = "";
    // Checking for media types based on extensions and Dropbox URLs
    if (
      newMediaLink.endsWith(".jpg") ||
      newMediaLink.endsWith(".jpeg") ||
      newMediaLink.endsWith(".png") ||
      newMediaLink.includes("dropbox.com/scl") // Check for Dropbox image links
    ) {
      mediaType = "images";
    } else if (newMediaLink.endsWith(".mp4")) {
      mediaType = "videos";
    } else {
      setError("Unsupported media link format");
      return;
    }

    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/${mediaType}`
    );
    const newMediaRef = push(mediaRef);
    set(newMediaRef, newMediaLink)
      .then(() => {
        setNewMediaLink("");
        setError("");
      })
      .catch((error) => setError("Failed to save media URL: " + error.message));
  };

  // Add or edit question
  const handleAddOrEditQuestion = () => {
    if (!newQuestion.trim()) {
      setError("The question cannot be empty");
      return;
    }

    const newQuestionObj = {
      text: newQuestion,
      answers: [...answers],
    };

    if (editQuestionIndex !== null) {
      const updatedQuestions = [...questions];
      updatedQuestions[editQuestionIndex] = newQuestionObj;
      setQuestions(updatedQuestions);
      setEditQuestionIndex(null);
    } else {
      setQuestions([...questions, newQuestionObj]);
    }

    setNewQuestion("");
    setAnswers([{ text: "", correct: false }]);
    setError("");
  };

  // Add or update answer
  const handleAddOrUpdateAnswer = () => {
    if (newAnswerText.trim() === "") {
      setError("The answer text cannot be empty");
      return;
    }

    const updatedAnswers = [...answers];
    if (editAnswerIndex !== null) {
      updatedAnswers[editAnswerIndex] = {
        text: newAnswerText,
        correct: updatedAnswers[editAnswerIndex].correct,
      };
      setEditAnswerIndex(null);
    } else {
      updatedAnswers.push({ text: newAnswerText, correct: false });
    }

    setAnswers(updatedAnswers);
    setNewAnswerText("");
    setError("");
  };

  // Edit answer
  const handleEditAnswer = (index) => {
    if (index >= 0 && index < answers.length) {
      setNewAnswerText(answers[index].text);
      setEditAnswerIndex(index);
    }
  };

  // Set correct answer
  const handleCorrectAnswerChange = (index) => {
    const updatedAnswers = answers.map((answer, i) =>
      i === index ? { ...answer, correct: !answer.correct } : answer
    );
    setAnswers(updatedAnswers);
  };

  // Edit question
  const handleEditQuestionIndex = (index) => {
    const question = questions[index];
    setNewQuestion(question.text);
    setAnswers(question.answers || []);
    setEditQuestionIndex(index);
  };

  // Delete question
  const handleDeleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  // Save questions
  const handleSaveQuestions = () => {
    if (!selectedSubCourse) {
      setError("Select a sub-course to save questions");
      return;
    }

    if (questions.length === 0) {
      setError("There are no questions to save");
      return;
    }

    const questionsRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
    );

    remove(questionsRef)
      .then(() => {
        Promise.all(
          questions.map((question) => {
            const questionRef = push(questionsRef);
            return set(questionRef, question);
          })
        )
          .then(() => {
            setQuestions([]);
            setError("");
          })
          .catch((error) => {
            setError("Failed to save questions: " + error.message);
          });
      })
      .catch((error) => {
        setError("Failed to clear existing questions: " + error.message);
      });
  };

  const handleAddSubCourse = async () => {
    if (!newSubCourseName.trim()) {
      setError("The sub-course name cannot be empty");
      return;
    }

    const subCoursesRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses`
    );
    const newSubCourseRef = push(subCoursesRef);
    try {
      await set(newSubCourseRef, { name: newSubCourseName });
      setNewSubCourseName("");
      setError("");
    } catch (error) {
      setError("Failed to save sub-course: " + error.message);
    }
  };

  // Add main course
  const handleAddCourse = async () => {
    if (!newCourseName.trim()) {
      setError("The course name cannot be empty");
      return;
    }

    const coursesRef = ref(db, "courses/mainCourses");
    const newCourseRef = push(coursesRef);
    try {
      await set(newCourseRef, { name: newCourseName });
      setNewCourseName("");
      setError("");
    } catch (error) {
      setError("Failed to save course: " + error.message);
    }
  };

  return (
    <div className="course-page">
      <h1>courses page</h1>
      <details>
        <summary>Add Course</summary>
        <div className="course-selectors">
          <div className="add-course">
            <h2>Courses</h2>
            <div className="course-buttons">
              {mainCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourse(course.id);
                    setSelectedButton(course.id); // تحديث الزر المحدد
                  }}
                  className={selectedButton === course.id ? "selected" : ""} // تطبيق النمط إذا كان الزر هو المحدد
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

          <div className="add-sub-course">
            <h2>Sub-Courses</h2>
            <div className="sub-course-buttons">
              {subCourses.map((subCourse) => (
                <button
                  key={subCourse.id}
                  onClick={() => setSelectedSubCourse(subCourse.id)}
                  className={
                    selectedSubCourse === subCourse.id ? "selected" : ""
                  }
                  disabled={!selectedCourse}
                >
                  {subCourse.name}
                </button>
              ))}
            </div>
            <h2>Add New Sub-Course</h2>
            <input
              type="text"
              placeholder="Enter new sub-course name"
              value={newSubCourseName}
              onChange={(e) => setNewSubCourseName(e.target.value)}
              disabled={!selectedCourse}
            />
            <button onClick={handleAddSubCourse} disabled={!selectedCourse}>
              Add Sub-Course
            </button>
          </div>
        </div>
      </details>

      <details>
        <summary>Add media / questions</summary>
        <div className="course-selection">
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

        {/* Show the media section only if a sub-course is selected */}
        {selectedSubCourse && (
          <div className="media-section">
            <div className="media-and-questions">
              <h2>Media (Images, Videos)</h2>
              <input
                type="text"
                placeholder="Enter Dropbox link for media"
                value={newMediaLink}
                onChange={(e) => setNewMediaLink(e.target.value)}
                disabled={!selectedSubCourse}
              />
              <button
                onClick={handleAddMediaFromLink}
                disabled={!selectedSubCourse}
              >
                Add Media
              </button>

              {error && <p className="error-message">{error}</p>}

              <div>
                <h3>Images:</h3>
                {media.images.map((image, index) => (
                  <div key={index}>
                    <img
                      src={image}
                      alt={`Course media ${index}`}
                      style={{ width: "100px", height: "auto" }}
                    />
                  </div>
                ))}

                <div>
                  <h3>Videos:</h3>
                  {media.videos.map((video, index) => (
                    <div key={index}>
                      <video width="320" height="240" controls>
                        <source src={video} type="video/mp4" />
                      </video>
                    </div>
                  ))}
                </div>
              </div>

              <div className="question-section">
                <h2>Add/Edit Questions</h2>
                <textarea
                  placeholder="Enter new question"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  disabled={!selectedSubCourse}
                />
                <button
                  onClick={handleAddOrEditQuestion}
                  disabled={!selectedSubCourse}
                >
                  {editQuestionIndex !== null
                    ? "Edit Question"
                    : "Add Question"}
                </button>

                <div className="answers-section">
                  <h3>Answers</h3>
                  {answers.map((answer, index) => (
                    <div key={index}>
                      <input
                        type="checkbox"
                        checked={answer.correct}
                        onChange={() => handleCorrectAnswerChange(index)}
                      />
                      <span>{answer.text}</span>
                      <button onClick={() => handleEditAnswer(index)}>
                        Edit
                      </button>
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Enter new answer"
                  value={newAnswerText}
                  onChange={(e) => setNewAnswerText(e.target.value)}
                  disabled={!selectedSubCourse}
                />
                <button
                  onClick={handleAddOrUpdateAnswer}
                  disabled={!selectedSubCourse}
                >
                  {editAnswerIndex !== null ? "Update Answer" : "Add Answer"}
                </button>

                <div className="questions-list">
                  <h3>Questions List</h3>
                  {questions.map((question, index) => (
                    <div key={index} className="question-item">
                      <h4>{question.text}</h4>
                      <ul>
                        {question.answers.map((answer, i) => (
                          <li key={i} className="answer-item">
                            {answer.text} {answer.correct && "(Correct)"}
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => handleEditQuestionIndex(index)}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteQuestion(index)}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveQuestions}
                  disabled={!selectedSubCourse}
                >
                  Save Questions
                </button>

                {error && <p className="error-message">{error}</p>}
              </div>
            </div>
          </div>
        )}
      </details>
    </div>
  );
}

export default CoursePage;
