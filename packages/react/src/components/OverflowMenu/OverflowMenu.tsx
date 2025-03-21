/**
 * Copyright IBM Corp. 2016, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  DIRECTION_BOTTOM,
  DIRECTION_TOP,
  FloatingMenu,
  type MenuDirection,
  type MenuOffset,
} from '../../internal/FloatingMenu';
import React from 'react';
import { matches as keyCodeMatches, keys } from '../../internal/keyboard';

import ClickListener from '../../internal/ClickListener';
import { IconButton } from '../IconButton';
import { OverflowMenuVertical } from '@carbon/icons-react';
import { PrefixContext } from '../../internal/usePrefix';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import deprecate from '../../prop-types/deprecate';
import invariant from 'invariant';
import mergeRefs from '../../tools/mergeRefs';
import { noopFn } from '../../internal/noopFn';
import setupGetInstanceId from '../../tools/setupGetInstanceId';

const getInstanceId = setupGetInstanceId();

const on = (element, ...args) => {
  element.addEventListener(...args);
  return {
    release() {
      element.removeEventListener(...args);
      return null;
    },
  };
};

/**
 * The CSS property names of the arrow keyed by the floating menu direction.
 * @type {[key: string]: string}
 */
const triggerButtonPositionProps = {
  [DIRECTION_TOP]: 'bottom',
  [DIRECTION_BOTTOM]: 'top',
};

/**
 * Determines how the position of arrow should affect the floating menu position.
 * @type {[key: string]: number}
 */
const triggerButtonPositionFactors = {
  [DIRECTION_TOP]: -2,
  [DIRECTION_BOTTOM]: -1,
};

export const getMenuOffset: MenuOffset = (
  menuBody,
  direction,
  trigger,
  flip
) => {
  const triggerButtonPositionProp = triggerButtonPositionProps[direction];
  const triggerButtonPositionFactor = triggerButtonPositionFactors[direction];
  if (__DEV__) {
    invariant(
      triggerButtonPositionProp && triggerButtonPositionFactor,
      '[OverflowMenu] wrong floating menu direction: `%s`',
      direction
    );
  }
  const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menuBody;

  switch (triggerButtonPositionProp) {
    case 'top':
    case 'bottom': {
      // TODO: Ensure `trigger` is there for `<OverflowMenu open>`
      const triggerWidth = !trigger ? 0 : trigger.offsetWidth;
      return {
        left: (!flip ? 1 : -1) * (menuWidth / 2 - triggerWidth / 2),
        top: 0,
      };
    }
    default:
      return { left: 0, top: 0 };
  }
};

export interface OverflowMenuProps {
  /**
   * Specify a label to be read by screen readers on the container node
   */
  ['aria-label']?: string;

  /**
   * Deprecated, please use `aria-label` instead.
   * Specify a label to be read by screen readers on the container note.
   * @deprecated
   * */
  ariaLabel: string;

  /**
   * The child nodes.
   * */
  children: React.ReactNode;

  /**
   *  The CSS class names.
   *  */
  className?: string;

  /**
   * The menu direction.
   */
  direction?: MenuDirection;

  /**
   * `true` if the menu alignment should be flipped.
   */
  flipped?: boolean;

  /**
   * Enable or disable focus trap behavior
   */
  focusTrap?: boolean;

  /**
   * The CSS class for the icon.
   */
  iconClass?: string;

  /**
   * The element ID.
   */
  id?: string;

  /**
   * The icon description.
   */
  iconDescription?: string;

  /**
   * `true` to use the light version. For use on $ui-01 backgrounds only.
   * Don't use this to make OverflowMenu background color same as container background color.
   */
  light?: boolean;

  /**
   * The adjustment in position applied to the floating menu.
   */
  menuOffset?: MenuOffset;

  /**
   * The adjustment in position applied to the floating menu.
   */
  menuOffsetFlip?: MenuOffset;

  /**
   * The class to apply to the menu options
   */
  menuOptionsClass?: string;

  /**
   * The event handler for the `click` event.
   */
  onClick?: (evt?) => void;

  /**
   * Function called when menu is closed
   */
  onClose?: () => void;

  /**
   * Function called when menu is opened
   */
  onOpen?: () => void;

  /**
   * `true` if the menu should be open.
   */
  open?: boolean;

  /**
   * A component used to render an icon.
   */
  renderIcon?: React.ElementType;

  /**
   * Specify a CSS selector that matches the DOM element that should
   * be focused when the OverflowMenu opens
   */
  selectorPrimaryFocus?: string;

  /**
   * Specify the size of the OverflowMenu. Currently supports either `sm`, 'md' (default) or 'lg` as an option.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * The ref to the HTML element that should receive focus when the OverflowMenu opens
   */
  innerRef?: React.Ref<any>;
}

export interface OverflowMenuState {
  open: boolean;
  prevOpen?: boolean;
  hasMountedTrigger: boolean;
  click: boolean;
}

interface ReleaseHandle {
  release: () => null;
}

class OverflowMenu extends React.Component<
  OverflowMenuProps,
  OverflowMenuState
> {
  state: OverflowMenuState = {
    open: false, // Set a default value for 'open'
    hasMountedTrigger: false, // Set a default value for 'hasMountedTrigger'
    click: false, // Set a default value for 'click'
  };
  instanceId = getInstanceId();

  static propTypes = {
    /**
     * Specify a label to be read by screen readers on the container node
     */
    ['aria-label']: PropTypes.string,

    /**
     * Deprecated, please use `aria-label` instead.
     * Specify a label to be read by screen readers on the container note.
     */
    ariaLabel: deprecate(
      PropTypes.string,
      'This prop syntax has been deprecated. Please use the new `aria-label`.'
    ),

    /**
     * The child nodes.
     */
    children: PropTypes.node,

    /**
     * The CSS class names.
     */
    className: PropTypes.string,

    /**
     * The menu direction.
     */
    direction: PropTypes.oneOf([DIRECTION_TOP, DIRECTION_BOTTOM]),

    /**
     * `true` if the menu alignment should be flipped.
     */
    flipped: PropTypes.bool,

    /**
     * Enable or disable focus trap behavior
     */
    focusTrap: PropTypes.bool,

    /**
     * The CSS class for the icon.
     */
    iconClass: PropTypes.string,

    /**
     * The icon description.
     */
    iconDescription: PropTypes.string,

    /**
     * The element ID.
     */
    id: PropTypes.string,

    /**
     * `true` to use the light version. For use on $ui-01 backgrounds only.
     * Don't use this to make OverflowMenu background color same as container background color.
     */
    light: deprecate(
      PropTypes.bool,
      'The `light` prop for `OverflowMenu` is no longer needed and has been deprecated. It will be removed in the next major release. Use the Layer component instead.'
    ),

    /**
     * The adjustment in position applied to the floating menu.
     */
    menuOffset: PropTypes.oneOfType([
      PropTypes.shape({
        top: PropTypes.number,
        left: PropTypes.number,
      }),
      PropTypes.func,
    ]),

    /**
     * The adjustment in position applied to the floating menu.
     */
    menuOffsetFlip: PropTypes.oneOfType([
      PropTypes.shape({
        top: PropTypes.number,
        left: PropTypes.number,
      }),
      PropTypes.func,
    ]),

    /**
     * The class to apply to the menu options
     */
    menuOptionsClass: PropTypes.string,

    /**
     * The event handler for the `click` event.
     */
    onClick: PropTypes.func,

    /**
     * Function called when menu is closed
     */
    onClose: PropTypes.func,

    /**
     * The event handler for the `focus` event.
     */
    onFocus: PropTypes.func,

    /**
     * The event handler for the `keydown` event.
     */
    onKeyDown: PropTypes.func,

    /**
     * Function called when menu is opened
     */
    onOpen: PropTypes.func,

    /**
     * `true` if the menu should be open.
     */
    open: PropTypes.bool,

    /**
     * A component used to render an icon.
     */
    renderIcon: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),

    /**
     * Specify a CSS selector that matches the DOM element that should
     * be focused when the OverflowMenu opens
     */
    selectorPrimaryFocus: PropTypes.string,

    /**
     * Specify the size of the OverflowMenu. Currently supports either `sm`, 'md' (default) or 'lg` as an option.
     */
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
  };

  static contextType = PrefixContext;

  /**
   * The handle of `onfocusin` or `focus` event handler.
   * @private
   */

  _hFocusIn: ReleaseHandle | null = null;

  /**
   * The timeout handle for handling `blur` event.
   * @private
   */
  _hBlurTimeout;

  /**
   * The element ref of the tooltip's trigger button.
   * @type {React.RefObject<HTMLElement>}
   * @private
   */
  _triggerRef = React.createRef<HTMLElement>();

  componentDidUpdate(_, prevState) {
    const { onClose = noopFn } = this.props;
    if (!this.state.open && prevState.open) {
      onClose();
    }
  }

  componentDidMount() {
    // ensure that if open=true on first render, we wait
    // to render the floating menu until the trigger ref is not null
    if (this._triggerRef.current) {
      this.setState({ hasMountedTrigger: true });
    }
  }

  static getDerivedStateFromProps({ open }, state) {
    const { prevOpen } = state;
    return prevOpen === open
      ? null
      : {
          open,
          prevOpen: open,
        };
  }

  componentWillUnmount() {
    if (typeof this._hBlurTimeout === 'number') {
      clearTimeout(this._hBlurTimeout);
      this._hBlurTimeout = undefined;
    }
  }

  handleClick = (evt) => {
    const { onClick = noopFn } = this.props;
    this.setState({ click: true });
    if (!this._menuBody || !this._menuBody.contains(evt.target)) {
      this.setState({ open: !this.state.open });
      onClick(evt);
    }
  };

  closeMenuAndFocus = () => {
    const wasClicked = this.state.click;
    const wasOpen = this.state.open;
    this.closeMenu(() => {
      if (wasOpen && !wasClicked) {
        this.focusMenuEl();
      }
    });
  };

  closeMenuOnEscape = () => {
    const wasOpen = this.state.open;
    this.closeMenu(() => {
      if (wasOpen) {
        this.focusMenuEl();
      }
    });
  };

  handleKeyPress = (evt) => {
    if (
      this.state.open &&
      keyCodeMatches(evt, [
        keys.ArrowUp,
        keys.ArrowRight,
        keys.ArrowDown,
        keys.ArrowLeft,
      ])
    ) {
      evt.preventDefault();
    }

    // Close the overflow menu on escape
    if (keyCodeMatches(evt, [keys.Escape])) {
      this.closeMenuOnEscape();

      // Stop the esc keypress from bubbling out and closing something it shouldn't
      evt.stopPropagation();
    }
  };

  handleClickOutside = (evt) => {
    if (
      this.state.open &&
      (!this._menuBody || !this._menuBody.contains(evt.target))
    ) {
      this.closeMenu();
    }
  };

  closeMenu = (onCloseMenu?) => {
    const { onClose = noopFn } = this.props;
    this.setState({ open: false }, () => {
      // Optional callback to be executed after the state as been set to close
      if (onCloseMenu) {
        onCloseMenu();
      }
      onClose();
    });
  };

  focusMenuEl = () => {
    const { current: triggerEl } = this._triggerRef;
    if (triggerEl) {
      (triggerEl as HTMLElement).focus();
    }
  };

  /**
   * Focuses the next enabled overflow menu item given the currently focused
   * item index and direction to move
   * @param {object} params
   * @param {number} params.currentIndex - the index of the currently focused
   * overflow menu item in the list of overflow menu items
   * @param {number} params.direction - number denoting the direction to move
   * focus (1 for forwards, -1 for backwards)
   */
  handleOverflowMenuItemFocus = ({ currentIndex, direction }) => {
    const enabledIndices: number[] = React.Children.toArray(
      this.props.children
    ).reduce((acc: number[], curr, i) => {
      if (React.isValidElement(curr) && !curr.props.disabled) {
        acc.push(i);
      }
      return acc;
    }, []);
    const nextValidIndex = (() => {
      const nextIndex = enabledIndices.indexOf(currentIndex) + direction;
      switch (nextIndex) {
        case -1:
          return enabledIndices.length - 1;
        case enabledIndices.length:
          return 0;
        default:
          return nextIndex;
      }
    })();
    const overflowMenuItem =
      this[`overflowMenuItem${enabledIndices[nextValidIndex]}`];
    overflowMenuItem?.focus();
  };

  /**
   * Handles the floating menu being unmounted or non-floating menu being
   * mounted or unmounted.
   * @param {Element} menuBody The DOM element of the menu body.
   * @private
   */
  _menuBody: HTMLElement | null = null;

  _bindMenuBody = (menuBody: HTMLElement | null) => {
    if (!menuBody) {
      this._menuBody = menuBody;
    }
    if (!menuBody && this._hFocusIn) {
      this._hFocusIn = this._hFocusIn.release();
    }
  };

  /**
   * Handles the floating menu being placed.
   * @param {Element} menuBody The DOM element of the menu body.
   * @private
   */
  _handlePlace = (menuBody) => {
    const { onOpen = noopFn } = this.props;
    if (menuBody) {
      this._menuBody = menuBody;
      const hasFocusin = 'onfocusin' in window;
      const focusinEventName = hasFocusin ? 'focusin' : 'focus';
      this._hFocusIn = on(
        menuBody.ownerDocument,
        focusinEventName,
        (event) => {
          const target = ClickListener.getEventTarget(event);
          const { current: triggerEl } = this._triggerRef;
          if (typeof target.matches === 'function') {
            if (
              !menuBody.contains(target) &&
              triggerEl &&
              !target.matches(
                `.${this.context}--overflow-menu:first-child,.${this.context}--overflow-menu-options:first-child`
              )
            ) {
              this.closeMenuAndFocus();
            }
          }
        },
        !hasFocusin
      );
      onOpen();
    }
  };

  /**
   * @returns {Element} The DOM element where the floating menu is placed in.
   */
  _getTarget = () => {
    const { current: triggerEl } = this._triggerRef;
    return (
      (triggerEl instanceof Element &&
        triggerEl.closest('[data-floating-menu-container]')) ||
      document.body
    );
  };

  render() {
    const prefix = this.context;
    const {
      id,
      ['aria-label']: ariaLabel = null,
      ariaLabel: deprecatedAriaLabel,
      children,
      iconDescription = 'Options',
      direction = DIRECTION_BOTTOM,
      flipped = false,
      focusTrap = true,
      menuOffset = getMenuOffset,
      menuOffsetFlip = getMenuOffset,
      iconClass,
      onClick = noopFn, // eslint-disable-line
      onOpen = noopFn, // eslint-disable-line
      selectorPrimaryFocus = '[data-floating-menu-primary-focus]', // eslint-disable-line
      renderIcon: IconElement = OverflowMenuVertical,
      // eslint-disable-next-line react/prop-types
      innerRef: ref,
      menuOptionsClass,
      light,
      size = 'md',
      ...other
    } = this.props;

    const { open = false } = this.state;

    const overflowMenuClasses = classNames(
      this.props.className,
      `${prefix}--overflow-menu`,
      {
        [`${prefix}--overflow-menu--open`]: open,
        [`${prefix}--overflow-menu--light`]: light,
        [`${prefix}--overflow-menu--${size}`]: size,
      }
    );

    const overflowMenuOptionsClasses = classNames(
      menuOptionsClass,
      `${prefix}--overflow-menu-options`,
      {
        [`${prefix}--overflow-menu--flip`]: this.props.flipped,
        [`${prefix}--overflow-menu-options--open`]: open,
        [`${prefix}--overflow-menu-options--light`]: light,
        [`${prefix}--overflow-menu-options--${size}`]: size,
      }
    );

    const overflowMenuIconClasses = classNames(
      `${prefix}--overflow-menu__icon`,
      iconClass
    );

    const childrenWithProps = React.Children.toArray(children).map(
      (child, index) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              // @ts-expect-error: PropTypes are not expressive enough to cover this case
              closeMenu: child.props.closeMenu || this.closeMenuAndFocus,
              handleOverflowMenuItemFocus: this.handleOverflowMenuItemFocus,
              ref: (e) => {
                this[`overflowMenuItem${index}`] = e;
              },
              index,
            })
          : null
    );

    const menuBodyId = `overflow-menu-${this.instanceId}__menu-body`;

    const menuBody = (
      <ul
        className={overflowMenuOptionsClasses}
        tabIndex={-1}
        role="menu"
        aria-label={ariaLabel || deprecatedAriaLabel}
        onKeyDown={this.handleKeyPress}
        id={menuBodyId}>
        {childrenWithProps}
      </ul>
    );

    const wrappedMenuBody = (
      <FloatingMenu
        focusTrap={focusTrap}
        triggerRef={this._triggerRef}
        menuDirection={direction}
        menuOffset={flipped ? menuOffsetFlip : menuOffset}
        menuRef={this._bindMenuBody}
        flipped={this.props.flipped}
        target={this._getTarget}
        onPlace={this._handlePlace}
        selectorPrimaryFocus={this.props.selectorPrimaryFocus}>
        {React.cloneElement(menuBody, {
          'data-floating-menu-direction': direction,
        })}
      </FloatingMenu>
    );

    const iconProps = {
      className: overflowMenuIconClasses,
      'aria-label': iconDescription,
    };

    return (
      <ClickListener onClickOutside={this.handleClickOutside}>
        <span
          className={`${prefix}--overflow-menu__wrapper`}
          aria-owns={open ? menuBodyId : undefined}>
          <IconButton
            {...other}
            type="button"
            aria-haspopup
            aria-expanded={open}
            aria-controls={open ? menuBodyId : undefined}
            className={overflowMenuClasses}
            onClick={this.handleClick}
            id={id}
            ref={mergeRefs(this._triggerRef, ref)}
            size={size}
            label={iconDescription}
            kind="ghost">
            <IconElement {...iconProps} />
          </IconButton>
          {open && this.state.hasMountedTrigger && wrappedMenuBody}
        </span>
      </ClickListener>
    );
  }
}

export { OverflowMenu };
export default (() => {
  const forwardRef = (props, ref) => <OverflowMenu {...props} innerRef={ref} />;
  forwardRef.displayName = 'OverflowMenu';
  return React.forwardRef(forwardRef);
})();
