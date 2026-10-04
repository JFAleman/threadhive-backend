import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from './models/User.js';
import Subreddit from './models/Subreddit.js';
import Thread from './models/Thread.js';
import Vote from './models/Vote.js';

const app = express();
const api = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'development-only-secret';

app.use(express.json());

const asyncHandler = (handler) => (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
};

const isValidId = (id) => mongoose.isValidObjectId(id);

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});

const tokenFor = (user) => jwt.sign({ userId: user._id.toString() }, jwtSecret, { expiresIn: '15m' });
const refreshTokenFor = (user) => jwt.sign({ userId: user._id.toString(), type: 'refresh' }, jwtSecret, { expiresIn: '7d' });

const authenticate = asyncHandler(async (request, response, next) => {
    const header = request.get('authorization');
    if (!header?.startsWith('Bearer ')) {
        return response.status(401).json({ error: { message: 'Authentication required' } });
    }

    try {
        const payload = jwt.verify(header.slice(7), jwtSecret);
        const user = await User.findById(payload.userId);
        if (!user) {
            return response.status(401).json({ error: { message: 'User no longer exists' } });
        }
        request.user = user;
        next();
    } catch {
        response.status(401).json({ error: { message: 'Invalid or expired token' } });
    }
});

const requireObjectId = (request, response, next) => {
    const ids = Object.values(request.params);
    if (ids.some((id) => !isValidId(id))) {
        return response.status(400).json({ error: { message: 'Invalid resource ID' } });
    }
    next();
};

const pagination = (request) => {
    const page = Math.max(Number.parseInt(request.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 20, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
};

const listResponse = (data, page, limit, total) => ({
    data,
    meta: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total
    }
});

const sortFor = (sort) => ({
    new: { createdAt: -1, _id: -1 },
    old: { createdAt: 1, _id: 1 },
    top: { voteCount: -1, createdAt: -1, _id: -1 }
}[sort] || { createdAt: -1, _id: -1 });

api.get('/health', (request, response) => response.json({ data: { status: 'ok' } }));

api.post('/auth/register', asyncHandler(async (request, response) => {
    const { name, email, password } = request.body;
    if (!name || !email || !password || password.length < 8) {
        return response.status(422).json({ error: { message: 'Name, email, and a password of at least 8 characters are required' } });
    }

    try {
        const user = await User.create({ name, email: email.toLowerCase().trim(), password });
        response.status(201).json({ data: { user: publicUser(user), accessToken: tokenFor(user), refreshToken: refreshTokenFor(user) } });
    } catch (error) {
        if (error.code === 11000) {
            return response.status(409).json({ error: { message: 'Email is already registered' } });
        }
        throw error;
    }
}));

api.post('/auth/login', asyncHandler(async (request, response) => {
    const email = request.body.email?.toLowerCase().trim();
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(request.body.password || ''))) {
        return response.status(401).json({ error: { message: 'Invalid email or password' } });
    }
    response.json({ data: { user: publicUser(user), accessToken: tokenFor(user), refreshToken: refreshTokenFor(user) } });
}));

api.post('/auth/refresh', asyncHandler(async (request, response) => {
    try {
        const payload = jwt.verify(request.body.refreshToken, jwtSecret);
        if (payload.type !== 'refresh') throw new Error('Invalid token type');
        const user = await User.findById(payload.userId);
        if (!user) return response.status(401).json({ error: { message: 'User no longer exists' } });
        response.json({ data: { accessToken: tokenFor(user), refreshToken: refreshTokenFor(user) } });
    } catch {
        response.status(401).json({ error: { message: 'Invalid or expired refresh token' } });
    }
}));

api.post('/auth/logout', authenticate, (request, response) => response.status(204).send());

api.get('/auth/me', authenticate, (request, response) => response.json({ data: publicUser(request.user) }));

api.get('/users/:userId', requireObjectId, asyncHandler(async (request, response) => {
    const user = await User.findById(request.params.userId);
    if (!user) return response.status(404).json({ error: { message: 'User not found' } });
    response.json({ data: publicUser(user) });
}));

api.patch('/users/:userId', authenticate, requireObjectId, asyncHandler(async (request, response) => {
    if (request.user._id.toString() !== request.params.userId) {
        return response.status(403).json({ error: { message: 'Only the account owner can update this profile' } });
    }
    const updates = {};
    if (request.body.name) updates.name = request.body.name;
    if (request.body.password) updates.password = request.body.password;
    const user = await User.findById(request.params.userId).select('+password');
    if (!user) return response.status(404).json({ error: { message: 'User not found' } });
    Object.assign(user, updates);
    await user.save();
    response.json({ data: publicUser(user) });
}));

api.post('/subreddits', authenticate, asyncHandler(async (request, response) => {
    const { name, description } = request.body;
    if (!name?.trim()) return response.status(422).json({ error: { message: 'Name is required' } });
    try {
        const subreddit = await Subreddit.create({ name: name.trim(), description, author: request.user._id });
        response.status(201).json({ data: await subreddit.populate('author', 'name') });
    } catch (error) {
        if (error.code === 11000) return response.status(409).json({ error: { message: 'Subreddit name already exists' } });
        throw error;
    }
}));

api.get('/subreddits', asyncHandler(async (request, response) => {
    const { page, limit, skip } = pagination(request);
    const filter = request.query.search ? { name: { $regex: request.query.search, $options: 'i' } } : {};
    const [data, total] = await Promise.all([
        Subreddit.find(filter).populate('author', 'name').sort({ name: 1 }).skip(skip).limit(limit),
        Subreddit.countDocuments(filter)
    ]);
    response.json(listResponse(data, page, limit, total));
}));

api.get('/subreddits/:subredditId', asyncHandler(async (request, response) => {
    const filter = isValidId(request.params.subredditId)
        ? { _id: request.params.subredditId }
        : { name: request.params.subredditId };
    const subreddit = await Subreddit.findOne(filter).populate('author', 'name');
    if (!subreddit) return response.status(404).json({ error: { message: 'Subreddit not found' } });
    response.json({ data: subreddit });
}));

api.patch('/subreddits/:subredditId', authenticate, requireObjectId, asyncHandler(async (request, response) => {
    const subreddit = await Subreddit.findById(request.params.subredditId);
    if (!subreddit) return response.status(404).json({ error: { message: 'Subreddit not found' } });
    if (subreddit.author.toString() !== request.user._id.toString()) return response.status(403).json({ error: { message: 'Only the subreddit owner can update it' } });
    if (request.body.name) subreddit.name = request.body.name.trim();
    if (request.body.description !== undefined) subreddit.description = request.body.description;
    await subreddit.save();
    response.json({ data: await subreddit.populate('author', 'name') });
}));

api.delete('/subreddits/:subredditId', authenticate, requireObjectId, asyncHandler(async (request, response) => {
    const subreddit = await Subreddit.findById(request.params.subredditId);
    if (!subreddit) return response.status(404).json({ error: { message: 'Subreddit not found' } });
    if (subreddit.author.toString() !== request.user._id.toString()) return response.status(403).json({ error: { message: 'Only the subreddit owner can delete it' } });
    await Thread.deleteMany({ subreddit: subreddit._id });
    await subreddit.deleteOne();
    response.status(204).send();
}));

const threadFilter = (request) => {
    const filter = {};
    if (request.query.subredditId) filter.subreddit = request.query.subredditId;
    if (request.query.authorId) filter.author = request.query.authorId;
    if (request.query.search) filter.$text = { $search: request.query.search };
    return filter;
};

api.post('/threads', authenticate, asyncHandler(async (request, response) => {
    const { title, content, subredditId } = request.body;
    if (!title?.trim() || !content?.trim() || !isValidId(subredditId)) {
        return response.status(422).json({ error: { message: 'Title, content, and a valid subredditId are required' } });
    }
    if (!await Subreddit.exists({ _id: subredditId })) return response.status(404).json({ error: { message: 'Subreddit not found' } });
    const thread = await Thread.create({ title: title.trim(), content: content.trim(), author: request.user._id, subreddit: subredditId });
    response.status(201).json({ data: await thread.populate([{ path: 'author', select: 'name' }, { path: 'subreddit', select: 'name' }]) });
}));

api.get('/threads', asyncHandler(async (request, response) => {
    const { page, limit, skip } = pagination(request);
    const filter = threadFilter(request);
    if (filter.subreddit && !isValidId(filter.subreddit)) return response.status(400).json({ error: { message: 'Invalid subredditId' } });
    if (filter.author && !isValidId(filter.author)) return response.status(400).json({ error: { message: 'Invalid authorId' } });
    const [data, total] = await Promise.all([
        Thread.find(filter).populate([{ path: 'author', select: 'name' }, { path: 'subreddit', select: 'name' }]).sort(sortFor(request.query.sort)).skip(skip).limit(limit),
        Thread.countDocuments(filter)
    ]);
    response.json(listResponse(data, page, limit, total));
}));

api.get('/subreddits/:subredditId/threads', asyncHandler(async (request, response) => {
    if (!isValidId(request.params.subredditId)) return response.status(400).json({ error: { message: 'Invalid subreddit ID' } });
    request.query.subredditId = request.params.subredditId;
    const { page, limit, skip } = pagination(request);
    const filter = { subreddit: request.params.subredditId };
    const [data, total] = await Promise.all([
        Thread.find(filter).populate([{ path: 'author', select: 'name' }, { path: 'subreddit', select: 'name' }]).sort(sortFor(request.query.sort)).skip(skip).limit(limit),
        Thread.countDocuments(filter)
    ]);
    response.json(listResponse(data, page, limit, total));
}));

api.get('/threads/:threadId', requireObjectId, asyncHandler(async (request, response) => {
    const thread = await Thread.findById(request.params.threadId).populate([{ path: 'author', select: 'name' }, { path: 'subreddit', select: 'name' }]);
    if (!thread) return response.status(404).json({ error: { message: 'Thread not found' } });
    response.json({ data: thread });
}));

api.patch('/threads/:threadId', authenticate, requireObjectId, asyncHandler(async (request, response) => {
    const thread = await Thread.findById(request.params.threadId);
    if (!thread) return response.status(404).json({ error: { message: 'Thread not found' } });
    if (thread.author.toString() !== request.user._id.toString()) return response.status(403).json({ error: { message: 'Only the thread author can update it' } });
    if (request.body.title) thread.title = request.body.title.trim();
    if (request.body.content) thread.content = request.body.content.trim();
    await thread.save();
    response.json({ data: await thread.populate([{ path: 'author', select: 'name' }, { path: 'subreddit', select: 'name' }]) });
}));

api.delete('/threads/:threadId', authenticate, requireObjectId, asyncHandler(async (request, response) => {
    const thread = await Thread.findById(request.params.threadId);
    if (!thread) return response.status(404).json({ error: { message: 'Thread not found' } });
    if (thread.author.toString() !== request.user._id.toString()) return response.status(403).json({ error: { message: 'Only the thread author can delete it' } });
    await Vote.deleteMany({ thread: thread._id });
    await thread.deleteOne();
    response.status(204).send();
}));

api.put('/threads/:threadId/vote', authenticate, requireObjectId, asyncHandler(async (request, response) => {
    const value = Number(request.body.value);
    if (![1, -1].includes(value)) return response.status(422).json({ error: { message: 'Vote value must be 1 or -1' } });
    const thread = await Thread.findById(request.params.threadId);
    if (!thread) return response.status(404).json({ error: { message: 'Thread not found' } });
    const previousVote = await Vote.findOne({ user: request.user._id, thread: thread._id });
    if (previousVote?.value !== value) {
        if (previousVote?.value === 1) thread.upvotes -= 1;
        if (previousVote?.value === -1) thread.downvotes -= 1;
        if (value === 1) thread.upvotes += 1;
        if (value === -1) thread.downvotes += 1;
        thread.voteCount = thread.upvotes - thread.downvotes;
        await thread.save();
    }
    await Vote.findOneAndUpdate({ user: request.user._id, thread: thread._id }, { value }, { upsert: true, new: true, setDefaultsOnInsert: true });
    response.json({ data: { threadId: thread._id, userVote: value, upvotes: thread.upvotes, downvotes: thread.downvotes, score: thread.voteCount } });
}));

api.get('/threads/:threadId/vote', authenticate, requireObjectId, asyncHandler(async (request, response) => {
    const vote = await Vote.findOne({ user: request.user._id, thread: request.params.threadId });
    response.json({ data: { threadId: request.params.threadId, userVote: vote?.value || null } });
}));

api.delete('/threads/:threadId/vote', authenticate, requireObjectId, asyncHandler(async (request, response) => {
    const thread = await Thread.findById(request.params.threadId);
    const vote = thread && await Vote.findOneAndDelete({ user: request.user._id, thread: thread._id });
    if (!thread) return response.status(404).json({ error: { message: 'Thread not found' } });
    if (vote) {
        if (vote.value === 1) thread.upvotes -= 1;
        if (vote.value === -1) thread.downvotes -= 1;
        thread.voteCount = thread.upvotes - thread.downvotes;
        await thread.save();
    }
    response.json({ data: { threadId: thread._id, userVote: null, upvotes: thread.upvotes, downvotes: thread.downvotes, score: thread.voteCount } });
}));

app.use('/api/v1', api);
app.use((request, response) => response.status(404).json({ error: { message: 'Route not found' } }));
app.use((error, request, response, next) => {
    if (error.name === 'ValidationError') return response.status(422).json({ error: { message: error.message } });
    console.error(error);
    response.status(500).json({ error: { message: 'Internal server error' } });
});

export default app;
