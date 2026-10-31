/* BriefDrop – Sign in interactions (progressive enhancement). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* 1 ─ Intro: stagger everything, headline words rise ───────────────────── */
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

  /* 2 ─ Toast (this is a prototype: be upfront about what isn't wired up) ─── */
  const toast = $('#toast');
  let toastTimer = 0;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3000);
  };

  /* 3 ─ Fields: floating label, validation, show/hide password ───────────── */
  const form = $('#form');
  const rules = {
    email: (v) => (!v.trim() ? 'Enter your email address.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
    password: (v) => (v ? '' : 'Enter your password.'),
  };
  const fields = $$('.field').map((wrap) => {
    const input = $('input', wrap);
    return { wrap, input, err: $('.field__err', wrap), touched: false };
  });

  function check(f, show) {
    const msg = rules[f.input.name](f.input.value);
    const wasInvalid = f.wrap.classList.contains('is-invalid');
    f.wrap.classList.toggle('is-invalid', Boolean(msg) && show);
    f.input.setAttribute('aria-invalid', String(Boolean(msg) && show));
    if (msg && show) f.err.textContent = msg;
    if (msg && show && !wasInvalid && !reduce && f.wrap.animate) {
      f.wrap.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }],
        { duration: 380, easing: 'ease-out' }
      );
    }
    return !msg;
  }

  fields.forEach((f) => {
    const sync = () => f.wrap.classList.toggle('has-value', f.input.value.length > 0);
    f.input.addEventListener('input', () => { sync(); if (f.touched) check(f, true); });
    f.input.addEventListener('blur', () => { if (f.input.value) { f.touched = true; check(f, true); } });
    sync();   // handles browser autofill / restored values
    setTimeout(sync, 400);
  });

  const toggle = $('.field__toggle');
  const pw = $('#password');
  toggle.addEventListener('click', () => {
    const show = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    const start = pw.selectionStart, end = pw.selectionEnd;
    pw.type = show ? 'text' : 'password';
    pw.focus({ preventScroll: true });
    try { pw.setSelectionRange(start, end); } catch (_) { /* some browsers disallow while hidden */ }
    if (!reduce) toggle.animate([{ transform: 'scale(1)' }, { transform: 'scale(.7, .15)', offset: .4 }, { transform: 'scale(1)' }], { duration: 280, easing: 'ease-out' });  // a quick blink
  });

  /* 4 ─ Submit: validate, show a loading state, then be honest about the demo ─ */
  const cta = $('.cta', form);
  const label = $('.cta__label', cta);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cta.disabled) return;
    fields.forEach((f) => { f.touched = true; });
    const results = fields.map((f) => check(f, true));
    const firstBad = fields.find((f, i) => !results[i]);
    if (firstBad) { firstBad.input.focus(); return; }
    cta.disabled = true; cta.classList.add('is-loading'); label.textContent = 'Signing in';
    setTimeout(() => {
      cta.disabled = false; cta.classList.remove('is-loading'); label.textContent = 'Sign in';
      say('Sign-in isn’t connected in this prototype yet.');
    }, reduce ? 0 : 1100);
  });

  /* 5 ─ Everything else that has no backend yet ──────────────────────────── */
  $('#forgot').addEventListener('click', (e) => { e.preventDefault(); say('Password reset isn’t connected in this prototype yet.'); });
  $('#create').addEventListener('click', (e) => { e.preventDefault(); say('Account creation isn’t connected in this prototype yet.'); });
  $$('.social__btn').forEach((b) => b.addEventListener('click', () => say(`Continue with ${b.dataset.provider} isn’t connected in this prototype yet.`)));

  /* 6 ─ Desktop niceties: glow follows the pointer, CTA is a little magnetic ── */
  if (finePointer && !reduce) {
    const glow = $('.glow');
    let frame = 0;
    addEventListener('pointermove', (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        glow.style.setProperty('--gx', (e.clientX / innerWidth * 100).toFixed(1) + '%');
        glow.style.setProperty('--gy', (e.clientY / innerHeight * 100).toFixed(1) + '%');
      });
    }, { passive: true });
    cta.addEventListener('pointermove', (e) => {
      const r = cta.getBoundingClientRect();
      cta.style.translate = `${((e.clientX - (r.left + r.width / 2)) * 0.1).toFixed(1)}px ${((e.clientY - (r.top + r.height / 2)) * 0.2).toFixed(1)}px`;
    });
    cta.addEventListener('pointerleave', () => { cta.style.translate = ''; });
  }
})();
