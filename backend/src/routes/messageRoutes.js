import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
// Add editMessage and deleteMessage to this list 👇
import { 
  getClassMessages, 
  getDirectMessages, 
  sendMessage, 
  editMessage, 
  deleteMessage 
} from '../controllers/messageController.js';
import { upload } from '../middleware/upload.js';

const router = Router();
router.use(authenticate);

router.get('/class/:classId', getClassMessages);
router.get('/direct/:userId', getDirectMessages);

// Handles both text and file uploads
router.post('/', upload.single('file'), sendMessage);

// New WhatsApp-style routes
router.patch('/:id', editMessage);
router.delete('/:id', deleteMessage);

export default router;