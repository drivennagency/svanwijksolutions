import createGlobe from 'https://cdn.jsdelivr.net/npm/cobe@0.6.3/+esm';

document.querySelectorAll('#worldGlobe').forEach((canvas) => {
  const wrap = canvas.closest('.globe-hero__canvas-wrap');
  if (!wrap) return;

  let width = 0;
  let phi = 0;
  let pointerInteracting = null;
  let pointerMovement = 0;

  const onResize = () => { width = wrap.offsetWidth; };
  window.addEventListener('resize', onResize);
  onResize();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const globe = createGlobe(canvas, {
    devicePixelRatio: 2,
    width: width * 2,
    height: width * 2,
    phi: 0,
    theta: 0.3,
    dark: 1,
    diffuse: 0.4,
    mapSamples: 14000,
    mapBrightness: 4,
    baseColor: [0.26, 0.29, 0.36],
    markerColor: [0.39, 0.6, 1],
    glowColor: [0.18, 0.28, 0.55],
    markers: [
      { location: [52.0705, 4.3007], size: 0.09 },   // Westland / Den Haag (thuisbasis)
      { location: [40.7128, -74.006], size: 0.07 },  // New York
      { location: [51.5074, -0.1278], size: 0.06 },  // Londen
      { location: [35.6762, 139.6503], size: 0.06 }, // Tokio
      { location: [1.3521, 103.8198], size: 0.05 },  // Singapore
      { location: [-33.8688, 151.2093], size: 0.05 } // Sydney
    ],
    onRender: (state) => {
      if (pointerInteracting === null && !reduceMotion) phi += 0.005;
      state.phi = phi + pointerMovement / 200;
      state.width = width * 2;
      state.height = width * 2;
    }
  });

  requestAnimationFrame(() => { canvas.classList.add('is-visible'); });

  const updateMovement = (clientX) => {
    if (pointerInteracting !== null) pointerMovement = clientX - pointerInteracting;
  };

  canvas.addEventListener('pointerdown', (e) => {
    pointerInteracting = e.clientX - pointerMovement;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', () => {
    pointerInteracting = null;
    canvas.style.cursor = 'grab';
  });
  window.addEventListener('pointermove', (e) => updateMovement(e.clientX));
  canvas.addEventListener('touchmove', (e) => { if (pointerInteracting !== null) updateMovement(e.touches[0].clientX); }, { passive: true });
});
