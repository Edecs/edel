import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import logo from "../photos/Picture3.png";
import { db, ref, get } from "../firebase";
import "./CertificatePage.css";
import backgroundImage from "../photos/Picture1.png"; // استيراد الصورة
 
const CertificatePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userName, courseId, percentageSuccess } = location.state || {};

  const [department, setDepartment] = useState("");
  const certificateRef = useRef(null);

  useEffect(() => {
    if (courseId) {
      fetchDepartment(courseId);
    }
  }, [courseId]);

  const fetchDepartment = async (subCourseId) => {
    try {
      const mainCoursesSnap = await get(ref(db, "courses/mainCourses"));
      if (mainCoursesSnap.exists()) {
        const mainCourses = mainCoursesSnap.val();
        for (const courseKey in mainCourses) {
          const course = mainCourses[courseKey];
          if (
            course.subCourses &&
            Object.keys(course.subCourses).includes(subCourseId)
          ) {
            setDepartment(course.department || "Our Department");
            return;
          }
        }
        setDepartment("Our Department");
      }
    } catch (error) {
      console.error("Error fetching department:", error);
      setDepartment("Our Department");
    }
  };

  const handleDownloadPDF = () => {
    const input = certificateRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // إضافة هوامش (margin) إلى الـ PDF
      const margin = 3; // الهوامش المطلوبة
      const pageWidth = pdf.internal.pageSize.getWidth() - 2 * margin; // حساب عرض الصفحة مع الهوامش
      const pageHeight = pdf.internal.pageSize.getHeight() - 2 * margin; // حساب ارتفاع الصفحة مع الهوامش

      // إضافة الصورة إلى الـ PDF مع الهوامش
      pdf.addImage(imgData, "PNG", margin, margin, pageWidth, pageHeight);
      pdf.save("certificate.pdf");
    });
  };

  if (!userName || !courseId || !percentageSuccess) {
    return <p>Error: Missing certificate data.</p>;
  }

  return (
    <div className="certificate-wrapper">
      <div className="certificate-box" ref={certificateRef}>
        <img src={logo} alt="Company Logo" className="logo" />
        <h1 className="congrats-text">Congratulations</h1>
        <p className="subtitle">Certificate of Achievement</p>
        <p className="subtitle">
          the <strong>{department}</strong> of EDCCS is proud to confer this
          honor upon:
        </p>
        <h2 className="user-name">{userName.toUpperCase()}</h2>
        <p className="description">
          For successfully passing the Post-Assessment Test in{" "}
          <strong>[{courseId}]</strong>with exemplary dedication and competence.
        </p>
        <p className="subtitle">
          Your commitment to excellence aligns with our highest standards of
          professionalism. This accomplishment stands as a testament to your
          hard work and intellectual rigor.
        </p>
        <p className="subtitle">
          May it inspire you to reach even greater heights in your career and
          personal growth.
        </p>
        <div className="certificate-signatures-row">
          <div className="certificate-signature-block left">
            <p className="certificate-signature-name">{department}</p>{" "}
            {/* قسم تحت اليسار */}
          </div>
          <div className="certificate-signature-block right1">
            <div className="certificate-signature-box"></div>{" "}
            {/* الصندوق تحت اليمين */}
          </div>
        </div>

        {/* نص "Issued on" */}
        <div className="issued-on">
          Issued on: {new Date().toLocaleDateString()}
        </div>

        {/* نص "Department Signature" بالإنجليزي تحت "Issued on" */}
        <div className="department-signature">Department Signature</div>

        {/* نص "Authorized Signatory" مع خط تحت */}
        <div className="authorized-signatory">
          Authorized Signatory <span className="underline"></span>
        </div>
      </div>

      <div className="actions">
        <button className="submit-button" onClick={handleDownloadPDF}>
          Download as PDF
        </button>
        <button className="submit-button" onClick={() => navigate("/welcome")}>
          Go to Home
        </button>
      </div>
    </div>
  );
};

export default CertificatePage;
