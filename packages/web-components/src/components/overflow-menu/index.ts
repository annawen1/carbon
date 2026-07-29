/**
 * Copyright IBM Corp. 2021
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register';
// v3-registration-shim: re-registers elements v11 registered transitively via class
// imports but this component does not render. Remove in v3 (tree-shaking).
// https://github.com/carbon-design-system/carbon/issues/22818
import '../icon-button/index'; // v3-registration-shim
import CDSOverflowMenu from './overflow-menu';
import CDSOverflowMenuBody from './overflow-menu-body';
import CDSOverflowMenuItem from './overflow-menu-item';

export { CDSOverflowMenu, CDSOverflowMenuBody, CDSOverflowMenuItem };

defineCustomElement(CDSOverflowMenu);
defineCustomElement(CDSOverflowMenuBody);
defineCustomElement(CDSOverflowMenuItem);
