/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html } from 'lit';
import '../../../src/components/button/index';
import './demo-dialog';

function openDemoDialog(event) {
  const root = event.currentTarget.parentElement;
  const dialog = root.querySelector('motion-surface-demo-dialog');
  dialog.open = true;
}

function closeDemoDialog(event) {
  event.currentTarget.open = false;
}

export default {
  title: 'Elements/Motion',
  parameters: {
    docs: {
      description: {
        component:
          'Reveal-first MotionController spike using native CSS ' +
          '(`surface()` mixin + data attributes). Shared-element surfaces ' +
          '(expand, invoke) are not supported yet.',
      },
    },
  },
};

export const Stretch = {
  render: () => html`
    <div class="motion-surface-demo">
      <cds-button @click=${openDemoDialog}>Open stretch</cds-button>
      <motion-surface-demo-dialog
        surface="stretch"
        heading="Stretch surface"
        @close=${closeDemoDialog}>
        <p>
          Reveal using the <code>stretch</code> surface (opacity + clip-path)
          driven by native CSS.
        </p>
      </motion-surface-demo-dialog>
    </div>
  `,
};
