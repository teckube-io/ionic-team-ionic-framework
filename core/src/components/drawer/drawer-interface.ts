import { GestureDetail } from "../../utils/gesture";

export interface DrawerPositionChangeEventDetail {
  y: number;
  isSnap: boolean;
  gestureDetail?: GestureDetail;
}

export interface DrawerToggleEventDetail {
  y: number;
}