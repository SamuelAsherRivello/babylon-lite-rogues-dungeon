# Game events and Log policy

`applyAction(campaign, action)` is a pure domain transaction. It returns a new state, ordered semantic events, whether it was accepted, and its tick count. `createGameSession` serializes dispatches, assigns session-unique transaction and event IDs, notifies subscribers, then invokes its commit callback. Rejected actions publish rejection facts but do not mutate campaign state or advance time. View rendering and idle time do not dispatch actions.

## Extending events

Add stable event types to `EVENT_TYPES` in `src/game/dungeon.js`. Emit structured `facts` at the source with the relevant previous/current values, cause, item identity, or destination. Do not add formatted Log sentences or Log-only callbacks to domain rules. Subscribers receive raw events regardless of the Log policy.

## Log policy

`src/game/log-policy.js` owns the allowlist, readable formatting, deduplication by event ID, and 200-entry retention limit. Movement, time, rejections, and insufficient-Mana actions remain observable events but do not produce entries. To change Log coverage, update or add a formatter after confirming the source event has the needed facts. Hidden or scrolled-out Log UI continues receiving projected entries through the session subscriber.

Autosave runs from the finalized commit callback after subscribers update the committed state. A write failure publishes `campaign.save.failed` as a system event; that event can update Log and UI, but it does not dispatch gameplay or trigger another save attempt.

## Auto scroll

`src/ui/ScrollArea.jsx` provides an opt-in `autoScroll` prop for scrollable areas. The Log currently uses it: it opens at the bottom and follows new entries and layout changes. Scrolling away from the bottom pauses following; returning to the bottom resumes it. Other scroll areas retain their normal behavior. Log entries use `0.43rem` text (about 5.16 pt at the default browser font size).
