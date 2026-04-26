import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { ClassModel } from '../src/models/Class.js';
import { Attendance } from '../src/models/Attendance.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/attender';

async function run() {
  await mongoose.connect(uri);
  await Promise.all([User.deleteMany({}), ClassModel.deleteMany({}), Attendance.deleteMany({})]);
  // Simple demo password (no special characters) so copy/paste from README is reliable
  const hash = await bcrypt.hash('Password123', 12);

  const [admin, teacher, s1, s2] = await User.insertMany([
    {
      username: 'admin',
      email: 'admin@attender.local',
      firstName: 'System',
      lastName: 'Admin',
      passwordHash: hash,
      role: 'admin',
    },
    {
      username: 'teacher1',
      email: 'teacher@attender.local',
      firstName: 'Robert',
      lastName: 'Smith',
      passwordHash: hash,
      role: 'teacher',
    },
    {
      username: 'student1',
      email: 'alex@attender.local',
      firstName: 'Alex',
      lastName: 'Rivers',
      passwordHash: hash,
      role: 'student',
    },
    {
      username: 'student2',
      email: 'mia@attender.local',
      firstName: 'Mia',
      lastName: 'Thorne',
      passwordHash: hash,
      role: 'student',
    },
  ]);

  const cls = await ClassModel.create({
    name: 'Grade 10 - Mathematics',
    code: 'MATH10A',
    subject: 'Mathematics',
    teacherId: teacher._id,
    studentIds: [s1._id, s2._id],
  });

  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  await Attendance.insertMany([
    {
      userId: s1._id,
      classId: cls._id,
      date: day,
      status: 'present',
      markedBy: teacher._id,
    },
    {
      userId: s2._id,
      classId: cls._id,
      date: day,
      status: 'late',
      markedBy: teacher._id,
    },
  ]);

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
  // eslint-disable-next-line no-console
  console.log('Login samples (password for all): Password123');
  // eslint-disable-next-line no-console
  console.log('  admin / teacher1 / student1 / student2');
  await mongoose.disconnect();
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
