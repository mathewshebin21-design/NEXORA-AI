/**
 * End-to-end product flow against a running web app + API + PostgreSQL.
 *
 *   BASE_URL=http://localhost:3000 node tests/product-e2e.mjs
 *
 * Covers: sign-up → demo workspace → create client workspace → project → API key (used via /v1) →
 * invitation → invitee accepts with a new account → role-scoped access → audit trail → export →
 * workspace deletion → sign-out / sign-in, with axe-core checks and a mobile overflow check per page.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = createRequire(path.join(process.env.NODE_PATH ?? "/usr/lib/node_modules", "x"))("playwright"); }
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const RUN = Date.now().toString(36);
const OWNER = { name: "Priya Natarajan", email: `owner-${RUN}@halcyon.example`, org: `Halcyon ${RUN}`, password: "correct horse battery staple" };
const MEMBER = { name: "Sam Whitford", email: `sam-${RUN}@client.example`, password: "another long passphrase" };

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push({ ok: true, name }); } catch (e) { results.push({ ok: false, name, msg: e.message.split("\n")[0] }); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function axe(page, label) {
  await page.addScriptTag({ content: axeSource });
  const v = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { resultTypes: ["violations"] });
    return r.violations.filter((x) => x.impact === "critical" || x.impact === "serious").map((x) => `${x.id}: ${x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}`);
  });
  assert(v.length === 0, `${label} axe → ${v.join(" | ")}`);
}

const browser = await playwright.chromium.launch();
const errors = [];
const owner = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const op = await owner.newPage();
op.on("pageerror", (e) => errors.push(`owner: ${e.message}`));
op.on("dialog", (d) => d.accept());
let orgId, demoWs, alphaWs, apiKey, inviteLink;

await check("signup creates org and lands on demo workspace", async () => {
  await op.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await axe(op, "signup");
  await op.getByLabel("Your name").fill(OWNER.name);
  await op.getByLabel("Work email").fill(OWNER.email);
  await op.getByLabel("Agency / organisation name").fill(OWNER.org);
  await op.getByLabel("Password").fill(OWNER.password);
  await op.getByRole("button", { name: "Create account" }).click();
  await op.waitForURL(/\/app\/[^/]+\/w\/[^/]+\/overview$/, { timeout: 20000 });
  [, orgId, demoWs] = /\/app\/([^/]+)\/w\/([^/]+)\//.exec(op.url());
  await op.getByText(/Demo workspace · all figures are synthetic/).waitFor();
  await op.getByText("Revenue, spend & 30-day projection").waitFor();
  await axe(op, "demo overview");
});

await check("create a client workspace and land on its settings", async () => {
  await op.goto(`${BASE}/app/${orgId}/org/organization`, { waitUntil: "networkidle" });
  await op.getByLabel("New client workspace").fill("Client Alpha");
  await op.getByRole("button", { name: "Create", exact: true }).click();
  await op.waitForURL(/\/w\/[^/]+\/settings$/);
  alphaWs = /\/w\/([^/]+)\/settings/.exec(op.url())[1];
  await op.getByRole("heading", { name: "Workspace settings" }).waitFor();
  await axe(op, "workspace settings");
});

await check("non-demo analytics screens show an honest empty state", async () => {
  await op.goto(`${BASE}/app/${orgId}/w/${alphaWs}/overview`, { waitUntil: "networkidle" });
  await op.getByText("No data connected yet").waitFor();
  await op.getByRole("link", { name: "Connect data sources" }).waitFor();
  assert(!(await op.getByText("Demo workspace · all figures").count()), "demo banner should not show on a real workspace");
  await axe(op, "empty overview");
});

await check("workspace settings save and validation", async () => {
  await op.goto(`${BASE}/app/${orgId}/w/${alphaWs}/settings`, { waitUntil: "networkidle" });
  await op.getByLabel("Reporting currency").fill("EU");
  await op.getByRole("button", { name: "Save changes" }).click();
  await op.getByRole("alert").first().waitFor();
  await op.getByLabel("Reporting currency").fill("EUR");
  await op.getByRole("button", { name: "Save changes" }).click();
  await op.getByText("Settings saved.").waitFor();
});

await check("projects: create and list", async () => {
  await op.goto(`${BASE}/app/${orgId}/w/${alphaWs}/projects`, { waitUntil: "networkidle" });
  await op.getByLabel("Name").fill("Q4 launch");
  await op.getByRole("button", { name: "Create project" }).click();
  await op.getByText("Q4 launch").first().waitFor();
  await axe(op, "projects");
});

await check("data sources: sample connectors sync with lineage", async () => {
  await op.goto(`${BASE}/app/${orgId}/w/${alphaWs}/data`, { waitUntil: "networkidle" });
  await op.getByRole("heading", { name: "Data sources" }).waitFor();
  const gads = op.getByRole("region", { name: "Google Ads" });
  assert(await gads.getByRole("button", { name: "Connect account" }).isDisabled(), "live connect disabled without OAuth config");
  await gads.getByText(/Live connection unavailable/).waitFor();
  await gads.getByRole("button", { name: "Use sample data" }).click();
  const shop = op.getByRole("region", { name: "Shopify" });
  await shop.getByRole("button", { name: "Use sample data" }).click();
  await gads.getByText("succeeded").waitFor({ timeout: 30000 });
  await shop.getByText("succeeded").waitFor({ timeout: 30000 });
  await op.getByText("All data in this workspace is synthetic sample data").waitFor();
  await op.getByText("synthetic").first().waitFor();
  await gads.getByRole("button", { name: /Sync now/ }).click();
  await op.waitForFunction(() => document.querySelectorAll("table")[0]?.innerText.match(/succeeded/g)?.length >= 2, null, { timeout: 30000 });
  await axe(op, "data sources");
  await op.goto(`${BASE}/app/${orgId}/w/${alphaWs}/overview`, { waitUntil: "networkidle" });
  await op.getByText("Data connected — analysis coming next").waitFor();
});

await check("API key is shown once and works against /v1", async () => {
  await op.goto(`${BASE}/app/${orgId}/w/${alphaWs}/settings`, { waitUntil: "networkidle" });
  await op.getByRole("radio", { name: "API keys" }).click();
  await op.getByLabel("Name").fill("Reporting connector");
  await op.getByLabel(/Read projects/).check();
  await op.getByRole("button", { name: "Create key" }).click();
  apiKey = (await op.getByTestId("new-api-key").innerText()).trim();
  assert(apiKey.startsWith("nxk_"), "key format");
  const res = await fetch(`${BASE}/api/v1/projects`, { headers: { Authorization: `Bearer ${apiKey}` } });
  assert(res.status === 200, `v1 status ${res.status}`);
  const names = (await res.json()).map((p) => p.name);
  assert(names.includes("Q4 launch"), "v1 lists the project");
  await op.getByRole("button", { name: "Done" }).click();
  assert(!(await op.getByText(apiKey).count()), "key must not be shown again");
});

await check("invite a client viewer to Client Alpha", async () => {
  await op.goto(`${BASE}/app/${orgId}/org/members`, { waitUntil: "networkidle" });
  await axe(op, "members");
  await op.getByLabel("Email").fill(MEMBER.email);
  await op.getByLabel("Client workspace").selectOption({ label: "Client Alpha" });
  await op.getByLabel("Workspace role").selectOption("client_viewer");
  await op.getByRole("button", { name: "Create invitation" }).click();
  inviteLink = (await op.getByTestId("invite-link").innerText()).trim();
  assert(inviteLink.includes("/invite/"), "invite link");
});

const member = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const mp = await member.newPage();
mp.on("pageerror", (e) => errors.push(`member: ${e.message}`));

await check("invitee accepts with a new account and sees only the assigned workspace", async () => {
  await mp.goto(inviteLink.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle" });
  await mp.getByRole("heading", { name: `Join ${OWNER.org}` }).waitFor();
  await axe(mp, "invite");
  await mp.getByLabel("Your name").fill(MEMBER.name);
  await mp.getByLabel("Choose a password").fill(MEMBER.password);
  await mp.getByRole("button", { name: "Accept invitation" }).click();
  await mp.waitForURL(/\/w\/[^/]+\/overview$/, { timeout: 20000 });
  assert(mp.url().includes(alphaWs), "lands in Client Alpha");
  const visible = await mp.evaluate(async (o) => (await (await fetch(`/api/orgs/${o}/workspaces`)).json()).map((w) => w.name), orgId);
  assert(visible.length === 1 && visible[0] === "Client Alpha", `visible workspaces: ${visible}`);
  assert((await mp.getByRole("link", { name: "Projects", exact: true }).count()) === 0, "projects nav hidden for client viewer");
  assert((await mp.getByRole("link", { name: "Data sources" }).count()) === 0, "data sources nav hidden for client viewer");
});

await check("client viewer is blocked from the demo workspace and from writes", async () => {
  await mp.goto(`${BASE}/app/${orgId}/w/${demoWs}/overview`, { waitUntil: "networkidle" });
  await mp.getByText(/doesn’t exist or you don’t have access/).waitFor();
  const status = await mp.evaluate(async ([o, w]) => (await fetch(`/api/orgs/${o}/workspaces/${w}/projects`, { method: "POST", headers: { "Content-Type": "application/json", "X-Nexora-CSRF": "1" }, body: JSON.stringify({ name: "x" }) })).status, [orgId, alphaWs]);
  assert(status === 403, `write status ${status}`);
});

await check("audit log records the flow", async () => {
  await op.goto(`${BASE}/app/${orgId}/org/audit`, { waitUntil: "networkidle" });
  await op.getByText("invitation.accepted", { exact: true }).first().waitFor({ timeout: 8000 });
  const shown = await op.locator("table").first().innerText();
  const missing = ["invitation.accepted", "invitation.created", "api_key.created", "sync.succeeded", "connection.created", "project.created", "workspace.updated", "workspace.created", "auth.signup"].filter((a) => !shown.includes(a));
  assert(missing.length === 0, `missing audit actions: ${missing.join(", ")}`);
  await axe(op, "audit");
});

await check("usage, organization and security pages render", async () => {
  for (const tab of ["usage", "organization", "security"]) {
    await op.goto(`${BASE}/app/${orgId}/org/${tab}`, { waitUntil: "networkidle" });
    await op.locator("h1").first().waitFor();
    await axe(op, tab);
  }
  await op.goto(`${BASE}/app/${orgId}/org/usage`, { waitUntil: "networkidle" });
  await op.getByText("Seats").waitFor();
});

await check("workspace export downloads JSON without secrets", async () => {
  await op.goto(`${BASE}/app/${orgId}/w/${alphaWs}/settings`, { waitUntil: "networkidle" });
  await op.getByRole("radio", { name: "Data & deletion" }).click();
  const [dl] = await Promise.all([op.waitForEvent("download"), op.getByRole("button", { name: /Download export/ }).click()]);
  const file = await dl.path();
  const text = readFileSync(file, "utf8");
  const json = JSON.parse(text);
  assert(json.format === "nexora.workspace-export.v1" && json.projects.some((p) => p.name === "Q4 launch"), "export content");
  assert(!text.includes(apiKey) && !text.includes("key_hash"), "no secrets in export");
});

await check("deleting the workspace revokes access and API keys", async () => {
  await op.getByLabel(/Type “Client Alpha” to confirm/).fill("Client Alpha");
  await op.getByRole("button", { name: "Delete workspace" }).click();
  await op.waitForURL(new RegExp(`/app/${orgId}(/w/${demoWs}/overview)?$`), { timeout: 15000 });
  const res = await fetch(`${BASE}/api/v1/projects`, { headers: { Authorization: `Bearer ${apiKey}` } });
  assert(res.status === 401, `revoked key status ${res.status}`);
  await mp.goto(`${BASE}/app/${orgId}`, { waitUntil: "networkidle" });
  await mp.getByText(/don’t have access to any client workspace/).waitFor();
});

await check("sign out, bad password, sign in", async () => {
  await op.goto(`${BASE}/app/${orgId}/org/security`, { waitUntil: "networkidle" });
  await op.getByRole("button", { name: "Sign out" }).first().click();
  await op.waitForURL(/\/login/);
  await axe(op, "login");
  await op.getByLabel("Work email").fill(OWNER.email);
  await op.getByLabel("Password").fill("definitely not it");
  await op.getByRole("button", { name: "Sign in" }).click();
  await op.getByText("Incorrect email or password.").waitFor();
  await op.getByLabel("Password").fill(OWNER.password);
  await op.getByRole("button", { name: "Sign in" }).click();
  await op.waitForURL(/\/app\/.+\/overview$/, { timeout: 15000 });
});

await check("signed-out visitors are redirected to sign-in", async () => {
  const anon = await browser.newContext();
  const p = await anon.newPage();
  await p.goto(`${BASE}/app/${orgId}/org/members`, { waitUntil: "networkidle" });
  await p.waitForURL(/\/login\?next=/);
  await anon.close();
});

await check("mobile layout has no horizontal overflow", async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await owner.storageState() });
  const p = await m.newPage();
  for (const path of [`/app/${orgId}/w/${demoWs}/overview`, `/app/${orgId}/w/${demoWs}/settings`, `/app/${orgId}/org/members`, `/app/${orgId}/org/audit`, "/login"]) {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(over <= 1, `${path} overflows by ${over}px`);
  }
  await m.close();
});

await check("no uncaught page errors", async () => assert(errors.length === 0, errors.join(" | ")));

await browser.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  → " + r.msg}`);
console.log(`\n${results.length - failed.length}/${results.length} product checks passed`);
process.exit(failed.length ? 1 : 0);
