import { pointerCoord, raf } from '../../helpers';

import { isFocused, relocateInput } from './common';
import { getScrollData } from './scroll-data';

let currentKeyboardHeight = 0;

/**
 * Clear out the keyboard height when it closes
 * so we do not use a cached height the next time
 * the keyboard opens.
 */
window.addEventListener('ionKeyboardDidHide', () => currentKeyboardHeight = 0);

export const enableScrollAssist = (
  componentEl: HTMLElement,
  inputEl: HTMLInputElement | HTMLTextAreaElement,
  contentEl: HTMLIonContentElement | null,
  footerEl: HTMLIonFooterElement | null,
  keyboardHeight: number
) => {
  let coord: any;
  const touchStart = (ev: Event) => {
    coord = pointerCoord(ev);
  };

  const touchEnd = (ev: Event) => {
    // input cover touchend/mouseup
    if (!coord) {
      return;
    }
    // get where the touchend/mouseup ended
    const endCoord = pointerCoord(ev);

    // focus this input if the pointer hasn't moved XX pixels
    // and the input doesn't already have focus
    if (!hasPointerMoved(6, coord, endCoord) && !isFocused(inputEl)) {
      ev.preventDefault();
      ev.stopPropagation();

      // begin the input focus process
      jsSetFocus(componentEl, inputEl, contentEl, footerEl, keyboardHeight);
    }
  };
  /**
   * Since ion-item can delegate focus to inputs,
   * we need to list for touches on that too not
   * just the input itself.
   */
  const parentEl = componentEl.closest('ion-item') || componentEl;
  parentEl.addEventListener('touchstart', touchStart, true);
  parentEl.addEventListener('touchend', touchEnd, true);

  return () => {
    parentEl.removeEventListener('touchstart', touchStart, true);
    parentEl.removeEventListener('touchend', touchEnd, true);
  };
};

const waitForKeyboardHeight = (defaultKeyboardHeight: number) => {
  const win = window as any;
  /**
   * If the keyboard is already open
   * no need to wait for the event.
   */
  if (currentKeyboardHeight > 0) {
    return Promise.resolve(currentKeyboardHeight)
  }

  /**
   * If not in Capacitor environment, just make
   * an educated guess at the height of the keyboard.
   * Developers can customize this using the keyboardHeight
   * config option.
   *
   * TODO: Add Cordova support
   *
   * TODO: Should we expand this to allow for functions
   * so that developers can write custom heuristics
   * for estimating the keyboard height?
   */
  if (!win.Capacitor?.isPluginAvailable('Keyboard')) {
    currentKeyboardHeight = defaultKeyboardHeight;
    return Promise.resolve(currentKeyboardHeight);
  }

  /**
   * If keyboard is not open yet we need to
   * wait for the event to fire and get the
   * height of the keyboard.
   */
  return new Promise(resolve => {
    let timeout: any;
    const callback = (ev: any) => {
      currentKeyboardHeight = ev.keyboardHeight;
      resolve(currentKeyboardHeight);
      window.removeEventListener('keyboardWillShow', callback);

      clearTimeout(timeout);
      timeout = undefined;
    }
    window.addEventListener('keyboardWillShow', callback);

    // Set a timeout in case keyboardWillOpen never fires
    timeout = setTimeout(() => callback({ keyboardHeight: defaultKeyboardHeight }), 1000);
  });
}

const adjustInputScroll = async (
  inputBox: DOMRect,
  contentEl: HTMLIonContentElement,
  defaultKeyboardHeight: number
) => {
  const contentBox = contentEl.getBoundingClientRect();

  await waitForKeyboardHeight(defaultKeyboardHeight);

  const safeAreaTop = contentBox.top;
  const safeAreaBottom = contentBox.height - currentKeyboardHeight;

  /**
   * getBoundingClientRect values are relative to the
   *  viewport, but we want values relative to ion-content.
   */
  const scrollByBottom = (inputBox.bottom - contentBox.top) - safeAreaBottom;
  const scrollByTop = inputBox.top - safeAreaTop;

  console.log('current keyboard height', currentKeyboardHeight, defaultKeyboardHeight);
  console.log('Safe area', safeAreaTop, safeAreaBottom);
  console.log('Scroll by', scrollByTop, scrollByBottom);
  console.log('input box', inputBox);
  console.log('content box', contentBox);

  /**
   * If we scroll just enough to bring the
   * input into view, it may be touch the top
   * of the keyboard, so we add a bit of padding.
   */
  const scrollPadding = 15;

  /**
   * If true then the input extends
   * outside the bottom safe area and
   * we should scroll the content down
   * to bring the input back into view.
   */
  if (scrollByBottom > 0) {
    console.log('scrolling down', scrollByBottom)
    await contentEl.scrollByPoint(0, scrollByBottom + scrollPadding, 300);
  /**
   * If true then the input extends
   * outside the top safe area and
   * we should scroll the content up
   * to bring the input back into view.
   */
  } else if (scrollByTop < 0) {
    console.log('scrolling up', scrollByTop)
    await contentEl.scrollByPoint(0, scrollByTop - scrollPadding, 300);
  }
}

const jsSetFocus = async (
  componentEl: HTMLElement,
  inputEl: HTMLInputElement | HTMLTextAreaElement,
  contentEl: HTMLIonContentElement | null,
  footerEl: HTMLIonFooterElement | null,
  keyboardHeight: number
) => {
  if (!contentEl && !footerEl) { return; }
  const scrollData = getScrollData(componentEl, (contentEl || footerEl)!, keyboardHeight);

  if (contentEl && Math.abs(scrollData.scrollAmount) < 4) {
    // the text input is in a safe position that doesn't
    // require it to be scrolled into view, just set focus now
    inputEl.focus();
    return;
  }

  /**
   * We need to get the bounding box here
   * as the input will be moved in the next
   * `relocateInput` call.
   */
  const containerEl = inputEl.closest('ion-item') || inputEl;
  const inputBox = containerEl.getBoundingClientRect();

  /**
   * Temporarily move the focus to a placeholder element
   * off screen so that browsers such as Safari do not
   * try to automatically scroll the input into focus.
   */
  relocateInput(componentEl, inputEl, true, scrollData.inputSafeY);
  inputEl.focus();

  /* tslint:disable-next-line */
  if (typeof window !== 'undefined' && contentEl) {
    await adjustInputScroll(inputBox, contentEl!, keyboardHeight);

    /**
     * Now that we have scrolled the input into view, relocate
     * it from off screen and focus the input.
     * Wrap it in two rafs to ensure that code gets run
     * in the frame after scrolling is done. The function that
     * scrolls the content uses an raf itself which is why
     * 2 rafs are required here.
     */
    raf(() => {
      raf(() => {
        relocateInput(componentEl, inputEl, false, scrollData.inputSafeY);
        inputEl.focus();
      });
    });
  }
};

const hasPointerMoved = (threshold: number, startCoord: PointerCoordinates | undefined, endCoord: PointerCoordinates | undefined) => {
  if (startCoord && endCoord) {
    const deltaX = (startCoord.x - endCoord.x);
    const deltaY = (startCoord.y - endCoord.y);
    const distance = deltaX * deltaX + deltaY * deltaY;
    return distance > (threshold * threshold);
  }
  return false;
};

export interface PointerCoordinates {
  x: number;
  y: number;
}
