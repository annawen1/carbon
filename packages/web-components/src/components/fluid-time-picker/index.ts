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
import '../select/index'; // v3-registration-shim
import '../text-input/index'; // v3-registration-shim
import '../time-picker/index'; // v3-registration-shim
import '../fluid-select/index';
import '../fluid-text-input/index';
import CDSFluidTimePicker from './fluid-time-picker';
import CDSFluidTimePickerSelect from './fluid-time-picker-select';
import CDSFluidTimePickerSkeleton from './fluid-time-picker-skeleton';

export {
  CDSFluidTimePicker,
  CDSFluidTimePickerSelect,
  CDSFluidTimePickerSkeleton,
};

defineCustomElement(CDSFluidTimePicker);
defineCustomElement(CDSFluidTimePickerSelect);
defineCustomElement(CDSFluidTimePickerSkeleton);
