# Design

## Context

See proposal.md for motivation and the world-floating-feedback delta for behavior. The session subscription already receives combat results and holds transient `ParticleEffect` state. The renderer already draws smoke-poff particle frames over world tiles and refreshes their position from the animation clock.

## Goals / Non-Goals

**Goals:**

- Project all committed combat hits into four independent, target-local particle effects.
- Keep particle state outside the game rules and save data.
- Use the existing smoke-poff art and world renderer.

**Non-Goals:**

- Changing damage calculations, combat event contracts, floating damage text, camera impact, particle art, or ability particles.
- Applying the burst for healing, movement, resource spending, or non-damage events.

## Decisions

### Project from combat events at the game boundary

The game session subscriber will convert each `combat.hit` with positive damage and a target position into four damage particle records for enemy targets. Player damage arrives as a committed Health-loss resource event caused by an enemy attack, so that event will create the same burst at the player's position. The two existing event forms cover all current combat targets without changing the game rules.

### Store a deterministic outgoing direction on each record

Each record will carry a random angle created once at spawn. Its renderer position derives from progress, moving linearly from the target center to an endpoint half a tile away. Storing the angle avoids direction changes on React refreshes while preserving random bursts.

### Add a damage-particle animation variant

The particle system will give damage particles a 250-millisecond lifetime, a 0.25 scale, a radial offset, and a triangular opacity curve. Existing movement and ability particle behavior stays unchanged. CSS or inline opacity at the renderer is sufficient because the animation already runs from the renderer's frame clock.

## Risks / Trade-offs

- [Multiple hits in one commit] -> Give every particle a unique ID and retain all bursts until their own lifetime ends.
- [A renderer refresh skips the midpoint] -> Derive opacity from elapsed time, so every sampled frame remains within the intended fade curve.
- [Particle overlap hides sprites] -> Render at the current transient-particle layer without changing actor depth ordering.

## Migration Plan

1. Extend the particle-effect model and renderer math.
2. Project combat hits, clear their timers with the existing session cleanup, and render them above the affected world position.
3. Add focused unit and renderer checks, then run one muted Edge verification of an enemy hit.
