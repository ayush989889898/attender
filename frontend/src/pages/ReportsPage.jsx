import { useEffect, useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

const COLORS = ["#10b981", "#ef4444"];

export default function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [range, setRange] = useState("7");
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartView, setChartView] = useState("pie");

  // 1. INITIALIZE: Fetch available classes
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get("/classes");
        const cls = data.data || [];
        setClasses(cls);
        if (cls.length) setSelectedClass(cls[0]._id);
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };
    init();
  }, []);

  // 2. FETCH DATA: Triggered when class or range changes
  useEffect(() => {
    if (!selectedClass || user?.role === "student") return;

    const fetchRangeData = async () => {
      setLoading(true);
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - (parseInt(range) - 1));

      try {
        const res = await api.get("/reports/range", {
          params: {
            classId: selectedClass,
            from: from.toISOString(),
            to: to.toISOString(),
          },
        });
        setAttendanceData(res.data.data || []);
      } catch (err) {
        console.error("Error fetching report data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRangeData();
  }, [selectedClass, range, user?.role]);

  // 3. TREND DATA: Aggregates total Present/Absent per day
  const classTrendData = useMemo(() => {
    const dailyMap = {};
    const daysCount = parseInt(range);

    for (let i = 0; i < daysCount; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dailyMap[label] = {
        date: label,
        present: 0,
        absent: 0,
        timestamp: d.getTime(),
      };
    }

    attendanceData.forEach((r) => {
      const dateLabel = new Date(r.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (dailyMap[dateLabel]) {
        if (r.status === "present") dailyMap[dateLabel].present++;
        else dailyMap[dateLabel].absent++;
      }
    });

    return Object.values(dailyMap).sort((a, b) => a.timestamp - b.timestamp);
  }, [attendanceData, range]);

  // 4. STUDENT STATS: Aggregates data for the Table/Mobile List
  const studentStats = useMemo(() => {
    const stats = {};

    attendanceData.forEach((r) => {
      // Ensure the nested user object exists
      const u = r.userId;
      if (!u?._id) return;

      if (!stats[u._id]) {
        stats[u._id] = {
          id: u._id,
          // THIS LINE: Fetching the rollNumber from the user object
          rollNumber: u.rollNumber || "N/A",
          name: `${u.firstName} ${u.lastName}`,
          present: 0,
          absent: 0,
          total: 0,
        };
      }

      stats[u._id].total++;
      if (r.status === "present") stats[u._id].present++;
      else stats[u._id].absent++;
    });

    return Object.values(stats)
      .map((s) => ({
        ...s,
        percentage: s.total ? ((s.present / s.total) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) =>
        // Sorting by roll number numerically
        String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, {
          numeric: true,
        }),
      );
  }, [attendanceData]);

  // 5. PIE DATA
  const pieData = [
    {
      name: "Present",
      value: attendanceData.filter((a) => a.status === "present").length,
    },
    {
      name: "Absent",
      value: attendanceData.filter((a) => a.status === "absent").length,
    },
  ];

  const downloadCSV = () => {
    const header = "Roll No,Student Name,Present,Absent,Percentage\n";
    const rows = studentStats
      .map(
        (s) =>
          `${s.rollNumber},"${s.name}",${s.present},${s.absent},${s.percentage}%`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Report_${selectedClass}_${range}days.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-10 p-4 md:p-8">
      {/* 🛠 FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col gap-3 md:flex-row md:items-center">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-sm font-semibold outline-none border-2 border-transparent focus:border-indigo-500 transition"
        >
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} - {c.standard}
            </option>
          ))}
        </select>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-sm font-semibold outline-none border-2 border-transparent focus:border-indigo-500 transition"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>

        <button
          onClick={downloadCSV}
          className="bg-indigo-600 text-white py-2 px-6 rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
        >
          Export CSV
        </button>
      </div>

      {/* 📊 ANALYTICS SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              Attendance Trends
            </h3>
            <p className="text-xs text-slate-400">
              Class activity for the last {range} days
            </p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["pie", "bar", "line"].map((type) => (
              <button
                key={type}
                onClick={() => setChartView(type)}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                  chartView === type
                    ? "bg-white shadow-sm text-indigo-600"
                    : "text-slate-500"
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartView === "pie" ? (
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              ) : chartView === "bar" ? (
                <BarChart data={classTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    name="Present"
                    dataKey="present"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    name="Absent"
                    dataKey="absent"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart data={classTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="present"
                    stroke="#10b981"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 💻 DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest">
            <tr>
              <th className="p-5 text-center">Roll</th>
              <th className="text-left">Student</th>
              <th className="text-center">Present</th>
              <th className="text-center">Absent</th>
              <th className="text-center">Attendance %</th>
              <th className="text-center">Quick Chat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {studentStats.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 text-center font-bold text-slate-400">
                  {s.rollNumber}
                </td>
                <td className="p-4 font-bold text-slate-700">{s.name}</td>
                <td className="text-center text-emerald-600 font-bold">
                  {s.present}
                </td>
                <td className="text-center text-red-500 font-bold">
                  {s.absent}
                </td>
                <td className="text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${parseFloat(s.percentage) < 60 ? "text-red-600 bg-red-50" : "text-emerald-700 bg-emerald-50"}`}
                  >
                    {s.percentage}%
                  </span>
                </td>
                <td className="text-center">
                  <button
                    onClick={() =>
                      navigate("/app/messages", {
                        state: {
                          contactId: s.id,
                          contactName: s.name,
                          type: "direct",
                        },
                      })
                    }
                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl transition-all"
                  >
                    💬
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
