/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Axis-aligned geometry for the FLIP engine in `layout-projection.ts`.
 *
 * The approach — per-axis boxes in viewport space, deltas expressed as a scale
 * about a box centre plus a translate, and a scale-corrected border radius — is
 * derived from Motion's MIT-licensed projection system
 * (https://github.com/motiondivision/motion, `motion-dom/projection`).
 */

/** One dimension of a box, in viewport pixels. */
export interface Axis {
  min: number;
  max: number;
}

/** A viewport-space rectangle. */
export interface Box {
  x: Axis;
  y: Axis;
}

/**
 * How much of a layout change a target participates in. Mirrors the accepted
 * values of the `data-layout` attribute.
 */
export type LayoutAnimationType =
  | 'both'
  | 'position'
  | 'size'
  | 'preserve-aspect'
  | 'x'
  | 'y';

// Below these thresholds a delta is not perceivable, so it is snapped away to
// keep `transform: none` on elements that did not really move.
const SCALE_EPSILON = 0.0001;
const TRANSLATE_EPSILON = 0.01;

// An aspect ratio change larger than this makes `preserve-aspect` fall back to
// animating position only, since scaling would visibly distort the content.
const ASPECT_TOLERANCE = 0.2;

export const axisLength = (axis: Axis) => axis.max - axis.min;

export const axisCenter = (axis: Axis) => (axis.min + axis.max) / 2;

export const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

export const boxFromRect = ({ left, right, top, bottom }: DOMRect): Box => ({
  x: { min: left, max: right },
  y: { min: top, max: bottom },
});

export const cloneBox = ({ x, y }: Box): Box => ({
  x: { ...x },
  y: { ...y },
});

const mixAxis = (from: Axis, to: Axis, progress: number): Axis => ({
  min: mix(from.min, to.min, progress),
  max: mix(from.max, to.max, progress),
});

export const mixBox = (from: Box, to: Box, progress: number): Box => ({
  x: mixAxis(from.x, to.x, progress),
  y: mixAxis(from.y, to.y, progress),
});

const aspectRatio = (box: Box) => axisLength(box.x) / axisLength(box.y);

const isNear = (a: number, b: number, tolerance: number) =>
  Math.abs(a - b) <= tolerance;

/**
 * A scale/translate map from one box space to another, per axis. Composing two
 * of these stays a scale/translate map, which is what lets nested participants
 * be corrected without matrix maths.
 */
export interface AxisMap {
  scale: number;
  offset: number;
}

export interface BoxMap {
  x: AxisMap;
  y: AxisMap;
}

export const IDENTITY_MAP: BoxMap = {
  x: { scale: 1, offset: 0 },
  y: { scale: 1, offset: 0 },
};

const mapAxis = (axis: Axis, { scale, offset }: AxisMap): Axis => ({
  min: axis.min * scale + offset,
  max: axis.max * scale + offset,
});

export const mapBox = (box: Box, map: BoxMap): Box => ({
  x: mapAxis(box.x, map.x),
  y: mapAxis(box.y, map.y),
});

/**
 * The transform that projects `from` onto `to`, as a scale about the centre of
 * `from` plus a viewport-space translate.
 */
export interface AxisDelta {
  scale: number;
  translate: number;
}

export interface BoxDelta {
  x: AxisDelta;
  y: AxisDelta;
}

const axisDelta = (from: Axis, to: Axis): AxisDelta => {
  const fromLength = axisLength(from);
  let scale = fromLength ? axisLength(to) / fromLength : 1;
  let translate = axisCenter(to) - axisCenter(from);

  if (!Number.isFinite(scale) || isNear(scale, 1, SCALE_EPSILON)) {
    scale = 1;
  }
  if (!Number.isFinite(translate) || isNear(translate, 0, TRANSLATE_EPSILON)) {
    translate = 0;
  }

  return { scale, translate };
};

export const boxDelta = (from: Box, to: Box): BoxDelta => ({
  x: axisDelta(from.x, to.x),
  y: axisDelta(from.y, to.y),
});

export const isIdentityDelta = ({ x, y }: BoxDelta) =>
  x.scale === 1 && x.translate === 0 && y.scale === 1 && y.translate === 0;

/**
 * Resolves `preserve-aspect` against the two layout boxes involved. Scaling
 * only distorts content once the aspect ratio has really changed; below that a
 * plain scale reads better than a size pop.
 * @param type animation type read from `data-layout`
 * @param from layout box the element is coming from
 * @param to layout box the element is going to
 */
export function resolveAnimationType(
  type: LayoutAnimationType,
  from: Box,
  to: Box
): Exclude<LayoutAnimationType, 'preserve-aspect'> {
  if (type !== 'preserve-aspect') {
    return type;
  }

  return isNear(aspectRatio(from), aspectRatio(to), ASPECT_TOLERANCE)
    ? 'both'
    : 'position';
}

/**
 * Narrows the box an element animates *from* so it only participates in the
 * part of the layout change its animation type asks for. Constraining the
 * origin box rather than the emitted transform keeps one code path for every
 * type.
 * @param type resolved animation type
 * @param from box the element animates from
 * @param to the element's own post-update layout box
 */
export function constrainOrigin(
  type: Exclude<LayoutAnimationType, 'preserve-aspect'>,
  from: Box,
  to: Box
): Box {
  switch (type) {
    // Keep the origin's size but start it at the destination's position.
    case 'size':
      return {
        x: { min: to.x.min, max: to.x.min + axisLength(from.x) },
        y: { min: to.y.min, max: to.y.min + axisLength(from.y) },
      };

    // Freeze the axis that isn't named.
    case 'x':
      return { x: { ...from.x }, y: { ...to.y } };
    case 'y':
      return { x: { ...to.x }, y: { ...from.y } };

    // Keep the origin's position but the destination's size, so nothing scales.
    case 'position':
      return {
        x: { min: from.x.min, max: from.x.min + axisLength(to.x) },
        y: { min: from.y.min, max: from.y.min + axisLength(to.y) },
      };

    default:
      return from;
  }
}

/**
 * Builds the `transform` that reprojects an element's own layout box onto the
 * box it should currently occupy.
 *
 * `treeScale` is the scale the element inherits from participating ancestors.
 * Translate happens in the element's own coordinate space, which that scale has
 * already stretched, so it has to be divided back out.
 * @param delta projection from the element's rendered box onto its target box
 * @param treeScale accumulated scale inherited from ancestors
 */
export function buildTransform(delta: BoxDelta, treeScale: BoxMap): string {
  const translateX = delta.x.translate / treeScale.x.scale;
  const translateY = delta.y.translate / treeScale.y.scale;
  let transform = '';

  if (translateX || translateY) {
    transform = `translate3d(${translateX}px, ${translateY}px, 0) `;
  }
  if (delta.x.scale !== 1 || delta.y.scale !== 1) {
    transform += `scale(${delta.x.scale}, ${delta.y.scale})`;
  }

  return transform.trim() || 'none';
}

/**
 * The four corner radii of an element, in pixels. `undefined` where the radius
 * is not a plain pixel length and so cannot be scale-corrected.
 */
export type CornerRadii = [
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined,
];

export const RADIUS_PROPERTIES = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const;

/**
 * Reads the corner radii that can be corrected while an element is scaled.
 * @param style computed style of the element
 */
export function readCornerRadii(style: CSSStyleDeclaration): CornerRadii {
  return RADIUS_PROPERTIES.map((property) => {
    const value = style[property];
    // A two-value or percentage radius is already relative to the box, so it
    // survives scaling on its own and must be left alone.
    if (!value.endsWith('px') || value.includes(' ')) {
      return undefined;
    }
    const radius = Number.parseFloat(value);
    return radius > 0 ? radius : undefined;
  }) as unknown as CornerRadii;
}

/**
 * Expresses a pixel radius as a percentage of the box the element currently
 * appears to occupy, which keeps the rendered radius constant under scale
 * without triggering a paint per frame.
 * @param radius radius in pixels at the element's own layout size
 * @param target box the element currently appears to occupy
 */
export const correctRadius = (radius: number, target: Box) => {
  const x = axisLength(target.x);
  const y = axisLength(target.y);

  return `${x ? (radius / x) * 100 : 0}% ${y ? (radius / y) * 100 : 0}%`;
};
