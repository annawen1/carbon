/**
 * Copyright IBM Corp. 2021, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register';
// v3-registration-shim: re-registers elements v11 registered transitively via class
// imports but this component does not render. Remove in v3 (tree-shaking).
// https://github.com/carbon-design-system/carbon/issues/22818
import '../content-switcher/index'; // v3-registration-shim
import '../button/index';
import CDSTabs from './tabs';
import CDSTab from './tab';
import CDSTabSkeleton from './tab-skeleton';
import CDSTabsSkeleton from './tabs-skeleton';
import CDSTabsVertical from './tabs-vertical';
import '../badge-indicator';
import '../tooltip';

export { CDSTabs, CDSTab, CDSTabSkeleton, CDSTabsSkeleton, CDSTabsVertical };

defineCustomElement(CDSTabs);
defineCustomElement(CDSTab);
defineCustomElement(CDSTabSkeleton);
defineCustomElement(CDSTabsSkeleton);
defineCustomElement(CDSTabsVertical);
