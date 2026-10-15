# Design

## Context

Babylon Lite owns world sprites while React owns slots and title-bar counters. The existing collection event contains destination facts, but a Babylon-hosted overlay cannot reliably layer above React panels.

## Goals / Non-Goals

**Goals:**
- Hand off accepted pickup presentation from the world to the actual receiving UI layer.
- Preserve camera/Zoom-correct source projection and defer visible credits.

**Non-Goals:**
- Change collection turn cost, inventory capacity, item rules, or manual drag/drop.
- Generalize this transfer system to combat, equipment, or ability animation.

## Decisions

- Portal each transfer into a positioned ancestor shared with its resolved destination. This avoids Babylon and animated game-view stacking contexts while keeping it above the receiving control. A global overlay was rejected because it does not express destination ownership.
- Snapshot source screen coordinates and tile CSS size before the collection state redraw. Recomputing from post-move state gives incorrect starts for camera-follow modes.
- Resolve the destination from the accepted collection result: matching Quick Slot first, matching Inventory stack second, otherwise the planned empty Inventory row; counters receive Key/Gold.
- Keep a presentation snapshot of campaign values until the transfer's 500ms travel and 500ms pause complete. Domain state and saving remain immediate.

## Risks / Trade-offs

- [Target remounts during flight] -> retain the resolved destination layer and cancel safely on teardown.
- [Multiple rapid collections] -> key transfers by collection event and independently retain each visible-credit snapshot.

## Migration Plan

Replace the Babylon-hosted pickup overlay with the destination-owned transfer layer; no save migration is required.
