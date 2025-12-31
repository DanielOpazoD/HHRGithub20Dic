/**
 * Security Constants
 * Configuration for session management and access control.
 */

// MINSAL Requirement: Auto-logout after inactivity
// Standard for clinical systems is usually between 10-20 minutes.
// Updated to 60 minutes to reduce unnecessary logouts after long pauses.
export const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

// Events that count as user activity for resetting the session timer
export const ACTIVITY_EVENTS = [
    'mousemove',
    'keydown',
    'mousedown',
    'touchstart',
    'scroll'
];
