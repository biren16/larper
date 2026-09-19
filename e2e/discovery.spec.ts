import { expect, test } from "@playwright/test";

test("moves from discovery to a topic and its niche", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("What niche communities are obsessed with right now");
  await page.getByRole("link", { name: "Silver runners are back in rotation", exact: true }).first().click();
  await expect(page).toHaveURL(/\/discover\/the-silver-runner-resurgence$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Silver runners are back in rotation");
  const relatedStory = page.getByRole("link", { name: "Indoor football shoes left the court", exact: true });
  const relatedStoryBox = await relatedStory.boundingBox();
  expect(relatedStoryBox?.width ?? 0).toBeGreaterThan(isMobile ? 150 : 250);
  await page.getByRole("link", { name: "Sneakers", exact: true }).first().click();
  await expect(page).toHaveURL(/\/niches\/sneakers$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sneakers");
});

test("persists a newly followed niche", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Start larping in Mechanical Keyboards" });
  await button.click();
  await page.reload();
  const yourLarps = page.locator("section").filter({ has: page.getByRole("heading", { name: "Your larps" }) });
  await expect(yourLarps.getByRole("heading", { name: "Mechanical Keyboards" })).toBeVisible();
});

test("mobile discovery has no horizontal page overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/");
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("desktop editorial surfaces keep their layout and dark-mode contrast", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout only");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  const firstLoreTile = page.locator("section").filter({ has: page.getByRole("heading", { name: "Deep lore" }) }).locator("article").first();
  const loreImageBox = await firstLoreTile.getByRole("link", { name: /^Explore / }).boundingBox();
  const loreCopyBox = await firstLoreTile.locator("div").last().boundingBox();
  expect(loreImageBox).not.toBeNull();
  expect(loreCopyBox).not.toBeNull();
  expect(loreCopyBox!.y).toBeGreaterThanOrEqual(loreImageBox!.y + loreImageBox!.height);

  await page.getByRole("link", { name: "Silver runners are back in rotation", exact: true }).first().click();
  const contrast = await page.locator("aside").evaluate((element) => {
    const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (rgb: number[]) => {
      const channels = rgb.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const styles = getComputedStyle(element);
    const foreground = luminance(parse(styles.color));
    const background = luminance(parse(styles.backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
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
