import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

/* BriefDrop – Create account interactions (progressive enhancement). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const shake = (el) => { if (!reduce && el.animate) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }], { duration: 380, easing: 'ease-out' }); };

  /* 1 ─ Intro */
  $$('[data-in]').forEach((el, i) => el.style.setProperty('--i', i));
  const title = $('.title');
  if (title && !reduce) {
    const text = title.textContent.trim();
    title.setAttribute('aria-label', text);
    title.textContent = '';
    text.split(/\s+/).forEach((word, i, all) => {
      const s = document.createElement('span');
      s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i); s.textContent = word;
      title.append(s);
      if (i < all.length - 1) title.append(' ');
    });
  }

  /* 2 ─ Status messages */
  const toast = $('#toast');
  let toastTimer = 0;
  const say = (msg) => { toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3000); };
  const feedback = $('#auth-feedback');
  let supabase;
  const showMessage = (text, isError = false) => {
    feedback.textContent = text;
    feedback.hidden = !text;
    feedback.classList.toggle('is-error', isError);
  };
  const errorMessage = (error) => error instanceof Error ? error.message : 'An unexpected authentication error occurred.';

  /* 3 ─ Validation */
  const form = $('#form');
  const pw = $('#password'), confirm = $('#confirm');
  const rules = {
    name: (v) => (v.trim().length < 2 ? 'Tell us your name.' : ''),
    email: (v) => (!v.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
    password: (v) => (!v ? 'Choose a password.' : v.length < 8 ? 'Use at least 8 characters.' : ''),
    confirm: (v) => (!v ? 'Confirm your password.' : v !== pw.value ? 'Passwords don’t match.' : ''),
  };
  const fields = $$('.field').map((wrap) => ({ wrap, input: $('input', wrap), err: $('.field__err', wrap), touched: false }));

  function check(f, show) {
    const msg = rules[f.input.name](f.input.value);
    const was = f.wrap.classList.contains('is-invalid');
    f.wrap.classList.toggle('is-invalid', Boolean(msg) && show);
    f.input.setAttribute('aria-invalid', String(Boolean(msg) && show));
    if (msg && show) f.err.textContent = msg;
    if (msg && show && !was) shake(f.wrap);
    return !msg;
  }

  /* password strength: score 0–4 → underline fill + word */
  const meter = $('#meter'), pwWrap = pw.closest('.field');
  const levels = [['', 'var(--muted)'], ['Weak', '#ff6b5b'], ['Okay', '#faae1f'], ['Good', '#7aa5ff'], ['Strong', '#3ecf8e']];
  function strength() {
    const v = pw.value;
    let s = 0;
    if (v.length >= 8) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) s++;
    if (!v) s = 0; else s = Math.max(s, 1);
    pwWrap.style.setProperty('--s', s / 4);
    pwWrap.style.setProperty('--sc', levels[s][1]);
    meter.textContent = levels[s][0];
  }

  const confirmWrap = confirm.closest('.field');
  const syncMatch = () => confirmWrap.classList.toggle('is-match', confirm.value.length > 0 && confirm.value === pw.value);

  fields.forEach((f) => {
    const sync = () => f.wrap.classList.toggle('has-value', f.input.value.length > 0);
    f.input.addEventListener('input', () => {
      sync();
      if (f.input === pw) { strength(); syncMatch(); const c = fields[3]; if (c.touched) check(c, true); }
      if (f.input === confirm) syncMatch();
      if (f.touched) check(f, true);
    });
    f.input.addEventListener('blur', () => { if (f.input.value) { f.touched = true; check(f, true); } });
    sync();
    setTimeout(() => { sync(); strength(); syncMatch(); }, 400);
  });

  const toggle = $('.field__toggle');
  toggle.addEventListener('click', () => {
    const show = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    const a = pw.selectionStart, b = pw.selectionEnd;
    pw.type = show ? 'text' : 'password';
    confirm.type = show ? 'text' : 'password';   // reveal both so you can compare
    pw.focus({ preventScroll: true });
    try { pw.setSelectionRange(a, b); } catch (_) {}
    if (!reduce) toggle.animate([{ transform: 'scale(1)' }, { transform: 'scale(.7, .15)', offset: .4 }, { transform: 'scale(1)' }], { duration: 280, easing: 'ease-out' });
  });

  /* 4 ─ Terms */
  const terms = $('#terms'), agree = $('#agree'), termsErr = $('#terms-err');
  agree.addEventListener('change', () => { if (agree.checked) terms.classList.remove('is-invalid'); });
  $$('.terms a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); say(`${a.dataset.doc} page isn’t connected in this prototype yet.`); }));

  /* 5 ─ Submit */
  const cta = $('.cta', form), label = $('.cta__label', cta);
  const originalLabel = label.textContent;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cta.disabled) return;
    fields.forEach((f) => { f.touched = true; });
    const results = fields.map((f) => check(f, true));
    const termsOk = agree.checked;
    if (!termsOk) { termsErr.textContent = 'Please accept the Terms & Privacy to continue.'; terms.classList.add('is-invalid'); shake(terms); }
    const bad = fields.find((f, i) => !results[i]);
    if (bad) { bad.input.focus(); return; }
    if (!termsOk) { agree.focus(); return; }
    if (!supabase) {
      showMessage('Signup is unavailable because Supabase is not connected. Please try again later.', true);
      return;
    }

    cta.disabled = true; cta.classList.add('is-loading'); label.textContent = 'Creating account';
    showMessage('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: $('#email').value.trim(),
        password: pw.value,
        options: {
          data: { full_name: $('#name').value.trim() },
          emailRedirectTo: new URL('signin.html', window.location.href).href,
        },
      });
      if (error) throw error;

      if (data.session) {
        window.location.assign('index.html');
      } else {
        form.reset();
        fields.forEach((f) => {
          f.wrap.classList.remove('has-value', 'is-match', 'is-invalid');
          f.input.setAttribute('aria-invalid', 'false');
        });
        terms.classList.remove('is-invalid');
        termsErr.textContent = '';
        strength();
        showMessage('Your account is created. Check your email to confirm your address, then sign in.');
      }
    } catch (error) {
      showMessage(errorMessage(error), true);
    } finally {
      cta.disabled = false;
      cta.classList.remove('is-loading');
      label.textContent = originalLabel;
    }
  });

  /* 6 ─ Desktop niceties */
  if (finePointer && !reduce) {
    const glow = $('.glow');
    let frame = 0;
    addEventListener('pointermove', (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; glow.style.setProperty('--gx', (e.clientX / innerWidth * 100).toFixed(1) + '%'); glow.style.setProperty('--gy', (e.clientY / innerHeight * 100).toFixed(1) + '%'); });
    }, { passive: true });
    cta.addEventListener('pointermove', (e) => {
      const r = cta.getBoundingClientRect();
      cta.style.translate = `${((e.clientX - (r.left + r.width / 2)) * 0.1).toFixed(1)}px ${((e.clientY - (r.top + r.height / 2)) * 0.2).toFixed(1)}px`;
    });
    cta.addEventListener('pointerleave', () => { cta.style.translate = ''; });
  }

  async function initializeAuth() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      showMessage('Signup is not configured. Add the Supabase project URL and public key.', true);
      return;
    }
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) window.location.replace('index.html');
    } catch (error) {
      showMessage(`Could not connect to Supabase: ${errorMessage(error)}`, true);
    }
  }

  initializeAuth();
})();
