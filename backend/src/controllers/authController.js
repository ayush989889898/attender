import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { User, USER_ROLES } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { handleValidation } from '../middleware/validate.js';

const SALT_ROUNDS = 12;

export const registerValidators = [
  body('username').isLength({ min: 3 }).withMessage('Username min 3 chars'),
  body('email').isEmail().withMessage('Valid email required'),
  body('firstName').notEmpty().withMessage('First name required'),
  body('lastName').notEmpty().withMessage('Last name required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('role').optional().isIn(USER_ROLES).withMessage('Invalid role'),
  handleValidation,
];

export const loginValidators = [
  body('username').notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  body('role').optional().isIn(USER_ROLES).withMessage('Invalid role'),
  handleValidation,
];

export const register = async (req, res, next) => {
  try {
    const { username, email, firstName, lastName, password, role, rollNumber } = req.body;

    // 1. Check for existing Username or Email
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username or Email already exists." });
    }

    // 2. Check for existing Enrollment No (Only if it's a student)
    if (role === 'student' && rollNumber) {
      const existingEnrollment = await User.findOne({ rollNumber });
      if (existingEnrollment) {
        return res.status(400).json({ message: "Enrollment Number is already registered." });
      }
    }

    // 3. Create User
    const newUser = new User({
      username,
      email,
      firstName,
      lastName,
      passwordHash: await bcrypt.hash(password, 10), // Ensure you have bcrypt imported
      role,
      rollNumber: role === 'student' ? rollNumber : undefined,
    });

    await newUser.save();
    
    // Use the toSafeJSON method you created in the model
    return res.status(201).json({ 
      message: "User created successfully", 
      user: newUser.toSafeJSON() 
    });

  } catch (error) {
    // If MongoDB throws a code 11000 (Duplicate Key Error), handle it here
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate data error: Enrollment or Username already exists." });
    }
    next(error);
  }
};
/**
 * Login compares bcrypt hash; username lookup is case-insensitive.
 */
export async function login(req, res, next) {
  try {
    const username = String(req.body.username || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const user = await User.findOne({ username }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    if (req.body.role && req.body.role !== user.role) {
      return res.status(403).json({ message: 'Selected role does not match this account' });
    }
    const token = signToken({ sub: user._id.toString(), role: user.role });
    const safe = await User.findById(user._id);
    return res.json({ token, user: safe.toSafeJSON() });
  } catch (e) {
    return next(e);
  }
}

export async function me(req, res) {
  const user = await User.findById(req.user._id);
  return res.json({ user: user.toSafeJSON() });
}
