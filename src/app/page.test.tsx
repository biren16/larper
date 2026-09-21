import { Children, isValidElement, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/data/discovery-cache", () => ({
  getCachedDiscoveryHome: vi.fn(() => new Promise(() => undefined)),
}));

import { DiscoveryIntro } from "@/components/discovery/discovery-intro";
import HomePage, { HomeLoading } from "./page";

describe("HomePage loading order", () => {
  it("places the intro outside and before the discovery-data boundary", () => {
    const page = HomePage();
    expect(isValidElement(page)).toBe(true);

    const children = Children.toArray((page as ReactElement<{ children: React.ReactNode }>).props.children);
    expect(isValidElement(children[0]) && children[0].type).toBe(DiscoveryIntro);
    expect((children[1] as ReactElement<{ fallback: ReactElement }>).props.fallback.type).toBe(HomeLoading);
  });

  it("reserves the viewport while discovery data loads", () => {
    render(<HomeLoading />);

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("main")).toHaveAttribute("style", "min-height: 100vh;");
  });
});
