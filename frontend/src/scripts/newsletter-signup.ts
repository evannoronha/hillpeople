// Newsletter signup form handler

export function initNewsletterSignup() {
  const form = document.getElementById('newsletter-form') as HTMLFormElement | null;
  const message = document.getElementById('newsletter-message');
  const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!message || !submitButton) return;

    const formData = new FormData(form);
    const email = formData.get('email') as string;

    // Disable form while submitting
    submitButton.disabled = true;
    submitButton.textContent = 'Subscribing...';

    try {
      const strapiUrl = form.dataset.strapiUrl;
      if (!strapiUrl) {
        throw new Error('Strapi URL not configured');
      }

      const res = await fetch(`${strapiUrl}/api/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { email } }),
      });

      if (res.ok) {
        message.textContent = 'Thanks! Check your email to confirm your subscription.';
        message.classList.remove('hidden', 'text-red-400');
        message.classList.add('text-green-300');
        form.reset();
        submitButton.textContent = 'Subscribed!';
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || 'Something went wrong. Please try again.';

        // Handle duplicate email
        if (errorMessage.includes('unique') || errorMessage.includes('already')) {
          message.textContent = 'This email is already subscribed.';
        } else {
          message.textContent = errorMessage;
        }
        message.classList.remove('hidden', 'text-green-300');
        message.classList.add('text-red-400');
        submitButton.disabled = false;
        submitButton.textContent = 'Subscribe';
      }
    } catch (err) {
      message.textContent = 'Something went wrong. Please try again.';
      message.classList.remove('hidden', 'text-green-300');
      message.classList.add('text-red-400');
      submitButton.disabled = false;
      submitButton.textContent = 'Subscribe';
    }
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNewsletterSignup);
} else {
  initNewsletterSignup();
}
