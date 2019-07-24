import { newE2EPage } from '@stencil/core/testing';

test('bottom-drawer: standalone', async () => {
  const page = await newE2EPage({
    url: '/src/components/bottom-drawer/test/standalone?ionic:_testing=true'
  });

  const compare = await page.compareScreenshot();
  expect(compare).toMatchScreenshot();
});
