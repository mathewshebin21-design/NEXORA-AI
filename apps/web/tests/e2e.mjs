/**
 * Browser smoke + accessibility run over every preview route.
 *
 *   BASE_URL=http://localhost:3000 node tests/e2e.mjs [--shots dir]
 *
 * For each route at desktop (1440) and mobile (390) widths:
 *  - page responds 200 and renders its <main> landmark
 *  - no uncaught page errors or console errors
 *  - axe-core reports no "critical" or "serious" violations
 *  - mobile layout has no horizontal overflow
 * Plus interaction checks for each concept's navigation and preview states.
 */
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = createRequire(path.join(process.env.NODE_PATH ?? "/usr/lib/node_modules", "x"))("playwright"); }
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const shotsIdx = process.argv.indexOf("--shots");
const SHOTS = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const screens = {
  atelier: ["today", "research", "campaigns", "creative", "audiences", "journeys", "performance", "attribution", "counsel", "editions", "house"],
  growth: ["overview", "market", "planner", "creative", "segments", "journeys", "performance", "attribution", "insights", "reports", "settings"],
  command: ["bridge", "recon", "missions", "forge", "cohorts", "journeys", "telemetry", "attribution", "copilot", "dispatch", "systems"],
};
const bases = { atelier: "/atelier/studio", growth: "/growth/app", command: "/command/ops" };
const routes = ["/", "/atelier", "/growth", "/command", ...Object.entries(screens).flatMap(([k, xs]) => xs.map((s) => `${bases[k]}/${s}`))];

const results = [];
const fail = (route, vp, msg) => results.push({ route, vp, ok: false, msg });
const pass = (route, vp, msg = "ok") => results.push({ route, vp, ok: true, msg });

const browser = await playwright.chromium.launch();
for (const vp of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const route of routes) {
    const errors = [];
    const onErr = (e) => errors.push(e.message);
    const onConsole = (m) => m.type() === "error" && errors.push(m.text());
    page.on("pageerror", onErr);
    page.on("console", onConsole);
    try {
      const res = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
      if (!res || res.status() !== 200) throw new Error(`HTTP ${res?.status()}`);
      await page.waitForTimeout(900); // allow simulated first load to settle
      if ((await page.locator("main").count()) === 0) throw new Error("no <main> landmark");
      await page.addScriptTag({ content: axeSource });
      const axe = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const r = await axe.run(document, { resultTypes: ["violations"], rules: { "color-contrast": { enabled: true } } });
        return r.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}(${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" , ")}`);
      });
      if (vp.name === "mobile") {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) errors.push(`horizontal overflow ${overflow}px`);
      }
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${route.replace(/\//g, "_") || "_root"}-${vp.name}.png`), fullPage: true });
      if (errors.length) fail(route, vp.name, errors.join(" | "));
      else if (axe.length) fail(route, vp.name, "axe: " + axe.join("; "));
      else pass(route, vp.name);
    } catch (e) {
      fail(route, vp.name, e.message);
    }
    page.off("pageerror", onErr);
    page.off("console", onConsole);
  }
  await ctx.close();
}

/* ------------------------------------------------------- Interactions */
async function interaction(name, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try { await fn(page); pass(name, "interaction"); } catch (e) { fail(name, "interaction", e.message); }
  await ctx.close();
}

await interaction("atelier: nav + error state + retry", async (p) => {
  await p.goto(BASE + "/atelier/studio/today", { waitUntil: "networkidle" });
  await p.getByRole("link", { name: "Attribution", exact: true }).first().click();
  await p.waitForURL("**/atelier/studio/attribution");
  await p.getByRole("radio", { name: "Error" }).first().click();
  await p.getByRole("alert").first().waitFor();
  await p.getByRole("button", { name: /try again/i }).first().click();
  await p.getByText(/Reconciled:/).waitFor({ timeout: 5000 });
});

await interaction("atelier: approval blocked by failing claim", async (p) => {
  await p.goto(BASE + "/atelier/studio/creative", { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await p.getByRole("button", { name: /Cookware — search landing page/ }).click();
  const approve = p.getByRole("dialog").getByRole("button", { name: /approve/i });
  if (!(await approve.isDisabled())) throw new Error("approve should be disabled");
});

await interaction("growth: command palette navigates", async (p) => {
  await p.goto(BASE + "/growth/app/overview", { waitUntil: "networkidle" });
  await p.keyboard.press("Control+k");
  await p.getByRole("dialog", { name: "Command palette" }).waitFor();
  await p.keyboard.type("Attribution");
  await p.keyboard.press("Enter");
  await p.waitForURL("**/growth/app/attribution");
});

await interaction("growth: scenario slider changes projection", async (p) => {
  await p.goto(BASE + "/growth/app/planner", { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  const before = await p.getByText(/^vs baseline$/).locator("..").innerText();
  await p.getByLabel("Paid Social").fill("150");
  const after = await p.getByText(/^vs baseline$/).locator("..").innerText();
  if (before === after) throw new Error("projection did not change");
});

await interaction("command: copilot answers with citations", async (p) => {
  await p.goto(BASE + "/command/ops/copilot", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Which channels have the strongest measured returns?" }).click();
  await p.getByText("Analysis").first().waitFor({ timeout: 6000 });
  await p.getByText("CMP-1007").first().waitFor();
});

await interaction("command: launch locked until gates cleared", async (p) => {
  await p.goto(BASE + "/command/ops/missions", { waitUntil: "networkidle" });
  const btn = p.getByRole("button", { name: /gates open/ });
  if (!(await btn.isDisabled())) throw new Error("launch should be locked");
  for (const label of ["Shipping cut-off confirmed by ops", "Measurement plan: holdout region agreed", "Budget approval (Finance)"]) await p.getByRole("button", { name: label }).click();
  await p.getByRole("button", { name: /Prepare launch package/ }).waitFor();
});

await browser.close();

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  [${r.vp}] ${r.route}${r.ok ? "" : "  → " + r.msg}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
