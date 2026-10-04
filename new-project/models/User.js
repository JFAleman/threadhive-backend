import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String,
        required: true,
        select: false
    }
}, {
    timestamps: true 
});

UserSchema.pre('save', async function hashPassword(next) {
    if (!this.isModified('password')) {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

UserSchema.methods.comparePassword = function comparePassword(password) {
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', UserSchema);

export default User;
