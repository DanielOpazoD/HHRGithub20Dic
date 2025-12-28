/**
 * Export Password Service
 * 
 * Manages passwords for census Excel exports.
 * Passwords are stored permanently in Firestore for auditability.
 * If a password doesn't exist for a date, it generates one and saves it.
 * 
 * This ensures:
 * - Same password for manual downloads and email attachments
 * - Password remains stable if email is re-sent  
 * - Password can be recovered/looked up by date
 * - Historical passwords are preserved even if algorithm changes
 */

import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getExportPasswordsPath } from '../../constants/firestorePaths';

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
 * Interface for stored password document
 */
export interface ExportPasswordRecord {
    date: string;
    password: string;
    createdAt: string;
    createdBy?: string;
}

/**
 * Get or create a password for a census date.
 * If password exists in Firestore, returns it.
 * If not, generates one, saves it, and returns it.
 * 
 * @param censusDate - The census date in YYYY-MM-DD format
 * @param createdBy - Optional user ID who triggered the generation
 * @returns The password for that census date
 */
export const getOrCreateCensusPassword = async (
    censusDate: string,
    createdBy?: string
): Promise<string> => {
    try {
        const db = getFirestore();
        const passwordsPath = getExportPasswordsPath();
        const docRef = doc(db, passwordsPath, censusDate);

        // Try to get existing password
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as ExportPasswordRecord;
            console.log(`[ExportPassword] Retrieved existing password for ${censusDate}`);
            return data.password;
        }

        // Generate and save new password
        const password = generateCensusPassword(censusDate);
        const record: ExportPasswordRecord = {
            date: censusDate,
            password,
            createdAt: new Date().toISOString(),
            createdBy
        };

        await setDoc(docRef, record);
        console.log(`[ExportPassword] Created and saved password for ${censusDate}`);

        return password;
    } catch (error) {
        console.error(`[ExportPassword] Firestore error for ${censusDate}, using generated password:`, error);
        // Fallback to generated password if Firestore fails
        return generateCensusPassword(censusDate);
    }
};

/**
 * Get all stored passwords (for audit display).
 * Returns passwords from Firestore, ordered by date descending.
 * 
 * @param maxResults - Maximum number of results to return
 * @returns Array of password records
 */
export const getStoredPasswords = async (maxResults: number = 30): Promise<ExportPasswordRecord[]> => {
    try {
        const db = getFirestore();
        const passwordsPath = getExportPasswordsPath();
        const passwordsRef = collection(db, passwordsPath);
        const q = query(passwordsRef, orderBy('date', 'desc'), limit(maxResults));

        const snapshot = await getDocs(q);
        const records: ExportPasswordRecord[] = [];

        snapshot.forEach(doc => {
            records.push(doc.data() as ExportPasswordRecord);
        });

        console.log(`[ExportPassword] Retrieved ${records.length} stored passwords`);
        return records;
    } catch (error) {
        console.error('[ExportPassword] Failed to get stored passwords:', error);
        return [];
    }
};

/**
 * Synchronous password generation (for backwards compatibility).
 * Use getOrCreateCensusPassword when possible for persistence.
 */
export const getCensusPassword = (censusDate: string): string => {
    return generateCensusPassword(censusDate);
};
