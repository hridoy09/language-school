(() => {
  'use strict';
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Batch layout measurements and wait for user scrolling to finish. Never refresh
  // synchronously from an accordion event, image load, or a navigation click.
  let refreshTimer;
  let lastScroll = -1000;
  let refreshPending = false;
  window.addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  const requestRefresh = () => {
    refreshPending = true;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (performance.now() - lastScroll < 220 || ScrollTrigger.isScrolling()) {
        requestRefresh();
        return;
      }
      refreshPending = false;
      ScrollTrigger.refresh(true);
    }, 250);
  };
  window.schoolMotion = { refresh: requestRefresh };

  // Keep the accessible heading intact while animating a visual copy of its words.
  $$('main h2, .footer-top h2').forEach(heading => {
    if (heading.classList.contains('motion-heading')) return;
    const label = heading.cloneNode(true);
    $$('br', label).forEach(br => br.replaceWith(' '));
    heading.setAttribute('aria-label', label.textContent.replace(/\s+/g, ' ').trim());
    heading.classList.add('motion-heading');
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    while (heading.firstChild) visual.appendChild(heading.firstChild);
    heading.appendChild(visual);
    const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word => {
        if (!word.trim()) { fragment.appendChild(document.createTextNode(word)); return; }
        const mask = document.createElement('span');
        mask.className = 'word-mask';
        const inner = document.createElement('span');
        inner.className = 'motion-word';
        inner.textContent = word;
        mask.appendChild(inner);
        fragment.appendChild(mask);
      });
      node.replaceWith(fragment);
    });
  });

  const seen = new WeakSet();
  let introduced = false;
  let ribbonPaused = false;
  const media = gsap.matchMedia();
  media.add({ desktop: '(min-width: 901px)', fine: '(hover: hover) and (pointer: fine)', motion: '(prefers-reduced-motion: no-preference)' }, context => {
    if (!context.conditions.motion) return;
    const { desktop, fine } = context.conditions;
    const cleanups = [];
    const childContexts = [];
    const hoverTargets = new Set();
    const bind = (element, type, handler) => {
      if (!element) return;
      element.addEventListener(type, handler);
      cleanups.push(() => element.removeEventListener(type, handler));
    };

    // Content starts visible. Create a reveal only when its element is actually
    // visible in both axes, including portraits inside the horizontal slider.
    const callbacks = new WeakMap();
    const runReveal = element => {
      if (seen.has(element)) return;
      seen.add(element);
      if (element.contains(document.activeElement)) return;
      const callback = callbacks.get(element);
      if (callback) childContexts.push(gsap.context(callback));
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { observer.unobserve(entry.target); runReveal(entry.target); }
      });
    }, { threshold: .08 }) : null;
    const reveal = (element, callback) => {
      if (!element || seen.has(element)) return;
      callbacks.set(element, callback);
      if (observer) observer.observe(element);
      else runReveal(element);
    };

    if (!introduced && window.scrollY < 100) {
      // Hero content stays separate from the Three.js background scene.
      const intro = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } });
      intro.from('#hero .hero-eyebrow', { y: 18, autoAlpha: 0, duration: .6, clearProps: 'transform,opacity,visibility' }, 0)
        .from('#hero .t', { y: 48, autoAlpha: 0, stagger: .12, duration: 1.05, clearProps: 'transform,opacity,visibility' }, .12)
        .from('#girl', { y: 40, autoAlpha: 0, duration: 1.3, ease: 'power4.out', clearProps: 'transform,opacity,visibility' }, .4)
        .from('#hero .fade', { y: 30, autoAlpha: 0, stagger: .12, duration: .8, clearProps: 'transform,opacity,visibility' }, .65)
        .from('#card', { y: 25, autoAlpha: 0, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }, .85)
        .from('#flag', { x: 25, autoAlpha: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }, 1.05);
      const ring = $('#ring');
      if (ring) {
        const length = ring.getTotalLength();
        intro.fromTo(ring, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, .7);
      }
    }
    introduced = true;

    $$('.motion-heading').forEach(heading => reveal(heading, () => {
      gsap.fromTo($$('.motion-word', heading), { yPercent: 110, rotation: 3 }, { yPercent: 0, rotation: 0, duration: .85, stagger: .035, ease: 'power4.out', clearProps: 'transform' });
      const emphasis = $('em', heading);
      if (emphasis) gsap.fromTo(emphasis, { '--accent-size': '0%' }, { '--accent-size': '100%', duration: .9, delay: .2, ease: 'power2.out' });
    }));
    const programs = $('.program-window');
    reveal(programs, () => {
      gsap.from($$('.pcard', programs), { y: desktop ? 52 : 24, autoAlpha: 0, scale: .96, duration: .9, stagger: .12, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      gsap.from($$('.pcard .ic', programs), { scale: .8, rotation: -20, duration: .65, stagger: .1, delay: .15, ease: 'back.out(1.4)', clearProps: 'transform' });
    });
    $$('.step-card').forEach(card => reveal(card, () => {
      gsap.timeline().from(card, { y: 45, autoAlpha: 0, rotation: desktop ? -2 : 0, duration: .85, ease: 'power3.out', clearProps: 'transform,opacity,visibility' })
        .from($('.step-number', card), { scale: .6, rotation: -30, duration: .6, ease: 'back.out(1.5)', clearProps: 'transform' }, '-=.5');
    }));
    $$('#coaches .cc').forEach(card => reveal(card, () => {
      gsap.timeline().fromTo($('.ph', card), { clipPath: 'inset(70% 0 0 0 round 30px)' }, { clipPath: 'inset(0% 0 0 0 round 30px)', duration: .9, ease: 'power3.out', clearProps: 'clipPath' })
        .from($('img', card), { scale: 1.12, duration: 1.1, ease: 'power3.out', clearProps: 'transform' }, 0)
        .from($$('h3, small', card), { y: 12, autoAlpha: 0, duration: .6, stagger: .08, clearProps: 'transform,opacity,visibility' }, .35);
    }));
    reveal($('.plans-grid'), () => {
      $$('.plan-card').forEach((card, i) => gsap.from(card, { y: i === 1 ? 55 : 30, autoAlpha: 0, rotation: desktop ? (i - 1) * 4 : 0, scale: .96, duration: .9, delay: i * .1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }));
    });
    $$('.review-card').forEach(card => reveal(card, () => {
      gsap.from(card, { y: 35, autoAlpha: 0, rotation: desktop ? -2 : 0, duration: .85, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      gsap.from($('.quote-mark', card), { scale: .5, rotation: -20, duration: .65, delay: .15, ease: 'back.out(1.5)', clearProps: 'transform' });
    }));
    $$('#about .checks, #about .stats, .faq-list, .trial-form, .footer-grid').forEach(group => reveal(group, () => {
      gsap.from(Array.from(group.children), { y: 22, autoAlpha: 0, duration: .75, stagger: .06, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    }));
    // Image wipes and copy entrances complement the section sculptures.
    reveal($('.abox'), () => {
      gsap.fromTo($('.about-photo'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.15, ease: 'power4.inOut', clearProps: 'clipPath' });
    });
    $$('#about .lead, #about .image-note, .head > .lead, .demo-note, .faq-heading > p, .faq-contact, .trial-copy > p, .footer-invitation').forEach(element => reveal(element, () => {
      gsap.from(element, { y: 20, autoAlpha: 0, duration: .8, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    }));
    reveal($('.trial-photo'), () => {
      gsap.fromTo($('.trial-photo'), { clipPath: 'inset(18% 0 0 0 round 28px)' }, { clipPath: 'inset(0% 0 0 0 round 28px)', duration: 1.05, ease: 'power3.out', clearProps: 'clipPath' });
    });
    reveal($('.footer-wordmark'), () => {
      gsap.from($('.footer-wordmark'), { x: -35, autoAlpha: 0, duration: 1.1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    });
    $$('.sec').forEach(section => {
      gsap.fromTo(section, { '--section-line': 0 }, { '--section-line': 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top 95%', end: 'top 45%', scrub: .6 } });
    });
    $$('.n, #cnt').forEach(element => reveal(element, () => {
      const count = { value: 0 };
      const target = Number(element.dataset.to || 489);
      gsap.to(count, { value: target, duration: 1.2, ease: 'power2.out', onUpdate: () => { element.textContent = Math.round(count.value); } });
    }));

    // Scrub controls decoration only. Nothing pins, snaps, or writes document scroll.
    gsap.to('.reading-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .15 } });
    gsap.fromTo('.journey-progress span', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#how-it-works', start: 'top 80%', end: 'bottom 65%', scrub: .5 } });
    gsap.fromTo('.about-spark', { rotation: -40 }, { rotation: 100, ease: 'none', scrollTrigger: { trigger: '#about', start: 'top bottom', end: 'bottom top', scrub: .8 } });
    if (desktop) {
      gsap.to('#photo', { yPercent: 8, scale: 1.03, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: .7 } });
      gsap.to('.hero h1', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: .7 } });
      $$('.about-photo, .trial-photo img').forEach(image => gsap.fromTo(image, { yPercent: -3, scale: 1.08 }, { yPercent: 3, scale: 1.08, ease: 'none', scrollTrigger: { trigger: image.parentElement, start: 'top bottom', end: 'bottom top', scrub: .7 } }));
    }

    const ribbon = $('.language-ribbon');
    if (ribbon) {
      const button = $('.ribbon-toggle', ribbon);
      let inView = false;
      const loop = gsap.to($('.ribbon-track', ribbon), { xPercent: -50, duration: 26, ease: 'none', repeat: -1, paused: true });
      const sync = () => {
        if (inView && !document.hidden && !ribbonPaused) loop.play();
        else loop.pause();
        button.setAttribute('aria-pressed', String(ribbonPaused));
        button.setAttribute('aria-label', ribbonPaused ? 'Play language ribbon' : 'Pause language ribbon');
        button.textContent = ribbonPaused ? '▶' : 'Ⅱ';
      };
      if ('IntersectionObserver' in window) {
        const visibility = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); });
        visibility.observe(ribbon);
        cleanups.push(() => visibility.disconnect());
      } else { inView = true; }
      button.hidden = false;
      bind(button, 'click', () => { ribbonPaused = !ribbonPaused; sync(); });
      bind(document, 'visibilitychange', sync);
      sync();
      cleanups.push(() => { button.hidden = true; });
    }

    if (fine) {
      $$('.magnetic-label').forEach(label => {
        hoverTargets.add(label);
        bind(label.parentElement, 'pointermove', event => {
          const bounds = label.parentElement.getBoundingClientRect();
          gsap.to(label, { x: ((event.clientX - bounds.left) / bounds.width - .5) * 10, y: ((event.clientY - bounds.top) / bounds.height - .5) * 6, duration: .3, overwrite: true });
        });
        bind(label.parentElement, 'pointerleave', () => gsap.to(label, { x: 0, y: 0, duration: .5, ease: 'power3.out', overwrite: true }));
      });

    }
    requestRefresh();
    return () => {
      if (observer) observer.disconnect();
      cleanups.forEach(cleanup => cleanup());
      childContexts.forEach(child => child.revert());
      hoverTargets.forEach(target => { gsap.killTweensOf(target); gsap.set(target, { clearProps: 'transform' }); });
      $$('.n, #cnt').forEach(element => { element.textContent = element.dataset.to || '489'; });
    };
  });

  // Loading events can alter metrics, but always use the same deferred refresh.
  if (document.fonts) document.fonts.ready.then(requestRefresh);
  window.addEventListener('load', requestRefresh, { once: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && refreshPending) requestRefresh(); });
})();
