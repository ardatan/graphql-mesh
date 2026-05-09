import { expect, test } from '@playwright/test';

const SELECTED_EXAMPLE = 'openapi-stackexchange';

test('switches and loads StackExchange example', async ({ page }) => {
  test.setTimeout(120_000);
  // when we're running the CI on master, we run the test against prod to know if the
  // CodeSandbox iframe isn't broken by website-router
  const url = process.env.AGAINST_PROD === '1' ? 'https://the-guild.dev/graphql/mesh/' : '/';
  if (process.env.AGAINST_PROD === '1') {
    test.slow();
  }

  await page.goto(url);

  const exampleSelect = page.getByRole('combobox', { name: 'Choose Live Example' });
  await exampleSelect.scrollIntoViewIfNeeded();
  await expect(exampleSelect).toBeVisible();

  if (process.env.CI && process.env.AGAINST_PROD === '1') {
    // this isn't ideal, but should help with some flakiness
    await page.waitForTimeout(500);
  }
  await exampleSelect.selectOption(SELECTED_EXAMPLE);

  // After selection the ExamplesSandbox component updates iframe.title to the selected
  // example dir via postExampleDir (either on onChange or on the iframe's onLoad event).
  // Waiting for this title confirms the iframe is visible and the selection was delivered.
  const sandboxIframe = page.locator(`iframe[title="${SELECTED_EXAMPLE}"]`);
  await expect(sandboxIframe).toBeVisible({ timeout: 15_000 });

  if (process.env.AGAINST_PROD === '1') {
    // Only verify the CodeSandbox content when running against prod, since the external
    // service can't reliably load within the timeout in a local/CI environment.
    const innerIframe = page
      .frameLocator(`iframe[title="${SELECTED_EXAMPLE}"]`)
      .frameLocator('iframe');
    const title = innerIframe.getByText('@examples/openapi-stackexchange');
    const outageIndicators = [
      innerIframe.getByText('Unable to start the microVM').first(),
      innerIframe.getByText('Service Disruption in Progress').first(),
    ];
    // CodeSandbox microVM cold starts and incident recovery can exceed 60s on prod.
    const timeout = 120_000;
    const readyPromise = title
      .waitFor({ state: 'visible', timeout })
      .then(() => 'ready' as const)
      .catch(() => 'ready-timeout' as const);
    const outagePromises = outageIndicators.map(outageIndicator =>
      outageIndicator
        .waitFor({ state: 'visible', timeout })
        .then(() => 'outage' as const)
        .catch(() => 'outage-timeout' as const),
    );
    const result = await Promise.race([readyPromise, ...outagePromises]);

    if (result === 'ready') {
      return;
    }
    if (result === 'outage') {
      test.skip(true, 'CodeSandbox is temporarily unavailable');
    }
    throw new Error(
      'Neither expected CodeSandbox content nor known outage banners appeared within 120 seconds',
    );
  }
});
