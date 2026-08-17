/* Merik browser SDK — v1
 *
 * Reports the failures a probe cannot see. Merik checks a site from the outside
 * every few minutes and gets a 200; this is what tells it that the page it
 * served then threw in the user's browser and nobody could check out.
 *
 *   <script src="https://www.merik.in/merik.js"></script>
 *   <script>Merik.init({ key: "…" });</script>
 *
 * Deliberately small and deliberately dumb. It has no dependencies, no build
 * step, no session replay, no user identity and no cookie — every one of those
 * turns a snippet an agency can paste onto a client's site into a conversation
 * with the client's legal team.
 *
 * What it never sends, by construction rather than by filter: form contents,
 * input values, cookies, localStorage, request or response bodies, headers, and
 * the query string of any URL. It reads none of them. What it does send is
 * redacted again on arrival (supabase/functions/collect/group.ts), because a
 * privacy promise enforced only in the client is a promise anyone can edit.
 *
 * Not in v1: performance timings and Core Web Vitals. They need their own
 * baseline and their own storage to be worth anything, and half a feature that
 * reports a number nothing compares against is worse than the honest gap.
 */
(function (global) {
  'use strict';

  var ENDPOINT = 'https://cohifrzskydnozpmieov.supabase.co/functions/v1/collect';
  var FLUSH_MS = 10000;
  /** Matches the server's cap. Anything past it is a loop, not information. */
  var MAX_QUEUE = 50;
  /** One runaway handler can fire thousands of times a second. */
  var MAX_PER_FINGERPRINT = 5;

  var cfg = null;
  var queue = [];
  var seen = {};
  var timer = null;

  /** Path only. The query string is where the session tokens live. */
  function cleanUrl(u) {
    if (typeof u !== 'string' || !u) return null;
    return u.split('?')[0].split('#')[0].slice(0, 300);
  }

  function push(kind, message, source) {
    if (!cfg || typeof message !== 'string' || !message) return;
    var text = message.slice(0, 300);
    // Cheap client-side cap on repeats. The server groups properly; this only
    // stops a loop filling the queue before the next flush.
    var fp = kind + '|' + text.replace(/\d+/g, '#');
    seen[fp] = (seen[fp] || 0) + 1;
    if (seen[fp] > MAX_PER_FINGERPRINT || queue.length >= MAX_QUEUE) return;

    queue.push({
      kind: kind,
      message: text,
      source: cleanUrl(source),
      page: cleanUrl(global.location && global.location.pathname
        ? global.location.origin + global.location.pathname
        : ''),
    });
  }

  function flush(useBeacon) {
    if (!cfg || !queue.length) return;
    var body = JSON.stringify({ events: queue });
    queue = [];
    seen = {};
    var url = cfg.endpoint + '?k=' + encodeURIComponent(cfg.key);
    try {
      // On a page being closed, fetch is cancelled and beacon is not — which is
      // exactly when the error that broke the page was reported.
      if (useBeacon && global.navigator && global.navigator.sendBeacon) {
        global.navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        return;
      }
      global.fetch(url, {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        mode: 'cors',
        // No cookies to Merik, ever. This is telemetry about a page, not a
        // session, and sending credentials would make it something else.
        credentials: 'omit',
      })['catch'](function () {});
    } catch (e) { /* monitoring must never break the page it watches */ }
  }

  var Merik = {
    /**
     * key          — the asset's ingest key, from Digital Health → the asset.
     *                (The asset already knows its environment; there is no
     *                environment option because a second copy could disagree.)
     * captureErrors, captureNetwork — on by default, each switchable off.
     * sampleRate   — 0..1. A busy site does not need every copy of one bug.
     */
    init: function (options) {
      if (cfg) return;                        // one init per page
      options = options || {};
      if (!options.key) return;               // no key, nothing to report to

      cfg = {
        key: String(options.key),
        endpoint: options.endpoint || ENDPOINT,
        captureErrors: options.captureErrors !== false,
        captureNetwork: options.captureNetwork !== false,
        sampleRate: typeof options.sampleRate === 'number' ? options.sampleRate : 1,
      };

      // Sampling is decided once per page load, not per event: a page that
      // reports its third error but not its first tells a confusing story.
      if (Math.random() > cfg.sampleRate) { cfg = null; return; }

      if (cfg.captureErrors) {
        global.addEventListener('error', function (e) {
          // A failed <img>/<script>/<link> raises an error event with no
          // `error` object on the element rather than on window.
          if (e && e.target && e.target !== global && (e.target.src || e.target.href)) {
            push('resource', 'failed to load ' + (e.target.tagName || 'resource').toLowerCase(),
              e.target.src || e.target.href);
            return;
          }
          push('error', (e && (e.message || (e.error && e.error.message))) || 'script error',
            e && e.filename);
        }, true);

        global.addEventListener('unhandledrejection', function (e) {
          var r = e && e.reason;
          push('rejection',
            (r && (r.message || (typeof r === 'string' ? r : ''))) || 'unhandled promise rejection',
            r && r.stack ? String(r.stack).split('\n')[1] : null);
        });
      }

      if (cfg.captureNetwork && global.fetch) {
        // Wraps fetch to notice failures. Status and URL path only — never the
        // request body, the response body, or a header.
        var nativeFetch = global.fetch;
        global.fetch = function (input, init) {
          var url = typeof input === 'string' ? input : (input && input.url) || '';
          // Never report on our own reporting: a failing collect endpoint would
          // otherwise generate an error about itself, forever.
          if (url.indexOf(cfg.endpoint) === 0) return nativeFetch.apply(this, arguments);
          return nativeFetch.apply(this, arguments).then(function (res) {
            if (res && res.status >= 400) {
              push('network', 'HTTP ' + res.status + ' from ' + cleanUrl(url), cleanUrl(url));
            }
            return res;
          }, function (err) {
            push('network', 'request failed: ' + ((err && err.message) || 'network error'),
              cleanUrl(url));
            throw err;
          });
        };
      }

      timer = setInterval(function () { flush(false); }, FLUSH_MS);
      global.addEventListener('visibilitychange', function () {
        if (global.document && global.document.visibilityState === 'hidden') flush(true);
      });
      global.addEventListener('pagehide', function () { flush(true); });
    },

    /** Report something the page knows is wrong but did not throw for. */
    capture: function (message, source) { push('error', String(message), source); },

    /** Stop reporting. Here so a consent banner has something to call. */
    stop: function () { clearInterval(timer); queue = []; cfg = null; },
  };

  global.Merik = Merik;
})(typeof window !== 'undefined' ? window : this);
