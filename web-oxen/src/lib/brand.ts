/**
 * OXEN — Centralized Icon & Branding Configuration
 * ------------------------------------------------
 * Single source of truth for every icon/brand asset across the app.
 * Changing the icon here automatically updates: PWA manifest, Safari
 * touch icon, Android adaptive icon, favicon, OpenGraph image, and
 * any in-app brand rendering.
 *
 * The canonical 1024×1024 icon lives at /public/icon.png.
 * Derivative sizes are generated from it and referenced here.
 */

export interface IconSet {
  /** Canonical 1024×1024 source icon. */
  source: string;
  /** PWA / standard favicon. */
  favicon: string;
  /** Apple touch icon (180×180). */
  appleTouch: string;
  /** PWA any-purpose 192. */
  pwa192: string;
  /** PWA any-purpose 512. */
  pwa512: string;
  /** PWA maskable 1024. */
  maskable: string;
  /** OpenGraph / Twitter card social image (1200×630 recommended). */
  social: string;
}

export const APP_NAME = "OXEN" as const;
export const APP_TAGLINE =
  "OXEN — explore the world from space. Discover countries, plan trips with AI, and map your journey." as const;

/** Centralized icon paths — derived from the single source icon. */
export const ICONS: IconSet = {
  source: "/icon.png",
  favicon: "/favicon.png",
  appleTouch: "/apple-touch-icon.png",
  pwa192: "/icon-192.png",
  pwa512: "/icon-512.png",
  maskable: "/icon-maskable.png",
  social: "/icon.png",
};

/**
 * Inject all PWA / Safari / OpenGraph meta tags into <head> at runtime.
 * Called once from main.tsx so the canonical icon set is always in sync
 * with ICONS above — no manual index.html edits needed when icons change.
 */
export function injectBrandMeta(): void {
  if (typeof document === "undefined") return;
  const head = document.head;

  const ensure = (selector: string, tag: string, attrs: Record<string, string>) => {
    let el = head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
    if (!el) {
      el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
      head.appendChild(el);
    }
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
  };

  // --- Favicon & Apple touch icon ---
  ensure('link[rel="icon"]', "link", { rel: "icon", type: "image/png", href: ICONS.favicon });
  ensure('link[rel="apple-touch-icon"]', "link", { rel: "apple-touch-icon", href: ICONS.appleTouch });
  ensure('link[rel="mask-icon"]', "link", { rel: "mask-icon", href: ICONS.source, color: "#f0b444" });

  // --- PWA manifest ---
  ensure('link[rel="manifest"]', "link", { rel: "manifest", href: "/manifest.webmanifest" });

  // --- Safari standalone + theme ---
  ensure('meta[name="apple-mobile-web-app-capable"]', "meta", {
    name: "apple-mobile-web-app-capable",
    content: "yes",
  });
  ensure('meta[name="apple-mobile-web-app-status-bar-style"]', "meta", {
    name: "apple-mobile-web-app-status-bar-style",
    content: "black-translucent",
  });
  ensure('meta[name="apple-mobile-web-app-title"]', "meta", {
    name: "apple-mobile-web-app-title",
    content: APP_NAME,
  });
  ensure('meta[name="mobile-web-app-capable"]', "meta", {
    name: "mobile-web-app-capable",
    content: "yes",
  });
  ensure('meta[name="theme-color"]', "meta", {
    name: "theme-color",
    content: "#0a0e1a",
    media: "(prefers-color-scheme: dark)",
  });
  ensure('meta[name="theme-color"][media*="light"]', "meta", {
    name: "theme-color",
    content: "#f7f5f0",
    media: "(prefers-color-scheme: light)",
  });

  // --- OpenGraph ---
  ensure('meta[property="og:title"]', "meta", { property: "og:title", content: `${APP_NAME} — Explore the World` });
  ensure('meta[property="og:description"]', "meta", { property: "og:description", content: APP_TAGLINE });
  ensure('meta[property="og:type"]', "meta", { property: "og:type", content: "website" });
  ensure('meta[property="og:image"]', "meta", { property: "og:image", content: ICONS.social });
  ensure('meta[property="og:site_name"]', "meta", { property: "og:site_name", content: APP_NAME });

  // --- Twitter Card ---
  ensure('meta[name="twitter:card"]', "meta", { name: "twitter:card", content: "summary_large_image" });
  ensure('meta[name="twitter:title"]', "meta", { name: "twitter:title", content: `${APP_NAME} — Explore the World` });
  ensure('meta[name="twitter:description"]', "meta", { name: "twitter:description", content: APP_TAGLINE });
  ensure('meta[name="twitter:image"]', "meta", { name: "twitter:image", content: ICONS.social });

  // --- Android adaptive icon hint ---
  ensure('meta[name="application-name"]', "meta", { name: "application-name", content: APP_NAME });
}

/**
 * Register the OXEN service worker for offline support, caching,
 * background sync, and auto-updates. Safe to call in any environment;
 * silently no-ops outside production / unsupported browsers.
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (import.meta.env?.DEV) return; // skip in dev to preserve HMR
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          // New version ready — notify the app to prompt reload
          window.dispatchEvent(new CustomEvent("oxen:update-available"));
        }
      });
    });
    // Listen for controller changes to auto-activate updates
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // The new SW has taken control — reload once to use fresh assets
      if (!window.__OXEN_RELOADED__) {
        window.__OXEN_RELOADED__ = true;
        window.location.reload();
      }
    });
  } catch {
    // SW registration failed — app still works online
  }
}

declare global {
  interface Window {
    __OXEN_RELOADED__?: boolean;
  }
}
