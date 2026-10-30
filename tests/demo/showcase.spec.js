// Recruiter workflow on the free site: no server calls, no token, and clear demo labels.
import { test, expect } from "@playwright/test";
test("public demo is honest, interactive and persistent in one browser", async ({
  page,
  isMobile,
}) => {
  const apiCalls = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiCalls.push(request.url());
  });
  await page.goto("./");
  await expect(page.getByLabel("About this demo")).toBeVisible();
  await expect(page.getByText("Browser demo", { exact: true })).toBeVisible();
  await expect(page.getByText("No server database connected")).toBeVisible();
  await page
    .getByRole("button", { name: "Record a release", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Write token")).toHaveCount(0);
  await page.getByLabel("Service", { exact: true }).fill("recruiter-demo");
  await page.getByLabel("Version / commit").fill("demo-123");
  await page.getByRole("button", { name: "Save release" }).click();
  await expect(page.getByRole("status")).toContainText("Release recorded");
  await page.reload();
  await expect(page.getByText("demo-123", { exact: true })).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("link", { name: "Release journal", exact: true })
    .click();
  await page.getByLabel("Search releases").fill("demo-123");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  if (isMobile)
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Architecture", exact: true }).click();
  await expect(page.getByText("One request. Four stops.")).toBeVisible();
  expect(apiCalls).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
