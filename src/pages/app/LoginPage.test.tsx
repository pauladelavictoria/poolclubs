import { render, screen } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";

vi.mock("@/i18n", async (importOriginal) => {
  const { mockI18nModule } = await import("@/test/mockI18n");
  return mockI18nModule(await importOriginal());
});

// The page is a route component, so the router bits and the server functions
// both have to be stood in for. Nothing here is under test but what the page
// shows after signUp and requestPasswordReset.
vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({
    useSearch: () => ({}),
    useNavigate: () => vi.fn(),
  }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/hooks/useAuth", () => ({ useSessionRefresh: () => vi.fn() }));

const signUp = vi.fn();
const requestPasswordReset = vi.fn();
vi.mock("@/libs/server/auth.functions", () => ({
  signUp: (args: unknown) => signUp(args),
  requestPasswordReset: (args: unknown) => requestPasswordReset(args),
  signIn: vi.fn(),
  startGoogleOAuth: vi.fn(),
}));

// jsdom has no reportValidity; the real one gates the reset on a well-formed
// address, and every test here types one.
beforeAll(() => {
  HTMLInputElement.prototype.reportValidity = () => true;
});

/** Fill the sign-up form and submit it. */
async function signUpAs(email: string) {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.click(screen.getByText("No account? Create one"));
  await user.type(screen.getByLabelText("Name"), "Juan Carlos");
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), "hunter22");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  return user;
}

describe("LoginPage sign-up confirmation", () => {
  it("replaces the form with the confirmation screen and names the address", async () => {
    signUp.mockResolvedValue({ needsConfirmation: true });

    await signUpAs("juan@example.com");

    expect(screen.getByText("Check your email")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    // The point of the change: the form is gone, so the note can no longer be
    // mistaken for a validation error on a form that looks unsubmitted.
    expect(
      screen.queryByRole("button", { name: "Create account" }),
    ).not.toBeInTheDocument();
  });

  it("goes back to the sign-in form", async () => {
    signUp.mockResolvedValue({ needsConfirmation: true });

    const user = await signUpAs("juan@example.com");
    await user.click(screen.getByText("Back to sign in"));

    expect(screen.queryByText("Check your email")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("stays on the form when the sign-up fails", async () => {
    signUp.mockResolvedValue({ error: "signUpError" });

    await signUpAs("juan@example.com");

    expect(screen.queryByText("Check your email")).not.toBeInTheDocument();
    expect(
      screen.getByText("Could not create the account"),
    ).toBeInTheDocument();
  });
});

describe("LoginPage password reset", () => {
  /** Type an address on the sign-in form and ask for a reset. */
  async function resetFor(email: string) {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), email);
    await user.click(screen.getByText("Forgot your password?"));
    return user;
  }

  it("takes over the screen and stays conditional about the account", async () => {
    requestPasswordReset.mockResolvedValue(undefined);

    await resetFor("juan@example.com");

    expect(screen.getByText("Check your email")).toBeInTheDocument();
    expect(screen.getByText("If there is an account for")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  // The whole point of the vague wording: a stranger typing addresses in here
  // must not be able to tell a hit from a miss, and a thrown request is a hit
  // as far as they can see.
  it("says exactly the same thing when the request throws", async () => {
    requestPasswordReset.mockRejectedValue(new Error("nope"));

    await resetFor("stranger@example.com");

    expect(screen.getByText("If there is an account for")).toBeInTheDocument();
    expect(screen.getByText("stranger@example.com")).toBeInTheDocument();
  });
});
