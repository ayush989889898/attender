import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AttendancePage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [list, setList] = useState([]);
  const [sessionToken, setSessionToken] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => {
        setClasses(data.data || []);
        if (data.data?.[0]) setClassId(data.data[0]._id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const selectedClass = useMemo(() => classes.find((c) => c._id === classId), [classes, classId]);

  useEffect(() => {
    if (!classId || user?.role === 'student') return;
    const cls = classes.find((c) => c._id === classId);
    if (!cls) return;
    const studs = (cls.studentIds || []).map((s) => ({
      userId: s._id || s,
      name: s.firstName ? `${s.firstName} ${s.lastName}` : String(s),
      status: 'present',
    }));
    setRows(studs);
  }, [classId, classes, user?.role]);

  const loadList = useCallback(async () => {
    if (!classId) return;
    const { data } = await api.get('/attendance', {
      params: { classId, from: date, to: date, limit: 100, page: 1 },
    });
    setList(data.data || []);
  }, [classId, date]);

  useEffect(() => {
    if (user?.role === 'student' && classId) {
      loadList().catch(() => {});
    }
  }, [classId, date, user?.role, loadList]);

  useEffect(() => {
    if ((user?.role === 'teacher' || user?.role === 'admin') && classId) {
      loadList().catch(() => {});
    }
  }, [classId, date, user?.role, loadList]);

  const saveBulk = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/attendance/bulk', {
        classId,
        date,
        entries: rows.map((r) => ({ userId: r.userId, status: r.status })),
      });
      setMessage('Attendance saved.');
      await loadList();
    } catch (err) {
      setError(err.message);
    }
  };

  const markSelf = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/attendance/self', { classId, sessionToken, status: 'present' });
      setMessage('Attendance recorded for today.');
      await loadList();
    } catch (err) {
      setError(err.message);
    }
  };

  if (user?.role === 'student') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mark my attendance</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Paste the session token your teacher shares (simulates scanning a QR code).
          </p>
        </div>
        <form
          onSubmit={markSelf}
          className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Class</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Session token</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={sessionToken}
              onChange={(e) => setSessionToken(e.target.value)}
              placeholder="Paste token from teacher"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Scan QR / Submit token
          </button>
        </form>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Today&apos;s records</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {list.map((a) => (
              <li key={a._id} className="flex justify-between">
                <span>{new Date(a.date).toLocaleDateString()}</span>
                <span className="font-medium capitalize">{a.status}</span>
              </li>
            ))}
            {!list.length ? <li className="text-slate-400">No records for this class today.</li> : null}
          </ul>
        </div>
      </div>
    );
  }

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return <p className="text-sm text-slate-600">You do not have access to teacher attendance tools.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mark attendance</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Choose a class and date, set statuses, then save in bulk.
        </p>
      </div>
      <form
        onSubmit={saveBulk}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Class</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={loadList}
              className="w-full rounded-lg border border-slate-200 py-2 text-sm dark:border-slate-700"
            >
              Refresh list
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700">
                <th className="py-2 pr-4">Student</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">{r.name}</td>
                  <td className="py-2">
                    <select
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      value={r.status}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) => (x.userId === r.userId ? { ...x, status: e.target.value } : x))
                        )
                      }
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {selectedClass ? 'No students enrolled in this class.' : 'Select a class.'}
            </p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Save bulk attendance
        </button>
      </form>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">Existing rows ({date})</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {list.map((a) => (
            <li key={a._id} className="flex justify-between">
              <span>
                {a.userId?.firstName} {a.userId?.lastName}
              </span>
              <span className="capitalize">{a.status}</span>
            </li>
          ))}
          {!list.length ? <li className="text-slate-400">No saved rows for this date yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}
