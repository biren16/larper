import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrimaryNav } from "./primary-nav";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("PrimaryNav", () => {
  beforeEach(() => {
    pathname = "/";
    window.history.replaceState({}, "", "/");
  });

  it("marks Discovery active on the home page", () => {
    render(<PrimaryNav />);

    expect(screen.getByRole("link", { name: "Discovery" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Your Larps" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it.each(["/discover/archive-fleece", "/niches/sneakers"])(
    "keeps Discovery active on %s",
    (route) => {
      pathname = route;
      window.history.replaceState({}, "", route);
      render(<PrimaryNav />);

      expect(screen.getByRole("link", { name: "Discovery" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    },
  );

  it("marks Your Larps active when its home-page hash is selected", () => {
    window.history.replaceState({}, "", "/#your-larps");
    render(<PrimaryNav />);

    expect(screen.getByRole("link", { name: "Your Larps" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Discovery" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("responds when the active hash changes", () => {
    render(<PrimaryNav />);

    act(() => {
      window.history.replaceState({}, "", "/#your-larps");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByRole("link", { name: "Your Larps" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("updates immediately during same-page Next link navigation", () => {
    render(<PrimaryNav />);

    fireEvent.click(screen.getByRole("link", { name: "Your Larps" }));
    expect(screen.getByRole("link", { name: "Your Larps" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(screen.getByRole("link", { name: "Discovery" }));
    expect(screen.getByRole("link", { name: "Discovery" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
