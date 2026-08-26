/**
 * Attendify Product Analytics
 *
 * trackEvent(eventName, metadata?) — fire-and-forget, never throws.
 * useAnalyticsTrack(eventName, metadata?) — React hook: fires once per component mount.
 *
 * Duplicate prevention:
 *   Each component instance uses a local useRef(false) flag so the event fires
 *   exactly once per mount. Navigating away and back creates a new mount, which
 *   correctly generates a new event. This is intentional — a student who views
 *   Attendance on Monday AND again on Tuesday should generate two events.
 *   We only suppress accidental re-fires from React re-renders on the same mount.
 */

import { useEffect, useRef } from 'react';
import api from './api';

/**
 * Send a single analytics event to the backend.
 * - Non-blocking: errors are caught and silently discarded.
 * - user_id is NEVER sent from the frontend — the backend always derives it from the session.
 *
 * @param {string} eventName  Must match an entry in VALID_ANALYTICS_EVENTS on the server.
 * @param {Object} [metadata] Optional safe key/value metadata (e.g. { resource_id: "..." }).
 */
export function trackEvent(eventName, metadata = {}) {
  // Fire without await — never block the caller
  api.post('/api/analytics/event', { event: eventName, metadata }).catch(() => {
    // Analytics failure must never surface to the user
  });
}

/**
 * React hook that tracks a single analytics event exactly once per component mount.
 *
 * Usage:
 *   useAnalyticsTrack('attendance_viewed');
 *   useAnalyticsTrack('resource_opened', { resource_id: id });
 *
 * @param {string} eventName
 * @param {Object} [metadata]
 * @param {boolean} [condition] If false, event is not tracked. Useful for conditional tracking.
 */
export function useAnalyticsTrack(eventName, metadata = {}, condition = true) {
  const fired = useRef(false);

  useEffect(() => {
    if (!condition) return;
    if (fired.current) return;
    fired.current = true;
    trackEvent(eventName, metadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition]);
}
