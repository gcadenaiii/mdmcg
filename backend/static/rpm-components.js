/**
 * RPM UI Components
 * Handles: live clock · relative timestamps · auto-refresh countdown
 */
(function (RPM) {

  // ── Relative time ───────────────────────────────────────────────
  RPM.relativeTime = function (isoString) {
    if (!isoString) return '—';
    // The server emits UTC naive strings (no 'Z'); normalise them.
    var normalised = isoString.trim().replace(' ', 'T');
    if (!normalised.endsWith('Z') && !normalised.match(/[+-]\d{2}:\d{2}$/)) {
      normalised += 'Z';
    }
    var d = new Date(normalised);
    if (isNaN(d.getTime())) return isoString;
    var diffMs  = Date.now() - d.getTime();
    var diffSec = Math.floor(diffMs / 1000);
    if (diffSec <  0)   return 'just now';
    if (diffSec < 30)   return 'just now';
    if (diffSec < 90)   return diffSec + 's ago';
    var diffMin = Math.round(diffSec / 60);
    if (diffMin < 60)   return diffMin + ' min ago';
    var diffHr  = Math.floor(diffSec / 3600);
    if (diffHr  < 24)   return diffHr + 'h ago';
    var diffDay = Math.floor(diffSec / 86400);
    if (diffDay < 7)    return diffDay + (diffDay === 1 ? ' day ago' : ' days ago');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // ── Live clock ──────────────────────────────────────────────────
  RPM.startClock = function (el) {
    function tick() {
      var now = new Date();
      el.textContent = now.toLocaleTimeString(undefined, {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    tick();
    setInterval(tick, 1000);
  };

  // ── Apply relative times ────────────────────────────────────────
  RPM.applyRelativeTimes = function () {
    document.querySelectorAll('[data-reltime]').forEach(function (el) {
      var ts = el.getAttribute('data-reltime');
      if (ts) el.textContent = RPM.relativeTime(ts);
    });
  };

  // ── Auto-refresh with visual countdown ─────────────────────────
  RPM.startRefreshCountdown = function (seconds, fillEl, labelEl) {
    var remaining = seconds;
    var total     = seconds;
    function tick() {
      remaining--;
      if (remaining <= 0) {
        location.reload();
        return;
      }
      var pct = ((total - remaining) / total) * 100;
      if (fillEl)  fillEl.style.width  = pct + '%';
      if (labelEl) labelEl.textContent = 'Refreshes in ' + remaining + 's';
    }
    if (fillEl)  fillEl.style.width = '0%';
    if (labelEl) labelEl.textContent = 'Refreshes in ' + seconds + 's';
    setInterval(tick, 1000);
  };

  // ── Init (called on DOMContentLoaded) ──────────────────────────
  RPM.init = function () {
    // Clock
    var clockEl = document.getElementById('rpm-clock');
    if (clockEl) RPM.startClock(clockEl);

    // Relative timestamps
    RPM.applyRelativeTimes();
    setInterval(RPM.applyRelativeTimes, 60000);

    // Refresh countdown
    var fillEl  = document.getElementById('rpm-refresh-fill');
    var labelEl = document.getElementById('rpm-refresh-label');
    if (fillEl || labelEl) {
      RPM.startRefreshCountdown(30, fillEl, labelEl);
    }
  };

  document.addEventListener('DOMContentLoaded', RPM.init);

}(window.RPM = window.RPM || {}));
