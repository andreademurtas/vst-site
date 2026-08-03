/* Galdr release loader.
   Queries the GitHub API for the latest published release and builds
   version info, per-OS download buttons and download counters.
   If no release is published yet (the API answers 404), it falls back
   to a plain link to the GitHub releases page, with no thrown errors. */
(function () {
  'use strict';

  var REPO = 'andreademurtas/galdr';
  var API_URL = 'https://api.github.com/repos/' + REPO + '/releases/latest';

  var PLATFORMS = [
    { asset: 'Galdr-Windows.zip',  label: 'Windows', slug: 'windows', formats: 'VST3 · CLAP · Standalone · .zip' },
    { asset: 'Galdr-macOS.tar.gz', label: 'macOS',   slug: 'macos',   formats: 'VST3 · CLAP · AU · Standalone · .tar.gz' },
    { asset: 'Galdr-Linux.tar.gz', label: 'Linux',   slug: 'linux',   formats: 'VST3 · CLAP · Standalone · .tar.gz' }
  ];

  var loading  = document.getElementById('dl-loading');
  var live     = document.getElementById('dl-live');
  var fallback = document.getElementById('dl-fallback');
  if (!loading || !live || !fallback) { return; }

  function detectOS() {
    var ua = navigator.userAgent || '';
    if (/Windows/i.test(ua)) { return 'windows'; }
    if (/Mac/i.test(ua) && !/iPhone|iPad/i.test(ua)) { return 'macos'; }
    if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) { return 'linux'; }
    return null;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (err) {
      return '';
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text) { node.textContent = text; }
    return node;
  }

  function showFallback() {
    loading.hidden = true;
    live.hidden = true;
    fallback.hidden = false;
  }

  function render(release) {
    if (!release || !Array.isArray(release.assets)) { showFallback(); return; }

    var yours = detectOS();
    var buttons = document.getElementById('dl-buttons');
    var total = 0;
    var found = 0;

    PLATFORMS.forEach(function (p) {
      var asset = release.assets.filter(function (a) { return a.name === p.asset; })[0];
      if (!asset) { return; }
      found += 1;
      total += asset.download_count || 0;

      var a = el('a', 'dl-btn' + (yours === p.slug ? ' primary' : ''));
      a.href = asset.browser_download_url;
      a.setAttribute('data-goatcounter-click', 'galdr-download-' + p.slug);
      a.setAttribute('data-goatcounter-title', 'Galdr download: ' + p.label);
      if (yours === p.slug) { a.title = 'Detected as your system'; }
      a.appendChild(el('span', 'dl-os', p.label));
      a.appendChild(el('span', 'dl-sub', p.formats));
      a.appendChild(el('span', 'dl-count', (asset.download_count || 0).toLocaleString('en') + ' downloads'));
      buttons.appendChild(a);
    });

    if (!found) { showFallback(); return; }

    document.getElementById('dl-version').textContent = release.tag_name || release.name || '';
    document.getElementById('dl-date').textContent = release.published_at ? formatDate(release.published_at) : 'n/a';
    document.getElementById('dl-total').textContent = total.toLocaleString('en') + ' downloads so far';

    loading.hidden = true;
    fallback.hidden = true;
    live.hidden = false;

    /* GoatCounter binds its click events on page load; the buttons
       above were created afterwards, so rebind. */
    if (window.goatcounter && typeof window.goatcounter.bind_events === 'function') {
      window.goatcounter.bind_events();
    }
  }

  fetch(API_URL, { headers: { 'Accept': 'application/vnd.github+json' } })
    .then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json();
    })
    .then(render)
    .catch(showFallback);
}());
