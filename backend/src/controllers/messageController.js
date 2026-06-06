import { Message } from '../models/Message.js';

export async function getClassMessages(req, res, next) {
  try {
    const { classId } = req.params;
    // Find messages and ensure we populate the sender
    const messages = await Message.find({ classId })
      .populate('senderId', 'firstName lastName role')
      .sort({ createdAt: 1 });
    
    // Always return an array, even if empty
    res.json(messages || []);
  } catch (e) { 
    res.status(500).json([]); 
  }
}

export async function getDirectMessages(req, res, next) {
  try {
    const { userId } = req.params;
    const now = new Date();

    await Message.updateMany(
      {
        senderId: userId,
        receiverId: req.user._id,
        deliveredAt: null,
      },
      {
        $set: { deliveredAt: now },
      }
    );

    await Message.updateMany(
      {
        senderId: userId,
        receiverId: req.user._id,
        seenAt: null,
      },
      {
        $set: { deliveredAt: now, seenAt: now },
      }
    );

    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    })
    .populate('senderId', 'firstName lastName role')
    .sort({ createdAt: 1 });

    res.json(messages || []);
  } catch (e) { 
    res.status(500).json([]); 
  }
}

export async function sendMessage(req, res, next) {
  try {
    const { classId, receiverId, text } = req.body;
    
    const newMessage = await Message.create({
      senderId: req.user._id,
      classId: classId || undefined,
      receiverId: receiverId || undefined,
      text: text || '',
      fileUrl: req.file ? req.file.path.replace(/\\/g, '/') : undefined,
      fileName: req.file ? req.file.originalname : undefined,
      fileType: req.file ? (req.file.mimetype.startsWith('image/') ? 'image' : 'document') : 'none',
      deliveredAt: classId ? new Date() : null,
    });

    const populated = await Message.findById(newMessage._id)
      .populate('senderId', 'firstName lastName role');

    res.status(201).json(populated);
  } catch (e) { 
    next(e); 
  }
}

// Add these to the bottom of messageController.js

export async function editMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    // Security check: Only sender can edit
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    message.text = text;
    message.isEdited = true; // Optional: add this field to your Message schema
    await message.save();

    res.json(message);
  } catch (e) { next(e); }
}

export async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Message.findByIdAndDelete(id);
    res.json({ message: 'Deleted successfully' });
  } catch (e) { next(e); }
}