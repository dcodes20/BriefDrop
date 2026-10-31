import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const form = $('#form');
  const recoveryForm = $('#recovery-form');
  const feedback = $('#auth-feedback');
  const cta = $('.cta', form);
  const label = $('.cta__label', cta);
  const originalLabel = label.textContent;
  const authMode = form.dataset.authMode === 'signup' ? 'signup' : 'signin';
  let supabase;
  let authReady = false;

  function showMessage(text, isError = false) {
    feedback.textContent = text;
    feedback.hidden = !text;
    feedback.classList.toggle('is-error', isError);
  }

  function errorMessage(error) {
    return error instanceof Error ? error.message : 'An unexpected authentication error occurred.';
  }

  function setBusy(button, busy, text) {
    button.disabled = busy;
    button.classList.toggle('is-loading', busy);
    $('.cta__label', button).textContent = busy ? text : button.dataset.originalLabel;
  }

  function validate(formToCheck) {
    const email = $('#email', formToCheck);
    const password = $('input[name="password"]', formToCheck);
    let firstInvalid;

    [email, password].filter(Boolean).forEach((input) => {
      const empty = !input.value.trim();
      const invalidEmail = input.name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      const tooShort = input.name === 'password' && authMode === 'signup' && input.value.length < 8;
      const message = empty
        ? `Enter your ${input.name === 'email' ? 'email address' : 'password'}.`
        : invalidEmail ? 'Enter a valid email address.'
          : tooShort ? 'Use a password with at least 8 characters.' : '';
      input.setAttribute('aria-invalid', String(Boolean(message)));
      const error = $(`#${input.name}-err`, formToCheck);
      if (error) error.textContent = message;
      if (message && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function showRecoveryForm() {
    if (!recoveryForm) return;
    form.hidden = true;
    $('.or')?.setAttribute('hidden', '');
    $('.social')?.setAttribute('hidden', '');
    $('.create')?.setAttribute('hidden', '');
    recoveryForm.hidden = false;
    $('.title').textContent = 'Choose a new password';
    $('.title').removeAttribute('aria-label');
    $('.sub').textContent = 'Set a new password for your BriefDrop account.';
  }

  async function initializeAuth() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      showMessage('Authentication is not configured. Add the Supabase project URL and public key.', true);
      return;
    }

    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') showRecoveryForm();
      });

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      authReady = true;
      if (new URLSearchParams(window.location.search).get('mode') === 'recovery') {
        showRecoveryForm();
        showMessage('Enter a new password. If this link has expired, request another reset email.');
      } else if (data.session) {
        window.location.assign('index.html');
      }
    } catch (error) {
      showMessage(`Could not connect to Supabase: ${errorMessage(error)}`, true);
    }
  }

  $$('[data-in]').forEach((element, index) => element.style.setProperty('--i', index));
  const title = $('.title');
  if (title && !reduce) {
    const text = title.textContent.trim();
    title.setAttribute('aria-label', text);
    title.textContent = '';
    text.split(/\s+/).forEach((word, index, words) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--i', index);
      span.textContent = word;
      title.append(span);
      if (index < words.length - 1) title.append(' ');
    });
  }

  const fields = $$('.field', form).map((field) => ({
    input: $('input', field),
    wrap: field,
  }));
  fields.forEach(({ input, wrap }) => {
    const sync = () => wrap.classList.toggle('has-value', input.value.length > 0);
    input.addEventListener('input', () => {
      sync();
      if (input.getAttribute('aria-invalid') === 'true') validate(form);
    });
    input.addEventListener('blur', sync);
    sync();
    setTimeout(sync, 400);
  });

  $('.field__toggle')?.addEventListener('click', (event) => {
    const toggle = event.currentTarget;
    const password = $('#password');
    const visible = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    const start = password.selectionStart;
    const end = password.selectionEnd;
    password.type = visible ? 'text' : 'password';
    password.focus({ preventScroll: true });
    try {
      password.setSelectionRange(start, end);
    } catch {
      // Some browsers do not support selection ranges for password inputs.
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate(form) || cta.disabled) return;
    if (!authReady || !supabase) {
      showMessage('Sign-in is unavailable because Supabase could not be reached. Please try again later.', true);
      return;
    }

    const email = $('#email').value.trim();
    const password = $('#password').value;
    setBusy(cta, true, authMode === 'signup' ? 'Creating account' : 'Signing in');
    showMessage('');

    try {
      const result = authMode === 'signup'
        ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: new URL('signin.html', window.location.href).href },
        })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;

      if (authMode === 'signup' && !result.data.session) {
        form.reset();
        fields.forEach(({ input, wrap }) => {
          wrap.classList.remove('has-value');
          input.setAttribute('aria-invalid', 'false');
        });
        showMessage('Account created. Check your email to confirm your address, then sign in.');
      } else {
        window.location.assign('index.html');
      }
    } catch (error) {
      showMessage(errorMessage(error), true);
    } finally {
      setBusy(cta, false, originalLabel);
    }
  });

  recoveryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = $('#new-password');
    const button = $('.cta', recoveryForm);
    if (!password.value || password.value.length < 8) {
      showMessage('Use a password with at least 8 characters.', true);
      password.focus();
      return;
    }
    if (button.disabled) return;
    if (!authReady || !supabase) {
      showMessage('Password update is unavailable because Supabase could not be reached. Please try again later.', true);
      return;
    }

    button.dataset.originalLabel = $('.cta__label', button).textContent;
    setBusy(button, true, 'Updating password');
    showMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password: password.value });
      if (error) throw error;
      showMessage('Password updated. Taking you to your practice space.');
      window.setTimeout(() => window.location.assign('index.html'), 900);
    } catch (error) {
      showMessage(errorMessage(error), true);
      setBusy(button, false, button.dataset.originalLabel);
    }
  });

  $('#forgot')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const link = event.currentTarget;
    if (link.getAttribute('aria-disabled') === 'true') return;
    const email = $('#email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('Enter a valid email address first, then choose Forgot password.', true);
      $('#email').focus();
      return;
    }
    if (!authReady || !supabase) {
      showMessage('Password reset is unavailable because Supabase could not be reached. Please try again later.', true);
      return;
    }

    link.setAttribute('aria-disabled', 'true');
    showMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('signin.html?mode=recovery', window.location.href).href,
      });
      if (error) throw error;
      showMessage('If an account exists for that email, a password-reset link will arrive shortly.');
    } catch (error) {
      showMessage(errorMessage(error), true);
    } finally {
      link.removeAttribute('aria-disabled');
    }
  });

  $$('.social__btn').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!authReady || !supabase) {
        showMessage('Social sign-in is unavailable because Supabase could not be reached. Please try again later.', true);
        return;
      }
      button.disabled = true;
      showMessage('');
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: button.dataset.provider.toLowerCase(),
          options: { redirectTo: new URL('index.html', window.location.href).href },
        });
        if (error) throw error;
      } catch (error) {
        showMessage(errorMessage(error), true);
        button.disabled = false;
      }
    });
  });

  const ctaLabel = $('.cta__label', cta);
  cta.dataset.originalLabel = ctaLabel.textContent;
  if (finePointer && !reduce) {
    const glow = $('.glow');
    let frame = 0;
    addEventListener('pointermove', (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        glow.style.setProperty('--gx', `${(event.clientX / innerWidth * 100).toFixed(1)}%`);
        glow.style.setProperty('--gy', `${(event.clientY / innerHeight * 100).toFixed(1)}%`);
      });
    }, { passive: true });
    cta.addEventListener('pointermove', (event) => {
      const rect = cta.getBoundingClientRect();
      cta.style.translate = `${((event.clientX - (rect.left + rect.width / 2)) * 0.1).toFixed(1)}px ${((event.clientY - (rect.top + rect.height / 2)) * 0.2).toFixed(1)}px`;
    });
    cta.addEventListener('pointerleave', () => { cta.style.translate = ''; });
  }

  initializeAuth();
})();
