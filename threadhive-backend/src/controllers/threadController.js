import {
	fetchAllThreads,
	fetchThreadById,
	createNewThread,
	updateExistingThread,
	deleteExistingThread,
} from '../services/threadService.js';

const threadWriteFields = ['title', 'content', 'author', 'subreddit'];

const getThreadWriteData = (body) => Object.fromEntries(
	threadWriteFields
		.filter((field) => body[field] !== undefined)
		.map((field) => [field, body[field]])
);

export const getAllThreads = async (req, res) => {
	try {
		const threads = await fetchAllThreads();

		if (!threads || threads.length === 0) {
			return res.status(404).json({
				success: false,
				message: "No threads found",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Threads fetched successfully",
			data: threads,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			success: false,
			message: "Server error while fetching threads",
		});
	}
};

export const getThreadById = async (req, res) => {
	try {
		const thread = await fetchThreadById(req.params.id);

		if (!thread) {
			return res.status(404).json({
				success: false,
				message: "Thread not found",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Thread fetched successfully",
			data: thread,
		});
	} catch (error) {
		if (error.name === "CastError") {
			return res.status(400).json({
				success: false,
				message: "Invalid thread ID",
			});
		}

		console.log(error);
		return res.status(500).json({
			success: false,
			message: "Server error while fetching thread",
		});
	}
};

export const createThread = async (req, res) => {
	try {
		const threadData = getThreadWriteData(req.body);
		const missingFields = ['title', 'content', 'author', 'subreddit']
			.filter((field) => !threadData[field]);

		if (missingFields.length > 0) {
			return res.status(400).json({
				success: false,
				message: `Missing required fields: ${missingFields.join(', ')}`,
			});
		}

		const thread = await createNewThread(threadData);

		return res.status(201).json({
			success: true,
			message: "Thread created successfully",
			data: thread,
		});
	} catch (error) {
		if (error.name === "ValidationError" || error.name === "CastError") {
			return res.status(400).json({
				success: false,
				message: "Invalid thread data",
			});
		}

		console.log(error);
		return res.status(500).json({
			success: false,
			message: "Server error while creating thread",
		});
	}
};

export const updateThread = async (req, res) => {
	try {
		const threadData = getThreadWriteData(req.body);

		if (Object.keys(threadData).length === 0) {
			return res.status(400).json({
				success: false,
				message: "At least one thread field is required",
			});
		}

		const thread = await updateExistingThread(req.params.id, threadData);

		if (!thread) {
			return res.status(404).json({
				success: false,
				message: "Thread not found",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Thread updated successfully",
			data: thread,
		});
	} catch (error) {
		if (error.name === "ValidationError" || error.name === "CastError") {
			return res.status(400).json({
				success: false,
				message: "Invalid thread data",
			});
		}

		console.log(error);
		return res.status(500).json({
			success: false,
			message: "Server error while updating thread",
		});
	}
};

export const deleteThread = async (req, res) => {
	try {
		const thread = await deleteExistingThread(req.params.id);

		if (!thread) {
			return res.status(404).json({
				success: false,
				message: "Thread not found",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Thread deleted successfully",
			data: thread,
		});
	} catch (error) {
		if (error.name === "CastError") {
			return res.status(400).json({
				success: false,
				message: "Invalid thread ID",
			});
		}

		console.log(error);
		return res.status(500).json({
			success: false,
			message: "Server error while deleting thread",
		});
	}
};