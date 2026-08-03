/* ============================================================
   GEDEELD FORMULIER SCRIPT (taalbewust)
   Gebruik op: contact.html en start.html, in alle 3 talen
   Vereisten:  - <form id="contactForm">
               - <button id="submitBtn">
               Injecteert automatisch de success-overlay in de <body>
============================================================ */

(() => {
  /* ── 0. Taal detecteren uit het pad ── */
  const detectLang = () => {
    const m = window.location.pathname.match(/^\/(eng|de)(\/|$)/);
    if (!m) return 'nl';
    return m[1] === 'eng' ? 'en' : m[1];
  };
  const lang = detectLang();

  const TEXTS = {
    nl: {
      overlayLabel: 'Bericht verzonden',
      close: 'Sluiten ✕',
      lines: [
        { t: '> Aanvraag verzonden...',              cls: null,    ms: 0    },
        { t: '\n',                                   cls: null,    ms: 600  },
        { t: 'const result = {',                     cls: null,    ms: 700  },
        { t: '\n  status:  ',                        cls: null,    ms: 900  },
        { t: '"✅ Succesvol"',                        cls: 's-str', ms: 1050 },
        { t: ',\n  ontvangen: ',                     cls: null,    ms: 1200 },
        { t: '"Ja, direct"',                         cls: 's-str', ms: 1380 },
        { t: ',\n  reactie:   ',                     cls: null,    ms: 1560 },
        { t: '"Binnen 24 uur"',                      cls: 's-str', ms: 1740 },
        { t: ',\n  team:      ',                     cls: null,    ms: 1920 },
        { t: '"S. van Wijk Solutions"',              cls: 's-fn',  ms: 2100 },
        { t: '\n};',                                 cls: null,    ms: 2300 },
        { t: '\n\n// 🚀 Wij nemen zo snel mogelijk contact op!', cls: 's-cmt', ms: 2520 },
      ],
      sending: 'Verzenden…',
      errorServer: 'Er ging iets mis. Probeer het opnieuw of mail ons op info@svanwijksolutions.nl',
      errorConnection: 'Geen verbinding. Controleer je internet en probeer het opnieuw.',
    },
    en: {
      overlayLabel: 'Message sent',
      close: 'Close ✕',
      lines: [
        { t: '> Request sent...',                    cls: null,    ms: 0    },
        { t: '\n',                                   cls: null,    ms: 600  },
        { t: 'const result = {',                     cls: null,    ms: 700  },
        { t: '\n  status:   ',                       cls: null,    ms: 900  },
        { t: '"✅ Successful"',                       cls: 's-str', ms: 1050 },
        { t: ',\n  received: ',                      cls: null,    ms: 1200 },
        { t: '"Yes, instantly"',                     cls: 's-str', ms: 1380 },
        { t: ',\n  response:  ',                     cls: null,    ms: 1560 },
        { t: '"Within 24 hours"',                    cls: 's-str', ms: 1740 },
        { t: ',\n  team:      ',                     cls: null,    ms: 1920 },
        { t: '"S. van Wijk Solutions"',              cls: 's-fn',  ms: 2100 },
        { t: '\n};',                                 cls: null,    ms: 2300 },
        { t: '\n\n// 🚀 We\'ll get in touch as soon as possible!', cls: 's-cmt', ms: 2520 },
      ],
      sending: 'Sending…',
      errorServer: 'Something went wrong. Please try again or email us at info@svanwijksolutions.nl',
      errorConnection: 'No connection. Please check your internet and try again.',
    },
    de: {
      overlayLabel: 'Nachricht gesendet',
      close: 'Schließen ✕',
      lines: [
        { t: '> Anfrage gesendet...',                cls: null,    ms: 0    },
        { t: '\n',                                   cls: null,    ms: 600  },
        { t: 'const result = {',                     cls: null,    ms: 700  },
        { t: '\n  status:    ',                      cls: null,    ms: 900  },
        { t: '"✅ Erfolgreich"',                      cls: 's-str', ms: 1050 },
        { t: ',\n  empfangen: ',                     cls: null,    ms: 1200 },
        { t: '"Ja, sofort"',                         cls: 's-str', ms: 1380 },
        { t: ',\n  antwort:   ',                     cls: null,    ms: 1560 },
        { t: '"Innerhalb von 24 Std."',              cls: 's-str', ms: 1740 },
        { t: ',\n  team:      ',                     cls: null,    ms: 1920 },
        { t: '"S. van Wijk Solutions"',              cls: 's-fn',  ms: 2100 },
        { t: '\n};',                                 cls: null,    ms: 2300 },
        { t: '\n\n// 🚀 Wir melden uns so schnell wie möglich!', cls: 's-cmt', ms: 2520 },
      ],
      sending: 'Wird gesendet…',
      errorServer: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut oder schreiben Sie uns an info@svanwijksolutions.nl',
      errorConnection: 'Keine Verbindung. Überprüfen Sie Ihr Internet und versuchen Sie es erneut.',
    },
  };

  const T = TEXTS[lang] || TEXTS.nl;

  /* ── 1. Bouw success-overlay HTML en injecteer in body ── */
  const overlayHTML = `
    <div class="success-overlay" id="successOverlay" role="dialog" aria-modal="true" aria-label="${T.overlayLabel}">
      <div class="success-card">
        <div class="success-dots"><span></span><span></span><span></span></div>
        <pre class="success-pre" id="successPre"><span class="s-cursor"></span></pre>
        <button class="success-close" id="successClose">${T.close}</button>
      </div>
    </div>`;

  const overlayStyles = `
    <style id="form-overlay-styles">
      .success-overlay {
        display:none; position:fixed; inset:0;
        background:rgba(30,27,75,.72);
        backdrop-filter:blur(6px);
        z-index:2000; align-items:center; justify-content:center;
      }
      .success-overlay.show { display:flex; }
      .success-card {
        background:#0f172a;
        border:1px solid rgba(255,255,255,.12);
        border-radius:18px; padding:38px 42px;
        max-width:480px; width:90%;
        box-shadow:0 30px 80px rgba(0,0,0,.5);
        animation:popIn .4s cubic-bezier(.175,.885,.32,1.275);
      }
      @keyframes popIn { from{transform:scale(.85);opacity:0} to{transform:scale(1);opacity:1} }
      .success-dots { display:flex; gap:7px; margin-bottom:16px; }
      .success-dots span { width:11px; height:11px; border-radius:50%; }
      .success-dots span:nth-child(1){background:#ff5f56;}
      .success-dots span:nth-child(2){background:#ffbd2e;}
      .success-dots span:nth-child(3){background:#27c93f;}
      .success-pre {
        font-family:'Courier New',monospace; font-size:.9rem;
        line-height:1.8; color:rgba(255,255,255,.9);
        white-space:pre-wrap; min-height:160px;
      }
      .success-pre .s-kw  { color:#818cf8; }
      .success-pre .s-str { color:#86efac; }
      .success-pre .s-fn  { color:#fde68a; }
      .success-pre .s-cmt { color:#64748b; }
      .s-cursor {
        display:inline-block; width:9px; height:1.1em;
        background:#818cf8; vertical-align:text-bottom;
        animation:s-blink .7s step-end infinite; margin-left:2px;
      }
      @keyframes s-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      .success-close {
        margin-top:22px; background:#6366f1; color:#fff;
        border:none; padding:12px 28px; border-radius:8px;
        font-family:'Poppins',sans-serif; font-weight:700;
        font-size:.9rem; cursor:pointer; transition:background .3s;
        display:none;
      }
      .success-close:hover { background:#4f46e5; }
    </style>`;

  document.head.insertAdjacentHTML('beforeend', overlayStyles);
  document.body.insertAdjacentHTML('beforeend', overlayHTML);

  const overlay   = document.getElementById('successOverlay');
  const pre       = document.getElementById('successPre');
  const closeBtn  = document.getElementById('successClose');
  const form      = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');

  if (!form || !overlay) return; // Pagina heeft geen formulier

  /* ── 2. Typewriter animatie ── */
  const runTypewriter = () => {
    pre.innerHTML = '<span class="s-cursor"></span>';
    let html = '';
    T.lines.forEach(({ t, cls, ms }) => {
      setTimeout(() => {
        const esc = t.replace(/&/g, '&amp;');
        html += cls ? `<span class="${cls}">${esc}</span>` : esc;
        pre.innerHTML = html + '<span class="s-cursor"></span>';
      }, ms);
    });
    setTimeout(() => { closeBtn.style.display = 'inline-block'; }, 3100);
  };

  /* ── 3. Formulier submit via fetch ── */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Client-side honeypot check
    const honey = form.querySelector('[name="_gotcha"]');
    if (honey && honey.value) return;

    // Verplichte velden moeten ingevuld zijn (form heeft novalidate, dus
    // dit moeten we zelf afdwingen voor we naar Formspree versturen)
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const origText     = submitBtn.textContent;
    submitBtn.textContent = T.sending;
    submitBtn.disabled    = true;

    try {
      const res = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        if (typeof gtag === 'function') {
          gtag('event', 'generate_lead', {
            event_category: 'contact',
            event_label: 'contactformulier'
          });
        }
        closeBtn.style.display   = 'none';
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        runTypewriter();
        form.reset();
      } else {
        alert(T.errorServer);
      }
    } catch {
      alert(T.errorConnection);
    } finally {
      submitBtn.textContent = origText;
      submitBtn.disabled    = false;
    }
  });

  /* ── 4. Overlay sluiten ── */
  const closeOverlay = () => {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });

})();
