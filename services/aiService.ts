
import { GoogleGenAI } from "@google/genai";

const API_KEY_LOCAL_STORAGE_KEY = 'gemini-api-key';

let aiClient: GoogleGenAI | null = null;

/**
 * Retrieves the API key from local storage.
 * @returns The API key string or null if not found.
 */
export const getApiKey = (): string | null => {
    if (typeof window !== 'undefined') {
        return window.localStorage.getItem(API_KEY_LOCAL_STORAGE_KEY);
    }
    return null;
};

/**
 * Stores the API key in local storage.
 * @param key The API key to store.
 */
export const setApiKey = (key: string): void => {
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(API_KEY_LOCAL_STORAGE_KEY, key);
        // Reset the client instance so it gets re-initialized with the new key
        aiClient = null;
    }
};

/**
 * Removes the API key from local storage.
 */
export const clearApiKey = (): void => {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(API_KEY_LOCAL_STORAGE_KEY);
        aiClient = null;
    }
};

/**
 * Gets a singleton instance of the GoogleGenAI client.
 * Initializes the client if it hasn't been already and an API key is available.
 * @returns An instance of GoogleGenAI or null if the API key is not set.
 */
export const getAiClient = (): GoogleGenAI | null => {
    if (aiClient) {
        return aiClient;
    }

    const apiKey = getApiKey();
    if (apiKey) {
        try {
            aiClient = new GoogleGenAI({ apiKey });
            return aiClient;
        } catch (error) {
            console.error("Failed to initialize GoogleGenAI client:", error);
            // Clear the invalid key
            clearApiKey();
            return null;
        }
    }

    return null;
};
