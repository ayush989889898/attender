import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listUsers,
  getUsers,
  prefsValidators,
  updatePassword,
  updatePasswordValidators,
  updatePreferences,
  updateProfile,
  updateProfileValidators,
} from '../controllers/userController.js';

const router = Router();

router.use(authenticate);

router.patch('/me', updateProfileValidators, updateProfile);
router.patch('/me/password', updatePasswordValidators, updatePassword);
router.patch('/me/preferences', prefsValidators, updatePreferences);
// router.get('/', authorize('admin'), listUsers);
router.get('/', authorize('admin', 'teacher', 'student'), listUsers);
router.get('/search', getUsers); // This is the endpoint for the TopBar



export default router;
