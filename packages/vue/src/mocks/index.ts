import { mockController } from './controller';

declare let jest: any;

export const mockIonicVue = () => {
  jest.mock('@ionic/vue', () => {
    const rest = jest.requireActual('@ionic/vue');
    return {
      ...rest,
      modalController: mockController
    }
  });
}
