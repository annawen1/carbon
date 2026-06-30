/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  durationSlow01,
  motion as carbonMotion,
  surfaces,
} from '@carbon/motion';
import { useAnimate, useReducedMotion } from 'motion/react';

const durationTokens = {
  'slow-01': durationSlow01,
};

const toSeconds = (duration) => Number.parseInt(duration, 10) / 1000;

const parseCubicBezier = (easing) => {
  const values = easing.match(/[\d.]+/g);

  if (!values || values.length !== 4) {
    return [0.4, 0.14, 0.3, 1];
  }

  return values.map(Number);
};

const resolveEasing = ([name, mode]) =>
  parseCubicBezier(carbonMotion(name, mode));

const modalContainerSelector = '.dialog-refactor--modal-container';
const supportedAdapters = ['motion', 'native'];

export const useMotionSurface = (
  surfaceName,
  { adapter = 'motion', open, originRef, setOpen }
) => {
  if (surfaceName !== 'invoke') {
    throw new Error(
      `Unsupported motion surface "${surfaceName}". This hook only supports "invoke".`
    );
  }

  if (!supportedAdapters.includes(adapter)) {
    throw new Error(
      `Unsupported motion adapter "${adapter}". Expected one of: ${supportedAdapters.join(', ')}.`
    );
  }

  const surface = surfaces.invoke;
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [motionState, setMotionState] = useState(open ? 'enter' : 'exit');

  const duration = toSeconds(durationTokens[surface.duration]);
  const enterTransition = useMemo(
    () => ({
      duration: prefersReducedMotion ? 0 : duration,
      ease: resolveEasing(surface.enterEasing),
    }),
    [duration, prefersReducedMotion, surface.enterEasing]
  );
  const exitTransition = useMemo(
    () => ({
      duration: prefersReducedMotion ? 0 : duration,
      ease: resolveEasing(surface.exitEasing),
    }),
    [duration, prefersReducedMotion, surface.exitEasing]
  );

  const states = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        enter: { clipPath: 'none', opacity: surface.enter.opacity },
        exit: { clipPath: 'none', opacity: surface.exit.opacity },
      };
    }

    return {
      enter: surface.enter,
      exit: surface.exit,
    };
  }, [prefersReducedMotion, surface.enter, surface.exit]);

  useLayoutEffect(() => {
    if (adapter === 'native') {
      let frameId;

      if (open) {
        setMotionState('enter-start');
        frameId = requestAnimationFrame(() => {
          setMotionState('enter');
        });
      } else {
        setMotionState('exit');
      }

      return () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
      };
    }

    const container = scope.current?.querySelector(modalContainerSelector);

    if (!container) {
      return;
    }

    const fromState = open ? states.exit : states.enter;
    const toState = open ? states.enter : states.exit;

    let controls;
    let frameId;

    const setContainerState = (state) => {
      Object.assign(container.style, {
        clipPath: state.clipPath,
        opacity: state.opacity,
      });
    };

    const startAnimation = () => {
      setMotionState(open ? 'enter' : 'exit');
      controls = animate(
        container,
        {
          clipPath: [fromState.clipPath, toState.clipPath],
          opacity: [fromState.opacity, toState.opacity],
        },
        open ? enterTransition : exitTransition
      );
    };

    setContainerState(fromState);

    if (open) {
      setMotionState('enter-start');
      frameId = requestAnimationFrame(startAnimation);
    } else {
      startAnimation();
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      controls?.stop();
    };
  }, [adapter, animate, enterTransition, exitTransition, open, scope, states]);

  const openWithMotion = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const closeWithMotion = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const renderModal = useCallback(
    (children) => (
      <div className="preview-modal-invoke__motion-layer" ref={scope}>
        {children}
      </div>
    ),
    [scope]
  );

  return {
    closeWithMotion,
    modalProps:
      adapter === 'native'
        ? {
            'data-motion-origin': surface.origin,
            'data-motion-state': motionState,
            'data-motion-surface': surface.kind,
            className: 'preview-modal-invoke__modal--surface',
          }
        : {
            className: 'preview-modal-invoke__modal--surface',
          },
    openWithMotion,
    renderModal,
    triggerProps:
      adapter === 'native'
        ? {
            'data-motion-origin': originRef ? surface.origin : undefined,
            'data-motion-surface': surface.kind,
            className: 'preview-modal-invoke__trigger',
          }
        : {
            className: 'preview-modal-invoke__trigger',
          },
  };
};
