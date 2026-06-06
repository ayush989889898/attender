import mongoose from 'mongoose';

const STATUS = ['present', 'absent', 'late'];

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    // Normalized to start of day (00:00:00)
    date: { type: Date, required: true }, 
    status: { type: String, enum: STATUS, required: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '', trim: true },
    // Links this record to a specific QR generation session
    sessionToken: { type: String, required: true }, 
    studentGeo: {
      lat: { type: Number, min: -90, max: 90, default: null },
      lng: { type: Number, min: -180, max: 180, default: null },
      distanceMeters: { type: Number, min: 0, default: null },
      accuracyMeters: { type: Number, min: 0, default: null },
      effectiveDistanceMeters: { type: Number, min: 0, default: null },
    },
    photoCapturedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/** * CRITICAL CHANGE: 
 * We include sessionToken in the unique index.
 * This allows a student to have multiple attendance records on the same day,
 * as long as the sessionToken (the specific lecture) is different.
 */
attendanceSchema.index({ classId: 1, userId: 1, sessionToken: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const ATTENDANCE_STATUS = STATUS;