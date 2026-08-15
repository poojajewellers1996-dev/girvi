/**
 * Timezone-safe Date utilities to prevent 1-day timezone shift bugs.
 */

/**
 * Format a date string (YYYY-MM-DD or ISO) into "26 Sep 2025" for display.
 * Uses noon-time parsing to avoid UTC/Local timezone date shifts.
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  const str = String(dateString).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day, 12, 0, 0);
    return dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Safely extract YYYY-MM-DD string for <input type="date"> without timezone shift.
 */
export function toInputDateString(dateString) {
  if (!dateString) return '';
  return String(dateString).split('T')[0];
}

/**
 * Safely format YYYY-MM-DD string to ISO string at noon (T12:00:00) before sending to API.
 */
export function toISOAtNoon(dateString) {
  if (!dateString) return null;
  const cleanDate = String(dateString).split('T')[0];
  return `${cleanDate}T12:00:00`;
}
