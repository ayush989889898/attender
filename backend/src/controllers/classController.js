import crypto from 'crypto';
import { body, param } from 'express-validator';
import { ClassModel } from '../models/Class.js';
import { User } from '../models/User.js';

import { handleValidation } from '../middleware/validate.js';

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i += 1) out += chars[crypto.randomInt(chars.length)];
  return out;
}

export const createClassValidators = [
  body('name').notEmpty().withMessage('Class name is required').trim(),
  body('standard').notEmpty().withMessage('Standard is required').trim(),
  body('subject').notEmpty().withMessage('Subject is required').trim(),
  handleValidation,
];

export const joinValidators = [
  body('code').notEmpty().trim().isLength({ min: 6, max: 6 }).withMessage('Code must be 6 characters'),
  handleValidation,
];

export const idParam = [param('id').isMongoId(), handleValidation];
export const startSessionValidators = [
  param('id').isMongoId(),
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('accuracyMeters').optional().isFloat({ min: 0 }),
  handleValidation,
];

export async function createClass(req, res, next) {
  try {
    const { name, subject, standard } = req.body;
    let finalCode = randomCode(6);
    
    let exists = await ClassModel.exists({ code: finalCode });
    while (exists) {
      finalCode = randomCode(6);
      exists = await ClassModel.exists({ code: finalCode });
    }

    const cls = await ClassModel.create({
      name: name.trim(),
      standard: standard.trim(),
      code: finalCode,
      subject: subject.trim(),
      teacherId: req.user._id,
      studentIds: [],
    });
    return res.status(201).json({ class: cls });
  } catch (e) {
    return next(e);
  }
}

export async function listMyClasses(req, res, next) {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    let query = {};
    if (role === 'teacher') {
      query = { teacherId: userId, isArchived: false };
    } else if (role === 'student') {
      query = { studentIds: userId, isArchived: false };
    } else if (role === 'admin') {
      query = {};
    }
    const classes = await ClassModel.find(query)
      .populate('teacherId', 'firstName lastName email username')
      .populate('studentIds', 'firstName lastName  rollNumber email username')
      .sort({ updatedAt: -1 });
    return res.json({ data: classes });
  } catch (e) {
    return next(e);
  }
}

export async function getClass(req, res, next) {
  try {
    const cls = await ClassModel.findById(req.params.id)
      .populate('teacherId', 'firstName lastName email username')
      .populate('studentIds', 'firstName lastName email username');
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    return res.json({ class: cls });
  } catch (e) {
    return next(e);
  }
}

export async function joinClass(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can join via code' });
    }
    const code = String(req.body.code).toUpperCase().trim();
    const cls = await ClassModel.findOne({ code, isArchived: false });
    if (!cls) return res.status(404).json({ message: 'Invalid class code' });
    
    if (!cls.studentIds.map((id) => id.toString()).includes(req.user._id.toString())) {
      cls.studentIds.push(req.user._id);
      await cls.save();
    }
    return res.json({ class: cls });
  } catch (e) {
    return next(e);
  }
}


export const startSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, accuracyMeters } = req.body;
    
    // Generate a fresh 6-character random token
    const newToken = crypto.randomBytes(3).toString('hex').toUpperCase(); 
    const expiry = new Date(Date.now() + 1 * 60 * 1000);

    const cls = await ClassModel.findByIdAndUpdate(
      id,
      { 
        sessionToken: newToken, 
        sessionExpiresAt: expiry,
        sessionLocation: {
          lat: Number(lat),
          lng: Number(lng),
          accuracyMeters:
            accuracyMeters !== undefined && accuracyMeters !== null
              ? Number(accuracyMeters)
              : null,
        },
      },
      { new: true } // Return the updated document
    );

    res.json({ 
      sessionToken: cls.sessionToken, 
      sessionExpiresAt: cls.sessionExpiresAt,
      sessionLocation: cls.sessionLocation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export async function archiveClass(req, res, next) {
  try {
    const cls = await ClassModel.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    cls.isArchived = true;
    await cls.save();
    return res.json({ class: cls });
  } catch (e) {
    return next(e);
  }
}



// Corrected deleteClass function using ClassModel
export async function deleteClass(req, res, next) {
  try {
    const { id } = req.params;
    
    // Change 'Class' to 'ClassModel' to match your other functions
    const targetClass = await ClassModel.findById(id);

    if (!targetClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the logged-in user is the owner or an admin
    const isOwner = targetClass.teacherId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: You can only delete your own classes" });
    }

    await ClassModel.findByIdAndDelete(id);
    res.json({ message: "Class deleted successfully" });
  } catch (e) {
    next(e);
  }
}

// backend/src/controllers/classController.js

export const getClasses = async (req, res, next) => {
  try {
    const { search } = req.query;
    
    // If there is no search text, return an empty array immediately
    if (!search || search.trim() === "") {
      return res.json({ data: [] }); 
    }

    // This regex matches only if the class name STARTS with the search string
    // Example: "m" matches "Math" but NOT "Grammar"
    const startWithRegex = new RegExp(`^${search}`, 'i');

    const query = {
      $or: [
        { name: startWithRegex },
        { subject: startWithRegex },
        { code: startWithRegex }
      ]
    };

    const classes = await ClassModel.find(query).limit(5);
    
    res.json({ data: classes });
  } catch (e) {
    next(e);
  }
};