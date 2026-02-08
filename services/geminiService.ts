/**
 * Client-side Gemini Service
 * 
 * This service provides a secure interface to the Gemini API by routing
 * all requests through Next.js API routes. The API key is never exposed
 * to the client browser.
 * 
 * Security benefits:
 * - API key stays server-side only
 * - No client-side exposure of credentials
 * - Request validation on server
 * - Rate limiting can be added at API route level
 */

import { Message, ResumeData, RoleType, ImportData, EvaluationResult } from "../types";

/**
 * Client-side chat session wrapper
 * Maintains compatibility with existing code while routing through API
 * Prevents duplicate requests and provides request cancellation
 */
export class ChatSession {
    private history: Message[];
    private roleType: RoleType;
    private importData?: ImportData;
    private initialData?: ResumeData;
    private currentRequest: AbortController | null = null;
    private isProcessing: boolean = false;

    constructor(
        roleType: RoleType,
        importData?: ImportData,
        history?: Message[],
        initialData?: ResumeData
    ) {
        this.history = history || [];
        this.roleType = roleType;
        this.importData = importData;
        this.initialData = initialData;
    }

    async sendMessage(message: string): Promise<{ text: string; phase?: 'overview' | 'confirmation' | 'detail' | 'general' }> {
        // Prevent concurrent requests to save tokens
        if (this.isProcessing) {
            throw new Error('A request is already in progress. Please wait.');
        }

        this.isProcessing = true;
        this.currentRequest = new AbortController();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'sendMessage',
                    message,
                    history: this.history,
                    roleType: this.roleType,
                    importData: this.importData,
                    initialData: this.initialData,
                }),
                signal: this.currentRequest.signal,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send message');
            }

            const data = await response.json();

            // Update local history
            this.history.push({ role: 'user', text: message });
            this.history.push({ role: 'model', text: data.text, phase: data.phase });

            return { text: data.text, phase: data.phase };
        } finally {
            this.isProcessing = false;
            this.currentRequest = null;
        }
    }

    async generateHint(): Promise<string> {
        // Prevent concurrent requests to save tokens
        if (this.isProcessing) {
            throw new Error('A request is already in progress. Please wait.');
        }

        this.isProcessing = true;
        this.currentRequest = new AbortController();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'generateHint',
                    history: this.history,
                    roleType: this.roleType,
                    importData: this.importData,
                    initialData: this.initialData,
                }),
                signal: this.currentRequest.signal,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate hint');
            }

            const data = await response.json();
            return data.hint;
        } finally {
            this.isProcessing = false;
            this.currentRequest = null;
        }
    }

    /**
     * Cancel the current in-flight request
     */
    cancelCurrentRequest(): void {
        if (this.currentRequest) {
            this.currentRequest.abort();
            this.currentRequest = null;
            this.isProcessing = false;
        }
    }

    /**
     * Check if a request is currently in progress
     */
    isRequestInProgress(): boolean {
        return this.isProcessing;
    }
}

/**
 * Create a new chat session
 * @param roleType - The role type for the resume (consultant, senior_engineer, general)
 * @param importData - Optional imported resume data
 * @param history - Optional conversation history
 * @param initialData - Optional initial resume data
 */
export const createChat = (
    roleType: RoleType,
    importData?: ImportData,
    history?: Message[],
    initialData?: ResumeData
): ChatSession => {
    return new ChatSession(roleType, importData, history, initialData);
};

/**
 * Generate a helpful hint for the user
 * @param chat - The active chat session
 */
export const generateHint = async (chat: ChatSession): Promise<string> => {
    return await chat.generateHint();
};

/**
 * Parse resume data from conversation history
 * @param history - Array of conversation messages
 * @param importData - Optional imported resume data
 */
export const parseResumeFromChat = async (
    history: Message[],
    importData?: ImportData
): Promise<ResumeData> => {
    const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            history,
            importData,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse resume');
    }

    const result = await response.json();
    return result.data;
};

/**
 * Analyze imported resume text
 * @param text - The raw text from imported resume
 */
export const analyzeImportedText = async (text: string): Promise<ImportData> => {
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'analyzeImport',
            text,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze imported text');
    }

    const result = await response.json();
    return result.data;
};

/**
 * Evaluate resume quality and provide feedback
 * @param data - The resume data to evaluate
 * @param roleType - The target role type
 */
export const evaluateResume = async (
    data: ResumeData,
    roleType: RoleType
): Promise<EvaluationResult> => {
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'evaluateResume',
            data,
            roleType,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to evaluate resume');
    }

    const result = await response.json();
    return result.data;
};
