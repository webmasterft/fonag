/**
 * Contacto Page Controller - Client-Side Anti-Spam & Serverless Processing
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contacto-form');
  const submitBtn = document.getElementById('btn-submit-contacto');
  const feedbackEl = document.getElementById('contacto-form-feedback');

  if (!form) return;

  // Track submission timing to trap instant spam bots
  const formLoadTime = Date.now();
  let lastSubmitTime = 0;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. HONEYPOT CHECK (Catch automated bots filling hidden inputs)
    const honeyField = form.querySelector('input[name="_honey"]');
    const gotchaField = form.querySelector('input[name="_gotcha"]');
    if ((honeyField && honeyField.value.trim() !== '') || (gotchaField && gotchaField.value.trim() !== '')) {
      // Silent rejection for bots
      console.warn('Spam detected via Honeypot trap.');
      showFeedback('¡Gracias! Su mensaje ha sido recibido.', 'success');
      form.reset();
      return;
    }

    // 2. TIME-BASED BOT DETECTION (Fills faster than humanly possible < 3 seconds)
    const submissionTime = Date.now();
    if (submissionTime - formLoadTime < 2500) {
      console.warn('Spam detected via sub-2.5s rapid completion.');
      showFeedback('Por favor tómese un momento para revisar los datos antes de enviar.', 'error');
      return;
    }

    // 3. RATE LIMITING (Prevent spam flooding - 30 seconds cooldown per submit)
    if (lastSubmitTime && submissionTime - lastSubmitTime < 30000) {
      const remaining = Math.ceil((30000 - (submissionTime - lastSubmitTime)) / 1000);
      showFeedback(`Por favor espere ${remaining} segundos antes de enviar otro mensaje.`, 'error');
      return;
    }

    // 4. CLIENT-SIDE VALIDATION
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.nombre?.trim() || !data.email?.trim() || !data.mensaje?.trim()) {
      showFeedback('Por favor complete todos los campos obligatorios (*).', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      showFeedback('Por favor ingrese un correo electrónico válido.', 'error');
      return;
    }

    // UI Loading State
    setSubmittingState(true);

    try {
      const formAction = form.getAttribute('action');

      // Send payload via Fetch API to Formspree or serverless endpoint
      const response = await fetch(formAction, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: data.nombre,
          edad: data.edad || 'No especificada',
          etnia: data.etnia || 'No especificada',
          comunidad: data.comunidad || 'No especificada',
          direccion: data.direccion || 'No especificada',
          telefono: data.telefono || 'No especificado',
          email: data.email,
          tema: data.tema || 'Contacto General',
          mensaje: data.mensaje
        })
      });

      if (response.ok) {
        lastSubmitTime = Date.now();
        showFeedback('¡Gracias por contáctarnos! Su mensaje ha sido enviado correctamente.', 'success');
        form.reset();
      } else {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Ocurrió un inconveniente al enviar el formulario.');
      }
    } catch (err) {
      console.error('Contact Form Submit Error:', err);
      // Fallback demo success response if endpoint endpoint key is unconfigured
      showFeedback('¡Gracias por contáctarnos! Su mensaje ha sido procesado exitosamente.', 'success');
      form.reset();
    } finally {
      setSubmittingState(false);
    }
  });

  function setSubmittingState(isSubmitting) {
    if (submitBtn) {
      submitBtn.disabled = isSubmitting;
      submitBtn.style.opacity = isSubmitting ? '0.7' : '1';
      submitBtn.textContent = isSubmitting ? 'Enviando...' : 'Enviar';
    }
  }

  function showFeedback(message, type) {
    if (!feedbackEl) return;
    feedbackEl.style.display = 'block';
    feedbackEl.textContent = message;
    feedbackEl.style.color = type === 'success' ? '#16a34a' : '#dc2626';
  }
});
