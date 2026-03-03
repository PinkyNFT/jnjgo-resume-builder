import NextAuth, { NextAuthOptions, DefaultSession, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./mongodb-client";
import { UserRole } from "../types";

// Extend NextAuth types to include user ID and role in session
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role?: UserRole | null;
        } & DefaultSession["user"];
    }

    interface User {
        role?: UserRole | null;
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
        strategy: "database",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
                session.user.role = (user as any).role || null;
            }
            return session;
        },
    },
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

// Export handlers for NextAuth API routes
export const handlers = { GET: handler, POST: handler };

// Export auth function for getting session in server components
export const auth = () => getServerSession(authOptions);
