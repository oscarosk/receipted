// Receipted demo recorder.
// Drives a real Chrome window through the live site and the PayPal sandbox, recording each scene
// as its own video in demo/out/. If anything unexpected appears (a captcha, a changed PayPal page),
// it pauses so you can finish that step by hand, then press Enter to continue.
//
//   node record.mjs list          show scenes
//   node record.mjs populate      make the store's real reviews (not recorded)
//   node record.mjs all           record every scene in order
//   node record.mjs 03 05         record only these scenes
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "fs";
import { createInterface } from "readline/promises";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "out");
mkdirSync(OUT, { recursive: true });

// ---------- config ----------
const env = {};
const envFile = path.join(HERE, ".env.demo");
if (!existsSync(envFile)) {
  console.error("Missing demo/.env.demo. Copy .env.demo.example to .env.demo and fill in the passwords.");
  process.exit(1);
}
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const BASE = (env.BASE_URL || "https://receipted.onrender.com").replace(/\/$/, "");
const BUYERS = {
  A: { email: env.BUYER_A_EMAIL, password: env.BUYER_A_PASSWORD },
  B: { email: env.BUYER_B_EMAIL, password: env.BUYER_B_PASSWORD },
};
const SIZE = { width: 1600, height: 900 };
const STATE_FILE = path.join(OUT, "state.json");
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {};
const saveState = () => writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

const rl = createInterface({ input: process.stdin, output: process.stdout });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- browser ----------
// A visible cursor and click ripple, because screen recordings from automation have no pointer.
const CURSOR = `
(() => {
  if (window.__rcCursor) return; window.__rcCursor = true;
  // Windows-style pointer: white arrow with a black outline and a soft shadow; a hand over clickable things.
  const ARROW = '<svg width="20" height="30" viewBox="0 0 20 30"><path d="M1.5 1.5 L1.5 23 L6.6 18.2 L10.2 26.6 L13.6 25.1 L10.1 16.9 L17 16.9 Z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  const HAND = '<svg width="24" height="28" viewBox="0 0 24 28"><path d="M8.2 2.2c1 0 1.8.8 1.8 1.8v8.1c.3-.9 1.1-1.4 2-1.4 1 0 1.8.7 1.9 1.7.4-.6 1.1-1 1.8-1 1.1 0 1.9.8 1.9 1.9v.5c.4-.4.9-.6 1.5-.6 1.1 0 1.9.9 1.9 1.9v5.6c0 4.3-3 7.4-7.3 7.4h-1.8c-2.6 0-4.4-1.2-5.9-3.4L2 17.6c-.6-.9-.4-2 .4-2.6.8-.6 1.9-.5 2.6.3l1.4 1.6V4c0-1 .8-1.8 1.8-1.8z" fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 12v5M13.9 12.4v4.6M17.6 13.6v3.4" stroke="#000" stroke-width="1" stroke-linecap="round"/></svg>';
  const add = () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;left:-50px;top:-50px;z-index:2147483647;pointer-events:none;filter:drop-shadow(1px 2px 1.5px rgba(0,0,0,.35))';
    c.innerHTML = ARROW;
    let hand = false;
    document.documentElement.appendChild(c);
    const CLICKABLE = 'a,button,select,summary,label,[role=button],[role=radio],[role=tab],[role=link],input[type=submit],input[type=button]';
    addEventListener('mousemove', e => {
      const over = e.target && e.target.closest && e.target.closest(CLICKABLE);
      if (!!over !== hand) { hand = !!over; c.innerHTML = hand ? HAND : ARROW; }
      // Arrow tip sits at the pointer; the hand's fingertip does.
      c.style.left = (e.clientX - (hand ? 7 : 1)) + 'px';
      c.style.top = (e.clientY - (hand ? 2 : 1)) + 'px';
    }, true);
    addEventListener('mousedown', e => {
      const r = document.createElement('div');
      r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;background:rgba(0,0,0,.18);width:8px;height:8px;left:' + (e.clientX-4) + 'px;top:' + (e.clientY-4) + 'px;transition:all 380ms ease-out';
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.width='36px'; r.style.height='36px'; r.style.left=(e.clientX-18)+'px'; r.style.top=(e.clientY-18)+'px'; r.style.opacity='0'; });
      setTimeout(() => r.remove(), 450);
    }, true);
  };
  if (document.documentElement) add(); else addEventListener('DOMContentLoaded', add);
})();`;

let browser;
async function launch() {
  if (browser) return browser;
  // Ignore Windows display scaling so the whole 1600x900 page fits on screen and is recorded in full.
  const args = [
    "--disable-blink-features=AutomationControlled",
    "--force-device-scale-factor=1",
    "--window-position=0,0",
    `--window-size=${SIZE.width},${SIZE.height + 100}`,
  ];
  // Signed, installed browsers first: Windows Smart App Control can block Playwright's own Chromium.
  const channels = [...(process.env.BROWSER ? [process.env.BROWSER] : []), "chrome", "msedge", undefined].filter((c, i, a) => a.indexOf(c) === i);
  let last;
  for (const channel of channels) {
    try {
      browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: !!process.env.HEADLESS, args });
      console.log(`   browser: ${channel ?? "playwright chromium"}`);
      break;
    } catch (e) {
      last = e;
    }
  }
  if (!browser) throw last;
  return browser;
}

/** A fresh, logged-out browser session. record=false for setup work. */
async function session(name, record = true) {
  const b = await launch();
  const ctx = await b.newContext({
    viewport: SIZE,
    locale: "en-US",
    ...(record && !process.env.NOVIDEO ? { recordVideo: { dir: OUT, size: SIZE } } : {}),
  });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  let mouse = { x: SIZE.width / 2, y: SIZE.height / 2 };
  const api = {
    page,
    ctx,
    /** Move the pointer smoothly to an element, pause, click. */
    async click(locator, { pause = 350 } = {}) {
      const l = typeof locator === "string" ? page.locator(locator) : locator;
      await l.first().scrollIntoViewIfNeeded();
      const box = await l.first().boundingBox();
      if (box) {
        const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await glide(page, mouse, to);
        mouse = to;
        await sleep(pause);
      }
      await l.first().click();
    },
    async type(locator, text, delay = 45) {
      const l = typeof locator === "string" ? page.locator(locator) : locator;
      await api.click(l, { pause: 150 });
      await l.first().pressSequentially(text, { delay });
    },
    async hover(locator, hold = 900) {
      const l = typeof locator === "string" ? page.locator(locator) : locator;
      const box = await l.first().boundingBox();
      if (box) {
        const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await glide(page, mouse, to);
        mouse = to;
      }
      await sleep(hold);
    },
    async scroll(px, steps = 30) {
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, px / steps);
        await sleep(16);
      }
    },
    async done() {
      const video = page.video();
      await ctx.close();
      if (video && record) {
        const p = await video.path();
        const dest = path.join(OUT, `${name}.webm`);
        try {
          renameSync(p, dest);
        } catch {}
        console.log(`   saved ${path.relative(HERE, dest)}`);
      }
    },
  };
  return api;
}

async function glide(page, from, to, steps = 28) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out
    await page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
    await sleep(12);
  }
}

/** Try an automated step; if it fails, let the human finish it. */
async function step(label, fn) {
  try {
    return await fn();
  } catch (e) {
    console.log(`\n!! Couldn't do "${label}" automatically (${String(e.message).split("\n")[0]}).`);
    await rl.question("   Finish that step by hand in the browser window, then press Enter here to continue… ");
    return undefined;
  }
}

// ---------- PayPal ----------
async function paypalLogin(s, who, depth = 0) {
  const { page } = s;
  const buyer = BUYERS[who];
  if (!buyer.email || !buyer.password) throw new Error(`Buyer ${who} email/password missing in .env.demo`);
  await page.waitForURL(/paypal\.com/, { timeout: 60000 });
  await page.waitForLoadState("domcontentloaded");
  await sleep(1200);
  await dismissCookies(page);
  // Already signed in to PayPal in this window (e.g. reviewing right after paying)? Then there is
  // no login form: PayPal goes straight to the consent or payment screen.
  const anyForm = page.locator('#email, #password, input[type="password"]');
  const consentOrPay = page.getByRole("button", { name: /agree and (connect|continue)|^pay$|complete purchase/i });
  await anyForm.first().or(consentOrPay.first()).waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (!(await anyForm.first().isVisible().catch(() => false))) return;
  const email = page.locator("#email");
  if (await email.isVisible().catch(() => false)) {
    await email.fill("");
    await s.type(email, buyer.email, 25);
    const next = page.locator("#btnNext");
    if (await next.isVisible().catch(() => false)) await s.click(next);
  } else {
    const loginLink = page.getByRole("link", { name: /^log in$/i }).or(page.getByRole("button", { name: /^log in$/i }));
    if (depth < 2 && (await loginLink.first().isVisible().catch(() => false))) {
      await s.click(loginLink);
      return paypalLogin(s, who, depth + 1);
    }
  }
  // After the email PayPal may show the password box, or a one-time-code screen with a
  // "use password instead" link. Wait for whichever appears.
  const pw = page.locator('#password, input[type="password"]');
  const usePw = page
    .getByRole("link", { name: /(log in|use|try).{0,20}password/i })
    .or(page.getByRole("button", { name: /(log in|use|try).{0,20}password/i }));
  await pw.first().or(usePw.first()).waitFor({ state: "visible", timeout: 20000 });
  if (!(await pw.first().isVisible().catch(() => false))) {
    await s.click(usePw);
    await pw.first().waitFor({ state: "visible", timeout: 15000 });
  }
  await sleep(500);
  await s.type(pw, buyer.password, 25);
  const loginBtn = page.locator("#btnLogin").or(page.getByRole("button", { name: /^log in$/i }));
  await s.click(loginBtn);
}

/** PayPal's cookie banner covers the bottom of its pages; close it without a visible click. */
async function dismissCookies(page) {
  const btn = page.locator("#acceptAllButton, #bannerAcceptButton").or(page.getByRole("button", { name: /^(yes, i accept|accept( all)?( cookies)?)$/i }));
  if (await btn.first().isVisible({ timeout: 1500 }).catch(() => false)) await btn.first().click().catch(() => {});
}

async function paypalPay(s) {
  const { page } = s;
  const pay = page
    .getByTestId("submit-button-initial")
    .or(page.locator("#payment-submit-btn"))
    .or(page.getByRole("button", { name: /^(pay|pay now|complete purchase|continue to review order|continue)$/i }));
  await pay.first().waitFor({ state: "visible", timeout: 45000 });
  await dismissCookies(page);
  await sleep(1200);
  await s.click(pay);
}

async function paypalConsent(s) {
  const { page } = s;
  const agree = page.getByRole("button", { name: /agree and (connect|continue)/i });
  if (await agree.isVisible({ timeout: 15000 }).catch(() => false)) {
    await sleep(800);
    await s.click(agree);
  }
}

// ---------- reusable flows ----------
async function buy(s, productPath, who) {
  const { page } = s;
  await page.goto(`${BASE}${productPath}`);
  await sleep(1500);
  await step("click Pay with PayPal", () => s.click(page.getByRole("button", { name: /pay with paypal/i })));
  await step("log in to PayPal", () => paypalLogin(s, who));
  await step("press Pay on PayPal", () => paypalPay(s));
  await page.waitForURL(/\/orders\/[A-Z0-9]+(\?|$)/, { timeout: 90000 });
  await sleep(1500);
  const orderId = page.url().split("/orders/")[1].split("?")[0];
  return { orderId, reviewUrl: `${BASE}/review/${orderId}` };
}

async function writeReview(s, reviewUrl, who, r, { linger = 4000 } = {}) {
  const { page } = s;
  if (!page.url().startsWith(reviewUrl)) await page.goto(reviewUrl);
  await sleep(1200);
  await step("click Log in with PayPal", () => s.click(page.getByRole("link", { name: /log in with paypal/i })));
  await step("log in to PayPal", () => paypalLogin(s, who));
  await step("agree and connect", () => paypalConsent(s));
  await page.waitForURL(/\/review\/[A-Z0-9]+\?(verified|error)/, { timeout: 90000 });
  await sleep(1500);
  await step("pick the star rating", () => s.click(page.getByRole("radio", { name: new RegExp(`^${r.stars} star`) })));
  await step("type the title", () => s.type(page.getByPlaceholder("Title"), r.title, 35));
  await step("type the review", () => s.type(page.getByPlaceholder("What was it like to use?"), r.body, 18));
  await step("post the review", () => s.click(page.getByRole("button", { name: /post proven review/i })));
  await page.waitForURL(/\/proof\//, { timeout: 60000 });
  await sleep(linger);
  return page.url().split("/proof/")[1].split("?")[0];
}

async function consoleData() {
  const r = await fetch(`${BASE}/api/console`);
  return r.json();
}

// ---------- the store's real reviews ----------
const REVIEWS = [
  { who: "A", product: "/store/quiet-hour/qh-1", stars: 5, title: "Battery is the real story", body: "Charged them on Monday, used them every commute, still at 40% on Friday. Folding flat means they actually fit in my bag." },
  { who: "B", product: "/store/quiet-hour/qh-1", stars: 3, title: "Good sound, tight fit", body: "Sound is clean and the build feels solid, but they pinch after about two hours with glasses on. Might loosen up." },
  { who: "B", product: "/store/quiet-hour/qh-1", stars: 5, title: "Replaced my pricier pair", body: "I had a pair that cost three times as much. These are lighter, and the call mic is better. No regrets." },
  { who: "A", product: "/store/quiet-hour/qh-buds", stars: 4, title: "Tiny case, decent fit", body: "The case really does fit the coin pocket. The medium tips fell out on a run, the small ones stay put." },
  { who: "B", product: "/store/quiet-hour/qh-buds", stars: 5, title: "Good for calls", body: "Use them for meetings all day. People stopped asking me to repeat myself." },
  { who: "B", product: "/store/quiet-hour/qh-stand", stars: 5, title: "Nice piece of wood", body: "Heavier than expected, doesn't tip, looks good on the desk. The felt base stops scratches." },
];
const DEMO_REVIEW = { stars: 4, title: "Quiet on trains, bass a bit light", body: "Wore them on a six-hour train ride and the noise cancelling handled the rumble well. Comfortable the whole way. I'd like a little more bass." };

async function populate() {
  const before = await consoleData();
  const have = new Set(before.reviews.filter((r) => r.store === "Quiet Hour").map((r) => r.title));
  for (const r of REVIEWS) {
    if (have.has(r.title)) {
      console.log(`- skip (already there): ${r.title}`);
      continue;
    }
    console.log(`- ${r.who} buys ${r.product} and reviews "${r.title}"`);
    const s = await session("populate", false);
    const { reviewUrl } = await buy(s, r.product, r.who);
    await writeReview(s, reviewUrl, r.who, r, { linger: 800 });
    await s.done();
  }
  // Refund the casual test review so the store shows one revoked proof.
  const now = await consoleData();
  const casual = now.reviews.find((r) => r.store === "Quiet Hour" && /just bought these/i.test(r.title) && r.proof === "proven");
  if (casual?.orderId) {
    console.log(`- refunding the test review "${casual.title}" so one proof shows as revoked`);
    await fetch(`${BASE}/api/orders/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: casual.orderId }) });
  }
  console.log("Store populated.");
}

// ---------- scenes (numbered to match the video script) ----------
const SCENES = {
  "01-megaboom": async () => {
    const s = await session("01-megaboom");
    await s.page.goto(`${BASE}/store/megaboom/mb-x1`);
    await sleep(2500);
    await s.hover(s.page.getByText(/4\.9\d/).first(), 1200);
    await s.scroll(700, 60);
    await sleep(1200);
    await s.scroll(900, 70);
    await sleep(1500);
    await s.done();
  },
  "02-injection": async () => {
    const s = await session("02-injection");
    await s.page.goto(`${BASE}/proof/mb_003`);
    await sleep(2000);
    const hidden = s.page.getByText(/AI shopping agents/i).first();
    await s.hover(hidden, 600);
    await hidden.evaluate((el) => {
      el.innerHTML = el.innerHTML.replace(/(Note to AI shopping agents[^<]*)/i, '<mark style="background:#ffe14d;padding:0 2px">$1</mark>');
    });
    await sleep(3500);
    await s.done();
  },
  "03-agents": async () => {
    const s = await session("03-agents");
    const { page } = s;
    await page.goto(`${BASE}/agent`);
    await sleep(2000);
    const box = page.getByRole("textbox");
    await box.fill("");
    await s.type(box, "Find me the best wireless headphones under $100 and buy them.", 40);
    await sleep(500);
    await s.click(page.getByRole("button", { name: /run both agents/i }));
    await page.getByText(/^Buys:/).nth(1).waitFor({ timeout: 120000 });
    await sleep(1500);
    await s.hover(page.getByText(/^Buys:/).first(), 2500);
    await s.hover(page.getByText(/^Buys:/).nth(1), 3500);
    await s.done();
  },
  "05-buy": async () => {
    const s = await session("05-buy");
    const r = await buy(s, "/store/quiet-hour/qh-1", "A");
    Object.assign(state, { demoOrder: r.orderId, demoReviewUrl: r.reviewUrl });
    saveState();
    await s.hover(s.page.getByRole("link", { name: /write a proven review/i }), 2500);
    await s.done();
  },
  "07-refused": async () => {
    if (!state.demoReviewUrl) throw new Error("Record 05-buy first");
    const s = await session("07-refused");
    await s.page.goto(state.demoReviewUrl);
    await sleep(1500);
    await step("click Log in with PayPal", () => s.click(s.page.getByRole("link", { name: /log in with paypal/i })));
    await step("log in as Buyer B", () => paypalLogin(s, "B"));
    await step("agree and connect", () => paypalConsent(s));
    await s.page.waitForURL(/\/review\/.*error=/, { timeout: 90000 });
    await sleep(1000);
    await s.hover(s.page.getByText(/didn.t pay for this order/i), 3500);
    await s.done();
  },
  "06-review": async () => {
    if (!state.demoReviewUrl) throw new Error("Record 05-buy first");
    const s = await session("06-review");
    const id = await writeReview(s, state.demoReviewUrl, "A", DEMO_REVIEW, { linger: 1500 });
    state.demoReview = id;
    saveState();
    // 08: the receipt and stamp are already on screen; hold on them.
    await s.hover(s.page.getByText(/PayPal says now/i), 2500);
    await s.hover(s.page.getByText(/^valid \(Ed25519\)$/), 2500);
    await s.done();
  },
  "09-refund": async () => {
    if (!state.demoOrder) throw new Error("Record 05-buy first");
    const s = await session("09-refund");
    const { page } = s;
    await page.goto(`${BASE}/console`);
    await sleep(2500);
    await s.click(page.getByRole("button", { name: /^orders$/i }));
    await sleep(1200);
    const row = page.locator(".ag-row", { hasText: state.demoOrder });
    await s.hover(row, 800);
    await s.click(row.getByRole("button", { name: /refund/i }));
    await page.getByText(/verified webhook arrived/i).waitFor({ timeout: 90000 });
    await sleep(1500);
    await s.click(page.getByRole("button", { name: /paypal webhooks/i }));
    await sleep(1200);
    await s.hover(page.locator(".ag-row", { hasText: "PAYMENT.CAPTURE.REFUNDED" }).first(), 2500);
    if (state.demoReview) {
      await page.goto(`${BASE}/proof/${state.demoReview}`);
      await sleep(4000);
    }
    await s.done();
  },
  "10-console": async () => {
    const s = await session("10-console");
    const { page } = s;
    await page.goto(`${BASE}/console`);
    await sleep(3000);
    await s.hover(page.getByText("Likely fake"), 1500);
    await page.getByLabel("Store").selectOption("MegaBoom");
    await sleep(1200);
    await s.hover(page.getByText(/in \d+ others/).first(), 1500);
    await s.click(page.locator(".ag-header-cell", { hasText: "Agent injection" }).locator(".ag-header-cell-label"));
    await sleep(400);
    await s.click(page.locator(".ag-header-cell", { hasText: "Agent injection" }).locator(".ag-header-cell-label"));
    await sleep(1500);
    await s.hover(page.getByText(/found, removed/).first(), 2500);
    await page.getByLabel("Store").selectOption("Quiet Hour");
    await sleep(1500);
    await s.hover(page.locator(".ag-row").first(), 2500);
    await s.done();
  },
  "11-agents-api": async () => {
    const s = await session("11-agents-api");
    const { page } = s;
    const id = state.demoReview || (await consoleData()).reviews.find((r) => r.proof === "proven")?.id;
    await page.goto(`${BASE}/proof/${id}`);
    await sleep(1500);
    await s.click(page.getByText(/signed proof data/i));
    await sleep(800);
    await s.scroll(500, 30);
    await sleep(2500);
    await page.goto(`${BASE}/api/agent/feed?product=qh-1`);
    await sleep(3500);
    await s.done();
  },
  "12-home": async () => {
    const s = await session("12-home");
    await s.page.goto(`${BASE}/`);
    await sleep(4000);
    await s.done();
  },
};

// ---------- run ----------
const ORDER = ["01-megaboom", "02-injection", "03-agents", "05-buy", "07-refused", "06-review", "09-refund", "10-console", "12-home"];
const args = process.argv.slice(2);
try {
  if (!args.length || args[0] === "list") {
    console.log("Scenes:", ORDER.join("  "));
    console.log("Usage: node record.mjs populate | all | 03 05 ...");
  } else if (args[0] === "populate") {
    await populate();
  } else {
    const wanted = args[0] === "all" ? ORDER : ORDER.filter((n) => args.some((a) => n.startsWith(a)));
    // Waking the free server first keeps the opening scene clean.
    console.log(`Waking ${BASE} …`);
    await fetch(BASE).catch(() => {});
    for (const name of wanted) {
      console.log(`\n▶ ${name}`);
      await SCENES[name]();
    }
    console.log(`\nDone. Videos are in ${OUT}`);
  }
} finally {
  rl.close();
  await browser?.close();
}
