/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { animate } from 'motion';
import type {
  AnimationOptions,
  AnimationPlaybackControls,
  ValueAnimationTransition,
} from 'motion';
import {
  IDENTITY_MAP,
  RADIUS_PROPERTIES,
  axisLength,
  boxDelta,
  boxFromRect,
  buildTransform,
  constrainOrigin,
  correctRadius,
  isIdentityDelta,
  mapBox,
  mixBox,
  readCornerRadii,
  resolveAnimationType,
  type Box,
  type BoxDelta,
  type BoxMap,
  type CornerRadii,
  type LayoutAnimationType,
} from './layout-geometry';

/**
 * A FLIP engine for shared-element and self layout animations, driven by the
 * public `animate()` from `motion`.
 *
 * The overall shape — measure, mutate, measure, pair by id, then reproject with
 * transforms — is derived from Motion's MIT-licensed projection system
 * (https://github.com/motiondivision/motion). Unlike that system there is no
 * persistent node tree or dirty-flag scheduling: a commit is always initiated
 * explicitly, so everything it needs is measured and resolved in one pass.
 */

/** Subtree searched for layout targets. */
export type LayoutScope = Element | Document | ShadowRoot;

/** DOM mutation whose effect on layout should be animated. */
export type LayoutUpdate = () => void | Promise<void>;

/** Handle on a running layout animation. */
export interface LayoutAnimation {
  /** Resolves once every participating element has settled. */
  readonly finished: Promise<void>;
  /** One animation per morph group, mirroring Motion's grouped controls. */
  readonly animations: readonly AnimationPlaybackControls[];
  /** Jumps to the end of the animation and settles. */
  stop(): void;
}

const LAYOUT_SELECTOR = '[data-layout], [data-layout-id]';

const ANIMATION_TYPES = new Set<string>([
  'both',
  'position',
  'size',
  'preserve-aspect',
  'x',
  'y',
]);

/**
 * Elements whose inline `transform`, `opacity` and corner radii this engine has
 * written. Consumers must not set those properties inline on a layout target,
 * because the engine cannot tell its own values apart from theirs.
 */
const owned = new WeakSet<HTMLElement>();

/** Commit currently animating each element, so it can hand the element over. */
const active = new WeakMap<HTMLElement, Commit>();

/**
 * Element currently representing each `data-layout-id`. Entries are dropped as
 * soon as an id has no members left, so this does not pin removed elements.
 */
const leads = new Map<string, HTMLElement>();

/**
 * Flattened-tree parent, i.e. what an element actually inherits transforms
 * from. For slotted content that is the slot, not the light-DOM parent.
 * @param element element to walk up from
 */
function renderedParent(element: Element): Element | null {
  const slot = (element as HTMLElement).assignedSlot;
  if (slot) {
    return slot;
  }
  if (element.parentElement) {
    return element.parentElement;
  }
  const root = element.getRootNode();

  return root instanceof ShadowRoot ? root.host : null;
}

function renderedDepth(element: Element): number {
  let depth = 0;
  let ancestor = renderedParent(element);
  while (ancestor) {
    depth++;
    ancestor = renderedParent(ancestor);
  }

  return depth;
}

function collectTargets(scopes: readonly LayoutScope[]): HTMLElement[] {
  const found = new Set<HTMLElement>();

  for (const scope of scopes) {
    if (scope instanceof HTMLElement && scope.matches(LAYOUT_SELECTOR)) {
      found.add(scope);
    }
    for (const element of scope.querySelectorAll<HTMLElement>(
      LAYOUT_SELECTOR
    )) {
      found.add(element);
    }
  }

  return [...found];
}

function readAnimationType(element: HTMLElement): LayoutAnimationType {
  const value = element.getAttribute('data-layout');

  if (!value || value === 'true' || !ANIMATION_TYPES.has(value)) {
    return 'both';
  }

  return value as LayoutAnimationType;
}

function clearProjection(element: HTMLElement) {
  if (!owned.has(element)) {
    return;
  }
  element.style.transform = '';
  element.style.opacity = '';
  for (const property of RADIUS_PROPERTIES) {
    element.style[property] = '';
  }
  owned.delete(element);
}

/** Boxes measured for one element around a single commit. */
interface Measurement {
  /** Rendered box before the update, including any in-flight projection. */
  visual: Box;
  /** Layout box before the update, with any projection removed. */
  origin: Box;
  /** Layout box after the update. */
  layout?: Box;
}

interface Group {
  lead: Participant;
  /** Eased progress of this group's animation. */
  progress: number;
  /** Box the lead currently occupies. Recomputed every frame. */
  target: Box;
}

interface Participant {
  element: HTMLElement;
  group: Group;
  /** Own layout box after the update, with any projection removed. */
  layout: Box;
  /** Box a lead animates from. Follows track their lead instead. */
  origin: Box;
  isLead: boolean;
  /** Follows the lead's position but keeps its own size. */
  keepsOwnSize: boolean;
  radii: CornerRadii;
  depth: number;
  parent?: Participant;
  /** Cumulative scale and offset this element's children inherit. */
  childMap: BoxMap;
}

class Commit {
  private participants: Participant[] = [];

  private groups: Group[] = [];

  private controls: AnimationPlaybackControls[] = [];

  private done = false;

  private resolveFinished!: () => void;

  readonly finished = new Promise<void>((resolve) => {
    this.resolveFinished = resolve;
  });

  get animations(): readonly AnimationPlaybackControls[] {
    return this.controls;
  }

  /**
   * Measures, applies the update, measures again, then starts the animations.
   * @param scopes subtrees to search for layout targets
   * @param updateDom DOM mutation to animate
   * @param options transition for every group in this commit
   */
  async run(
    scopes: readonly LayoutScope[],
    updateDom: LayoutUpdate,
    options?: AnimationOptions
  ) {
    const before = collectTargets(scopes);
    const measured = new Map<HTMLElement, Measurement>();

    // Anything mid-morph is handed over rather than finished, so the visual
    // boxes below capture what the user can currently see.
    for (const element of before) {
      active.get(element)?.handOver();
    }

    // All reads happen before all writes, and again after, so a commit forces
    // at most three layouts however many targets it touches.
    const rects = before.map((element) => element.getBoundingClientRect());
    before.forEach(clearProjection);
    before.forEach((element, index) => {
      measured.set(element, {
        visual: boxFromRect(rects[index]),
        origin: boxFromRect(element.getBoundingClientRect()),
      });
    });

    await updateDom();

    const after = collectTargets(scopes).filter(
      (element) => element.isConnected
    );
    for (const element of after) {
      if (!measured.has(element)) {
        clearProjection(element);
      }
    }
    for (const element of after) {
      const layout = boxFromRect(element.getBoundingClientRect());
      const existing = measured.get(element);
      if (existing) {
        existing.layout = layout;
      } else {
        measured.set(element, { visual: layout, origin: layout, layout });
      }
    }

    this.build(before, after, measured);
    this.render();
    this.start(options);
  }

  private build(
    before: readonly HTMLElement[],
    after: readonly HTMLElement[],
    measured: Map<HTMLElement, Measurement>
  ) {
    const present = new Set(after);
    const membersBefore = groupById(before);
    const membersAfter = groupById(after);

    for (const id of membersBefore.keys()) {
      if (!membersAfter.has(id)) {
        leads.delete(id);
      }
    }

    for (const [id, members] of membersAfter) {
      const previous = membersBefore.get(id) ?? [];
      const recorded = leads.get(id);
      const previousLead =
        recorded && previous.includes(recorded)
          ? recorded
          : previous[previous.length - 1];
      const added = members.filter((element) => !previous.includes(element));
      const lead =
        added[added.length - 1] ??
        (previousLead && present.has(previousLead)
          ? previousLead
          : members[members.length - 1]);

      // When the id changes hands the new lead starts from wherever the old one
      // was rendered. That is also what makes a morph reverse cleanly: the
      // element left behind at `opacity: 0` becomes the lead on the way back.
      const source =
        previousLead && previousLead !== lead ? previousLead : lead;

      this.addGroup(lead, source, members, measured);
      leads.set(id, lead);
    }

    for (const element of after) {
      if (!element.hasAttribute('data-layout-id')) {
        this.addGroup(element, element, [element], measured);
      }
    }

    this.participants.sort((a, b) => a.depth - b.depth);
    const byElement = new Map(
      this.participants.map((participant) => [participant.element, participant])
    );
    for (const participant of this.participants) {
      let ancestor = renderedParent(participant.element);
      while (ancestor && !byElement.has(ancestor as HTMLElement)) {
        ancestor = renderedParent(ancestor);
      }
      participant.parent = ancestor
        ? byElement.get(ancestor as HTMLElement)
        : undefined;
      active.set(participant.element, this);
    }
  }

  private addGroup(
    lead: HTMLElement,
    source: HTMLElement,
    members: readonly HTMLElement[],
    measured: Map<HTMLElement, Measurement>
  ) {
    const layout = (measured.get(lead) as Measurement).layout as Box;
    const sourceMeasurement = measured.get(source) as Measurement;
    // The aspect-ratio decision compares layout to layout; a mid-morph box is
    // already distorted and would flip the branch at random.
    const type = resolveAnimationType(
      readAnimationType(lead),
      sourceMeasurement.origin,
      layout
    );
    const origin = constrainOrigin(type, sourceMeasurement.visual, layout);
    const followers = members.filter((element) => element !== lead);

    if (followers.length === 0 && isIdentityDelta(boxDelta(layout, origin))) {
      return;
    }

    const group = { progress: 0, target: origin } as Group;
    group.lead = this.addParticipant(group, lead, layout, origin, {
      isLead: true,
      keepsOwnSize: type === 'position',
    });

    for (const follower of followers) {
      const followerLayout = (measured.get(follower) as Measurement)
        .layout as Box;
      this.addParticipant(group, follower, followerLayout, followerLayout, {
        isLead: false,
        keepsOwnSize:
          resolveAnimationType(
            readAnimationType(follower),
            followerLayout,
            layout
          ) === 'position',
      });
    }

    this.groups.push(group);
  }

  private addParticipant(
    group: Group,
    element: HTMLElement,
    layout: Box,
    origin: Box,
    rest: Pick<Participant, 'isLead' | 'keepsOwnSize'>
  ): Participant {
    const participant: Participant = {
      element,
      group,
      layout,
      origin,
      depth: renderedDepth(element),
      radii: readCornerRadii(getComputedStyle(element)),
      childMap: IDENTITY_MAP,
      ...rest,
    };
    this.participants.push(participant);

    return participant;
  }

  private render() {
    for (const group of this.groups) {
      group.target = mixBox(
        group.lead.origin,
        group.lead.layout,
        group.progress
      );
    }

    // Ancestors first, so the map a participant inherits is already resolved.
    for (const participant of this.participants) {
      const inherited = participant.parent?.childMap ?? IDENTITY_MAP;
      const rendered = mapBox(participant.layout, inherited);
      // Sizing from the element's own layout box rather than its rendered one
      // is what counter-scales it out of a scaling ancestor.
      const target = participant.keepsOwnSize
        ? sizedLike(participant.group.target, participant.layout)
        : participant.group.target;
      const delta = boxDelta(rendered, target);
      const { element } = participant;

      owned.add(element);
      element.style.transform = buildTransform(delta, inherited);
      if (!participant.isLead) {
        element.style.opacity = '0';
      }
      participant.radii.forEach((radius, index) => {
        if (radius !== undefined) {
          element.style[RADIUS_PROPERTIES[index]] = correctRadius(
            radius,
            target
          );
        }
      });

      participant.childMap = composeMap(inherited, rendered, delta);
    }
  }

  private start(options?: AnimationOptions) {
    if (this.groups.length === 0) {
      this.settle();

      return;
    }

    let remaining = this.groups.length;

    this.controls = this.groups.map((group) =>
      animate(0, 1, {
        ...(options as ValueAnimationTransition<number>),
        onUpdate: (progress) => {
          group.progress = progress;
          this.render();
        },
        onComplete: () => {
          if (--remaining === 0) {
            this.settle();
          }
        },
      })
    );
  }

  /**
   * Releases the elements at their current visual state so a new commit can
   * measure them and take over without a snap.
   */
  handOver() {
    if (this.done) {
      return;
    }
    this.done = true;
    this.controls.forEach((control) => control.stop());
    this.forget();
    this.resolveFinished();
  }

  stop() {
    if (this.done) {
      return;
    }
    this.controls.forEach((control) => control.stop());
    this.groups.forEach((group) => {
      group.progress = 1;
    });
    this.render();
    this.settle();
  }

  /**
   * Leads return to their own layout. Follows stay projected onto the lead at
   * `opacity: 0` so a later commit can reverse the morph out of them.
   */
  private settle() {
    if (this.done) {
      return;
    }
    this.done = true;
    for (const participant of this.participants) {
      if (participant.isLead) {
        clearProjection(participant.element);
      }
    }
    this.forget();
    this.resolveFinished();
  }

  private forget() {
    for (const participant of this.participants) {
      if (active.get(participant.element) === this) {
        active.delete(participant.element);
      }
    }
  }
}

function groupById(
  elements: readonly HTMLElement[]
): Map<string, HTMLElement[]> {
  const groups = new Map<string, HTMLElement[]>();

  for (const element of elements) {
    const id = element.getAttribute('data-layout-id');
    if (id) {
      const members = groups.get(id);
      if (members) {
        members.push(element);
      } else {
        groups.set(id, [element]);
      }
    }
  }

  return groups;
}

/** Keeps a box's position but takes its size from `source`. */
const sizedLike = (box: Box, source: Box): Box => ({
  x: { min: box.x.min, max: box.x.min + axisLength(source.x) },
  y: { min: box.y.min, max: box.y.min + axisLength(source.y) },
});

/**
 * Folds an element's own projection into the map its children inherit. Both are
 * scale/translate maps, so the composition stays one.
 * @param inherited map the element itself inherited
 * @param rendered the element's box before its own projection
 * @param delta the element's own projection
 */
function composeMap(inherited: BoxMap, rendered: Box, delta: BoxDelta): BoxMap {
  const axis = (
    from: BoxMap['x'],
    { min, max }: Box['x'],
    own: BoxDelta['x']
  ) => ({
    scale: own.scale * from.scale,
    offset:
      own.scale * from.offset +
      ((min + max) / 2) * (1 - own.scale) +
      own.translate,
  });

  return {
    x: axis(inherited.x, rendered.x, delta.x),
    y: axis(inherited.y, rendered.y, delta.y),
  };
}

/**
 * Runs `updateDom` and animates the layout change it causes.
 * @param scopes subtrees to search for layout targets
 * @param updateDom DOM mutation to animate
 * @param options transition for every group in this commit
 */
export async function commitLayout(
  scopes: readonly LayoutScope[],
  updateDom: LayoutUpdate,
  options?: AnimationOptions
): Promise<LayoutAnimation> {
  const commit = new Commit();
  await commit.run(scopes, updateDom, options);

  return commit;
}
