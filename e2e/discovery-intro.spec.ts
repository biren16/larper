import { expect, test } from "@playwright/test";

test("the image-free intro resolves into the navbar wordmark", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.addInitScript(() => window.sessionStorage.removeItem("larper:intro:v1"));
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const introWordmark = page.locator("[data-intro-wordmark]");
    const overlay = introWordmark.locator("xpath=ancestor::div[@aria-hidden='true']");
    const stage = introWordmark.locator("xpath=..");
    await expect(overlay.locator("img")).toHaveCount(0);
    await expect(stage.locator(":scope > *")).toHaveCount(1);
    expect(await introWordmark.evaluate((element) => {
      const style = getComputedStyle(element);
      return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
    })).toBeGreaterThanOrEqual(0.85);
    expect(await introWordmark.evaluate((element) => {
      const stage = element.parentElement;
      return stage ? getComputedStyle(stage, "::after").borderStyle : "missing";
    })).toBe("none");

    const navbarWordmark = page.getByRole("link", { name: "larper home" });
    await expect(introWordmark).toBeVisible();
    await page.waitForTimeout(2800);

    const introBox = await introWordmark.boundingBox();
    const navbarBox = await navbarWordmark.boundingBox();
    expect(introBox).not.toBeNull();
    expect(navbarBox).not.toBeNull();
    expect(Math.abs(introBox!.x - navbarBox!.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(introBox!.y - navbarBox!.y)).toBeLessThanOrEqual(8);
    expect(Math.abs(introBox!.width - navbarBox!.width)).toBeLessThanOrEqual(8);

    await expect(introWordmark).toBeHidden({ timeout: 1000 });
    await expect(page.getByLabel("Current ranked culture signals").getByRole("link", { name: /open silver runners/i })).toBeEnabled();
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  expect(browserErrors).toEqual([]);
});

test("reduced motion bypasses the intro without delaying the hero", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => window.sessionStorage.removeItem("larper:intro:v1"));
  await page.goto("/");

  await expect(page.locator("[data-intro-wordmark]")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("the wordmark sequence uses the active dark theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => window.sessionStorage.removeItem("larper:intro:v1"));
  await page.goto("/");

  const wordmark = page.locator("[data-intro-wordmark]");
  await expect(wordmark).toBeVisible();
  expect(await wordmark.evaluate((element) => getComputedStyle(element).color)).not.toBe("rgba(0, 0, 0, 0)");
  await page.keyboard.press("Escape");
  await expect(wordmark).toBeHidden();
});
