import Subreddit from "../models/Subreddit.js";
import Thread from "../models/Thread.js";

export const fetchAllSubreddits = async () => {
  return await Subreddit.find();
};

export const createNewSubreddit = async (name, description, author) => {
  const subreddit = await Subredit.create({ name, description, author });
  return await subreddit.save();
};

export const fetchSubredditWithThreads = async (id) => {
  // YOUR CODE HERE
};
