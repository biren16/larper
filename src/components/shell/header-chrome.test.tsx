import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HeaderChrome } from "./header-chrome";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("HeaderChrome", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("keeps Sign in visible on public pages but removes it from auth pages", () => {
    const { rerender } = render(<HeaderChrome account={null} />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth");

    pathname = "/auth";
    rerender(<HeaderChrome account={null} />);

    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it.each(["/studio", "/studio/candidates/candidate-1"])("centers Studio context on %s", (route) => {
    pathname = route;
    render(<HeaderChrome account={{ label: "editor@example.com", canOpenStudio: true }} />);

    expect(screen.getByRole("link", { name: "Studio" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("does not flash Sign in while a protected Studio route redirects", () => {
    pathname = "/studio";
    render(<HeaderChrome account={null} />);

    expect(screen.getByRole("link", { name: "Studio" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("moves editor identity, Studio access, and Sign out into the menu", () => {
    render(
      <HeaderChrome
        account={{ label: "editor@example.com", canOpenStudio: true }}
        signOutAction={vi.fn()}
      />,
    );

    expect(screen.queryByText("editor@example.com")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = within(screen.getByRole("dialog", { name: "Site menu" }));

    expect(menu.getByText("editor@example.com")).toBeVisible();
    expect(menu.getByRole("link", { name: "Open Studio" })).toHaveAttribute("href", "/studio");
    expect(menu.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  it("does not offer Studio access to a regular signed-in member", () => {
    render(<HeaderChrome account={{ label: "member@example.com", canOpenStudio: false }} />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = within(screen.getByRole("dialog", { name: "Site menu" }));

    expect(menu.getByText("member@example.com")).toBeVisible();
    expect(menu.queryByRole("link", { name: "Open Studio" })).not.toBeInTheDocument();
  });
});
