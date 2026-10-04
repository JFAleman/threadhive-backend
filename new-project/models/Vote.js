import mongoose from 'mongoose';

const VoteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    thread: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Thread',
        required: true
    },
    value: {
        type: Number,
        enum: [-1, 1],
        required: true
    }
}, { timestamps: true });

VoteSchema.index({ user: 1, thread: 1 }, { unique: true });

const Vote = mongoose.model('Vote', VoteSchema);

export default Vote;