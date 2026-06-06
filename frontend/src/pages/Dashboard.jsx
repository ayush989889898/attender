import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PIE_COLORS = ['#4f46e5', '#ef4444', '#f59e0b'];

function formatDateLabel(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [chartRows, setChartRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentTrends, setStudentTrends] = useState([]);
  const [err, setErr] = useState('');

  // NEW FILTERS STATE
  const [days, setDays] = useState('30');
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar' | 'pie'

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        setErr('');
        const [summaryRes, classesRes] = await Promise.allSettled([
          api.get('/reports/summary'),
          api.get('/classes'),
        ]);
        if (cancelled) return;

        if (summaryRes.status === 'fulfilled') {
          setSummary(summaryRes.value.data);
        } else {
          setSummary(null);
          setErr(summaryRes.reason?.message || 'Unable to load summary');
        }

        if (classesRes.status === 'fulfilled') {
          setClasses(classesRes.value.data?.data || []);
        } else {
          setClasses([]);
          if (!summaryRes || summaryRes.status === 'fulfilled') {
            setErr(classesRes.reason?.message || 'Unable to load classes');
          }
        }

        if (user?.role === 'student') {
          try {
            const { data: st } = await api.get(`/reports/student-trends?days=${days}`);
            if (!cancelled) setStudentTrends(st.data || []);
          } catch (trendErr) {
            if (!cancelled) setStudentTrends([]);
            if (!cancelled && !err) setErr(trendErr.message);
          }
        }

        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - parseInt(days, 10));
        
        if (user?.role === 'student') {
                if (!cancelled) setChartRows([]);
        } else {
                try {
                        const { data: rangeRes } = await api.get('/reports/range', {
                                params: { from: from.toISOString(), to: to.toISOString() },
                        });
                        if (cancelled) return;
                        const map = {};
                        (rangeRes.data || []).forEach((row) => {
                                const key = new Date(row.date).toISOString().slice(0, 10);
                                if (!map[key]) map[key] = { date: key, present: 0, absent: 0, late: 0 };
                                const st = row.status;
                                if (st === 'present' || st === 'absent' || st === 'late') {
                                        map[key][st] += 1;
                                }
                        });
                        const rows = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
                        setChartRows(rows.map((r) => ({ ...r, label: formatDateLabel(r.date) })));
                } catch (attendanceErr) {
                        if (!cancelled) setChartRows([]);
                        if (!cancelled && !err) setErr(attendanceErr.message);
                }
        }



      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [user?.role, user?.id, days]);

  // Aggregate data for Pie Chart
  const pieData = useMemo(() => {
    const data = user?.role === 'student' ? studentTrends : chartRows;
    const totals = data.reduce((acc, curr) => {
      acc[0].value += (curr.present || 0);
      acc[1].value += (curr.absent || 0);
      return acc;
    }, [
      { name: 'Present', value: 0 },
      { name: 'Absent', value: 0 }
    ]);
    return totals;
  }, [chartRows, studentTrends, user?.role]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
  <div className="space-y-6 md:space-y-8 pt-7 pb-22 px-7 sm:px-0">

    {/* HEADER */}
    <div className="flex flex-col justify-between gap-3 md:gap-4 md:flex-row md:items-start">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
          Hello, {user?.firstName || 'User'} 👋
        </h1>
        {err && (
          <p className="mt-2 text-xs md:text-sm text-red-600 dark:text-red-400">{err}</p>
        )}
        <p className="mt-1 text-sm md:text-base text-slate-600 dark:text-slate-300">
          {user?.role === 'student'
            ? 'Track your live attendance progress.'
            : 'Manage your classes and reporting.'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-xs md:text-sm font-bold text-slate-400">{today}</p>
        
        {/* TIME FILTER UI */}
        <select 
          value={days} 
          onChange={(e) => setDays(e.target.value)}
          className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1 text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="365">Last 1 Year</option>
        </select>
      </div>
    </div>

    {/* STATS */}
    {summary && (
      <div className="grid gap-3 md:gap-4 sm:grid-cols-3">
        {user?.role === 'admin' && (
          <>
            <StatCard label="Total Users" value={summary.users} />
            <StatCard label="Active Classes" value={summary.classes} />
            <StatCard
              label="Total Attendance"
              value={(summary.attendanceByStatus?.present || 0) +
                (summary.attendanceByStatus?.absent || 0)}
            />
          </>
        )}
        {user?.role === 'teacher' && (
          <>
            <StatCard label="My Classes" value={summary.myClasses} />
            <StatCard label="Present" value={summary.attendance.present} color="text-emerald-600" />
            <StatCard label="Absent" value={summary.attendance.absent} color="text-red-600" />
          </>
        )}
        {user?.role === 'student' && (
          <>
            <StatCard label="Rate" value={`${summary.approximateRate}%`} color="text-indigo-600" />
            <StatCard label="Present" value={summary.present} />
            <StatCard label="Absent" value={summary.absent} color="text-red-600" />
          </>
        )}
      </div>
    )}

    {/* CHART SECTION */}
    <div className="grid gap-4 md:gap-6 lg:grid-cols-3">

      {/* CHART CARD */}
      <div className="rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 bg-white p-4 md:p-8 shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">

        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <h2 className="text-[11px] md:text-sm font-black uppercase tracking-widest text-slate-400">
            {user?.role === 'student' ? 'Activity Analytics' : 'Attendance Trends'}
          </h2>
          
          {/* CHART TYPE TOGGLE */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['line', 'bar', 'pie'].map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                  chartType === type 
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full flex justify-center items-center">
          <div className="w-full max-w-md md:max-w-none h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              ) : chartType === 'bar' ? (
                <BarChart data={user?.role === 'student' ? studentTrends : chartRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{fontSize: 10}} axisLine={false} />
                  <YAxis tick={{fontSize: 10}} axisLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend />
                  <Bar dataKey="present" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                // LINE / AREA CHART
                user?.role === 'student' ? (
                  <AreaChart data={studentTrends}>
                    <defs>
                      <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{fontSize: 10}} axisLine={false} />
                    <YAxis hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="present" stroke="#4f46e5" strokeWidth={3} fill="url(#colorP)" />
                  </AreaChart>
                ) : (
                  <LineChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#4f46e5" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={3} dot={false} />
                  </LineChart>
                )
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="space-y-4 md:space-y-6">
        {user?.role === 'student' && (
          <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 text-white shadow-xl">
            <h2 className="text-lg md:text-2xl font-black mb-3">Daily Attendance</h2>
            <Link
              to="/app/mark-attendance"
              className="block w-full bg-indigo-600 py-3 md:py-4 rounded-xl text-center text-xs font-bold transition-transform hover:scale-[1.02]"
            >
              📷 Scan QR
            </Link>
          </div>
        )}

        <div className="rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 bg-white p-5 md:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xs font-black uppercase text-slate-400 mb-3">
            Quick actions
          </h3>
          <div className="flex flex-col gap-2">
            <Link className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline" to="/app/classes">
              → My Classes
            </Link>
            <Link className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline" to="/app/reports">
              → Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}

function StatCard({ label, value, color = "text-slate-900 dark:text-white" }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}