/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register';
// v3-registration-shim: re-registers elements v11 registered transitively via class
// imports but this component does not render. Remove in v3 (tree-shaking).
// https://github.com/carbon-design-system/carbon/issues/22818
import '../button/index'; // v3-registration-shim
import CDSInlineNotification from './inline-notification';
import CDSToastNotification from './toast-notification';
import CDSActionableNotification from './actionable-notification';
import CDSActionableNotificationButton from './actionable-notification-button';
import CDSCalloutNotification from './callout-notification';

export {
  CDSInlineNotification,
  CDSToastNotification,
  CDSActionableNotification,
  CDSActionableNotificationButton,
  CDSCalloutNotification,
};

defineCustomElement(CDSInlineNotification);
defineCustomElement(CDSToastNotification);
defineCustomElement(CDSActionableNotification);
defineCustomElement(CDSActionableNotificationButton);
defineCustomElement(CDSCalloutNotification);
