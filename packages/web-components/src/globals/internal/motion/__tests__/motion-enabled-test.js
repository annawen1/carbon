/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { aTimeout, expect, waitUntil } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import {
  isMotionEnabled,
  onMotionEnabledChange,
} from '@carbon/web-components/es/globals/internal/motion/index.js';

describe('isMotionEnabled', () => {
  afterEach(async () => {
    await emulateMedia({ reducedMotion: 'no-preference' });
  });

  it('enables motion when there is no preference', async () => {
    expect(isMotionEnabled()).to.be.true;
  });

  it('disables motion when the user prefers reduced motion', async () => {
    await emulateMedia({ reducedMotion: 'reduce' });

    expect(isMotionEnabled()).to.be.false;
  });

  it('reacts to a change in the preference', async () => {
    await emulateMedia({ reducedMotion: 'reduce' });
    expect(isMotionEnabled()).to.be.false;

    await emulateMedia({ reducedMotion: 'no-preference' });
    expect(isMotionEnabled()).to.be.true;
  });
});

describe('onMotionEnabledChange', () => {
  afterEach(async () => {
    await emulateMedia({ reducedMotion: 'no-preference' });
  });

  it('notifies subscribers in both directions', async () => {
    const seen = [];
    const unsubscribe = onMotionEnabledChange((enabled) => seen.push(enabled));

    await emulateMedia({ reducedMotion: 'reduce' });
    await waitUntil(() => seen.length === 1);
    expect(seen).to.eql([false]);

    await emulateMedia({ reducedMotion: 'no-preference' });
    await waitUntil(() => seen.length === 2);
    expect(seen).to.eql([false, true]);

    unsubscribe();
  });

  it('stops notifying once unsubscribed', async () => {
    const seen = [];
    onMotionEnabledChange((enabled) => seen.push(enabled))();

    await emulateMedia({ reducedMotion: 'reduce' });
    await aTimeout(100);

    expect(seen).to.eql([]);
  });
});
