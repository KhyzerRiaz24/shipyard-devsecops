/** User-focused tests: navigation, honest empty state, validation/auth errors and journal writes. */
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
let entries;
beforeEach(() => {
  location.hash = "";
  entries = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, options) => {
      if (url === "/api/system")
        return {
          ok: true,
          json: async () => ({ version: "test", database: "connected" }),
        };
      if (options?.method === "POST") {
        if (options.headers.authorization !== `Bearer ${"x".repeat(32)}`)
          return {
            ok: false,
            json: async () => ({ error: "A valid write token is required." }),
          };
        const release = {
          ...JSON.parse(options.body),
          id: "test-id",
          createdAt: new Date().toISOString(),
          source: "manual",
        };
        entries.push(release);
        return { ok: true, json: async () => ({ release }) };
      }
      return { ok: true, json: async () => ({ releases: entries }) };
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("shows an honest empty state and explains each navigable page", async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(
    await screen.findByText("Your first release starts here."),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Architecture" }));
  expect(screen.getByText("One request. Four stops.")).toBeInTheDocument();
  await user.click(screen.getByText("How this page works"));
  expect(screen.getByText(/Jenkins builds artifacts/)).toBeVisible();
  await user.click(screen.getByRole("link", { name: "Runbooks" }));
  expect(screen.getByText("Back up the journal")).toBeInTheDocument();
});
test("records an entry and clears the write token when the dialog closes", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Your first release starts here.");
  await user.click(
    screen.getAllByRole("button", { name: "Record a release" })[0],
  );
  await user.type(screen.getByLabelText("Service"), "api");
  await user.type(screen.getByLabelText("Version / commit"), "abc1234");
  await user.type(screen.getByLabelText("Write token"), "x".repeat(32));
  await user.click(screen.getByRole("button", { name: "Save release" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Release recorded.",
  );
  expect(await screen.findByText("abc1234")).toBeInTheDocument();
  expect(localStorage.length).toBe(0);
  await user.click(screen.getByRole("button", { name: "Record a release" }));
  expect(screen.getByLabelText("Write token")).toHaveValue("");
});
test("surfaces authentication failure without losing the form", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Your first release starts here.");
  await user.click(
    screen.getAllByRole("button", { name: "Record a release" })[0],
  );
  await user.type(screen.getByLabelText("Service"), "api");
  await user.type(screen.getByLabelText("Version / commit"), "abc1234");
  await user.type(screen.getByLabelText("Write token"), "wrong".repeat(8));
  await user.click(screen.getByRole("button", { name: "Save release" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "A valid write token is required.",
  );
  expect(screen.getByLabelText("Service")).toHaveValue("api");
});
test("reports unavailable API instead of showing simulated health", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not refresh",
  );
  await waitFor(() =>
    expect(screen.getByText("API not ready")).toBeInTheDocument(),
  );
});

test("filters saved releases and renders notes as text rather than HTML", async () => {
  entries = [
    {
      id: "one",
      service: "api",
      version: "commit-one",
      environment: "staging",
      status: "succeeded",
      notes: "<img src=x onerror=alert(1)>",
      createdAt: new Date().toISOString(),
    },
    {
      id: "two",
      service: "web",
      version: "commit-two",
      environment: "production",
      status: "failed",
      notes: "Readiness failed",
      createdAt: new Date().toISOString(),
    },
  ];
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("commit-one");
  await user.click(screen.getByRole("link", { name: "Release journal" }));
  expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  expect(document.querySelector("img[src=x]")).toBeNull();
  await user.selectOptions(
    screen.getByLabelText("Filter environment"),
    "production",
  );
  expect(screen.queryByText("commit-one")).not.toBeInTheDocument();
  expect(screen.getByText("commit-two")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Search releases"), "not-found");
  expect(
    screen.getByText("No entries match these filters."),
  ).toBeInTheDocument();
});
