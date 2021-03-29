import { defineComponent, h } from 'vue';

/*const mockController = {
  props: {
    isOpen: Boolean
  },
  emits: ['onWillPresent', 'onDidPresent', 'onWillDismiss', 'onDidDismiss'],
  template: `
    { this.$props.isOpen ? renderMockedOverlay() : null }
  `,
  setup() {
    const renderMockedOverlay = () => {
      return 'mock!';
    }

    return renderMockedOverlay;
  }
};*/

const mockController = (displayName: string) => {
  const Container = defineComponent(() => {


    return (props: any, slots: any) => {
      return (props.isOpen) ?
        h(
          'div',
          props,
          slots.default && slots.default()
        ) : null
    }
  });

  Container.displayName = displayName;
  Container.props = ['isOpen', 'backdropDismiss', 'enterAnimation', 'cssClass', 'header', 'leaveAnimation', 'mode', 'message', 'subHeader', 'buttons', 'translucent'];
  Container.emits = ['onWillPresent', 'onDidPresent', 'onWillDismiss', 'onDidDismiss'];

  return Container;
};

const mockIonicVue = () => {
  jest.mock('@ionic/vue', () => {
    const rest = jest.requireActual('@ionic/vue');
    return {
      ...rest,
      IonActionSheet: mockController('ion-action-sheet'),
      IonAlert: mockController('ion-alert'),
      IonDatetime: mockController('ion-datetime'),
      IonLoading: mockController('ion-loading'),
      IonPicker: mockController('ion-picker'),
      IonPopover: mockController('ion-popover'),
      IonToast: mockController('ion-toast'),
      IonModal: mockController('ion-modal')
    };
  })
}

mockIonicVue();
