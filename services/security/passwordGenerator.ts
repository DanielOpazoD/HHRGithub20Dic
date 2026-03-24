/**
 * Export Password Generator
 *
 * Pure function to generate deterministic passwords for census Excel exports.
 * This module has NO Firebase dependencies and can be used in both browser and Node.js.
 *
 * For Firestore persistence, use exportPasswordService.ts instead.
 */

/**
 * Fixed 4-digit PIN per month.
 *
 * Business rule:
 * - Every day in the same month must use exactly the same password.
 * - PINs should be easy to remember (simple repeated patterns).
 */
const MONTHLY_CENSUS_PINS = [
  '1212', // January
  '1313', // February
  '1414', // March
  '1515', // April
  '1616', // May
  '1717', // June
  '1818', // July
  '1919', // August
  '2020', // September
  '2121', // October
  '2323', // November
  '2424', // December
];

/**
 * Generate a deterministic 4-digit numeric PIN for a census date.
 * The PIN is fixed by month and reused for all emails in that month.
 *
 * @param censusDate - The census date in YYYY-MM-DD format
 * @returns A 4-digit numeric PIN
 */
export const generateCensusPassword = (censusDate: string): string => {
  const [, monthPart] = censusDate.split('-');
  const monthIndex = Number.parseInt(monthPart, 10) - 1;

  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return MONTHLY_CENSUS_PINS[0];
  }

  return MONTHLY_CENSUS_PINS[monthIndex];
};

/**
 * Alias for generateCensusPassword for backwards compatibility.
 */
export const getCensusPassword = generateCensusPassword;
