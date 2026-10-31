/* BriefDrop – Welcome screen interactions (progressive enhancement). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const raf = requestAnimationFrame;

  /* 1 ─ Headline: words rise in one after another ───────────────────────── */
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

  /* 2 ─ Illustration: pointer parallax (paper moves against the art) + tap wiggle ─ */
  const stage = $('.stage');
  const img = $('.art__img');
  const note = $('.note');
  if (stage && finePointer && !reduce) {
    let frame = 0;
    const region = document.querySelector('.art');
    region.addEventListener('pointermove', (e) => {
      const r = region.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5).toFixed(3);
      const y = ((e.clientY - r.top) / r.height - 0.5).toFixed(3);
      if (frame) return;
      frame = raf(() => { frame = 0; stage.style.setProperty('--px', x); stage.style.setProperty('--py', y); });
    });
    region.addEventListener('pointerleave', () => { stage.style.setProperty('--px', 0); stage.style.setProperty('--py', 0); });
  }
  if (stage && !reduce) {
    stage.addEventListener('click', () => {
      img.animate(
        [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-2.5deg) scale(1.035)', offset: .3 }, { transform: 'rotate(1.8deg) scale(1.02)', offset: .6 }, { transform: 'rotate(0) scale(1)' }],
        { duration: 650, easing: 'cubic-bezier(.3,1.2,.5,1)' }
      );
      note.animate(
        [{ transform: 'translate(-50%,-50%) rotate(-13.11deg)' }, { transform: 'translate(-50%,-50%) rotate(-30deg) scale(1.08)', offset: .35 }, { transform: 'translate(-50%,-50%) rotate(-6deg)', offset: .7 }, { transform: 'translate(-50%,-50%) rotate(-13.11deg)' }],
        { duration: 800, easing: 'cubic-bezier(.3,1.4,.5,1)' }
      );
    });
  }

  /* 3 ─ Magnetic signup link (mouse only) ────────────────────────────────── */
  const cta = $('#drop-btn');
  if (cta && finePointer && !reduce) {
    cta.addEventListener('pointermove', (e) => {
      const r = cta.getBoundingClientRect();
      cta.style.translate = `${((e.clientX - (r.left + r.width / 2)) * 0.12).toFixed(1)}px ${((e.clientY - (r.top + r.height / 2)) * 0.22).toFixed(1)}px`;
    });
    cta.addEventListener('pointerleave', () => { cta.style.translate = ''; });
  }

})();
