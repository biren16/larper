import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREFERENCES_STORAGE_KEY } from "@/domain/preferences/preferences";
import { FollowedNichesProvider, useFollowedNiches } from "./followed-niches-provider";
import { PreferenceSync } from "./preference-sync";

function Probe() {
  return <output>{useFollowedNiches().followedNicheIds.join(",")}</output>;
}

describe("PreferenceSync", () => {
  beforeEach(() => window.localStorage.clear());

  it("merges local follows once and hydrates the provider with the account result", async () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ version: 1, followedNicheIds: ["books"] }));
    const merge = vi.fn(async () => ({ ok: true as const, followedNicheIds: ["books", "f1"] }));
    render(
      <FollowedNichesProvider knownNicheIds={["books", "f1"]}>
        <PreferenceSync userId="user-1" merge={merge} />
        <Probe />
      </FollowedNichesProvider>,
    );

    await waitFor(() => expect(screen.getByText("books,f1")).toBeInTheDocument());
    expect(merge).toHaveBeenCalledWith(["books"]);
  });
});
