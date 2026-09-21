import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => { throw new Error(`redirect:${url}`); });
const getEditorialRuntime = vi.fn();
const createEditorialActions = vi.fn();

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/backend/editorial/runtime", () => ({ getEditorialRuntime }));
vi.mock("@/backend/editorial/actions", () => ({ createEditorialActions }));

describe("addManualSignalAction", () => {
  it("refreshes unclustered signals after saving a founder lead", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    getEditorialRuntime.mockResolvedValue({
      actor: { id: "founder-1" }, service: {},
      client: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: "manual-source" }, error: null }) }) }) }) }) }), rpc },
    });
    createEditorialActions.mockReturnValue({ addManualSignal: async () => ({ ok: true, signalId: "signal-1" }) });
    const { addManualSignalAction } = await import("./actions");
    const form = new FormData();

    await expect(addManualSignalAction(form)).rejects.toThrow("redirect:/studio");
    expect(rpc).toHaveBeenCalledWith("process_unclustered_signals");
  });
});
