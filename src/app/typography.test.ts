import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("global typography", () => {
  it("loads the Instrument families through Next and exposes the existing CSS font tokens", () => {
    const layout = read("./layout.tsx");
    const globals = read("./globals.css");

    expect(layout).toContain('import { Instrument_Sans, Instrument_Serif } from "next/font/google"');
    expect(layout).toContain('variable: "--font-instrument-sans"');
    expect(layout).toContain('variable: "--font-instrument-serif"');
    expect(layout).toMatch(/Instrument_Serif\(\{[\s\S]*?weight: "400"/);
    expect(layout).toContain("instrumentSans.variable");
    expect(layout).toContain("instrumentSerif.variable");
    expect(globals).toContain("--font-sans: var(--font-instrument-sans)");
    expect(globals).toContain("--font-serif: var(--font-instrument-serif)");
    expect(globals).not.toContain("@fontsource-variable");
  });

  it("keeps Studio editorial headings on Instrument Serif's supported regular weight", () => {
    const storyEditor = read("./studio/candidates/story-editor.module.css");

    expect(storyEditor).toMatch(/\.evidence h3 \{[^}]*font-weight: 400;/);
  });

  it("removes the superseded Fontsource packages", () => {
    const packageJson = JSON.parse(read("../../package.json")) as { dependencies: Record<string, string> };

    expect(packageJson.dependencies).not.toHaveProperty("@fontsource-variable/bricolage-grotesque");
    expect(packageJson.dependencies).not.toHaveProperty("@fontsource-variable/newsreader");
  });
});
