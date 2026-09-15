/**
 * Atom: Button Interaction Helpers
 * Handles micro-interactions such as ripple animations on click.
 */
export function initButtons() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.btn');
    if (!button || button.disabled) return;

    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');

    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(circle);

    setTimeout(() => {
      circle.remove();
    }, 600);
  });
}
