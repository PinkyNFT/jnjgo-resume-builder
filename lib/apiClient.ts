/**
 * API Client Configuration and Utilities
 * 
 * This module provides centralized API client configuration for the resume builder application.
 * It handles authentication headers, error handling, and request/response transformations.
 * 
 * Features:
 * - Type-safe API requests
 * - Centralized error handling
 * - Authentication header management
 * - Request/Response interceptors
 * - Automatic retry logic for failed requests
 * 
 * @module lib/apiClient
 */

export interface ApiError {
    message: string;
    status: number;
    details?: any;
}

export class ApiRequestError extends Error implements ApiError {
    status: number;
    details?: any;

    constructor(message: string, status: number, details?: any) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.details = details;
    }
}

export interface ApiClientConfig {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
}

export class ApiClient {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;
    private timeout: number;
    private retries: number;
    // In-flight request deduplication for GET requests
    private inflightRequests = new Map<string, Promise<unknown>>();

    constructor(config: ApiClientConfig = {}) {
        this.baseUrl = config.baseUrl || '/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...config.headers,
        };
        this.timeout = config.timeout || 30000;
        this.retries = config.retries || 1;
    }

    /**
     * Set authentication token for subsequent requests
     * @param token - JWT or session token
     */
    setAuthToken(token: string): void {
        this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    /**
     * Set user ID header for multi-tenant applications
     * @param userId - User identifier
     */
    setUserId(userId: string): void {
        this.defaultHeaders['x-user-id'] = userId;
    }

    /**
     * Generic fetch wrapper with error handling and retries
     */
    private async fetchWithRetry<T>(
        endpoint: string,
        options: RequestInit = {},
        attempt: number = 1
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            ...this.defaultHeaders,
            ...options.headers,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Handle non-OK responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: `HTTP ${response.status}: ${response.statusText}`,
                }));

                throw new ApiRequestError(
                    errorData.error || 'Request failed',
                    response.status,
                    errorData.details
                );
            }

            // Parse response
            const data = await response.json();
            return data as T;
        } catch (error) {
            clearTimeout(timeoutId);

            // Retry logic for network errors
            if (
                attempt < this.retries &&
                (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError'))
            ) {
                console.warn(`Request failed, retrying (${attempt}/${this.retries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                return this.fetchWithRetry<T>(endpoint, options, attempt + 1);
            }

            // Re-throw ApiRequestError as-is
            if (error instanceof ApiRequestError) {
                throw error;
            }

            // Wrap other errors
            throw new ApiRequestError(
                error instanceof Error ? error.message : 'Unknown error occurred',
                0,
                error
            );
        }
    }

    /**
     * GET request with in-flight deduplication.
     * Concurrent identical GET requests share a single network call.
     */
    async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const cacheKey = `GET:${endpoint}`;
        const existing = this.inflightRequests.get(cacheKey);
        if (existing) {
            return existing as Promise<T>;
        }

        const promise = this.fetchWithRetry<T>(endpoint, {
            ...options,
            method: 'GET',
        }).finally(() => {
            this.inflightRequests.delete(cacheKey);
        });

        this.inflightRequests.set(cacheKey, promise);
        return promise;
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.fetchWithRetry<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.fetchWithRetry<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.fetchWithRetry<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.fetchWithRetry<T>(endpoint, {
            ...options,
            method: 'DELETE',
        });
    }
}

/**
 * Default API client instance
 * Can be configured globally for the entire application
 */
export const apiClient = new ApiClient({
    baseUrl: '/api',
    retries: 2,
    timeout: 30000,
});

/**
 * Utility function to handle API errors in components
 * @param error - Error object from API call
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof ApiRequestError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
}
