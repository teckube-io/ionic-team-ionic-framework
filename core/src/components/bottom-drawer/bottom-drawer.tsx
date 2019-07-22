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

  /**
   * Whether the drawer is expanded
   */
  @Prop() expanded = false;
  @Prop() startOffset = 200;
  @State() active = false;
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

  async componentDidLoad() {
    const screenHeight = window.innerHeight;

    if (this.hasNotch()) {
      // Add more padding at the top for the notch
      this.topPadding = 40;
    }

    this.y = screenHeight - this.startOffset;

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
      gestureName: 'bottomDrawerExpand',
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
    } else {
      console.log('Does not support safe-area-inset-bottom');
    }
    return false;
  }

  private sizeElement() {
    const e = this.el;
    const screenHeight = window.innerHeight;

    // this.contentHeight = screenHeight - this.startOffset;
    this.height = (screenHeight - this.topPadding);

    e.style.height = `${this.height}px`;
  }

  private canStart = (detail: GestureDetail): boolean => {
    console.log('Can start?', detail);
    const target = detail.event.target as HTMLElement;
    let n = target;
    while (n && n !== this.el) {
      if (n.tagName === 'ION-CONTENT') {
        if (this.scrollElement) {
          // If the element is scrollable then we won't allow the drag. Add an extra pixel to the clientHeight
          // to account for an extra pixel in height in content (not sure why there's an extra pixel in content scroll but it's there)
          if (this.scrollElement.scrollHeight > this.scrollElement.clientHeight + 1) {
            console.log('Scrolling', this.scrollElement.scrollHeight, this.scrollElement.clientHeight);
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
    console.log('On start');
    this.disableTransition();
  }

  private onGestureMove = (detail: GestureDetail) => {
    const dy = this.lastY ? detail.currentY - this.lastY : 0;
    console.log('DY', dy);
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

    let expanded;
    if (detail.velocityY < -0.6) {
      this.slideOpen();
      expanded = true;
    } else if(detail.velocityY > 0.6) {
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
    this.slideTo(this.topPadding);
    this.afterTransition(() => {
      this.growContentHeight(0);
    });
  }

  private slideClose() {
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
    return this.topPadding;
  }

  private getCollapsedY() {
    const screenHeight = window.innerHeight;
    return screenHeight - this.startOffset;
  }

  private fireToggled(_isExpanded: boolean, _finalY: number) {
    // this.menuToggle.emit(isExpanded);
    // this.onMenuToggled && this.onMenuToggled(isExpanded, finalY);
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
    } else {
      this.slideClose();
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
