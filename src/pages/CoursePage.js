import React, { useState, useEffect, useRef } from "react";
import {
  ref,
  onValue,
  set,
  remove,
  get,
  push,
} from "firebase/database";
import "./CoursePage.css";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

function CoursePage() {
  const { t } = useLanguage();
  const [mainCourses, setMainCourses] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

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
  const [moderatorName, setModeratorName] = useState("");
  const [newSubCourseName, setNewSubCourseName] = useState("");
  const [currentUserDepartment, setCurrentUserDepartment] = useState("");
  const [media, setMedia] = useState({ images: [], videos: [], pdfs: [], office: [] });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newPdfUrl, setNewPdfUrl] = useState("");
  const [newOfficeUrl, setNewOfficeUrl] = useState("");
  const [newOfficeType, setNewOfficeType] = useState("word"); // word, ppt

  const { user, isSuperAdmin, currentUserDepartment: authDept } = useAuth();

  // Helper to get user info for logs
  const getUserLogInfo = async () => {
    let userName = "Unknown";
    let userEmail = user?.email || "Unknown";
    if (userEmail !== "Unknown") {
      const safeEmailPath = userEmail.replace(/\./g, ",");
      const userRef = ref(db, `users/${safeEmailPath}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        userName = userData.name || userEmail;
      }
    }
    return { userName, userEmail };
  };

  // Log helper
  const addLog = async (detailMessage) => {
    const { userName } = await getUserLogInfo();
    const logsRef = ref(db, "logs");
    const logEntry = {
      userName,
      timestamp: new Date().toISOString(),
      detailMessage,
    };
    await push(logsRef, logEntry);
  };

  useEffect(() => {
    selectedSubCourseRef.current = selectedSubCourse;
  }, [selectedSubCourse]);

  useEffect(() => {
    if (!user?.email) return;
    const safeEmail = user.email.replace(/\./g, ",");
    const userRef = ref(db, `users/${safeEmail}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setCurrentUserRole(userData.role || "");
        setCurrentUserDepartment(userData.department || authDept || "");
      }
    });
    return () => unsubscribe();
  }, [user, authDept]);

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
  }, []);

  // Filter courses based on user role (SuperAdmin = all, admin = own department)
  const filteredCourses =
    currentUserRole?.toLowerCase() === "superadmin" || isSuperAdmin
      ? mainCourses
      : mainCourses.filter(
          (course) =>
            String(course.department || "")
              .toLowerCase()
              .trim() ===
            String(currentUserDepartment || "")
              .toLowerCase()
              .trim()
        );

  useEffect(() => {
    if (!selectedCourse) return;
    const course = mainCourses.find((c) => c.id === selectedCourse);
    if (course) {
      setModeratorName(course.moderatorName || "");
    }
  }, [selectedCourse, mainCourses]);

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
  }, [selectedCourse]);

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
  }, [selectedCourse, selectedSubCourse]);
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
      setError(t("courses.questionTextEmpty"));
      return;
    }
    if (
      answers.length === 0 ||
      answers.every((answer) => !answer.text.trim())
    ) {
      setError(t("courses.atLeastOneAnswer"));
      return;
    }
    const questionData = {
      text: newQuestion,
      answers: answers,
    };
    try {
      if (isEditMode) {
        // تحديث السؤال
        const questionRef = ref(
          db,
          `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions/${editQuestionIndex}`
        );
        await set(questionRef, questionData);
        await addLog(t("courses.logEditQuestion", { course: selectedCourse, sub: selectedSubCourse }));
      } else {
        // إضافة سؤال جديد
        const newQuestionRef = push(
          ref(
            db,
            `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
          )
        );
        await set(newQuestionRef, questionData);
        await addLog(t("courses.logAddQuestion", { course: selectedCourse, sub: selectedSubCourse }));
      }
      setNewQuestion("");
      setAnswers([{ text: "", correct: false }]);
      setEditQuestionIndex(null);
      setError("");
      setIsModalOpen(false);
    } catch (error) {
      setError(t("courses.failedSaveQuestion", { error: error.message }));
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const questionRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions/${questionId}`
    );
    try {
      await remove(questionRef);
      await addLog(t("courses.logDeleteQuestion", { course: selectedCourse, sub: selectedSubCourse }));
    } catch (error) {
      setError(t("courses.failedDeleteQuestion", { error: error.message }));
    }
  };

  const handleAddCourse = () => {
    // Function to convert Dropbox dl=0 to dl=1 and last number from 0 to 1
    const convertLastNumber = (url) => {
      if (!url) return url;
      let newUrl = url;
      // تحويل dl=0 إلى dl=1 في روابط Dropbox
      newUrl = newUrl.replace('dl=0', 'dl=1');
      // تحويل آخر رقم من 0 إلى 1 في أي رابط (لو موجود)
      newUrl = newUrl.replace(/(\d+)(?=\D*$)/, (match) => {
        return match.replace(/0$/, '1');
      });
      return newUrl;
    };
    const courseRef = ref(db, `courses/mainCourses/${newCourseName}`);
    set(courseRef, {
      name: newCourseName,
      thumbnail: convertLastNumber(thumbnail),
      department: currentUserDepartment,
      moderatorName: (moderatorName || "").trim(),
    });
    addLog(t("courses.logAddCourse", { name: newCourseName }));
    setNewCourseName("");
    setThumbnail("");
    setModeratorName("");
  };

  const handleSaveModeratorName = async () => {
    if (!selectedCourse) {
      alert(t("courses.selectAMainCourse"));
      return;
    }
    try {
      await set(
        ref(db, `courses/mainCourses/${selectedCourse}/moderatorName`),
        (moderatorName || "").trim()
      );
      await addLog(
        t("courses.logSaveModerator", {
          name: moderatorName || "-",
          course: selectedCourse,
        })
      );
      alert(t("courses.moderatorSaved"));
    } catch (e) {
      console.error(e);
      alert(t("courses.moderatorSaveError"));
    }
  };

  const handleAddSubCourse = () => {
    const subCourseRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${newSubCourseName}`
    );
    set(subCourseRef, { name: newSubCourseName });
    addLog(t("courses.logAddSubCourse", { name: newSubCourseName, course: selectedCourse }));
    setNewSubCourseName("");
  };

  const handleAddNewQuestion = async () => {
    if (!newQuestion.trim()) {
      setError(t("courses.cannotAddEmptyQuestion"));
      return;
    }
    if (
      answers.length === 0 ||
      answers.every((answer) => !answer.text.trim())
    ) {
      setError(t("courses.atLeastOneAnswer"));
      return;
    }
    const questionData = {
      text: newQuestion,
      answers: answers,
    };
    try {
      const newQuestionRef = push(
        ref(
          db,
          `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
        )
      );
      await set(newQuestionRef, questionData);
      await addLog(t("courses.logAddQuestion", { course: selectedCourse, sub: selectedSubCourse }));
      setNewQuestion("");
      setAnswers([{ text: "", correct: false }]);
      setIsModalOpen(false);
      setError("");
    } catch (error) {
      setError(t("courses.errorAddingQuestion", { error: error.message }));
    }
  };

  const handleEditAnswer = (answer) => {
    // ...existing code...
    // فقط للطباعة
    return null;
  };
  useEffect(() => {
    // استدعاء handleEditAnswer بشكل وهمي
    handleEditAnswer({ id: 'test' });
  }, []);

  const handleAddAnswer = () => {
    setAnswers([...answers, { text: "", correct: false }]);
  };
  // handleDeleteAnswer removed (unused)

  const [newImageExpDate, setNewImageExpDate] = useState("");
  const [newVideoExpDate, setNewVideoExpDate] = useState("");
  const [newPdfExpDate, setNewPdfExpDate] = useState("");
  const [newOfficeExpDate, setNewOfficeExpDate] = useState("");

  const handleAddMedia = async () => {
    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
    );

    // Function to convert Dropbox dl=0 to dl=1 and last number from 0 to 1
    const convertLastNumber = (url) => {
      if (!url) return url;
      let newUrl = url;
      // تحويل dl=0 إلى dl=1 في روابط Dropbox
      newUrl = newUrl.replace('dl=0', 'dl=1');
      // تحويل آخر رقم من 0 إلى 1 في أي رابط (لو موجود)
      newUrl = newUrl.replace(/(\d+)(?=\D*$)/, (match) => {
        return match.replace(/0$/, '1');
      });
      return newUrl;
    };

    const newMedia = {
      images: newImageUrl ? [{ url: convertLastNumber(newImageUrl), id: Date.now(), expDate: newImageExpDate }] : [],
      videos: newVideoUrl ? [{ url: convertLastNumber(newVideoUrl), id: Date.now() + 100000, expDate: newVideoExpDate }] : [],
      pdfs: newPdfUrl ? [{ url: convertLastNumber(newPdfUrl), id: Date.now() + 200000, expDate: newPdfExpDate }] : [],
      office: newOfficeUrl && newOfficeType !== "excel" ? [{ url: convertLastNumber(newOfficeUrl), id: Date.now() + 300000, expDate: newOfficeExpDate, type: newOfficeType }] : [],
    };

    if (
      newMedia.images.length > 0 ||
      newMedia.videos.length > 0 ||
      newMedia.pdfs.length > 0 ||
      newMedia.office.length > 0
    ) {
      try {
        const snapshot = await get(mediaRef);
        const existingMedia = snapshot.val() || { images: [], videos: [], pdfs: [], office: [] };
        const currentMedia = {
          images: Array.isArray(existingMedia.images) ? existingMedia.images : [],
          videos: Array.isArray(existingMedia.videos) ? existingMedia.videos : [],
          pdfs: Array.isArray(existingMedia.pdfs) ? existingMedia.pdfs : [],
          office: Array.isArray(existingMedia.office) ? existingMedia.office : [],
        };
        currentMedia.images.push(...newMedia.images);
        currentMedia.videos.push(...newMedia.videos);
        currentMedia.pdfs.push(...newMedia.pdfs);
        currentMedia.office.push(...newMedia.office);
        await set(mediaRef, currentMedia);
        await addLog(t("courses.logAddMedia", { course: selectedCourse, sub: selectedSubCourse }));
        setNewImageUrl("");
        setNewVideoUrl("");
        setNewPdfUrl("");
        setNewOfficeUrl("");
        setNewImageExpDate("");
        setNewVideoExpDate("");
        setNewPdfExpDate("");
        setNewOfficeExpDate("");
        setNewOfficeType("word");
        setMedia(currentMedia);
      } catch (error) {
        setError(t("courses.failedAddMedia", { error: error.message }));
      }
    } else {
      setError(t("courses.provideAtLeastOneMediaUrl"));
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
        setError(t("courses.noMediaFound"));
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
      } else if (mediaType === "pdfs" && existingMedia.pdfs) {
        existingMedia.pdfs = existingMedia.pdfs.filter(
          (item) => item.id !== mediaId
        );
      } else if (mediaType === "office" && existingMedia.office) {
        existingMedia.office = existingMedia.office.filter(
          (item) => item.id !== mediaId
        );
      } else {
        return;
      }
      await set(mediaRef, existingMedia);
      setMedia(existingMedia);
      await addLog(t("courses.logDeleteMedia", { course: selectedCourse, sub: selectedSubCourse }));
    } catch (error) {
      setError(t("courses.failedDeleteMedia", { error: error.message }));
    }
  };

  // onDocumentLoadSuccess removed (unused)

  // دوال تعديل exp date للميديا
  const handleEditExpDate = (mediaType, mediaId, currentExpDate) => {
    setEditingMedia({ id: mediaId, type: mediaType, expDate: currentExpDate || "" });
  };

  const handleSaveExpDate = async () => {
    if (!editingMedia.id || !editingMedia.type) return;
    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
    );
    try {
      const snapshot = await get(mediaRef);
      const existingMedia = snapshot.val() || { images: [], videos: [], pdfs: [] };
      const mediaList = existingMedia[editingMedia.type] || [];
      const updatedList = mediaList.map((item) =>
        item.id === editingMedia.id ? { ...item, expDate: editingMedia.expDate } : item
      );
      existingMedia[editingMedia.type] = updatedList;
      await set(mediaRef, existingMedia);
      setMedia(existingMedia);
      setEditingMedia({ id: null, type: null, expDate: "" });
    } catch (error) {
      setError(t("courses.failedUpdateExpDate", { error: error.message }));
    }
  };

  useEffect(() => {
    if (selectedCourse && selectedSubCourse) {
      const mediaRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/media`
      );
      const unsubscribe = onValue(mediaRef, (snapshot) => {
        const mediaData = snapshot.val() || { images: [], videos: [], pdfs: [], office: [] };
        setMedia(mediaData);
      });

      return () => unsubscribe();
    }
  }, [selectedCourse, selectedSubCourse]);

  // دالة لتنسيق التاريخ والوقت
  const formatExpDate = (expDate) => {
    if (!expDate) return t("courses.noExpiryDate");
    try {
      const d = new Date(expDate);
      if (isNaN(d.getTime())) return expDate;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return expDate;
    }
  };

  // دالة لتحويل روابط Dropbox إلى روابط مباشرة
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
    } catch (error) {
      return link;
    }
    return link;
  };

  // Rest of your JSX...
  // تأكد من أن دالة clearPopupFields مكتوبة بشكل صحيح
  const clearPopupFields = () => {
    setNewQuestion(""); // تصفير السؤال
    setAnswers([]); // مسح قائمة الإجابات
    setIsEditMode(false); // تصفير وضع التحرير
  };
  // Redundant block removed

  const [editingMedia, setEditingMedia] = useState({ id: null, type: null, expDate: "" });

  return (
    <div className="course">
      <header>
        <h1 className="header-h1">{t("courses.managementTitle")}</h1>
      </header>
      <div className="course-page">
        <details>
          <summary>{t("courses.addNew")}</summary>
          <div className="course-management-content">
            <div className="add-course-section">
              <div className="courses-container">
                <h2>{t("courses.mainCourses")}</h2>

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
                  <h2>{t("courses.addNewCourse")}</h2>
                  <div className="add-sub-course-form">
                    <input
                      type="text"
                      placeholder={t("courses.enterNewCourseName")}
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                    />
                  </div>

                  {/* مربع تحميل صورة الدورة */}
                  <h2>{t("courses.uploadCourseThumbnail")}</h2>
                  <div className="add-sub-course-form">
                    <input
                      type="text"
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder={t("courses.enterThumbnailUrl")}
                    />
                  </div>
                  <h2>{t("courses.moderatorName")}</h2>
                  <div className="add-sub-course-form">
                    <input
                      type="text"
                      value={moderatorName}
                      onChange={(e) => setModeratorName(e.target.value)}
                      placeholder={t("courses.moderatorNamePlaceholder")}
                    />
                  </div>
                  <div className="button-container">
                    <button className="cinter" onClick={handleAddCourse}>
                      {t("courses.addCourse")}
                    </button>
                    <button
                      className="cinter"
                      onClick={handleSaveModeratorName}
                      disabled={!selectedCourse}
                      type="button"
                    >
                      {t("courses.saveModeratorName")}
                    </button>
                  </div>
                </div>
              </div>

              {/* حاوية المربعات */}
              {/* مربع إضافة دورة جديدة */}
              <div className="courses-container">
                <h2>{t("courses.subCourses")}</h2>
                <ul className="sub-course-buttons">
                  {subCourses.map((subCourse) => (
                    <li key={subCourse.id} value={subCourse.id} disabled>
                      {subCourse.name}
                    </li>
                  ))}
                </ul>

                {/* مربع إضافة الدورات الفرعية */}
                <div className="sub-course-box">
                  <h2>{t("courses.addSubCourses")}</h2>
                  <div className="add-sub-course-form">
                    <input
                      type="text"
                      value={newSubCourseName}
                      onChange={(e) => setNewSubCourseName(e.target.value)}
                      placeholder={t("courses.addNewSubCourse")}
                    />
                  </div>
                  <div className="button-container">
                    <button className="a1" onClick={handleAddSubCourse}>
                      {t("courses.addSubCourse")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>

        <details>
          <summary>{t("courses.manageContent")}</summary>
          <div className="course-media-container">
            <div className="course-selection-container">
              <div className="course-selection">
                <div className="course-dropdown">
                  <h2>{t("courses.selectMainCourse")}</h2>

                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="dropdown"
                  >
                    <option value="" disabled>
                      {t("courses.selectAMainCourse")}
                    </option>
                    {filteredCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="course-dropdown">
                  <h2>{t("courses.selectSubCourse")}</h2>
                  <select
                    value={selectedSubCourse}
                    onChange={(e) => setSelectedSubCourse(e.target.value)}
                    className="dropdown"
                    disabled={!selectedCourse}
                  >
                    <option value="" disabled>
                      {t("courses.selectASubCourse")}
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
                  <div className="gg1">
                    <h2>{t("courses.questions")} </h2>
                    <button
                      className="right"
                      onClick={() => setShowPopup(true)}
                    >
                      {t("courses.addNew")}
                    </button>
                  </div>

                  {questions.map((question) => (
                    <div key={question.id} className="question-item">
                      <div className="question-content">
                        <h4>{question.text}</h4>

                        {/* عرض الإجابات تحت السؤال */}
                        <div className="answers-container">
                          <div className="answer-list">
                            {question.answers.map((answer, idx) => (
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
                              {t("common.edit")}
                            </button>

                            <button
                              onClick={() => handleDeleteQuestion(question.id)}
                            >
                              {t("common.delete")}
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
                                {t("common.close")}
                              </button>
                              <h3>
                                {isEditMode
                                  ? t("courses.editQuestion")
                                  : t("courses.addNewQuestion")}
                              </h3>

                              <input
                                type="text"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder={t("courses.enterQuestion")}
                              />
                              <h4>{t("courses.answersLabel")}</h4>
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
                                    placeholder={t("courses.enterAnswer")}
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
                                    {t("courses.correctAnswer")}
                                  </label>
                                </div>
                              ))}
                              <button
                                className="add-answer-btn"
                                onClick={handleAddAnswer}
                              >
                                {t("courses.addAnswer")}
                              </button>
                              <button
                                onClick={() => {
                                  handleUpdateQuestion();
                                  clearPopupFields(); // تنظيف الحقول بعد الحفظ
                                }}
                              >
                                {isEditMode ? t("common.saveChanges") : t("courses.addQuestion")}
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
                    <summary>{t("courses.uploadMedia")}</summary>
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder={t("courses.addImageUrl")}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMedia();
                        }
                      }}
                    />
                    <input
                      type="datetime-local"
                      value={newImageExpDate}
                      onChange={(e) => setNewImageExpDate(e.target.value)}
                      placeholder={t("courses.imageExpiryDate")}
                    />
                    <input
                      type="text"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder={t("courses.addVideoUrl")}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMedia();
                        }
                      }}
                    />
                    <input
                      type="datetime-local"
                      value={newVideoExpDate}
                      onChange={(e) => setNewVideoExpDate(e.target.value)}
                      placeholder={t("courses.videoExpiryDate")}
                    />
                    <input
                      type="text"
                      value={newPdfUrl}
                      onChange={(e) => setNewPdfUrl(e.target.value)}
                      placeholder={t("courses.addPdfUrl")}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMedia();
                        }
                      }}
                    />
                    <input
                      type="datetime-local"
                      value={newPdfExpDate}
                      onChange={(e) => setNewPdfExpDate(e.target.value)}
                      placeholder={t("courses.pdfExpiryDate")}
                    />
                    <div>
                      <select value={newOfficeType} onChange={e => setNewOfficeType(e.target.value)}>
                        <option value="word">{t("courses.word")}</option>
                        <option value="ppt">{t("courses.powerPoint")}</option>
                      </select>
                      <input
                        type="text"
                        value={newOfficeUrl}
                        onChange={e => setNewOfficeUrl(e.target.value)}
                        placeholder={t("courses.addMicrosoftFileUrl")}
                        onKeyPress={e => {
                          if (e.key === 'Enter') {
                            handleAddMedia();
                          }
                        }}
                      />
                      <input
                        type="datetime-local"
                        value={newOfficeExpDate}
                        onChange={e => setNewOfficeExpDate(e.target.value)}
                        placeholder={t("courses.officeFileExpiryDate")}
                      />
                    </div>
                    <div className="a1">
                      <button className="a2" onClick={handleAddMedia}>
                        {t("courses.addMedia")}
                      </button>
                    </div>
                    <div className="media-display">
                      {media.office &&
                        media.office
                          .sort((a, b) => a.id - b.id)
                          .map((mediaItem) => {
                            // استخدم Google Docs Viewer للوثائق والعروض التقديمية
                            let canEmbed = mediaItem.url.startsWith('http://') || mediaItem.url.startsWith('https://');
                            let viewerUrl = null;
                            if (canEmbed) {
                              if (mediaItem.type === "ppt") {
                                // استخدم Microsoft Office Online لملفات PowerPoint لدعم الملفات الكبيرة
                                viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(convertDropboxLink(mediaItem.url))}`;
                              } else {
                                // Google Docs للوثائق الأخرى
                                viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(convertDropboxLink(mediaItem.url))}&embedded=true`;
                              }
                            }
                            return (
                              <div key={mediaItem.id} className="media-item1">
                                <div className="office-link-container">
                                  {canEmbed ? (
                                    <>
                                      <iframe
                                        src={viewerUrl}
                                        width="100%"
                                        height="400px"
                                        style={{ minHeight: "400px", maxHeight: "400px", border: 0 }}
                                        title={t("courses.officeViewer")}
                                        onError={(e) => {
                                          // في حالة فشل التحميل، أظهر رابط التنزيل
                                          e.target.style.display = 'none';
                                          const link = e.target.parentNode.querySelector('.fallback-link');
                                          if (link) link.style.display = 'block';
                                        }}
                                      />
                                    </>
                                  ) : (
                                    <a href={mediaItem.url} target="_blank" rel="noopener noreferrer">
                                      {mediaItem.type === "word" && `📄 ${t("courses.wordFile")}`}
                                      {mediaItem.type === "ppt" && `📊 ${t("courses.powerPointFile")}`}
                                    </a>
                                  )}
                                  {/* رابط احتياطي في حالة فشل الـ iframe */}
                                  <a
                                    href={mediaItem.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="fallback-link"
                                    style={{ display: 'none', color: '#007bff', textDecoration: 'underline', marginTop: '10px' }}
                                  >
                                    {mediaItem.type === "ppt" ? `📊 ${t("courses.openPowerPointFallback")}` : `📄 ${t("courses.openFile")}`}
                                  </a>
                                  <div style={{ fontSize: '0.95em', color: '#555', margin: '6px 0' }}>
                                    <span>{t("courses.expiryDateLabel", { date: formatExpDate(mediaItem.expDate) })}</span>
                                  </div>
                                  <div className="delete-button-container">
                                    <button
                                      className="vim"
                                      onClick={() => handleDeleteMedia("office", mediaItem.id)}
                                    >
                                      {t("common.delete")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      {media.images &&
                        media.images
                          .sort((a, b) => a.id - b.id)
                          .map((mediaItem) => (
                            <div key={mediaItem.id} className="media-item1">
                              <img
                                src={convertDropboxLink(mediaItem.url)}
                                alt={t("courses.mediaAlt", { id: mediaItem.id })}
                              />
                              <div style={{ fontSize: '0.95em', color: '#555', margin: '6px 0' }}>
                                <span>{t("courses.expiryDateLabel", { date: formatExpDate(mediaItem.expDate) })}</span>
                              </div>
                              <div>
                                {editingMedia.id === mediaItem.id && editingMedia.type === "images" ? (
                                  <>
                                    <input
                                      type="datetime-local"
                                      value={editingMedia.expDate}
                                      onChange={e => setEditingMedia({ ...editingMedia, expDate: e.target.value })}
                                    />
                                    <button onClick={handleSaveExpDate}>{t("common.save")}</button>
                                    <button onClick={() => setEditingMedia({ id: null, type: null, expDate: "" })}>{t("common.cancel")}</button>
                                  </>
                                ) : (
                                  <button onClick={() => handleEditExpDate("images", mediaItem.id, mediaItem.expDate)}>{t("courses.editDate")}</button>
                                )}
                              </div>
                              <div className="delete-button-container">
                                <button
                                  className="vim"
                                  onClick={() =>
                                    handleDeleteMedia("images", mediaItem.id)
                                  }
                                >
                                  {t("common.delete")}
                                </button>
                              </div>
                            </div>
                          ))}

                      {media.videos &&
                        media.videos
                          .sort((a, b) => a.id - b.id)
                          .map((mediaItem) => (
                            <div key={mediaItem.id} className="media-item1">
                              <video src={convertDropboxLink(mediaItem.url)} controls />
                              <div style={{ fontSize: '0.95em', color: '#555', margin: '6px 0' }}>
                                <span>{t("courses.expiryDateLabel", { date: formatExpDate(mediaItem.expDate) })}</span>
                              </div>
                              <div>
                                {editingMedia.id === mediaItem.id && editingMedia.type === "videos" ? (
                                  <>
                                    <input
                                      type="datetime-local"
                                      value={editingMedia.expDate}
                                      onChange={e => setEditingMedia({ ...editingMedia, expDate: e.target.value })}
                                    />
                                    <button onClick={handleSaveExpDate}>{t("common.save")}</button>
                                    <button onClick={() => setEditingMedia({ id: null, type: null, expDate: "" })}>{t("common.cancel")}</button>
                                  </>
                                ) : (
                                  <button onClick={() => handleEditExpDate("videos", mediaItem.id, mediaItem.expDate)}>{t("courses.editDate")}</button>
                                )}
                              </div>
                              <div className="delete-button-container">
                                <button
                                  className="vim"
                                  onClick={() =>
                                    handleDeleteMedia("videos", mediaItem.id)
                                  }
                                >
                                  {t("common.delete")}
                                </button>
                              </div>
                            </div>
                          ))}

                      {media.pdfs &&
                        media.pdfs
                          .sort((a, b) => a.id - b.id)
                          .map((mediaItem) => {
                            // تحويل رابط Dropbox إلى رابط Google Docs Viewer
                            const dropboxUrl = convertDropboxLink(mediaItem.url);
                            const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(dropboxUrl)}&embedded=true`;
                            return (
                              <div key={mediaItem.id} className="media-item1">
                                <div className="pdf-container">
                                  <iframe
                                    src={googleViewerUrl}
                                    width="100%"
                                    height="400px"
                                    style={{ minHeight: "400px", maxHeight: "400px" }}
                                    title={t("exam.pdfViewerTitle")}
                                  />
                                  <div style={{ fontSize: '0.95em', color: '#555', margin: '6px 0' }}>
                                    <span>{t("courses.expiryDateLabel", { date: formatExpDate(mediaItem.expDate) })}</span>
                                  </div>
                                  <div>
                                    {editingMedia.id === mediaItem.id && editingMedia.type === "pdfs" ? (
                                      <>
                                        <input
                                          type="datetime-local"
                                          value={editingMedia.expDate}
                                          onChange={e => setEditingMedia({ ...editingMedia, expDate: e.target.value })}
                                        />
                                        <button onClick={handleSaveExpDate}>{t("common.save")}</button>
                                        <button onClick={() => setEditingMedia({ id: null, type: null, expDate: "" })}>{t("common.cancel")}</button>
                                      </>
                                    ) : (
                                      <button onClick={() => handleEditExpDate("pdfs", mediaItem.id, mediaItem.expDate)}>{t("courses.editDate")}</button>
                                    )}
                                  </div>
                                  <div className="delete-button-container">
                                    <button
                                      className="vim"
                                      onClick={() =>
                                        handleDeleteMedia("pdfs", mediaItem.id)
                                      }
                                    >
                                      {t("common.delete")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                {t("common.close")}
              </button>
              <h3>{t("courses.addNewQuestion")}</h3>
              <h4 className="gg">{t("courses.questionLabel")}</h4>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={t("courses.enterNewQuestion")}
              />
              <div className="Add-answer">
                <div className="gg">
                  <h4>{t("courses.answersLabel")} </h4>
                </div>
                <button className="right2" onClick={handleAddAnswer}>
                  {t("courses.addNew")}
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
                    placeholder={t("courses.enterAnswer")}
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
                    {t("courses.correctAnswer")}
                  </label>
                </div>
              ))}
              <button
                className="save-question-btn"
                onClick={handleAddNewQuestion}
              >
                {t("common.save")}
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
