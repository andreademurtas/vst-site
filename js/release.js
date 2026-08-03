/* Release loader, shared by the plugin pages.
   The script tag provides the plugin via data attributes:
     <script src="../js/release.js" data-repo="andreademurtas/galdr" data-name="Galdr"></script>
   Queries the GitHub API for the published releases and builds
   version info, per-OS download buttons and download counters.
   Download counts are summed across every release, while the
   buttons link to the assets of the latest one.
   If no release is published yet, it falls back to a plain link
   to the GitHub releases page, with no thrown errors. */
(function () {
  'use strict';

  var script = document.currentScript;
  var REPO = (script && script.getAttribute('data-repo')) || 'andreademurtas/galdr';
  var NAME = (script && script.getAttribute('data-name')) || 'Galdr';
  var SLUG = NAME.toLowerCase();
  var API_URL = 'https://api.github.com/repos/' + REPO + '/releases?per_page=100';

  var PLATFORMS = [
    { asset: NAME + '-Windows.zip',  label: 'Windows', slug: 'windows', formats: 'VST3 · CLAP · Standalone · .zip' },
    { asset: NAME + '-macOS.tar.gz', label: 'macOS',   slug: 'macos',   formats: 'VST3 · CLAP · AU · Standalone · .tar.gz' },
    { asset: NAME + '-Linux.tar.gz', label: 'Linux',   slug: 'linux',   formats: 'VST3 · CLAP · Standalone · .tar.gz' }
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

  function render(releases) {
    if (!Array.isArray(releases) || !releases.length) { showFallback(); return; }

    /* Latest stable release for the download links (prereleases only
       if nothing else exists). */
    var latest = releases.filter(function (r) {
      return !r.draft && !r.prerelease;
    })[0] || releases[0];
    if (!latest || !Array.isArray(latest.assets)) { showFallback(); return; }

    /* All-time download counts per asset name, summed across releases. */
    var counts = {};
    releases.forEach(function (r) {
      (r.assets || []).forEach(function (a) {
        counts[a.name] = (counts[a.name] || 0) + (a.download_count || 0);
      });
    });

    var yours = detectOS();
    var buttons = document.getElementById('dl-buttons');
    var total = 0;
    var found = 0;

    PLATFORMS.forEach(function (p) {
      var asset = latest.assets.filter(function (a) { return a.name === p.asset; })[0];
      if (!asset) { return; }
      found += 1;
      var count = counts[p.asset] || 0;
      total += count;

      var a = el('a', 'dl-btn' + (yours === p.slug ? ' primary' : ''));
      a.href = asset.browser_download_url;
      a.setAttribute('data-goatcounter-click', SLUG + '-download-' + p.slug);
      a.setAttribute('data-goatcounter-title', NAME + ' download: ' + p.label);
      if (yours === p.slug) { a.title = 'Detected as your system'; }
      a.appendChild(el('span', 'dl-os', p.label));
      a.appendChild(el('span', 'dl-sub', p.formats));
      a.appendChild(el('span', 'dl-count', count.toLocaleString('en') + ' downloads'));
      buttons.appendChild(a);
    });

    if (!found) { showFallback(); return; }

    document.getElementById('dl-version').textContent = latest.tag_name || latest.name || '';
    document.getElementById('dl-date').textContent = latest.published_at ? formatDate(latest.published_at) : 'n/a';
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
