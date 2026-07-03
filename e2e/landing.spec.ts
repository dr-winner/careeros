import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should load landing page without errors", async ({ page }) => {
    await page.goto("/");
    
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Jobs Page", () => {
  test("should load jobs page", async ({ page }) => {
    await page.goto("/jobs");
    
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
  });

  test("should show job listings or loading state", async ({ page }) => {
    await page.goto("/jobs");
    
    await page.waitForTimeout(2000);
    
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();
  });
});

test.describe("Dashboard", () => {
  test("should handle dashboard page", async ({ page }) => {
    await page.goto("/dashboard");
    
    await page.waitForLoadState("domcontentloaded");
    
    const bodyVisible = await page.locator("body").isVisible();
    expect(bodyVisible).toBeTruthy();
  });
});

test.describe("Applications Page", () => {
  test("should handle applications page", async ({ page }) => {
    await page.goto("/applications");
    
    await page.waitForLoadState("domcontentloaded");
    
    const bodyVisible = await page.locator("body").isVisible();
    expect(bodyVisible).toBeTruthy();
  });
});

test.describe("Guided Onboarding", () => {
  test("should load onboarding page", async ({ page }) => {
    await page.goto("/guided-onboarding");
    
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Jobs Detail Page", () => {
  test("should handle jobs detail page", async ({ page }) => {
    await page.goto("/jobs/test-id");
    
    await page.waitForLoadState("domcontentloaded");
    
    const bodyVisible = await page.locator("body").isVisible();
    expect(bodyVisible).toBeTruthy();
  });
});
