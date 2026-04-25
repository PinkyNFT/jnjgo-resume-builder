import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const MONGODB_URI: string = process.env.MONGODB_URI;

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
    global.mongoose = cached;
}

const MONGOOSE_OPTS: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
    compressors: ['zstd', 'snappy', 'zlib'],
};

/**
 * Establishes a connection to MongoDB using Mongoose.
 * Uses a global singleton with connection pooling to prevent
 * connection storms during hot reloads and serverless cold starts.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
    // Fast path: return existing connection without awaiting
    if (cached.conn && cached.conn.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, MONGOOSE_OPTS).then((m) => {
            console.log('✅ MongoDB connected successfully');

            // Register connection event handlers once
            m.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });
            m.connection.on('disconnected', () => {
                console.warn('MongoDB disconnected, will reconnect on next request');
                cached.conn = null;
                cached.promise = null;
            });

            return m;
        }).catch((error) => {
            console.error('❌ MongoDB connection error:', error);
            cached.promise = null;
            // Tag so API routes can distinguish DB outages from other errors
            if (error instanceof Error) (error as any).code = 'DB_UNAVAILABLE';
            throw error;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

/**
 * Gracefully closes the MongoDB connection.
 * Used for cleanup in testing or shutdown scenarios.
 */
export async function disconnectFromDatabase(): Promise<void> {
    if (cached.conn) {
        await cached.conn.disconnect();
        cached.conn = null;
        cached.promise = null;
        console.log('MongoDB disconnected');
    }
}
