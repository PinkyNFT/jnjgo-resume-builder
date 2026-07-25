import { Project, ResumeData, RoleType, ImportData, UserProfile, INITIAL_RESUME_DATA, ResumeVersion, VersionTrigger } from '../types';

// API configuration
const API_BASE = '/api';
const USER_ID_HEADER = 'x-user-id';

// Track known project IDs to avoid PUT→404→POST pattern
const knownProjectIds = new Set<string>();

// Debounced save timers per project ID
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SAVE_DEBOUNCE_MS = 800;

// Get user ID from session or localStorage as fallback
function getUserId(): string {
    if (typeof window === 'undefined') return 'anonymous';

    // Try to get from localStorage for backwards compatibility
    const localUserId = localStorage.getItem('jnjgo_user_id');
    if (localUserId) return localUserId;

    // Generate a temporary ID for non-authenticated users
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('jnjgo_user_id', tempId);
    return tempId;
}

/**
 * Generic API fetch wrapper with error handling
 */
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers = {
        'Content-Type': 'application/json',
        [USER_ID_HEADER]: getUserId(),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        const msg = error.error || response.statusText;
        throw new Error(`[${response.status}] ${msg}`);
    }

    return response.json();
}

// --- User Profile ---

export const getUserProfile = async (): Promise<UserProfile | null> => {
    if (typeof window === 'undefined') return null;
    try {
        const data = await apiFetch<{ profile: UserProfile | null }>('/profile');
        return data.profile;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        await apiFetch('/profile', {
            method: 'PUT',
            body: JSON.stringify(profile),
        });
    } catch (error) {
        console.error('Error saving profile:', error);
        throw error;
    }
};

// --- Projects ---

export const getProjects = async (): Promise<Project[]> => {
    if (typeof window === 'undefined') return [];
    try {
        const data = await apiFetch<{ projects: Project[] }>('/projects');
        // Populate known IDs to optimize save routing
        for (const p of data.projects) knownProjectIds.add(p.id);
        return data.projects;
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
};

export const getProject = async (id: string): Promise<Project | undefined> => {
    if (typeof window === 'undefined') return undefined;
    try {
        const data = await apiFetch<{ project: Project }>(`/projects/${id}`);
        return data.project;
    } catch (error) {
        // 404 is expected when project doesn't exist, don't log as error
        if (error instanceof Error && error.message.startsWith('[404]')) {
            return undefined;
        }
        console.error('Error fetching project:', error);
        return undefined;
    }
};

export const saveProject = async (project: Project): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        if (knownProjectIds.has(project.id)) {
            // Known existing project — direct PUT, no 404 fallback needed
            await apiFetch(`/projects/${project.id}`, {
                method: 'PUT',
                body: JSON.stringify(project),
            });
        } else {
            // New project — create it
            await apiFetch('/projects', {
                method: 'POST',
                body: JSON.stringify(project),
            });
            knownProjectIds.add(project.id);
        }
    } catch (error) {
        // Handle race condition: POST 409 means project exists
        if (error instanceof Error && error.message.startsWith('[409]')) {
            knownProjectIds.add(project.id);
            await apiFetch(`/projects/${project.id}`, {
                method: 'PUT',
                body: JSON.stringify(project),
            });
            return;
        }
        console.error('Error saving project:', error);
        throw error;
    }
};

/**
 * Debounced version of saveProject for auto-save scenarios.
 * Coalesces rapid saves into a single API call.
 */
export const saveProjectDebounced = (project: Project): void => {
    if (typeof window === 'undefined') return;

    const existing = saveTimers.get(project.id);
    if (existing) clearTimeout(existing);

    saveTimers.set(project.id, setTimeout(async () => {
        saveTimers.delete(project.id);
        try {
            await saveProject(project);
        } catch (error) {
            console.error('Debounced save failed:', error);
        }
    }, SAVE_DEBOUNCE_MS));
};

export const deleteProject = async (id: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        await apiFetch(`/projects/${id}`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
    }
};

export const createNewProject = (roleType: RoleType, importData?: ImportData, profile?: UserProfile): Project => {
    const initialData: ResumeData = { ...INITIAL_RESUME_DATA };

    if (profile) {
        initialData.fullName = profile.fullName;
        initialData.contactInfo = {
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            linkedin: profile.linkedin
        };
        if (profile.photo) initialData.photo = profile.photo;
    }

    return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: importData ? 'Imported Resume' : 'Untitled Resume',
        roleType,
        updatedAt: Date.now(),
        status: importData ? 'imported' : 'draft',
        history: [],
        importData,
        data: initialData
    };
};

// --- Resume Versions ---

export const getVersions = async (projectId: string): Promise<ResumeVersion[]> => {
    if (typeof window === 'undefined') return [];
    try {
        const data = await apiFetch<{ versions: ResumeVersion[] }>(`/projects/${projectId}/versions`);
        return data.versions;
    } catch (error) {
        console.error('Error fetching versions:', error);
        return [];
    }
};

export const createVersion = async (
    projectId: string,
    label: string,
    trigger: VersionTrigger,
    data: ResumeData,
    evaluation?: import('../types').EvaluationResult
): Promise<ResumeVersion | null> => {
    if (typeof window === 'undefined') return null;
    try {
        const result = await apiFetch<{ version: ResumeVersion }>(`/projects/${projectId}/versions`, {
            method: 'POST',
            body: JSON.stringify({ label, trigger, data, evaluation }),
        });
        return result.version;
    } catch (error) {
        console.error('Error creating version:', error);
        return null;
    }
};

export const deleteVersion = async (projectId: string, versionId: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        await apiFetch(`/projects/${projectId}/versions/${versionId}`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error('Error deleting version:', error);
        throw error;
    }
};

export const updateVersionLabel = async (projectId: string, versionId: string, label: string): Promise<ResumeVersion | null> => {
    if (typeof window === 'undefined') return null;
    try {
        const result = await apiFetch<{ version: ResumeVersion }>(`/projects/${projectId}/versions/${versionId}`, {
            method: 'PATCH',
            body: JSON.stringify({ label }),
        });
        return result.version;
    } catch (error) {
        console.error('Error updating version label:', error);
        return null;
    }
};
