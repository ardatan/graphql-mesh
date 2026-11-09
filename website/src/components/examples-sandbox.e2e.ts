import { expect, test } from '@playwright/test';

const SELECTED_EXAMPLE = 'openapi-stackexchange';
const PROD_EXAMPLES_URL = 'https://the-guild.dev/graphql/mesh/examples';
const LOCAL_EXAMPLES_URL = '/examples';

function getExamplesSandboxUrl(againstProd: string | undefined) {
  return againstProd === '1' ? PROD_EXAMPLES_URL : LOCAL_EXAMPLES_URL;
}

test('uses the local examples route by default', () => {
  expect(getExamplesSandboxUrl(undefined)).toBe(LOCAL_EXAMPLES_URL);
});

test('uses the prod examples route when AGAINST_PROD=1', () => {
  expect(getExamplesSandboxUrl('1')).toBe(PROD_EXAMPLES_URL);
});

test('keeps using the local examples route for other AGAINST_PROD values', () => {
  expect(getExamplesSandboxUrl('0')).toBe(LOCAL_EXAMPLES_URL);
});

test('switches and loads StackExchange example', async ({ page }) => {
  test.setTimeout(120_000);
  // when we're running the CI on master, we run the test against prod to know if the
  // CodeSandbox iframe isn't broken by website-router
  const againstProd = process.env.AGAINST_PROD === '1';
  const url = getExamplesSandboxUrl(process.env.AGAINST_PROD);
  if (againstProd) {
    test.slow();
  }

  await page.goto(url);
  expect(new URL(page.url()).pathname).toMatch(
    againstProd ? /^\/graphql\/mesh\/examples\/?$/ : /^\/examples\/?$/,
  );

  // Prod (Astro/website-router) uses "Choose live example:"; local Next.js uses
  // "Choose Live Example". Match both.
  const exampleSelect = page.getByRole('combobox', { name: /choose live example/i });
  await exampleSelect.scrollIntoViewIfNeeded();
  await expect(exampleSelect).toBeVisible();

  // Prod mounts the iframe only after `[data-examples-frame]` intersects the viewport.
  const examplesFrame = page.locator('[data-examples-frame]');
  if ((await examplesFrame.count()) > 0) {
    await examplesFrame.scrollIntoViewIfNeeded();
  }

  if (process.env.CI && againstProd) {
    // this isn't ideal, but should help with some flakiness
    await page.waitForTimeout(500);
  }
  // CodeSandbox microVM cold starts and incident recovery can exceed 60s on prod.
  const timeout = 120_000;
  // Register response/console listeners before triggering the selection so that early
  // failures (403 or X-Frame-Options errors) are reliably captured even if they occur
  // before the iframe title is updated.
  const upstreamBlockPromise = againstProd
    ? page
        .waitForResponse(
          response => {
            try {
              const hostname = new URL(response.url()).hostname;
              return (
                (hostname === 'codesandbox.io' || hostname.endsWith('.codesandbox.io')) &&
                response.status() === 403 &&
                response.url().includes(SELECTED_EXAMPLE)
              );
            } catch {
              return false;
            }
          },
          { timeout },
        )
        .then(() => 'blocked' as const)
        .catch(() => 'blocked-timeout' as const)
    : Promise.resolve('blocked-timeout' as const);
  const xFrameOptionsPromise = againstProd
    ? page
        .waitForEvent('console', {
          predicate: message => {
            if (message.type() !== 'error' || !message.text().includes('X-Frame-Options')) {
              return false;
            }
            const urlMatch = message.text().match(/https?:\/\/[^\s)'"]+/);
            if (!urlMatch) return false;
            try {
              const hostname = new URL(urlMatch[0]).hostname;
              return hostname === 'codesandbox.io' || hostname.endsWith('.codesandbox.io');
            } catch {
              return false;
            }
          },
          timeout,
        })
        .then(() => 'blocked' as const)
        .catch(() => 'blocked-timeout' as const)
    : Promise.resolve('blocked-timeout' as const);

  // Local Next.js ExamplesSandbox updates iframe.title to the selected example dir.
  // Prod Astro/website-router keeps title="GraphQL Mesh Example" and only postMessages set-dir.
  const sandboxIframe = againstProd
    ? page.locator('[data-examples-sandbox] iframe')
    : page.locator(`iframe[title="${SELECTED_EXAMPLE}"]`);

  // Retry the selection, since it can be dispatched before the page is hydrated
  // (or before the iframe is mounted), in which case it's silently ignored.
  await expect(async () => {
    await exampleSelect.selectOption(SELECTED_EXAMPLE);
    await expect(exampleSelect).toHaveValue(SELECTED_EXAMPLE);
    await expect(sandboxIframe.first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  if (againstProd) {
    // Only verify the CodeSandbox content when running against prod, since the external
    // service can't reliably load within the timeout in a local/CI environment.
    const innerIframe = sandboxIframe.first().contentFrame().locator('iframe').contentFrame();
    const title = innerIframe.getByText('@examples/openapi-stackexchange');
    const outageIndicators = [
      innerIframe.getByText('Unable to start the microVM').first(),
      innerIframe.getByText('Service Disruption in Progress').first(),
    ];
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
    const result = await Promise.race([
      readyPromise,
      ...outagePromises,
      upstreamBlockPromise,
      xFrameOptionsPromise,
    ]);

    if (result === 'ready') {
      return;
    }
    if (result === 'outage') {
      test.skip(true, 'CodeSandbox is temporarily unavailable');
      return;
    }
    if (result === 'blocked') {
      test.skip(true, 'CodeSandbox blocked this embedded GitHub sandbox upstream');
      return;
    }
    if (result === 'ready-timeout' || result === 'outage-timeout' || result === 'blocked-timeout') {
      throw new Error(
        'Neither expected CodeSandbox content nor known outage banners appeared within 120 seconds',
      );
    }
  }
});
