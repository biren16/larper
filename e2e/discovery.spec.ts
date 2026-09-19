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
  await expect(page.getByRole("heading", { name: "Mechanical Keyboards" }).first()).toBeVisible();
});

test("mobile discovery has no horizontal page overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/");
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});
