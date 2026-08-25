import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext";
import { writeDeptNotification } from "../utils/inbox";
import "./SubCourseDetailPage.css";

const NavigationButton = ({ onClick, disabled, text, className = "" }) => (
  <button
    type="button"
    className={`nav-btn ${className}`.trim()}
    onClick={onClick}
    disabled={disabled}
  >
    {text}
  </button>
);

const SubCourseDetailPage = () => {
  const { t } = useLanguage();
  const { subCourseId } = useParams();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [subCourse, setSubCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("learn");
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoCompleted, setAutoCompleted] = useState(false);

  useEffect(() => {
    const getCurrentUser = () =>
      new Promise((resolve, reject) => {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
          if (user) resolve(user);
          else reject(new Error(t("common.userNotAuthenticated")));
        });
      });

    const fetchUserData = async () => {
      try {
        const user = await getCurrentUser();
        setAuthUser(user);
        const safeEmailPath = user.email.replace(/\./g, ",");
        const userSnapshot = await get(ref(db, `users/${safeEmailPath}`));
        if (userSnapshot.exists()) {
          setUserName(userSnapshot.val().name || t("common.user"));
        } else {
          setUserName(t("common.user"));
        }
      } catch (err) {
        console.error("Data entry error:", err);
        setError(err.message);
      }
    };

    const fetchSubCourseDetails = async () => {
      try {
        const mainCourseId = new URLSearchParams(window.location.search).get(
          "mainCourseId"
        );
        if (!mainCourseId) {
          throw new Error(t("exam.mainCourseIdMissing"));
        }

        const snapshot = await get(
          ref(
            db,
            `courses/mainCourses/${mainCourseId}/subCourses/${subCourseId}`
          )
        );

        if (!snapshot.exists()) {
          throw new Error(t("exam.subCourseNotFound"));
        }

        const data = snapshot.val();
        setSubCourse(data);
        const questions = data.questions ? Object.values(data.questions) : [];
        setTotalQuestions(questions.length);
      } catch (err) {
        setError(t("exam.fetchError", { error: err.message }));
      } finally {
        setLoading(false);
      }
    };

    setStartTime(new Date());
    fetchUserData();
    fetchSubCourseDetails();
  }, [subCourseId, t]);

  const convertDropboxLink = (link) => {
    try {
      const url = new URL(link);
      if (url.hostname.endsWith("dropbox.com")) {
        url.hostname = "dl.dropboxusercontent.com";
        if (url.searchParams.has("dl")) {
          url.searchParams.set("dl", "1");
        }
        url.searchParams.delete("cloud_editor");
        return url.toString();
      }
    } catch {
      return link;
    }
    return link;
  };

  const mediaItems = useMemo(() => {
    const items = [];
    if (!subCourse?.media) return items;

    const today = new Date();
    const convertOfficeUrl = (url) =>
      url ? String(url).replace("dl=0", "dl=1") : url;

    const pushIfValid = (collection, type, mapItem) => {
      Object.keys(collection || {}).forEach((key) => {
        const item = collection[key];
        if (!item.expDate || new Date(item.expDate) > today) {
          items.push(mapItem(key, item));
        }
      });
    };

    pushIfValid(subCourse.media.images, "image", (key, item) => ({
      id: key,
      url: item.url,
      type: "image",
      expDate: item.expDate || null,
    }));
    pushIfValid(subCourse.media.videos, "video", (key, item) => ({
      id: key,
      url: item.url,
      type: "video",
      expDate: item.expDate || null,
    }));
    pushIfValid(subCourse.media.pdfs, "pdf", (key, item) => ({
      id: key,
      url: item.url,
      type: "pdf",
      expDate: item.expDate || null,
    }));
    pushIfValid(subCourse.media.office, "office", (key, item) => ({
      id: key,
      url: convertOfficeUrl(item.url),
      type: "office",
      officeType: item.type,
      expDate: item.expDate || null,
    }));

    return items;
  }, [subCourse]);

  useEffect(() => {
    if (loading || !subCourse) return;
    // No media + has exam → jump to exam. No questions → stay on learn (complete course).
    if (mediaItems.length === 0 && totalQuestions > 0) {
      setPhase("exam");
    }
  }, [loading, subCourse, mediaItems.length, totalQuestions]);

  const currentMedia = mediaItems[currentMediaIndex];
  const hasExam = totalQuestions > 0;
  const currentQuestion = hasExam
    ? Object.values(subCourse?.questions || {})[currentQuestionIndex]
    : null;

  useEffect(() => {
    if (
      currentMedia &&
      (currentMedia.type === "pdf" || currentMedia.type === "office")
    ) {
      setIframeLoading(true);
      const timer = setTimeout(() => setIframeLoading(false), 5000);
      return () => clearTimeout(timer);
    }
    setIframeLoading(false);
  }, [currentMedia]);

  const handleNextMedia = () => {
    if (currentMediaIndex < mediaItems.length - 1) {
      setCurrentMediaIndex((prev) => prev + 1);
    }
  };

  const handlePrevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex((prev) => prev - 1);
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setUserAnswers((prev) => {
      const updated = [...prev];
      updated[questionIndex] = answer;
      return updated;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (options = {}) => {
    const { forcePass = false } = options;
    if (submitting) return;
    if (!userName) {
      alert(t("exam.userNameNotLoaded"));
      return;
    }
    if (!authUser) {
      alert(t("common.userNotAuthenticated"));
      return;
    }

    setSubmitting(true);
    const endTime = new Date();
    const totalTime = (endTime - (startTime || endTime)) / 1000;
    let correctCount = 0;

    if (!forcePass && subCourse?.questions) {
      Object.values(subCourse.questions).forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswers = (question.answers || [])
          .filter((answer) => answer.correct)
          .map((answer) => answer.text);
        if (correctAnswers.includes(userAnswer)) {
          correctCount += 1;
        }
      });
    }

    // No questions (or explicit complete-without-exam) = automatic pass
    const percentageSuccess = forcePass || totalQuestions === 0
      ? "100.00"
      : ((correctCount / totalQuestions) * 100).toFixed(2);

    const submissionData = {
      email: authUser.email,
      userId: authUser.uid,
      userName,
      courseId: subCourseId,
      mainCourseId:
        new URLSearchParams(window.location.search).get("mainCourseId") || null,
      startTime: (startTime || endTime).toISOString(),
      endTime: endTime.toISOString(),
      totalTime,
      percentageSuccess,
      userAnswers: forcePass || totalQuestions === 0 ? [] : userAnswers,
      noExam: forcePass || totalQuestions === 0,
    };

    try {
      await set(
        ref(db, `submissions/${authUser.uid}/${subCourseId}`),
        submissionData
      );
      setSubmissionResult(submissionData);

      if (parseFloat(percentageSuccess) < 80) {
        const failMainId = submissionData.mainCourseId;
        if (failMainId) {
          const departmentSnapshot = await get(
            ref(db, `courses/mainCourses/${failMainId}`)
          );
          if (departmentSnapshot.exists()) {
            const department = (departmentSnapshot.val().department || "")
              .trim()
              .toLowerCase();
            if (department) {
              await writeDeptNotification(department, {
                createdAt: new Date().toISOString(),
                createdBy: authUser.email,
                isRead: false,
                readBy: {},
                message: t("exam.failedExamNotification", {
                  userName,
                  subCourseName: subCourse.name,
                }),
              });
            }
          }
        }
      }

      if (parseFloat(percentageSuccess) >= 80) {
        navigate("/certificates", {
          state: {
            userName,
            courseId: subCourseId,
            percentageSuccess,
            mainCourseId: submissionData.mainCourseId,
          },
        });
      } else {
        navigate("/welcome", { replace: true });
      }
    } catch (err) {
      console.error("Error submitting data:", err);
      alert(t("exam.failedToSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteWithoutExam = () => handleSubmit({ forcePass: true });

  // If course has no questions and no media, auto-complete as pass once ready
  useEffect(() => {
    if (
      loading ||
      !subCourse ||
      !authUser ||
      !userName ||
      autoCompleted ||
      submitting
    ) {
      return;
    }
    if (mediaItems.length === 0 && totalQuestions === 0) {
      setAutoCompleted(true);
      handleSubmit({ forcePass: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    subCourse,
    authUser,
    userName,
    mediaItems.length,
    totalQuestions,
    autoCompleted,
    submitting,
  ]);

  if (loading) {
    return (
      <div className="sub-course-detail">
        <p className="scd-status">{t("exam.loading")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="sub-course-detail">
        <p className="scd-status scd-error">
          {t("common.error", { error })}
        </p>
      </div>
    );
  }
  if (!subCourse) {
    return (
      <div className="sub-course-detail">
        <p className="scd-status">{t("exam.subCourseNotFound")}</p>
      </div>
    );
  }

  const answeredQuestionsCount = userAnswers.filter(
    (answer) => answer !== undefined
  ).length;

  const renderMediaViewer = () => {
    if (!currentMedia) return null;

    if (currentMedia.type === "image") {
      return (
        <img
          className="scd-media-el"
          src={convertDropboxLink(currentMedia.url)}
          alt={t("exam.courseMediaAlt")}
        />
      );
    }

    if (currentMedia.type === "video") {
      return (
        <video key={currentMedia.id} className="scd-media-el" controls>
          <source
            src={convertDropboxLink(currentMedia.url)}
            type="video/mp4"
          />
          {t("exam.videoNotSupported")}
        </video>
      );
    }

    if (currentMedia.type === "pdf") {
      return (
        <iframe
          className="scd-media-el scd-iframe"
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(
            currentMedia.url
          )}&embedded=true`}
          title={t("exam.pdfViewerTitle")}
          onLoad={() => setIframeLoading(false)}
        />
      );
    }

    if (currentMedia.type === "office") {
      const isPpt =
        currentMedia.officeType &&
        currentMedia.officeType.toLowerCase().includes("ppt");
      const src = isPpt
        ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
            convertDropboxLink(currentMedia.url)
          )}`
        : `https://docs.google.com/viewer?url=${encodeURIComponent(
            convertDropboxLink(currentMedia.url)
          )}&embedded=true`;

      return (
        <iframe
          className="scd-media-el scd-iframe"
          src={src}
          title={t("exam.officeViewerTitle", {
            type: currentMedia.officeType,
          })}
          onLoad={() => setIframeLoading(false)}
        />
      );
    }

    return null;
  };

  return (
    <div className="sub-course-detail">
      <div className="sub-course-detail-container">
        <header className="scd-header">
          <p className="scd-phase-label">
            {phase === "learn" ? t("exam.phaseLearn") : t("exam.phaseExam")}
          </p>
          <h1 className="scd-title">{subCourse.name}</h1>
          {subCourse.description ? (
            <p className="scd-description">{subCourse.description}</p>
          ) : null}

          <div className="scd-steps" aria-hidden="true">
            <span
              className={`scd-step ${phase === "learn" ? "active" : "done"}`}
            />
            {hasExam && (
              <span className={`scd-step ${phase === "exam" ? "active" : ""}`} />
            )}
          </div>
        </header>

        {phase === "learn" && (
          <section className="scd-learn" aria-label={t("exam.phaseLearn")}>
            {mediaItems.length > 0 ? (
              <>
                <p className="scd-progress-text">
                  {t("exam.mediaProgress", {
                    current: currentMediaIndex + 1,
                    total: mediaItems.length,
                  })}
                </p>

                <div className="scd-media-stage">
                  {iframeLoading &&
                    currentMedia &&
                    (currentMedia.type === "pdf" ||
                      currentMedia.type === "office") && (
                      <div className="scd-iframe-loading">
                        {t("exam.loading")}
                      </div>
                    )}
                  {renderMediaViewer()}
                </div>

                <div className="scd-media-controls">
                  <NavigationButton
                    onClick={handlePrevMedia}
                    disabled={currentMediaIndex === 0}
                    text={t("exam.previousMedia")}
                  />
                  <div className="scd-dots" role="tablist">
                    {mediaItems.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={index === currentMediaIndex}
                        className={`scd-dot ${
                          index === currentMediaIndex ? "active" : ""
                        }`}
                        onClick={() => setCurrentMediaIndex(index)}
                        title={`${index + 1}`}
                      />
                    ))}
                  </div>
                  <NavigationButton
                    onClick={handleNextMedia}
                    disabled={currentMediaIndex === mediaItems.length - 1}
                    text={t("exam.nextMedia")}
                  />
                </div>
              </>
            ) : (
              <p className="scd-empty-media">
                {hasExam ? t("exam.noMedia") : t("exam.noExamContent")}
              </p>
            )}

            <div className="scd-phase-actions">
              {hasExam ? (
                <button
                  type="button"
                  className="scd-primary-btn"
                  onClick={() => setPhase("exam")}
                  disabled={submitting}
                >
                  {t("exam.startExam")}
                </button>
              ) : (
                <button
                  type="button"
                  className="scd-primary-btn"
                  onClick={handleCompleteWithoutExam}
                  disabled={submitting}
                >
                  {submitting ? t("exam.completing") : t("exam.completeCourse")}
                </button>
              )}
            </div>
            {!hasExam && (
              <p className="scd-progress-text" style={{ textAlign: "center" }}>
                {t("exam.noQuestionsPassHint")}
              </p>
            )}
          </section>
        )}

        {phase === "exam" && hasExam && (
          <section className="scd-exam" aria-label={t("exam.phaseExam")}>
            {mediaItems.length > 0 && (
              <button
                type="button"
                className="scd-link-btn"
                onClick={() => setPhase("learn")}
              >
                {t("exam.backToMedia")}
              </button>
            )}

            {currentQuestion ? (
              <>
                <p className="scd-progress-text">
                  {t("exam.questionProgress", {
                    current: currentQuestionIndex + 1,
                    total: totalQuestions,
                  })}
                </p>

                <div className="scd-question-card">
                  <h2 className="scd-question-text">{currentQuestion.text}</h2>
                  <div className="scd-answers">
                    {currentQuestion.answers.map((answer, index) => {
                      const selected =
                        userAnswers[currentQuestionIndex] === answer.text;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`scd-answer-card ${
                            selected ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleAnswerChange(
                              currentQuestionIndex,
                              answer.text
                            )
                          }
                        >
                          <span className="scd-answer-marker" aria-hidden="true">
                            {selected ? "●" : "○"}
                          </span>
                          <span>{answer.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="scd-question-nav">
                  <NavigationButton
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    text={t("exam.previousQuestion")}
                  />
                  <NavigationButton
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    text={t("exam.nextQuestion")}
                  />
                </div>

                <div className="scd-overview">
                  <h3>{t("exam.questionOverview")}</h3>
                  <div className="scd-question-squares">
                    {Array.from({ length: totalQuestions }).map((_, index) => {
                      const isAnswered = userAnswers[index] !== undefined;
                      const isCurrent = index === currentQuestionIndex;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`scd-q-square ${
                            isCurrent
                              ? "current"
                              : isAnswered
                                ? "answered"
                                : "unanswered"
                          }`}
                          onClick={() => setCurrentQuestionIndex(index)}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="scd-submit-block">
                  <p className="scd-answered-of">
                    {t("exam.answeredOf", {
                      answered: answeredQuestionsCount,
                      total: totalQuestions,
                    })}
                  </p>
                  <button
                    type="button"
                    className="scd-primary-btn submit-button"
                    onClick={() => handleSubmit()}
                    disabled={
                      submitting || answeredQuestionsCount < totalQuestions
                    }
                  >
                    {submitting
                      ? t("exam.completing")
                      : t("exam.submitAnswers")}
                  </button>
                </div>
              </>
            ) : (
              <p className="scd-empty-media">{t("exam.noQuestions")}</p>
            )}

            {submissionResult && (
              <div className="submission-result">
                <h3>{t("exam.submissionResult")}</h3>
                <p>
                  {t("exam.resultName", { name: submissionResult.userName })}
                </p>
                <p>
                  {t("exam.resultEmail", { email: submissionResult.email })}
                </p>
                <p>
                  {t("exam.resultCourseId", {
                    courseId: submissionResult.courseId,
                  })}
                </p>
                <p>
                  {t("exam.score", {
                    percentage: parseFloat(
                      submissionResult.percentageSuccess
                    ).toFixed(2),
                  })}
                </p>
                <p>
                  {t("exam.totalTime", {
                    seconds: submissionResult.totalTime,
                  })}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default SubCourseDetailPage;
