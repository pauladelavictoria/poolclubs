import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Not using vitest's `globals: true`, so RTL's own auto-cleanup (which
// depends on detecting a global afterEach) never registers on its own.
afterEach(cleanup);
