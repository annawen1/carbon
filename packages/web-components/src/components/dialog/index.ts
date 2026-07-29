/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register';
// v3-registration-shim: re-registers elements v11 registered transitively via class
// imports but this component does not render. Remove in v3 (tree-shaking).
// https://github.com/carbon-design-system/carbon/issues/22818
import '../modal/index'; // v3-registration-shim
import '../icon-button/index';
import CDSDialog from './dialog';
import CDSDialogHeader from './dialog-header';
import CDSDialogControls from './dialog-controls';
import CDSDialogCloseButton from './dialog-close-button';
import CDSDialogTitle from './dialog-title';
import CDSDialogSubtitle from './dialog-subtitle';
import CDSDialogBody from './dialog-body';
import CDSDialogFooter from './dialog-footer';
import CDSDialogFooterButton from './dialog-footer-button';

export {
  CDSDialog,
  CDSDialogHeader,
  CDSDialogControls,
  CDSDialogCloseButton,
  CDSDialogTitle,
  CDSDialogSubtitle,
  CDSDialogBody,
  CDSDialogFooter,
  CDSDialogFooterButton,
};

defineCustomElement(CDSDialog);
defineCustomElement(CDSDialogHeader);
defineCustomElement(CDSDialogControls);
defineCustomElement(CDSDialogCloseButton);
defineCustomElement(CDSDialogTitle);
defineCustomElement(CDSDialogSubtitle);
defineCustomElement(CDSDialogBody);
defineCustomElement(CDSDialogFooter);
defineCustomElement(CDSDialogFooterButton);
