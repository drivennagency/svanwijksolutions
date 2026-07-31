document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     0. TAAL DETECTEREN UIT HET PAD
     /eng/... -> 'en', /de/... -> 'de', anders -> 'nl'
     (De Engelse URL-map heet 'eng', niet 'en')
  ============================================================ */
  const detectLang = () => {
    const m = window.location.pathname.match(/^\/(eng|de)(\/|$)/);
    if (!m) return 'nl';
    return m[1] === 'eng' ? 'en' : m[1];
  };
  const currentLang = detectLang();

  /* ============================================================
     1. LAAD HEADER & FOOTER
     Pagina's die al server-side van een header/footer zijn voorzien
     (de nieuwe meertalige pagina's) slaan de fetch over — dat scheelt
     een verzoek en werkt zelfs zonder JavaScript. Oudere pagina's die
     nog een lege placeholder hebben, halen de NL-componenten op zoals
     voorheen.
  ============================================================ */
  const loadComponents = async () => {
    // Wacht één microtask, zodat alle functies verderop in dit bestand
    // (setActiveNavLink, initMobileMenu, enz.) gegarandeerd al zijn
    // gedefinieerd voordat we ze hieronder aanroepen. Zonder deze regel
    // gooit de synchrone tak (already-filled pagina's) een fout, omdat
    // die functies verderop in het bestand pas worden toegekend.
    await Promise.resolve();

    const headerEl = document.getElementById('header-placeholder');
    const footerEl = document.getElementById('footer-placeholder');

    const headerAlreadyFilled = headerEl && headerEl.children.length > 0;
    const footerAlreadyFilled = footerEl && footerEl.children.length > 0;

    if (headerAlreadyFilled || footerAlreadyFilled) {
      setActiveNavLink();
      initMobileMenu();
      initStickyHeader();
      initLanguageSwitcher();
      const yr = document.getElementById('footer-year');
      if (yr) yr.textContent = new Date().getFullYear();
      return;
    }

    try {
      const suffix = currentLang === 'nl' ? '' : '-' + currentLang;
      const [hRes, fRes] = await Promise.all([
        fetch('/components/header' + suffix + '.html'),
        fetch('/components/footer' + suffix + '.html')
      ]);
      if (!hRes.ok || !fRes.ok) throw new Error('Component niet gevonden');

      const [hHTML, fHTML] = await Promise.all([hRes.text(), fRes.text()]);
      if (headerEl) headerEl.innerHTML = hHTML;
      if (footerEl) footerEl.innerHTML = fHTML;

      setActiveNavLink();
      initMobileMenu();
      initStickyHeader();
      initLanguageSwitcher();

      const yr = document.getElementById('footer-year');
      if (yr) yr.textContent = new Date().getFullYear();

    } catch (err) {
      console.error('Fout bij laden componenten:', err);
    }
  };

  loadComponents();


  /* ============================================================
     2. ACTIEVE NAV-LINK
     Vergelijkt het huidige bestandsnaam met data-page attribuut
  ============================================================ */
  const setActiveNavLink = () => {
    // Haal bestandsnaam op, strip .html, fallback naar 'index'
    const path = window.location.pathname;
    const file = path.split('/').pop().replace('.html', '') || 'index';

    document.querySelectorAll('.nav__links a[data-page]').forEach(link => {
      const page = link.dataset.page;
      if (page === file) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  };


  /* ============================================================
     3. MOBIEL HAMBURGERMENU
  ============================================================ */
  const initMobileMenu = () => {
    const tryInit = (attempts = 0) => {
      const burger   = document.querySelector('.nav__burger');
      const overlay  = document.querySelector('.mobile-overlay');
      const closeBtn = document.querySelector('.mobile-overlay__close');
      const links    = document.querySelectorAll('.mobile-overlay a');

      if (!burger || !overlay) {
        if (attempts < 10) setTimeout(() => tryInit(attempts + 1), 50);
        return;
      }

      const open  = () => { overlay.classList.add('active');    burger.setAttribute('aria-expanded', 'true');  document.body.style.overflow = 'hidden'; };
      const close = () => { overlay.classList.remove('active'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';       };

      burger.addEventListener('click', open);
      if (closeBtn) closeBtn.addEventListener('click', close);
      links.forEach(l => l.addEventListener('click', close));
      overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    };
    tryInit();
  };



  /* ============================================================
     4. STICKY HEADER SCHADUW
  ============================================================ */
  const initStickyHeader = () => {
    const tryInit = (attempts = 0) => {
      const header = document.querySelector('header');
      if (!header) {
        if (attempts < 10) setTimeout(() => tryInit(attempts + 1), 50);
        return;
      }
      window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
      }, { passive: true });
    };
    tryInit();
  };


  /* ============================================================
     4b. TAALWISSELAAR
     Navigeert naar dezelfde pagina onder een ander taalprefix
     (/pagina.html <-> /en/pagina.html <-> /de/pagina.html).
     Let op: een taalversie die nog niet bestaat geeft een 404 —
     dat is verwacht zolang niet alle pagina's vertaald zijn.
  ============================================================ */
  const navigateToLanguage = (targetLang) => {
    const path = window.location.pathname;
    let rest = path.replace(/^\/(eng|de)(\/|$)/, '/');
    if (rest === '' || rest === '/') rest = '/index.html';
    const URL_SLUG = { nl: '', en: '/eng', de: '/de' };
    const prefix = URL_SLUG[targetLang] !== undefined ? URL_SLUG[targetLang] : '';
    window.location.href = prefix + rest;
  };

  const initLanguageSwitcher = () => {
    const wrap    = document.querySelector('.lang-switch');
    const current = document.querySelector('.lang-switch__current');
    if (wrap && current) {
      current.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = wrap.classList.toggle('open');
        current.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) {
          wrap.classList.remove('open');
          current.setAttribute('aria-expanded', 'false');
        }
      });
    }

    document.querySelectorAll('[data-lang]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToLanguage(link.dataset.lang);
      });
    });
  };


  /* ============================================================
     5. REVEAL ON SCROLL
  ============================================================ */
  const initReveal = () => {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  };
  setTimeout(initReveal, 100);

  /* Iconen buiten een .reveal-blok (bijv. in de hero) tekenen zichzelf
     gewoon in bij het laden van de pagina, met een lichte vertraging per icoon. */
  document.querySelectorAll('.icon-svg').forEach((el, i) => {
    if (!el.closest('.reveal')) {
      setTimeout(() => el.classList.add('icon-svg--drawn'), 300 + i * 80);
    }
  });


  /* ============================================================
     6. TYPEWRITER EFFECT (alleen homepage)
  ============================================================ */
  const twEl = document.getElementById('typewriter');
  if (twEl) {
    // Gebruikt de vertaalde zinnen die de pagina zelf meegeeft
    // (window.__TYPEWRITER_PHRASES__), met de NL-lijst als terugval.
    const phrases = window.__TYPEWRITER_PHRASES__ || ['Moderne Websites', 'Sterke Logo\u2019s', 'Converterende Landingspagina\u2019s', 'SEO Succes', 'Website Redesigns', 'Maatwerk Code'];
    let i = 0, j = 0, deleting = false;
    const type = () => {
      const cur = phrases[i];
      twEl.textContent = deleting ? cur.substring(0, j - 1) : cur.substring(0, j + 1);
      deleting ? j-- : j++;
      if (!deleting && j === cur.length) { deleting = true; setTimeout(type, 1800); return; }
      if (deleting && j === 0)           { deleting = false; i = (i + 1) % phrases.length; }
      setTimeout(type, deleting ? 70 : 130);
    };
    type();
  }


  /* ============================================================
     7. COUNTER ANIMATIE (homepage stats)
  ============================================================ */
  const counterEls = document.querySelectorAll('[data-count]');
  if (counterEls.length) {
    const animate = el => {
      const target = parseFloat(el.dataset.count);
      const dec    = el.dataset.count.includes('.') ? 1 : 0;
      const suffix = el.dataset.suffix || '';
      let cur = 0;
      const step = target / 60;
      const upd = () => {
        cur = Math.min(cur + step, target);
        el.textContent = (dec ? cur.toFixed(1) : Math.floor(cur)) + suffix;
        if (cur < target) requestAnimationFrame(upd);
      };
      requestAnimationFrame(upd);
    };
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); } });
    }, { threshold: 0.5 });
    counterEls.forEach(el => obs.observe(el));
  }


  /* ============================================================
     8. HOVER-TILT OP EXPERTISE-KAARTEN (3D effect)
  ============================================================ */
  const initCardTilt = () => {
    const cards = document.querySelectorAll('.exp-card');
    if (!cards.length) return;
    // Niet op touch-apparaten (geen muis)
    if (window.matchMedia('(hover: none)').matches) return;

    const MAX = 7; // max graden kanteling
    cards.forEach(card => {
      // Voeg glow-laag toe als die er nog niet is
      if (!card.querySelector('.exp-card__glow')) {
        const glow = document.createElement('span');
        glow.className = 'exp-card__glow';
        card.insertBefore(glow, card.firstChild);
      }
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;   // 0..1
        const py = (e.clientY - r.top) / r.height;   // 0..1
        const rx = (py - 0.5) * -2 * MAX;
        const ry = (px - 0.5) *  2 * MAX;
        card.style.transform = `translateY(-6px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  };
  setTimeout(initCardTilt, 200);


  /* ============================================================
     9. HERO-PODIUM — zachte glow volgt de cursor (lichtgewicht)
  ============================================================ */
  const initHeroStage = () => {
    const stage = document.getElementById('heroStage');
    const glow  = document.getElementById('heroGlow');
    if (!stage || !glow) return;
    if (window.matchMedia('(hover: none)').matches) return; // niet op touch
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 60;
      const y = ((e.clientY - r.top)  / r.height - 0.5) * 60;
      glow.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    });
    stage.addEventListener('pointerleave', () => {
      glow.style.transform = 'translate(-50%, -50%)';
    });
  };
  initHeroStage();


  /* ============================================================
     10. TESTIMONIALS MARQUEE
     Vult de rij maar een enkele (of te weinig) testimonials de
     breedte van het scherm niet, toon ze dan gewoon statisch en
     gecentreerd. Pas zodra de kaarten de volledige rij vullen en
     dus overlopen, verdubbelen we de set en start de doorlopende
     beweging (naadloze loop via translateX(-50%), dus altijd
     precies twee identieke helften).
  ============================================================ */
  const initTestimonialsMarquee = () => {
    const viewport = document.querySelector('.testimonials-marquee__viewport');
    const track = document.getElementById('testimonialsTrack');
    if (!viewport || !track) return;

    const originals = Array.from(track.children);
    if (!originals.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layout = () => {
      track.innerHTML = '';
      originals.forEach(c => track.appendChild(c.cloneNode(true)));

      const fits = reducedMotion || track.scrollWidth <= viewport.clientWidth;
      if (fits) {
        track.classList.remove('testimonials-marquee__track--scrolling');
        viewport.classList.add('testimonials-marquee__viewport--static');
        return;
      }

      viewport.classList.remove('testimonials-marquee__viewport--static');
      while (track.scrollWidth < viewport.clientWidth * 2) {
        originals.forEach(c => track.appendChild(c.cloneNode(true)));
      }
      track.classList.add('testimonials-marquee__track--scrolling');
    };

    layout();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 200);
    });
  };
  initTestimonialsMarquee();

});