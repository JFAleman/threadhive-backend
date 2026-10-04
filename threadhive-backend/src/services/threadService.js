import Thread from '../models/Thread.js';

export const fetchAllThreads = async () => {
	return Thread.find()
		.populate('author', 'name email')
		.populate('subreddit', 'name description');
};

export const fetchThreadById = async (id) => {
	return Thread.findById(id)
		.populate('author', 'name email')
		.populate('subreddit', 'name description');
};

export const createNewThread = async (threadData) => {
	return Thread.create(threadData);
};

export const updateExistingThread = async (id, threadData) => {
	return Thread.findByIdAndUpdate(id, threadData, {
		new: true,
		runValidators: true,
	})
		.populate('author', 'name email')
		.populate('subreddit', 'name description');
};

export const deleteExistingThread = async (id) => {
	return Thread.findByIdAndDelete(id);
};