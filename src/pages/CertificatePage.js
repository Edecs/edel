import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import logo from "../photos/Picture3.png";
import { db, ref, get } from "../firebase";
import { getAuth } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext";
import "./CertificatePage.css";

const PASS_THRESHOLD = 80;

const CertificatePage = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedCourseId = location.state?.courseId;
  const mainCourseIdFromState = location.state?.mainCourseId;

  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [userName, setUserName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [percentageSuccess, setPercentageSuccess] = useState(null);
  const [department, setDepartment] = useState("");
  const [moderatorName, setModeratorName] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const certificateRef = useRef(null);

  useEffect(() => {
    const verifyCertificate = async () => {
      setLoading(true);
      setUnauthorized(false);

      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user || !requestedCourseId) {
          setUnauthorized(true);
          return;
        }

        const submissionSnap = await get(
          ref(db, `submissions/${user.uid}/${requestedCourseId}`)
        );

        if (!submissionSnap.exists()) {
          setUnauthorized(true);
          return;
        }

        const submission = submissionSnap.val();
        const score = Number(submission.percentageSuccess);
        if (!Number.isFinite(score) || score < PASS_THRESHOLD) {
          setUnauthorized(true);
          return;
        }

        setCourseId(requestedCourseId);
        setPercentageSuccess(score);
        setUserName(
          submission.userName ||
            location.state?.userName ||
            user.displayName ||
            t("common.user")
        );

        if (submission.endTime) {
          setIssuedDate(new Date(submission.endTime).toLocaleDateString());
        } else {
          setIssuedDate(new Date().toLocaleDateString());
        }

        const safeEmail = user.email.replace(/\./g, ",");
        const userSnap = await get(ref(db, `users/${safeEmail}`));
        if (userSnap.exists()) {
          const name = userSnap.val()?.name;
          if (name) setUserName(name);
        }

        await fetchDepartment(
          requestedCourseId,
          mainCourseIdFromState || submission.mainCourseId
        );
      } catch (e) {
        console.error("Certificate verification failed:", e);
        setUnauthorized(true);
      } finally {
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [requestedCourseId, mainCourseIdFromState, t]);

  const fetchDepartment = async (subCourseId, mainCourseId) => {
    try {
      if (mainCourseId) {
        const mainSnap = await get(
          ref(db, `courses/mainCourses/${mainCourseId}`)
        );
        if (mainSnap.exists()) {
          const main = mainSnap.val();
          setDepartment(main.department || t("certificate.ourDepartment"));
          setModeratorName(main.moderatorName || "");
          return;
        }
      }

      // Fallback: user may only read assigned courses — try roles then each course
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setDepartment(t("certificate.ourDepartment"));
        setModeratorName("");
        return;
      }
      const safeEmail = user.email.replace(/\./g, ",");
      const rolesSnap = await get(ref(db, `roles/${safeEmail}/courses`));
      if (rolesSnap.exists()) {
        const courseIds = Object.keys(rolesSnap.val());
        for (const id of courseIds) {
          const snap = await get(ref(db, `courses/mainCourses/${id}`));
          if (snap.exists() && snap.val().subCourses?.[subCourseId]) {
            const main = snap.val();
            setDepartment(main.department || t("certificate.ourDepartment"));
            setModeratorName(main.moderatorName || "");
            return;
          }
        }
      }
      setDepartment(t("certificate.ourDepartment"));
      setModeratorName("");
    } catch (e) {
      console.error("Error fetching department:", e);
      setDepartment(t("certificate.ourDepartment"));
      setModeratorName("");
    }
  };

  const handleDownloadPDF = () => {
    if (!certificateRef.current || unauthorized) return;
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

  if (loading) {
    return <p>{t("common.loading")}</p>;
  }

  if (unauthorized || !userName || !courseId || percentageSuccess == null) {
    return (
      <div className="page-e">
        <p>{t("certificate.missingData")}</p>
        <button className="submit-button00" onClick={() => navigate("/welcome")}>
          {t("certificate.goToHome")}
        </button>
      </div>
    );
  }

  return (
    <div className="page-e">
      <header>
        <h1 className="header-h1">{t("certificate.pageTitle")}</h1>
      </header>
      <div className="certificate-wrapper">
        <div className="certificate-box" ref={certificateRef}>
          <img src={logo} alt={t("certificate.companyLogoAlt")} className="logo" />
          <h1 className="congrats-text">{t("certificate.congratulations")}</h1>
          <br />

          <p className="subtitle">{t("certificate.ofAchievement")}</p>
          <br />
          <p className="subtitle">
            {t("certificate.proudToConfer", { department })}
          </p>
          <h2 className="user-name">{userName.toUpperCase()}</h2>
          <p className="description">
            {t("certificate.passingText", { courseId })}
          </p>
          <p className="subtitle">{t("certificate.commitmentText")}</p>
          <p className="subtitle">{t("certificate.inspireText")}</p>
          <div className="certificate-signatures-row">
            <div className="certificate-signature-block left">
              <p className="certificate-signature-name">
                {t("certificate.departmentAndHr", { department })}
              </p>
            </div>
            <div className="certificate-signature-block right1">
              <div className="certificate-signature-box"></div>
            </div>
          </div>
          <div className="issued-on">
            {t("certificate.issuedOn", {
              date: issuedDate || new Date().toLocaleDateString(),
            })}
          </div>
          <div className="department-signature">
            {t("certificate.departmentSignature")}
          </div>
          <div className="authorized-signatory">
            <span className="authorized">
              {t("certificate.authorizedSignatory")}
            </span>
            <br />
            <span className="signatory">{moderatorName}</span>
          </div>
        </div>

        <div className="actions">
          <button className="submit-button00" onClick={handleDownloadPDF}>
            {t("certificate.downloadPdf")}
          </button>
          <button
            className="submit-button00"
            onClick={() => navigate("/welcome")}
          >
            {t("certificate.goToHome")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
