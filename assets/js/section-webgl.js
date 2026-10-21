(() => {
  'use strict';
  const mounts = [...document.querySelectorAll('[data-section-art]')];
  if (!mounts.length) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let cleanup = () => {};
  let generation = 0;

  async function start() {
    const token = ++generation;
    cleanup();
    cleanup = () => {};
    if (motion.matches) return;
    let THREE;
    try { THREE = await import('./vendor/three.module.min.js'); } catch { return; }
    if (token !== generation || motion.matches) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.autoClear = false;
    const canvas = renderer.domElement;
    canvas.className = 'section-effects-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 30);
    camera.position.z = 7.5;
    const material = color => new THREE.MeshStandardMaterial({ color, roughness: .27, metalness: .12 });
    const makeShape = (kind, group) => {
      const add = (geometry, color, scale = 1) => {
        const mesh = new THREE.Mesh(geometry, material(color));
        mesh.scale.setScalar(scale);
        group.add(mesh);
        return mesh;
      };
      const ring = () => new THREE.TorusGeometry(.95, .23, 20, 64);
      switch (kind) {
        case 'orbit': {
          const first = add(ring(), 0x5a1fd8);
          first.rotation.x = .8;
          const second = add(ring(), 0xc6f432, .72);
          second.rotation.set(-.6, .8, .4);
          break;
        }
        case 'flower': {
          const knot = add(new THREE.TorusKnotGeometry(.67, .2, 80, 12, 2, 3), 0xb99aef);
          knot.rotation.x = .4;
          break;
        }
        case 'steps':
          [0, 1, 2].forEach(i => {
            const bead = add(new THREE.SphereGeometry(.39, 20, 16), [0x5a1fd8, 0xb99aef, 0xc6f432][i]);
            bead.position.set((i - 1) * .7, (i - 1) * .47, 0);
          });
          break;
        case 'link': {
          const a = add(ring(), 0xb99aef, .8);
          const b = add(ring(), 0xc6f432, .8);
          a.position.x = -.4;
          b.position.x = .4;
          b.rotation.y = 1.1;
          break;
        }
        case 'stack':
          [0, 1, 2].forEach(i => {
            const disc = add(new THREE.CylinderGeometry(.83, .83, .25, 48), [0x5a1fd8, 0xb99aef, 0xc6f432][i]);
            disc.position.y = (i - 1) * .4;
            disc.rotation.z = -.18;
          });
          group.rotation.x = .35;
          break;
        case 'spark': {
          const star = new THREE.Shape();
          for (let i = 0; i < 16; i++) {
            const angle = i * Math.PI / 8;
            const radius = i % 2 ? .53 : 1.05;
            const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
            if (i) star.lineTo(x, y); else star.moveTo(x, y);
          }
          star.closePath();
          add(new THREE.ExtrudeGeometry(star, { depth: .18, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .08, bevelThickness: .08 }), 0xc6f432);
          break;
        }
        case 'question': {
          const curl = add(new THREE.TorusGeometry(.69, .22, 20, 56, Math.PI * 1.5), 0x5a1fd8);
          curl.rotation.z = -.2;
          curl.position.y = .3;
          const dot = add(new THREE.SphereGeometry(.23, 20, 16), 0xc6f432);
          dot.position.set(.32, -.95, 0);
          break;
        }
        default: {
          add(ring(), 0xc6f432).rotation.set(.45, -.5, -.3);
          const bead = add(new THREE.SphereGeometry(.3, 20, 16), 0xb99aef);
          bead.position.set(1.15, .9, .25);
        }
      }
    };
    const records = mounts.map((mount, index) => {
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2265, 2.8));
      const key = new THREE.DirectionalLight(0xffffff, 4);
      key.position.set(-3, 5, 8);
      scene.add(key);
      const group = new THREE.Group();
      makeShape(mount.dataset.sectionArt, group);
      scene.add(group);
      return { mount, scene, group, phase: index * .7, visible: false, progress: { value: window.gsap ? 0 : 1 }, tween: null, seen: false, scroll: 0 };
    });
    const byMount = new Map(records.map(record => [record.mount, record]));
    let width = innerWidth, height = innerHeight;
    let elapsed = 0, previous = 0, running = false, disposed = false, available = true;
    const pointer = { x: 0, y: 0 };
    const clear = () => {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
      renderer.clear();
    };
    const paint = () => {
      clear();
      records.forEach(record => {
        if (!record.visible) return;
        const rect = record.mount.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= height || !rect.width || !rect.height) return;
        record.scroll = .5 - (rect.top + rect.height / 2) / height;
        const y = height - rect.bottom;
        renderer.setViewport(rect.left, y, rect.width, rect.height);
        renderer.setScissor(rect.left, Math.max(0, y), rect.width, Math.min(height, rect.bottom) - Math.max(0, rect.top));
        renderer.setScissorTest(true);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        const { group, phase } = record;
        group.scale.setScalar(.72 + .28 * record.progress.value);
        group.position.y = Math.sin(elapsed * .65 + phase) * .08;
        group.rotation.y = -.35 + Math.sin(elapsed * .25 + phase) * .3 + pointer.x * .1 + record.scroll * .4;
        group.rotation.z = Math.sin(elapsed * .35 + phase) * .12;
        group.rotation.x = .2 + pointer.y * .06;
        renderer.render(record.scene, camera);
      });
      renderer.setScissorTest(false);
    };
    const frame = now => {
      if (disposed) return;
      if (previous) elapsed += Math.min((now - previous) / 1000, .05);
      previous = now;
      paint();
    };
    const sync = () => {
      const active = available && !document.hidden && records.some(record => record.visible);
      if (active === running) return;
      running = active;
      previous = 0;
      renderer.setAnimationLoop(active ? frame : null);
      if (!active && available) clear();
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const record = byMount.get(entry.target);
        record.visible = entry.isIntersecting;
        if (record.visible && !record.seen) {
          record.seen = true;
          record.tween = window.gsap?.to(record.progress, { value: 1, duration: 1.2, ease: 'power3.out' });
        }
      });
      sync();
    });
    const resize = () => { width = innerWidth; height = innerHeight; renderer.setSize(width, height, false); if (available) paint(); };
    const move = event => {
      if (!fine.matches || event.pointerType === 'touch') return;
      pointer.x = event.clientX / width - .5;
      pointer.y = event.clientY / height - .5;
    };
    const lost = event => { event.preventDefault(); available = false; canvas.style.opacity = '0'; sync(); };
    const restored = () => { available = true; canvas.style.opacity = ''; resize(); sync(); };
    cleanup = () => {
      disposed = true;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      records.forEach(record => {
        record.tween?.kill();
        record.scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
      });
      renderer.dispose();
      canvas.remove();
    };
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    try { resize(); records.forEach(record => observer.observe(record.mount)); } catch { cleanup(); }
  }
  motion.addEventListener('change', start);
  window.addEventListener('pagehide', () => { generation++; cleanup(); });
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
  start();
})();
