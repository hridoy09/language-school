(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
    const canAnimate = () => Boolean(gsap && !reduced.matches);
  const refresh = () => { if (window.schoolMotion) window.schoolMotion.refresh(); };

  // Native scrolling keeps swipe, trackpad and keyboard access working without GSAP.
  const coachSlider = $('#coaches-slider');
  if (coachSlider) {
    const cards = $$('.cc', coachSlider);
    const previous = $('.coach-prev');
    const next = $('.coach-next');
    const status = $('#coach-slider-status');
    let moveTimer;
    let moving = false;
    let dragging = false;
    let pointerStart;
    let scrollStart;
    let pointerId;
    let frame;
    const maximum = () => Math.max(0, coachSlider.scrollWidth - coachSlider.clientWidth);
    const cardPosition = card => card.offsetLeft;
    const update = () => {
      frame = null;
      previous.disabled = coachSlider.scrollLeft <= 2;
      next.disabled = coachSlider.scrollLeft >= maximum() - 2;
      const bounds = coachSlider.getBoundingClientRect();
      const visible = cards.map((card, index) => ({ index, rect: card.getBoundingClientRect() }))
        .filter(({ rect }) => Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left) > rect.width * .5);
      if (visible.length) {
        const text = `Showing coaches ${visible[0].index + 1}–${visible[visible.length - 1].index + 1} of ${cards.length}`;
        if (status.textContent !== text) status.textContent = text;
      }
    };
    const move = target => {
      clearTimeout(moveTimer);
      const destination = Math.max(0, Math.min(maximum(), target));
      moving = !reduced.matches;
      coachSlider.scrollTo({ left: destination, behavior: reduced.matches ? 'instant' : 'smooth' });
      moveTimer = setTimeout(() => { moving = false; update(); }, 750);
    };
    const step = direction => {
      const positions = cards.map(cardPosition);
      const current = coachSlider.scrollLeft;
      const target = direction > 0 ? positions.find(position => position > current + 3) : positions.reverse().find(position => position < current - 3);
      move(target === undefined ? (direction > 0 ? maximum() : 0) : target);
    };
    previous.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    coachSlider.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') move(0);
      else if (event.key === 'End') move(maximum());
      else step(event.key === 'ArrowRight' ? 1 : -1);
    });
    coachSlider.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
    const stopSliding = () => {
      if (moving) coachSlider.scrollTo({ left: coachSlider.scrollLeft, behavior: 'instant' });
      clearTimeout(moveTimer);
      moving = false;
    };
    coachSlider.addEventListener('wheel', stopSliding, { passive: true });
    // Touch uses the browser's native pan. Mouse dragging starts only after an intentional move.
    coachSlider.addEventListener('pointerdown', event => {
      stopSliding();
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pointerId = event.pointerId;
      pointerStart = event.clientX;
      scrollStart = coachSlider.scrollLeft;
    });
    coachSlider.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) return;
      const delta = event.clientX - pointerStart;
      if (!dragging && Math.abs(delta) > 6) {
        dragging = true;
        coachSlider.setPointerCapture(pointerId);
        coachSlider.classList.add('is-dragging');
      }
      if (dragging) { event.preventDefault(); coachSlider.scrollLeft = scrollStart - delta; }
    });
    const finishDrag = event => {
      if (pointerId !== event.pointerId) return;
      dragging = false;
      pointerId = undefined;
      coachSlider.classList.remove('is-dragging');
      if (coachSlider.hasPointerCapture(event.pointerId)) coachSlider.releasePointerCapture(event.pointerId);

    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => coachSlider.addEventListener(type, finishDrag));
    coachSlider.addEventListener('pointerleave', event => { if (!dragging) finishDrag(event); });
    $$('img', coachSlider).forEach(image => { image.draggable = false; });
    cards.forEach((card, index) => card.setAttribute('aria-label', `${index + 1} of ${cards.length}: ${$('h3', card).textContent}`));
    $('.coach-controls').hidden = false;
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(coachSlider);
    else window.addEventListener('resize', update);
    update();
  }

  // Navigation and forms do not depend on animation libraries.
  const menu = $('#mobile-menu');
  const toggle = $('.burger');
  let menuTween;
  function setMenu(open, restoreFocus = false, immediate = false) {
    if (menuTween) menuTween.kill();
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (open) {
      menu.hidden = false;
      menu.inert = false;
      if (canAnimate()) {
        menuTween = gsap.fromTo(menu, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .3, ease: 'power2.out', clearProps: 'height,opacity' });
        gsap.fromTo($$('a', menu), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .3, stagger: .025, clearProps: 'transform,opacity' });
      }
    } else {
      menu.inert = true;
      const finish = () => { menu.hidden = true; menu.style.height = ''; menu.style.opacity = ''; };
      if (canAnimate() && !immediate && !menu.hidden) menuTween = gsap.to(menu, { height: 0, opacity: 0, duration: .22, onComplete: finish });
      else finish();
    }
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) setMenu(false, true); });
  document.addEventListener('click', event => { if (!menu.hidden && !event.target.closest('.site-header')) setMenu(false); });

  reduced.addEventListener('change', () => { if (reduced.matches) { setMenu(false, false, true); gsap?.killTweensOf('#trial-result, .faq-list details p'); } });

  const form = $('#trial-form');
  const result = $('#trial-result');
  $$('[data-plan], [data-language]').forEach(link => link.addEventListener('click', () => {
    if (link.dataset.plan) form.elements.plan.value = link.dataset.plan;
    if (link.dataset.language) form.elements.language.value = link.dataset.language;
    result.hidden = true;
  }));
  form.addEventListener('input', () => { result.hidden = true; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const notes = String(data.get('notes') || '').trim();
    result.textContent = `Your demo trial request is ready, ${String(data.get('parentName')).trim()}!\n\nLanguage: ${data.get('language')}\nAge: ${data.get('age')}\nGroup: ${data.get('plan') || 'Help me choose'}\nEmail: ${data.get('email')}${notes ? '\nNotes: ' + notes : ''}\n\nDemo only — no booking has been made and no details have been sent or saved.`;
    result.hidden = false;
    result.focus({ preventScroll: true });
    if (canAnimate()) gsap.fromTo(result, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .3, clearProps: 'opacity,transform', onComplete: refresh });
  });
  // Native details change layout once; refresh only after the interaction settles.
  $$('.faq-list details').forEach(details => details.addEventListener('toggle', () => {
    if (details.open && canAnimate()) gsap.fromTo($('p', details), { opacity: .3, y: -6 }, {
      opacity: 1, y: 0, duration: .3, overwrite: 'auto', clearProps: 'opacity,transform'
    });
    refresh();
  }));
  // Smooth only deliberate anchor navigation. Ordinary document scrolling stays native.
  $$('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    setMenu(false, false, true);
    target.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
    // Embedded srcdoc previews cannot write a URL into the parent page's history.
    if (window.location.protocol !== 'about:' && window.location.hash !== '#' + id) window.history.pushState(null, '', '#' + id);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));
  $('#newsletter-form').addEventListener('submit', event => {
    event.preventDefault();
    $('#newsletter-status').textContent = 'Demo preview only. Your email has not been sent or saved.';
    refresh();
  });
  if ('IntersectionObserver' in window) {
    const links = $$('.site-header a[href^="#"]');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => {
        const active = link.getAttribute('href') === '#' + entry.target.id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }), { rootMargin: '-20% 0px -55% 0px' });
    $$('section[id]').forEach(section => observer.observe(section));
  }

})();
