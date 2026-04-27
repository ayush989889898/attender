import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  login,
  loginValidators,
  me,
  register,
  registerValidators,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', registerValidators, register);
router.post('/login', loginValidators, login);
router.get('/me', authenticate, me);

export default router;
