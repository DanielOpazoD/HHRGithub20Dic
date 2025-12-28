/**
 * Export Password Generator
 * 
 * Pure function to generate deterministic passwords for census Excel exports.
 * This module has NO Firebase dependencies and can be used in both browser and Node.js.
 * 
 * For Firestore persistence, use exportPasswordService.ts instead.
 */

// Secret salt for password generation (should match across client and server)
const PASSWORD_SALT = 'HHR-CENSO-2025';

/**
 * Generate a deterministic 6-character alphanumeric password for a census date.
 * Uses a hash-based approach to ensure the same date always produces the same password.
 * 
 * @param censusDate - The census date in YYYY-MM-DD format
 * @returns A 6-character alphanumeric password
 */
export const generateCensusPassword = (censusDate: string): string => {
    const input = `${PASSWORD_SALT}-${censusDate}`;

    // Simple hash function (djb2 algorithm variant)
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash) + input.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to positive number
    hash = Math.abs(hash);

    // Generate alphanumeric password from hash
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars (0/O, 1/I/L)
    let password = '';

    for (let i = 0; i < 6; i++) {
        password += chars[hash % chars.length];
        hash = Math.floor(hash / chars.length);
    }

    return password;
};

/**
 * Alias for generateCensusPassword for backwards compatibility.
 */
export const getCensusPassword = generateCensusPassword;
