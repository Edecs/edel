import { ref, push, set, update, remove, get } from "firebase/database";
import { db } from "../firebase";
import { deptToKey, emailToKey } from "./emailKey";

export async function writeUserNotification(email, payload) {
  const key = emailToKey(email);
  const userRef = push(ref(db, `userNotifications/${key}`));
  const id = userRef.key;
  const data = { ...payload, assignedEmail: email };
  await set(userRef, data);
  await set(ref(db, `notifications/${id}`), data);
  return id;
}

export async function writeDeptNotification(department, payload) {
  const dept = deptToKey(department);
  if (!dept) return null;
  const deptRef = push(ref(db, `deptNotifications/${dept}`));
  const id = deptRef.key;
  const data = { ...payload, broadcastDepartment: dept };
  await set(deptRef, data);
  await set(ref(db, `notifications/${id}`), data);
  return id;
}

export async function markNotificationRead(email, notification) {
  const key = emailToKey(email);
  const id = notification.id;
  if (notification.broadcastDepartment) {
    const dept = deptToKey(notification.broadcastDepartment);
    await update(ref(db, `deptNotifications/${dept}/${id}`), {
      [`readBy/${key}`]: true,
    }).catch(() => {});
    await update(ref(db, `notifications/${id}`), {
      [`readBy/${key}`]: true,
    }).catch(() => {});
    return;
  }
  await update(ref(db, `userNotifications/${key}/${id}`), { isRead: true });
  await update(ref(db, `notifications/${id}`), { isRead: true }).catch(
    () => {}
  );
}

export async function fetchInboxNotifications(
  email,
  { department, isAdmin, isSuperAdmin }
) {
  const key = emailToKey(email);
  const list = [];

  const userSnap = await get(ref(db, `userNotifications/${key}`));
  if (userSnap.exists()) {
    const val = userSnap.val();
    Object.keys(val).forEach((id) => list.push({ id, ...val[id] }));
  }

  if (isAdmin || isSuperAdmin) {
    const dept = deptToKey(department);
    if (isSuperAdmin) {
      const allDept = await get(ref(db, "deptNotifications"));
      if (allDept.exists()) {
        const tree = allDept.val();
        Object.keys(tree).forEach((d) => {
          Object.keys(tree[d] || {}).forEach((id) => {
            list.push({ id, ...tree[d][id] });
          });
        });
      }
    } else if (dept) {
      const deptSnap = await get(ref(db, `deptNotifications/${dept}`));
      if (deptSnap.exists()) {
        const val = deptSnap.val();
        Object.keys(val).forEach((id) => list.push({ id, ...val[id] }));
      }
    }
  }

  const byId = {};
  list.forEach((n) => {
    byId[n.id] = n;
  });
  return Object.values(byId);
}

export async function writeTask({ message, assignedEmails, createdBy }) {
  const taskRef = push(ref(db, "tasks"));
  const taskId = taskRef.key;
  const assigneeKeys = {};
  assignedEmails.forEach((email) => {
    assigneeKeys[emailToKey(email)] = true;
  });
  assigneeKeys[emailToKey(createdBy)] = true;

  const taskData = {
    message,
    assignedEmails,
    assigneeKeys,
    createdBy,
    createdAt: new Date().toISOString(),
  };

  await set(taskRef, taskData);
  await Promise.all(
    Object.keys(assigneeKeys).map((ek) =>
      set(ref(db, `userTasks/${ek}/${taskId}`), taskData)
    )
  );
  return taskId;
}

export async function archiveTask(taskId, taskData) {
  await set(ref(db, `archivedTasks/${taskId}`), {
    ...taskData,
    archivedAt: new Date().toISOString(),
  });
  await remove(ref(db, `tasks/${taskId}`)).catch(() => {});

  const keys = new Set();
  if (taskData.assigneeKeys) {
    Object.keys(taskData.assigneeKeys).forEach((k) => keys.add(k));
  }
  (taskData.assignedEmails || []).forEach((e) => keys.add(emailToKey(e)));
  if (taskData.createdBy) keys.add(emailToKey(taskData.createdBy));

  await Promise.all(
    [...keys].map((ek) =>
      remove(ref(db, `userTasks/${ek}/${taskId}`)).catch(() => {})
    )
  );
}
