import React, { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import logo from '../photos/EDECS-Logo.png'; // إذا كانت الصورة في مجلد photos داخل مجلد src
import "./CertificatePage.css";

const CertificatePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userName, courseId, percentageSuccess } = location.state || {};

  const certificateRef = useRef(null);

  if (!userName || !courseId || !percentageSuccess) {
    return <p>Error: Missing certificate data.</p>;
  }

  const handleDownloadPDF = () => {
    const input = certificateRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png"); // تحويل الشهادة لصورة
      const pdf = new jsPDF({
        orientation: "landscape", // جعل الصفحة بالعرض
        unit: "mm", // وحدة القياس بالمليمتر
        format: "a4", // تحديد الحجم ليكون A4
      });
  
      const pageWidth = pdf.internal.pageSize.getWidth();  // عرض صفحة A4
      const pageHeight = pdf.internal.pageSize.getHeight(); // ارتفاع صفحة A4
  
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight); // ملء الصفحة بالكامل
      pdf.save("certificate.pdf"); // حفظ الملف
    });
  };
  

  return (
    <div className="certificate-container">
      <div ref={certificateRef} className="certificate-content">
        <img
          src={logo} // استخدام الصورة المستوردة
          alt="Company Logo"
          className="certificate-logo"
        />
        <h1>Certificate of Completion</h1>
        <p>
          🏆 Congratulations, <strong>{userName}</strong>!
        </p>
        <p>You have successfully completed the course:</p>
        <h2>Course: {courseId}</h2>
        <p style={{ marginTop: "40px" }}>
  With an outstanding score of <strong>{percentageSuccess}%</strong> 🎉
</p>

      </div>

      <button onClick={handleDownloadPDF}>Download as PDF</button>
      <button onClick={() => navigate("/welcome")}>Go to Home</button>
    </div>
  );
};

export default CertificatePage;
