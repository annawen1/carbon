/**
 * Copyright IBM Corp. 2019, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { classMap } from 'lit/directives/class-map.js';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { prefix } from '../../globals/settings';
import FocusMixin from '../../globals/mixins/focus';
import CDSSideNavMenu from './side-nav-menu';
import styles from './side-nav.scss?lit';
import { carbonElement as customElement } from '../../globals/decorators/carbon-element';

/**
 * Side nav menu item.
 *
 * @element cds-side-nav-menu-item
 * @csspart link The link.
 * @csspart title The title.
 */
@customElement(`${prefix}-side-nav-menu-item`)
class CDSSideNavMenuItem extends FocusMixin(LitElement) {
  /**
   * `true` if the menu item should be active.
   */
  @property({ type: Boolean, reflect: true })
  active = false;

  /**
   * Link `href`.
   */
  @property()
  href = '';

  /**
   * The title.
   */
  @property()
  title!: string;

  shouldUpdate(changedProperties) {
    if (changedProperties.has('active') && this.active) {
      const { selectorMenu } = this.constructor as typeof CDSSideNavMenuItem;
      const parent = this.closest(selectorMenu);
      if (parent) {
        (parent as CDSSideNavMenu).active = true;
      }
    }
    return true;
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'button');
    }
    super.connectedCallback();
  }

  render() {
    const { active, href, title } = this;
    const classes = classMap({
      [`${prefix}--side-nav__link`]: true,
      [`${prefix}--side-nav__link--current`]: active,
    });
    return html`
      <a part="link" class="${classes}" href="${href}">
        <span part="title" class="${prefix}--side-nav__link-text">
          <slot>${title}</slot>
        </span>
      </a>
    `;
  }

  /**
   * A selector that will return the parent menu.
   */
  static get selectorMenu() {
    return `${prefix}-side-nav-menu`;
  }

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static styles = styles;
}

export default CDSSideNavMenuItem;
