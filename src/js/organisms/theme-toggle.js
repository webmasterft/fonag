/**
 * Organism: Theme Toggle Controller
 * Toggles between light and dark theme, persisting choice in localStorage.
 */
export function initThemeToggle(toggleBtnSelector = '#theme-toggle') {
  const toggleBtn = document.querySelector(toggleBtnSelector);
  if (!toggleBtn) return;

  const STORAGE_KEY = 'fonag-theme';
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      toggleBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2"/>
          <path d="M12 20v2"/>
          <path d="m4.93 4.93 1.41 1.41"/>
          <path d="m17.66 17.66 1.41 1.41"/>
          <path d="M2 12h2"/>
          <path d="M20 12h2"/>
          <path d="m6.34 17.66-1.41 1.41"/>
          <path d="m19.07 4.93-1.41 1.41"/>
        </svg>
      `;
      toggleBtn.setAttribute('aria-label', 'Switch to light theme');
    } else {
      document.documentElement.removeAttribute('data-theme');
      toggleBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      `;
      toggleBtn.setAttribute('aria-label', 'Switch to dark theme');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }

  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
  });
}
