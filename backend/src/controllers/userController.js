import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { User } from '../models/User.js';
import { handleValidation } from '../middleware/validate.js';

const SALT_ROUNDS = 12;

// --- VALIDATORS ---

export const updateProfileValidators = [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
  body('email').optional().isEmail(),
  handleValidation,
];

export const updatePasswordValidators = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  handleValidation,
];

export const prefsValidators = [
  body('smsAlertsParents').optional().isBoolean(),
  body('pushNotificationsStudents').optional().isBoolean(),
  body('theme').optional().isIn(['light', 'dark']),
  handleValidation,
];

// --- CONTROLLER FUNCTIONS ---

/**
 * Global Search for Users (Students/Teachers)
 * Used by TopBar for instant suggestions as you type.
 */
export async function getUsers(req, res, next) {
  try {
    // We use "search" to match the TopBar request
    const { search, role } = req.query; 
    const filter = {};

    if (role) filter.role = role;

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).limit(10).select('firstName lastName username role');
    res.json({ data: users }); // Ensure data is wrapped in a "data" object
  } catch (e) {
    next(e);
  }
}

/**
 * Paginated list of users (Admin/Dashboard view)
 */
export async function listUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').toString().trim();
    const filter = {};

    if (search) {
      filter.$or = [
        { username: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
      ];
    }

    if (req.query.role) filter.role = req.query.role;

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.json({
      data: items.map((u) => u.toSafeJSON()),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    return next(e);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, email } = req.body;
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim();
    if (email !== undefined) updates.email = String(email).toLowerCase().trim();

    const user = await User.findByIdAndUpdate(req.user._id, updates, { 
      new: true, 
      runValidators: true 
    });
    
    return res.json({ user: user.toSafeJSON() });
  } catch (e) {
    return next(e);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    const ok = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    
    if (!ok) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(req.body.newPassword, SALT_ROUNDS);
    await user.save();
    
    return res.json({ message: 'Password updated' });
  } catch (e) {
    return next(e);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const { smsAlertsParents, pushNotificationsStudents, theme } = req.body;
    const updates = {};
    
    if (smsAlertsParents !== undefined) updates.smsAlertsParents = smsAlertsParents;
    if (pushNotificationsStudents !== undefined) updates.pushNotificationsStudents = pushNotificationsStudents;
    if (theme !== undefined) updates.theme = theme;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    
    return res.json({ user: user.toSafeJSON() });
  } catch (e) {
    return next(e);
  }
}