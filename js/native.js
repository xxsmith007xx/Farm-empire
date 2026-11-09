/* Farm Empire — native app features (Capacitor). Everything here is a safe no-op in a
 * normal browser; in the Android/iOS app it adds haptics, the Android back button,
 * pause handling and a durable copy of the save in native storage.
 * The Capacitor scripts are only added to the app build (see scripts/build-web.js). */
(function () {
  'use strict';
  const C = window.Capacitor;
  const native = !!(C && C.isNativePlatform && C.isNativePlatform());
  const plug = (g, name) => (native && window[g] && window[g][name]) || null;
  const Haptics = plug('capacitorHaptics', 'Haptics');
  const App = plug('capacitorApp', 'App');
  const Prefs = plug('capacitorPreferences', 'Preferences');
  const SAVE_KEY = 'farm-empire-save';

  let lastBuzz = 0;
  // kinds: 'tap' (tiny), 'light', 'medium', 'heavy', 'success', 'error'
  function haptic(kind) {
    if (!Haptics) return;
    const now = performance.now();
    if (kind === 'tap' && now - lastBuzz < 80) return;
    lastBuzz = now;
    const run = () => {
      if (kind === 'success' || kind === 'error') return Haptics.notification({ type: kind.toUpperCase() });
      return Haptics.impact({ style: { tap: 'LIGHT', light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' }[kind] || 'LIGHT' });
    };
    try { run().catch(() => {}); } catch (e) { /* haptics unavailable */ }
  }

  window.FarmNative = {
    native,
    platform: C && C.getPlatform ? C.getPlatform() : 'web',
    haptic,
    // Android back button. `handler` returns true if it handled the press.
    onBack(handler) {
      if (!App) return;
      App.addListener('backButton', () => { if (!handler()) App.minimizeApp(); });
    },
    onPause(fn) { if (App) App.addListener('pause', fn); },
    // Durable save copy (localStorage can be cleared by iOS when storage runs low).
    saveCopy(json) { if (Prefs) Prefs.set({ key: SAVE_KEY, value: json }).catch(() => {}); },
    loadCopy() { return Prefs ? Prefs.get({ key: SAVE_KEY }).then(r => r.value).catch(() => null) : Promise.resolve(null); }
  };
})();
