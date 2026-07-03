import { test, expect } from "@playwright/test";

test.describe("referral link attribution", () => {
  test("visiting with a valid ?ref= sets the attribution cookie", async ({ page }) => {
    await page.goto("/?ref=CAREER-ABC123XYZ0");

    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === "careeros_ref");

    expect(refCookie).toBeDefined();
    expect(refCookie?.value).toBe("CAREER-ABC123XYZ0");
    expect(refCookie?.httpOnly).toBe(true);
  });

  test("invalid ref codes do not set the cookie", async ({ page }) => {
    await page.goto("/?ref=<script>alert(1)</script>");

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "careeros_ref")).toBeUndefined();
  });

  test("the cookie survives navigating to another page", async ({ page }) => {
    await page.goto("/?ref=CAREER-ABC123XYZ0");
    await page.goto("/about");

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "careeros_ref")?.value).toBe("CAREER-ABC123XYZ0");
  });
});
