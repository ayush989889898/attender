import { body } from 'express-validator';
import mongoose from 'mongoose';

import { Attendance } from '../models/Attendance.js';
import { ClassModel } from '../models/Class.js';
import { handleValidation } from '../middleware/validate.js';

/** Normalize date to 00:00:00 UTC */
function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

//
// ---------------- VALIDATORS ----------------
//

export const markValidators = [
  body('classId').isMongoId(),
  body('userId').isMongoId(),
  body('date').optional().isISO8601(),
  body('status').isIn(['present', 'absent', 'late']),
  body('notes').optional().isString(),
  handleValidation,
];

export const bulkValidators = [
  body('classId').isMongoId(),
  body('date').optional().isISO8601(),
  body('entries').isArray({ min: 1 }),
  body('entries.*.userId').isMongoId(),
  body('entries.*.status').isIn(['present', 'absent', 'late']),
  handleValidation,
];

export const selfMarkValidators = [
  body('classId').isMongoId(),
  body('sessionToken').notEmpty().trim(),
  body('status').optional().isIn(['present', 'late']),
  handleValidation,
];

//
// ---------------- PERMISSION HELPER ----------------
//

async function assertCanMarkClass(req, classId) {
  const cls = await ClassModel.findById(classId);

  if (!cls) {
    return { error: { status: 404, message: 'Class not found' } };
  }

  if (req.user.role === 'admin') return { cls };

  if (
    req.user.role === 'teacher' &&
    cls.teacherId.equals(req.user._id)
  ) {
    return { cls };
  }

  return { error: { status: 403, message: 'Forbidden: Access denied' } };
}

//
// ---------------- CONTROLLERS ----------------
//

/** Update attendance */
export async function updateAttendance(req, res, next) {
  try {
    const doc = await Attendance.findById(req.params.id).populate('classId');

    if (!doc) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const cls = doc.classId;

    if (
      req.user.role !== 'admin' &&
      !cls.teacherId.equals(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: 'Forbidden: You cannot edit this record' });
    }

    const { status, notes } = req.body;

    if (status) doc.status = status;
    if (notes !== undefined) doc.notes = notes;

    await doc.save();

    return res.json({ attendance: doc });
  } catch (error) {
    next(error);
  }
}

/** Bulk attendance (Teacher) */
export async function markBulk(req, res, next) {
  try {
    const { classId, date, entries } = req.body;

    const check = await assertCanMarkClass(req, classId);
    if (check.error) {
      return res.status(check.error.status).json({ message: check.error.message });
    }

    const { cls } = check;
    const day = startOfDay(date || new Date());

    const allowed = new Set(cls.studentIds.map(id => id.toString()));

    const ops = entries.map(entry => {
      if (!allowed.has(entry.userId)) {
        throw new Error(`User ${entry.userId} is not in this class`);
      }

      return {
        updateOne: {
          filter: {
            classId: new mongoose.Types.ObjectId(classId),
            userId: entry.userId,
            date: day,
          },
          update: {
            $set: {
              classId,
              userId: entry.userId,
              date: day,
              status: entry.status,
              markedBy: req.user._id,
              notes: entry.notes || '',
            },
          },
          upsert: true,
        },
      };
    });

    if (ops.length) {
      await Attendance.bulkWrite(ops);
    }

    const list = await Attendance.find({ classId, date: day });

    return res.json({
      count: list.length,
      data: list,
    });
  } catch (error) {
    next(error);
  }
}

/** Self attendance (QR) */
export async function markSelf(req, res, next) {
  try {
    const { classId, sessionToken } = req.body;
    const userId = req.user._id;

    const cls = await ClassModel.findById(classId);

    if (!cls) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (!cls.sessionToken) {
      return res.status(400).json({
        message: 'No active session. Ask teacher to start one.',
      });
    }

    if (cls.sessionToken !== sessionToken) {
      return res.status(400).json({
        message: 'Invalid QR: Code expired or incorrect.',
      });
    }

    if (cls.sessionExpiresAt && new Date() > cls.sessionExpiresAt) {
      return res.status(400).json({ message: 'QR expired.' });
    }

    const day = startOfDay(new Date());

    const exists = await Attendance.findOne({
      classId,
      userId,
      sessionToken,
    });

    if (exists) {
      return res.status(400).json({ message: 'Already marked.' });
    }

    await Attendance.create({
      classId,
      userId,
      sessionToken,
      date: day,
      status: 'present',
      markedBy: userId,
    });

    return res.json({
      success: true,
      studentName: `${req.user.firstName} ${req.user.lastName}`,
    });
  } catch (error) {
    next(error);
  }
}

/** Finalize session */
export async function finalizeAttendance(req, res, next) {
  try {
    const { classId } = req.body;

    const check = await assertCanMarkClass(req, classId);
    if (check.error) {
      return res.status(check.error.status).json({ message: check.error.message });
    }

    const { cls } = check;

    if (!cls.sessionToken) {
      return res.status(400).json({ message: 'No active session.' });
    }

    const token = cls.sessionToken;
    const day = startOfDay(new Date());

    const present = await Attendance.find({
      classId,
      sessionToken: token,
      status: 'present',
    });

    const presentIds = present.map(r => r.userId.toString());

    const absentIds = cls.studentIds.filter(
      id => !presentIds.includes(id.toString())
    );

    if (absentIds.length) {
      await Attendance.insertMany(
        absentIds.map(id => ({
          userId: id,
          classId,
          sessionToken: token,
          date: day,
          status: 'absent',
          markedBy: req.user._id,
        }))
      );
    }

    cls.sessionToken = '';
    cls.sessionExpiresAt = null;
    await cls.save();

    res.json({
      success: true,
      message: `Session ended. ${absentIds.length} marked absent.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function markOne(req, res, next) {
  try {
    const { classId, userId, status, notes, date } = req.body;

    const check = await assertCanMarkClass(req, classId);
    if (check.error) {
      return res.status(check.error.status).json({
        message: check.error.message,
      });
    }

    const day = startOfDay(date || new Date());

    const doc = await Attendance.findOneAndUpdate(
      { classId, userId, date: day },
      {
        classId,
        userId,
        date: day,
        status,
        markedBy: req.user._id,
        notes: notes || '',
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.json({ attendance: doc });
  } catch (error) {
    next(error);
  }
}

export async function listAttendance(req, res, next) {
  try {
    const {
      classId,
      userId,
      from,
      to,
      sessionToken,
      status,
      page = '1',
      limit = '20',
    } = req.query;

    const filter = {};

    if (classId) filter.classId = classId;
    if (userId) filter.userId = userId;
    if (sessionToken) filter.sessionToken = sessionToken;
    if (status) filter.status = status;

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = startOfDay(to);
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [data, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .populate('userId', 'firstName lastName email username')
        .populate('markedBy', 'firstName lastName username')
        .populate('classId', 'name code subject'),

      Attendance.countDocuments(filter),
    ]);

    return res.json({
      data,
      page: p,
      limit: l,
      total,
      pages: Math.ceil(total / l),
    });
  } catch (error) {
    next(error);
  }
}