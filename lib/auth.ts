import NextAuth, { NextAuthOptions, DefaultSession, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./mongodb-client";
import { connectToDatabase } from "./mongodb";
import { AdminUserModel, seedDefaultSettings } from "./admin-models";
import { UserRole } from "../types";

// Extend NextAuth types to include user ID, role, and admin status in session
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role?: UserRole | null;
            isAdmin?: boolean;
            adminRole?: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        role?: UserRole | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: UserRole | null;
        isAdmin?: boolean;
        adminRole?: string | null;
    }
}

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
}

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("Missing NEXTAUTH_SECRET");
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            httpOptions: {
                timeout: 15000, // 15s — default 3500ms is too short for high-latency networks
            },
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/auth/signin',
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            // Require verified email for Google (and others in the future)
            // to safely use allowDangerousEmailAccountLinking
            if (account?.provider === "google") {
                return Boolean((profile as any)?.email_verified);
            }
            return true;
        },
        async jwt({ token, user, trigger }) {
            // Initial sign in: populate token from the newly created/found user
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || null;
            }

            // Re-read role from DB on explicit session update (e.g. after role selection)
            if (trigger === 'update' && token.id) {
                const client = await clientPromise;
                const db = client.db();
                const { ObjectId } = await import('mongodb');
                try {
                    const dbUser = await db.collection('users').findOne(
                        { _id: new ObjectId(token.id as string) },
                        { projection: { role: 1 } }
                    );
                    token.role = dbUser?.role || null;
                } catch {
                    // keep existing token.role on error
                }
            }

            // Refresh admin status on sign-in or explicit session update
            if ((user || trigger === 'update') && token.id) {
                try {
                    await connectToDatabase();

                    const userEmail = (token.email as string | undefined) ?? '';
                    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) ?? [];
                    const isAdminEmail = userEmail ? adminEmails.includes(userEmail.toLowerCase()) : false;

                    // Admins come only from ADMIN_EMAILS (or scripts/bootstrap-admin.ts).
                    // Never "whoever signs in first while the admin table is empty":
                    // on a fresh database that would hand super_admin to a stranger.
                    if (isAdminEmail) {
                        const adminCount = await AdminUserModel.countDocuments();
                        // Promote this user to super_admin if not already one
                        const existingAdmin = await AdminUserModel.findOne({
                            $or: [{ userId: token.id }, { email: userEmail }],
                        });

                        if (existingAdmin) {
                            if (existingAdmin.userId !== token.id) {
                                await AdminUserModel.updateOne(
                                    { _id: existingAdmin._id },
                                    { $set: { userId: token.id } }
                                );
                            }
                            token.isAdmin = true;
                            token.adminRole = existingAdmin.role;
                        } else {
                            await AdminUserModel.create({
                                userId: token.id,
                                email: userEmail,
                                name: (token.name as string | undefined) ?? userEmail,
                                role: 'super_admin',
                                isActive: true,
                                createdBy: adminCount === 0 ? 'system_bootstrap' : 'auto_admin_emails',
                            });

                            if (adminCount === 0) {
                                await seedDefaultSettings(token.id as string);
                            }

                            token.isAdmin = true;
                            token.adminRole = 'super_admin';
                        }
                    } else {
                        // Normal lookup — fall back to email match to survive userId churn
                        let adminUser = await AdminUserModel.findOne({ userId: token.id, isActive: true }).lean();

                        if (!adminUser && userEmail) {
                            adminUser = await AdminUserModel.findOne({ email: userEmail, isActive: true }).lean();
                            if (adminUser) {
                                await AdminUserModel.updateOne(
                                    { _id: adminUser._id },
                                    { $set: { userId: token.id } }
                                );
                            }
                        }

                        token.isAdmin = !!adminUser;
                        token.adminRole = (adminUser as any)?.role ?? null;
                    }
                } catch {
                    // Keep existing value on DB error — don't blank out a valid isAdmin
                    token.isAdmin = token.isAdmin ?? false;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role ?? null;
                session.user.isAdmin = token.isAdmin ?? false;
                session.user.adminRole = token.adminRole ?? null;
            }
            return session;
        },
    },
    // Opt-in only: NextAuth debug output prints the Google client secret, state and tokens.
    debug: process.env.NEXTAUTH_DEBUG === 'true',
};

const handler = NextAuth(authOptions);

// Export handlers for NextAuth API routes
export const handlers = { GET: handler, POST: handler };

// Export auth function for getting session in server components
export const auth = () => getServerSession(authOptions);
