import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  createAssetGate,
  visualState,
  motionInitial,
  motionBrief,
} from "../src/lesson-twenty-eight-content.js";
const out = "/tmp/resource-animation-acceptance",
  key = "frontend-observatory.lesson28.v1",
  prior = Array.from(
    { length: 27 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  asset = JSON.parse(readFileSync("public/lesson28-timeline.json", "utf8"));
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".motion28-lab"),
  model = (p) => p.locator(".motion28-model"),
  player = (p) => p.locator('[data-engine="lottie-web"]'),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十八节学习步骤" })
      .getByRole("button")
      .nth(n);
function save(n, x) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${n}.json`, JSON.stringify(x, null, 2));
}
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(27), "lesson28");
  await expect(p.locator("#motion28-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
}
async function prepared(p) {
  await expect
    .poll(async () => Number(await lab(p).getAttribute("data-prepared")))
    .toBeGreaterThan(0);
}
async function load(p) {
  await btn(p, "加载或重试Lottie").click();
  await prepared(p);
  await btn(p, "应用最早资源结果").click();
  await expect(player(p)).toHaveAttribute("data-ready", "true");
}
async function axeCheck(p) {
  await p.evaluate(axe);
  expect(
    await p.evaluate(async () => {
      const r = await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      }));
    }),
  ).toEqual([]);
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
function instrument() {
  const raf = requestAnimationFrame.bind(window),
    caf = cancelAnimationFrame.bind(window);
  window.motionPending = new Set();
  window.motionTicks = 0;
  window.requestAnimationFrame = (cb) => {
    let id;
    id = raf((t) => {
      window.motionPending.delete(id);
      window.motionTicks++;
      cb(t);
    });
    window.motionPending.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    window.motionPending.delete(id);
    caf(id);
  };
}
test("gate actual prepared packets isolate cancel duplicate and disposal", () => {
  const events = [],
    g = createAssetGate((e) => events.push(e)),
    a = g.start();
  expect(g.deliver()).toBe("preparing");
  g.cancel();
  const b = g.start();
  a.prepare({ id: "old" });
  b.prepare({ id: "new" });
  expect(a.complete()).toBe("stale");
  expect(g.snapshot().status).toBe("loading");
  expect(b.complete()).toBe("success");
  expect(b.complete()).toBe("duplicate");
  const c = g.start();
  g.dispose();
  const count = events.length;
  expect(c.prepare({})).toBe("disposed");
  expect(c.complete()).toBe("disposed");
  expect(events.length).toBe(count);
  expect(g.snapshot()).toMatchObject({ status: "disposed", queued: 0 });
});
test("gate bounds eight packets and repeated begin cannot add duplicates", () => {
  const g = createAssetGate();
  for (let i = 0; i < 8; i++) {
    const a = g.start();
    expect(g.start()).toBeNull();
    a.prepare(null, "failed");
    g.cancel();
  }
  expect(g.start()).toBeNull();
  expect(g.snapshot().queued).toBe(8);
  for (let i = 0; i < 8; i++) expect(g.deliver()).toBe("stale");
  const a = g.start();
  a.prepare(null, "bad");
  expect(g.deliver()).toBe("failure");
  expect(g.deliver()).toBe("empty");
});
test("business visual rules keep boolean degree and trigger responsibilities separate", () => {
  expect(visualState(true, 100)).toBe("处理中");
  expect(visualState(false, 100)).toBe("完成");
  expect(visualState(false, 50)).toBe("进行中");
  expect(visualState(false, 0)).toBe("待机");
  expect(asset.assets).toEqual([]);
  expect(asset.layers).toHaveLength(2);
  expect(asset.fr).toBe(30);
  expect(motionBrief(motionInitial())).toMatch(
    /dotLottie支持状态机.*Data Binding.*legacy/s,
  );
});
test("lazy runtime real original asset and31 preview stay consistent", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lottie_light|lesson28-timeline/.test(u))).toBe(
    false,
  );
  await directory(page);
  expect(urls.some((u) => /lottie_light|lesson28-timeline/.test(u))).toBe(
    false,
  );
  await load(page);
  expect(urls.some((u) => /lottie_light/.test(u))).toBe(true);
  expect(urls.some((u) => /lesson28-timeline/.test(u))).toBe(true);
  expect(urls.every((u) => new URL(u).origin === "http://127.0.0.1:4173")).toBe(
    true,
  );
  expect(urls.some((u) => /\.riv|rive.*wasm|dotlottie.*wasm/.test(u))).toBe(
    false,
  );
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(30).click();
  await expect(
    page.getByRole("heading", { name: "Drag/Drop/Resize", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("real runtime sampling changes actual SVG geometry and resets without CSS animation", async ({
  page,
}, info) => {
  await open(page);
  await load(page);
  const dot = page.locator(
      '.motion28-renderer svg path[fill="rgb(84,61,119)"]',
    ),
    rects = [];
  for (const n of ["0%", "50%", "100%"]) {
    await btn(page, `采样${n}`).click();
    rects.push(await dot.boundingBox());
  }
  expect(rects[1].x).toBeGreaterThan(rects[0].x + 10);
  expect(rects[2].x).toBeGreaterThan(rects[1].x + 10);
  await expect(page.locator(".motion28-renderer")).toHaveAttribute(
    "data-frame",
    "119",
  );
  await btn(page, "重置到首帧").click();
  await expect(page.locator(".motion28-renderer")).toHaveAttribute(
    "data-frame",
    "0",
  );
  expect(await dot.evaluate((e) => e.getAnimations().length)).toBe(0);
  save(`frames-${info.project.name}`, {
    rects,
    engine: "lottie-web5.13.0 SVG",
    asset: "original repository vectors",
  });
});
test("play pause speed and completion are real single timeline controls", async ({
  page,
}) => {
  await open(page);
  await load(page);
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await btn(page, "2倍速度").click();
  await btn(page, "单次播放Lottie").click();
  await btn(page, "单次播放Lottie").click();
  await expect(player(page)).toHaveAttribute("data-playing", "true");
  await expect
    .poll(async () =>
      Number(
        await page.locator(".motion28-renderer").getAttribute("data-frame"),
      ),
    )
    .toBeGreaterThan(5);
  await btn(page, "暂停Lottie").click();
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  const frame = await page
    .locator(".motion28-renderer")
    .getAttribute("data-frame");
  await page.waitForTimeout(100);
  expect(
    await page.locator(".motion28-renderer").getAttribute("data-frame"),
  ).toBe(frame);
  await btn(page, "采样100%").click();
  await btn(page, "单次播放Lottie").click();
  await expect
    .poll(async () =>
      Number(
        await page.locator(".motion28-renderer").getAttribute("data-frame"),
      ),
    )
    .toBeLessThan(119);
  await expect(player(page)).toHaveAttribute("data-playing", "false", {
    timeout: 5000,
  });
  await expect(page.locator(".motion28-status")).toContainText(
    "不代表业务成功",
  );
});
test("reduce switches during playback pause immediately and static sample still works", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await load(page);
  await btn(page, "单次播放Lottie").click();
  await expect(player(page)).toHaveAttribute("data-playing", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab(page)).toHaveAttribute("data-reduced", "true");
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await btn(page, "单次播放Lottie").click();
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await btn(page, "采样50%").click();
  await expect(page.locator(".motion28-renderer")).toHaveAttribute(
    "data-frame",
    "60",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await expect
    .poll(() => page.evaluate(() => window.motionPending.size))
    .toBe(0);
  save(`reduce-${info.project.name}`, {
    frame: 60,
    paused: true,
    noIdleRAF: true,
  });
});
test("boolean numeric and repeated trigger inputs really update independent schematic fields", async ({
  page,
}) => {
  await open(page, 1);
  await btn(page, "切换busy布尔值").click();
  await btn(page, "程度100%").click();
  await expect(model(page)).toHaveAttribute("data-state", "处理中");
  for (let i = 0; i < 3; i++) await btn(page, "触发celebrate一次事件").click();
  await expect(model(page)).toHaveAttribute("data-pulses", "3");
  await expect(model(page)).toHaveAttribute("data-busy", "true");
  await btn(page, "切换busy布尔值").click();
  await expect(model(page)).toHaveAttribute("data-state", "完成");
  await btn(page, "程度50%").click();
  await expect(model(page)).toHaveAttribute("data-state", "进行中");
  await expect(page.locator(".motion28-meter span")).toHaveCSS("width", /px$/);
  await page.getByLabel("amount数值（0–100）", { exact: true }).fill("25");
  await expect(model(page)).toHaveAttribute("data-amount", "25");
  await expect(model(page)).toHaveAttribute("data-pulses", "3");
});
test("business selection alone is not an animation or server result and failure has text recovery", async ({
  page,
}) => {
  await open(page, 1);
  await btn(page, "业务：成功").click();
  await expect(model(page)).toHaveAttribute("data-state", "待机");
  await btn(page, "应用业务到表现的映射").click();
  await expect(model(page)).toHaveAttribute("data-state", "完成");
  await btn(page, "业务：失败").click();
  await btn(page, "应用业务到表现的映射").click();
  await expect(model(page)).toHaveAttribute("data-state", "待机");
  await expect(page.locator(".motion28-business-error")).toContainText(
    "没有真实请求",
  );
  await expect(model(page)).toHaveAttribute("data-pulses", "0");
  await btn(page, "业务：处理中").click();
  await btn(page, "应用业务到表现的映射").click();
  await expect(model(page)).toHaveAttribute("data-state", "处理中");
});
test("failure retry captures next option and accepted resource initializes actual runtime", async ({
  page,
}) => {
  await open(page, 2);
  await btn(page, "下次资源：模拟失败").click();
  await btn(page, "加载或重试Lottie").click();
  await btn(page, "下次资源：正常").click();
  await prepared(page);
  await btn(page, "应用最早资源结果").click();
  await expect(lab(page)).toHaveAttribute("data-status", "failed");
  await expect(page.locator(".motion28-fallback")).toBeVisible();
  await load(page);
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).retrySeen,
      key,
    ),
  ).toBe(true);
});
for (const kind of ["HTTP", "JSON"]) {
  test(`real same-origin ${kind} failure can retry without inventing server success`, async ({
    page,
  }) => {
    let bad = true;
    await page.route("**/lesson28-timeline.json", async (route) => {
      if (!bad) return route.continue();
      await route.fulfill({
        status: kind === "HTTP" ? 503 : 200,
        contentType: "application/json",
        body: kind === "HTTP" ? "unavailable" : "{ broken json",
      });
    });
    await open(page);
    await btn(page, "加载或重试Lottie").click();
    await prepared(page);
    await btn(page, "应用最早资源结果").click();
    await expect(lab(page)).toHaveAttribute("data-status", "failed");
    await expect(player(page).locator("svg")).toHaveCount(0);
    bad = false;
    await load(page);
  });
}
test("cancelled actual delayed fetch cannot overwrite new ready asset; immediate Tab focus remains actionable", async ({
  page,
}, info) => {
  let first = true,
    release;
  const held = new Promise((r) => (release = r));
  await page.route("**/lesson28-timeline.json", async (route) => {
    if (first) {
      first = false;
      await held;
      try {
        await route.fulfill({ json: asset });
      } catch {}
      return;
    }
    await route.fulfill({ json: asset });
  });
  await open(page);
  await btn(page, "加载或重试Lottie").click();
  await btn(page, "加载或重试Lottie").click();
  await expect(page.locator(".motion28-status")).toContainText("重复开始");
  await btn(page, "取消本次资源加载").click();
  await prepared(page);
  await btn(page, "加载或重试Lottie").click();
  await expect(lab(page)).toHaveAttribute("data-queued", "2");
  await expect(lab(page)).toHaveAttribute("data-prepared", "2");
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson28",
      profile: info.project.name,
    });
  await nav.act(btn(page, "应用最早资源结果"), "stale");
  await expect(lab(page)).toHaveAttribute("data-status", "loading");
  await expect(btn(page, "应用最早资源结果")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(player(page)).toHaveAttribute("data-ready", "true");
  await expect(btn(page, "应用最早资源结果")).toBeFocused();
  await expect(btn(page, "应用最早资源结果")).toBeEnabled();
  release();
  await expect(lab(page)).toHaveAttribute("data-queued", "0");
  await page.keyboard.press("Enter");
  await expect(btn(page, "应用最早资源结果")).toBeFocused();
  save(`cancel-${info.project.name}`, {
    trace,
    lateFetchFixture: true,
    ready: true,
    immediateFocus: true,
  });
});
test("manual queue cap8 recovers without timers or uncontrolled growth", async ({
  page,
}) => {
  await open(page, 2);
  await btn(page, "下次资源：模拟失败").click();
  for (let i = 0; i < 8; i++) {
    await btn(page, "加载或重试Lottie").click();
    await btn(page, "取消本次资源加载").click();
  }
  await expect(lab(page)).toHaveAttribute("data-queued", "8");
  await btn(page, "加载或重试Lottie").click();
  await expect(page.locator(".motion28-status")).toContainText("8条上限");
  for (let i = 0; i < 8; i++) await btn(page, "应用最早资源结果").click();
  await expect(lab(page)).toHaveAttribute("data-queued", "0");
  await btn(page, "下次资源：正常").click();
  await load(page);
});
test("leave return refresh and station change clean real animation and preserve scoped config", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await load(page);
  await btn(page, "采样50%").click();
  await btn(page, "单次播放Lottie").click();
  await stage(page, 1).click();
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await stage(page, 3).click();
  await expect(page.locator(".motion28-renderer svg")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.motionPending.size))
    .toBe(0);
  await stage(page, 0).click();
  await expect(player(page)).toHaveAttribute("data-ready", "false");
  await load(page);
  await expect(page.locator(".motion28-renderer")).toHaveAttribute(
    "data-frame",
    "60",
  );
  await page.reload();
  await directory(page);
  await expect(player(page)).toHaveAttribute("data-ready", "false");
  await expect(lab(page)).toHaveAttribute("data-queued", "0");
  save(`cleanup-${info.project.name}`, {
    destroyedOnLeave: true,
    frameConfigRetained: true,
    volatileCleared: true,
  });
});
test("visibility fixture pauses and does not auto-resume or retain idle animation loop", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await load(page);
  await btn(page, "单次播放Lottie").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await expect
    .poll(() => page.evaluate(() => window.motionPending.size))
    .toBe(0);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  save(`visibility-${info.project.name}`, {
    syntheticVisibilityFixture: true,
    paused: true,
    noAutoResume: true,
  });
});
test("prepared result arrival cannot steal external real Tab focus", async ({
  page,
}, info) => {
  await open(page);
  await btn(page, "加载或重试Lottie").click();
  await prepared(page);
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson28",
      profile: info.project.name,
    });
  await nav.seek(btn(page, "记录实际与模拟边界"), "outside");
  await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent === "应用最早资源结果")
      .click(),
  );
  await expect(player(page)).toHaveAttribute("data-ready", "true");
  await expect(btn(page, "记录实际与模拟边界")).toBeFocused();
  save(`outside-${info.project.name}`, {
    trace,
    resultArrivalDOMFixture: true,
    focusPreserved: true,
  });
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 controls and local cropped content fit`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 0 || n === 2) await load(page);
    if (n === 1) {
      await btn(page, "程度50%").click();
      await btn(page, "触发celebrate一次事件").click();
    }
    if (n === 4) await btn(page, "生成动画集成指令").click();
    await axeCheck(page);
    mkdirSync(out, { recursive: true });
    await page.screenshot({
      path: `${out}/station${n + 1}-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .locator(
        n < 3 ? ".motion28-comparison" : n === 3 ? ".quiz-grid" : ".agent-grid",
      )
      .screenshot({ path: `${out}/crop${n + 1}-${info.project.name}.png` });
  });
const deny = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });
async function seed(p) {
  await p.addInitScript((ks) => {
    for (const [i, k] of ks.entries())
      if (localStorage.getItem(k) === null)
        localStorage.setItem(
          k,
          JSON.stringify({ step: i % 5, done: [0], marker: "prior" + i }),
        );
  }, prior);
  await p.addInitScript(deny);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior);
}
async function flow(p, act, toggle, edit) {
  await directory(p, act);
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("加载或重试Lottie");
  await prepared(p);
  await a("应用最早资源结果");
  await expect(player(p)).toHaveAttribute("data-ready", "true");
  await a("采样50%");
  await a("2倍速度");
  await a("记录实际与模拟边界");
  await a("填入标题示例");
  await edit(p.getByLabel("演练标题", { exact: true }), "caption");
  await next();
  await a("切换busy布尔值");
  await a("程度50%");
  await a("触发celebrate一次事件");
  await a("业务：成功");
  await a("应用业务到表现的映射");
  await expect(model(p)).toHaveAttribute("data-state", "完成");
  await next();
  await a("下次资源：模拟失败");
  await a("加载或重试Lottie");
  await prepared(p);
  await a("应用最早资源结果");
  await expect(lab(p)).toHaveAttribute("data-status", "failed");
  await a("下次资源：正常");
  await a("加载或重试Lottie");
  await prepared(p);
  await a("取消本次资源加载");
  await a("加载或重试Lottie");
  await expect(lab(p)).toHaveAttribute("data-prepared", "2");
  await a("应用最早资源结果");
  await expect(lab(p)).toHaveAttribute("data-status", "loading");
  await a("应用最早资源结果");
  await expect(player(p)).toHaveAttribute("data-ready", "true");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成动画集成指令");
  const draft = p.getByLabel("可编辑的 动画集成 Agent 指令");
  await expect(draft).toHaveValue(
    /实际机制与边界.*资产与团队.*播放控制.*业务与表现.*加载、失败与取消.*清理与输入.*验收/s,
  );
  await edit(draft, "draft");
  await a("复制动画集成指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 播放、输入、来源与回退。", { exact: true }),
    "review",
  );
  await a("完成第二十八节");
  await expect(p.locator(".lesson-twenty-eight .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-eight .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十八节进度");
  await a("保留第二十八节进度");
  await expect(p.locator(".lesson-twenty-eight .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十八节进度");
  await a("确认重置第二十八节");
  await expect(p.locator("#motion28-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-eight .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(lab(p)).toHaveAttribute("data-status", "empty");
  await expect(lab(p)).toHaveAttribute("data-queued", "0");
  await axeCheck(p);
  return done;
}
test("full actual Tab workflow wrong retry edits copy refresh cancel confirm reset preserves27", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson28",
      profile: info.project.name,
    }),
    done = await flow(page, act, toggle, async (f, n) => {
      await seek(f, n);
      await page.keyboard.press("End");
      await page.keyboard.type(
        n === "caption"
          ? " edited"
          : "\nReview: actual runtime, simulation boundary and late results.",
      );
    });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  save(`keyboard-${info.project.name}`, { passed: true, trace, done });
});
for (const reduced of [false, true])
  test(`full zero keyboard touch ${reduced ? "reduce" : "normal"} workflow preserves27`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: reduced ? "reduce" : "no-preference",
        baseURL: "http://127.0.0.1:4173",
      }),
      p = await c.newPage();
    await p.addInitScript(() => {
      window.workflowKeys = [];
      for (const t of ["keydown", "keyup"])
        addEventListener(t, (e) => window.workflowKeys.push(e.key));
    });
    const before = await seed(p),
      trace = [],
      tap = async (l, n) => {
        await l.tap();
        trace.push(n);
      },
      done = await flow(p, tap, tap, async (f, n) => {
        await f.tap();
        await f.fill(
          n === "caption"
            ? "触屏编辑：动画输入"
            : (await f.inputValue()) + "\n触屏核对模拟边界。",
        );
      });
    expect(await p.evaluate(() => window.workflowKeys)).toEqual([]);
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    save(`touch-${reduced ? "reduce" : "normal"}-${info.project.name}`, {
      passed: true,
      trace,
      done,
      keys: [],
    });
    await c.close();
  });
test("copy reset corrupt and unavailable storage remain scoped to28", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          window.savedMotionCopy = true;
        },
      },
    });
    localStorage.setItem("frontend-observatory.lesson28.v1", "{broken");
  });
  await open(page, 4);
  await btn(page, "生成动画集成指令").click();
  await btn(page, "复制动画集成指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.savedMotionCopy)).toBe(true);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  });
  await page
    .getByLabel("可编辑的 动画集成 Agent 指令")
    .fill("edit while unavailable");
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  await btn(page, "重置第二十八节进度").click();
  await btn(page, "确认重置第二十八节").click();
  await expect(page.locator("#motion28-stage-heading")).toBeFocused();
  await expect(lab(page)).toHaveAttribute("data-queued", "0");
});
test("late clipboard rejection after reset cannot mutate a new instance", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, r) => (window.rejectMotionCopy = r)),
      },
    });
  });
  await open(page, 4);
  await btn(page, "生成动画集成指令").click();
  await btn(page, "复制动画集成指令").click();
  await btn(page, "重置第二十八节进度").click();
  await btn(page, "确认重置第二十八节").click();
  await page.evaluate(() => window.rejectMotionCopy(Error("late")));
  await expect(page.locator("#motion28-stage-heading")).toBeFocused();
  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(lab(page)).toHaveAttribute("data-status", "empty");
});
test("hero diagram brief and official references agree about actual runtime and simulation", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(".motion28-hero-boundary")).toContainText(
    "真实Lottie播放",
  );
  await expect(page.locator(".motion28-boundary")).toContainText(
    "未导入Rive SDK或.riv",
  );
  await expect(page.locator('[data-engine="rive-simulation"]')).toContainText(
    "没有.riv或Rive runtime",
  );
  await stage(page, 4).click();
  await btn(page, "生成动画集成指令").click();
  const draft = page.getByLabel("可编辑的 动画集成 Agent 指令");
  for (const re of [
    /lottie-web 5.13.0/,
    /dotLottie支持状态机/,
    /Data Binding\/View Model/,
    /legacy/,
    /不承诺任意格式或免费导出/,
    /不逐帧播报/,
    /取消.*旧代次/s,
  ])
    await expect(draft).toHaveValue(re);
  await page.getByText("第二十八节核对说明与官方来源", { exact: true }).click();
  await expect(
    page
      .locator("details")
      .filter({
        has: page.getByText("第二十八节核对说明与官方来源", { exact: true }),
      })
      .getByRole("link"),
  ).toHaveCount(6);
});

test("real speed multiplier changes measured timeline advancement", async ({
  page,
}, info) => {
  await open(page);
  await load(page);
  const samples = [];
  for (const speed of [0.5, 2]) {
    await btn(page, "重置到首帧").click();
    await btn(page, `${speed}倍速度`).click();
    await btn(page, "单次播放Lottie").click();
    samples.push(
      await page.evaluate(async () => {
        const h = document.querySelector(".motion28-renderer"),
          start = performance.now(),
          frame = Number(h.dataset.frame);
        await new Promise((r) => setTimeout(r, 350));
        return {
          ms: performance.now() - start,
          delta: Number(h.dataset.frame) - frame,
        };
      }),
    );
    await btn(page, "暂停Lottie").click();
  }
  const rates = samples.map((x) => x.delta / x.ms);
  expect(rates[1]).toBeGreaterThan(rates[0] * 2);
  expect(samples[0].delta).toBeGreaterThan(0);
  save(`speed-${info.project.name}`, { samples, rates, actualTimeline: true });
});
test("late actual resource completion after reset cannot mount into the next instance", async ({
  page,
}, info) => {
  let release;
  const held = new Promise((r) => (release = r));
  await page.route("**/lesson28-timeline.json", async (route) => {
    await held;
    try {
      await route.fulfill({ json: asset });
    } catch {}
  });
  await page.addInitScript(instrument);
  await open(page);
  await btn(page, "加载或重试Lottie").click();
  await btn(page, "重置第二十八节进度").click();
  await btn(page, "确认重置第二十八节").click();
  release();
  await expect(lab(page)).toHaveAttribute("data-status", "empty");
  await expect(player(page)).toHaveAttribute("data-ready", "false");
  await expect(page.locator(".motion28-renderer svg")).toHaveCount(0);
  await expect(page.locator("#motion28-stage-heading")).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => window.motionPending.size))
    .toBe(0);
  save(`late-reset-${info.project.name}`, {
    delayedRouteFixture: true,
    oldCompletionIgnored: true,
    focusPreserved: true,
  });
});

test("late clipboard denial preserves deliberately moved real Tab focus", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, r) => (window.rejectMotionCopy = r)),
      },
    });
  });
  await open(page, 4);
  await btn(page, "生成动画集成指令").click();
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson28",
      profile: info.project.name,
    });
  await nav.act(btn(page, "复制动画集成指令"), "copy");
  const review = page.getByLabel("我已检查 播放、输入、来源与回退。", {
    exact: true,
  });
  await nav.seek(review, "outside-copy");
  await page.evaluate(() => window.rejectMotionCopy(Error("late denial")));
  await expect(review).toBeFocused();
  await expect(page.locator(".copy-feedback")).toContainText(
    "当前焦点保持不变",
  );
  save(`copy-focus-${info.project.name}`, {
    trace,
    denialFixture: true,
    focusPreserved: true,
  });
});
