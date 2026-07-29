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
import '../ai-label/index'; // v3-registration-shim
import '../combo-box/index'; // v3-registration-shim
import '../dropdown/index'; // v3-registration-shim
import '../toggle-tip/index'; // v3-registration-shim
import CDSFluidComboBox from './fluid-combo-box';
import CDSFluidComboBoxSkeleton from './fluid-combo-box-skeleton';

export { CDSFluidComboBox, CDSFluidComboBoxSkeleton };

defineCustomElement(CDSFluidComboBox);
defineCustomElement(CDSFluidComboBoxSkeleton);
