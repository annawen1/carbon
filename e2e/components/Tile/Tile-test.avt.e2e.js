/**
 * Copyright IBM Corp. 2016, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const { expect, test } = require('@playwright/test');
const { visitStory } = require('../../test-utils/storybook');

test.describe('@avt Tile', () => {
  test('@avt-default-state', async ({ page }) => {
    await visitStory(page, {
      component: 'Tile',
      id: 'components-tile--default',
      globals: {
        theme: 'white',
      },
    });
    await expect(page).toHaveNoACViolations('Tile');
  });

  test('@avt-default-state ClickableTile', async ({ page }) => {
    await visitStory(page, {
      component: 'ClickableTile',
      id: 'components-tile--clickable',
      globals: {
        theme: 'white',
      },
    });
    await expect(page).toHaveNoACViolations('ClickableTile');
  });

  test('@avt-default-state ExpandableTile', async ({ page }) => {
    await visitStory(page, {
      component: 'ExpandableTile',
      id: 'components-tile--expandable',
      globals: {
        theme: 'white',
      },
    });
    await expect(page).toHaveNoACViolations('ExpandableTile');
  });

  test('@avt-default-state SelectableTile', async ({ page }) => {
    await visitStory(page, {
      component: 'SelectableTile',
      id: 'components-tile--selectable',
      globals: {
        theme: 'white',
      },
    });
    await expect(page).toHaveNoACViolations('SelectableTile');
  });

  test('@avt-default-state SelectableTile multi-select', async ({ page }) => {
    await visitStory(page, {
      component: 'SelectableTile',
      id: 'components-tile--multi-select',
      globals: {
        theme: 'white',
      },
    });
    await expect(page).toHaveNoACViolations('SelectableTile multi-select');
  });

  test('@avt-default-state RadioTile', async ({ page }) => {
    await visitStory(page, {
      component: 'RadioTile',
      id: 'components-tile--radio',
      globals: {
        theme: 'white',
      },
    });
    await expect(page).toHaveNoACViolations('RadioTile');
  });

  test('@avt-advanced-states ClickableTile', async ({ page }) => {
    await visitStory(page, {
      component: 'Tile',
      id: 'components-tile--clickable',
      globals: {
        theme: 'white',
      },
      args: {
        disabled: 'true',
      },
    });
    await expect(page.locator('a#clickable-tile-1')).toBeDisabled();
    await expect(page).toHaveNoACViolations('ClickableTile-Disabled');
  });

  test('@avt-advanced-states ExpandableTile', async ({ page }) => {
    await visitStory(page, {
      component: 'ExpandableTile',
      id: 'components-tile--expandable',
      globals: {
        theme: 'white',
      },
    });
    await expect(page.locator('body')).toBeFocused();

    // Pause to ensure the initial animation finishes before we interact
    await expect(
      page.getByRole('button', { name: 'Above the fold content here' })
    ).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.locator('#expandable-tile-1')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#expandable-tile-1')).toHaveClass(
      'cds--tile cds--tile--expandable cds--tile--is-expanded'
    );
  });

  test('@avt-advanced-states ExpandableTile with interactive spacebar', async ({
    page,
  }) => {
    await visitStory(page, {
      component: 'ExpandableTile',
      id: 'components-tile--expandable-with-interactive',
      globals: {
        theme: 'white',
      },
    });
    await expect(page.locator('body')).toBeFocused();

    // Pause to ensure the initial animation finishes before we interact
    await expect(page.getByLabel('Interact to Expand tile')).toBeVisible();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    await expect(page.getByLabel('Interact to Expand tile')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('#expandable-tile-1')).toHaveClass(
      'cds--tile cds--tile--expandable cds--tile--expandable--interactive cds--tile--is-expanded'
    );
  });

  test('@avt-keyboard-nav SelectableTile', async ({ page }) => {
    await visitStory(page, {
      component: 'SelectableTile',
      id: 'components-tile--selectable',
      globals: {
        theme: 'white',
      },
    });
    await expect(page.locator('body')).toBeFocused();

    // Pause to ensure the initial animation finishes before we interact
    await expect(page.getByRole('checkbox')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('checkbox')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('checkbox')).toHaveClass(
      'cds--tile cds--tile--selectable cds--tile--is-selected'
    );
  });

  test('@avt-keyboard-nav RadioTile', async ({ page }) => {
    await visitStory(page, {
      component: 'RadioTile',
      id: 'components-tile--radio',
      globals: {
        theme: 'white',
      },
    });
    await expect(page.locator('body')).toBeFocused();

    // Pause to ensure the initial animation finishes before we interact
    await expect(page.getByRole('radio').nth(0)).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio').nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('radio').nth(0)).toBeChecked();
  });
});
