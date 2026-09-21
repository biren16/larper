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

test("the opening is a tall ranked-culture collage that hands off to Larping RN", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop hero composition check");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wanna larp bout smth ? Find a niche rn.");
  await expect(page.getByText(/Niche obsessions, drops, memes, debates and lore/).first()).toBeVisible();

  const hero = page.locator("main > header").first();
  const heroBox = await hero.boundingBox();
  expect(heroBox).not.toBeNull();
  expect(heroBox!.height).toBeGreaterThanOrEqual(600);
  await expect(hero.getByRole("link", { name: /Hero signal:/ })).toHaveCount(3);
  const chapterTop = await page.getByRole("heading", { name: "Larping RN", exact: true }).evaluate((element) => element.getBoundingClientRect().top);
  expect(chapterTop).toBeLessThan(900);

  const section = page.locator('section[aria-labelledby="larping-now"]').filter({ visible: true }).first();
  await section.scrollIntoViewIfNeeded();
  const cards = section.locator("article");
  const layout = await cards.evaluateAll((items) => items.slice(0, 5).map((item) => {
    const box = item.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width };
  }));
  const sectionWidth = await section.evaluate((element) => element.getBoundingClientRect().width);

  expect(layout[0].width / sectionWidth).toBeGreaterThan(0.5);
  expect(layout.slice(1, 4).every((card) => card.left >= layout[0].right)).toBe(true);
  expect(layout[1].top).toBeLessThan(layout[2].top);
  expect(layout[2].top).toBeLessThan(layout[3].top);
});

test("intro artwork reads as one connected image cluster", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop intro composition check");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(1750);

  const cards = page.locator('div[aria-hidden="true"] figure');
  await expect(cards).toHaveCount(3);
  const [lead, upperSatellite, lowerSatellite] = await cards.evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
  }));

  expect(upperSatellite.left).toBeLessThan(lead.right);
  expect(upperSatellite.bottom).toBeGreaterThan(lead.top);
  expect(lowerSatellite.right).toBeGreaterThan(lead.left + 20);
  expect(lowerSatellite.top).toBeLessThan(lead.bottom);

  const clusterLeft = Math.min(lead.left, upperSatellite.left, lowerSatellite.left);
  const clusterRight = Math.max(lead.right, upperSatellite.right, lowerSatellite.right);
  expect(clusterRight - clusterLeft).toBeLessThan(1440 * 0.55);
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

test("theme control switches modes and remembers an explicit choice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("site header opens a full-screen editorial menu", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop navbar composition check");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const header = page.getByRole("banner");
  const metrics = await header.evaluate((element) => {
    const styles = getComputedStyle(element);
    const inner = element.firstElementChild!;
    return {
      backdropFilter: styles.backdropFilter,
      boxShadow: styles.boxShadow,
      height: element.getBoundingClientRect().height,
      gridColumns: getComputedStyle(inner).gridTemplateColumns.split(" ").map(Number.parseFloat),
    };
  });

  await expect(header.getByRole("link", { name: "larper home" })).toBeVisible();
  await expect(header.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
  await expect(header.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(metrics.backdropFilter).toBe("none");
  expect(metrics.boxShadow).toBe("none");
  expect(metrics.height).toBeLessThanOrEqual(72);
  expect(metrics.gridColumns).toHaveLength(3);
  expect(Math.abs(metrics.gridColumns[0] - metrics.gridColumns[2])).toBeLessThanOrEqual(0.5);

  await header.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Site menu" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Discovery" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Your Larps" })).toBeVisible();
  await expect(menu.getByRole("group", { name: "Appearance" })).toBeVisible();
});

test("site header keeps its menu trigger accessible at 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop project owns the exact 320px navbar check");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");

  const header = page.getByRole("banner");
  const menuTarget = await page.getByRole("button", { name: "Open menu" }).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
  const headerItems = await header.evaluate((element) => {
    const brand = element.querySelector('a[aria-label="larper home"]')!.getBoundingClientRect();
    const signIn = [...element.querySelectorAll("a")].find((link) => link.textContent === "Sign in")!.getBoundingClientRect();
    const menu = element.querySelector('button[aria-label="Open menu"]')!.getBoundingClientRect();
    return {
      brandRight: brand.right,
      signInLeft: signIn.left,
      signInHeight: signIn.height,
      menuRight: menu.right,
      headerRight: element.getBoundingClientRect().right,
    };
  });

  expect(await header.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(60);
  expect(menuTarget.width).toBeGreaterThanOrEqual(44);
  expect(menuTarget.height).toBeGreaterThanOrEqual(44);
  expect(headerItems.signInHeight).toBeGreaterThanOrEqual(44);
  expect(headerItems.brandRight).toBeLessThan(headerItems.signInLeft);
  expect(headerItems.headerRight - headerItems.menuRight).toBeLessThanOrEqual(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("mobile rails work without horizontal page overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const rail = page.locator('section[aria-labelledby="your-larps"] > div').last();
  await expect.poll(() => rail.evaluate((element) => getComputedStyle(element).overflowX)).toBe("auto");
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("narrow signal rails keep compact stories readable without stretching them", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop project owns the exact 320px viewport");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const card = page.locator('section[aria-labelledby="larping-now"] article').nth(1);
  const metrics = await card.evaluate((element) => {
    const title = element.querySelector("h3")!;
    const cardBox = element.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    return {
      cardHeight: cardBox.height,
      titleContained: titleBox.left >= cardBox.left && titleBox.right <= cardBox.right,
      titleOverflow: getComputedStyle(title).overflow,
      lineClamp: getComputedStyle(title).webkitLineClamp,
    };
  });
  expect(metrics.cardHeight).toBeLessThan(260);
  expect(metrics.titleContained).toBe(true);
  expect(metrics.titleOverflow).toBe("visible");
  expect(metrics.lineClamp).toBe("none");
});

test("Your Larps keeps its title and metadata inside a 320px card", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop project owns the exact 320px viewport");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator('section[aria-labelledby="your-larps"]').filter({ visible: true }).first();
  const card = section.locator("article").first();
  const contained = await card.evaluate((element) => {
    const cardBox = element.getBoundingClientRect();
    const title = element.querySelector("h3")!;
    const titleBox = title.querySelector("a")!.getBoundingClientRect();
    const metaItems = [...title.previousElementSibling!.children];
    const actionBox = element.querySelector('a[aria-label^="Explore"]')!.getBoundingClientRect();
    return titleBox.right <= cardBox.right
      && title.scrollWidth <= title.clientWidth
      && metaItems.every((item) => item.getBoundingClientRect().right <= actionBox.left);
  });
  expect(contained).toBe(true);
});

test("tablet recommendations stay readable instead of collapsing into narrow columns", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop project owns the exact tablet viewport");
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="new-larps"]').filter({ visible: true }).first();
  const rail = section.locator("article").first().locator("..");
  await expect.poll(() => rail.evaluate((element) => getComputedStyle(element).overflowX)).toBe("auto");
  const widths = await section.locator("article").evaluateAll((items) => items.slice(0, 3).map((item) => item.getBoundingClientRect().width));
  expect(widths.every((width) => width >= 340)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
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
