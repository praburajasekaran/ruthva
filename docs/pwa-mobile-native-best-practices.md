# Mobile-Native PWA Best Practices for Android Chrome (India-focused)

> Compiled March 2026. Focused on Android Chrome for Indian clinic staff on 4G networks.

---

## 1. PWA Install Prompts on Android

### beforeinstallprompt Event Handling

The browser fires `beforeinstallprompt` when it determines the app meets installability criteria (manifest + service worker + HTTPS). This event is **Chromium-only** (Android Chrome, Edge).

```typescript
// hooks/useInstallPrompt.ts
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // prompt() can only be called once; clear the reference
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  }, [deferredPrompt]);

  return { isInstallable, isInstalled, promptInstall };
}
```

### UX Patterns for India (Low PWA Awareness)

**Do NOT show the install prompt immediately.** Wait for engagement signals:

1. **After 2-3 meaningful actions** (e.g., after the clinic staff completes a visit, views a report)
2. **Bottom banner pattern** -- a fixed banner at the bottom with clear benefit language in the local language
3. **In-context prompt** -- show the install prompt after a task where offline access would be valuable ("Install to access patient data offline")

```tsx
// components/InstallBanner.tsx
'use client';

import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'pwa-install-dismissed';
const MIN_ACTIONS_BEFORE_PROMPT = 3;

export function InstallBanner() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);
  const [actionCount, setActionCount] = useState(0);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      // Show again after 7 days
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }
    setDismissed(false);
  }, []);

  // Track user actions to determine engagement
  useEffect(() => {
    const count = Number(sessionStorage.getItem('user-action-count') || '0');
    setActionCount(count);
  }, []);

  if (!isInstallable || dismissed || actionCount < MIN_ACTIONS_BEFORE_PROMPT) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 safe-area-bottom">
      <div className="mx-4 mb-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-base">
              Install Ruthva App
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Works offline. Access patient data without internet.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 -mt-1 -mr-1"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <button
          onClick={promptInstall}
          className="mt-3 w-full bg-blue-600 text-white font-semibold py-3 rounded-xl
                     active:scale-[0.98] transition-transform text-base"
        >
          Install Now -- Free
        </button>
      </div>
    </div>
  );
}
```

**Key India-specific considerations:**

- **Spell out "Free"** -- users in India are cautious about data costs and app storage
- **Mention offline capability** -- this is the killer feature for areas with patchy connectivity
- **Use the local language** for the install prompt text (Hindi/regional language toggle)
- **Keep the prompt visually simple** -- avoid technical jargon like "PWA" or "Add to Home Screen"
- **Show app icon preview** -- familiar app-store-like presentation increases trust
- **After dismiss, wait 7 days** before showing again (do not nag)

### manifest.json Requirements

```json
{
  "name": "Ruthva Clinic Dashboard",
  "short_name": "Ruthva",
  "description": "Clinic management. Works offline.",
  "start_url": "/dashboard?source=pwa",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1e40af",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## 2. Bottom Tab Navigation in Next.js

### Architecture: Layout-Based Tabs with Parallel Routes

Use Next.js App Router layouts to keep tab content mounted while switching tabs. This avoids unmounting/remounting and naturally preserves component state.

```
app/
  (tabs)/
    layout.tsx          # Contains the bottom tab bar
    dashboard/
      page.tsx
    visits/
      page.tsx
    patients/
      page.tsx
    settings/
      page.tsx
```

### Tab Bar Component

```tsx
// components/BottomTabBar.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CalendarCheck, Users, Settings } from 'lucide-react';

const tabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/visits', label: 'Visits', icon: CalendarCheck },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200
                 safe-area-bottom"
      role="tablist"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              scroll={false}  // Preserve scroll position
              role="tab"
              aria-selected={isActive}
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 h-full
                transition-colors duration-150
                ${isActive
                  ? 'text-blue-600'
                  : 'text-gray-400 active:text-gray-600'}
              `}
            >
              <Icon
                className={`w-6 h-6 transition-transform duration-200
                  ${isActive ? 'scale-110' : 'scale-100'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] leading-none font-medium
                ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Preserving Scroll Position Between Tabs

Next.js `scroll={false}` on `<Link>` prevents scroll-to-top. For full scroll restoration across tabs, store scroll positions per route:

```tsx
// hooks/useScrollRestoration.ts
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const scrollPositions = new Map<string, number>();

export function useScrollRestoration(containerRef: React.RefObject<HTMLElement | null>) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Save scroll position of the previous route
    if (prevPathname.current !== pathname) {
      scrollPositions.set(prevPathname.current, container.scrollTop);
      prevPathname.current = pathname;
    }

    // Restore scroll position for the current route
    const saved = scrollPositions.get(pathname);
    if (saved !== undefined) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        container.scrollTop = saved;
      });
    }
  }, [pathname, containerRef]);
}
```

```tsx
// app/(tabs)/layout.tsx
'use client';

import { useRef } from 'react';
import { BottomTabBar } from '@/components/BottomTabBar';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export default function TabLayout({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  return (
    <div className="h-dvh flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>
      <BottomTabBar />
    </div>
  );
}
```

### Tab Bar Animations

Keep animations minimal for performance on low-end Android devices:

```css
/* Subtle icon bounce on active tab */
@keyframes tab-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.tab-active-icon {
  animation: tab-bounce 200ms ease-out;
}
```

Use CSS `transform` and `opacity` only -- these are GPU-composited and do not trigger layout.

---

## 3. Touch Gestures in React

### Library Recommendations

| Library | Size | Best For | Verdict |
|---------|------|----------|---------|
| **react-swipeable** (v7) | ~3KB | Simple swipe detection | Best for swipe-to-action patterns |
| **@use-gesture/react** (v10) | ~13KB | Complex gestures (pinch, drag) | Best for rich gesture UX |
| **Native Touch Events** | 0KB | Single simple gesture | Fine for pull-to-refresh only |

**Recommendation for a clinic dashboard:** Use `react-swipeable` for swipe-to-action on list items. It is lightweight (critical for Indian 4G) and covers the swipe-right-to-confirm pattern perfectly.

### Swipe-to-Action Pattern (Swipe Right to Confirm Visit)

```tsx
// components/SwipeableVisitCard.tsx
'use client';

import { useSwipeable } from 'react-swipeable';
import { useState, useRef } from 'react';
import { Check } from 'lucide-react';

interface SwipeableVisitCardProps {
  visit: {
    id: string;
    patientName: string;
    time: string;
  };
  onConfirm: (visitId: string) => void;
}

const SWIPE_THRESHOLD = 100; // px to trigger action
const CONFIRM_VELOCITY = 0.3;

export function SwipeableVisitCard({ visit, onConfirm }: SwipeableVisitCardProps) {
  const [offset, setOffset] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (e.dir === 'Right') {
        // Apply resistance after threshold
        const x = e.deltaX;
        const dampened = x > SWIPE_THRESHOLD
          ? SWIPE_THRESHOLD + (x - SWIPE_THRESHOLD) * 0.3
          : x;
        setOffset(Math.max(0, dampened));
      }
    },
    onSwipedRight: (e) => {
      if (e.deltaX > SWIPE_THRESHOLD || e.velocity > CONFIRM_VELOCITY) {
        // Trigger confirm
        setConfirmed(true);
        setOffset(0);

        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        onConfirm(visit.id);
      } else {
        // Spring back
        setOffset(0);
      }
    },
    onSwiped: () => {
      if (!confirmed) setOffset(0);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 10, // Min distance to start recognizing swipe
  });

  const progress = Math.min(offset / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background reveal layer */}
      <div
        className="absolute inset-0 flex items-center pl-6 transition-colors"
        style={{
          backgroundColor: progress > 0.8 ? '#16a34a' : '#dcfce7',
        }}
      >
        <Check
          className="w-6 h-6 transition-transform"
          style={{
            color: progress > 0.8 ? 'white' : '#16a34a',
            transform: `scale(${0.5 + progress * 0.5})`,
          }}
        />
        <span className="ml-2 text-sm font-medium text-green-700">
          {progress > 0.8 ? 'Release to confirm' : 'Swipe to confirm'}
        </span>
      </div>

      {/* Foreground card */}
      <div
        {...handlers}
        ref={cardRef}
        className={`
          relative bg-white p-4 border border-gray-100
          ${confirmed ? 'bg-green-50' : ''}
        `}
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
          willChange: 'transform',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{visit.patientName}</p>
            <p className="text-sm text-gray-500">{visit.time}</p>
          </div>
          {confirmed && (
            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
              <Check className="w-4 h-4" /> Confirmed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Pull-to-Refresh in Next.js

```tsx
// hooks/usePullToRefresh.ts
'use client';

import { useCallback, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // px to pull before triggering (default 80)
  maxPull?: number;   // max pull distance (default 120)
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate if at top of scroll container
    const container = e.currentTarget;
    if (container.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY < 0) {
      isPulling.current = false;
      return;
    }

    // Apply diminishing resistance
    const dampened = Math.min(deltaY * 0.5, maxPull);
    setPullDistance(dampened);
  }, [isRefreshing, maxPull]);

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.5); // Hold at spinner position
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  const isTriggered = pullDistance >= threshold;

  return {
    pullDistance,
    isRefreshing,
    isTriggered,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
```

```tsx
// Usage in a page
function VisitsPage() {
  const { pullDistance, isRefreshing, isTriggered, handlers } =
    usePullToRefresh({
      onRefresh: async () => {
        await refetchVisits();
      },
    });

  return (
    <div {...handlers} className="overflow-y-auto h-full">
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height]"
        style={{ height: pullDistance }}
      >
        <div
          className={`w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full
            ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: `rotate(${pullDistance * 3}deg)`,
            opacity: Math.min(pullDistance / 60, 1),
          }}
        />
      </div>

      {/* Page content */}
      <VisitsList />
    </div>
  );
}
```

**Important:** Disable the browser's native pull-to-refresh in standalone PWA mode:

```css
/* globals.css */
html, body {
  overscroll-behavior-y: contain;
}
```

---

## 4. Offline-First Patterns for Dashboard PWAs

### Service Worker Strategy with Serwist (next-pwa successor)

**Serwist** is the maintained replacement for `next-pwa`. It wraps Workbox and works with Next.js App Router.

> **Note (as of late 2025):** Serwist does not support Turbopack (Next.js 16's default dev bundler). Use `--webpack` flag for dev testing.

```bash
npm install @serwist/next @serwist/precaching @serwist/strategies @serwist/routing
```

### What to Cache

| Asset Type | Strategy | Rationale |
|-----------|----------|-----------|
| App shell (HTML, JS, CSS) | **Precache** (install-time) | Must work offline immediately |
| Fonts, icons, images | **Cache-First** | Rarely change, save bandwidth |
| API: patient list | **Stale-While-Revalidate** | Show cached data instantly, update in background |
| API: visit mutations | **Network-Only + Background Sync** | Must reach server eventually |
| API: dashboard stats | **Network-First** (30s timeout) | Freshness matters, fallback to cache |
| Large reports/PDFs | **Cache on demand** | Only cache what user explicitly opens |

### Service Worker Implementation

```typescript
// app/sw.ts
import { defaultCache } from '@serwist/next/worker';
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from '@serwist/strategies';
import { ExpirationPlugin } from '@serwist/expiration';
import { BackgroundSyncPlugin } from '@serwist/background-sync';
import { registerRoute } from '@serwist/routing';
import { precacheAndRoute } from '@serwist/precaching';

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: any };

// Precache app shell
precacheAndRoute(self.__SW_MANIFEST);

// API: Patient data -- show stale, update in background
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/patients'),
  new StaleWhileRevalidate({
    cacheName: 'api-patients',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// API: Dashboard stats -- prefer fresh, fall back to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/dashboard'),
  new NetworkFirst({
    cacheName: 'api-dashboard',
    networkTimeoutSeconds: 5, // Fall back to cache if network is slow
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
  })
);

// API: Mutations (visit confirmations) -- queue and retry
const bgSyncPlugin = new BackgroundSyncPlugin('mutation-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
});

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/visits') && request.method === 'POST',
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Static assets -- cache first
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);
```

### What to Show Offline

```tsx
// hooks/useOnlineStatus.ts
'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true // SSR: assume online
  );
}
```

```tsx
// components/OfflineBanner.tsx
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
      <WifiOff className="w-4 h-4 text-amber-600" />
      <span className="text-sm text-amber-800">
        You are offline. Changes will sync when connected.
      </span>
    </div>
  );
}
```

### Offline Data Sync Queue (Client-Side)

For mutations that happen while offline (beyond what Background Sync handles):

```typescript
// lib/offlineQueue.ts

interface QueuedAction {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: string;
  timestamp: number;
  retries: number;
}

const DB_NAME = 'ruthva-offline';
const STORE_NAME = 'pending-actions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) {
  const db = await openDB();
  const item: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  };
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add(item);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

export async function flushQueue(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const items: QueuedAction[] = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  for (const item of items.sort((a, b) => a.timestamp - b.timestamp)) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body,
      });
      if (res.ok) {
        // Remove from queue
        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        deleteTx.objectStore(STORE_NAME).delete(item.id);
      }
    } catch {
      // Will retry on next flush
    }
  }
}

// Auto-flush when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue();
  });
}
```

---

## 5. Form UX on Mobile

### Pill Button Selectors (Tap Instead of Dropdown)

Dropdowns are painful on mobile: they obscure content, require precise tapping, and feel slow. **Pill buttons** are superior for 2-6 options.

```tsx
// components/PillSelector.tsx
'use client';

import { useState } from 'react';

interface PillSelectorProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  multiple?: boolean;
}

export function PillSelector<T extends string>({
  label,
  options,
  value,
  onChange,
}: PillSelectorProps<T>) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700 mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={`
                px-4 py-2.5 rounded-full text-sm font-medium
                transition-all duration-150
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'}
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Usage
<PillSelector
  label="Visit Type"
  options={[
    { value: 'checkup', label: 'Check-up' },
    { value: 'followup', label: 'Follow-up' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'vaccination', label: 'Vaccination' },
  ]}
  value={visitType}
  onChange={setVisitType}
/>
```

### Numeric Keyboard and Input Modes

```html
<!-- Phone number: telephone keypad -->
<input type="tel" inputMode="tel" autoComplete="tel" />

<!-- Age, count: numeric keypad (no decimal) -->
<input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" />

<!-- Weight, temperature: numeric with decimal -->
<input type="text" inputMode="decimal" />

<!-- PIN / OTP: numeric, one-time-code autocomplete -->
<input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />

<!-- Email -->
<input type="email" inputMode="email" autoComplete="email" />
```

**The trio matters:** `type` + `inputMode` + `autoComplete` work together.

### Prevent iOS Zoom on Input Focus

iOS Safari auto-zooms when input font-size is below 16px. The fix:

```css
/* Option 1: Set all inputs to 16px (recommended) */
input, select, textarea {
  font-size: 16px;
}

/* Option 2: If your design requires smaller text,
   use transform to visually shrink while keeping 16px base */
.small-input {
  font-size: 16px;
  transform: scale(0.875); /* Visually 14px */
  transform-origin: left center;
}
```

**Do NOT use** `maximum-scale=1` in the viewport meta tag -- it breaks accessibility by preventing users from zooming the entire page.

### Auto-Focus Patterns

```tsx
// Auto-focus the first input when a form becomes visible
// (e.g., when a bottom sheet opens)

import { useEffect, useRef } from 'react';

function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    // Small delay to ensure transitions are complete
    // and virtual keyboard doesn't interfere with animation
    const timer = setTimeout(() => {
      ref.current?.focus();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return ref;
}

// Usage
function PatientForm() {
  const nameRef = useAutoFocus<HTMLInputElement>();

  return (
    <form>
      <input
        ref={nameRef}
        name="patientName"
        placeholder="Patient name"
        className="text-base" // 16px to prevent iOS zoom
      />
    </form>
  );
}
```

### Form Bottom Padding for Keyboard

```css
/* When the virtual keyboard is visible, ensure the form
   isn't hidden behind it. Use env() for safe areas. */
.form-container {
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
}

/* Use dvh instead of vh to account for mobile browser chrome + keyboard */
.full-height {
  height: 100dvh;
}
```

---

## 6. Performance on Indian 4G

### Target Metrics for Indian 4G Networks

Indian 4G median download speed: ~15-25 Mbps, but highly variable. In rural/clinic areas, expect **3-8 Mbps with high latency (100-300ms RTT)**. Target for a "good" experience:

| Metric | Target | Rationale |
|--------|--------|-----------|
| **LCP** | < 2.5s (ideally < 1.8s) | Google "good" threshold |
| **FCP** | < 1.5s | First meaningful content visible |
| **INP** | < 200ms | Interactions feel instant |
| **CLS** | < 0.1 | No layout jumps |
| **Total JS bundle** | < 150KB gzipped | Fits in ~2-3 round trips |
| **Initial HTML + critical CSS** | < 50KB | First paint within 1 RTT |
| **Total page weight** | < 500KB first load | Respects data budgets |

### Bundle Size Budgets

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      // Add any large libraries
    ],
  },
};
```

Use `@next/bundle-analyzer` to audit:

```bash
npm install @next/bundle-analyzer
ANALYZE=true npm run build
```

**Rule of thumb:** If a third-party package adds >10KB gzipped to your client bundle, question whether you truly need it client-side.

### Image Optimization

```tsx
import Image from 'next/image';

// Use next/image -- automatically generates WebP, serves responsive sizes
<Image
  src="/photos/clinic-hero.jpg"
  alt="Clinic"
  width={400}
  height={300}
  priority        // For above-the-fold LCP image
  sizes="(max-width: 768px) 100vw, 400px"
  quality={75}    // Good balance for Indian bandwidth
/>

// For avatars and small icons: use blur placeholder
<Image
  src={patient.avatarUrl}
  alt={patient.name}
  width={48}
  height={48}
  placeholder="blur"
  blurDataURL={patient.blurHash}  // Generate at upload time
/>
```

**WebP reduces images by ~60-80%** compared to JPEG. Next.js Image does this automatically.

### Next.js 15+ Features That Help

#### 1. Streaming with Suspense

Show the page shell immediately, stream in data-heavy sections:

```tsx
// app/(tabs)/dashboard/page.tsx
import { Suspense } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StatsSkeleton, StatsSection } from '@/components/StatsSection';
import { RecentVisitsSkeleton, RecentVisits } from '@/components/RecentVisits';

export default function DashboardPage() {
  return (
    <div>
      {/* Static: renders instantly */}
      <DashboardHeader />

      {/* Streams in when data is ready */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<RecentVisitsSkeleton />}>
        <RecentVisits />
      </Suspense>
    </div>
  );
}
```

#### 2. Partial Prerendering (PPR) -- Experimental

PPR serves a static shell instantly at the CDN edge, then streams in dynamic parts. This is ideal for dashboards where the layout is static but data is dynamic.

```javascript
// next.config.js
module.exports = {
  experimental: {
    ppr: 'incremental',
  },
};
```

```tsx
// app/(tabs)/dashboard/page.tsx
export const experimental_ppr = true;
```

**Impact:** First paint can happen in <100ms from edge CDN, even on slow networks.

#### 3. React Server Components (RSC)

Move data fetching and heavy logic to the server. The client receives only rendered HTML + minimal JS for interactivity:

```tsx
// This component sends ZERO JavaScript to the client
async function PatientStats() {
  const stats = await db.query('SELECT count(*) FROM patients WHERE ...');
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard label="Total Patients" value={stats.total} />
      <StatCard label="Today's Visits" value={stats.todayVisits} />
    </div>
  );
}
```

#### 4. Dynamic Imports for Heavy Components

```tsx
import dynamic from 'next/dynamic';

// Only load the chart library when this component is needed
const VisitsChart = dynamic(() => import('@/components/VisitsChart'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />,
  ssr: false, // Charts don't need SSR
});
```

### Additional Performance Tips for India

- **Use `next/font` with `swap` display** -- prevents invisible text during font load
- **Compress API responses** -- enable gzip/brotli on your API
- **Prefetch visible links only** -- `<Link prefetch={false}>` for below-fold links to save bandwidth
- **Consider `saveData` API** -- some Indian users enable data saving mode

```typescript
// Detect data-saving preference
function isDataSaverEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as any).connection;
  return connection?.saveData === true;
}

// Serve lower-quality images or skip animations when data saver is on
```

---

## 7. CSS-Only Page Transitions

### View Transitions API -- The Standard

The View Transitions API is the browser-native way to create smooth page transitions. It is **production-ready on Android Chrome** (the primary target).

#### Browser Support (as of March 2026)

| Feature | Chrome Android | Edge | Firefox | Safari iOS |
|---------|---------------|------|---------|------------|
| Same-document (`startViewTransition`) | 111+ | 111+ | 133+ | 18+ |
| Cross-document (`@view-transition`) | 126+ | 126+ | Not yet | 18.2+ |
| `view-transition-class` | 125+ | 125+ | 144+ | 18.2+ |

**For Indian clinic staff on Android Chrome: Full support.** All features work.

### Next.js Integration

#### Option A: Built-in (Experimental Flag)

```javascript
// next.config.js
module.exports = {
  experimental: {
    viewTransition: true,
  },
};
```

This enables React's `<ViewTransition>` component which wraps `startViewTransition` automatically during navigation.

#### Option B: next-view-transitions Library

```bash
npm install next-view-transitions
```

```tsx
// app/layout.tsx
import { ViewTransitions } from 'next-view-transitions';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ViewTransitions>
  );
}
```

```tsx
// Use the Link component from the library
import { Link } from 'next-view-transitions';

<Link href="/patients/123">View Patient</Link>
```

### CSS for App-Like Transitions

```css
/* globals.css */

/* Default transition: crossfade (300ms, fast enough for mobile) */
::view-transition-old(root) {
  animation: fade-out 200ms ease-out;
}

::view-transition-new(root) {
  animation: fade-in 200ms ease-in;
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide transition for drill-down navigation (e.g., patient list -> detail) */
::view-transition-old(page-content) {
  animation: slide-out-left 250ms ease-in-out;
}

::view-transition-new(page-content) {
  animation: slide-in-right 250ms ease-in-out;
}

@keyframes slide-out-left {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-30%); opacity: 0; }
}

@keyframes slide-in-right {
  from { transform: translateX(30%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Hero transition for shared elements (e.g., patient avatar) */
.patient-avatar {
  view-transition-name: patient-avatar;
}

::view-transition-old(patient-avatar),
::view-transition-new(patient-avatar) {
  animation-duration: 300ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Performance Considerations

- View Transitions API is **GPU-composited** -- no jank on low-end Android
- Keep transition duration at **200-300ms** -- feels snappy without being jarring
- Use `transform` and `opacity` only -- avoid `width`, `height`, `top`, `left`
- **Fallback gracefully:** if the browser does not support view transitions, navigation still works (just without animation)

```css
/* Progressive enhancement: only apply animations if supported */
@supports (view-transition-name: none) {
  /* View transition CSS here */
}
```

---

## Summary: Implementation Priority

For a clinic dashboard used by Indian clinic staff on Android Chrome:

1. **Service Worker + Offline** (highest impact) -- Serwist + Workbox strategies. Indian connectivity is unreliable.
2. **Performance** -- Server Components, streaming, <150KB JS budget. Directly affects usability on 4G.
3. **Bottom Tab Navigation** -- Makes the app feel native immediately. Preserve scroll positions.
4. **Form UX** -- Pill selectors, correct `inputMode`, 16px inputs. Clinic staff enter data all day.
5. **Install Prompt** -- Custom banner after engagement, emphasize "offline" and "free."
6. **Swipe Gestures** -- Swipe-to-confirm for visit cards. Use `react-swipeable` (3KB).
7. **Page Transitions** -- View Transitions API. Zero-library, GPU-composited, full Android Chrome support.

---

## Sources

- [web.dev: Customize Install Prompt](https://web.dev/articles/customize-install)
- [web.dev: Patterns for Promoting PWA Installation](https://web.dev/articles/promote-install)
- [MDN: beforeinstallprompt Event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)
- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Chrome Developers: View Transitions in 2025](https://developer.chrome.com/blog/view-transitions-in-2025)
- [Chrome Developers: Workbox Background Sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync)
- [Next.js Docs: Progressive Web Apps](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js Docs: Partial Prerendering](https://nextjs.org/docs/15/app/getting-started/partial-prerendering)
- [Next.js Docs: viewTransition Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [Serwist: Getting Started with Next.js](https://serwist.pages.dev/docs/next/getting-started)
- [next-view-transitions Library](https://github.com/shuding/next-view-transitions)
- [react-swipeable](https://github.com/FormidableLabs/react-swipeable)
- [@use-gesture/react](https://github.com/pmndrs/use-gesture)
- [Can I Use: View Transitions](https://caniuse.com/view-transitions)
- [CSS-Tricks: inputmode](https://css-tricks.com/finger-friendly-numerical-inputs-with-inputmode/)
- [Rick Strahl: Preventing iOS Textbox Auto-Zooming](https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing)
- [Blazity: Next.js Performance Optimization 2025](https://blazity.com/the-expert-guide-to-nextjs-performance-optimization)
- [LogRocket: Next.js 16 PWA with Offline Support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
