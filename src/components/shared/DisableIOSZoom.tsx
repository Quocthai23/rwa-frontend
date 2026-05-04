'use client';

import { useEffect } from 'react';

const LOCKED_VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return isIOS || isIPadOS;
}

export default function DisableIOSZoom() {
  useEffect(() => {
    if (!isIOSDevice()) return;

    const getViewportMeta = () => {
      let viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');

      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }

      return viewportMeta;
    };

    const lockViewport = () => {
      const viewportMeta = getViewportMeta();

      if (viewportMeta.content !== LOCKED_VIEWPORT_CONTENT) {
        viewportMeta.content = LOCKED_VIEWPORT_CONTENT;
      }
    };

    const resetZoomIfNeeded = () => {
      const scale = window.visualViewport?.scale ?? 1;

      if (Math.abs(scale - 1) < 0.01) return;

      // Re-apply viewport lock if Safari lets a pinch slip through.
      lockViewport();
      window.scrollTo(window.scrollX, window.scrollY);
    };

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventPinchTouch = (event: Event) => {
      if (!event.cancelable) return;

      if ('touches' in event && (event as TouchEvent).touches.length > 1) {
        event.preventDefault();
      }
    };

    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (event: Event) => {
      if (!event.cancelable) return;

      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;

      setTimeout(resetZoomIfNeeded, 0);
    };

    lockViewport();
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const prevHtmlTouchAction = htmlEl.style.touchAction;
    const prevBodyTouchAction = bodyEl.style.touchAction;

    // Keep one-finger scroll/pan, block browser pinch-zoom gestures.
    htmlEl.style.touchAction = 'pan-x pan-y';
    bodyEl.style.touchAction = 'pan-x pan-y';

    const eventOptions = { passive: false, capture: true } as const;

    const eventTargets: EventTarget[] = [window, document, htmlEl, bodyEl];
    for (const target of eventTargets) {
      target.addEventListener('gesturestart', preventGesture, eventOptions);
      target.addEventListener('gesturechange', preventGesture, eventOptions);
      target.addEventListener('gestureend', preventGesture, eventOptions);
      target.addEventListener('touchstart', preventPinchTouch, eventOptions);
      target.addEventListener('touchmove', preventPinchTouch, eventOptions);
      target.addEventListener('touchend', preventDoubleTapZoom, eventOptions);
    }

    window.visualViewport?.addEventListener('resize', resetZoomIfNeeded);

    return () => {
      for (const target of eventTargets) {
        target.removeEventListener('gesturestart', preventGesture, true);
        target.removeEventListener('gesturechange', preventGesture, true);
        target.removeEventListener('gestureend', preventGesture, true);
        target.removeEventListener('touchstart', preventPinchTouch, true);
        target.removeEventListener('touchmove', preventPinchTouch, true);
        target.removeEventListener('touchend', preventDoubleTapZoom, true);
      }

      window.visualViewport?.removeEventListener('resize', resetZoomIfNeeded);
      htmlEl.style.touchAction = prevHtmlTouchAction;
      bodyEl.style.touchAction = prevBodyTouchAction;
    };
  }, []);

  return null;
}
