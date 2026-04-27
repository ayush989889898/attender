# Attender — Attendance Management System

Full-stack app: **React (Vite) + Tailwind**, **Node.js (Express)**, **MongoDB (Mongoose)**, **JWT + bcrypt**.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally, or a MongoDB Atlas URI

## 1. Backend setup

```bash
cd backend
npm install
```

Create environment file (or edit the provided `.env`):

- Copy `backend/.env.example` to `backend/.env`
- Set `MONGODB_URI`, `JWT_SECRET` (long random string), and `CLIENT_URL=http://localhost:5173`

Start API:

```bash
npm run dev
```

API: `http://localhost:5000`

### Sample data

```bash
cd backend
npm run seed
```

**Test accounts** (password for all: `Password123` — no special characters; re-run `npm run seed` if logins fail after changing the seed):

| Username   | Role    |
|------------|---------|
| `admin`    | admin   |
| `teacher1` | teacher |
| `student1` | student |
| `student2` | student |

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

Vite proxies `/api` to the backend in development (`frontend/vite.config.js`).

## 3. Troubleshooting login

1. **MongoDB must be reachable** — same URI as in `backend/.env`.
2. **Seed the database** so known users exist: `npm run seed` in `backend`.
3. **CORS** — `CLIENT_URL` in backend must match the frontend origin (default `http://localhost:5173`).
4. **JWT** — after login, the UI stores the token in `localStorage` as `attender_token` and sends `Authorization: Bearer ...` on each request.
5. Use **username** (not email) on the login form unless you change the UI to email.

## Project layout (all important files)

```
pro/
├── .gitignore
├── README.md
├── docs/
│   └── API.md
├── backend/
│   ├── .env                 ← copy from .env.example (gitignored)
│   ├── .env.example         ← insert MONGODB_URI, JWT_SECRET, CLIENT_URL, PORT
│   ├── package.json
│   ├── scripts/
│   │   └── seed.js          ← sample users + class + attendance
│   └── src/
│       ├── server.js        ← Express entry: CORS, JSON, routes, listen
│       ├── config/
│       │   └── db.js        ← Mongo connection
│       ├── models/
│       │   ├── User.js
│       │   ├── Class.js
│       │   └── Attendance.js
│       ├── middleware/
│       │   ├── auth.js      ← JWT + role checks
│       │   ├── validate.js
│       │   └── errorHandler.js
│       ├── utils/
│       │   └── jwt.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── userController.js
│       │   ├── classController.js
│       │   ├── attendanceController.js
│       │   └── reportController.js
│       └── routes/
│           ├── authRoutes.js
│           ├── userRoutes.js
│           ├── classRoutes.js
│           ├── attendanceRoutes.js
│           └── reportRoutes.js
└── frontend/
    ├── index.html
    ├── vite.config.js       ← dev proxy /api → backend :5000
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── index.css
        ├── App.jsx          ← routes; authenticated shell under /app
        ├── api/client.js    ← axios + Bearer token
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   ├── TopBar.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Login.jsx
            ├── Signup.jsx
            ├── Dashboard.jsx
            ├── ClassesPage.jsx
            ├── AttendancePage.jsx
            ├── ReportsPage.jsx
            ├── SettingsPage.jsx
            └── MessagesPage.jsx
```

**Where to put secrets:** create `backend/.env` next to `backend/package.json` (see `backend/.env.example`). Never commit real `JWT_SECRET` values.

## API documentation

See [docs/API.md](docs/API.md).

## Security notes (production)

- Rotate `JWT_SECRET` and never commit real secrets.
- Serve over HTTPS; consider httpOnly cookies instead of localStorage for tokens.
- Add rate limiting and audit logging for attendance changes.
