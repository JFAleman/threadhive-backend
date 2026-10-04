import Subreddit from "../models/Subreddit.js";
import Thread from "../models/Thread.js";

export const fetchAllSubreddits = async () => {
  return await Subreddit.find();
};

export const createNewSubreddit = async (name, description, author) => {
  const subreddit = await Subreddit.create({ 
    name, 
    description, 
    author 
  })
  return subreddit
};

export const fetchSubredditWithThreads = async (id) => {
  const subreddit = await Subreddit.findById(id).populate('author', 'name email');

  if (!subreddit) {
    return null;
  }

  const threads = await Thread.find({ subreddit: id })
    .populate('author', 'name email')
    .populate('subreddit', 'name description');

  return { subreddit, threads };
};
