import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Artwork } from "./artwork";

describe("Artwork", () => {
  it("renders a subject-specific fallback when no approved image exists", () => {
    render(<Artwork media={null} context={{ title: "Race radio has its own afterlife", niche: "F1", nicheId: "f1", type: "LORE", seed: "story-42" }} />);
    expect(screen.getByText("Race radio has its own afterlife")).toBeInTheDocument();
    expect(screen.getByText("F1 / LORE")).toBeInTheDocument();
    expect(screen.getByTestId("larper-cover")).toHaveAttribute("data-treatment", "motorsport");
  });

  it("shows required credit and preserves an image without modification rights", () => {
    render(<Artwork media={{
      id: "cover-1", src: "/media/f1-art.png", alt: "Race car", width: 1200, height: 800,
      kind: "uploaded", creditLine: "Photo by Artist", modificationAllowed: false,
    }} />);
    expect(screen.getByText("Photo by Artist")).toBeInTheDocument();
    expect(screen.getByTestId("media-frame")).toHaveAttribute("data-modification", "restricted");
  });
});
