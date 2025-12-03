/**
 * Utility to map profile IDs to random codes and vice versa
 * Uses localStorage to persist mappings across sessions
 */

const STORAGE_KEY = 'profile_code_mappings';

interface CodeMapping {
    [code: string]: string; // code -> profileId
}

interface ReverseMapping {
    [profileId: string]: string; // profileId -> code
}

/**
 * Generate a random alphanumeric code
 */
function generateRandomCode(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Get all mappings from localStorage
 */
function getMappings(): CodeMapping {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Save mappings to localStorage
 */
function saveMappings(mappings: CodeMapping): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    } catch (error) {
        console.error('Failed to save profile code mappings:', error);
    }
}

/**
 * Get reverse mapping (profileId -> code)
 */
function getReverseMappings(): ReverseMapping {
    const mappings = getMappings();
    const reverse: ReverseMapping = {};
    for (const [code, profileId] of Object.entries(mappings)) {
        reverse[profileId] = code;
    }
    return reverse;
}

/**
 * Get or create a code for a profile ID
 */
export function getCodeForProfileId(profileId: string): string {
    const reverseMappings = getReverseMappings();

    // If code already exists, return it
    if (reverseMappings[profileId]) {
        return reverseMappings[profileId];
    }

    // Generate new code
    const mappings = getMappings();
    let newCode = generateRandomCode();

    // Ensure uniqueness
    while (mappings[newCode]) {
        newCode = generateRandomCode();
    }

    // Save mapping
    mappings[newCode] = profileId;
    saveMappings(mappings);

    return newCode;
}

/**
 * Get profile ID from code
 */
export function getProfileIdFromCode(code: string): string | null {
    const mappings = getMappings();
    return mappings[code] || null;
}

/**
 * Clear all mappings (useful for logout)
 */
export function clearAllMappings(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear profile code mappings:', error);
    }
}
