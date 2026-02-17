import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { AdminUserModel, seedDefaultSettings } from '@/lib/admin-models';

/**
 * GET /api/admin/check
 * Checks if current user is an admin. Used by the UI to show/hide admin links.
 * Also handles first-run bootstrap: if no admins exist, the first authenticated
 * user to hit this endpoint becomes super_admin.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ isAdmin: false }, { status: 200 });
        }

        await connectToDatabase();

        // Check if user email is in ADMIN_EMAILS env var
        const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
        const userEmailLower = session.user.email.toLowerCase();
        const isAdminEmail = adminEmails.includes(userEmailLower);

        // Bootstrap scenarios:
        // 1. If no admins exist at all, promote this user to super_admin
        // 2. If user email is in ADMIN_EMAILS, promote them to super_admin
        const adminCount = await AdminUserModel.countDocuments();
        
        if (adminCount === 0 || (isAdminEmail && adminCount > 0)) {
            const existingAdmin = await AdminUserModel.findOne({ userId: session.user.id });
            
            if (!existingAdmin) {
                await AdminUserModel.create({
                    userId: session.user.id,
                    email: session.user.email,
                    name: session.user.name || session.user.email,
                    role: 'super_admin',
                    isActive: true,
                    createdBy: adminCount === 0 ? 'system_bootstrap' : 'auto_admin_emails'
                });

                // Seed default settings if this is the first admin
                if (adminCount === 0) {
                    await seedDefaultSettings(session.user.id);
                }

                return NextResponse.json({
                    isAdmin: true,
                    role: 'super_admin',
                    bootstrapped: adminCount === 0,
                    autoPromoted: adminCount > 0 && isAdminEmail
                }, { status: 200 });
            }
        }

        const adminUser = await AdminUserModel.findOne({
            userId: session.user.id,
            isActive: true
        }).lean();

        if (!adminUser) {
            return NextResponse.json({ isAdmin: false }, { status: 200 });
        }

        return NextResponse.json({
            isAdmin: true,
            role: adminUser.role
        }, { status: 200 });
    } catch (error) {
        console.error('Error checking admin status:', error);
        return NextResponse.json({ isAdmin: false }, { status: 200 });
    }
}
