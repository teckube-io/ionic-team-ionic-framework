import { mount } from '@vue/test-utils';
import { IonicVue, IonApp, IonModal, IonButton } from '@ionic/vue';
import { ref } from 'vue';

describe('Overlays', () => {
  beforeAll(() => {
    (HTMLElement.prototype as HTMLIonRouterOutletElement).commit = jest.fn();
  });
  it('should emit will change and did change events when changing tab', async () => {

    const onWillPresent = jest.fn();

    const App = {
      components: { IonApp, IonModal, IonButton },
      props: {
        isOpen: Boolean
      },
      template: `
        <ion-app>
          <ion-modal
            :is-open="this.$props.isOpen"
            @onWillPresent="onWillPresent"
          >Hello World</ion-modal>
        </ion-app>
      `,
      setup() {
        const isOpen = ref(false);
        const setModal = (state: boolean) => {
          console.log('hello world')
          isOpen.value = state;
        }
        return {
          isOpen,
          setModal,
          onWillPresent
        }
      }
    }

    const wrapper = mount(App, {
      global: {
        plugins: [IonicVue]
      }
    });

    const modal = wrapper.findComponent(IonModal);
    console.log(modal.html());
    await wrapper.setProps({ isOpen: true });
    console.log(modal.html())
  });
});
