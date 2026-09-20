import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("site brand", () => {
  it("uses the lowercase larper wordmark in the global shell", () => {
    const { container } = render(
      <>
        <SiteHeader />
        <SiteFooter />
      </>,
    );

    expect(screen.getByRole("link", { name: "larper home" })).toHaveTextContent("larper");
    expect(screen.getByRole("link", { name: "larper" })).toBeInTheDocument();
    expect(container).not.toHaveTextContent("LARPer");
  });
});
