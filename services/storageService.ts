import { Project, ResumeData, RoleType, ImportData, UserProfile, INITIAL_RESUME_DATA } from '../types';

// API configuration
const API_BASE = '/api';
const USER_ID_HEADER = 'x-user-id';

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
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
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
        if (error instanceof Error && error.message.includes('404')) {
            return undefined;
        }
        console.error('Error fetching project:', error);
        return undefined;
    }
};

export const saveProject = async (project: Project): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        // Check if project exists
        const existing = await getProject(project.id);

        if (existing) {
            // Update existing project
            await apiFetch(`/projects/${project.id}`, {
                method: 'PUT',
                body: JSON.stringify(project),
            });
        } else {
            // Create new project
            await apiFetch('/projects', {
                method: 'POST',
                body: JSON.stringify(project),
            });
        }
    } catch (error) {
        console.error('Error saving project:', error);
        throw error;
    }
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
