import { expect, test } from '@playwright/test';

const SANDBOX_IFRAME_SELECTOR = 'iframe[title="GraphQL Mesh Example"]';

test('switches and loads StackExchange example', async ({ page }) => {
  // when we're running the CI on master, we run the test against prod to know if the
  // CodeSandbox iframe isn't broken by website-router
  const url = process.env.AGAINST_PROD === '1' ? 'https://the-guild.dev/graphql/mesh/' : '/';

  await page.goto(url);

  const exampleSelect = page.getByRole('combobox', { name: 'Choose Live Example' });
  await exampleSelect.scrollIntoViewIfNeeded();
  await expect(exampleSelect).toBeVisible();

  if (process.env.CI && process.env.AGAINST_PROD === '1') {
    // this isn't ideal, but should help with some flakiness
    await page.waitForTimeout(500);
  }
  await exampleSelect.selectOption('openapi-stackexchange');

  const sandboxIframe = page.locator(SANDBOX_IFRAME_SELECTOR);
  await expect(sandboxIframe).toBeVisible();

  if (process.env.AGAINST_PROD === '1') {
    // Only verify the CodeSandbox content when running against prod, since the external
    // service can't reliably load within the timeout in a local/CI environment.
    const middlemanIframe = page.frameLocator(SANDBOX_IFRAME_SELECTOR);
    const innerIframe = middlemanIframe.frameLocator('iframe');
    const title = innerIframe.getByText('@examples/openapi-stackexchange');
    await title.waitFor({ state: 'visible', timeout: 15_000 }); // this takes like 4 to 11 seconds
  }
});
