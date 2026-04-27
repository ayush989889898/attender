import mongoose from 'mongoose';

const ROLES = ['admin', 'teacher', 'student'];

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'student' },
    rollNumber: { 
    type: String, 
    required: function() { return this.role === "student"; }, // Only required if user is a student
    unique: true,
    sparse: true // Allows multiple 'teachers' to have null/no roll number without conflict
  },
    // Optional profile / preferences (used by Settings UI)
    smsAlertsParents: { type: Boolean, default: false },
    pushNotificationsStudents: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  },
  { timestamps: true }
);

userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    role: this.role,
    smsAlertsParents: this.smsAlertsParents,
    pushNotificationsStudents: this.pushNotificationsStudents,
    theme: this.theme,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.model('User', userSchema);
export const USER_ROLES = ROLES;
