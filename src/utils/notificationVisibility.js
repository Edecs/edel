export const emailToKey = (email) =>
  String(email || "")
    .toLowerCase()
    .replace(/\./g, ",");

/** Whether a notification should appear for the current user. */
export const isNotificationVisible = (
  notification,
  email,
  { isAdmin = false, isSuperAdmin = false, department = null } = {}
) => {
  if (!notification || !email) return false;
  if (
    notification.assignedEmail === email ||
    notification.createdBy === email
  ) {
    return true;
  }
  if (!notification.broadcastDepartment) return false;
  if (!isAdmin && !isSuperAdmin) return false;
  if (isSuperAdmin) return true;
  const mine = String(department || "")
    .trim()
    .toLowerCase();
  const target = String(notification.broadcastDepartment)
    .trim()
    .toLowerCase();
  return Boolean(mine) && mine === target;
};

export const isNotificationUnread = (notification, email) => {
  if (!notification) return false;
  const key = emailToKey(email);
  if (notification.broadcastDepartment) {
    return !(notification.readBy && notification.readBy[key]);
  }
  return !notification.isRead;
};
