/**
 * SuperAdmin sees all courses; other admins only their department's courses.
 * Comparison is case-insensitive and trimmed.
 */
export function filterCoursesByDepartment(
  courses = {},
  { isSuperAdmin = false, department = "" } = {}
) {
  if (isSuperAdmin) {
    return courses || {};
  }

  const target = String(department || "")
    .toLowerCase()
    .trim();

  return Object.fromEntries(
    Object.entries(courses || {}).filter(([, course]) => {
      const courseDep = String(course?.department || "")
        .toLowerCase()
        .trim();
      return target && courseDep === target;
    })
  );
}

export function filterUsersByDepartment(
  users = [],
  { isSuperAdmin = false, department = "" } = {}
) {
  if (isSuperAdmin) {
    return users || [];
  }

  const target = String(department || "")
    .toLowerCase()
    .trim();

  return (users || []).filter((user) => {
    const userDep = String(user?.department || "")
      .toLowerCase()
      .trim();
    return target && userDep === target;
  });
}
