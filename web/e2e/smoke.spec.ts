import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

// Requires a test account. Run with:
//   E2E_EMAIL=... E2E_PASSWORD=... npx playwright install chromium && npm run test:e2e
test.describe("smoke", () => {
  test.skip(!EMAIL || !PASSWORD, "set E2E_EMAIL and E2E_PASSWORD to run E2E");

  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "MERIK" })).toBeVisible();
  });

  test("login and visit every module", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[type=email]").fill(EMAIL!);
    await page.locator("input[type=password]").fill(PASSWORD!);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

    const modules: Array<[string, string]> = [
      ["/employees", "Employees"],
      ["/attendance", "Daily Attendance"],
      ["/leave", "WFH & Leave"],
      ["/payroll", "Payroll"],
      ["/tasks", "Daily Task Log"],
      ["/clients", "Clients"],
      ["/projects", "Projects"],
      ["/quotes", "Quotes"],
      ["/invoices", "Invoices"],
    ];
    for (const [path, heading] of modules) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
  });
});
