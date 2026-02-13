import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { UserProfileModel } from '../../../lib/models';
import { UserProfile } from '../../../types';
import { getUserId } from '../../../lib/auth-helpers';
import {
    validateUserProfile,
    sanitizeUserProfile,
    createValidationErrorResponse
} from '../../../lib/validator';

/**
 * GET /api/profile
 * Retrieves the user profile
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const userId = await getUserId(request);

        const profile = await UserProfileModel.findOne({ userId }).lean();

        if (!profile) {
            return NextResponse.json({ profile: null }, { status: 200 });
        }

        // Transform to match UserProfile interface
        const userProfile: UserProfile = {
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            linkedin: profile.linkedin
        };

        return NextResponse.json({ profile: userProfile }, { status: 200 });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/profile
 * Creates or updates the user profile
 */
export async function PUT(request: NextRequest) {
    try {
        await connectToDatabase();

        const userId = request.headers.get('x-user-id') || 'default-user';
        const body: UserProfile = await request.json();
        await getUserId(request)
        // Validate and sanitize input
        const validationErrors = validateUserProfile(body);
        if (validationErrors.length > 0) {
            return NextResponse.json(
                createValidationErrorResponse(validationErrors),
                { status: 400 }
            );
        }

        const sanitizedProfile = sanitizeUserProfile(body);

        const profile = await UserProfileModel.findOneAndUpdate(
            { userId },
            {
                userId,
                ...sanitizedProfile
            },
            {
                upsert: true,
                returnDocument: 'after',
                runValidators: true
            }
        ).lean();

        const userProfile: UserProfile = {
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            linkedin: profile.linkedin
        };

        return NextResponse.json({ profile: userProfile }, { status: 200 });
    } catch (error) {
        console.error('Error saving profile:', error);
        return NextResponse.json(
            { error: 'Failed to save profile', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
