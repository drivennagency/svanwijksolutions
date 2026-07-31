document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-case-compare]').forEach((frame) => {
    const handle = frame.querySelector('[data-case-handle]');
    if (!handle) return;

    let dragging = false;

    function setSplit(clientX) {
      const rect = frame.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      frame.style.setProperty('--split', pct + '%');
    }

    function onDown(e) {
      dragging = true;
      frame.classList.add('is-dragging');
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setSplit(x);
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setSplit(x);
    }
    function onUp() {
      dragging = false;
      frame.classList.remove('is-dragging');
    }

    handle.addEventListener('mousedown', onDown);
    frame.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    handle.addEventListener('touchstart', onDown, { passive: false });
    frame.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);

    handle.setAttribute('role', 'slider');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.setAttribute('aria-valuenow', '50');
    handle.addEventListener('keydown', (e) => {
      const current = parseFloat(frame.style.getPropertyValue('--split')) || 50;
      if (e.key === 'ArrowLeft') { frame.style.setProperty('--split', Math.max(0, current - 5) + '%'); }
      if (e.key === 'ArrowRight') { frame.style.setProperty('--split', Math.min(100, current + 5) + '%'); }
    });
  });
});
