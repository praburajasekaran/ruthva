# Julik's Race Condition & UI Timing Review

**Plan reviewed:** `docs/plans/2026-03-01-feat-ruthva-v1-treatment-continuity-platform-plan.md`
**Date:** 2026-03-02
**Reviewer perspective:** Data races, UI timing, optimistic updates, concurrent operations

---

## 1. CRITICAL: "Mark Visited" vs Pull-to-Refresh Race

**The scenario:** Staff pulls down to refresh the dashboard. While the fetch is in-flight, they also tap "Mark Visited" on a patient row. Two things now compete:

1. The server action for `visit_confirmed` event creation
2. The dashboard data refetch

**What goes wrong:** The pull-to-refresh response arrives with *stale* data (computed before the `visit_confirmed` was written). The UI overwrites the optimistic "visited" state with the old "not visited" state. The staff member sees the patient flip back to "unvisited" and taps again. You now have two `visit_confirmed` events for the same visit. Or worse, they think it did not work at all.

**Recommendation:**

The dashboard needs a simple state machine with three states:

```typescript
const STATE_IDLE = Symbol("idle");
const STATE_REFRESHING = Symbol("refreshing");
const STATE_MUTATING = Symbol("mutating");
```

Rules:
- While `STATE_MUTATING`: suppress or defer any incoming refresh response. Do not apply stale fetch results on top of an in-flight mutation.
- While `STATE_REFRESHING`: disable action buttons OR queue mutations until the refresh settles. I prefer disabling — the staff member can wait 400ms.
- After a mutation completes: trigger a fresh fetch to reconcile. This fetch is the single source of truth.

Do NOT rely on React's concurrent rendering to solve this. React has zero opinions about your server state races. If you use a library like `useSWR` or `react-query`, use their `mutate()` with rollback, but understand that pull-to-refresh is *your* custom gesture — it will not automatically coordinate with the mutation cache.

**Idempotency key on the server:** The `visit_confirmed` event should carry an idempotency key of `journey_id + event_type + expected_date`. The plan mentions this for cron events (line 911) but does not mention it for staff-initiated events. Staff double-taps are real. Add a unique constraint.

---

## 2. CRITICAL: Optimistic Updates for "Mark Visited"

**The plan says:** "Staff one-tap 'Visited' button" (line 748). It does not specify whether the UI updates optimistically or waits for the server.

**My recommendation: Use optimistic updates, but with a visible pending state.**

Here is why waiting is bad: On Indian 4G with Neon Mumbai, a server action round-trip is 200-800ms. During that time the button sits there looking tappable. The staff member *will* tap again. You have now created two events.

Here is the pattern:

```typescript
// Simplified — not a library, just a dozen lines
const STATE_IDLE = Symbol();
const STATE_PENDING = Symbol();
const STATE_CONFIRMED = Symbol();
const STATE_FAILED = Symbol();

function useVisitConfirmation(journeyId: string, visitDate: string) {
  const [state, setState] = useState(STATE_IDLE);

  const confirm = async () => {
    if (state !== STATE_IDLE) return; // Guard: refuse if already pending
    setState(STATE_PENDING);
    try {
      await confirmVisitAction(journeyId, visitDate);
      setState(STATE_CONFIRMED);
    } catch {
      setState(STATE_FAILED);
      // Auto-reset after showing error briefly
      setTimeout(() => setState(STATE_IDLE), 2000);
    }
  };

  return { state, confirm };
}
```

The button renders differently per state:
- `IDLE`: green "Mark Visited" button
- `PENDING`: grey, disabled, shows a small spinner or checkmark animation (32ms CSS transition — one intermediate frame, one final frame, that is all you need)
- `CONFIRMED`: checkmark icon, no longer tappable
- `FAILED`: brief red flash, then resets to IDLE

**Do not** use `disabled` alone. On mobile, a disabled button with no visual change looks like the tap did not register. The user taps harder. Show the state change *immediately* — within the same frame as the tap event.

---

## 3. CRITICAL: Swipe-Right to Mark Visited — Gesture Conflicts

**The plan says:** "Swipe-right on patient row -> quick 'Mark Visited' action" (line 519).

**Races here:**

1. **Swipe vs scroll:** If the patient list is scrollable (it is), a diagonal swipe can trigger both scroll and the swipe-right gesture simultaneously. You need a gesture discriminator: if the horizontal delta exceeds the vertical delta within the first 50ms of touch, commit to swipe; otherwise, commit to scroll. Use `touch-action: pan-y` on the swipeable row to let the browser handle vertical scrolling and give you horizontal control.

2. **Swipe vs pull-to-refresh:** Pull-to-refresh is a vertical gesture starting from scroll-top. Swipe-right is horizontal. If the user starts at the top of the list and swipes diagonally down-right, both gestures compete. Solution: pull-to-refresh should only activate when `scrollTop === 0` AND the gesture is predominantly vertical (vertical delta > 2x horizontal delta).

3. **Swipe animation vs React re-render:** If the swipe triggers a server action that causes a React re-render (via router refresh or SWR revalidation), the re-render will destroy the DOM node mid-animation. The swipe drawer snaps back, the row flickers, and a new row appears in its place. This looks *dreadful* — like the app glitched.

**Solution:** After the swipe completes and the action fires, hold the animated state for at least 300ms (or until the row slides out of view with a "confirmed" animation), then allow the re-render. Use a ref to track whether the row is in "post-swipe" state and skip re-renders until the animation completes. Or simpler: do not re-render the list at all — just visually update the swiped row in-place and defer the full refresh.

---

## 4. CRITICAL: Webhook Arrival and Dashboard Freshness

**The scenario:** A patient replies "Yes" via WhatsApp. Gupshup fires a webhook to `/api/webhooks/gupshup`. The webhook handler creates an `adherence_response` event. Meanwhile, the doctor is staring at the dashboard.

**The plan's gap:** There is no mechanism for the dashboard to know about new events. Risk levels are computed nightly by cron (line 340). The dashboard presumably fetches data on load and on pull-to-refresh. Between those moments, the dashboard is stale.

**This is acceptable for V1** — the plan acknowledges "Stale risk levels: Risk computed nightly, not real-time -> acceptable for V1" (line 911). But the *events* are real-time (webhook creates them instantly), while the *risk display* is nightly. This creates a confusing gap: the patient timeline shows the adherence response, but the risk badge still says "At Risk."

**Recommendation for V1:** Add a small disclaimer on the dashboard: "Risk levels update overnight." This sets expectations. Do NOT try to add real-time risk recomputation in V1 — it will introduce a whole category of races between the cron worker and the webhook handler both trying to update risk state.

**For V2:** Consider a lightweight polling interval (every 60 seconds) or Server-Sent Events for the dashboard. But not now.

---

## 5. HIGH: Double-Tap Prevention on All Action Buttons

**The plan mentions:** "No 300ms tap delay" (line 528) — good. But removing the tap delay makes double-taps *more* likely, not less. The 300ms delay was originally there to disambiguate single-tap from double-tap. Without it, two rapid taps both fire immediately.

**Every action button needs a guard:**

```typescript
function useGuardedAction(actionFn: () => Promise<void>) {
  const stateRef = useRef(STATE_IDLE);

  const execute = async () => {
    if (stateRef.current !== STATE_IDLE) return;
    stateRef.current = STATE_PENDING;
    // Force synchronous visual update before the async work
    // (React 18+ batches state updates, so use flushSync if needed for the button state)
    try {
      await actionFn();
      stateRef.current = STATE_CONFIRMED;
    } catch {
      stateRef.current = STATE_FAILED;
    }
  };

  return { stateRef, execute };
}
```

Use a `ref` (not `useState`) for the guard check because `useState` updates are batched — two taps in the same frame will both read `STATE_IDLE` from state. A ref update is synchronous.

**Apply this to:**
- "Mark Visited" button
- "Recover Now" button
- "Add Patient" submit button
- Any bottom sheet confirmation button

---

## 6. HIGH: Patient Creation Form Double-Submit

**The scenario:** Staff taps "Add Patient," the server action takes 600ms on 4G. They tap again. Two patients created with the same phone number.

**The plan has a partial mitigation:** `@@unique([clinicId, phone])` constraint on the Patient model (line 193). The second insert will fail with a unique constraint violation. Good. But:

1. The error is ugly if unhandled. The user sees a generic error instead of "Patient already exists."
2. Two `journey_started` events may still be created if the race window is tight enough (patient created, first journey event created, then second request also creates patient — fails — but what if the journey was created first?).

**Recommendation:**

Wrap patient creation + journey creation + event generation in a **database transaction** (the plan mentions this at line 909 — good). But also:

- Catch the unique constraint error specifically and return a friendly message: "This patient already exists in your clinic."
- Disable the submit button on first tap using the guarded action pattern from section 5.
- Add `aria-disabled` for accessibility alongside visual disable.

---

## 7. HIGH: Bottom Sheet Confirmation vs Page Navigation Race

**The plan says:** "Bottom sheet for confirmations (not modal dialogs)" (line 520).

**The race:** Staff opens a bottom sheet to confirm "Mark Visited." While the sheet is animating up (CSS slide transition), they accidentally tap the bottom tab bar (which is beneath the sheet, or becomes tappable during animation). Now you have a page navigation firing while the bottom sheet is open.

**What goes wrong:** The route changes, React unmounts the component tree, the bottom sheet's confirmation callback is lost, but the sheet's CSS animation is still playing on a now-detached DOM node (if not properly cleaned up). Or: the bottom sheet is mounted on the new page's layout and lingers as a ghost.

**Recommendations:**

1. When a bottom sheet is open, add `pointer-events: none` to the bottom tab bar. Remove it when the sheet closes. This is native DOM state management — simple, no library needed.
2. The bottom sheet's backdrop should cover the entire viewport including the tab bar.
3. Use `requestAnimationFrame` for the sheet's entry animation, and check a cancel token:

```typescript
const openSheet = () => {
  if (sheetState !== SHEET_CLOSED) return;
  setSheetState(SHEET_OPENING);
  // CSS transition handles the visual; state gates the interaction
};
```

4. The confirmation action inside the sheet must also use the guarded action pattern.

---

## 8. MEDIUM: CSS Page Transitions vs React State

**The plan says:** "CSS-only slide transitions between views (dashboard -> patient timeline -> add patient)" (line 530).

**The problem with CSS-only transitions in a React SPA:** When you navigate from `/dashboard` to `/patients/[id]`, React unmounts the dashboard component and mounts the patient timeline component. The old DOM node is gone. You cannot animate between two components when one of them no longer exists in the DOM.

**Options (from least to most complex):**

1. **View Transitions API:** Next.js 15 has experimental support for `document.startViewTransition()`. This captures a screenshot of the old view, mounts the new view, and cross-fades or slides between the screenshot and the live DOM. This is the correct approach. It works with React's mount/unmount cycle. Check browser support — Android Chrome 111+ supports it, which covers your target devices.

2. **Layout-level animation wrapper:** Keep both views mounted during the transition using a layout component that manages enter/exit states. This is more complex and fights against Next.js App Router's page-level code splitting.

3. **No page transitions at all for V1:** Given the "No complex page transition animations" note (line 678), I would argue: skip slide transitions entirely. A fast navigation (under 100ms) with no transition feels snappier than a 300ms slide that can race with data loading. Focus the animation budget on micro-interactions (button state changes, risk badge color transitions).

**My strong recommendation:** Do not build CSS slide transitions for V1. They will fight React, they will fight Turbo (if you ever add it), and they will create ghost animations. A fast page load is better than a pretty transition that occasionally glitches.

---

## 9. MEDIUM: PWA Offline -> Online Sync

**The plan says:** "Offline fallback page showing 'You're offline'" (line 393).

**This is the right V1 approach.** Do NOT try to queue mutations offline and replay them when online. Here is what goes wrong:

- Staff marks a patient visited while offline. The mutation is queued in IndexedDB.
- Staff goes online 2 hours later. The queued mutation replays.
- But in those 2 hours, the cron ran and marked the visit as missed. Now you have conflicting events: `visit_missed` (from cron) and `visit_confirmed` (from delayed offline replay).
- The plan says "latest event wins" (line 245), so the `visit_confirmed` would win because its `eventTime` is later. But the `eventTime` was set 2 hours ago when the staff tapped, not when the sync happened. Which timestamp do you use? This is a distributed systems problem and you should not be solving it in V1.

**Recommendation:** The offline fallback page is correct. When offline, show cached dashboard data (read-only) with a clear "Offline — actions will be available when connected" banner. Do not allow mutations. Check `navigator.onLine` before any action and show an inline message if offline.

---

## 10. MEDIUM: Bottom Tab Navigation During Data Loading

**The scenario:** Staff taps "Patients" tab. The patient list starts loading (server component fetch). Before it finishes, they tap "Home" tab. Then tap "Patients" again.

**What goes wrong in Next.js App Router:** Each navigation triggers a new server component render. The first fetch may still be in-flight when the second one starts. If the first response arrives after the second navigation, React might briefly flash the patients page before showing the dashboard.

**Next.js handles this reasonably well** with its built-in navigation cancellation — newer navigations cancel older ones. But the visual experience can still be jarring if there is no loading indicator.

**Recommendation:** Add a thin progress bar at the top of the viewport (like YouTube/GitHub) for route transitions. Next.js App Router exposes `usePathname()` and you can use `loading.tsx` files for Suspense boundaries. Do not build a custom router transition manager — let Next.js handle it, but give the user visual feedback that something is happening.

---

## 11. LOW: Cron vs Staff Visit Confirmation Race (Already Addressed)

**The plan addresses this** at line 817 and line 921: "if `visit_confirmed` exists for a date, ignore `visit_missed` for same date (latest event wins)."

**One gap:** The plan says "latest event takes precedence" using `eventTime DESC` ordering. But what if the cron creates `visit_missed` at 00:01 AM and the staff creates `visit_confirmed` at 11:58 PM the *previous* day (before midnight)? The `visit_missed` has a later `eventTime` and wins, even though the visit was confirmed.

**Recommendation:** The conflict resolution should check for existence, not just ordering. If ANY `visit_confirmed` event exists for a given `visit_expected` date, no `visit_missed` should be emitted for that date. The cron query should be:

```sql
SELECT ve.* FROM events ve
WHERE ve.event_type = 'visit_expected'
  AND ve.metadata->>'expected_date' <= NOW() - INTERVAL '3 days'
  AND NOT EXISTS (
    SELECT 1 FROM events vc
    WHERE vc.journey_id = ve.journey_id
      AND vc.event_type = 'visit_confirmed'
      AND vc.metadata->>'expected_date' = ve.metadata->>'expected_date'
  )
```

---

## Summary: Priority Action Items

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | CRITICAL | Mark Visited vs pull-to-refresh race | State machine (IDLE/REFRESHING/MUTATING); suppress stale refresh during mutation |
| 2 | CRITICAL | No optimistic update spec for Mark Visited | Optimistic update with IDLE/PENDING/CONFIRMED/FAILED states; use ref for guard |
| 3 | CRITICAL | Swipe gesture conflicts (scroll, pull-to-refresh, React re-render) | Gesture discriminator; hold post-swipe state; defer re-render |
| 4 | CRITICAL | Dashboard does not know about webhook events | Acceptable for V1 with disclaimer; do NOT add real-time risk recompute |
| 5 | HIGH | Double-tap on all action buttons | Guarded action pattern with ref (not useState); apply to every mutation button |
| 6 | HIGH | Patient creation double-submit | DB transaction + catch unique constraint + guarded submit button |
| 7 | HIGH | Bottom sheet vs tab bar interaction race | pointer-events:none on tab bar when sheet is open; full-viewport backdrop |
| 8 | MEDIUM | CSS page transitions vs React mount/unmount | Skip slide transitions for V1; fast navigation > pretty animation that races |
| 9 | MEDIUM | PWA offline mutation sync | Correct: do NOT queue offline mutations; show read-only cached data |
| 10 | MEDIUM | Tab navigation during data loading | Use Next.js loading.tsx Suspense; add thin progress bar |
| 11 | LOW | Cron vs staff visit_confirmed timing | Use EXISTS check, not eventTime ordering, for conflict resolution |

---

## General Patterns to Adopt Project-Wide

1. **Use `Symbol()` for state constants** — not strings, not booleans. Two booleans (`isLoading`, `isError`) give you four combinations, two of which are nonsensical. A single state variable with symbols gives you exactly the states you need.

2. **Use refs for synchronous guards** — React's `useState` batches updates. Two clicks in one frame both see the old state. A `useRef` update is synchronous and prevents the second click.

3. **32ms transitions, not 300ms** — One intermediate frame and one final frame. That is enough for the human eye to register "something changed." Anything longer is showing off and will collide with re-renders.

4. **No framer-motion, no animation libraries** — The plan correctly says "CSS-only." Go further: most of your animations should be `transition: background-color 32ms ease-out` on buttons. That is it.

5. **Pull-to-refresh needs an abort controller** — If the user pulls twice quickly, the first fetch should be aborted. Use `AbortController` and pass the signal to your fetch call.

6. **Every server action needs an idempotency key** — For staff-initiated events: `journey_id + event_type + date`. For system events: the plan already has this. Make it universal.
