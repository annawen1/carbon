/**
 * Copyright IBM Corp. 2019, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { classMap } from 'lit/directives/class-map.js';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement as customElement } from '../../globals/decorators/carbon-element';
import { prefix } from '../../globals/settings';
import FocusMixin from '../../globals/mixins/focus';
import styles from './header.scss?lit';

/**
 * Switcher menu item.
 *
 * @element cds-switcher-item
 */
@customElement(`${prefix}-switcher-item`)
class CDSSwitcherItem extends FocusMixin(LitElement) {
  /**
   * Required props for accessibility label
   */
  @property({ type: String, attribute: 'aria-label' })
  ariaLabel;

  /**
   * Props for accessibility labelled by
   */
  @property({ type: String, attribute: 'aria-labelledby' })
  ariaLabelledBy;

  /**
   * Link `href`.
   */
  @property()
  href = '';

  /**
   * Specify if this is a large variation of the side nav link
   */
  @property({ type: Boolean, reflect: true })
  selected = false;

  /**
   * Specify if this is a large variation of the side nav link
   */
  @property({ type: Number, reflect: true, attribute: 'tab-index' })
  tabIndex = 0;

  connectedCallback() {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'listitem');
    }
    super.connectedCallback();
  }

  render() {
    const { href, selected, ariaLabel, ariaLabelledBy, tabIndex } = this;

    const classes = classMap({
      [`${prefix}--switcher__item-link`]: true,
      [`${prefix}--switcher__item-link--selected`]: selected,
    });

    return html`
      <a
        part="link"
        aria-label="${ariaLabel}"
        aria-labelledby="${ariaLabelledBy}"
        tabindex="${tabIndex}"
        class="${classes}"
        href="${href}">
        <slot></slot>
      </a>
    `;
  }

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static styles = styles;
}

export default CDSSwitcherItem;
