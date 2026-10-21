(() => {
  'use strict';
  const hero = document.querySelector('#hero');
  const mount = document.querySelector('#hero-scene');
  if (!hero || !mount) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let teardown = () => {};
  let generation = 0;

  async function start() {
    const current = ++generation;
    teardown();
    teardown = () => {};
    if (motion.matches) return;

    // Load the local renderer only for visitors who allow motion.
    let THREE;
    try { THREE = await import('./vendor/three.module.min.js'); }
    catch { return; }
    if (current !== generation || motion.matches) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, .1, 60);
    camera.position.z = 20;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x361274, 2.6));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(-4, 7, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xcbb5ff, 3);
    rim.position.set(6, -2, 4);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);
    const material = color => new THREE.MeshStandardMaterial({ color, roughness: .27, metalness: .12 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, .39, 24, 96), material(0xc6f432));
    const curl = new THREE.Mesh(new THREE.TorusGeometry(.69, .2, 20, 64, Math.PI * 1.55), material(0xb99aef));
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(.24, 24, 16), material(0xfff5dd));
    group.add(ring, curl, pearl);

    let width = 0;
    let height = 0;
    let mobile = false;
    let inView = false;
    let disposed = false;
    let contextAvailable = true;
    let elapsed = 0;
    let previous = 0;
    const pointer = { x: 0, y: 0 };
    const entrance = { value: window.gsap ? 0 : 1 };
    const entranceTween = window.gsap?.to(entrance, { value: 1, duration: 1.7, delay: .2, ease: 'power3.out' });

    const resize = () => {
      width = hero.clientWidth;
      height = hero.clientHeight;
      if (!width || !height) return;
      mobile = width < 900;
      const aspect = width / height;
      camera.left = -5 * aspect;
      camera.right = 5 * aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      ring.scale.setScalar(mobile ? .66 : 1);
      ring.position.set(mobile ? 0 : aspect * 2.6, mobile ? -3.2 : -.75, 0);
      curl.scale.setScalar(mobile ? .65 : 1);
      curl.position.set(mobile ? aspect * 3.1 : aspect * 3.7, mobile ? -1.5 : 3.65, -1);
      pearl.position.set(mobile ? -aspect * 3.1 : aspect * .8, mobile ? -3.8 : -3.45, 1);
      draw();
    };
    function draw() {
      if (disposed || !width || !height) return;
      const sway = Math.sin(elapsed * .4);
      group.scale.setScalar(.86 + entrance.value * .14);
      group.rotation.y += (pointer.x * .045 - group.rotation.y) * .045;
      group.rotation.x += (-pointer.y * .03 - group.rotation.x) * .045;
      ring.rotation.set(.3 + Math.sin(elapsed * .24) * .09, -.35 + sway * .12, -.42 + sway * .045);
      curl.rotation.set(.45, -.4 + elapsed * .065, -.65);
      pearl.position.y = (mobile ? -3.8 : -3.45) + Math.sin(elapsed * .7) * .12;
      renderer.render(scene, camera);
    }
    function frame(now) {
      if (previous) elapsed += Math.min((now - previous) / 1000, .05);
      previous = now;
      draw();
    }
    const sync = () => {
      previous = 0;
      renderer.setAnimationLoop(inView && !document.hidden && contextAvailable ? frame : null);
    };
    const move = event => {
      if (!finePointer.matches || event.pointerType === 'touch') return;
      const bounds = hero.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
      pointer.y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    };
    const leave = () => { pointer.x = 0; pointer.y = 0; };
    const lost = event => {
      event.preventDefault();
      contextAvailable = false;
      hero.classList.remove('has-webgl');
      renderer.setAnimationLoop(null);
    };
    const restored = () => { contextAvailable = true; draw(); hero.classList.add('has-webgl'); sync(); };
    const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); });
    const sizeObserver = new ResizeObserver(resize);
    const stop = () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      entranceTween?.kill();
      observer.disconnect();
      sizeObserver.disconnect();
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      [ring, curl, pearl].forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
      renderer.dispose();
      canvas.remove();
      hero.classList.remove('has-webgl');
    };
    teardown = stop;
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    try {
      resize();
      hero.classList.add('has-webgl');
      observer.observe(hero);
      sizeObserver.observe(hero);
    } catch { stop(); }
  }
  motion.addEventListener('change', start);
  window.addEventListener('pagehide', () => { generation++; teardown(); });
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
  start();
})();
