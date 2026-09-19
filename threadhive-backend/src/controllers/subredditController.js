import {
  fetchAllSubreddits,
  createNewSubreddit,
  fetchSubredditWithThreads,
} from "../services/subredditService.js";

// GET /api/subreddits
export const getAllSubreddits = async (req, res) => {
  try {
    const subreddits = await fetchAllSubreddits();

    if (!subreddits || subreddits.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subreddits found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subreddits fetched successfully",
      data: subreddits,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching subreddits",
    });
  }
};

export const createSubreddit = async (req, res) => {
  try {
    req.body.name,
    req.body.description,
    req.body.author
  );
  res.status(201).json({
    success: true,
    message: "Subreddit created successfully",
    data: subreddit,
  });
};

export const getSubredditWithThreads = async (req, res) => {
  // YOUR CODE HERE
};
