# Firebase Security Rules

## Model (current)

- Root denied by default
- **`users` / `roles`**: list = admin/SuperAdmin; own key readable by self (role checks are case-insensitive via `.toLowerCase()`)
- **`courses/mainCourses`**: list = admin only; each `$courseId` readable if admin **or** assigned under `roles/{email}/courses/{id}`
- **Course writes**: SuperAdmin any; admin only if course `department` matches their profile department
- **`userTasks` / `userNotifications`**: per-user inboxes (no full-tree dump for learners)
- **`tasks` / `notifications` / `archivedTasks` / `deptNotifications`**: admin list; users use inbox paths
- **`disabledUsers/{emailKey}`**: soft-delete / login block (Spark cannot delete other Auth users)
- **`feedback/{uid}`**: user writes own; admin reads
- Storage/Firestore: locked as before

Exam **correct answers** still live on assigned course paths (client-side scoring). Access is limited to assigned courses + admins — not the whole catalog.

## Deploy (required)

```bash
firebase use edecs-elearning
firebase deploy --only database,storage,firestore:rules
```

Or paste `database.rules.json` into Console → Realtime Database → Rules → Publish.

After deploy, **new** tasks/notifications use inbox paths. Old flat `tasks`/`notifications` remain visible to admins only until cleaned up.

## Checklist

1. Admin accounts have `users/{emailKey}.role` = `admin` or `SuperAdmin`
2. Learner: only assigned courses; own tasks/notifications
3. Admin: list users, create courses in own department
4. Deleted user cannot log in (`disabledUsers`)
