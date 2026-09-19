import express from 'express';
import {
    getAllSubreddits,
    createSubreddit,
    getSubredditWithThreads
} from '../controllers/subredditController.js';

const router = express.Router();

router.get('/', getAllSubreddits);

/**
 * TODO: Register the following two routes using the imported controller functions:
 *
 *  Part 1: POST /       → createSubreddit          (create a new subreddit)
 *  Part 2: GET  /:id    → getSubredditWithThreads  (get one subreddit + its threads)
 *
 * Note: Paths here are relative. The "/api/subreddits" prefix
 * is already applied in src/app.js via: app.use('/api/subreddits', subredditRoutes)
 */

// YOUR CODE HERE

export default router;
