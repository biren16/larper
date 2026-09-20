import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ signInWithGoogle: vi.fn(), sendMagicLink: vi.fn() }));
import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("offers Google and email-link sign-in while preserving anonymous browsing", () => {
    render(<AuthForm next="/discover/story" />);
    expect(screen.getByRole("heading", { name: "Keep your rabbit holes." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Email me a sign-in link" })).toBeInTheDocument();
    expect(screen.getByText(/browsing stays free and open/i)).toBeInTheDocument();
  });
});
