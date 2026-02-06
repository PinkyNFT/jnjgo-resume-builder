import { Project, Message, ResumeData, RoleType, ImportData, UserProfile, INITIAL_RESUME_DATA } from '../types';

const STORAGE_KEY = 'jnjgo_projects_v2';
const PROFILE_KEY = 'jnjgo_user_profile';

// --- User Profile ---

export const getUserProfile = (): UserProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
        const data = localStorage.getItem(PROFILE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
};

export const saveUserProfile = (profile: UserProfile): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

// --- Projects ---

export const getProjects = (): Project[] => {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

export const getProject = (id: string): Project | undefined => {
    const projects = getProjects();
    return projects.find(p => p.id === id);
};

export const saveProject = (project: Project): void => {
    if (typeof window === 'undefined') return;
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
        projects[index] = project;
    } else {
        projects.push(project);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const deleteProject = (id: string): void => {
    if (typeof window === 'undefined') return;
    const projects = getProjects().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
