const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

function emailKey(email) {
  return String(email).toLowerCase().replace(/\./g, ",");
}

async function assertAdmin(context) {
  if (!context.auth || !context.auth.token.email) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required."
    );
  }
  const snap = await admin
    .database()
    .ref(`users/${emailKey(context.auth.token.email)}/role`)
    .once("value");
  const role = snap.val();
  if (role !== "admin" && role !== "SuperAdmin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin role required."
    );
  }
}

async function upsertUserProfile({ email, name, role, department, site }) {
  const key = emailKey(email);
  const normalizedRole = role || "user";
  await admin
    .database()
    .ref(`users/${key}`)
    .set({
      email: email.toLowerCase(),
      name: name || "Unknown",
      role: normalizedRole,
      department: department || "",
      site: site || "",
    });
  await admin
    .database()
    .ref(`roles/${key}`)
    .set({
      email: email.toLowerCase(),
      role: normalizedRole,
      courses: {},
      department: department || "",
      site: site || "",
    });
}

/**
 * Callable: create a single Auth user + RTDB profile (admin only).
 * Deploy with: firebase deploy --only functions
 * Requires Blaze plan.
 */
exports.createAppUser = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const email = String(data.email || "")
    .trim()
    .toLowerCase();
  const password = String(data.password || "");
  const name = data.name || "";
  const role = data.role || "user";
  const department = data.department || "";
  const site = data.site || "";

  if (!email || password.length < 6) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Valid email and password (min 6) required."
    );
  }

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name || undefined,
    });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      await upsertUserProfile({ email, name, role, department, site });
      return { email, updated: true };
    }
    throw new functions.https.HttpsError("internal", err.message);
  }

  await upsertUserProfile({ email, name, role, department, site });
  return { uid: userRecord.uid, email, created: true };
});

exports.createAppUsersBulk = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const users = Array.isArray(data.users) ? data.users : [];
  const results = [];

  for (const u of users) {
    try {
      const email = String(u.email || "")
        .trim()
        .toLowerCase();
      const password = String(u.password || "");
      if (!email || !u.site || !u.department) {
        results.push({ email, ok: false, error: "Missing fields" });
        continue;
      }
      try {
        await admin.auth().createUser({
          email,
          password,
          displayName: u.name || undefined,
        });
      } catch (err) {
        if (err.code !== "auth/email-already-exists") {
          throw err;
        }
      }
      await upsertUserProfile({
        email,
        name: u.name,
        role: u.role,
        department: u.department,
        site: u.site,
      });
      results.push({ email, ok: true });
    } catch (err) {
      results.push({ email: u.email, ok: false, error: err.message });
    }
  }

  return { results };
});
