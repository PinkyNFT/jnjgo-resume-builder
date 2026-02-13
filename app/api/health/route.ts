import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import mongoose from 'mongoose';

/**
 * GET /api/health
 * Health check endpoint for monitoring application and database status
 */
export async function GET(request: NextRequest) {
    const healthCheck = {
        status: 'unknown',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
            connected: false,
            state: 'unknown',
            message: ''
        },
        environment: process.env.NODE_ENV || 'development'
    };

    try {
        // Check if MONGODB_URI is configured
        if (!process.env.MONGODB_URI) {
            healthCheck.status = 'error';
            healthCheck.database.message = 'MONGODB_URI not configured';
            return NextResponse.json(healthCheck, { status: 503 });
        }

        // Attempt database connection
        await connectToDatabase();

        // Check connection state
        const readyState = mongoose.connection.readyState;
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        healthCheck.database.state = states[readyState] || 'unknown';
        healthCheck.database.connected = readyState === 1;

        if (healthCheck.database.connected) {
            healthCheck.status = 'healthy';
            healthCheck.database.message = 'Database connection established';
            return NextResponse.json(healthCheck, { status: 200 });
        } else {
            healthCheck.status = 'degraded';
            healthCheck.database.message = `Database state: ${healthCheck.database.state}`;
            return NextResponse.json(healthCheck, { status: 503 });
        }
    } catch (error) {
        healthCheck.status = 'error';
        healthCheck.database.connected = false;
        healthCheck.database.message = error instanceof Error ? error.message : 'Unknown error';

        console.error('Health check failed:', error);
        return NextResponse.json(healthCheck, { status: 503 });
    }
}
