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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrionApp = any;

// Engine opacity (0–1) of each layer, by Place name.
const engineOpacities = (page: Page) => page.evaluate(() => {
  const a = (window as unknown as { orionApp: OrionApp }).orionApp;
  const out: Record<string, number> = {};
  for (const [key, layer] of Object.entries(a.layerByKey)) {
    out[key.split("::")[0]] = Math.round((layer as OrionApp).get_opacity() * 100) / 100;
  }
  return out;
});

const shownNames = async (page: Page) =>
  Object.entries(await engineOpacities(page)).filter(([, v]) => v > 0).map(([k]) => k).sort();

const OPENING_SET = ["JWST - NIRCam Short-wavelength", "Matt Harbison - HA-LRGB", "VISTA - Infrared"];

test("boots with all eleven layers on the sky, stacked widest first, opening set shown", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("./?debug=1");
  await waitForApp(page);
  await expect(page.getByRole("dialog", { name: /Orion Nebula/ })).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(places.length);
  await page.getByRole("button", { name: "Start exploring" }).click();
  await expect(page.locator(".description-panel .desc-title")).toHaveText("JWST - NIRCam Short-wavelength");
  await page.waitForTimeout(7000);
  // Widest at the bottom, by footprint. This is the 2023 order (reverse WTML)
  // except that Spitzer (2.7°) now sits above the wider HAWK-I (3.8°).
  const names = await page.evaluate(() => (window as unknown as { orionApp: OrionApp }).orionApp.engineStackNames());
  expect(names).toEqual(places.slice().sort((a, b) => b.zoom - a.zoom).map((p) => p.place));
  // The panel lists the top of the stack first.
  await expect(page.locator(".layer-name").first()).toHaveText("JWST - MIRI");
  expect(await shownNames(page)).toEqual(OPENING_SET);
  // Hidden layers are disabled, not just transparent, so they fetch no tiles.
  const enabled = await page.evaluate(() => Object.entries((window as unknown as { orionApp: OrionApp }).orionApp.layerByKey)
    .filter(([, l]) => (l as OrionApp).get_enabled()).map(([k]) => k.split("::")[0]).sort());
  expect(enabled).toEqual(OPENING_SET);
  await expect(page.locator(".panel-count")).toHaveText(`3/${places.length}`);
  expect(await app(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("each layer's slider, eye, Solo and the All/None/Reset actions set engine opacity", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, "./?debug=1");
  const hubble = page.locator(".layer-row", { hasText: "Hubble - Optical" });
  await hubble.getByRole("slider", { name: "Hubble - Optical opacity" }).fill("40");
  await expect.poll(async () => (await engineOpacities(page))["Hubble - Optical"]).toBe(0.4);
  // The eye hides it and brings it back at its last opacity.
  await hubble.getByRole("button", { name: "Show Hubble - Optical" }).click();
  await expect.poll(async () => (await engineOpacities(page))["Hubble - Optical"]).toBe(0);
  await hubble.getByRole("button", { name: "Show Hubble - Optical" }).click();
  await expect.poll(async () => (await engineOpacities(page))["Hubble - Optical"]).toBe(0.4);
  await hubble.getByRole("button", { name: "Show only Hubble - Optical" }).click();
  await expect.poll(() => shownNames(page)).toEqual(["Hubble - Optical"]);
  await page.getByRole("button", { name: "None", exact: true }).click();
  await expect.poll(() => shownNames(page)).toEqual([]);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect.poll(async () => (await shownNames(page)).length).toBe(places.length);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect.poll(() => shownNames(page)).toEqual(OPENING_SET);
  // A telescope-group chip hides the whole group.
  await page.getByRole("button", { name: /^James Webb Space Telescope/ }).click();
  await expect.poll(() => shownNames(page)).toEqual(["Matt Harbison - HA-LRGB", "VISTA - Infrared"]);
  expect(errors).toEqual([]);
});

test("every fixture Place is selectable, including VISTA (O3), and selecting shows a hidden layer", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, "./?debug=1");
  for (const p of places) {
    await page.locator(".layer-name", { hasText: p.place }).first().click();
    await expect(page.locator(".description-panel .desc-title")).toHaveText(p.place);
  }
  await expect.poll(async () => (await engineOpacities(page))["JWST - MIRI"], { timeout: 15_000 }).toBe(1);
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

test("?layers= opens on that blend and is kept in sync with the sliders", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, `./?debug=1&image=${encodeURIComponent("Hubble - Optical")}&layers=hubble-optical:40,vista-infrared`);
  await expect(page.locator(".description-panel .desc-title")).toHaveText("Hubble - Optical");
  await page.waitForTimeout(5000);
  expect(await shownNames(page)).toEqual(["Hubble - Optical", "VISTA - Infrared"]);
  expect((await engineOpacities(page))["Hubble - Optical"]).toBe(0.4);
  await page.locator(".layer-row", { hasText: "JWST - MIRI" }).getByRole("slider").fill("25");
  await expect.poll(() => new URL(page.url()).searchParams.get("layers"))
    .toBe("jwst-miri:25,hubble-optical:40,vista-infrared");
  // Back to the opening set: the parameter goes away.
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("layers")).toBe(null);
  expect(errors).toEqual([]);
});

test("guided tour steps through stops, each a scene of layers", async ({ page }) => {
  await page.goto("./?debug=1");
  await waitForApp(page);
  await page.getByRole("button", { name: /Take the guided tour/ }).click();
  await expect(page.locator(".tour-label")).toContainText("1 of 9");
  await expect.poll(() => shownNames(page), { timeout: 15_000 }).toEqual(["Matt Harbison - HA-LRGB"]);
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.locator(".tour-label")).toContainText("2 of 9");
  await expect.poll(() => shownNames(page), { timeout: 15_000 }).toEqual(["ESO/VST - Optical", "Matt Harbison - HA-LRGB"]);
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
    await expect(page.locator(".description-panel")).toBeVisible();
    await page.waitForTimeout(400);
    const boxes = await page.evaluate(() => {
      const r = (sel: string) => {
        const b = document.querySelector(sel)?.getBoundingClientRect();
        return b ? { sel, l: b.left, r: b.right, t: b.top, b: b.bottom } : null;
      };
      return [r(".description-panel"), r(".layer-panel"), r(".top-left-controls")].filter(Boolean);
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
