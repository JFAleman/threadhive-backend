import express from 'express';
import {
    getAllSubreddits,
    createSubreddit,
    getSubredditWithThreads
} from '../controllers/subredditController.js';

const router = express.Router();

// http://localhost:3000/api/subreddits
router.get('/', getAllSubreddits);
router.post('/', createSubreddit);
router.get('/:id', getSubredditWithThreads);

export default router;
