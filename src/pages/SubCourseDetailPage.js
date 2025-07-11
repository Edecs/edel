import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, set, push } from "firebase/database"; // تأكد من استيراد get أيضًا
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./SubCourseDetailPage.css";

// Reusable Button Component
const NavigationButton = ({ onClick, disabled, visible, text }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ visibility: visible ? "visible" : "hidden" }}
    >
      {text}
    </button>
  );
};

const SubCourseDetailPage = () => {
  const { subCourseId } = useParams();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [subCourse, setSubCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const getCurrentUser = () => {
      return new Promise((resolve, reject) => {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
          if (user) {
            resolve(user);
          } else {
            reject(new Error("User is not authenticated."));
          }
        });
      });
    };

    const fetchUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error("User is not authenticated.");
        }

        const email = user.email;
        const safeEmailPath = email.replace(/\./g, ",");

        // Fetch user name
        const userRef = ref(db, `users/${safeEmailPath}`);
        const userSnapshot = await get(userRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          setUserName(userData.name || "User");
        } else {
          setUserName("User");
        }
      } catch (error) {
        console.error("Data entry error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

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
    if (currentMediaIndex < mediaItems.length - 1) {
      setCurrentMediaIndex((prevIndex) => prevIndex + 1);
    }
  };

  const handlePrevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex((prevIndex) => prevIndex - 1);
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
    // التأكد من أنه تم تحميل اسم المستخدم قبل المتابعة
    if (!userName) {
      alert("User name not loaded. Please try again.");
      return;
    }

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
      totalQuestions > 0
        ? ((correctCount / totalQuestions) * 100).toFixed(2)
        : "0.00";

    const submissionData = {
      email: user.email,
      userId: user ? user.uid : "Anonymous",
      userName: userName,
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

      // إرسال إشعار للمسؤولين في حالة الرسوب
      if (parseFloat(percentageSuccess) < 80) {
        const mainCourseId = new URLSearchParams(window.location.search).get(
          "mainCourseId"
        );
        const departmentRef = ref(db, `courses/mainCourses/${mainCourseId}`);
        const departmentSnapshot = await get(departmentRef);
        if (departmentSnapshot.exists()) {
          const departmentData = departmentSnapshot.val();
          const department = departmentData.department.trim().toLowerCase();

          const usersRef = ref(db, "users");
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            const admins = Object.values(usersData).filter((user) => {
              const userDepartment = user.department?.trim().toLowerCase();
              const courseDepartment = department?.trim().toLowerCase();

              return (
                userDepartment === courseDepartment &&
                (user.role.toLowerCase() === "admin" ||
                  user.role.toLowerCase() === "superadmin")
              );
            });

            // إرسال إشعار للمسؤولين
            admins.forEach(async (admin) => {
              const notificationRef = ref(db, "notifications");
              const newNotification = {
                assignedEmail: admin.email,
                createdAt: new Date().toISOString(),
                createdBy: user.email,
                isRead: false,
                message: `User ${userName} has failed the exam in the sub-course ${subCourse.name}.`,
              };
              await push(notificationRef, newNotification);
            });
          }
        }
      }

      if (percentageSuccess >= 80) {
        navigate("/certificates", {
          state: { userName, courseId: subCourseId, percentageSuccess },
        });
      } else {
        navigate("/welcome", { replace: true });
      }
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to submit data.");
    }
  };

  const convertDropboxLink = (link) => {
    if (link.includes("dropbox.com")) {
      return link
        .replace("www.dropbox.com", "dl.dropboxusercontent.com")
        .replace("?dl=1", "");
    }
    return link;
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!subCourse) return <p>Sub-course not found.</p>;

  // Prepare media items
  const mediaItems = [];
  const today = new Date();

  if (subCourse?.media) {
    const imageKeys = Object.keys(subCourse.media.images || {});
    imageKeys.forEach((key) => {
      const item = subCourse.media.images[key];
      if (!item.expDate || new Date(item.expDate) > today) {
        mediaItems.push({
          id: key,
          url: item.url,
          type: "image",
          expDate: item.expDate || null,
        });
      }
    });

    const videoKeys = Object.keys(subCourse.media.videos || {});
    videoKeys.forEach((key) => {
      const item = subCourse.media.videos[key];
      if (!item.expDate || new Date(item.expDate) > today) {
        mediaItems.push({
          id: key,
          url: item.url,
          type: "video",
          expDate: item.expDate || null,
        });
      }
    });

    const pdfKeys = Object.keys(subCourse.media.pdfs || {});
    pdfKeys.forEach((key) => {
      const item = subCourse.media.pdfs[key];
      if (!item.expDate || new Date(item.expDate) > today) {
        mediaItems.push({
          id: key,
          url: item.url,
          type: "pdf",
          expDate: item.expDate || null,
        });
      }
    });
  }

  const currentMedia = mediaItems[currentMediaIndex];
  const currentQuestion = subCourse?.questions
    ? Object.values(subCourse.questions)[currentQuestionIndex]
    : null;

  const answeredQuestionsCount = userAnswers.filter(
    (answer) => answer !== undefined
  ).length;

  return (
    <div className="sub-course-detail">
      <header>
        <h1 className="header-h1">{subCourse.name}</h1>
      </header>
      <div className="sub-course-detail-container">
        <p>{subCourse.description}</p>
        <div className="media-container">
          {currentMedia && (
            <div className="media-content">
              {currentMedia.type === "image" && (
                <div className="media-item">
                  <img
                    src={convertDropboxLink(currentMedia.url)}
                    alt="Course Media"
                    style={{ width: "100%", height: "auto" }}
                  />
                </div>
              )}
              {currentMedia.type === "video" && (
                <div className="media-item">
                  <video
                    key={currentMedia.id}
                    controls
                    style={{ width: "100%", height: "auto" }}
                  >
                    <source
                      src={convertDropboxLink(currentMedia.url)}
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
              {currentMedia.type === "pdf" && (
                <div className="media-item">
                  <div className="pdf-container">
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentMedia.url)}&embedded=true`}
                      width="100%"
                      height="600px"
                      title="PDF Viewer"
                    />
                  </div>
                </div>
              )}

              <div className="media-navigation">
                <NavigationButton
                  onClick={handlePrevMedia}
                  disabled={currentMediaIndex === 0}
                  visible={currentMediaIndex > 0}
                  text="Previous Media"
                />
                <NavigationButton
                  onClick={handleNextMedia}
                  disabled={currentMediaIndex === mediaItems.length - 1}
                  visible={currentMediaIndex < mediaItems.length - 1}
                  text="Next Media"
                />
              </div>
            </div>
          )}
        </div>

        {currentQuestion && (
          <div className="question-container">
            <div className="question">
              <h3>{currentQuestion.text}</h3>
              {currentQuestion.answers.map((answer, index) => (
                <div className="answer-option" key={index}>
                  <label>
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={answer.text}
                      checked={
                        userAnswers[currentQuestionIndex] === answer.text
                      }
                      onChange={() =>
                        handleAnswerChange(currentQuestionIndex, answer.text)
                      }
                    />
                    {answer.text}
                  </label>
                </div>
              ))}
            </div>
            <div className="question-navigation">
              <NavigationButton
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                visible={currentQuestionIndex > 0}
                text="Previous Question"
              />

              <NavigationButton
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === totalQuestions - 1}
                visible={currentQuestionIndex < totalQuestions - 1}
                text="Next Question"
              />
            </div>

            <div className="question-overview">
              <h3>Question Overview</h3>
              <div className="question-squares">
                {Array.from({ length: totalQuestions }).map((_, index) => {
                  const isAnswered = userAnswers[index] !== undefined;
                  return (
                    <div
                      key={index}
                      className={`question-square ${
                        isAnswered ? "answered" : "unanswered"
                      }`}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      {index + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="submission-container">
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={answeredQuestionsCount < totalQuestions} // Enabled when all questions are answered
          >
            Submit Answers
          </button>
        </div>

        {submissionResult && (
          <div className="submission-result">
            <h3>Submission Result</h3>
            <p>Name: {submissionResult.userName}</p>
            <p>Email: {submissionResult.email}</p>
            <p>Course ID: {submissionResult.courseId}</p>
            <p>
              Score: {parseFloat(submissionResult.percentageSuccess).toFixed(2)}
              %
            </p>
            <p>Total Time: {submissionResult.totalTime} seconds</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubCourseDetailPage;
