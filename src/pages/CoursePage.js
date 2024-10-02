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
  const [media, setMedia] = useState({ images: [], videos: [], pdfs: [] });
  const [newMediaLink, setNewMediaLink] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
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
      const subCoursesRef = ref(db, `courses/mainCourses/${selectedCourse}/subCourses`);
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
      const questionsRef = ref(db, `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`);
      const imagesRef = ref(db, `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/images`);
      const videosRef = ref(db, `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/videos`);
      const pdfsRef = ref(db, `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/pdfs`);

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

      const unsubscribePdfs = onValue(pdfsRef, (snapshot) => {
        const pdfsData = snapshot.val();
        const pdfsArray = pdfsData ? Object.values(pdfsData) : [];
        setMedia((prev) => ({ ...prev, pdfs: pdfsArray }));
      });

      return () => {
        unsubscribeQuestions();
        unsubscribeImages();
        unsubscribeVideos();
        unsubscribePdfs();
      };
    }
  }, [db, selectedCourse, selectedSubCourse]);

  // Add media from Dropbox link
  const handleAddMediaFromLink = () => {
    if (!newMediaLink.trim()) {
      setError("The media link cannot be empty");
      return;
    }

    let mediaType = "";
    if (
      newMediaLink.endsWith(".jpg") ||
      newMediaLink.endsWith(".jpeg") ||
      newMediaLink.endsWith(".png") ||
      newMediaLink.includes("dropbox.com/scl")
    ) {
      mediaType = "images";
    } else if (newMediaLink.endsWith(".mp4")) {
      mediaType = "videos";
    } else if (newMediaLink.endsWith(".pdf")) {
      mediaType = "pdfs";
    } else {
      setError("Unsupported media link format");
      return;
    }

    const mediaRef = ref(db, `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/${mediaType}`);
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

    const questionsRef = ref(db, `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`);

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
          .catch((error) => setError("Failed to save questions: " + error.message));
      })
      .catch((error) => setError("Failed to delete existing questions: " + error.message));
  };

  return (
    <div className="course-page">
      <h1>Course Management</h1>
      <div className="course-selection">
        <h2>Main Courses</h2>
        <select onChange={(e) => setSelectedCourse(e.target.value)} value={selectedCourse}>
          <option value="">Select Main Course</option>
          {mainCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>

        {selectedCourse && (
          <>
            <h2>Sub Courses</h2>
            <select onChange={(e) => setSelectedSubCourse(e.target.value)} value={selectedSubCourse}>
              <option value="">Select Sub Course</option>
              {subCourses.map((subCourse) => (
                <option key={subCourse.id} value={subCourse.id}>
                  {subCourse.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {selectedCourse && selectedSubCourse && (
        <div className="media-management">
          <h2>Media Management</h2>
          <input
            type="text"
            value={newMediaLink}
            onChange={(e) => setNewMediaLink(e.target.value)}
            placeholder="Enter media link (image/video/pdf)"
          />
          <button onClick={handleAddMediaFromLink}>Add Media</button>
          {error && <p className="error">{error}</p>}
          <div className="media-display">
            <h3>Images</h3>
            <div className="media-list">
  {media.images.map((image, index) => (
    <img
      key={index}
      src={image}
      alt={`Course ${index}`}
      className="media-item"
      onError={(e) => {
        e.target.onerror = null; // Prevent looping
        e.target.src = "path/to/default-image.jpg"; // Use a default image
      }}
    />
  ))}
</div>


            <h3>Videos</h3>
            <div className="media-list">
              {media.videos.map((video, index) => (
                <video key={index} controls className="media-item">
                  <source src={video} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ))}
            </div>

            <h3>PDFs</h3>
            <div className="media-list">
              {media.pdfs.map((pdf, index) => (
                <iframe key={index} src={pdf} title={`PDF ${index}`} className="media-item"></iframe>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="question-management">
        <h2>Question Management</h2>
        <input
          type="text"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Enter a new question"
        />
        <button onClick={handleAddOrEditQuestion}>
          {editQuestionIndex !== null ? "Update Question" : "Add Question"}
        </button>
        {error && <p className="error">{error}</p>}
        <div className="answers-management">
          {answers.map((answer, index) => (
            <div key={index} className="answer-item">
              <input
                type="text"
                value={answer.text}
                onChange={(e) => {
                  const updatedAnswers = [...answers];
                  updatedAnswers[index].text = e.target.value;
                  setAnswers(updatedAnswers);
                }}
                placeholder="Enter answer"
              />
              <input
                type="checkbox"
                checked={answer.correct}
                onChange={() => handleCorrectAnswerChange(index)}
              />
              <button onClick={() => handleEditAnswer(index)}>Edit</button>
            </div>
          ))}
          <input
            type="text"
            value={newAnswerText}
            onChange={(e) => setNewAnswerText(e.target.value)}
            placeholder="Enter answer text"
          />
          <button onClick={handleAddOrUpdateAnswer}>
            {editAnswerIndex !== null ? "Update Answer" : "Add Answer"}
          </button>
        </div>

        <button onClick={handleSaveQuestions}>Save Questions</button>

        <div className="question-list">
          {questions.map((question, index) => (
            <div key={index} className="question-item">
              <p>{question.text}</p>
              <button onClick={() => handleEditQuestionIndex(index)}>Edit</button>
              <button onClick={() => handleDeleteQuestion(index)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CoursePage;
