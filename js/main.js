/**
 * js/main.js
 * ═══════════════════════════════════════════════════════════════
 * Execution order:
 *   1. detectBrowser()   — adds class to <html> for CSS shadows
 *   2. loadPartials()    — fetch sidebar-cells + footer in parallel
 *   3. init()            — wire all event listeners once DOM is ready
 *
 * NOTE: fetch() is blocked on file:// URLs by the browser for
 * security reasons. Use a local dev server to test:
 *   npx serve .          (Node)
 *   python -m http.server (Python 3)
 *   VS Code Live Server extension
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     1. BROWSER DETECTION
     UA-token cascade — no navigator.vendor (unreliable in
     Brave, Samsung Internet, WebView, and other Chromium
     forks). Applies one class to <html> which activates the
     matching CSS shadow block in styles.css.
     Priority: mobile → Edge → Firefox → Chromium → Safari
  ══════════════════════════════════════════════════════════ */
  function detectBrowser() {
    const ua   = navigator.userAgent;
    const html = document.documentElement;

    const isMobile   = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const isEdge     = /Edg\//i.test(ua);
    const isFirefox  = /Firefox\//i.test(ua);
    const isChromium = !isEdge && !isFirefox && /Chrome\//i.test(ua);

    if      (isMobile)   html.classList.add('browser-mobile');
    else if (isEdge)     html.classList.add('browser-edge');
    else if (isFirefox)  html.classList.add('browser-firefox');
    else if (isChromium) html.classList.add('browser-chrome');
    // Safari / unknown — :root defaults in styles.css apply
  }

  /* ══════════════════════════════════════════════════════════
     2. LOAD PARTIALS
     Fetches sidebar-cells.html and footer.html in parallel.
     sidebar-cells → injected as innerHTML of #cells-mount
     footer        → replaces the #footer-mount div entirely
                     (outerHTML swap preserves the <footer> tag)
  ══════════════════════════════════════════════════════════ */
  function loadPartials() {
    const cellsMount  = document.getElementById('cells-mount');
    const footerMount = document.getElementById('footer-mount');

    const fetchCells  = fetch('partials/sidebar-cells.html')
      .then(r => {
        if (!r.ok) throw new Error('sidebar-cells.html: ' + r.status);
        return r.text();
      });

    const fetchFooter = fetch('partials/footer.html')
      .then(r => {
        if (!r.ok) throw new Error('footer.html: ' + r.status);
        return r.text();
      });

    return Promise.all([fetchCells, fetchFooter])
      .then(([cellsHTML, footerHTML]) => {
        cellsMount.innerHTML  = cellsHTML;
        footerMount.outerHTML = footerHTML;  // replaces <div> with <footer>
      })
      .catch(err => {
        console.error('[CMS1111] Failed to load partial:', err.message);
        // Surface a visible error inside the sidebar so it's obvious during dev
        if (cellsMount) {
          cellsMount.innerHTML =
            '<p style="color:#f88;font-size:.75rem;padding:8px 6px;line-height:1.5">' +
            '⚠ Could not load projects.<br>' +
            'Open this page via a local server, not file://</p>';
        }
      });
  }

  /* ══════════════════════════════════════════════════════════
     3. INIT — called after partials are injected into the DOM
  ══════════════════════════════════════════════════════════ */
  function init() {
    /* DOM refs ─────────────────────────────────────────────── */
    const aboutPanel       = document.getElementById('aboutPanel');
    const bioSplash        = document.getElementById('bioSplash');
    const aboutContent     = document.getElementById('aboutContent');
    const projectFavicon   = document.getElementById('projectFavicon');
    const projectTitleLink = document.getElementById('projectTitleLink');
    const projectUrl       = document.getElementById('projectUrl');
    const aboutBody        = document.getElementById('aboutBody');
    const sidebar          = document.getElementById('sidebar');
    const drawerBtn        = document.getElementById('drawerBtn');
    const drawerOverlay    = document.getElementById('drawerOverlay');
    const siteTitle        = document.getElementById('siteTitle');

    // Cells are queried here, after loadPartials() has injected them
    const cells = document.querySelectorAll('.link-cell');

    /* ── Dynamic panel resize ─────────────────────────────── */
    function onPanelResize() {
      aboutPanel.style.height = '';
      requestAnimationFrame(() => { aboutPanel.style.height = '100%'; });
    }
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(onPanelResize).observe(aboutPanel.parentElement);
    } else {
      window.addEventListener('resize', onPanelResize);
    }

    /* ── Show project content ─────────────────────────────── */
    function showProject(cell) {
      const descs = [cell.dataset.desc1, cell.dataset.desc2, cell.dataset.desc3]
        .filter(Boolean);

      projectFavicon.src           = cell.dataset.favicon;
      projectFavicon.alt           = cell.dataset.title + ' favicon';
      projectTitleLink.textContent = cell.dataset.title;
      projectTitleLink.href        = cell.dataset.url;
      projectUrl.textContent       = cell.dataset.url;
      aboutBody.innerHTML          = descs.map(d => `<p>${d}</p>`).join('');

      bioSplash.style.display    = 'none';
      aboutContent.style.display = 'flex';
      aboutPanel.scrollTop       = 0;

      aboutContent.classList.remove('visible');
      void aboutContent.offsetWidth; // force reflow to re-trigger animation
      aboutContent.classList.add('visible');
    }

    /* ── Show bio splash (header title click) ─────────────── */
    function showBio() {
      cells.forEach(c => c.classList.remove('active'));
      aboutContent.classList.remove('visible');
      aboutContent.style.display = 'none';
      bioSplash.style.display    = 'flex';
    }

    siteTitle.addEventListener('click', showBio);

    /* ── Cell click ───────────────────────────────────────── */
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        cells.forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
        showProject(cell);
        closeSidebar();
      });
    });

    /* ── Mobile drawer ────────────────────────────────────── */
    // The overlay is purely cosmetic (pointer-events: none always).
    // Outside-tap detection uses touchstart on document — fires before
    // click synthesis, immune to z-index hit-testing quirks on iOS/Android.
    function openSidebar() {
      sidebar.classList.add('open');
      drawerOverlay.classList.add('visible');
      drawerBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      drawerOverlay.classList.remove('visible');
      drawerBtn.setAttribute('aria-expanded', 'false');
    }

    drawerBtn.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    document.addEventListener('touchstart', (e) => {
      if (!sidebar.classList.contains('open')) return;
      if (sidebar.contains(e.target) || drawerBtn.contains(e.target)) return;
      closeSidebar();
    }, { passive: true });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  /* ══════════════════════════════════════════════════════════
     ENTRY POINT
  ══════════════════════════════════════════════════════════ */
  detectBrowser();
  loadPartials().then(init);

})();
