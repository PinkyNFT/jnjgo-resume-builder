/**
 * Data Migration Utility
 * 
 * This utility helps migrate existing data from localStorage to MongoDB.
 * It should be run once to transfer existing user data to the database.
 * 
 * @module utils/dataMigration
 */

import { Project, UserProfile } from '../types';

const LEGACY_STORAGE_KEY = 'jnjgo_projects_v2';
const LEGACY_PROFILE_KEY = 'jnjgo_user_profile';
const MIGRATION_STATUS_KEY = 'jnjgo_migration_completed';

export interface MigrationResult {
    success: boolean;
    projectsMigrated: number;
    profileMigrated: boolean;
    errors: string[];
}

/**
 * Check if migration has already been completed
 */
export function isMigrationCompleted(): boolean {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(MIGRATION_STATUS_KEY) === 'true';
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MIGRATION_STATUS_KEY, 'true');
}

/**
 * Get legacy data from localStorage
 */
function getLegacyProjects(): Project[] {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(LEGACY_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading legacy projects:', error);
        return [];
    }
}

/**
 * Get legacy user profile from localStorage
 */
function getLegacyProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
        const data = localStorage.getItem(LEGACY_PROFILE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error reading legacy profile:', error);
        return null;
    }
}

/**
 * Migrate a single project to the database
 */
async function migrateProject(project: Project): Promise<boolean> {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'default-user',
            },
            body: JSON.stringify(project),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Failed to migrate project:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error migrating project:', error);
        return false;
    }
}

/**
 * Migrate user profile to the database
 */
async function migrateProfile(profile: UserProfile): Promise<boolean> {
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'default-user',
            },
            body: JSON.stringify(profile),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Failed to migrate profile:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error migrating profile:', error);
        return false;
    }
}

/**
 * Perform the migration from localStorage to MongoDB
 * 
 * @returns Migration result with success status and details
 */
export async function migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: false,
        projectsMigrated: 0,
        profileMigrated: false,
        errors: [],
    };

    // Skip if already migrated
    if (isMigrationCompleted()) {
        console.log('Migration already completed, skipping...');
        result.success = true;
        return result;
    }

    try {
        // Migrate profile
        const legacyProfile = getLegacyProfile();
        if (legacyProfile) {
            const profileSuccess = await migrateProfile(legacyProfile);
            if (profileSuccess) {
                result.profileMigrated = true;
                console.log('✅ User profile migrated successfully');
            } else {
                result.errors.push('Failed to migrate user profile');
            }
        }

        // Migrate projects
        const legacyProjects = getLegacyProjects();
        console.log(`Found ${legacyProjects.length} projects to migrate`);

        for (const project of legacyProjects) {
            const success = await migrateProject(project);
            if (success) {
                result.projectsMigrated++;
                console.log(`✅ Migrated project: ${project.title}`);
            } else {
                result.errors.push(`Failed to migrate project: ${project.title}`);
            }
        }

        // Consider migration successful if we processed all items (even if some failed)
        result.success = true;

        // Mark migration as completed
        markMigrationCompleted();

        console.log('Migration completed:', result);
        return result;
    } catch (error) {
        console.error('Migration failed:', error);
        result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        return result;
    }
}

/**
 * Clear legacy localStorage data (call after successful migration and verification)
 * ⚠️ WARNING: This will permanently delete data from localStorage
 */
export function clearLegacyData(): void {
    if (typeof window === 'undefined') return;

    if (!isMigrationCompleted()) {
        console.warn('Migration not completed. Skipping legacy data cleanup.');
        return;
    }

    try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        localStorage.removeItem(LEGACY_PROFILE_KEY);
        console.log('✅ Legacy localStorage data cleared');
    } catch (error) {
        console.error('Error clearing legacy data:', error);
    }
}

/**
 * Reset migration status (useful for testing)
 * ⚠️ WARNING: Only use this for testing purposes
 */
export function resetMigrationStatus(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(MIGRATION_STATUS_KEY);
    console.log('Migration status reset');
}
