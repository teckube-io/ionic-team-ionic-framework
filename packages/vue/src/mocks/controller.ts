import { h } from 'vue';

export const mockController = () => {
  const create = (options: any) => {
    const { component, componentProps } = options;

    return h(
      'div',
      {
        present
      },
      [h(component, { ...componentProps })]
    )
  }

  const present = () => {
    console.log('presenting!!')
  }

  return { create }
}
