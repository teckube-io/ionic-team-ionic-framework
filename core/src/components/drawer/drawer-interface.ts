import { GestureDetail } from "../../utils/gesture";

export interface DrawerPositionChangeEventDetail {
  y: number;
  gestureDetail?: GestureDetail;
}

export interface DrawerToggleEventDetail {
  y: number;
}