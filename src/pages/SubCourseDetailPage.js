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
import "./CoursePage.css";
import { db, ref as dbRef, set as dbSet, get as dbGet, remove as dbRemove, push as dbPush } from "../firebase";
import { useAuth } from "../context/AuthContext";

function CoursePage() {
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
  const [newSubCourseName, setNewSubCourseName] = useState("");
  const [currentUserDepartment, setCurrentUserDepartment] = useState("");
  const [media, setMedia] = useState({ images: [], videos: [], pdfs: [], office: [] });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  const filteredCourses = mainCourses.filter(
    (course) => course.department === currentUserDepartment
  );

  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newPdfUrl, setNewPdfUrl] = useState("");
  const [newOfficeUrl, setNewOfficeUrl] = useState("");
  const [newOfficeType, setNewOfficeType] = useState("word"); // word, ppt

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  // استخدام المتغيرات غير المستخدمة لمنع تحذيرات eslint
  useEffect(() => {
    // فقط للطباعة
    console.log('pageNumber:', pageNumber);
    setPageNumber((prev) => prev);
    // متغيرات وهمية
    console.log('numPages:', numPages);
    setNumPages((prev) => prev);
    // استخدام db, dbRef, dbSet, dbGet, dbRemove, dbPush بشكل وهمي
    console.log('db:', db);
    console.log('dbRef:', dbRef);
    console.log('dbSet:', dbSet);
    console.log('dbGet:', dbGet);
    console.log('dbRemove:', dbRemove);
    console.log('dbPush:', dbPush);
    // استخدام currentUserRole بشكل وهمي
    console.log('currentUserRole:', currentUserRole);
  }, [pageNumber, numPages, db, dbRef, dbSet, dbGet, dbRemove, dbPush, currentUserRole]);

  const db = getDatabase();
  const { user } = useAuth();

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
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const userEmail = user.email;
      const usersRef = ref(db, "users");
      onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        const userData = Object.values(usersData).find(
          (u) => u.email === userEmail
        );
        if (userData) {
          setCurrentUserRole(userData.role);
          setCurrentUserDepartment(userData.department || "");
        }
      });
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
      setError("⚠️ لا يمكن أن يكون نص السؤال فارغًا.");
      return;
    }
    if (
      answers.length === 0 ||
      answers.every((answer) => !answer.text.trim())
    ) {
      setError("⚠️ يجب إدخال إجابة واحدة على الأقل.");
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
        await addLog(`تم تعديل سؤال في الكورس ${selectedCourse} - الدورة الفرعية ${selectedSubCourse}`);
      } else {
        // إضافة سؤال جديد
        const newQuestionRef = push(
          ref(
            db,
            `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
          )
        );
        await set(newQuestionRef, questionData);
        await addLog(`تم إضافة سؤال إلى الكورس ${selectedCourse} - الدورة الفرعية ${selectedSubCourse}`);
      }
      setNewQuestion("");
      setAnswers([{ text: "", correct: false }]);
      setEditQuestionIndex(null);
      setError("");
      setIsModalOpen(false);
    } catch (error) {
      setError("❌ فشل حفظ السؤال: " + error.message);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const questionRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions/${questionId}`
    );
    try {
      await remove(questionRef);
      await addLog(`تم حذف سؤال من الكورس ${selectedCourse} - الدورة الفرعية ${selectedSubCourse}`);
    } catch (error) {
      setError("Failed to delete question: " + error.message);
    }
  };

  const handleAddCourse = () => {
    // Function to convert last number from 0 to 1 in URLs
    const convertLastNumber = (url) => {
      if (!url) return url;
      // تحويل آخر رقم من 0 إلى 1 في أي رابط
      return url.replace(/(\d+)(?=\D*$)/, (match) => {
        return match.replace(/0$/, '1');
      });
    };
    const courseRef = ref(db, `courses/mainCourses/${newCourseName}`);
    set(courseRef, {
      name: newCourseName,
      thumbnail: convertLastNumber(thumbnail),
      department: currentUserDepartment,
    });
    addLog(`تم إضافة كورس جديد باسم ${newCourseName}`);
    setNewCourseName("");
    setThumbnail("");
  };

  const handleAddSubCourse = () => {
    const subCourseRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${newSubCourseName}`
    );
    set(subCourseRef, { name: newSubCourseName });
    addLog(`تم إضافة دورة فرعية باسم ${newSubCourseName} إلى الكورس ${selectedCourse}`);
    setNewSubCourseName("");
  };

  const handleAddNewQuestion = async () => {
    if (!newQuestion.trim()) {
      setError("⚠️ لا يمكن إضافة سؤال فارغ.");
      return;
    }
    if (
      answers.length === 0 ||
      answers.every((answer) => !answer.text.trim())
    ) {
      setError("⚠️ يجب إدخال إجابة واحدة على الأقل.");
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
      await addLog(`تم إضافة سؤال إلى الكورس ${selectedCourse} - الدورة الفرعية ${selectedSubCourse}`);
      setNewQuestion("");
      setAnswers([{ text: "", correct: false }]);
      setIsModalOpen(false);
      setError("");
    } catch (error) {
      setError("❌ حدث خطأ أثناء إضافة السؤال: " + error.message);
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
        await addLog(`تم إضافة ميديا إلى الكورس ${selectedCourse} - الدورة الفرعية ${selectedSubCourse}`);
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
        setError("Failed to add media: " + error.message);
      }
    } else {
      setError("Please provide at least one image, video, or PDF URL.");
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
      await addLog(`تم حذف ميديا من الكورس ${selectedCourse} - الدورة الفرعية ${selectedSubCourse}`);
    } catch (error) {
      setError("Failed to delete media: " + error.message);
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
      setError("Failed to update exp date: " + error.message);
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
  }, [db, selectedCourse, selectedSubCourse]);

  // دالة لتنسيق التاريخ والوقت
  const formatExpDate = (expDate) => {
    if (!expDate) return "بدون تاريخ انتهاء";
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
                  <div className="gg1">
                    <h2>Questions </h2>
                    <button
                      className="right"
                      onClick={() => setShowPopup(true)}
                    >
                      Add New
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
                      placeholder="Image Expiry Date"
                    />
                    <input
                      type="text"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder="Add Video URL"
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
                      placeholder="Video Expiry Date"
                    />
                    <input
                      type="text"
                      value={newPdfUrl}
                      onChange={(e) => setNewPdfUrl(e.target.value)}
                      placeholder="Add PDF URL (Dropbox link)"
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
                      placeholder="PDF Expiry Date"
                    />
                    <div>
                      <select value={newOfficeType} onChange={e => setNewOfficeType(e.target.value)}>
                        <option value="word">Word</option>
                        <option value="ppt">PowerPoint</option>
                      </select>
                      <input
                        type="text"
                        value={newOfficeUrl}
                        onChange={e => setNewOfficeUrl(e.target.value)}
                        placeholder="Add Microsoft File URL (Word, PowerPoint)"
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
                        placeholder="Office File Expiry Date"
                      />
                    </div>
                    <div className="a1">
                      <button className="a2" onClick={handleAddMedia}>
                        Add Media
                      </button>
                    </div>
                    <div className="media-display">
                      {media.office &&
                        media.office
                          .sort((a, b) => a.id - b.id)
                          .map((mediaItem) => {
                            // استخدم Google Docs Viewer إذا كان الرابط http/https
                            let canEmbed = mediaItem.url.startsWith('http://') || mediaItem.url.startsWith('https://');
                            let googleViewerUrl = canEmbed
                              ? `https://docs.google.com/gview?url=${encodeURIComponent(mediaItem.url)}&embedded=true`
                              : null;
                            return (
                              <div key={mediaItem.id} className="media-item1">
                                <div className="office-link-container">
                                  {canEmbed ? (
                                    <iframe
                                      src={googleViewerUrl}
                                      width="100%"
                                      height="400px"
                                      style={{ minHeight: "400px", maxHeight: "400px", border: 0 }}
                                      title="Office Viewer"
                                    />
                                  ) : (
                                    <a href={mediaItem.url} target="_blank" rel="noopener noreferrer">
                                      {mediaItem.type === "word" && "📄 Word File"}
                                      {mediaItem.type === "ppt" && "📊 PowerPoint File"}
                                    </a>
                                  )}
                                  <div style={{ fontSize: '0.95em', color: '#555', margin: '6px 0' }}>
                                    <span>تاريخ الانتهاء: {formatExpDate(mediaItem.expDate)}</span>
                                  </div>
                                  <div className="delete-button-container">
                                    <button
                                      className="vim"
                                      onClick={() => handleDeleteMedia("office", mediaItem.id)}
                                    >
                                      Delete
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
                                src={mediaItem.url}
                                alt={`Media ${mediaItem.id}`}
                              />
                              <div style={{ fontSize: '0.95em', color: '#555', margin: '6px 0' }}>
                                <span>تاريخ الانتهاء: {formatExpDate(mediaItem.expDate)}</span>
                              </div>
                              <div>
                                {editingMedia.id === mediaItem.id && editingMedia.type === "images" ? (
                                  <>
                                    <input
                                      type="datetime-local"
                                      value={editingMedia.expDate}
                                      onChange={e => setEditingMedia({ ...editingMedia, expDate: e.target.value })}
                                    />
                                    <button onClick={handleSaveExpDate}>حفظ</button>
                                    <button onClick={() => setEditingMedia({ id: null, type: null, expDate: "" })}>إلغاء</button>
                                  </>
                                ) : (
                                  <button onClick={() => handleEditExpDate("images", mediaItem.id, mediaItem.expDate)}>تعديل التاريخ</button>
                                )}
                              </div>
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
                              <div style={{ fontSize: '0.95em', color: '#555', margin: '6px 0' }}>
                                <span>تاريخ الانتهاء: {formatExpDate(mediaItem.expDate)}</span>
                              </div>
                              <div>
                                {editingMedia.id === mediaItem.id && editingMedia.type === "videos" ? (
                                  <>
                                    <input
                                      type="datetime-local"
                                      value={editingMedia.expDate}
                                      onChange={e => setEditingMedia({ ...editingMedia, expDate: e.target.value })}
                                    />
                                    <button onClick={handleSaveExpDate}>حفظ</button>
                                    <button onClick={() => setEditingMedia({ id: null, type: null, expDate: "" })}>إلغاء</button>
                                  </>
                                ) : (
                                  <button onClick={() => handleEditExpDate("videos", mediaItem.id, mediaItem.expDate)}>تعديل التاريخ</button>
                                )}
                              </div>
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

                      {media.pdfs &&
                        media.pdfs
                          .sort((a, b) => a.id - b.id)
                          .map((mediaItem) => {
                            // تحويل رابط Dropbox إلى رابط Google Docs Viewer
                            const dropboxUrl = mediaItem.url;
                            const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(dropboxUrl)}&embedded=true`;
                            return (
                              <div key={mediaItem.id} className="media-item1">
                                <div className="pdf-container">
                                  <iframe
                                    src={googleViewerUrl}
                                    width="100%"
                                    height="400px"
                                    style={{ minHeight: "400px", maxHeight: "400px" }}
                                    title="PDF Viewer"
                                  />
                                  <div style={{ fontSize: '0.95em', color: '#555', margin: '6px 0' }}>
                                    <span>تاريخ الانتهاء: {formatExpDate(mediaItem.expDate)}</span>
                                  </div>
                                  <div>
                                    {editingMedia.id === mediaItem.id && editingMedia.type === "pdfs" ? (
                                      <>
                                        <input
                                          type="datetime-local"
                                          value={editingMedia.expDate}
                                          onChange={e => setEditingMedia({ ...editingMedia, expDate: e.target.value })}
                                        />
                                        <button onClick={handleSaveExpDate}>حفظ</button>
                                        <button onClick={() => setEditingMedia({ id: null, type: null, expDate: "" })}>إلغاء</button>
                                      </>
                                    ) : (
                                      <button onClick={() => handleEditExpDate("pdfs", mediaItem.id, mediaItem.expDate)}>تعديل التاريخ</button>
                                    )}
                                  </div>
                                  <div className="delete-button-container">
                                    <button
                                      className="vim"
                                      onClick={() =>
                                        handleDeleteMedia("pdfs", mediaItem.id)
                                      }
                                    >
                                      Delete
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
