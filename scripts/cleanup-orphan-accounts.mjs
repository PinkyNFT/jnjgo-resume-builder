/**
 * One-off cleanup: NextAuth `accounts` (and `sessions`) rows whose user no longer
 * exists. Before the fix in app/api/account/delete, deleting an account removed
 * the user but left these rows — including Google OAuth access/refresh/id tokens.
 *
 * Dry run (default, changes nothing):   node scripts/cleanup-orphan-accounts.mjs
 * Delete the orphans:                    node scripts/cleanup-orphan-accounts.mjs --apply
 *
 * Uses MONGODB_URI from the environment, or from .env.local when not set.
 * Prints counts only — never tokens, emails or ids.
 */
import fs from 'fs';
import { MongoClient } from 'mongodb';

function mongoUri() {
    if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
    const line = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find(l => l.startsWith('MONGODB_URI='));
    if (!line) throw new Error('MONGODB_URI not set and not found in .env.local');
    return line.slice('MONGODB_URI='.length).trim().replace(/^"(.*)"$/, '$1');
}

const apply = process.argv.includes('--apply');
const client = new MongoClient(mongoUri());
await client.connect();
try {
    const db = client.db();
    const userIds = new Set((await db.collection('users').find({}, { projection: { _id: 1 } }).toArray()).map(u => String(u._id)));

    for (const name of ['accounts', 'sessions']) {
        const rows = await db.collection(name).find({}, { projection: { _id: 1, userId: 1 } }).toArray();
        const orphans = rows.filter(r => !userIds.has(String(r.userId)));
        console.log(`${name}: ${rows.length} total, ${orphans.length} orphaned (user no longer exists)`);
        if (apply && orphans.length) {
            const res = await db.collection(name).deleteMany({ _id: { $in: orphans.map(o => o._id) } });
            console.log(`  deleted ${res.deletedCount}`);
        }
    }
    if (!apply) console.log('Dry run only. Re-run with --apply to delete the orphaned rows.');
} finally {
    await client.close();
}
