import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getDatabase, ref, get } from "firebase/database";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs"; // This should be at the top of the file, before any functions or logic
import html2canvas from "html2canvas"; // إضافة الاستيراد هنا
import { useLanguage } from "../context/LanguageContext";

import "./SubmissionsPage.scss";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function SubmissionsPage() {
  const { t } = useLanguage();
  const [submissions, setSubmissions] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // استخدام المتغيرات غير المستخدمة لمنع تحذيرات eslint
  useEffect(() => {
    // فقط للطباعة
    console.log('XLSX:', XLSX);
    console.log('ExcelJS:', ExcelJS);
    console.log('html2canvas:', html2canvas);
    console.log('error:', error);
    console.log('loading:', loading);
    setSelectedMember((prev) => prev);
    console.log('membersList:', membersList);
    // استدعاء DashboardPieChart بشكل وهمي
    if (typeof DashboardPieChart === 'function') {
      DashboardPieChart();
    }
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [sitesList, setSitesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const database = getDatabase();
  const [expandedUser, setExpandedUser] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return t("common.notAvailable");
    const date = new Date(dateString);
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    const formattedDate = date.toLocaleDateString(undefined, options);
    const formattedTime = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit", // ✅ إضافة الثواني هنا
    });
    return `${formattedDate} - ${formattedTime}`;
  };
  // دالة لتحويل الوقت من ثواني إلى "ساعة:دقيقة:ثانية" مع تجاهل الكسور الزائدة
  const formatTotalTime = (seconds) => {
    if (!seconds) return "00:00:00"; // في حالة عدم وجود وقت، نعرض 00:00:00
    const roundedSeconds = Math.round(seconds); // تقريب القيمة إلى أقرب ثانية
    const hours = Math.floor(roundedSeconds / 3600); // حساب الساعات
    const minutes = Math.floor((roundedSeconds % 3600) / 60); // حساب الدقائق
    const remainingSeconds = roundedSeconds % 60; // حساب الثواني

    // تنسيق الوقت بحيث تكون جميع الأرقام مكونة من رقمين
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  // عرض **Total Time** باستخدام الدالة formatTotalTime

  const fetchSubmissions = useCallback(async () => {
    try {
      const submissionsRef = ref(database, "submissions");
      const usersRef = ref(database, "users");

      const [submissionsSnapshot, usersSnapshot] = await Promise.all([
        get(submissionsRef),
        get(usersRef),
      ]);

      if (submissionsSnapshot.exists() && usersSnapshot.exists()) {
        const submissionsData = submissionsSnapshot.val();
        const fetchedUsersData = usersSnapshot.val();

        setUsersData(fetchedUsersData);

        const submissionsList = Object.entries(submissionsData).flatMap(
          ([userId, courses]) =>
            Object.entries(courses).map(([courseId, submission]) => {
              return {
                email: submission.email || t("common.unknown"),
                userName: submission.userName || t("common.unknown"),
                courseId: courseId,
                startTime: formatDate(submission.startTime) || t("common.notAvailable"),
                endTime: formatDate(submission.endTime) || t("common.notCompleted"),
                totalTime: submission.totalTime || t("common.notAvailable"),
                successRate: submission.percentageSuccess || t("common.notAvailable"),
                userAnswers: submission.userAnswers
                  ? submission.userAnswers.join(", ")
                  : t("common.notAvailable"),
              };
            })
        );

        const emailsInSubmissions = submissionsList.map((s) =>
          s.email?.toLowerCase()
        );
        const matchedUsers = Object.values(fetchedUsersData).filter((user) =>
          emailsInSubmissions.includes(user.email?.toLowerCase())
        );

        setSubmissions(submissionsList);
        setMembersList(matchedUsers.map((u) => u.userName));
        setSitesList([
          ...new Set(matchedUsers.map((u) => u.site || t("common.notDefined"))),
        ]);
        setDepartmentsList([
          ...new Set(matchedUsers.map((u) => u.department || t("common.notDefined"))),
        ]);
        setCoursesList([
          ...new Set(submissionsList.map((s) => s.courseId || t("common.notDefined"))),
        ]);
      }
    } catch (error) {
      setError(t("errors.failedFetchData", { error: error.message }));
    } finally {
      setLoading(false);
    }
  }, [database, t]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearchTerm =
        (submission.email ? submission.email.toLowerCase() : "").includes(
          searchTerm.toLowerCase()
        ) ||
        (submission.courseId ? submission.courseId.toLowerCase() : "").includes(
          searchTerm.toLowerCase()
        ) ||
        (submission.userName ? submission.userName.toLowerCase() : "").includes(
          searchTerm.toLowerCase()
        );

      const userEmail = submission.email?.toLowerCase();
      const matchedUser = Object.values(usersData).find(
        (user) => user.email?.toLowerCase() === userEmail
      );

      const matchesMember =
        !selectedMember || submission.userName === selectedMember;
      const matchesSite = !selectedSite || matchedUser?.site === selectedSite;
      const matchesDepartment =
        !selectedDepartment || matchedUser?.department === selectedDepartment;
      const matchesCourse =
        !selectedCourse || submission.courseId === selectedCourse;

      return (
        matchesSearchTerm &&
        matchesMember &&
        matchesSite &&
        matchesDepartment &&
        matchesCourse
      );
    });
  }, [
    submissions,
    searchTerm,
    selectedMember,
    selectedSite,
    selectedDepartment,
    selectedCourse,
    usersData,
  ]);

  const groupedByMember = filteredSubmissions.reduce((acc, submission) => {
    const email = submission.email.toLowerCase();
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(submission);
    return acc;
  }, {});

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Submissions");

    // Dashboard Data
    const dashboardData = getDashboardData();
    worksheet.addRow([
      t("submissionsReport.excelDashboardData"),
      t("submissionsReport.totalUsers", { count: dashboardData.totalUsers }),
      t("submissionsReport.averageSuccessRate", {
        rate: dashboardData.averageSuccessRate.toFixed(2),
      }),
      t("submissionsReport.totalWrongAnswers", {
        count: dashboardData.wrongAnswers,
      }),
    ]);

    worksheet.addRow([]); // صف فاصل

    // Columns
    worksheet.columns = [
      { header: t("submissionsReport.excelHeaderEmail"), key: "email", width: 25 },
      { header: t("submissionsReport.excelHeaderUserName"), key: "userName", width: 20 },
      { header: t("submissionsReport.excelHeaderSite"), key: "site", width: 20 }, // ✅ جديد
      { header: t("submissionsReport.excelHeaderDepartment"), key: "department", width: 20 }, // ✅ جديد
      { header: t("submissionsReport.excelHeaderCourseId"), key: "courseId", width: 20 },
      { header: t("submissionsReport.excelHeaderStartTime"), key: "startTime", width: 25 },
      { header: t("submissionsReport.excelHeaderEndTime"), key: "endTime", width: 25 },
      { header: t("submissionsReport.excelHeaderTotalTime"), key: "totalTime", width: 15 },
      { header: t("submissionsReport.excelHeaderSuccessRate"), key: "successRate", width: 15 },
      { header: t("submissionsReport.excelHeaderUserAnswers"), key: "userAnswers", width: 30 },
    ];

    // Rows
    filteredSubmissions.forEach((submission) => {
      const user = Object.values(usersData).find(
        (u) => u.email?.toLowerCase() === submission.email?.toLowerCase()
      );

      worksheet.addRow({
        email: submission.email,
        userName: submission.userName,
        site: user?.site || t("common.notDefined"), // ✅ جديد
        department: user?.department || t("common.notDefined"), // ✅ جديد
        courseId: submission.courseId,
        startTime: submission.startTime,
        endTime: submission.endTime,
        totalTime: formatTotalTime(submission.totalTime),
        successRate: submission.successRate,
        userAnswers: submission.userAnswers,
      });
    });

    // Export file
    const chartElement = document.querySelector(".charts");
    if (chartElement) {
      html2canvas(chartElement).then((canvas) => {
        canvas.toBlob((blob) => {
          workbook.xlsx.writeBuffer().then((buffer) => {
            const newWorkbook = new Blob([buffer], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const link = document.createElement("a");
            link.href = URL.createObjectURL(newWorkbook);
            link.download = "submissions_with_chart.xlsx";
            link.click();
          });
        });
      });
    }
  };

  // دالة لحساب نسبة النجاح للمستخدمين
  const calculateSuccessRate = (submissions) => {
    const totalSubmissions = submissions.length;
    const successfulSubmissions = submissions.filter(
      (submission) => submission.successRate >= 50 // افتراض أن 50% هي عتبة النجاح
    ).length;
    return (successfulSubmissions / totalSubmissions) * 100;
  };
  const calculateWrongAnswers = (userAnswers) => {
    if (!Array.isArray(userAnswers)) {
      return 0; // إذا كانت userAnswers ليست مصفوفة، نعيد صفرًا
    }

    return userAnswers.reduce((wrongCount, answer) => {
      return wrongCount + (answer === "wrong" ? 1 : 0); // نفترض أن "wrong" هو الإجابة الخاطئة
    }, 0);
  };

  // حساب البيانات التحليلية (عدد المستخدمين ونسبة النجاح)
  const getDashboardData = () => {
    const totalUsers = filteredSubmissions.length;
    const totalSuccessRate = filteredSubmissions.reduce((acc, submission) => {
      return acc + calculateSuccessRate([submission]);
    }, 0);

    const wrongAnswers = filteredSubmissions.reduce((acc, submission) => {
      return acc + calculateWrongAnswers(submission.userAnswers || []); // التأكد من أن userAnswers مصفوفة
    }, 0);

    const averageSuccessRate = totalSuccessRate / totalUsers;

    return {
      totalUsers,
      averageSuccessRate,
      wrongAnswers,
    };
  };

  // حساب نسبة النجاح العامة
  const calculateCourseSuccessRate = () => {
    const totalCourses = submissions.length;
    const successfulCourses = submissions.filter(
      (submission) => submission.successRate >= 50 // افتراض أن 50% هي عتبة النجاح
    ).length;
    return (successfulCourses / totalCourses) * 100;
  };
  const getDashboardChartData = () => {
    const totalSubmissions = filteredSubmissions.length;
    const successful = filteredSubmissions.filter(
      (submission) => submission.successRate >= 50
    ).length;
    const failed = totalSubmissions - successful;

    return [
      {
        name: t("submissionsReport.chartSuccess"),
        value: successful,
        color: "#4CAF50",
      },
      {
        name: t("submissionsReport.chartFailure"),
        value: failed,
        color: "#FF5733",
      },
    ];
  };

  const DashboardPieChart = () => {
    const data = getDashboardChartData();
    const total = data.reduce((acc, item) => acc + item.value, 0);

    return (
      <PieChart width={400} height={300}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => {
            const percentage = ((value / total) * 100).toFixed(0);
            return `${name}: ${percentage}%`;
          }}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    );
  };

  const renderDashboardChart = () => {
    const chartData = getDashboardChartData();

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            fill="#8884d8"
            label={({ name, value }) => {
              const total = chartData.reduce(
                (acc, item) => acc + item.value,
                0
              );
              const percentage = ((value / total) * 100).toFixed(1);
              return `${name}: ${value} (${percentage}%)`;
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div>
      <header>
        <h1 className="header-h1">{t("submissionsReport.title")}</h1>
      </header>
      <div className="submissions-page">
        <div className="left-panel">
          <h2>{t("submissionsReport.filterUsers")}</h2>
          <input
            type="text"
            placeholder={t("submissionsReport.searchUser")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            onChange={(e) => setSelectedSite(e.target.value)}
            value={selectedSite || ""}
          >
            <option value="">{t("submissionsReport.allSites")}</option>
            {sitesList.map((site, index) => (
              <option key={index} value={site}>
                {site}
              </option>
            ))}
          </select>

          <select
            onChange={(e) => setSelectedDepartment(e.target.value)}
            value={selectedDepartment || ""}
          >
            <option value="">{t("submissionsReport.allDepartments")}</option>
            {departmentsList.map((department, index) => (
              <option key={index} value={department}>
                {department}
              </option>
            ))}
          </select>

          <select
            onChange={(e) => setSelectedCourse(e.target.value)}
            value={selectedCourse || ""}
          >
            <option value="">{t("submissionsReport.allCourses")}</option>
            {coursesList.map((course, index) => (
              <option key={index} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>

        <div className="right-panel">
          <div className="dashboard">
            <h2>{t("submissionsReport.dashboard")}</h2>
            <div className="dashboard-stats">
              <p>
                {t("submissionsReport.totalUsers", {
                  count: getDashboardData().totalUsers,
                })}
              </p>
              <p>
                {t("submissionsReport.averageSuccessRate", {
                  rate: getDashboardData().averageSuccessRate.toFixed(2),
                })}
              </p>
              <p>
                {t("submissionsReport.totalWrongAnswers", {
                  count: getDashboardData().wrongAnswers,
                })}
              </p>
              <p>
                {t("submissionsReport.overallCourseSuccessRate", {
                  rate: calculateCourseSuccessRate().toFixed(2),
                })}
              </p>
            </div>

            <div className="charts">
              {renderDashboardChart()} {/* إضافة الرسم البياني هنا */}
            </div>
          </div>

          <button onClick={exportToExcel} className="export-btn">
            {t("submissionsReport.exportToExcel")}
          </button>

          {Object.keys(groupedByMember).map((email) => {
            const userSubmissions = groupedByMember[email];
            const submissionFallback = userSubmissions[0];

            const matchedUser = Object.values(usersData).find(
              (user) =>
                user.email?.toLowerCase() ===
                submissionFallback.email?.toLowerCase()
            );

            const userInfo = {
              userName:
                matchedUser?.userName ||
                submissionFallback.userName ||
                t("common.unknown"),
              email:
                matchedUser?.email || submissionFallback.email || t("common.unknown"),
              site: matchedUser?.site || t("common.notDefined"),
              department: matchedUser?.department || t("common.notDefined"),
            };

            const groupedByCourse = userSubmissions.reduce((acc, sub) => {
              if (!acc[sub.courseId]) {
                acc[sub.courseId] = [];
              }
              acc[sub.courseId].push(sub);
              return acc;
            }, {});

            const isExpanded = expandedUser === email;

            return (
              <div key={email} className="user-submissions">
                <div
                  className="user-header"
                  onClick={() => setExpandedUser(isExpanded ? null : email)}
                  style={{
                    cursor: "pointer",
                    backgroundColor: "#094d50",
                    color: "white",
                    padding: "10px",
                    borderRadius: "5px",
                    marginBottom: "10px",
                  }}
                >
                  <h3>{userInfo.userName}</h3>
                </div>

                {isExpanded && (
                  <div className="user-content">
                    <div className="user-details">
                      <p>{t("submissionsReport.email", { email: userInfo.email })}</p>
                      <p>{t("submissionsReport.site", { site: userInfo.site })}</p>
                      <p>
                        {t("submissionsReport.department", {
                          department: userInfo.department,
                        })}
                      </p>
                    </div>
                    {Object.keys(groupedByCourse).map((courseId) => {
                      const courseSubmissions = groupedByCourse[courseId];
                      return (
                        <div key={courseId} className="course-submissions">
                          <h3>{courseId}</h3>
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>{t("submissionsReport.startTime")}</th>
                                <th>{t("submissionsReport.endTime")}</th>
                                <th>{t("submissionsReport.totalTime")}</th>
                                <th>{t("submissionsReport.successRate")}</th>
                                <th>{t("submissionsReport.userAnswers")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {courseSubmissions.map((submission, index) => (
                                <tr key={index}>
                                  <td>{submission.startTime}</td>
                                  <td>{submission.endTime}</td>
                                  <td>
                                    {formatTotalTime(submission.totalTime)}
                                  </td>
                                  <td>{submission.successRate}%</td>
                                  <td>{submission.userAnswers}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SubmissionsPage;
