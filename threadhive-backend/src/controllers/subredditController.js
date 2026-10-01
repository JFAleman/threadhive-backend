import {
  fetchAllSubreddits,
  createNewSubreddit,
  fetchSubredditWithThreads,
} from "../services/subredditService.js";
import Subreddit from "../models/Subreddit.js";

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
  const existingSubreddit = await Subreddit.findOne({
     name: req.body.name
  })
  if (existingSubreddit) {
    return res.status(409).json({
      success: false,
      message: "Subreddit already exists",
    })
  }
  const subreddit = await createNewSubreddit(
    req.body.name,
    req.body.description,
    req.body.author
  )
  return res.status(201).json({
      success: true,
      message: "Subreddit created successfully",
      data: subreddit,
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "Server error while creating subreddit"
    })
  }
};

export const getSubredditWithThreads = async (req, res) => {
  // YOUR CODE HERE
};
