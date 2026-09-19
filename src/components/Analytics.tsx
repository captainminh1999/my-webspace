"use client";

import { useEffect } from "react";

const GA_ID = "G-N8S80ZDYP0";

// Google Analytics without an inline <script>. The page's Content-Security-Policy
// (src/lib/csp.ts) only runs inline scripts that carry the response's nonce, and
// the nonce is added at the edge, after this markup was rendered and cached — so
// the usual inline gtag snippet cannot have one. Code in a bundle needs none, and
// 'strict-dynamic' lets a script that is already trusted add gtag.js.
//
// Same timing as next/script's lazyOnload: after the load event, when idle.
//
// Not on /admin: a third-party script has no business on the page that holds the
// owner's session. Nothing links there, so it is always reached by a full page
// load and this check runs. (Tidiness, not a wall — the session cookie is sent to
// the whole origin, so the script policy of every page is what protects it.)
export default function Analytics() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    let cancelled = false;
    const start = () => {
      if (cancelled || document.getElementById("ga-gtag")) return;
      const w = window as unknown as { dataLayer: unknown[] };
      w.dataLayer = w.dataLayer || [];
      // gtag.js only understands queue entries that are `arguments` objects, not arrays.
      const gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments);
      } as (...args: unknown[]) => void;
      gtag("js", new Date());
      gtag("config", GA_ID);
      const script = document.createElement("script");
      script.id = "ga-gtag";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(script);
    };
    const whenIdle = () => ("requestIdleCallback" in window ? requestIdleCallback(start) : setTimeout(start, 1));
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", whenIdle);
    };
  }, []);
  return null;
}
