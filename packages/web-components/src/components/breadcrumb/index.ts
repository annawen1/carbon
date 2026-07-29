/**
 * Copyright IBM Corp. 2021, 2022, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register';
// v3-registration-shim: re-registers elements v11 registered transitively via class
// imports but this component does not render. Remove in v3 (tree-shaking).
// https://github.com/carbon-design-system/carbon/issues/22818
import '../link/index'; // v3-registration-shim
import '../overflow-menu/index';
import CDSBreadcrumb from './breadcrumb';
import CDSBreadcrumbItem from './breadcrumb-item';
import CDSBreadcrumbLink from './breadcrumb-link';
import CDSBreadcrumbOverflowMenu from './breadcrumb-overflow-menu';
import CDSBreadcrumbSkeleton from './breadcrumb-skeleton';

export {
  CDSBreadcrumb,
  CDSBreadcrumbItem,
  CDSBreadcrumbLink,
  CDSBreadcrumbOverflowMenu,
  CDSBreadcrumbSkeleton,
};

defineCustomElement(CDSBreadcrumb);
defineCustomElement(CDSBreadcrumbItem);
defineCustomElement(CDSBreadcrumbLink);
defineCustomElement(CDSBreadcrumbOverflowMenu);
defineCustomElement(CDSBreadcrumbSkeleton);
