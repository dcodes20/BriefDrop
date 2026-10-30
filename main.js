/* BriefDrop – interactions. Progressive enhancement: the page works without this file. */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const raf = (fn) => requestAnimationFrame(fn);

  /** Run `fn` the first time `el` is ~25% visible. */
  function onceVisible(el, fn, threshold = 0.25) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { threshold });
    io.observe(el);
  }

  /* ------------------------------------------------------------------
     1. Hero intro: split the headline into words that rise in
     ------------------------------------------------------------------ */
  const h1 = $('.hero__title');
  if (h1 && !reduce) {
    const text = h1.textContent.trim();
    h1.setAttribute('aria-label', text);
    h1.textContent = '';
    text.split(/\s+/).forEach((word, i, all) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.textContent = word;
      h1.append(s);
      if (i < all.length - 1) h1.append(' ');
    });
  }

  /* ------------------------------------------------------------------
     2. Scroll reveal (staggered by sibling order)
     ------------------------------------------------------------------ */
  const revealSelectors = [
    '.hero__kicker', '.hero__lede', '.hero__actions', '.hero__art', '.hero__audience',
    '.steps__title', '.step',
    '.briefs__head', '.tilt', '.briefs__list > .btn',
    '.peek .section__inner > .phone', '.peek__copy > *',
    '.progress .section__inner > *',
    '.stories .section__inner > :not(.stories__list)', '.story',
    '.faq .section__inner > :not(.faq__list)', '.faq__item',
    '.closing__inner > *',
    '.footer__inner',
  ];
  const targets = [...new Set($$(revealSelectors.join(',')))];

  if (!reduce && 'IntersectionObserver' in window) {
    const byParent = new Map();
    targets.forEach((el) => {
      el.setAttribute('data-reveal', '');
      const list = byParent.get(el.parentElement) || [];
      list.push(el);
      byParent.set(el.parentElement, list);
    });
    byParent.forEach((list) => list.forEach((el, i) => el.style.setProperty('--d', Math.min(i, 5) * 90 + 'ms')));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add('is-in');
        // Hand the element back to its own hover transitions once the reveal is done.
        const delay = parseFloat(el.style.getPropertyValue('--d')) || 0;
        setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); el.style.removeProperty('--d'); }, delay + 950);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     3. Sticky nav: blur on scroll, progress bar, scroll-spy, mobile menu
     ------------------------------------------------------------------ */
  const nav = $('#nav');
  const bar = $('.scrollbar i');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 8);
    const max = doc.scrollHeight - window.innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; raf(onScroll); } }, { passive: true });
  onScroll();

  const menuBtn = $('#menu-btn');
  function setMenu(open) {
    nav.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$('#menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setMenu(false); });
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // scroll-spy for the desktop links
  const spyLinks = $$('.nav__links a');
  if ('IntersectionObserver' in window && spyLinks.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        spyLinks.forEach((a) => {
          const on = a.getAttribute('href') === '#' + entry.target.id;
          a.classList.toggle('is-active', on);
          on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    spyLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* ------------------------------------------------------------------
     4. Hero parallax + magnetic buttons (mouse only)
     ------------------------------------------------------------------ */
  const art = $('.hero__art');
  if (art && finePointer && !reduce) {
    let frame = 0;
    art.addEventListener('pointermove', (e) => {
      const r = art.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5).toFixed(3);
      const y = ((e.clientY - r.top) / r.height - 0.5).toFixed(3);
      if (frame) return;
      frame = raf(() => { frame = 0; art.style.setProperty('--px', x); art.style.setProperty('--py', y); });
    });
    art.addEventListener('pointerleave', () => { art.style.setProperty('--px', 0); art.style.setProperty('--py', 0); });
  }
  if (finePointer && !reduce) {
    $$('.hero__actions .btn, .footer__cta, .peek .cta').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* ------------------------------------------------------------------
     5. FAQ accordion (all open by default, as in the design)
     ------------------------------------------------------------------ */
  $$('.faq__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      btn.closest('.faq__item').classList.toggle('is-collapsed', open);
    });
  });

  /* ------------------------------------------------------------------
     6. Practice journal: meters fill, days pop in, days are tappable
     ------------------------------------------------------------------ */
  const pop = (el, delay = 0) => {
    if (reduce || !el.animate) return;
    el.animate(
      [{ transform: 'scale(.4)' }, { transform: 'scale(1.22)', offset: .6 }, { transform: 'scale(1)' }],
      { duration: 480, delay, easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'backwards' }
    );
  };
  const journal = $('.journal');
  if (journal) {
    if (reduce) journal.classList.add('is-filled');
    onceVisible(journal, () => {
      journal.classList.add('is-filled');
      $$('.day__mark', journal).forEach((d, i) => pop(d, 250 + i * 70));
    }, 0.3);
    $$('.day__mark', journal).forEach((btn) => {
      btn.addEventListener('click', () => {
        const on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(on));
        btn.classList.toggle('day__mark--on', on);
        btn.classList.toggle('day__mark--off', !on);
        if (on) pop(btn);
      });
    });
  }

  /* ------------------------------------------------------------------
     7. Phone mock-up: streak counter, dice, bookmark, zap
     ------------------------------------------------------------------ */
  const phone = $('.phone');
  const streak = $('[data-count]');
  if (phone && streak) {
    const target = parseInt(streak.dataset.count, 10) || 0;
    if (!reduce) streak.textContent = '0';
    onceVisible(phone, () => {
      if (reduce) return;
      let n = 0;
      const t = setInterval(() => { n += 1; streak.textContent = String(n); if (n >= target) clearInterval(t); }, 260);
    }, 0.35);
  }
  const spin = (el, frames, opts) => { if (!reduce && el.animate) el.animate(frames, opts); };
  $$('.tile', phone || document).forEach((tile) => {
    const icon = $('.icon', tile);
    tile.addEventListener('click', () => {
      if (tile.dataset.tile === 'dice') {
        spin(icon, [{ transform: 'rotate(0)' }, { transform: 'rotate(540deg) scale(1.3)' , offset: .6 }, { transform: 'rotate(720deg)' }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else if (tile.dataset.tile === 'save') {
        const on = tile.getAttribute('aria-pressed') !== 'true';
        tile.setAttribute('aria-pressed', String(on));
        spin(icon, [{ transform: 'rotate(8deg) scale(1)' }, { transform: 'rotate(-8deg) scale(1.5)', offset: .5 }, { transform: 'rotate(8deg) scale(1)' }], { duration: 420 });
      } else if (tile.dataset.tile === 'zap') {
        spin(icon, [{ transform: 'rotate(-8deg) scale(1)', opacity: 1 }, { transform: 'rotate(-8deg) scale(1.7)', opacity: .5, offset: .4 }, { transform: 'rotate(-8deg) scale(1)', opacity: 1 }], { duration: 450 });
      }
    });
  });

  /* ------------------------------------------------------------------
     8. Brief dialog with an honest stopwatch
     ------------------------------------------------------------------ */
  const dlg = $('#brief-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    const els = {
      art: $('.dialog__art', dlg), chip: $('.dialog__chip', dlg), title: $('.dialog__title', dlg),
      text: $('.dialog__text', dlg), timer: $('.timer', dlg), time: $('.timer__time', dlg),
      toggle: $('#timer-toggle', dlg), reset: $('#timer-reset', dlg),
    };
    let elapsed = 0, startedAt = 0, tick = 0, lastFocus = null;

    const fmt = (ms) => {
      const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      const two = (n) => String(n).padStart(2, '0');
      return (h ? `${h}:${two(m)}` : two(m)) + ':' + two(sec);
    };
    const paint = () => { els.time.textContent = fmt(elapsed + (startedAt ? performance.now() - startedAt : 0)); };
    const run = () => { startedAt = performance.now(); tick = setInterval(paint, 250); els.timer.classList.add('is-running'); els.toggle.textContent = 'Pause'; };
    const pause = () => { if (startedAt) { elapsed += performance.now() - startedAt; startedAt = 0; } clearInterval(tick); els.timer.classList.remove('is-running'); els.toggle.textContent = elapsed ? 'Resume' : 'Start timer'; paint(); };
    const resetTimer = () => { pause(); elapsed = 0; els.toggle.textContent = 'Start timer'; paint(); };

    els.toggle.addEventListener('click', () => (startedAt ? pause() : run()));
    els.reset.addEventListener('click', resetTimer);

    $$('[data-open-brief]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.card');
        if (!card) return;
        lastFocus = btn;
        dlg.dataset.briefId = card.dataset.briefId || '';
        els.art.replaceChildren(...Array.from($('.card__art', card).childNodes, (n) => n.cloneNode(true)));
        els.chip.replaceChildren($('.chip', card).cloneNode(true));
        els.title.textContent = $('.card__title', card).textContent;
        const copy = $('.card__text', card).cloneNode(true);
        $$('.card__more', copy).forEach((n) => n.remove());
        els.text.textContent = card.dataset.briefDescription || copy.textContent.trim();
        resetTimer();
        dlg.showModal();
      });
    });
    $('.dialog__close', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // click on the backdrop
    dlg.addEventListener('close', () => { pause(); if (lastFocus) lastFocus.focus({ preventScroll: true }); });
  }

  /* ------------------------------------------------------------------
     9. Little easter egg: "Stay curious" throws sparkles
     ------------------------------------------------------------------ */
  const egg = $('[data-burst]');
  if (egg && !reduce) {
    egg.addEventListener('click', () => {
      const r = $('.icon', egg).getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const colors = ['#185adb', '#f9e8c3', '#a01e12', '#fdb11a', '#077e4e'];
      for (let i = 0; i < 14; i++) {
        const s = document.createElement('span');
        s.className = 'icon icon--sparkles burst';
        s.style.left = cx - 9 + 'px'; s.style.top = cy - 9 + 'px';
        s.style.color = colors[i % colors.length];
        document.body.append(s);
        const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.4, d = 70 + Math.random() * 70;
        s.animate(
          [{ transform: 'translate(0,0) scale(.4) rotate(0)', opacity: 1 },
           { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 30}px) scale(1.2) rotate(${Math.random() * 240 - 120}deg)`, opacity: 0 }],
          { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.15,.8,.3,1)' }
        ).onfinish = () => s.remove();
      }
    });
  }
})();
