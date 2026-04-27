import PDFDocument from 'pdfkit';
import { Attendance } from '../models/Attendance.js';
import { ClassModel } from '../models/Class.js';
import { User } from '../models/User.js';

// --- HELPER FUNCTIONS ---
function startOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

// --- MAIN CONTROLLERS ---

export async function summary(req, res, next) {
  try {
    const role = req.user.role;
    if (role === 'admin') {
      const [userCount, classCount, attendanceAgg] = await Promise.all([
        User.countDocuments(),
        ClassModel.countDocuments({ isArchived: false }),
        Attendance.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);
      const byStatus = Object.fromEntries(attendanceAgg.map((a) => [a._id, a.count]));
      return res.json({ users: userCount, classes: classCount, attendanceByStatus: byStatus });
    }

    if (role === 'teacher') {
      const classes = await ClassModel.find({ teacherId: req.user._id, isArchived: false }).select('_id');
      const ids = classes.map((c) => c._id);
      const [present, absent, late, students] = await Promise.all([
        Attendance.countDocuments({ classId: { $in: ids }, status: 'present' }),
        Attendance.countDocuments({ classId: { $in: ids }, status: 'absent' }),
        Attendance.countDocuments({ classId: { $in: ids }, status: 'late' }),
        User.countDocuments({ role: 'student' }),
      ]);
      return res.json({ myClasses: ids.length, attendance: { present, absent, late }, totalStudentsInDb: students });
    }

    // Student View
    const uid = req.user._id;
    const [present, absent, late, total] = await Promise.all([
      Attendance.countDocuments({ userId: uid, status: 'present' }),
      Attendance.countDocuments({ userId: uid, status: 'absent' }),
      Attendance.countDocuments({ userId: uid, status: 'late' }),
      Attendance.countDocuments({ userId: uid }),
    ]);
    const rate = total ? Math.round((100 * (present + late * 0.5)) / total) : 0;
    return res.json({ present, absent, late, totalRecords: total, approximateRate: rate });
  } catch (e) { return next(e); }
}

export async function reportRange(req, res, next) {
  try {
    const { classId, from, to, format = 'json' } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from and to are required' });

    const f = startOfDay(from);
    const t = endOfDay(to);
    const filter = { date: { $gte: f, $lte: t } };

    if (classId) {
      filter.classId = classId;
    } else if (req.user.role === 'student') {
      filter.userId = req.user._id;
    }

    const rows = await Attendance.find(filter)
      .sort({ date: 1 })
      .populate('userId', 'firstName lastName rollNumber username email')
      .populate('classId', 'name code subject');

    if (format === 'csv') {
      const header = 'date,class,user,status\n';
      const body = rows.map((r) => `"${r.date.toISOString().slice(0, 10)}","${r.classId?.name}","${r.userId?.firstName}","${r.status}"`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(header + body);
    }
    return res.json({ count: rows.length, data: rows });
  } catch (e) { return next(e); }
}

// --- NEW TRENDS & REAL-TIME STATS ---

export async function getStudentTrends(req, res, next) {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));

    const records = await Attendance.find({
      userId,
      date: { $gte: startOfDay(fromDate) }
    }).sort({ date: 1 });

    const map = {};
    records.forEach(r => {
      const dateKey = r.date.toISOString().slice(0, 10);
      if (!map[dateKey]) map[dateKey] = { date: dateKey, present: 0, absent: 0 };
      if (r.status === 'present') map[dateKey].present++;
      else map[dateKey].absent++;
    });

    const chartData = Object.values(map).map(item => ({
      ...item,
      label: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
    res.json({ data: chartData });
  } catch (e) { next(e); }
}

export async function getStudentSubjectWise(req, res, next) {
  try {
    const userId = req.user._id;
    const records = await Attendance.find({ userId }).populate('classId', 'name subject');
    const subjectMap = {};

    records.forEach(r => {
      if(!r.classId) return;
      const subName = r.classId.subject;
      if (!subjectMap[subName]) {
        subjectMap[subName] = { subject: subName, className: r.classId.name, present: 0, total: 0 };
      }
      subjectMap[subName].total++;
      if (r.status === 'present') subjectMap[subName].present++;
    });

    const data = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: Math.round((s.present / s.total) * 100)
    }));
    res.json({ data });
  } catch (e) { next(e); }
}

export async function getTodayStats(req, res, next) {
  try {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ message: 'classId is required' });

    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    const attendance = await Attendance.find({
      classId,
      date: { $gte: start, $lte: end }
    });

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;

    res.json({
      data: [
        { name: 'Present', value: presentCount },
        { name: 'Absent', value: absentCount }
      ]
    });
  } catch (e) { next(e); }
}