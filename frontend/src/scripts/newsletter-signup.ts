// Newsletter signup form handler with modal

function initNewsletterModal() {
  const fab = document.getElementById('newsletter-fab');
  const modal = document.getElementById('newsletter-modal');
  const modalContent = document.getElementById('newsletter-modal-content');
  const closeButton = document.getElementById('newsletter-close');

  if (!fab || !modal) return;

  function openModal() {
    modal!.classList.remove('hidden');
    modal!.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal!.classList.add('hidden');
    modal!.classList.remove('flex');
    document.body.style.overflow = '';
  }

  // Open modal on FAB click
  fab.addEventListener('click', openModal);

  // Close on close button click
  closeButton?.addEventListener('click', closeModal);

  // Close on backdrop click (but not modal content)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

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
      // Use our proxy endpoint instead of calling Strapi directly
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        message.textContent = 'Thanks! Check your email to confirm your subscription.';
        message.classList.remove('hidden', 'text-red-300', 'dark:text-red-800');
        message.classList.add('text-green-300', 'dark:text-green-800');
        form.reset();
        submitButton.textContent = 'Subscribed!';
      } else {
        const errorData = await res.json().catch(() => ({}));
        message.textContent = errorData?.error?.message || 'Something went wrong. Please try again.';
        message.classList.remove('hidden', 'text-green-300', 'dark:text-green-800');
        message.classList.add('text-red-300', 'dark:text-red-800');
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
  document.addEventListener('DOMContentLoaded', () => {
    initNewsletterModal();
    initNewsletterSignup();
  });
} else {
  initNewsletterModal();
  initNewsletterSignup();
}
