import Subreddit from "../models/Subreddit.js";
import Thread from "../models/Thread.js";

export const fetchAllSubreddits = async () => {
  return await Subreddit.find();
};

export const createNewSubreddit = async (name, description, author) => {
  // YOUR CODE HERE
};

export const fetchSubredditWithThreads = async (id) => {
  // YOUR CODE HERE
};
