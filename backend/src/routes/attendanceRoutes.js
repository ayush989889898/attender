import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';
import {
  bulkValidators,
  finalizeAttendance,
  listAttendance,
  markBulk,
  markOne,
  markSelf,
  markValidators,
  selfMarkValidators,
  updateAttendance,
} from '../controllers/attendanceController.js';

const router = Router();

router.use(authenticate);

router.get('/', listAttendance);
router.post('/mark', authorize('teacher', 'admin'), markValidators, markOne);
router.post('/bulk', authorize('teacher', 'admin'), bulkValidators, markBulk);
router.post('/self', authorize('student'), selfMarkValidators, markSelf);
router.post('/finalize', authorize('teacher', 'admin'), finalizeAttendance);
router.patch(
  '/:id',
  authorize('teacher', 'admin'),
  [param('id').isMongoId(), body('status').optional().isIn(['present', 'absent', 'late']), handleValidation],
  updateAttendance,
);

export default router;
