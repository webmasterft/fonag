/**
 * Contacto Page Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contacto-form');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      if (!data.nombre || !data.email || !data.mensaje) {
        alert('Por favor complete todos los campos obligatorios.');
        return;
      }

      alert('¡Gracias por contactarnos! Su mensaje ha sido enviado exitosamente.');
      form.reset();
    });
  }
});
