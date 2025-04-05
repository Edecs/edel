import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getDatabase, ref, get } from "firebase/database";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs"; // This should be at the top of the file, before any functions or logic
import html2canvas from "html2canvas"; // إضافة الاستيراد هنا

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
  const [submissions, setSubmissions] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
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
    const date = new Date(dateString);
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    const formattedDate = date.toLocaleDateString(undefined, options);
    const formattedHours = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formattedDate} - ${formattedHours}`;
  };

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
                email: submission.email || "Unknown",
                userName: submission.userName || "Unknown",
                courseId: courseId,
                startTime: formatDate(submission.startTime) || "Not available",
                endTime: formatDate(submission.endTime) || "Not completed",
                totalTime: submission.totalTime || "Not available",
                successRate: submission.percentageSuccess || "Not available",
                userAnswers: submission.userAnswers
                  ? submission.userAnswers.join(", ")
                  : "Not available",
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
          ...new Set(matchedUsers.map((u) => u.site || "Not Defined")),
        ]);
        setDepartmentsList([
          ...new Set(matchedUsers.map((u) => u.department || "Not Defined")),
        ]);
        setCoursesList([
          ...new Set(submissionsList.map((s) => s.courseId || "Not Defined")),
        ]);
      }
    } catch (error) {
      setError(`Failed to fetch data. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [database]);

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

    // إضافة بيانات Dashboard
    const dashboardData = getDashboardData();
    worksheet.addRow([
      "Dashboard Data",
      `Total Users: ${dashboardData.totalUsers}`,
      `Average Success Rate: ${dashboardData.averageSuccessRate.toFixed(2)}%`,
      `Total Wrong Answers: ${dashboardData.wrongAnswers}`,
    ]);

    // إضافة الأعمدة
    worksheet.columns = [
      { header: "Email", key: "email", width: 20 },
      { header: "User Name", key: "userName", width: 20 },
      { header: "Course ID", key: "courseId", width: 15 },
      { header: "Start Time", key: "startTime", width: 25 },
      { header: "End Time", key: "endTime", width: 25 },
      { header: "Total Time", key: "totalTime", width: 15 },
      { header: "Success Rate", key: "successRate", width: 15 },
      { header: "User Answers", key: "userAnswers", width: 30 },
    ];

    // إضافة البيانات من الـ Submissions
    filteredSubmissions.forEach((submission) => {
      worksheet.addRow({
        email: submission.email,
        userName: submission.userName,
        courseId: submission.courseId,
        startTime: submission.startTime,
        endTime: submission.endTime,
        totalTime: submission.totalTime,
        successRate: submission.successRate,
        userAnswers: submission.userAnswers,
      });
    });

    // التقاط الرسم البياني كصورة باستخدام html2canvas
    const chartElement = document.querySelector(".charts"); // تأكد من تحديد العنصر الذي يحتوي على الرسم البياني
    if (chartElement) {
      html2canvas(chartElement).then((canvas) => {
        canvas.toBlob((blob) => {
          // إضافة الصورة إلى Excel بعد تحويلها
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
    const totalUsers = filteredSubmissions.length;
    const totalSuccessRate = filteredSubmissions.reduce((acc, submission) => {
      return acc + calculateSuccessRate([submission]);
    }, 0);

    const wrongAnswers = filteredSubmissions.reduce((acc, submission) => {
      return acc + calculateWrongAnswers(submission.userAnswers || []); // التأكد من أن userAnswers مصفوفة
    }, 0);

    const averageSuccessRate = totalSuccessRate / totalUsers;

    return [
      {
        name: "Success Rate",
        value: averageSuccessRate,
        color: "#4CAF50", // اللون الأخضر
      },
      {
        name: "Wrong Answers",
        value: wrongAnswers,
        color: "#FF5733", // اللون الأحمر
      },
    ];
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
            label
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
        <h1 className="header-h1">Submissions</h1>
      </header>
      <div className="submissions-page">
        <div className="left-panel">
          <h2>Filter Users</h2>
          <input
            type="text"
            placeholder="Search for a user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            onChange={(e) => setSelectedSite(e.target.value)}
            value={selectedSite || ""}
          >
            <option value="">All sites</option>
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
            <option value="">All departments</option>
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
            <option value="">All courses</option>
            {coursesList.map((course, index) => (
              <option key={index} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>

        <div className="right-panel">
          <div className="dashboard">
            <h2>Dashboard</h2>
            <div className="dashboard-stats">
              <p>Total Users: {getDashboardData().totalUsers}</p>
              <p>
                Average Success Rate:{" "}
                {getDashboardData().averageSuccessRate.toFixed(2)}%
              </p>
              <p>Total Wrong Answers: {getDashboardData().wrongAnswers}</p>
              <p>
                Overall Course Success Rate:{" "}
                {calculateCourseSuccessRate().toFixed(2)}%
              </p>
            </div>

            <div className="charts">
              {renderDashboardChart()} {/* إضافة الرسم البياني هنا */}
            </div>
          </div>

          <button onClick={exportToExcel} className="export-btn">
            Export to Excel
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
                "Unknown",
              email:
                matchedUser?.email || submissionFallback.email || "Unknown",
              site: matchedUser?.site || "Not Defined",
              department: matchedUser?.department || "Not Defined",
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
                      <p>Email: {userInfo.email}</p>
                      <p>Site: {userInfo.site}</p>
                      <p>Department: {userInfo.department}</p>
                    </div>
                    {Object.keys(groupedByCourse).map((courseId) => {
                      const courseSubmissions = groupedByCourse[courseId];
                      return (
                        <div key={courseId} className="course-submissions">
                          <h3>{courseId}</h3>
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Total Time</th>
                                <th>Success Rate</th>
                                <th>User Answers</th>
                              </tr>
                            </thead>
                            <tbody>
                              {courseSubmissions.map((submission, index) => (
                                <tr key={index}>
                                  <td>{submission.startTime}</td>
                                  <td>{submission.endTime}</td>
                                  <td>{submission.totalTime}</td>
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
