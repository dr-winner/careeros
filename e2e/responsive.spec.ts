import { test, expect } from "@playwright/test";

// The landing page once overflowed horizontally on phones (fixed-width
// ambient glows in sections without overflow-hidden). body has
// overflow-x: clip — these tests assert the page can never scroll
// sideways again at common mobile widths.
const WIDTHS = [320, 375, 414];
const PAGES = ["/", "/employers", "/about"];

for (const width of WIDTHS) {
  for (const path of PAGES) {
    test(`no horizontal scroll on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.waitForTimeout(400);

      const scrollX = await page.evaluate(() => {
        window.scrollTo(200, 0);
        return window.scrollX;
      });

      expect(scrollX).toBe(0);
    });
  }
}
