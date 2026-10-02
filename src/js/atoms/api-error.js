/**
 * Atom: API error state
 * Single error message used across the app when SEDC does not respond.
 * There are no local fallbacks: when the API fails, the user sees this message.
 */
export const API_ERROR_MESSAGE = 'Error en el API, intenta más tarde.';

/**
 * @param {string} [message]
 * @returns {string} HTML of the error state
 */
export function apiErrorHtml(message = API_ERROR_MESSAGE) {
  return `
    <div class="fonag-api-error" role="alert">
      <span class="fonag-api-error-icon" aria-hidden="true">!</span>
      <span class="fonag-api-error-text">${message}</span>
    </div>
  `;
}

/**
 * Renders the error state inside a container (replacing its content).
 * @param {HTMLElement|null} container
 * @param {string} [message]
 */
export function showApiError(container, message = API_ERROR_MESSAGE) {
  if (container) container.innerHTML = apiErrorHtml(message);
}
