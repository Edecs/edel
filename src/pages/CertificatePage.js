import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import logo from "../photos/Picture3.png";
import { db, ref, get } from "../firebase";
import "./CertificatePage.css";

const CertificatePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userName, courseId, percentageSuccess } = location.state || {};

  const [department, setDepartment] = useState("");
  const [moderatorName, setModeratorName] = useState("");
  const certificateRef = useRef(null);

  // جلب اسم القسم بناءً على courseId
  useEffect(() => {
    if (courseId) fetchDepartment(courseId);
  }, [courseId]);

  const fetchDepartment = async (subCourseId) => {
    try {
      const mainSnap = await get(ref(db, "courses/mainCourses"));
      if (!mainSnap.exists()) {
        setDepartment("Our Department");
        return;
      }
      const main = mainSnap.val();
      for (const key in main) {
        if (main[key].subCourses?.[subCourseId]) {
          const dep = main[key].department || "Our Department";
          console.log("Department found:", dep);
          setDepartment(dep);
          return;
        }
      }
      console.log("No matching department found.");
      setDepartment("Our Department");
    } catch (e) {
      console.error("Error fetching department:", e);
      setDepartment("Our Department");
    }
  };

  useEffect(() => {
    if (!department) return;
    const fetchModerator = async () => {
      try {
        const rolesSnap = await get(ref(db, "roles"));
        if (!rolesSnap.exists()) {
          setModeratorName("");
          return;
        }
        const rolesData = rolesSnap.val();
        console.log("Looking for moderator for department:", department);

        for (const emailKey in rolesData) {
          const r = rolesData[emailKey];
          const isModerator = r.moderator === true || r.moderator === "true";

          if (!isModerator) continue;

          const fixedEmail = emailKey.replace(/\./g, "-");
          console.log(`Fixed email for Firebase: ${fixedEmail}`); // إضافة سجل للبريد الإلكتروني المعدل
          const userSnap = await get(ref(db, `users/${fixedEmail}`));
          if (userSnap.exists()) {
            const userData = userSnap.val();
            const userDep = userData.department?.toLowerCase() || "";

            console.log(`User ${fixedEmail} department:`, userDep);

            if (userDep === department.toLowerCase()) {
              setModeratorName(userData.name || fixedEmail);
              return;
            }
          }
        }

        console.log("No moderator found matching the department.");
        setModeratorName("");
      } catch (e) {
        console.error("Error fetching moderator:", e);
        setModeratorName("");
      }
    };

    fetchModerator();
  }, [department]);

  // توليد PDF
  const handleDownloadPDF = () => {
    html2canvas(certificateRef.current, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const margin = 3;
      const pageWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
      const pageHeight = pdf.internal.pageSize.getHeight() - 2 * margin;
      pdf.addImage(imgData, "PNG", margin, margin, pageWidth, pageHeight);
      pdf.save("certificate.pdf");
    });
  };

  if (!userName || !courseId || !percentageSuccess) {
    return <p>Error: Missing certificate data.</p>;
  }

  return (
    <div className="page-e">
      <header>
        <h1 className="header-h1">certificate</h1>
      </header>
      <div className="certificate-wrapper">
        <div className="certificate-box" ref={certificateRef}>
          <img src={logo} alt="Company Logo" className="logo" />
          <h1 className="congrats-text">Congratulations</h1>
          <br />

          <p className="subtitle">Certificate of Achievement</p>
          <br />
          <p className="subtitle">
            The {department} of EDECS is proud to confer this honor upon:
          </p>
          <h2 className="user-name">{userName.toUpperCase()}</h2>
          <p className="description">
            For successfully passing the Post-Assessment Test in [{courseId}]
            with exemplary dedication and competence.
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
              <p className="certificate-signature-name">{department} & HR Department</p>
            </div>
            <div className="certificate-signature-block right1">
              <div className="certificate-signature-box"></div>
            </div>
          </div>
          <div className="issued-on">
            Issued on: {new Date().toLocaleDateString()}
          </div>
          <div className="department-signature">Department Signature</div>
          <div className="authorized-signatory">
            <span className="authorized">Authorized Signatory</span>
            <br />
            <span className="signatory">{moderatorName}</span>
          </div>
        </div>

        <div className="actions">
          <button className="submit-button00" onClick={handleDownloadPDF}>
            Download as PDF
          </button>
          <button
            className="submit-button00"
            onClick={() => navigate("/welcome")}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
