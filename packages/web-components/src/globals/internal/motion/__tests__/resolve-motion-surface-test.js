/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { resolveMotionSurface } from '@carbon/web-components/es/globals/internal/motion/index.js';

describe('resolveMotionSurface', () => {
  afterEach(async () => {
    await emulateMedia({ reducedMotion: 'no-preference' });
  });

  it('resolves shared-element surfaces into Motion transitions', () => {
    const resolved = resolveMotionSurface('expand');

    expect(resolved.kind).to.equal('shared-element');
    expect(resolved.origin).to.be.undefined;
    // moderate-02 = 240ms, standard/productive
    expect(resolved.enterTransition).to.eql({
      duration: 0.24,
      ease: [0.2, 0, 0.38, 0.9],
    });
    expect(resolved.exitTransition).to.eql({
      duration: 0.24,
      ease: [0.2, 0, 0.38, 0.9],
    });
    expect(resolved.animate).to.eql({
      opacity: 1,
      transform: 'scale(1)',
      transition: { duration: 0.24, ease: [0.2, 0, 0.38, 0.9] },
    });
    expect(resolved.exit).to.eql({
      opacity: 0,
      transform: 'scale(0.96)',
      transition: { duration: 0.24, ease: [0.2, 0, 0.38, 0.9] },
    });
  });

  it('keeps the trigger origin of the invoke surface', () => {
    const resolved = resolveMotionSurface('invoke');

    expect(resolved.kind).to.equal('shared-element');
    expect(resolved.origin).to.equal('trigger');
    // standard/expressive
    expect(resolved.enterTransition).to.eql({
      duration: 0.24,
      ease: [0.4, 0.14, 0.3, 1],
    });
    expect(resolved.exitTransition).to.eql({
      duration: 0.24,
      ease: [0.4, 0.14, 0.3, 1],
    });
    // invoke has no enter/exit keyframes - morph timing only
    expect(resolved.animate).to.be.undefined;
    expect(resolved.exit).to.be.undefined;
  });

  it('resolves reveal surfaces into enter/exit targets', () => {
    const resolved = resolveMotionSurface('contextual');

    expect(resolved.kind).to.equal('reveal');
    expect(resolved.initial).to.eql({
      opacity: 0,
      transform: 'scale(0.96)',
    });
    expect(resolved.animate).to.eql({
      opacity: 1,
      transform: 'scale(1)',
      // fast-02 = 110ms, entrance/expressive
      transition: { duration: 0.11, ease: [0, 0, 0.3, 1] },
    });
    expect(resolved.exit).to.eql({
      opacity: 0,
      transform: 'scale(0.96)',
      // exit/expressive
      transition: { duration: 0.11, ease: [0.4, 0.14, 1, 1] },
    });
  });

  it('reports the accessibility gate', async () => {
    expect(resolveMotionSurface('expand').enabled).to.be.true;

    await emulateMedia({ reducedMotion: 'reduce' });

    expect(resolveMotionSurface('expand').enabled).to.be.false;
  });

  it('throws for an unknown surface', () => {
    expect(() => resolveMotionSurface('nope')).to.throw(
      /Unable to find motion surface/
    );
  });
});
