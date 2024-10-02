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
  const [newImageLink, setNewImageLink] = useState("");
  const [newVideoLink, setNewVideoLink] = useState("");
  const [newPdfLink, setNewPdfLink] = useState("");
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
      const pdfsRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/pdfs`
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

  const handleAddMedia = (type, link) => {
    if (!link.trim()) {
      setError("The media link cannot be empty");
      return;
    }

    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/${type}`
    );
    const newMediaRef = push(mediaRef);
    set(newMediaRef, link)
      .then(() => {
        setError("");
        switch (type) {
          case "images":
            setNewImageLink("");
            break;
          case "videos":
            setNewVideoLink("");
            break;
          case "pdfs":
            setNewPdfLink("");
            break;
          default:
            break;
        }
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
          .catch((error) =>
            setError("Failed to save questions: " + error.message)
          );
      })
      .catch((error) =>
        setError("Failed to delete existing questions: " + error.message)
      );
  };

  return (
    <div className="course-page">
      <h1>Course Management</h1>
      <div className="course-selection">
        <h2>Main Courses</h2>
        <select
          onChange={(e) => setSelectedCourse(e.target.value)}
          value={selectedCourse}
        >
          <option value="">Select a course</option>
          {mainCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>

        <h2>Sub Courses</h2>
        <select
          onChange={(e) => setSelectedSubCourse(e.target.value)}
          value={selectedSubCourse}
        >
          <option value="">Select a sub-course</option>
          {subCourses.map((subCourse) => (
            <option key={subCourse.id} value={subCourse.id}>
              {subCourse.name}
            </option>
          ))}
        </select>
      </div>

      <div className="media-section">
        <h2>Add Media</h2>
        <input
          type="text"
          placeholder="Image URL"
          value={newImageLink}
          onChange={(e) => setNewImageLink(e.target.value)}
        />
        <button onClick={() => handleAddMedia("images", newImageLink)}>
          Add Image
        </button>

        <input
          type="text"
          placeholder="Video URL"
          value={newVideoLink}
          onChange={(e) => setNewVideoLink(e.target.value)}
        />
        <button onClick={() => handleAddMedia("videos", newVideoLink)}>
          Add Video
        </button>

        <input
          type="text"
          placeholder="PDF URL"
          value={newPdfLink}
          onChange={(e) => setNewPdfLink(e.target.value)}
        />
        <button onClick={() => handleAddMedia("pdfs", newPdfLink)}>
          Add PDF
        </button>

        {error && <div className="error">{error}</div>}
      </div>

      <div className="media-display">
        <h2>Media Display</h2>
        <h3>Images</h3>
        {media.images.map((image, index) => (
          <img key={index} src={image} alt={`Image ${index + 1}`} />
        ))}

        <h3>Videos</h3>
        {media.videos.map((video, index) => (
          <video key={index} controls width="500">
            <source src={video.replace("dl=0", "dl=1")} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ))}

        <h3>PDFs</h3>
        {media.pdfs.map((pdf, index) => (
          <a key={index} href={pdf} target="_blank" rel="noopener noreferrer">
            PDF {index + 1}
          </a>
        ))}
      </div>

      <div className="question-section">
        <h2>Add Question</h2>
        <input
          type="text"
          placeholder="New Question"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
        />
        <button onClick={handleAddOrEditQuestion}>
          {editQuestionIndex !== null ? "Edit Question" : "Add Question"}
        </button>

        <h3>Answers</h3>
        {answers.map((answer, index) => (
          <div key={index}>
            <input
              type="text"
              placeholder="Answer"
              value={answer.text}
              onChange={(e) => {
                const updatedAnswers = [...answers];
                updatedAnswers[index].text = e.target.value;
                setAnswers(updatedAnswers);
              }}
            />
            <label>
              <input
                type="checkbox"
                checked={answer.correct}
                onChange={() => handleCorrectAnswerChange(index)}
              />
              Correct
            </label>
            <button onClick={() => handleEditAnswer(index)}>Edit</button>
            <button
              onClick={() => setAnswers(answers.filter((_, i) => i !== index))}
            >
              Delete
            </button>
          </div>
        ))}
        <input
          type="text"
          placeholder="New Answer"
          value={newAnswerText}
          onChange={(e) => setNewAnswerText(e.target.value)}
        />
        <button onClick={handleAddOrUpdateAnswer}>
          {editAnswerIndex !== null ? "Edit Answer" : "Add Answer"}
        </button>

        {error && <div className="error">{error}</div>}
      </div>

      <button onClick={handleSaveQuestions}>Save Questions</button>

      <div className="questions-display">
        <h2>Questions</h2>
        {questions.map((question, index) => (
          <div key={index}>
            <h3>{question.text}</h3>
            <ul>
              {question.answers.map((answer, answerIndex) => (
                <li key={answerIndex}>{answer.text}</li>
              ))}
            </ul>
            <button onClick={() => handleEditQuestionIndex(index)}>
              Edit Question
            </button>
            <button onClick={() => handleDeleteQuestion(index)}>
              Delete Question
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CoursePage;
