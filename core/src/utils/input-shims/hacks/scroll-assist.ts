import { pointerCoord } from '../../helpers';

import { isFocused, relocateInput } from './common';
import { getScrollData } from './scroll-data';

let currentKeyboardHeight = 0;

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
      window.removeEventListener('keyboardWillOpen', callback);

      clearTimeout(timeout);
      timeout = undefined;
    }
    window.addEventListener('keyboardWillOpen', callback);

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

  const safeAreaBottom = contentBox.height - currentKeyboardHeight;
  const scrollBy = inputBox.bottom - safeAreaBottom;

  if (scrollBy > 0) {
    await contentEl.scrollByPoint(0, scrollBy, 300);
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
  const inputBox = inputEl.getBoundingClientRect();

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
     */
    relocateInput(componentEl, inputEl, false, scrollData.inputSafeY);
    inputEl.focus();
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
