// Color + height helpers shared by the 3D token pedestals and glowing arrows.
// Keeps shapeView/edgeView lean and reuses the existing hex parsing.
import { hexToNumber, NO_FILL } from "./geometry";

/** Deep-navy fallback for transparent / unset fills so a token still reads as 3D. */
export const FALLBACK = "#0d2638";

function c255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/** Multiply a color toward black (f < 1 darkens — for shaded side walls). */
export function shade(hex: string, f: number): number {
  const n = hexToNumber(hex === NO_FILL ? FALLBACK : hex);
  return (
    (c255(((n >> 16) & 0xff) * f) << 16) |
    (c255(((n >> 8) & 0xff) * f) << 8) |
    c255((n & 0xff) * f)
  );
}

/** Lerp a color toward white (f in 0..1 — for lit rims / top faces). */
export function tint(hex: string, f: number): number {
  const n = hexToNumber(hex === NO_FILL ? FALLBACK : hex);
  const L = (c: number): number => c255(c + (255 - c) * f);
  return (L((n >> 16) & 0xff) << 16) | (L((n >> 8) & 0xff) << 8) | L(n & 0xff);
}

/** Pedestal extrusion height (world-up units) — how tall a token stands. */
export const H_PED = 24;
/** Arrows hover this far above the grid so their glow sits over the floor. */
export const H_ARROW = 9;

/**
 * Cap on the rendered elevation magnitude. The integer `layer` is unbounded and
 * always drives paint order, but the visual lift saturates here so far/near
 * layers never float off-screen or clip through the near plane.
 */
export const ELEV_CAP = 2400;

/**
 * Default world-up units between adjacent floors. Each distinct `layer` value is
 * a discrete board FLOOR drawn at its own elevation. At 220 the floors read as
 * clearly separated plates; ELEV_CAP keeps ~11 floors (10*220 + H_PED = 2224) in
 * front of the near plane before the lift saturates.
 */
export const FLOOR_STEP = 220;
/** @deprecated kept as an alias so older imports keep resolving. */
export const LAYER_STEP = FLOOR_STEP;

// Live, view-adjustable floor spacing — Option+pinch spreads the stack out/in.
// Held as module state (a view dial like zoom/pitch), not document data. Far
// floors still saturate at ELEV_CAP, so the widest steps only fan the lower
// floors apart before the cap clamps the top of the stack.
export const MIN_FLOOR_STEP = 70;
export const MAX_FLOOR_STEP = 1400;
let floorStep = FLOOR_STEP;

/** Current world-up gap between adjacent floors. */
export function getFloorStep(): number {
  return floorStep;
}

/** Set the live floor spacing (clamped). Returns the value actually applied. */
export function setFloorStep(step: number): number {
  floorStep =
    step < MIN_FLOOR_STEP ? MIN_FLOOR_STEP : step > MAX_FLOOR_STEP ? MAX_FLOOR_STEP : step;
  return floorStep;
}

function clampElev(e: number): number {
  return e < -ELEV_CAP ? -ELEV_CAP : e > ELEV_CAP ? ELEV_CAP : e;
}

/** Integer stacking layer / floor index of a shape (0 when unset). The painter's-order key. */
export function layerOf(s: { layer?: number }): number {
  return s.layer ?? 0;
}

/** Floor index of a shape — a readable alias for `layerOf`. */
export function floorOf(s: { layer?: number }): number {
  return s.layer ?? 0;
}

/** World-up elevation of a floor's plane, by index (clamped). */
export function floorElevation(i: number): number {
  return clampElev(i * floorStep);
}

/** World-up elevation of a shape's pedestal base — its floor's plane (clamped). */
export function elevationOf(s: { layer?: number }): number {
  return clampElev(floorOf(s) * floorStep);
}

/** Default opacity kept per floor of separation from the active layer (geometric falloff). */
export const LAYER_FADE_STEP = 0.55;

// Live, view-adjustable fade falloff — the Layers-panel "Distant layer fade"
// slider drives this. A LOWER step fades floors away from the active layer out
// faster (each floor of separation keeps less opacity); a higher step keeps far
// floors clearer. Held as module state (a view dial like zoom/spread), not
// document data.
export const MIN_LAYER_FADE_STEP = 0.25;
export const MAX_LAYER_FADE_STEP = 0.8;
let layerFadeStep = LAYER_FADE_STEP;

/** Current geometric fade applied per floor of separation (the live "layer fade" dial). */
export function getLayerFadeStep(): number {
  return layerFadeStep;
}

/** Set the live fade falloff (clamped). Returns the value actually applied. */
export function setLayerFadeStep(step: number): number {
  layerFadeStep =
    step < MIN_LAYER_FADE_STEP
      ? MIN_LAYER_FADE_STEP
      : step > MAX_LAYER_FADE_STEP
        ? MAX_LAYER_FADE_STEP
        : step;
  return layerFadeStep;
}

/**
 * Opacity multiplier for content `distance` floors away from the active layer:
 * 1 on the active floor, fading geometrically (by the live fade step) with each
 * floor of separation and clamped to `min` so the farthest layers stay faintly
 * visible rather than gone. The default `min` floors the fading "stuff" (tokens
 * and edges) low enough that a far floor can be pushed nearly transparent; the
 * board frame / labels / badges pass a higher `min` so they stay navigable.
 */
export function layerFade(distance: number, min = 0.06): number {
  const d = Math.abs(distance);
  if (d <= 0) return 1;
  return Math.max(min, Math.pow(layerFadeStep, d));
}
