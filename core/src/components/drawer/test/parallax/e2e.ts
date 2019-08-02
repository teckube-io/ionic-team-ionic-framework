import { newE2EPage } from '@stencil/core/testing';

test('bottom-drawer: parallax', async () => {
  const page = await newE2EPage({
    url: '/src/components/bottom-drawer/test/parallax?ionic:_testing=true'
  });

  const compare = await page.compareScreenshot();
  expect(compare).toMatchScreenshot();
});
