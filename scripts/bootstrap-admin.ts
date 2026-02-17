/**
 * Bootstrap Script: Create Initial Super Admin
 * 
 * Usage: 
 * 1. Set your email in this script
 * 2. Run: npx tsx scripts/bootstrap-admin.ts
 * 
 * This creates a super_admin user in the adminUsers collection.
 * You must have already signed in at least once with Google OAuth so your user exists.
 */

import mongoose from 'mongoose';
import { AdminUserModel, seedDefaultSettings } from '../lib/admin-models';

const ADMIN_EMAIL = 'fedevmehdi@gmail.com'; // Change this to your email

async function bootstrapAdmin() {
    try {
        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not set in environment');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if any admins already exist
        const existingAdminCount = await AdminUserModel.countDocuments();
        if (existingAdminCount > 0) {
            console.log(`⚠️  ${existingAdminCount} admin(s) already exist. Skipping bootstrap.`);
            console.log('If you want to add another admin, use the admin dashboard UI.');
            await mongoose.disconnect();
            return;
        }

        // Find the user by email in the NextAuth users collection
        // Note: We need to find the userId from NextAuth's user record
        const usersCollection = mongoose.connection.collection('users');
        const user = await usersCollection.findOne({ email: ADMIN_EMAIL });

        if (!user) {
            console.error(`❌ No user found with email: ${ADMIN_EMAIL}`);
            console.log('👉 Make sure you sign in with Google OAuth at least once first!');
            await mongoose.disconnect();
            return;
        }

        const userId = user._id.toString();

        // Create the admin user record
        await AdminUserModel.create({
            userId,
            email: ADMIN_EMAIL,
            name: user.name || ADMIN_EMAIL,
            role: 'super_admin',
            isActive: true,
            createdBy: 'bootstrap_script'
        });

        console.log(`✅ Successfully created super_admin for: ${ADMIN_EMAIL}`);

        // Seed default settings
        await seedDefaultSettings(userId);
        console.log('✅ Seeded default admin settings');

        console.log('\n🎉 Bootstrap complete! You can now access /admin');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Bootstrap failed:', error);
        process.exit(1);
    }
}

bootstrapAdmin();
