import { expect, test } from '@playwright/test';

test('switches and loads StackExchange example', async ({ page }) => {
  // when we're running the CI on master, we run the test against prod to know if the
  // CodeSandbox iframe isn't broken by website-router
  const url = process.env.AGAINST_PROD === '1' ? 'https://the-guild.dev/graphql/mesh/' : '/';

  await page.goto(url);

  const exampleSelect = page.getByRole('combobox', { name: 'Choose Live Example' });
  await exampleSelect.scrollIntoViewIfNeeded();
  await expect(exampleSelect).toBeVisible();

  await exampleSelect.selectOption('openapi-stackexchange');

  const middlemanIframe = page.frameLocator('iframe');
  const innerIframe = middlemanIframe.frameLocator('iframe');
  const title = innerIframe.getByText('@examples/openapi-stackexchange');
  await title.waitFor({ state: 'visible', timeout: 20_000 }); // this takes like 4 to 11 seconds
});
