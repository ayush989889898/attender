import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // If classId is present, it's a group chat. If receiverId is present, it's a DM.
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, trim: true },
    fileUrl: { type: String }, // For photos/documents
    fileName: { type: String },
    fileType: { type: String, enum: ['image', 'document', 'none'], default: 'none' },
    isEdited: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexing for fast retrieval
messageSchema.index({ classId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);