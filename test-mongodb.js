// Quick MongoDB connection test
const fs = require('fs')
const { MongoClient } = require('mongodb')

// Read .env.local file
const envFile = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envFile.split(/\r?\n/).forEach(line => {
    line = line.trim()
    if (line && !line.startsWith('#')) {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim()
            envVars[key] = value
        }
    }
})

console.log('Found env variables:', Object.keys(envVars).join(', '))

async function testConnection() {
    const uri = envVars.MONGODB_URI

    if (!uri) {
        console.error('❌ MONGODB_URI not found in .env.local')
        console.error('Available keys:', Object.keys(envVars))
        return
    }

    console.log('\nTesting MongoDB connection...')
    console.log('URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')) // Hide credentials

    const client = new MongoClient(uri)

    try {
        console.log('Connecting...')
        await client.connect()
        console.log('✅ MongoDB connection successful!')

        // List databases
        const dbs = await client.db().admin().listDatabases()
        console.log('Available databases:', dbs.databases.map(db => db.name).join(', '))

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message)
        console.error('\nCommon solutions:')
        console.error('1. Add your IP address to MongoDB Atlas Network Access')
        console.error('2. Check if connection string is correct')
        console.error('3. Verify username/password are correct')
    } finally {
        await client.close()
    }
}

testConnection()
