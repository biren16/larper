import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const dashboardStyles = readFileSync(new URL("../src/app/studio/studio.module.css", import.meta.url), "utf8");
const editorStyles = readFileSync(new URL("../src/app/studio/candidates/story-editor.module.css", import.meta.url), "utf8");
const sourceStyles = readFileSync(new URL("../src/app/studio/sources/sources.module.css", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const siteSans = '"Site Sans"';

async function renderTypographyFixture(page: Page, styles: string, markup: string) {
  await page.setContent(`
    <style>${globalStyles}</style>
    <style>
      :root { --font-sans: "Site Sans"; --font-serif: "Editorial Serif"; }
      body { font-family: var(--font-sans); }
    </style>
    <style>${styles}</style>
    ${markup}
  `);
}

test("Studio typography inherits the site content face on the dashboard", async ({ page }) => {
  await renderTypographyFixture(page, dashboardStyles, `
    <main class="main">
      <article class="candidateCopy"><h3>Candidate title</h3></article>
      <div class="emptyState"><strong>Empty state</strong></div>
    </main>
  `);

  await expect(page.locator(".candidateCopy h3")).toHaveCSS("font-family", siteSans);
  await expect(page.locator(".emptyState strong")).toHaveCSS("font-family", siteSans);
});

test("Studio typography inherits the site content face in the candidate editor", async ({ page }) => {
  await renderTypographyFixture(page, editorStyles, `
    <main class="main">
      <header class="header"><h1>Candidate title</h1></header>
      <aside class="evidence"><h3>Evidence title</h3></aside>
    </main>
  `);

  await expect(page.locator(".header h1")).toHaveCSS("font-family", siteSans);
  await expect(page.locator(".evidence h3")).toHaveCSS("font-family", siteSans);
});

test("Studio source fields retain the content font and fit their column", async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await renderTypographyFixture(page, sourceStyles, `
      <main class="main"><div class="workspace"><div></div><aside class="configPanel">
        <form><label>Source name<input value="A long publisher name"></label>
        <div class="formPair"><label>Beat<select><option>Screen Culture</option></select></label><label>Adapter<select><option>Manual publisher reference</option></select></label></div></form>
      </aside></div><div class="reviewPanel"><label>Restrictions<textarea>Review notes</textarea></label></div></main>
    `);
    await expect(page.locator("textarea")).toHaveCSS("font-family", siteSans);
    await expect(page.locator("textarea")).toHaveCSS("font-size", "16px");
    expect(await page.locator(".configPanel").evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return [...element.querySelectorAll("input, select")].every(field => field.getBoundingClientRect().right <= bounds.right);
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
