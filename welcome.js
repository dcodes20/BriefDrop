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

  /* 3 ─ Magnetic primary button (mouse only) ─────────────────────────────── */
  const cta = $('#drop-btn');
  if (cta && finePointer && !reduce) {
    cta.addEventListener('pointermove', (e) => {
      const r = cta.getBoundingClientRect();
      cta.style.translate = `${((e.clientX - (r.left + r.width / 2)) * 0.12).toFixed(1)}px ${((e.clientY - (r.top + r.height / 2)) * 0.22).toFixed(1)}px`;
    });
    cta.addEventListener('pointerleave', () => { cta.style.translate = ''; });
  }

  /* 4 ─ "Gimme a brief": a brief gets dropped from the site's real set ─────── */
  const briefs = [
    { chip: 'UI/UX Design', icon: 'i-component', color: '#3ecf8e', title: 'Fintech app design.',
      text: 'You’ll own the design of our core workflow, the part of the product where users spend 80% of their time and where most of our drop-off happens.',
      art: { img: 'assets/card-fintech.png' } },
    { chip: 'Writing', icon: 'i-type', color: '#7aa5ff', title: 'One story. Five hooks.',
      text: 'Turn a tiny everyday moment into five opening lines that make people want to read on.',
      art: { lines: ['What if...', 'Nobody told', 'you this?'] } },
    { chip: 'Visual storytelling', icon: 'i-eye', color: '#faae1f', title: 'Find your fresh angle.',
      text: 'Take three photos of one object. Change the light, the crop, and the story it tells.',
      art: { img: 'assets/card-visual.png' } },
  ];
  const dlg = $('#drop');
  const els = {
    art: $('.drop__art', dlg), chip: $('#drop-chip'), chipIcon: $('#drop-chip-icon'), chipText: $('#drop-chip-text'),
    title: $('#drop-title'), text: $('#drop-text'), another: $('#drop-another'),
  };
  let current = -1;

  function show(i, animate) {
    current = i;
    const b = briefs[i];
    els.art.replaceChildren();
    if (b.art.img) {
      const im = new Image(); im.src = b.art.img; im.alt = ''; els.art.append(im);
    } else {
      const d = document.createElement('div'); d.className = 'art-text';
      b.art.lines.forEach((l, n) => { const s = document.createElement('span'); s.textContent = l; if (n === 1) s.className = 'accent'; d.append(s); });
      els.art.append(d);
    }
    els.chip.style.color = b.color;
    els.chipIcon.className = 'i ' + b.icon;
    els.chipText.textContent = b.chip;
    els.title.textContent = b.title;
    els.text.textContent = b.text;
    if (animate && !reduce) {
      els.art.firstElementChild.animate(
        [{ opacity: 0, transform: 'translateY(-60px) rotate(-14deg) scale(.8)' }, { opacity: 1, transform: 'translateY(6px) rotate(3deg)', offset: .6 }, { opacity: 1, transform: 'none' }],
        { duration: 650, easing: 'cubic-bezier(.3,1.3,.5,1)' }
      );
      [els.chip, els.title, els.text].forEach((el, n) => el.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: 120 + n * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
      ));
    }
  }
  const pickNext = () => {
    let n; do { n = Math.floor(Math.random() * briefs.length); } while (n === current && briefs.length > 1);
    return n;
  };

  if (cta instanceof HTMLButtonElement && dlg && typeof dlg.showModal === 'function') {
    const label = $('.cta__label', cta);
    const original = label.textContent;
    cta.addEventListener('click', () => {
      if (cta.disabled) return;
      cta.disabled = true; cta.classList.add('is-loading'); label.textContent = 'Dropping';
      setTimeout(() => {
        show(pickNext(), false);
        dlg.showModal();
        cta.disabled = false; cta.classList.remove('is-loading'); label.textContent = original;
      }, reduce ? 0 : 750);
    });
    els.another.addEventListener('click', () => {
      const dice = $('.i-dices', els.another);
      if (!reduce) dice.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(540deg) scale(1.3)', offset: .6 }, { transform: 'rotate(720deg)' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
      show(pickNext(), true);
    });
    $('.drop__close', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // backdrop click
  }

})();
