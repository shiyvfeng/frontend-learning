import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  initialMotion,
  retarget,
  advance,
  settle,
  defaultParameters,
} from "../src/lesson-nineteen-engine.js";
const out = "/tmp/spring-acceptance",
  key = "frontend-observatory.lesson19.v1",
  prior = Array.from(
    { length: 18 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  dot = (p, k) => p.getByTestId(`spring-${k}`),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第十九节学习步骤" })
      .getByRole("button")
      .nth(n);
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "directory");
  await act(nav.getByRole("button").nth(18), "lesson19");
  await expect(p.locator("#spring-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
}
async function fit(p) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
async function axeCheck(p) {
  await p.evaluate(axe);
  const r = await p.evaluate(() =>
    axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    }),
  );
  expect(
    r.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
async function state(p, k) {
  return dot(p, k).evaluate((e) => ({
    x: Number(e.dataset.x),
    v: Number(e.dataset.v),
    running: e.dataset.running,
    target: Number(e.dataset.target),
    left: e.style.left,
  }));
}
const deny = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });
function instrument() {
  const r = requestAnimationFrame,
    c = cancelAnimationFrame;
  window.springFrames = new Map();
  window.requestAnimationFrame = (fn) => {
    const id = r.call(window, (t) => {
      window.springFrames.delete(id);
      fn(t);
    });
    window.springFrames.set(id, fn);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    window.springFrames.delete(id);
    c.call(window, id);
  };
}
test("physical model converges across parameter and refresh-rate cases with fixed substeps and real monotonic or overshooting paths", () => {
  const paths = {};
  for (const damping of [12, 20, 44])
    for (const stiffness of [120, 280, 480]) {
      let m = retarget(initialMotion(), 75, 0, {
        ...defaultParameters,
        stiffness,
        damping,
      });
      const xs = [];
      for (let i = 1; i <= 480 && m.running; i++) {
        m = advance(m, (i * 1000) / 120);
        xs.push(m.spring.x);
        expect(Number.isFinite(m.spring.x) && Number.isFinite(m.spring.v)).toBe(
          true,
        );
      }
      expect(m.running).toBe(false);
      expect(m.reason).toBe("自然稳定");
      expect(m.spring).toMatchObject({ x: 75, v: 0, done: true });
      paths[`${stiffness}-${damping}`] = xs;
    }
  expect(Math.max(...paths["280-20"])).toBeGreaterThan(75.1);
  expect(Math.max(...paths["280-44"])).toBeLessThanOrEqual(75);
  for (let i = 1; i < paths["280-44"].length; i++)
    expect(paths["280-44"][i]).toBeGreaterThanOrEqual(paths["280-44"][i - 1]);
  let a = retarget(initialMotion(), 75, 0),
    b = retarget(initialMotion(), 75, 0);
  for (let i = 1; i <= 30; i++) a = advance(a, (i * 1000) / 60);
  for (let i = 1; i <= 60; i++) b = advance(b, (i * 1000) / 120);
  expect(a.spring.x).toBeCloseTo(b.spring.x, 7);
  expect(a.spring.v).toBeCloseTo(b.spring.v, 7);
});
test("time duration and easing differ from spring and retarget preserves physical velocity instead of replaying a curve", () => {
  let m = retarget(initialMotion(), 75, 0);
  for (let i = 1; i <= 6; i++) m = advance(m, (i * 1000) / 60);
  expect(m.time.x).not.toBeCloseTo(m.spring.x, 2);
  const old = { ...m.spring },
    next = retarget(m, 25, 100);
  expect(next.spring.x).toBe(old.x);
  expect(next.spring.v).toBe(old.v);
  expect(next.time.x).toBe(m.time.x);
  expect(next.time.v).toBeLessThan(0);
  const advanced = advance(next, 105);
  expect(advanced.spring.x).toBeGreaterThan(old.x);
  expect(advanced.spring.v).toBeGreaterThan(0);
  let time = retarget(initialMotion(), 75, 0, {
    ...defaultParameters,
    easing: "linear",
    duration: 800,
  });
  for (let i = 1; i <= 24; i++) time = advance(time, (i * 1000) / 60);
  expect(time.time.x).toBeCloseTo(50, 5);
  for (let i = 25; i <= 48; i++) time = advance(time, (i * 1000) / 60);
  expect(time.time).toMatchObject({ x: 75, v: 0, done: true });
});
test("long-gap watchdog backwards timestamps static targets and settle explicitly stop without hidden catchup", () => {
  let m = retarget(initialMotion(), 75, 0);
  m = advance(m, 100);
  expect(advance(m, 90)).toBe(m);
  const gap = advance(m, 301);
  expect(gap.running).toBe(false);
  expect(gap.reason).toContain("长帧恢复保护");
  expect(gap.spring).toMatchObject({ x: 75, v: 0 });
  let watchdog = retarget(initialMotion(), 75, 0);
  watchdog = { ...watchdog, lastAt: 7950 };
  watchdog = advance(watchdog, 8001);
  expect(watchdog.reason).toContain("8秒安全终止");
  const instant = retarget(m, 25, 110, defaultParameters, true);
  expect(instant.running).toBe(false);
  expect(instant.lastCommand.kind).toBe("instant");
  expect(instant.lastCommand.after).toMatchObject({ springX: 25, springV: 0 });
  expect(settle(m, "manual").reason).toBe("manual");
  expect(retarget(initialMotion(), 25, 0).running).toBe(false);
});
test("nineteenth is lazy metadata opens nineteen only and all actual requests stay local", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-nineteen-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(urls.some((u) => /lesson-nineteen-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Spring · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(31);
  await expect(page.getByTestId("spring-lab")).toContainText("无 Motion 依赖");
  expect(
    urls
      .filter((u) => /^https?:/.test(u))
      .every((u) => u.startsWith("http://127.0.0.1:4173")),
  ).toBe(true);
});
test("real same-origin comparison changes properties, pending parameters apply only at next target and labels genuinely edit", async ({
  page,
}) => {
  await open(page, 1);
  expect((await state(page, "time")).x).toBe(25);
  expect((await state(page, "spring")).x).toBe(25);
  await page.getByLabel("实验对象文案", { exact: true }).fill("真实可编辑对象");
  await expect(page.locator(".spring-comparison")).toContainText(
    "真实可编辑对象",
  );
  await btn(page, "右目标75").click();
  await btn(page, "较硬 · 480").click();
  await btn(page, "较高 · 44").click();
  await btn(page, "1400ms").click();
  await btn(page, "匀速 linear").click();
  await btn(page, "读取真实位置与速度").click();
  await expect(page.getByTestId("spring-readout")).toContainText("k=280、c=20");
  await btn(page, "左目标25").click();
  await btn(page, "读取真实位置与速度").click();
  await expect(page.getByTestId("spring-readout")).toContainText("k=480、c=44");
  await expect(page.getByTestId("spring-readout")).toContainText(
    "duration=1400ms、linear",
  );
  await btn(page, "立即到达当前目标").click();
  expect((await state(page, "spring")).x).toBe(25);
});
test("native target clicks mid-motion keep position and nonzero velocity in command snapshot and can reverse without resetting origin", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, 2);
  await btn(page, "右目标75").click();
  await expect
    .poll(async () => Math.abs((await state(page, "spring")).v))
    .toBeGreaterThan(20);
  await btn(page, "左目标25").click();
  await expect(page.getByTestId("spring-command")).toHaveAttribute(
    "data-kind",
    "interrupted",
  );
  const text = await page.getByTestId("spring-command").innerText(),
    numbers = [...text.matchAll(/位置 (-?\d+\.\d+)、速度 (-?\d+\.\d+)/g)].map(
      (m) => ({ x: Number(m[1]), v: Number(m[2]) }),
    );
  expect(numbers).toHaveLength(2);
  expect(numbers[0]).toEqual(numbers[1]);
  expect(Math.abs(numbers[0].v)).toBeGreaterThan(1);
  expect(numbers[0].x).toBeGreaterThan(25);
  await btn(page, "立即到达当前目标").click();
  expect(await state(page, "spring")).toMatchObject({
    x: 25,
    v: 0,
    running: "false",
    target: 25,
  });
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/continuity-${info.project.name}.json`,
    JSON.stringify({ text, numbers, passed: true }, null, 2),
  );
});
test("actual trajectories distinguish stable spring from slight rebound and natural completion stops all frames", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, 1);
  const records = [];
  for (const name of ["配方：迅速稳定", "配方：轻微回弹"]) {
    await btn(page, "归位到共同起点25").click();
    await btn(page, name).click();
    await btn(page, "右目标75").click();
    const samples = await dot(page, "spring").evaluate(
      (e) =>
        new Promise((resolve) => {
          const xs = [],
            start = performance.now();
          function read() {
            xs.push(Number(e.dataset.x));
            if (performance.now() - start < 1700) requestAnimationFrame(read);
            else resolve(xs);
          }
          requestAnimationFrame(read);
        }),
    );
    if (name.includes("迅速"))
      expect(Math.max(...samples)).toBeLessThanOrEqual(75);
    else expect(Math.max(...samples)).toBeGreaterThan(75.1);
    await expect(dot(page, "spring")).toHaveAttribute("data-running", "false");
    await expect(dot(page, "time")).toHaveAttribute("data-running", "false");
    await expect(page.getByTestId("spring-status")).toContainText("自然稳定");
    records.push({ name, max: Math.max(...samples), samples });
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/trajectories-${info.project.name}.json`,
    JSON.stringify(records, null, 2),
  );
});
test("rapid targets use one live runner and realtime reduced motion invalidates old callback while keeping external focus", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, 2);
  for (let i = 0; i < 7; i++)
    await btn(page, i % 2 ? "中目标50" : "右目标75").click();
  expect(
    await page.evaluate(() => window.springFrames.size),
  ).toBeLessThanOrEqual(1);
  await page.evaluate(
    () => (window.oldSpringFrame = [...window.springFrames.values()][0]),
  );
  await btn(page, "读取真实位置与速度").focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("spring-lab")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  expect(await state(page, "spring")).toMatchObject({
    x: 75,
    v: 0,
    running: "false",
  });
  await expect(btn(page, "读取真实位置与速度")).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => window.springFrames.size))
    .toBe(0);
  await page.evaluate(() => window.oldSpringFrame?.(performance.now() + 20));
  expect(await state(page, "spring")).toMatchObject({
    x: 75,
    v: 0,
    running: "false",
  });
  await btn(page, "左目标25").click();
  await expect(page.getByTestId("spring-command")).toHaveAttribute(
    "data-kind",
    "instant",
  );
  await expect(page.getByTestId("spring-command")).toContainText(
    "不假称此时保留动画速度",
  );
  await page.getByLabel("减少动态：直接呈现最新目标", { exact: true }).check();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByTestId("spring-lab")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  await page
    .getByLabel("减少动态：直接呈现最新目标", { exact: true })
    .uncheck();
  await btn(page, "右目标75").click();
  await expect(dot(page, "spring")).toHaveAttribute("data-running", "true");
});
test("visibility fixture stops frames and return waits for new command; reset and leaving reject saved callbacks", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page, 2);
  await btn(page, "右目标75").click();
  await page.evaluate(() => {
    window.beforeHidden = [...window.springFrames.values()][0];
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("spring-status")).toContainText("真实页面隐藏");
  expect(await page.evaluate(() => window.springFrames.size)).toBe(0);
  expect((await state(page, "spring")).x).toBe(75);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.beforeHidden?.(performance.now() + 5000);
  });
  await expect(page.getByTestId("spring-status")).toContainText("不自动续播");
  expect(await page.evaluate(() => window.springFrames.size)).toBe(0);
  await btn(page, "左目标25").click();
  await page.evaluate(
    () => (window.beforeReset = [...window.springFrames.values()][0]),
  );
  await btn(page, "归位到共同起点25").click();
  await page.evaluate(() => window.beforeReset?.(performance.now() + 20));
  expect(await state(page, "spring")).toMatchObject({
    x: 25,
    v: 0,
    running: "false",
  });
  await btn(page, "右目标75").click();
  await page.evaluate(
    () => (window.beforeLeave = [...window.springFrames.values()][0]),
  );
  await stage(page, 3).click();
  await expect(page.locator("#spring-stage-heading")).toBeFocused();
  expect(await page.evaluate(() => window.springFrames.size)).toBe(0);
  await stage(page, 0).click();
  await page.evaluate(() => window.beforeLeave?.(performance.now() + 20));
  expect(await state(page, "spring")).toMatchObject({
    x: 25,
    v: 0,
    running: "false",
  });
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(0).click();
  await expect(page.locator("#stage-heading")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.springFrames.size))
    .toBe(0);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/cleanup-${info.project.name}.json`,
    JSON.stringify(
      {
        passed: true,
        visibility:
          "synthetic document.hidden fixture, not a real OS background transition",
        pendingFrames: 0,
      },
      null,
      2,
    ),
  );
});
test("all stations axe desktop375 local crops with visible focus and no required motion", async ({
  page,
}, info) => {
  await open(page);
  mkdirSync(out, { recursive: true });
  for (let n = 0; n < 5; n++) {
    await stage(page, n).click();
    if (n === 4) await btn(page, "生成弹簧指令").click();
    await axeCheck(page);
    await fit(page);
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station-${n + 1}-${info.project.name}.png` });
  }
  await stage(page, 0).click();
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const trace = [],
    { act } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson19-focus",
      profile: info.project.name,
    });
  await act(btn(page, "右目标75"), "static target");
  await expect(btn(page, "右目标75")).toBeFocused();
  const focus = await btn(page, "右目标75").evaluate((e) => {
    const r = e.getBoundingClientRect(),
      s = getComputedStyle(e),
      h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      visible: r.width > 0 && r.height > 0,
      enabled: !e.disabled,
      unoccluded: h === e || e.contains(h),
      outline: s.outlineWidth,
    };
  });
  expect(focus).toMatchObject({
    visible: true,
    enabled: true,
    unoccluded: true,
  });
  expect(focus.outline).not.toBe("0px");
  await axeCheck(page);
  writeFileSync(
    `${out}/focus-${info.project.name}.json`,
    JSON.stringify({ focus, trace }, null, 2),
  );
});
async function seed(p) {
  await p.addInitScript((ks) => {
    for (const [i, k] of ks.entries())
      if (localStorage.getItem(k) === null)
        localStorage.setItem(
          k,
          JSON.stringify({ step: i % 5, done: [0], marker: "prior " + i }),
        );
  }, prior);
  await p.addInitScript(deny);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior);
}
async function flow(p, act, toggle, edit) {
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await directory(p, act);
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("右目标75");
  await a("读取真实位置与速度");
  await next();
  await a("较硬 · 480");
  await a("较低 · 12");
  await a("1400ms");
  await a("填入示例文案");
  await a("配方：迅速稳定");
  await a("右目标75");
  await a("立即到达当前目标");
  await a("配方：轻微回弹");
  await a("左目标25");
  await a("立即到达当前目标");
  await next();
  await a("中目标50");
  await a("右目标75");
  await a("读取真实位置与速度");
  await toggle(
    p.getByLabel("减少动态：直接呈现最新目标", { exact: true }),
    "reduce",
  );
  await a("体验后台恢复保护（本地模拟）");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry " + i);
  await next();
  await a("生成弹簧指令");
  const draft = p.getByLabel("可编辑的 弹簧 Agent 指令");
  await expect(draft).toHaveValue(
    /效果目标.*对比条件.*打断与目标变化.*实现约束.*减少动态与后台.*验收/s,
  );
  if (edit) await edit(draft);
  await a("复制弹簧指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 效果目标、打断、减少动态与清理。", { exact: true }),
    "review",
  );
  await a("完成第十九节");
  await expect(p.locator(".lesson-nineteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.springKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-nineteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十九节进度");
  await a("保留第十九节进度");
  await expect(p.locator(".lesson-nineteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十九节进度");
  await a("确认重置第十九节");
  await expect(p.locator("#spring-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-nineteen .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.springKeys ?? null),
  };
}
test("complete real keyboard wrong retry edited brief refresh cancel confirm reset preserves eighteen stores", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson19",
      profile: info.project.name,
    }),
    r = await flow(page, act, toggle, async (f) => {
      await seek(f, "edit");
      await page.keyboard.press("Control+End");
      await page.keyboard.type("\nReview: stable latest target.");
    });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...r }, null, 2),
  );
});
for (const reduced of [false, true])
  test(`complete zero keyboard touch ${reduced ? "reduced" : "normal"} wrong retry refresh cancel confirm reset preserves eighteen stores`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: reduced ? "reduce" : "no-preference",
        baseURL: "http://127.0.0.1:4173",
      }),
      p = await c.newPage(),
      trace = [];
    await p.addInitScript(() => {
      window.springKeys = [];
      for (const type of ["keydown", "keyup"])
        addEventListener(type, (e) => window.springKeys.push(e.key));
    });
    const before = await seed(p),
      tap = async (l, n) => {
        await l.tap();
        trace.push(n);
      },
      r = await flow(p, tap, tap);
    expect(r.keysBefore).toEqual([]);
    expect(r.keysAfter).toEqual([]);
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    mkdirSync(out, { recursive: true });
    writeFileSync(
      `${out}/touch-${reduced ? "reduced" : "normal"}-${info.project.name}.json`,
      JSON.stringify({ passed: true, trace, ...r }, null, 2),
    );
    await c.close();
  });
test("editable brief distinguishes effect intent copy success late failure and corrupt unavailable storage", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.copied = t) },
    }),
  );
  await open(page, 1);
  await btn(page, "配方：迅速稳定").click();
  await stage(page, 4).click();
  await btn(page, "生成弹簧指令").click();
  const draft = page.getByLabel("可编辑的 弹簧 Agent 指令");
  await expect(draft).toHaveValue(/效果目标：迅速稳定/);
  await stage(page, 1).click();
  await btn(page, "配方：轻微回弹").click();
  await stage(page, 4).click();
  await btn(page, "重新生成弹簧草稿").click();
  await expect(draft).toHaveValue(/效果目标：轻微回弹/);
  await draft.fill(
    "自定义弹簧指令 " + "减少动态，目标变化保持连续，清理后台。".repeat(8),
  );
  await btn(page, "复制弹簧指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.copied)).toBe(
    await draft.inputValue(),
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r, j) => (window.lateReject = j)),
      },
    }),
  );
  await btn(page, "复制弹簧指令").click();
  await btn(page, "重置第十九节进度").click();
  await page.keyboard.press("Escape");
  await expect(btn(page, "重置第十九节进度")).toBeFocused();
  await btn(page, "重置第十九节进度").click();
  await btn(page, "确认重置第十九节").click();
  await page.evaluate(() => window.lateReject(Error("late")));
  await stage(page, 4).click();
  await expect(draft).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText(
    "自动复制不可用",
  );
  await page.evaluate(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 88,
          done: [0, 0, 7],
          stiffness: -1,
          damping: 99,
          answers: [1, 9, null],
        }),
      ),
    key,
  );
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-bottom")).toContainText("1 / 5");
  await expect(btn(page, "适中 · 280")).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
    Storage.prototype.removeItem = () => {
      throw Error("denied");
    };
  });
  await btn(page, "填入示例文案").click();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  await btn(page, "重置第十九节进度").click();
  await btn(page, "确认重置第十九节").click();
  await expect(page.locator(".lesson-bottom")).toContainText("0 / 5");
  await expect(page.locator("#spring-stage-heading")).toBeFocused();
});
