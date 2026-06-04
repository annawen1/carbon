/**
 * Copyright IBM Corp. 2021, 2022, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/internal/register';
import CDSButton from './button';
import CDSButtonSetBase from './button-set-base';
import CDSButtonSet from './button-set';
import CDSButtonSkeleton from './button-skeleton';

export { CDSButton, CDSButtonSetBase, CDSButtonSet, CDSButtonSkeleton };

defineCustomElement(CDSButton);
defineCustomElement(CDSButtonSetBase);
defineCustomElement(CDSButtonSet);
defineCustomElement(CDSButtonSkeleton);
