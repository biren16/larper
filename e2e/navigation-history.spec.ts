import { expect, test } from "@playwright/test";

test("browser Back and Forward dismiss the menu and keep section navigation usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Your Larps", exact: true }).click();
  await expect(page).toHaveURL(/#your-larps$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("#your-larps")).toBeInViewport();

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.goBack();
  await expect(page).not.toHaveURL(/#your-larps$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.goForward();
  await expect(page).toHaveURL(/#your-larps$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Discovery", exact: true }).click();
  await expect(page).not.toHaveURL(/#your-larps$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
