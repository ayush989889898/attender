import { useEffect, useState, useMemo } from "react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

export default function ClassesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [view, setView] = useState({ type: "list", data: null });
  const [form, setForm] = useState({ name: "", standard: "", subject: "" });
  const [joinCode, setJoinCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [copied, setCopied] = useState(false);
  const [rawAttendance, setRawAttendance] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadClasses = async () => {
    try {
      const { data } = await api.get("/classes");
      setClasses(data.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    let timer;
    if (view.type === "attendance" && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (view.type === "attendance" && timeLeft === 0) {
      handleAutoEndSession();
    }
    return () => clearInterval(timer);
  }, [view.type, timeLeft]);

  useEffect(() => {
    if (view.type === "details" && view.data?._id) {
      const fetchHistory = async () => {
        setLoadingStats(true);
        try {
          const { data } = await api.get("/reports/range", {
            params: {
              classId: view.data._id,
              from: new Date(2020, 1, 1).toISOString(),
              to: new Date().toISOString(),
            },
          });
          setRawAttendance(data.data || []);
        } catch (err) {
          setRawAttendance([]);
        } finally {
          setLoadingStats(false);
        }
      };
      fetchHistory();
    }
  }, [view.type, view.data?._id]);

  const studentStatsMap = useMemo(() => {
    const stats = {};
    if (!Array.isArray(rawAttendance)) return stats;
    rawAttendance.forEach((record) => {
      const sId = record.userId?._id;
      if (!sId) return;
      if (!stats[sId]) stats[sId] = { present: 0, absent: 0, total: 0 };
      stats[sId].total++;
      if (record.status === "present") stats[sId].present++;
      else if (record.status === "absent") stats[sId].absent++;
    });
    return stats;
  }, [rawAttendance]);

  // --- ACTIONS ---

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/classes", form);
      setForm({ name: "", standard: "", subject: "" });
      loadClasses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/classes/join", { code: joinCode });
      setJoinCode("");
      loadClasses();
      alert("Successfully joined!");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (classId) => {
    if (!window.confirm("Delete this class?")) return;
    try {
      await api.delete(`/classes/${classId}`);
      setClasses(classes.filter((c) => c._id !== classId));
      setActiveMenu(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const startAttendance = async (cls) => {
    try {
      const { data } = await api.post(`/classes/${cls._id}/session`);
      setTimeLeft(60);
      setView({ type: "attendance", data: { ...cls, sessionToken: data.sessionToken } });
    } catch (err) {
      setError("Failed to start session.");
    }
  };

  const handleAutoEndSession = async () => {
    try {
      await api.post("/attendance/finalize", { classId: view.data._id });
      setView({ type: "list", data: null });
      navigate("/app/dashboard");
    } catch (err) {
      navigate("/app/dashboard");
    }
  };

  if (view.type === "attendance") {
    const cls = view.data;
    return (
      <div className="w-full min-h-[calc(100vh-120px)] flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 md:p-10 text-center border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-300 my-8">
          <h2 className="text-xl md:text-2xl font-black">{cls.name}</h2>
          <p className="text-brand-600 text-[10px] font-black uppercase tracking-widest mb-6">{cls.subject}</p>
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-50">
              <QRCodeSVG value={JSON.stringify({ classId: cls._id, token: cls.sessionToken })} size={220} />
            </div>
          </div>
          <div className="mb-6">
            <div className="text-5xl font-black tracking-tighter">{timeLeft}s</div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Time Remaining</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => window.confirm("End session?") && handleAutoEndSession()} className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">End Session Now</button>
            <button onClick={() => setView({ type: "list", data: null })} className="bg-slate-100 dark:bg-slate-800 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-200">Back to List</button>
          </div>
        </div>
      </div>
    );
  }

  if (view.type === "details") {
    const cls = view.data;

    // SORTING LOGIC: Ascending order by Roll Number
    const sortedStudents = [...(cls.studentIds || [])].sort((a, b) => {
      const rollA = String(a.rollNumber || "");
      const rollB = String(b.rollNumber || "");
      return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
      <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow border flex flex-col md:flex-row justify-between gap-4">
          <div>
            <button onClick={() => setView({ type: "list", data: null })} className="text-brand-600 text-xs font-bold mb-3">← Back</button>
            <h1 className="text-2xl md:text-4xl font-black">{cls.name}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{cls.standard} • {cls.subject}</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between gap-3 relative">
            <div>
              <p className="text-[10px] font-bold text-slate-400">Class Code</p>
              <p className="text-xl font-black text-brand-600">{cls.code}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(cls.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow">📋</button>
            {copied && <div className="absolute -bottom-10 right-0 bg-black text-white text-xs px-3 py-1 rounded-lg">Copied!</div>}
          </div>
        </div>

        <div className="space-y-4">
          {/* Desktop View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2rem] shadow border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Present</th>
                  <th className="px-6 py-4">Absent</th>
                  <th className="px-6 py-4">%</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s) => {
                  const stats = studentStatsMap[s._id] || { present: 0, absent: 0, total: 0 };
                  const percent = stats.total ? ((stats.present / stats.total) * 100).toFixed(1) : "0";
                  return (
                    <tr key={s._id} className="border-t dark:border-slate-800">
                      <td className="px-6 py-4 font-bold text-slate-600">{s.rollNumber || "N/A"}</td>
                      <td className="px-6 py-4 font-bold">{s.firstName} {s.lastName}</td>
                      <td className="px-6 py-4 text-emerald-600">{stats.present}</td>
                      <td className="px-6 py-4 text-red-500">{stats.absent}</td>
                      <td className="px-6 py-4">{percent}%</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => navigate("/app/messages", { state: { contactId: s._id, contactName: `${s.firstName} ${s.lastName}` } })} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Message</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {sortedStudents.map((s) => {
              const stats = studentStatsMap[s._id] || { present: 0, absent: 0, total: 0 };
              const percent = stats.total ? ((stats.present / stats.total) * 100).toFixed(1) : "0";
              return (
                <div key={s._id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll #{s.rollNumber || "N/A"}</span>
                      <h3 className="text-lg font-black">{s.firstName} {s.lastName}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-brand-600">{percent}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-center">
                      <p className="text-emerald-600 font-black">{stats.present}</p>
                      <p className="text-[9px] uppercase font-bold">Present</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-2xl text-center">
                      <p className="text-red-600 font-black">{stats.absent}</p>
                      <p className="text-[9px] uppercase font-bold">Absent</p>
                    </div>
                  </div>
                  <button onClick={() => navigate("/app/messages", { state: { contactId: s._id, contactName: `${s.firstName} ${s.lastName}` } })} className="w-full bg-brand-600 text-white py-3 rounded-2xl text-xs font-black uppercase">Send Message</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">My Classes</h1>
          <p className="text-slate-500 font-medium mt-2">Manage and track active sessions.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-brand-600 text-white px-5 py-3 rounded-xl text-xs font-black uppercase shadow-lg">+ {user.role === "teacher" ? "Create Class" : "Join Class"}</button>
      </header>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-8">
            <h2 className="text-xl font-black mb-6 text-center">{user.role === "teacher" ? "Create Class" : "Join Class"}</h2>
            <form onSubmit={(e) => { user.role === "teacher" ? handleCreate(e) : handleJoin(e); setShowModal(false); }} className="space-y-4">
              {user.role === "teacher" ? (
                <>
                  <input required placeholder="Class Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 text-sm font-bold" />
                  <input required placeholder="Standard" value={form.standard} onChange={(e) => setForm({ ...form, standard: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 text-sm font-bold" />
                  <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 text-sm font-bold" />
                </>
              ) : (
                <input required placeholder="Enter Class Code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="w-full px-4 py-3 rounded-xl border bg-slate-50 text-sm font-bold text-center uppercase" />
              )}
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-black text-sm">Confirm</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-black text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classes.map((cls) => (
          <div key={cls._id} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            {user.role === "teacher" && (
              <div className="absolute top-4 right-4 z-10">
                <button onClick={() => setActiveMenu(activeMenu === cls._id ? null : cls._id)} className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                </button>
                {activeMenu === cls._id && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border py-1 z-20">
                    <button onClick={() => handleDelete(cls._id)} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600">Delete Class</button>
                  </div>
                )}
              </div>
            )}
            <div className="h-32 bg-brand-600 flex items-center justify-center text-5xl">🏫</div>
            <div className="p-8 flex-1 flex flex-col">
              <h3 className="text-2xl font-black">{cls.name}</h3>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-1">{cls.standard} • {cls.subject}</p>
              <div className="flex gap-2 mt-8">
                {user.role === "teacher" && (
                  <button onClick={() => startAttendance(cls)} className="flex-1 bg-brand-600 text-white py-3 rounded-xl text-[10px] font-black uppercase">Session</button>
                )}
                <button onClick={() => setView({ type: "details", data: cls })} className="flex-1 bg-slate-100 py-3 rounded-xl text-[10px] font-black uppercase">Details</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}