import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
};

function createClientPromise(): Promise<MongoClient> {
    const client = new MongoClient(uri, options);
    return client.connect().catch((error) => {
        console.error('❌ MongoDB client connection error:', error.message);
        // Clear the cached promise so the next attempt retries
        if (process.env.NODE_ENV === 'development') {
            const g = global as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
            delete g._mongoClientPromise;
        }
        throw error;
    });
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        globalWithMongo._mongoClientPromise = createClientPromise();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    clientPromise = createClientPromise();
}

export default clientPromise;
