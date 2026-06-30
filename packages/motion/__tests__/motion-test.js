/**
 * Copyright IBM Corp. 2018, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment node
 */

import { SassRenderer } from '@carbon/test-utils/scss';
import * as CarbonMotion from '../src';

const { render } = SassRenderer.create(__dirname);

describe('@carbon/motion', () => {
  test('Public API', () => {
    expect(CarbonMotion).toMatchSnapshot();
  });

  test('@carbon/motion/scss/motion.scss', async () => {
    const { getValue } = await render(`
      @use 'sass:meta';
      @use '../index.scss' as motion;

      $_: get-value(meta.module-variables('motion'));
    `);
    const variables = getValue(0);
    expect(Object.keys(variables)).toMatchSnapshot();
  });

  test('should provide an invoke motion surface', () => {
    expect(CarbonMotion.surfaces.invoke).toEqual({
      kind: 'invoke',
      origin: 'trigger',
      duration: 'slow-01',
      enter: {
        opacity: 1,
        clipPath: 'inset(0 0 0 0)',
      },
      exit: {
        opacity: 0,
        clipPath: 'inset(50% 0 50% 0)',
      },
      enterEasing: ['entrance', 'expressive'],
      exitEasing: ['exit', 'expressive'],
      reducedMotion: 'fade',
    });
  });

  test('should compile the invoke surface mixin', async () => {
    const { getValue, result } = await render(`
      @use '../index.scss' as motion;

      $_: get-value(motion.surface(invoke, duration));

      .test {
        @include motion.surface(invoke);
      }
    `);

    expect(getValue(0)).toBe('slow-01');
    expect(result.css).toContain('opacity: 0');
    expect(result.css).toContain('clip-path: inset(50% 0 50% 0)');
    expect(result.css).toContain('opacity 400ms cubic-bezier(0.4, 0.14, 1, 1)');
    expect(result.css).toContain(
      'clip-path 400ms cubic-bezier(0, 0, 0.3, 1)'
    );
    expect(result.css).toContain('prefers-reduced-motion: reduce');
  });

  test('should throw for unknown motion surface', async () => {
    await expect(
      render(`
        @use '../index.scss' as motion;

        .test {
          @include motion.surface(nope);
        }
      `)
    ).rejects.toThrow(
      'Unable to find a motion surface named nope in our supported surfaces.'
    );
  });

  test('should throw for unknown easing name', () => {
    expect(() => CarbonMotion.motion('nope', 'productive')).toThrow(
      'Unable to find easing `nope` in our supported easings. Expected one of: standard, entrance, exit'
    );
  });

  test('should throw for unknown easing mode', () => {
    expect(() => CarbonMotion.motion('standard', 'nope')).toThrow(
      'Unable to find a mode for the easing `standard` called: `nope`. Expected one of: productive, expressive'
    );
  });
});
