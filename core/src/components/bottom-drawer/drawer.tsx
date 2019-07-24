import { Component, ComponentInterface, Element, Event, EventEmitter, Method, Prop, h, State, Watch } from '@stencil/core';

import { getIonMode } from '../../global/ionic-global';
import { Animation } from '../../interface';
import { getClassMap } from '../../utils/theme';
import { GestureDetail, Gesture } from '../../utils/gesture';

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
  tag: 'ion-drawer',
  styleUrls: {
    ios: 'drawer.ios.scss',
    md: 'drawer.md.scss'
  },
  shadow: true
})
export class Drawer implements ComponentInterface {

  presented = false;
  animation?: Animation;
  mode = getIonMode(this);
  // Animation duration
  animationDuration = 400;
  // Distance from the top
  topPadding = 20;
  height = 0;
  // Current y position of element
  y = 0;
  lastY = 0;
  gesture?: Gesture;
  scrollElement?: HTMLElement;


  @Element() el!: HTMLElement;

  /**
   * Whether the drawer is expanded.
   */
  @Prop() expanded = false;
  /**
   * The starting position of the drawer, from the bottom of the screen. If not set,
   * the drawer will not be visible until it is shown
   */
  @Prop() startOffset?: number;
  /**
   * The height of the element when opened. If not set, the height will be computed
   * and set to the height of the screen minus some padding for any top notch
   */
  @Prop() openHeight?: number;

  @State() active = false;

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
  @Event({ eventName: 'ionDrawerDidOpen' }) didOpen!: EventEmitter<void>;

  /**
   * Emitted before the drawer has opened.
   */
  @Event({ eventName: 'ionDrawerWillOpen' }) willOpen!: EventEmitter<void>;

  /**
   * Emitted after the drawer has closed.
   */
  @Event({ eventName: 'ionDrawerDidClose' }) didClose!: EventEmitter<void>;

  /**
   * Emitted before the drawer has closed.
   */
  @Event({ eventName: 'ionDrawerWillClose' }) willClose!: EventEmitter<void>;

  async componentDidLoad() {
    const screenHeight = window.innerHeight;

    if (this.hasNotch()) {
      // Add more padding at the top for the notch
      this.topPadding = 40;
    }

    // Set the starting Y position 
    if (this.startOffset) {
      // If the starting offset is set, use that
      this.y = screenHeight - this.startOffset;
    } else {
      // Otherwise, make the draw be off screen
      this.y = screenHeight + 20;
    }

    /*
    this.onPositionChange && this.onPositionChange({
      startx: 0,
      starty: 0,
      x: 0,
      y: this.y,
      dx: 0,
      dy: 0,
      vx: 0,
      vy: 0
    });
    */

    this.sizeElement();

    this.slideTo(this.y);

    // Wait a frame to enable the animation to avoid having it run on start
    requestAnimationFrame(() => {
      this.enableTransition();
    });

    this.gesture = (await import('../../utils/gesture')).createGesture({
      el: this.el,
      gestureName: 'drawerExpand',
      gesturePriority: 110,
      threshold: 0,
      direction: 'y',
      passive: true,
      disableScroll: false,
      canStart: detail => this.canStart(detail),
      onStart: detail => this.onGestureStart(detail),
      onMove: detail => this.onGestureMove(detail),
      onEnd: detail => this.onGestureEnd(detail)
    });

    this.gesture.setDisabled(false);

    // Grab the main scroll region in the provided content which will be used
    // to handle the drag detection and block dragging when the user intends
    // to scroll the content instead
    const contentEl = this.el.querySelector('ion-content');
    if (contentEl) {
      this.scrollElement = await (contentEl as HTMLIonContentElement).getScrollElement();
    }
  }

  // Check if the device has a notch
  // From https://stackoverflow.com/a/48572849
  private hasNotch() {
    if (CSS.supports('padding-bottom: env(safe-area-inset-bottom)')) {
      let div = document.createElement('div');
      div.style.paddingBottom = 'env(safe-area-inset-bottom)';
      document.body.appendChild(div);
      const paddingBottomStyle = window.getComputedStyle(div).paddingBottom;
      const calculatedPadding = parseInt(paddingBottomStyle || '0', 10);
      console.log('Calculated padding', calculatedPadding);
      document.body.removeChild(div);
      if (calculatedPadding > 0) {
        return true;
      }
    }
    return false;
  }

  private sizeElement() {
    const e = this.el;

    // this.contentHeight = screenHeight - this.startOffset;

    if (this.openHeight) {
      this.height = this.openHeight;
    } else {
      const screenHeight = window.innerHeight;
      this.height = (screenHeight - this.topPadding);
    }

    e.style.height = `${this.height}px`;
  }

  private canStart = (detail: GestureDetail): boolean => {
    const target = detail.event.target as HTMLElement;
    let n = target;
    while (n && n !== this.el) {
      if (n.tagName === 'ION-CONTENT') {
        if (this.scrollElement) {
          // If the element is scrollable then we won't allow the drag. Add an extra pixel to the clientHeight
          // to account for an extra pixel in height in content (not sure why there's an extra pixel in content scroll but it's there)
          if (this.scrollElement.scrollHeight > this.scrollElement.clientHeight + 1) {
            return false;
          }
        }
        return true;
      }
      n = n.parentElement as HTMLElement;
    }
    return true;
  }

  private onGestureStart = (_detail: GestureDetail) => {
    this.disableTransition();
  }

  private onGestureMove = (detail: GestureDetail) => {
    const dy = this.lastY ? detail.currentY - this.lastY : 0;
    if (this.y <= this.topPadding) {
      // Grow the content area slightly
      this.growContentHeight(this.topPadding - this.y);
      // When we're above the limit, let the user pull but at a
      // slower rate (to give a sense of friction)
      this.slideBy(dy * 0.3);
    } else {
      this.growContentHeight(0);
      this.slideBy(dy);
    }

    this.lastY = detail.currentY;
    // this.onPositionChange && this.onPositionChange(detail);
  }

  private onGestureEnd = (detail: GestureDetail) => {
    this.enableTransition();

    this.lastY = 0;

    let expanded;
    if (detail.velocityY < -0.6) {
      this.slideOpen();
      expanded = true;
    } else if (detail.velocityY > 0.6) {
      this.slideClose();
      expanded = false;
    } else if (this.y <= this.height / 2) {
      this.slideOpen();
      expanded = true;
    } else {
      this.slideClose();
      expanded = false;
    }

    if (expanded) {
      this.fireOpen();
    } else {
      this.fireClose();
    }
  }

  private disableTransition() {
    this.el.style.transition = '';
  }

  private enableTransition() {
    this.el.style.transition = `${this.animationDuration}ms transform cubic-bezier(0.23, 1, 0.32, 1)`;
  }

  private growContentHeight(_by: number) {
    // const screenHeight = window.innerHeight;
    // this.contentHeight = (screenHeight - this.startOffset) + by;
  }

  private slideBy(dy: number) {
    this.slideTo(this.y + dy);
  }

  private slideTo(y: number) {
    this.y = y;
    this.el.style.transform = `translateY(${this.y}px) translateZ(0)`;
  }

  private slideOpen() {
    // const startY = this.y;
    // const screenHeight = window.innerHeight;
    // this.slideTo((screenHeight - this.openHeight) - this.topPadding);
    this.slideTo(this.getExpandedY())
    this.afterTransition(() => {
      this.growContentHeight(0);
    });
  }

  private slideClose() {
    console.log('Sliding close');
    // const startY = this.y;
    const finalY = this.getCollapsedY();
    this.slideTo(finalY);
    this.afterTransition(() => {
      this.growContentHeight(0);
    });
  }

  private afterTransition(fn: () => void) {
    setTimeout(fn, this.animationDuration);
  }

  private getExpandedY() {
    if (this.openHeight) {
      const screenHeight = window.innerHeight;
      return screenHeight - this.openHeight;
    } else {
      return this.topPadding;
    }
  }

  private getCollapsedY() {
    const screenHeight = window.innerHeight;
    if (this.startOffset) {
      return screenHeight - this.startOffset;
    }

    return screenHeight + 20;
  }

  private fireToggled(isExpanded: boolean, _finalY: number) {
    // this.menuToggle.emit(isExpanded);
    // this.onMenuToggled && this.onMenuToggled(isExpanded, finalY);
    if (isExpanded) {
      this.willOpen.emit();
      setTimeout(() => {
        this.didOpen.emit();
        // TODO: Make this more better
      }, 400);
    } else {
      this.willClose.emit();
      setTimeout(() => {
        this.didClose.emit();
        // TODO: Make this more better
      }, 400);
    }
  }

  private fireOpen() {
    this.fireToggled(true, this.getExpandedY());
  }

  private fireClose() {
    this.fireToggled(false, this.getCollapsedY());
  }

  @Watch('expanded')
  handleExpandedChange() {
    if (this.expanded) {
      this.slideOpen();
      this.fireOpen();
    } else {
      this.slideClose();
      this.fireClose();
    }
  }

  close = () => {
    this.active = false;
  }

  toggle = (_e: MouseEvent) => {
    const newExpanded = !this.expanded;

    if (newExpanded) {
      this.fireOpen();
    } else {
      this.fireClose();
    }
  }

  /**
   * Present the action sheet overlay after it has been created.
   */
  @Method()
  open(): Promise<void> {
    this.fireOpen();
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
      <div class="drawer-wrapper" role="dialog">
        <div class="drawer-content">
          <div class="drawer-lip">
            <div class="drawer-lip-icon"></div>
          </div>
          <div class="drawer-slotted-content">
            <slot />
          </div>
        </div>
      </div>
    ];
  }
}
