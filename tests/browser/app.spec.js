// Verifies navigation and real persisted writes through Nginx -> API -> MongoDB.
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const token =
  process.env.WRITE_TOKEN || parseEnv(readFileSync(".env", "utf8")).WRITE_TOKEN;
test("navigation, write authentication, persisted journal and responsive layout", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.getByText("API connected")).toBeVisible();
  await page
    .getByRole("button", { name: "Record a release", exact: true })
    .first()
    .click();
  await page.getByLabel("Service", { exact: true }).fill("browser-test");
  const version = `browser-${randomUUID()}`;
  await page.getByLabel("Version / commit").fill(version);
  await page
    .getByLabel("Write token")
    .fill("wrong-token-with-thirty-two-characters");
  await page.getByRole("button", { name: "Save release" }).click();
  await expect(page.getByRole("alert")).toContainText("valid write token");
  await page.getByLabel("Write token").fill(token);
  await page.getByRole("button", { name: "Save release" }).click();
  await expect(page.getByRole("status")).toContainText("Release recorded");
  await page.reload();
  await expect(page.getByText(version, { exact: true })).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Architecture", exact: true }).click();
  await expect(page.getByText("One request. Four stops.")).toBeVisible();
  await page.getByText("How this page works").click();
  await expect(page.getByText(/Jenkins builds artifacts/)).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("link", { name: "Release journal", exact: true })
    .click();
  await page.getByLabel("Search releases").fill(version);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
