/**
 * Atom: HTML escaping
 * Every API-provided string must go through escapeHtml() before it is inserted with innerHTML
 * (station names, codes, select options, table cells, map popups...). Trusted static markup does not.
 */

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * @param {*} value Any value (null/undefined become an empty string)
 * @returns {string} Text safe to use inside HTML content and quoted attributes
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);
}

/**
 * Escaped value for display, or '-' when the API did not provide it (no invented defaults).
 * @param {*} value
 * @returns {string}
 */
export function displayValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') return '-';
  return escapeHtml(value);
}
