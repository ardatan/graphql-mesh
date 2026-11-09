import { expect, test } from '@playwright/test';

const SELECTED_EXAMPLE = 'openapi-stackexchange';
const PROD_EXAMPLES_URL = 'https://the-guild.dev/graphql/mesh/examples';
const LOCAL_EXAMPLES_URL = '/examples';
const EMBED_SRC_RE = new RegExp(
  `codesandbox\\.io/embed/github/ardatan/graphql-mesh/tree/master/examples/${SELECTED_EXAMPLE}(?:/|\\?|$)`,
);

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
    // Assert website-router wiring: select → postMessage(set-dir) → nested embed src update.
    // Do not wait for CodeSandbox microVM UI text; that third-party content is too flaky for CI
    // (empty nested iframe / cold starts / 403) and is not what this regression test owns.
    const embedIframe = sandboxIframe.first().contentFrame().locator('iframe').first();
    await expect(async () => {
      await exampleSelect.selectOption(SELECTED_EXAMPLE);
      await expect(embedIframe).toHaveAttribute('src', EMBED_SRC_RE, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  }
});
