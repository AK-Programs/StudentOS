import { useState, useEffect } from 'react';

export type AppPlatform = 'web' | 'pwa' | 'android-app';
export type DisplayMode = 'browser' | 'standalone' | 'fullscreen' | 'minimal-ui';

export interface AppEnvironment {
  platform: AppPlatform;
  isInstalledApp: boolean;
  isWebsite: boolean;
  isPWA: boolean;
  isAndroidApp: boolean;
  displayMode: DisplayMode;
  badgeLabel: string;
  details: string;
}

/**
 * Determines whether the app is running in a standalone/installed display mode.
 * Evaluates W3C display-mode media queries and iOS standalone navigator property.
 */
export function getDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'browser';

  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    // iOS Safari home-screen shortcut
    if ((navigator as any)?.standalone === true) return 'standalone';
  } catch (err) {
    console.warn('[AppEnvironment] Error detecting display mode:', err);
  }

  return 'browser';
}

/**
 * Accurately detects whether StudentOS is running as a normal web page,
 * an installed Progressive Web App (PWA), or an Android APK / TWA container.
 */
export function getAppEnvironment(): AppEnvironment {
  if (typeof window === 'undefined') {
    return {
      platform: 'web',
      isInstalledApp: false,
      isWebsite: true,
      isPWA: false,
      isAndroidApp: false,
      displayMode: 'browser',
      badgeLabel: 'Web Browser',
      details: 'Running inside a standard web browser.'
    };
  }

  const displayMode = getDisplayMode();
  const isStandalone = displayMode !== 'browser';
  const userAgent = navigator.userAgent || '';
  const isAndroid = /Android/i.test(userAgent);

  // Android TWA / APK flags
  const hasAndroidReferrer = typeof document !== 'undefined' && 
    (document.referrer?.startsWith('android-app://') || document.referrer?.includes('com.google.android.apps'));
  
  const hasAndroidBridge = typeof (window as any).AndroidInterface !== 'undefined' || 
    typeof (window as any).StudentOSNative !== 'undefined';

  const isTwaUrlParam = typeof window.location !== 'undefined' && 
    (window.location.search.includes('source=apk') || 
     window.location.search.includes('source=twa') || 
     window.location.search.includes('utm_source=studentos_app'));

  // Local storage flag set when user downloaded/installed the APK or confirmed native install
  let hasApkInstalledFlag = false;
  try {
    hasApkInstalledFlag = localStorage.getItem('studentos_apk_installed') === 'true';
  } catch (_) {}

  // 1. Android APK / TWA App
  if (hasAndroidReferrer || hasAndroidBridge || isTwaUrlParam || (isAndroid && isStandalone && hasApkInstalledFlag)) {
    return {
      platform: 'android-app',
      isInstalledApp: true,
      isWebsite: false,
      isPWA: false,
      isAndroidApp: true,
      displayMode,
      badgeLabel: 'Android APK / App',
      details: 'Installed Android application with native shell support.'
    };
  }

  // 2. Installed PWA (Standalone window on Desktop, Chrome, or iOS home-screen)
  if (isStandalone) {
    return {
      platform: 'pwa',
      isInstalledApp: true,
      isWebsite: false,
      isPWA: true,
      isAndroidApp: isAndroid,
      displayMode,
      badgeLabel: isAndroid ? 'Android PWA' : 'Installed PWA',
      details: 'Installed Progressive Web App running in standalone window mode.'
    };
  }

  // 3. Regular browser website
  return {
    platform: 'web',
    isInstalledApp: false,
    isWebsite: true,
    isPWA: false,
    isAndroidApp: false,
    displayMode: 'browser',
    badgeLabel: 'Website (Browser)',
    details: 'Accessible directly through any modern web browser.'
  };
}

/**
 * Reusable React hook that updates when display mode changes (e.g. app installed or launched)
 */
export function useAppEnvironment(): AppEnvironment {
  const [env, setEnv] = useState<AppEnvironment>(() => getAppEnvironment());

  useEffect(() => {
    const update = () => setEnv(getAppEnvironment());

    // Listen for display mode changes (e.g., PWA installed while website is open)
    try {
      const matchStandalone = window.matchMedia('(display-mode: standalone)');
      if (matchStandalone.addEventListener) {
        matchStandalone.addEventListener('change', update);
      } else if ((matchStandalone as any).addListener) {
        (matchStandalone as any).addListener(update);
      }
    } catch (_) {}

    window.addEventListener('appinstalled', update);
    window.addEventListener('studentos_apk_installed_changed', update);

    return () => {
      try {
        const matchStandalone = window.matchMedia('(display-mode: standalone)');
        if (matchStandalone.removeEventListener) {
          matchStandalone.removeEventListener('change', update);
        } else if ((matchStandalone as any).removeListener) {
          (matchStandalone as any).removeListener(update);
        }
      } catch (_) {}
      window.removeEventListener('appinstalled', update);
      window.removeEventListener('studentos_apk_installed_changed', update);
    };
  }, []);

  return env;
}
