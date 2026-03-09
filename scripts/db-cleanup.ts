import { MongoClient } from 'mongodb';

// Load environment variables via --env-file flag
const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('Missing MONGODB_URI in environment variables');
    process.exit(1);
}

async function main() {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri as string);

    try {
        await client.connect();
        console.log('Connected to MongoDB.\n');

        // 1. Drop `exportevents` collection in `jnjgo-resume-dev` database
        const mainDb = client.db('jnjgo-resume-dev');
        console.log('Checking for exportevents collection in jnjgo-resume-dev...');
        const collections = await mainDb.listCollections({ name: 'exportevents' }).toArray();
        if (collections.length > 0) {
            console.log('Found exportevents collection. Dropping...');
            await mainDb.collection('exportevents').drop();
            console.log('Successfully dropped exportevents collection.');
        } else {
            console.log('exportevents collection not found. Skipping.');
        }

        // 2. Drop `test` database
        console.log('\nChecking test database...');
        const testDb = client.db('test');
        await testDb.dropDatabase();
        console.log('Successfully dropped test database.');

        // 3. Drop `sample_mflix` database
        console.log('\nChecking sample_mflix database...');
        const mflixDb = client.db('sample_mflix');
        await mflixDb.dropDatabase();
        console.log('Successfully dropped sample_mflix database.');

        console.log('\nDatabase cleanup completed successfully.');
    } catch (error) {
        console.error('Error during database cleanup:', error);
    } finally {
        await client.close();
        console.log('MongoDB connection closed.');
    }
}

main();
