import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/reddit-style-api';

try {
    await mongoose.connect(mongoUri);
    app.listen(port, () => {
        console.log(`API listening on port ${port}`);
    });
} catch (error) {
    console.error('Unable to connect to MongoDB:', error.message);
    process.exit(1);
}
