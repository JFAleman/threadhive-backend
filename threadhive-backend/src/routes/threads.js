import express from 'express';
import {
	getAllThreads,
	getThreadById,
	createThread,
	updateThread,
	deleteThread,
} from '../controllers/threadController.js';

const router = express.Router();

router.get('/', getAllThreads);
router.get('/:id', getThreadById);
router.post('/', createThread);
router.put('/:id', updateThread);
router.delete('/:id', deleteThread);

export default router;