import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  archiveClass,
  createClass,
  createClassValidators,
  getClass,
  idParam,
  joinClass,
  joinValidators,
  listMyClasses,
  startSession,
  deleteClass
} from '../controllers/classController.js';

const router = Router();

router.use(authenticate);

router.get('/', listMyClasses);
router.get('/:id', idParam, getClass);
router.post('/', authorize('teacher', 'admin'), createClassValidators, createClass);
router.post('/join', joinValidators, joinClass);
router.post('/:id/session', authorize('teacher', 'admin'), idParam, startSession);
router.post('/:id/archive', authorize('teacher', 'admin'), idParam, archiveClass);
router.delete('/:id', authorize('teacher', 'admin'), deleteClass);

export default router;
