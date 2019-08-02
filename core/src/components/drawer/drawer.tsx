import { Component, ComponentInterface, Element, Event, EventEmitter, Prop, h, Watch } from '@stencil/core';

import { getIonMode } from '../../global/ionic-global';
import { Animation } from '../../interface';
import { getClassMap } from '../../utils/theme';
import { GestureDetail, Gesture } from '../../utils/gesture';
import { DrawerPositionChangeEventDetail, DrawerToggleEventDetail } from './drawer-interface';

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
  shadowContentElement?: HTMLElement;
  contentHeight = 0;
  // Whether the drawer will scroll based on the content height
  canScroll = false;

  points: number[] = [];

  currentPointIndex = 0;

  maxY = 0;
  minY = 0;

  @Element() el!: HTMLElement;

  /**
   * Set the current open position to the offset at the given index.
   * 
   * The index corresponds to an array containing the following offsets:
   * 
   * [previewOffset, ...snapTo, maxOffset]
   * 
   * To close the drawer, unset this value. To open the drawer fully, set this
   * value to -1, which corresponds to the last item in the above array, i.e. maxOffset
   */
  @Prop() snapTo = 0;

  /**
   * A string containing a list of offsets to snap the drawer to. Offsets
   * are specified relative to the main drawer axis. For example, the bottom
   * drawer values are all relative to the bottom of the viewport, so "100" corresponds
   * to an approximate position of `viewportHeight - 100`.
   */
  @Prop() snapOffsets = '';

  /**
   * The amount to show as a preview. If this is not set the
   * drawer will start closed. Values are relative to the main axis of the
   * drawer. See `snapTo` above for more information.
   */
  @Prop() previewOffset = 0;

  /**
   * The max position to allow the user to open the drawer to. If this value is
   * not set the drawer will open the full height of the screen.
   *
   * Once this limit is reached, the drawer will rubber band slightly beyond it.
   * 
   * Values are relative to the main axis of the drawer. See `snapTo` above
   * for more information.
   */
  @Prop() maxOffset?: number;

  /**
   * Whether the drawer can be closed. If set to false, the preview offset value
   * is used. If the preview offset value is not used a warning will be printed.
   */
  @Prop({ mutable: true }) canClose: boolean = true;

  /** @internal */
  @Prop() overlayIndex!: number;

  /**
   * Additional classes to apply for custom CSS. If multiple classes are
   * provided they should be separated by spaces.
   */
  @Prop() cssClass?: string | string[];

  /**
   * Emitted when the drawer position has changed
   */
  @Event({ eventName: 'ionDrawerPositionChange' }) positionChange!: EventEmitter<DrawerPositionChangeEventDetail>;

  /**
   * Emitted after the drawer has opened.
   */
  @Event({ eventName: 'ionDrawerDidOpen' }) didOpen!: EventEmitter<DrawerToggleEventDetail>;

  /**
   * Emitted before the drawer will open.
   */
  @Event({ eventName: 'ionDrawerWillOpen' }) willOpen!: EventEmitter<DrawerToggleEventDetail>;

  /**
   * Emitted after the drawer has closed.
   */
  @Event({ eventName: 'ionDrawerDidClose' }) didClose!: EventEmitter<DrawerToggleEventDetail>;

  /**
   * Emitted before the drawer will close.
   */
  @Event({ eventName: 'ionDrawerWillClose' }) willClose!: EventEmitter<DrawerToggleEventDetail>;

  async componentDidLoad() {
    const screenHeight = window.innerHeight;

    this.points = this.getAllPoints();

    this.maxY = this.getMaxY();
    this.minY = this.getMinY();

    console.log('Got snap points', this.points);

    if (!this.canClose && !this.previewOffset) {
      console.warn('Drawer canClose set to false but no previewOffset provided! Drawer will close to avoid undefined behavior');
      this.canClose = true;
    }

    if (this.hasNotch()) {
      // Add more padding at the top for the notch
      this.topPadding = 40;
    }

    // Set the starting Y position
    const startingY = this.points[0] || 0;

    console.log('Starting Y', startingY);

    this.y = startingY ? startingY : screenHeight + 20;

    this.sizeElement();
    this.slideTo(this.y);

    this.fireChange(this.y);

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

    this.shadowContentElement = this.el.shadowRoot!.querySelector('.drawer-slotted-content') as HTMLElement;

    // Grab the main scroll region in the provided content which will be used
    // to handle the drag detection and block dragging when the user intends
    // to scroll the content instead
    const contentEl = this.el.querySelector('ion-content') as HTMLIonContentElement;
    if (contentEl) {
      this.scrollElement = await contentEl.getScrollElement();
    }

    this.sizeElement();

    this.slideTo(this.y);
  }

  private getAllPoints() {
    const snapPoints = this.snapOffsets ?
      this.snapOffsets.split(/[ ,]+/).map(x => this.getYForPoint(parseInt(x, 10)))
        : [];
    return [this.getMinY(), ...snapPoints, this.getMaxY()];
  }

  private getYForPoint(point: number) {
    const screenHeight = window.innerHeight;
    return screenHeight - point;
  }

  private getMinY() {
    if (this.previewOffset) {
      return this.getYForPoint(this.previewOffset);
    }

    return 0;
  }

  private getMaxY() {
    if (this.maxOffset) {
      return this.getYForPoint(this.maxOffset);
    }

    return this.topPadding;
  }

  // Check if the device has a notch
  // From https://stackoverflow.com/a/48572849
  private hasNotch() {
    if (CSS.supports('padding-bottom: env(safe-area-inset-bottom)')) {
      const div = document.createElement('div');
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

    // Size the content area, either by using the max height or by using the full screen height
    if (this.maxOffset) {
      this.height = this.maxOffset;
      this.setContentHeight(this.maxOffset);
    } else {
      const screenHeight = window.innerHeight;
      this.height = (screenHeight - this.topPadding);
      this.setContentHeight(this.height);
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

          const isInMiddle = this.currentPointIndex > 0 && this.currentPointIndex < this.points.length - 1;

          console.log('Can start?', this.y, 'In middle?', isInMiddle);

          const canOpen = !this.maxOffset || isInMiddle;
          if (!canOpen && this.scrollElement.scrollHeight > this.scrollElement.clientHeight + 1) {
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

    let isBeyond = false;
    if (this.y < this.maxY) {
      isBeyond = true;
    }

    console.log('Dragging, is beyond?', isBeyond, this.y, this.maxY);

    // Check if the user has dragged beyond our limit
    if (isBeyond) {
      // Grow the content area slightly
      // const screenHeight = window.innerHeight;

      const openY = this.maxY;
      const overAmount = openY - this.y;

      this.growContentHeight(overAmount);
      // When we're above the limit, let the user pull but at a
      // slower rate (to give a sense of friction)
      this.slideBy(dy * 0.3);
    } else {
      this.growContentHeight(0);
      this.slideBy(dy);
    }

    this.lastY = detail.currentY;
    this.fireChange(this.y, detail);
  }

  private onGestureEnd = (detail: GestureDetail) => {
    this.enableTransition();

    this.lastY = 0;

    const nearestPoint = this.points.find(point => {
      return point < this.y
    });

    console.log('End drag', detail, this.y, this.points, nearestPoint);


    if (detail.velocityY < -0.6) {
      console.log('Sliding open due to velocity');
      // User threw the drawer up, open it
      this.slideOpen(detail);
    } else if (detail.velocityY > 0.6) {
      // User threw the drawer down, close it
      this.slideClose(detail);
    } else if (nearestPoint) {
      console.log('Sliding to', nearestPoint);
      this.slideTo(nearestPoint, detail);
    }
    /*
    else if (this.openHeightMiddle && this.y <= this.getOpenMiddleY()) {
      opened = true;
    } else if (this.openHeightEnd && this.y <= this.getMaxY()) {
      // A max open height was set and was dragged at or above it
      opened = true;
    } else if (this.openHeightEnd && this.y > this.getMaxY()) {
      // If they are just slightly under the max open height, don't close it,
      // otherwise, close it
      opened = this.y < (this.getMaxY() + 75);
    } else if (this.y > (this.getMaxY() + 75)) {
      opened = false;
    } else if (this.y <= this.height / 2) {
      // If they dragged more than half the screen and the other conditions didn't hit,
      // open it
      opened = true;
    } 
      */
    else {
      // Otherwise, close it
      this.slideClose();
    }
  }

  private disableTransition() {
    this.el.style.transition = '';
  }

  private enableTransition() {
    this.el.style.transition = `${this.animationDuration}ms transform cubic-bezier(0.23, 1, 0.32, 1)`;
  }

  private setContentHeight(height: number) {
    if (this.shadowContentElement) {
      this.shadowContentElement.style.height = `${height}px`;
    }
  }

  private growContentHeight(by: number) {
    if (this.shadowContentElement) {
      this.setContentHeight(this.maxY + by);
    }
  }

  private slideBy(dy: number) {
    this.slideTo(this.y + dy);
  }

  private slideTo(y: number, gestureDetail?: GestureDetail) {
    this.y = y;
    this.el.style.transform = `translateY(${this.y}px) translateZ(0)`;
    this.fireChange(y, gestureDetail);
  }

  private slideOpen(gestureDetail?: GestureDetail) {
    // const startY = this.y;
    // const screenHeight = window.innerHeight;
    // this.slideTo((screenHeight - this.openHeight) - this.topPadding);
    this.fireWillOpen();
    this.slideTo(this.getMaxY(), gestureDetail);
    this.afterTransition(() => {
      this.fireDidOpen();
      this.growContentHeight(0);
    });
  }

  private slideClose(gestureDetail?: GestureDetail) {
    // const startY = this.y;
    this.fireWillClose();
    this.slideTo(this.getClosedY(), gestureDetail);
    this.afterTransition(() => {
      this.fireDidClose();
      this.growContentHeight(0);
    });
  }

  private afterTransition(fn: () => void) {
    setTimeout(fn, this.animationDuration);
  }

  private getClosedY() {
    // If the drawer is set to not fully close, then the closed position
    // is just the first preview offset point
    if (!this.canClose) {
      return this.points[0];
    }

    // Otherwise, return a position that is just off screen
    const screenHeight = window.innerHeight;
    return screenHeight + 20;
  }


  private fireWill(isOpened: boolean, finalY: number) {
    if (isOpened) {
      this.willOpen.emit({ y: finalY });
    } else {
      this.willClose.emit({ y: finalY });
    }
  }

  private fireWillOpen() {
    this.fireWill(true, this.getMaxY());
  }

  private fireWillClose() {
    this.fireWill(false, this.getMaxY());
  }

  private fireDid(isOpened: boolean, finalY: number) {

    if (isOpened) {
      this.didOpen.emit({ y: finalY });
    } else {
      this.didClose.emit({ y: finalY });
    }
  }
  private fireDidOpen() {
    this.fireDid(true, this.getMaxY());
  }

  private fireDidClose() {
    this.fireDid(false, this.getClosedY());
  }

  private fireChange(y: number, gestureDetail?: GestureDetail) {
    this.positionChange.emit({
      y,
      gestureDetail
    });
  }

  @Watch('snapTo')
  handleOpenedChange() {
    let point;

    if (!this.snapTo) {
      this.slideClose();
    } else {

      if (this.snapTo === -1) {
        point = this.points[this.points.length - 1];
      } else {
        point = this.points[this.snapTo];
      }

      this.slideTo(point);
    }
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
