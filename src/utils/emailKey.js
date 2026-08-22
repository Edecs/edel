/** RTDB email key: lowercase, dots → commas (all dots). */
export const emailToKey = (email) =>
  String(email || "")
    .toLowerCase()
    .replace(/\./g, ",");

export const normalizeRole = (role) => {
  const r = String(role || "user").toLowerCase();
  if (r === "superadmin") return "superadmin";
  if (r === "admin") return "admin";
  return "user";
};

export const isAdminRole = (role) => {
  const r = normalizeRole(role);
  return r === "admin" || r === "superadmin";
};

export const isSuperAdminRole = (role) => normalizeRole(role) === "superadmin";

export const deptToKey = (department) =>
  String(department || "")
    .trim()
    .toLowerCase();
