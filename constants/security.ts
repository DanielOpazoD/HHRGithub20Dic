/**
 * Security Constants
 * Configuration for session management and access control.
 */

// MINSAL Requirement: Auto-logout after inactivity
// Standard for clinical systems is usually between 10-20 minutes.
// We'll use 15 minutes as default.
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

// Events that count as user activity for resetting the session timer
export const ACTIVITY_EVENTS = [
    'mousemove',
    'keydown',
    'mousedown',
    'touchstart',
    'scroll'
];
