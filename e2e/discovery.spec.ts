import { expect, test, type Locator } from "@playwright/test";

async function contrastRatio(locator: Locator) {
  return locator.evaluate((element) => {
    const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (rgb: number[]) => {
      const channels = rgb.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const styles = getComputedStyle(element);
    let backgroundElement: Element | null = element;
    let backgroundColor = styles.backgroundColor;
    while (backgroundElement.parentElement && /rgba?\([^)]*,\s*0\)$/.test(backgroundColor)) {
      backgroundElement = backgroundElement.parentElement;
      backgroundColor = getComputedStyle(backgroundElement).backgroundColor;
    }
    const foreground = luminance(parse(styles.color));
    const background = luminance(parse(backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
}

test("the opening explains the product and shows five useful signals", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop density check");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What the internet is larping rn.");
  await expect(page.getByText(/Niche obsessions, drops, memes, debates and lore/).first()).toBeVisible();

  const intersecting = await page.locator('section[aria-labelledby="larping-now"] article h3').evaluateAll((items) => (
    items.filter((item) => {
      const box = item.getBoundingClientRect();
      return box.top < window.innerHeight && box.bottom > 0;
    }).length
  ));
  expect(intersecting).toBeGreaterThanOrEqual(5);
});

test("moves from a contextual action to its explanation and niche", async ({ page }) => {
  await page.goto("/");
  const action = page.getByRole("link", { name: "WTF is this?" }).first();
  await action.scrollIntoViewIfNeeded();
  await action.click();
  await expect(page).toHaveURL(/\/discover\/[^#]+#beginner-context$/);
  await expect(page.locator("#beginner-context")).toBeInViewport();
  await page.getByRole("link", { name: "F1", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("F1");
});

test("persists a newly followed niche inside Your Larps", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Start larping in Mechanical Keyboards" });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await page.reload();
  const yourLarps = page.locator("section").filter({ has: page.getByRole("heading", { name: "Your Larps" }) });
  await expect(yourLarps.getByRole("heading", { name: "Mechanical Keyboards" })).toBeVisible();
});

test("mobile rails work without horizontal page overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  const rail = page.locator('section[aria-labelledby="your-larps"] > div').last();
  await expect.poll(() => rail.evaluate((element) => getComputedStyle(element).overflowX)).toBe("auto");
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("reduced motion removes chapter choreography", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop motion check");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const animation = await page.locator("main > header > div").first().evaluate((element) => getComputedStyle(element).animationName);
  expect(animation).toBe("none");
});

test("light and dark modes keep contextual reading contrast", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop contrast check");
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const leadSignals = page.locator('section[aria-labelledby="larping-now"] article').first().locator('[aria-label$="source signals"]');
    expect(await contrastRatio(leadSignals)).toBeGreaterThanOrEqual(4.5);
    await page.goto("/discover/the-silver-runner-resurgence");
    expect(await contrastRatio(page.locator("#beginner-context"))).toBeGreaterThanOrEqual(4.5);
  }
});

test("sticky lore keeps reading columns separate", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop sticky layout check");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Missed the origin story?" }).first()).toBeVisible();
  const section = page.locator('section[aria-labelledby="deep-lore"]').filter({ visible: true }).first();
  await section.scrollIntoViewIfNeeded();
  const columns = await section.locator(":scope > div").evaluateAll((items) => items.slice(0, 2).map((item) => {
    const box = item.getBoundingClientRect();
    return { left: box.left, right: box.right };
  }));
  expect(columns[0].right).toBeLessThanOrEqual(columns[1].left);
});

test("narrow desktop cards keep actions inside their edges", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop containment check");
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  const actions = page.locator('section[aria-labelledby="larping-now"] article').getByRole("link", { name: /Go deeper|WTF is this\?|Why do people care\?|Explain the lore/ });
  const contained = await actions.evaluateAll((items) => items.every((item) => {
    const action = item.getBoundingClientRect();
    const card = item.closest("article")!.getBoundingClientRect();
    return action.left >= card.left && action.right <= card.right + 0.5;
  }));
  expect(contained).toBe(true);
});

test("backward keyboard navigation raises the focused lore card", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop keyboard stack check");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const moreLore = page.getByRole("link", { name: "One more rabbit hole" }).first();
  await moreLore.scrollIntoViewIfNeeded();
  await moreLore.focus();
  for (let index = 0; index < 5; index += 1) await page.keyboard.press("Shift+Tab");
  const visibleAtFocusPoint = await page.locator(":focus").evaluate((element) => {
    const box = element.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return Boolean(top && (element === top || element.contains(top) || top.contains(element)));
  });
  expect(visibleAtFocusPoint).toBe(true);
});

test("long topic titles reflow at 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "single narrow-viewport check");
  await page.setViewportSize({ width: 320, height: 720 });
  for (const slug of ["f1-tire-compounds-without-the-confusion", "archive-shell-jackets-resurface"]) {
    await page.goto(`/discover/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows).toBe(false);
  }
});
