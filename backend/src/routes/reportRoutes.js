import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  summary, 
  reportRange, 
  getStudentTrends, 
  getStudentSubjectWise, 
  getTodayStats 
} from '../controllers/reportController.js';

const router = Router();

// Middleware to protect all report routes
router.use(authenticate);

router.get('/summary', summary);
router.get('/range', reportRange);
router.get('/student-trends', getStudentTrends);
router.get('/student-subject-wise', getStudentSubjectWise);
router.get('/today-stats', getTodayStats);

export default router;