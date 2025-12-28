/**
 * Export Password Service
 * 
 * Generates deterministic, reproducible passwords for census Excel exports.
 * The password is the same for a given census date, regardless of when
 * export or email is triggered.
 * 
 * This enables:
 * - Same password for manual downloads and email attachments
 * - Password remains stable if email is re-sent
 * - Password can be recovered/looked up by date
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
 * Get the password for a specific census date.
 * This is a convenience wrapper that makes the intent clear.
 * 
 * @param censusDate - The census date in YYYY-MM-DD format
 * @returns The password for that census date
 */
export const getCensusPassword = (censusDate: string): string => {
    return generateCensusPassword(censusDate);
};

/**
 * Generate passwords for a range of dates (for audit display).
 * 
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Map of date to password
 */
export const getCensusPasswordsForRange = (startDate: string, endDate: string): Map<string, string> => {
    const result = new Map<string, string>();

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        result.set(dateStr, generateCensusPassword(dateStr));
    }

    return result;
};
