"use client";

import { useEffect } from "react";

/* Registers the service worker so the app is installable + works offline. */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW is optional — the app still works without it */
      });
    }
  }, []);

  return null;
}
