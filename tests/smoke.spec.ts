import { test, expect, Page, ConsoleMessage } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import places from "./fixtures/places.json";

async function waitForApp(page: Page): Promise<void> {
  await expect(page.locator("#modal-loading")).toBeHidden({ timeout: 90_000 });
}

async function start(page: Page, url = "./"): Promise<void> {
  await page.goto(url);
  await waitForApp(page);
  await page.getByRole("button", { name: "Start exploring" }).click();
  await expect(page.locator(".intro-backdrop")).toHaveCount(0);
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") { return; }
    const text = msg.text();
    if (/Failed to load resource|net::ERR_|status of 404/.test(text)) { return; }
    errors.push(`console: ${text}`);
  });
  return errors;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const app = (page: Page) => page.evaluate(() => (window as any).orionApp && true);

test("boots on the 2023 start image with a single layer (O2)", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("./?debug=1");
  await waitForApp(page);
  await expect(page.getByRole("dialog", { name: /Orion Nebula/ })).toBeVisible();
  await expect(page.locator(".gallery-item")).toHaveCount(places.length);
  await page.getByRole("button", { name: "Start exploring" }).click();
  await expect(page.locator(".description-panel .desc-title")).toHaveText("JWST - NIRCam Short-wavelength");
  await page.waitForTimeout(7000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layers = await page.evaluate(() => (window as any).orionApp.imageLayers.length);
  expect(layers).toBe(1);
  expect(await app(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("every fixture Place is in the gallery and selectable, including VISTA (O3)", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page);
  for (const p of places) {
    await page.locator(".gallery-item", { hasText: p.place }).first().click();
    await expect(page.locator(".description-panel .desc-title")).toHaveText(p.place);
  }
  expect(errors).toEqual([]);
});

test("a failed catalog load shows the error card (O4)", async ({ page }) => {
  await page.route("**/orion.wtml", (route) => route.fulfill({ status: 404, body: "not found" }));
  await page.goto("./");
  await expect(page.getByRole("alert")).toContainText("couldn't be loaded", { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("all 192 markers are plotted and toggle from the controls and the URL (O7)", async ({ page }) => {
  await start(page, "./?debug=1");
  await page.waitForTimeout(6000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = () => page.evaluate(() => (window as any).orionApp.catalogEntries.length);
  expect(await count()).toBe(192);
  await page.getByRole("button", { name: "JuMBOs" }).click();
  await expect(page.getByRole("button", { name: "JuMBOs" })).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => new URL(page.url()).searchParams.get("markers")).toBe("proplyds");
  await page.goto("./?markers=jumbos");
  await waitForApp(page);
  await expect(page.getByRole("button", { name: "Proplyds" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "JuMBOs" })).toHaveAttribute("aria-pressed", "true");
});

test("clicking a JuMBO opens its card with masses and separation (O12)", async ({ page }) => {
  await start(page, "./?debug=1&markers=jumbos");
  await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = (window as any).orionApp;
    // JuMBO 24, published as two ~11.5 Jupiter-mass objects 28 au apart.
    await a.gotoRADecZoom({ raRad: 83.8310221 * Math.PI / 180, decRad: -5.3942997 * Math.PI / 180, zoomDeg: 0.3, instant: true });
  });
  await page.waitForTimeout(4000);
  const center = await page.evaluate(() => {
    const c = document.querySelector("canvas.catalog-overlay")!.getBoundingClientRect();
    return { x: c.left + c.width / 2, y: c.top + c.height / 2 };
  });
  await page.mouse.click(center.x, center.y);
  await expect(page.locator(".marker-card #marker-title")).toHaveText("JuMBO 24");
  await expect(page.locator(".marker-card")).toContainText("~11.5 and ~11.5 Jupiter masses, about 28 au apart");
  await page.keyboard.press("Escape");
  await expect(page.locator(".marker-card")).toHaveCount(0);
});

test("?image= deep link opens on that image", async ({ page }) => {
  await start(page, `./?image=${encodeURIComponent("Hubble - Optical")}`);
  await expect(page.locator(".description-panel .desc-title")).toHaveText("Hubble - Optical");
});

test("guided tour steps through stops", async ({ page }) => {
  await page.goto("./");
  await waitForApp(page);
  await page.getByRole("button", { name: /Take the guided tour/ }).click();
  await expect(page.locator(".tour-label")).toContainText("1 of 9");
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.locator(".tour-label")).toContainText("2 of 9");
});

test("compare mode blends two telescopes' views", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: /^Compare/ }).click();
  await expect(page.locator(".compare-bar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".compare-bar")).toHaveCount(0);
});

test("kiosk mode reaches the attract loop after idling", async ({ page }) => {
  await page.goto("./?kiosk=1&kioskIdle=5");
  await waitForApp(page);
  await expect(page.locator(".kiosk-hint")).toBeVisible({ timeout: 30_000 });
  await page.mouse.click(400, 400);
  await expect(page.locator(".kiosk-hint")).toHaveCount(0);
});

test("kiosk stats panel loads on its own", async ({ page }) => {
  await page.goto("./?kioskStats=1");
  await expect(page.locator(".kiosk-stats")).toBeVisible();
});

test("no serious accessibility violations (O6)", async ({ page }) => {
  await page.goto("./");
  await waitForApp(page);
  for (const phase of ["intro", "main"]) {
    if (phase === "main") {
      await page.getByRole("button", { name: "Start exploring" }).click();
      await expect(page.locator(".intro-backdrop")).toHaveCount(0);
    }
    const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${phase}: ${v.id}: ${v.help} at ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
});

for (const [w, h] of [[375, 667], [844, 390], [768, 1024]]) {
  test(`no overlapping panels at ${w}x${h} (O13)`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
    const page = await ctx.newPage();
    await start(page);
    await page.getByRole("button", { name: /^Compare/ }).click();
    await expect(page.locator(".compare-bar")).toBeVisible();
    await page.waitForTimeout(400);
    const boxes = await page.evaluate(() => {
      const r = (sel: string) => {
        const b = document.querySelector(sel)?.getBoundingClientRect();
        return b ? { sel, l: b.left, r: b.right, t: b.top, b: b.bottom } : null;
      };
      return [r(".description-panel"), r(".compare-bar"), r(".jwst-gallery"), r(".top-left-controls")].filter(Boolean);
    });
    const hits: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!, b = boxes[j]!;
        if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) { hits.push(`${a.sel} × ${b.sel}`); }
      }
    }
    expect(hits).toEqual([]);
    await ctx.close();
  });
}
