import { pointerCoord } from '../../helpers';

import { isFocused, relocateInput } from './common';
import { getScrollData } from './scroll-data';

let keyboardHeight = 0;

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

const waitForKeyboardHeight = () => {
  const win = window as any;
  /**
   * If the keyboard is already open
   * no need to wait for the event.
   */
  if (keyboardHeight > 0) {
    return Promise.resolve(keyboardHeight)
  }

  /**
   * If not in Capacitor environment, just make
   * an educated guess at the height of the keyboard
   */
  if (!win.Capacitor?.isPluginAvailable('Keyboard')) {
    keyboardHeight = 250;
    return Promise.resolve(keyboardHeight);
  }

  /**
   * If keyboard is not open yet
   * we need to wait for the event
   * to fire and get the height of
   * the keyboard.
   */
  return new Promise(resolve => {
    const callback = (ev: any) => {
      keyboardHeight = ev.keyboardHeight;
      resolve(keyboardHeight);
      window.removeEventListener('keyboardWillOpen', callback);
    }
    window.addEventListener('keyboardWillOpen', callback);
  });
}

const adjustInputScroll = async (
  inputEl: HTMLInputElement | HTMLTextAreaElement,
  contentEl: HTMLIonContentElement
) => {
  const contentBox = contentEl.getBoundingClientRect();
  const inputBox = inputEl.getBoundingClientRect();

  await waitForKeyboardHeight();

  const safeAreaBottom = contentBox.height - keyboardHeight;
  const scrollBy = inputBox.bottom - safeAreaBottom;

  console.log('adjusting input scroll', scrollBy)
  if (scrollBy > 0) {
    await contentEl.scrollByPoint(0, scrollBy, 200);
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

  // temporarily move the focus to the focus holder so the browser
  // doesn't freak out while it's trying to get the input in place
  // at this point the native text input still does not have focus
  relocateInput(componentEl, inputEl, true, scrollData.inputSafeY);
  inputEl.focus();

  /* tslint:disable-next-line */
  if (typeof window !== 'undefined' && contentEl) {
    await adjustInputScroll(inputEl, contentEl);

    // the ll view is ie correct position now
    // give the native text input focus
    relocateInput(componentEl, inputEl, false, scrollData.inputSafeY);
    // ensure this is the focused input
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
