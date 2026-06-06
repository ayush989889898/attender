# Attender API

Base URL: `http://localhost:5000/api](https://attender-h7a3.onrender.com`

All protected routes require header:

```
Authorization: Bearer <jwt>
```

## Auth

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/auth/register` | `{ username, email, firstName, lastName, password, role }` | `role`: `teacher` or `student` only |
| POST | `/auth/login` | `{ username, password }` | Returns `{ token, user }` |
| GET | `/auth/me` | — | Current user profile |

## Users

| Method | Path | Auth | Body |
|--------|------|------|------|
| PATCH | `/users/me` | any | `{ firstName?, lastName?, email? }` |
| PATCH | `/users/me/password` | any | `{ currentPassword, newPassword }` |
| PATCH | `/users/me/preferences` | any | `{ smsAlertsParents?, pushNotificationsStudents?, theme? }` |
| GET | `/users?page&limit&search&role` | admin | Paginated user list |

## Classes

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/classes` | any | Teacher: own classes. Student: enrolled. Admin: all. |
| GET | `/classes/:id` | any | Member / teacher / admin |
| POST | `/classes` | teacher, admin | `{ name, subject?, code? }` — auto code if omitted |
| POST | `/classes/join` | student | `{ code }` |
| POST | `/classes/:id/session` | teacher, admin | Starts 15‑min QR simulation token |
| POST | `/classes/:id/archive` | teacher, admin | Soft archive |

## Attendance

| Method | Path | Auth | Body / Query |
|--------|------|------|----------------|
| GET | `/attendance` | any | `?classId&userId&from&to&page&limit` — scoped by role |
| POST | `/attendance/mark` | teacher, admin | `{ classId, userId, status, date?, notes? }` |
| POST | `/attendance/bulk` | teacher, admin | `{ classId, date?, entries: [{ userId, status, notes? }] }` |
| POST | `/attendance/self` | student | `{ classId, sessionToken, status? }` |
| PATCH | `/attendance/:id` | teacher, admin | `{ status?, notes? }` |

## Reports

| Method | Path | Auth | Query |
|--------|------|------|-------|
| GET | `/reports/summary` | any | Role-based dashboard stats |
| GET | `/reports/range` | any | `from`, `to` (ISO), optional `classId`, `format=json|csv|pdf` |

## Health

`GET /api/health` — no auth.
