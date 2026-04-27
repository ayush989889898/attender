import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    standard: { type: String, required: true, trim: true },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    subject: { type: String, required: true, trim: true },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Used for auto-absent logic

    isArchived: { type: Boolean, default: false },

    sessionToken: { type: String, default: "" },

    sessionExpiresAt: { type: Date, default: null },
  },

  { timestamps: true },
);

classSchema.index({ teacherId: 1, name: 1 });

export const ClassModel = mongoose.model("Class", classSchema);
