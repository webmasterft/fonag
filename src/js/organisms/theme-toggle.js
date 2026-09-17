/**
 * Theme Controller (White/Light theme only)
 * Resets and prevents any legacy dark theme.
 */
export function initThemeToggle() {
  document.documentElement.removeAttribute('data-theme');
  try {
    localStorage.removeItem('fonag-theme');
  } catch {
    // Ignore storage errors in restricted contexts
  }
}
