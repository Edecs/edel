import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import "./SubCourseDetailPage.css";

const SubCourseDetailPage = () => {
  const { subCourseId } = useParams();
  const navigate = useNavigate();
  const [subCourse, setSubCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [submissionResult, setSubmissionResult] = useState(null);

  const auth = getAuth();
  const user = auth.currentUser;
  const mediaRef = useRef(null);

  useEffect(() => {
    setStartTime(new Date());

    const fetchSubCourseDetails = async () => {
      try {
        const mainCourseId = new URLSearchParams(window.location.search).get(
          "mainCourseId"
        );
        if (!mainCourseId) {
          throw new Error("Main course ID is not provided.");
        }

        const subCourseRef = ref(
          db,
          `courses/mainCourses/${mainCourseId}/subCourses/${subCourseId}`
        );
        const snapshot = await get(subCourseRef);

        if (!snapshot.exists()) {
          throw new Error(
            `Sub-course not found for subCourseId: ${subCourseId} in mainCourseId: ${mainCourseId}`
          );
        }

        const data = snapshot.val();
        setSubCourse(data);
        const questions = data.questions ? Object.values(data.questions) : [];
        setTotalQuestions(questions.length);
      } catch (error) {
        setError(`Error fetching sub-course details: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSubCourseDetails();
  }, [subCourseId]);

  const handleNextMedia = () => {
    if (subCourse) {
      const mediaKeys = [
        ...Object.keys(subCourse.images || {}),
        ...Object.keys(subCourse.pdfs || {}),
        ...Object.keys(subCourse.videos || {}),
      ];
      if (currentMediaIndex < mediaKeys.length - 1) {
        setCurrentMediaIndex(currentMediaIndex + 1);
      }
    }
  };

  const handlePrevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setUserAnswers((prevAnswers) => {
      const updatedAnswers = [...prevAnswers];
      updatedAnswers[questionIndex] = answer;
      return updatedAnswers;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    let endTime = new Date();
    const totalTime = (endTime - startTime) / 1000;

    let correctCount = 0;

    if (subCourse?.questions) {
      Object.values(subCourse.questions).forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswers = question.answers
          .filter((answer) => answer.correct)
          .map((answer) => answer.text);
        if (correctAnswers.includes(userAnswer)) {
          correctCount += 1;
        }
      });
    }

    let percentageSuccess =
      totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    const submissionData = {
      email: user.email,
      userId: user ? user.uid : "Anonymous",
      courseId: subCourseId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalTime,
      percentageSuccess,
      userAnswers,
    };

    try {
      await set(
        ref(db, `submissions/${user.uid}/${subCourseId}`),
        submissionData
      );
      setSubmissionResult(submissionData);
      alert("Submitted!");
      navigate("/welcome");
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to submit data.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!subCourse) return <p>Sub-course not found.</p>;

  const mediaKeys = [
    ...Object.keys(subCourse.images || {}),
    ...Object.keys(subCourse.pdfs || {}),
    ...Object.keys(subCourse.videos || {}),
  ];

  const currentMediaKey = mediaKeys[currentMediaIndex];
  const currentMedia = currentMediaKey
    ? subCourse.images?.[currentMediaKey] ||
      subCourse.pdfs?.[currentMediaKey] ||
      subCourse.videos?.[currentMediaKey]
    : null;

  const currentQuestion = subCourse?.questions
    ? Object.values(subCourse.questions)[currentQuestionIndex]
    : null;

  const convertDropboxLink = (link) => {
    if (link.includes("dropbox.com")) {
      return link
        .replace("www.dropbox.com", "dl.dropboxusercontent.com")
        .replace("?dl=1", ""); // تغيير هنا لتجنب التنزيل
    }
    return link;
  };

  return (
    <div className="sub-course-detail-container">
      <h1>{subCourse.title}</h1>
      <p>{subCourse.description}</p>

      <div className="media-container">
        {currentMedia && (
          <div className="media-content">
            {subCourse.images?.[currentMediaKey] && (
              <img
                src={convertDropboxLink(subCourse.images[currentMediaKey])}
                alt="Course Media"
              />
            )}
            {subCourse.pdfs?.[currentMediaKey] && (
              <iframe
                src={convertDropboxLink(subCourse.pdfs[currentMediaKey])}
                title="PDF Document"
                frameBorder="0"
                style={{ width: "100%", height: "900px" }}
                sandbox="allow-same-origin allow-scripts"
                allow="fullscreen"
              ></iframe>
            )}
            {subCourse.videos?.[currentMediaKey] && (
              <video controls style={{ width: "100%", height: "900px" }}>
                <source
                  src={convertDropboxLink(subCourse.videos[currentMediaKey])}
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        )}

        <div className="media-navigation">
          <button
            onClick={handlePrevMedia}
            disabled={currentMediaIndex === 0}
            style={{
              display: currentMediaIndex > 0 ? "inline-block" : "none",
            }}
          >
            Previous Media
          </button>
          <button
            onClick={handleNextMedia}
            disabled={currentMediaIndex === mediaKeys.length - 1}
          >
            Next Media
          </button>
        </div>
      </div>

      {currentQuestion && (
        <div className="question-container">
          <div className="question-navigation">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              style={{
                display: currentQuestionIndex > 0 ? "inline-block" : "none",
              }}
            >
              Previous Question
            </button>

            <button
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              Next Question
            </button>
          </div>

          <div className="question">
            <h3>{currentQuestion.text}</h3>
            {currentQuestion.answers.map((answer, index) => (
              <div className="answer-option" key={index}>
                <label>
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    value={answer.text}
                    checked={userAnswers[currentQuestionIndex] === answer.text}
                    onChange={() =>
                      handleAnswerChange(currentQuestionIndex, answer.text)
                    }
                  />
                  {answer.text}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSubmit}>Submit</button>

      {submissionResult && (
        <div className="submission-result">
          <h3>Submission Result</h3>
          <p>Email: {submissionResult.email}</p>
          <p>Course ID: {submissionResult.courseId}</p>
          <p>Total Time: {submissionResult.totalTime} seconds</p>
          <p>Success Percentage: {submissionResult.percentageSuccess}%</p>
        </div>
      )}
    </div>
  );
};

export default SubCourseDetailPage;
