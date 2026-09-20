import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NicheSectionNav } from "./niche-section-nav";

describe("NicheSectionNav", () => {
  it("links the niche chapters and includes lore when it exists", () => {
    render(<NicheSectionNav nicheName="Sneakers" hasLore />);

    expect(screen.getByRole("link", { name: "Current" })).toHaveAttribute("href", "#current");
    expect(screen.getByRole("link", { name: "Lore" })).toHaveAttribute("href", "#lore");
    expect(screen.getByRole("link", { name: "Adjacent" })).toHaveAttribute("href", "#adjacent");
  });

  it("omits an empty lore chapter", () => {
    render(<NicheSectionNav nicheName="Sneakers" hasLore={false} />);

    expect(screen.queryByRole("link", { name: "Lore" })).not.toBeInTheDocument();
  });
});
