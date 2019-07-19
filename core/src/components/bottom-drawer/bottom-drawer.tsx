import { Component, ComponentInterface, Element, Event, EventEmitter, Method, Prop, h } from '@stencil/core';

import { getIonMode } from '../../global/ionic-global';
import { Animation } from '../../interface';
import { getClassMap } from '../../utils/theme';

/*
import { iosEnterAnimation } from './animations/ios.enter';
import { iosLeaveAnimation } from './animations/ios.leave';
import { mdEnterAnimation } from './animations/md.enter';
import { mdLeaveAnimation } from './animations/md.leave';
*/

/**
 * @virtualProp {"ios" | "md"} mode - The mode determines which platform styles to use.
 */
@Component({
  tag: 'ion-bottom-drawer',
  styleUrls: {
    ios: 'bottom-drawer.ios.scss',
    md: 'bottom-drawer.md.scss'
  },
  shadow: true
})
export class BottomDrawer implements ComponentInterface {

  presented = false;
  animation?: Animation;
  mode = getIonMode(this);

  @Element() el!: HTMLElement;

  /** @internal */
  @Prop() overlayIndex!: number;

  /**
   * Additional classes to apply for custom CSS. If multiple classes are
   * provided they should be separated by spaces.
   */
  @Prop() cssClass?: string | string[];

  /**
   * Emitted after the drawer has opened.
   */
  @Event({ eventName: 'ionBottomDrawerDidOpen' }) didOpen!: EventEmitter<void>;

  /**
   * Emitted before the drawer has opened.
   */
  @Event({ eventName: 'ionBottomDrawerWillOpen' }) willOpen!: EventEmitter<void>;

  /**
   * Emitted after the drawer has closed.
   */
  @Event({ eventName: 'ionBottomDrawerDidClsoe' }) didClose!: EventEmitter<void>;

  /**
   * Emitted before the drawer has closed.
   */
  @Event({ eventName: 'ionBottomDrawerWillClose' }) willClose!: EventEmitter<void>;

  /**
   * Present the action sheet overlay after it has been created.
   */
  @Method()
  open(): Promise<void> {
    return Promise.resolve();
  }

  hostData() {
    const mode = getIonMode(this);

    return {
      'role': 'dialog',
      'aria-modal': 'true',
      style: {
        zIndex: 20000 + this.overlayIndex,
      },
      class: {
        [mode]: true,

        ...getClassMap(this.cssClass)
      }
    };
  }

  render() {
    // const mode = getIonMode(this);

    return [
      <div class="bottom-drawer-wrapper" role="dialog">
        <div class="bottom-drawer-content">
          <div class="bottom-drawer-lip">
            <div class="bottom-drawer-lip-icon"></div>
          </div>
          <div class="bottom-drawer-slotted-content">
            <slot />
          </div>
        </div>
      </div>
    ];
  }
}
