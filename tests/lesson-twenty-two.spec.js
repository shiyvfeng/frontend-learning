import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import { scrollMetrics } from "../src/lesson-twenty-two-content.js";
const out = "/tmp/scroll-acceptance",
  key = "frontend-observatory.lesson22.v1",
  prior = Array.from(
    { length: 21 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".scroll22-lab"),
  region = (p) =>
    p.getByRole("region", { name: "本地滚动实验框", exact: true }),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十二节学习步骤" })
      .getByRole("button")
      .nth(n);
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(21), "lesson22");
  await expect(p.locator("#scroll-animation-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  if (n < 3)
    await expect
      .poll(() => lab(p).getAttribute("data-max").then(Number))
      .toBeGreaterThan(0);
}
async function fit(p) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
async function axeCheck(p) {
  await p.evaluate(axe);
  const x = await p.evaluate(() =>
    axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    }),
  );
  expect(
    x.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
async function move(p, f) {
  await region(p).evaluate(
    (el, f) =>
      el.scrollTo({
        top: (el.scrollHeight - el.clientHeight) * f,
        behavior: "instant",
      }),
    f,
  );
  await expect
    .poll(() => lab(p).getAttribute("data-whole").then(Number))
    .toBeCloseTo(f, 2);
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
function instrument() {
  const raf = requestAnimationFrame.bind(window),
    caf = cancelAnimationFrame.bind(window);
  window.scrollFrames = [];
  window.holdScrollFrame = false;
  window.scrollFrameMap = new Map();
  window.requestAnimationFrame = (cb) => {
    let id;
    const wrapped = (t) => {
      window.scrollFrameMap.delete(id);
      if (window.holdScrollFrame) {
        window.scrollFrames.push(cb);
        return;
      }
      cb(t);
    };
    id = raf(wrapped);
    window.scrollFrameMap.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    caf(id);
    window.scrollFrameMap.delete(id);
  };
}
test("metrics zero denominator negative overscroll and exact full/middle boundaries", () => {
  for (const args of [
    [0, 0, 0],
    [0, 100, 100],
    [20, 100, 200],
  ])
    expect(scrollMetrics(...args).progress).toBe(0);
  expect(scrollMetrics(-20, 1100, 100).progress).toBe(0);
  expect(scrollMetrics(2000, 1100, 100).progress).toBe(1);
  for (const [top, want] of [
    [0, 0],
    [200, 0],
    [500, 0.5],
    [800, 1],
    [1000, 1],
  ])
    expect(scrollMetrics(top, 1100, 100, "middle").progress).toBe(want);
  expect(scrollMetrics(500, 1100, 100).max).toBe(1000);
});
test("lazy registration only opens 01–28, next data visualization lesson stays preview and requests local", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-twenty-two-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(urls.some((u) => /lesson-twenty-two-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Scroll Animation · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(28);
  expect(urls.filter((u) => !u.startsWith("http://127.0.0.1:4173/"))).toEqual(
    [],
  );
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(28).click();
  await expect(
    page.getByRole("heading", { name: "数据可视化", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toContainText("尚未制作");
});
test("real keyboard scroll drives JS and actual native CSS timeline reversibly without moving page", async ({
  page,
}, info) => {
  await open(page);
  await region(page).focus();
  const outer = await page.evaluate(() => scrollY);
  await page.keyboard.press("End");
  await expect
    .poll(() => lab(page).getAttribute("data-progress").then(Number))
    .toBe(1);
  await page.keyboard.press("Home");
  await expect
    .poll(() => lab(page).getAttribute("data-progress").then(Number))
    .toBe(0);
  expect(await page.evaluate(() => scrollY)).toBe(outer);
  await move(page, 0.5);
  await expect(lab(page)).toHaveAttribute("data-native", "true");
  const native = await page.locator(".scroll22-native-fill").evaluate((e) => ({
    timeline: getComputedStyle(e).animationTimeline,
    scale: new DOMMatrix(getComputedStyle(e).transform).a,
    animations: e.getAnimations().map((a) => ({
      timeline: a.timeline?.constructor.name,
      source: a.timeline?.source?.className,
      currentTime: a.currentTime?.toString(),
      frames: a.effect.getKeyframes(),
    })),
  }));
  expect(native.timeline).toContain("scroll");
  expect(native.animations.some((a) => a.timeline === "ScrollTimeline")).toBe(
    true,
  );
  expect(native.scale).toBeCloseTo(0.5, 1);
  expect(
    native.animations.some((a) => a.source?.includes("scroll22-viewport")),
  ).toBe(true);
  await move(page, 0.1);
  await expect
    .poll(() =>
      page
        .locator(".scroll22-native-fill")
        .evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a),
    )
    .toBeCloseTo(0.1, 1);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/native-${info.project.name}.json`,
    JSON.stringify({ outer, native, backward: true }, null, 2),
  );
});
test("delayed navigation preserves newer real Tab focus and real End/Home scrolling", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await expect(page.locator("#scroll-animation-stage-heading")).toBeFocused();
  await page.evaluate(() => (window.holdScrollFrame = true));
  await stage(page, 0).click();
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  const trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson22-late-navigation",
      profile: info.project.name,
    });
  await seek(region(page), "scroll region after delayed navigation");
  const outer = await page.evaluate(() => scrollY);
  await page.keyboard.press("End");
  await expect
    .poll(() => region(page).evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    window.holdScrollFrame = false;
    window.scrollFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  // Check immediately after delivery: no subsequent Tab/click may hide a steal.
  await expect(region(page)).toBeFocused();
  await expect
    .poll(() => lab(page).getAttribute("data-progress").then(Number))
    .toBe(1);
  await page.keyboard.press("Home");
  await expect
    .poll(() => lab(page).getAttribute("data-progress").then(Number))
    .toBe(0);
  await expect(region(page)).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(outer);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/late-navigation-${info.project.name}.json`,
    JSON.stringify(
      {
        passed: true,
        trace,
        outer,
        realKeys: ["Tab", "End", "Home"],
        fixture:
          "delayed JS RAF delivery only; focus and scrolling use real keyboard input",
      },
      null,
      2,
    ),
  );
});
test("navigation normally focuses heading; cancelled generations reset and unmount cannot steal newer focus", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  const heading = page.locator("#scroll-animation-stage-heading");
  await stage(page, 1).click();
  await expect(heading).toBeFocused();
  await page.evaluate(() => (window.holdScrollFrame = true));
  await stage(page, 0).click();
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  await page.keyboard.press("Tab");
  await expect(stage(page, 1)).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(stage(page, 0)).toBeFocused();
  await page.evaluate(() =>
    window.scrollFrames.splice(0).forEach((cb) => cb(performance.now())),
  );
  await expect(stage(page, 0)).toBeFocused();
  await stage(page, 0).click();
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    window.oldNavigationFrames = window.scrollFrames.splice(0);
  });
  await stage(page, 2).click();
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  await page.evaluate(() =>
    window.oldNavigationFrames.forEach((cb) => cb(performance.now())),
  );
  await expect(stage(page, 2)).toBeFocused();
  await page.evaluate(() => {
    window.holdScrollFrame = false;
    window.scrollFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(heading).toBeFocused();
  await btn(page, "重置第二十二节进度").click();
  await page.evaluate(() => (window.holdScrollFrame = true));
  await btn(page, "确认重置第二十二节").click();
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  const trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson22-reset-owner",
      profile: "both",
    });
  await seek(region(page), "new focus after reset");
  await page.evaluate(() =>
    window.scrollFrames.splice(0).forEach((cb) => cb(performance.now())),
  );
  await expect(region(page)).toBeFocused();
  await stage(page, 0).click();
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(23).click();
  await expect(page.locator("#canvas-stage-stage-heading")).toBeFocused();
  await page.evaluate(() => {
    window.holdScrollFrame = false;
    window.oldNavigationFrames.forEach((cb) => cb(performance.now()));
    window.scrollFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(page.locator("#canvas-stage-stage-heading")).toBeFocused();
});
test("middle range clamps outside endpoints while native CSS remains whole range", async ({
  page,
}) => {
  await open(page, 1);
  await btn(page, "中段20%–80%").click();
  for (const [f, want] of [
    [0.1, 0],
    [0.2, 0],
    [0.5, 0.5],
    [0.8, 1],
    [1, 1],
    [0.1, 0],
  ]) {
    await move(page, f);
    await expect
      .poll(() => lab(page).getAttribute("data-progress").then(Number))
      .toBeCloseTo(want, 2);
  }
  await btn(page, "读取真实滚动区间").click();
  await expect(page.locator(".scroll22-inspection")).toContainText(
    "scrollHeight",
  );
  await expect(page.locator(".scroll22-explain")).toContainText("未安装GSAP");
});
test("real IO enters marker once and time playback does not scrub backwards, reobserve is repeatable", async ({
  page,
}) => {
  await open(page, 1);
  await expect(page.locator(".scroll22-entry-state")).toContainText("等待");
  const y = await page
    .locator(".scroll22-entry-art")
    .evaluate((el) => el.offsetTop);
  await region(page).evaluate(
    (el, y) => el.scrollTo({ top: y - 150, behavior: "instant" }),
    y,
  );
  await expect(page.locator(".scroll22-entry-state")).toContainText(
    "已触发一次",
  );
  await move(page, 0);
  await expect(page.locator(".scroll22-entry-state")).toContainText(
    "已触发一次",
  );
  await btn(page, "重新观察入场").click();
  await expect(page.locator(".scroll22-entry-state")).toContainText("等待");
  await move(page, 0.5);
  await expect(page.locator(".scroll22-entry-state")).toContainText(
    "已触发一次",
  );
});
test("content height title and viewport changes remeasure actual denominator and preserve outside focus", async ({
  page,
}) => {
  await open(page, 2);
  await move(page, 0.5);
  const before = Number(await lab(page).getAttribute("data-max"));
  await page.getByLabel("增加长内容，重算滚动距离", { exact: true }).check();
  await expect
    .poll(() => lab(page).getAttribute("data-max").then(Number))
    .toBeGreaterThan(before);
  await btn(page, "读取真实滚动区间").focus();
  await page.setViewportSize({ width: 375, height: 620 });
  await expect(btn(page, "读取真实滚动区间")).toBeFocused();
  const actual = await region(page).evaluate(
    (el) => el.scrollHeight - el.clientHeight,
  );
  await expect(lab(page)).toHaveAttribute("data-max", String(actual));
  await btn(page, "填入标题示例").click();
  await page
    .getByLabel("实验标题", { exact: true })
    .fill("可编辑长标题 ".repeat(7));
  await expect(page.locator(".scroll22-card").first()).toContainText(
    "可编辑长标题",
  );
  await move(page, 1);
  await fit(page);
  await axeCheck(page);
});
test("rapid native scroll events coalesce one pending frame; unmounted saved callbacks cannot mutate new lab", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => {
    window.holdScrollFrame = true;
    const el = document.querySelector(".scroll22-viewport");
    for (let i = 0; i < 30; i++) {
      el.scrollTop = i * 10;
      el.dispatchEvent(new Event("scroll"));
    }
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  const callbacks = await page.evaluate(() => window.scrollFrames.length);
  expect(callbacks).toBeLessThan(4);
  await stage(page, 1).click();
  await page.evaluate(() => {
    window.holdScrollFrame = false;
    window.scrollFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect
    .poll(() => lab(page).getAttribute("data-progress").then(Number))
    .toBe(0);
  await move(page, 0.5);
  await expect(lab(page)).toHaveAttribute("data-whole", /0\.50/);
});
test("system reduced motion changes live, cancels entry and native decorations without changing content or focus", async ({
  page,
}) => {
  await open(page);
  await move(page, 0.5);
  await btn(page, "读取真实滚动区间").focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab(page)).toHaveAttribute("data-dynamic", "false");
  await expect(btn(page, "读取真实滚动区间")).toBeFocused();
  await expect(page.locator(".scroll22-js-fill")).toHaveCSS(
    "transform",
    "none",
  );
  expect(
    await page
      .locator(".scroll22-native-fill")
      .evaluate((e) => e.getAnimations().length),
  ).toBe(0);
  await expect(page.locator(".scroll22-card")).toHaveCount(3);
  await move(page, 0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(lab(page)).toHaveAttribute("data-dynamic", "true");
  await expect
    .poll(() => lab(page).getAttribute("data-progress").then(Number))
    .toBe(0);
});
test("unsupported native CSS IO RO paths remain complete and manually remeasure without fake playback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const support = CSS.supports.bind(CSS);
    CSS.supports = (a, b) =>
      a === "animation-timeline" ? false : support(a, b);
    window.IntersectionObserver = undefined;
    window.ResizeObserver = undefined;
  });
  await open(page, 1);
  await expect(lab(page)).toHaveAttribute("data-native", "false");
  expect(
    await page
      .locator(".scroll22-native-fill")
      .evaluate((e) => e.getAnimations().length),
  ).toBe(0);
  await expect(page.locator(".scroll22-entry-state")).toContainText(
    "静态内容完整",
  );
  await btn(page, "记录触发、绑定与候选比较").click();
  await move(page, 1);
  await move(page, 0);
  await stage(page, 2).click();
  await page.getByLabel("增加长内容，重算滚动距离", { exact: true }).check();
  await btn(page, "读取真实滚动区间").click();
  await expect(page.locator(".task-footer")).toContainText("改变内容高度");
  await expect(page.locator(".scroll22-mode")).toContainText("手动");
  await fit(page);
});
test("synthetic hidden fixture cancels pending frame and old callback; idle has no perpetual RAF", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => {
    window.holdScrollFrame = true;
    const e = document.querySelector(".scroll22-viewport");
    e.scrollTop = 300;
    e.dispatchEvent(new Event("scroll"));
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(lab(page)).toHaveAttribute("data-dynamic", "false");
  await page.evaluate(() => {
    window.holdScrollFrame = false;
    window.scrollFrames.splice(0).forEach((cb) => cb(performance.now()));
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => lab(page).getAttribute("data-progress").then(Number))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.scrollFrameMap.size))
    .toBe(0);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/visibility-${info.project.name}.json`,
    JSON.stringify({
      passed: true,
      fixture: "synthetic document.hidden, not actual OS background",
      idleFrames: 0,
    }),
  );
});
test("short viewport and zoom-like effective width release sticky, leave readable space and all controls outside", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 420 });
  await open(page);
  await expect(lab(page)).toHaveAttribute("data-short", "true");
  await expect(page.getByTestId("scroll22-pin")).toHaveCSS(
    "position",
    "static",
  );
  expect(await region(page).locator("button,input,a,textarea").count()).toBe(0);
  await move(page, 1);
  await expect(page.locator(".scroll22-card").last()).toContainText("验收");
  await fit(page);
  await axeCheck(page);
});
test("reset pending frame destroys session and late IO/RAF cannot repopulate progress", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => {
    window.holdScrollFrame = true;
    const e = document.querySelector(".scroll22-viewport");
    e.scrollTop = 100;
    e.dispatchEvent(new Event("scroll"));
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollFrames.length))
    .toBeGreaterThan(0);
  await btn(page, "重置第二十二节进度").click();
  await btn(page, "确认重置第二十二节").click();
  await page.evaluate(() => {
    window.holdScrollFrame = false;
    window.scrollFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(page.locator("#scroll-animation-stage-heading")).toBeFocused();
  await expect
    .poll(() => lab(page).getAttribute("data-progress").then(Number))
    .toBe(0);
  const value = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(value.forwardSeen).toBe(false);
  expect(value.done).toEqual([]);
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and bounded local crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n < 3) await move(page, 0.5);
    if (n === 4) await btn(page, "生成滚动动画指令").click();
    await axeCheck(page);
    await fit(page);
    mkdirSync(out, { recursive: true });
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
    const local =
      n < 3
        ? region(page)
        : n === 3
          ? page.locator(".quiz-card").first()
          : page.locator(".agent-options");
    await local.screenshot({
      path: `${out}/crop${n + 1}-${info.project.name}.png`,
    });
  });
async function flow(p, act, toggle, scroll, edit) {
  await directory(p, act);
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await scroll(1);
  await scroll(0);
  await a("读取真实滚动区间");
  await next();
  await a("中段20%–80%");
  await scroll(0.5);
  await expect(p.locator(".scroll22-entry-state")).toContainText("已触发一次");
  await scroll(0);
  await a("记录触发、绑定与候选比较");
  await next();
  const max = Number(await lab(p).getAttribute("data-max"));
  await toggle(
    p.getByLabel("增加长内容，重算滚动距离", { exact: true }),
    "long",
  );
  await expect
    .poll(() => lab(p).getAttribute("data-max").then(Number))
    .toBeGreaterThan(max);
  await a("填入标题示例");
  if (edit) await edit(p.getByLabel("实验标题", { exact: true }), "title");
  await toggle(
    p.getByLabel("减少动态：保留静态内容", { exact: true }),
    "reduce",
  );
  await toggle(
    p.getByLabel("模拟能力不足：静态阅读", { exact: true }),
    "static",
  );
  await a("读取真实滚动区间");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成滚动动画指令");
  const draft = p.getByLabel("可编辑的 滚动动画 Agent 指令");
  await expect(draft).toHaveValue(
    /滚动区间.*阶段与绑定.*入场触发.*固定区域.*技术候选.*回退与生命周期.*验收/s,
  );
  if (edit) await edit(draft, "draft");
  await a("复制滚动动画指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 区间、固定范围、阶段、窄屏与减少动态。", {
      exact: true,
    }),
    "review",
  );
  await a("完成第二十二节");
  await expect(p.locator(".lesson-twenty-two .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.scrollKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-two .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十二节进度");
  await a("保留第二十二节进度");
  await expect(p.locator(".lesson-twenty-two .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十二节进度");
  await a("确认重置第二十二节");
  await expect(p.locator("#scroll-animation-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-two .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.scrollKeys ?? null),
  };
}
test("full actual Tab keyboard scroll wrong retry edits copy refresh reset preserves21", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson22",
      profile: info.project.name,
    });
  const scroll = async (f) => {
    await seek(region(page), "native scroll");
    const ratio = () => lab(page).getAttribute("data-whole").then(Number);
    const current = await ratio();
    if (f === 0 || f === 1) {
      // Avoid an extra boundary key: native scroll chaining may intentionally move the outer course.
      if (Math.abs(current - f) > 0.0001)
        await page.keyboard.press(f === 0 ? "Home" : "End");
      await expect.poll(ratio).toBe(f);
    } else {
      if (current > 0) {
        await page.keyboard.press("Home");
        await expect.poll(ratio).toBe(0);
      }
      for (let i = 0; i < 4; i++) {
        const before = await ratio();
        if (before >= 1) break;
        await page.keyboard.press("PageDown");
        await expect.poll(ratio).toBeGreaterThan(before);
        await page.waitForTimeout(150);
        if (
          (await page.locator(".scroll22-entry-state").textContent()).includes(
            "已触发一次",
          )
        )
          break;
      }
    }
  };
  const result = await flow(page, act, toggle, scroll, async (f, n) => {
    await seek(f, n);
    await page.keyboard.press("End");
    await page.keyboard.type(
      n === "title"
        ? " edited"
        : "\nReview: preserve reading and reverse scroll.",
    );
  });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...result }, null, 2),
  );
});
async function swipe(p, f) {
  const el = region(p);
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox(),
    session = await p.context().newCDPSession(p);
  const x = box.x + box.width * 0.7,
    top = box.y + box.height * 0.25,
    bottom = box.y + box.height * 0.85;
  try {
    for (let attempt = 0; attempt < 16; attempt++) {
      const current = Number(await lab(p).getAttribute("data-whole"));
      if (
        (f === 0 && current < 0.001) ||
        (f === 1 && current > 0.999) ||
        (f === 0.5 && current > 0.3 && current < 0.8)
      )
        break;
      const forward = f > current,
        y0 = forward ? bottom : top,
        y1 = forward ? top : bottom;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y: y0 }],
      });
      for (let i = 1; i <= 8; i++) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 8 }],
        });
        await p.waitForTimeout(20);
      }
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await p.waitForTimeout(100);
    }
    if (f === 0 || f === 1)
      await expect
        .poll(() => lab(p).getAttribute("data-whole").then(Number))
        .toBe(f);
  } finally {
    await session.detach();
  }
}
for (const reduced of [false, true])
  test(`full zero keyboard touch real gestures ${reduced ? "system reduce" : "normal"} wrong retry refresh reset preserves21`, async ({
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
      window.scrollKeys = [];
      for (const t of ["keydown", "keyup"])
        addEventListener(t, (e) => window.scrollKeys.push(e.key));
    });
    const before = await seed(p),
      tap = async (l, n) => {
        await l.tap();
        trace.push(n);
      },
      result = await flow(
        p,
        tap,
        tap,
        (f) => swipe(p, f),
        async (f, n) => {
          await f.tap();
          await f.fill(
            n === "title"
              ? "触屏编辑阅读标题"
              : (await f.inputValue()) + "\n触屏核对：滚动与静态回退。",
          );
        },
      );
    expect(result.keysBefore).toEqual([]);
    expect(result.keysAfter).toEqual([]);
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    mkdirSync(out, { recursive: true });
    writeFileSync(
      `${out}/touch-${reduced ? "reduced" : "normal"}-${info.project.name}.json`,
      JSON.stringify(
        {
          passed: true,
          trace,
          gesture: "CDP native touchStart/Move/End, not scrollTop setter",
          ...result,
        },
        null,
        2,
      ),
    );
    await c.close();
  });
test("edited copy success late rejection unavailable and corrupt storage stay scoped", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.copied = t) },
    }),
  );
  await open(page, 4);
  await btn(page, "生成滚动动画指令").click();
  const draft = page.getByLabel("可编辑的 滚动动画 Agent 指令");
  await draft.fill(
    "自定义滚动动画简报 " + "区间、阅读、减少动态与真实滚动。".repeat(9),
  );
  await btn(page, "复制滚动动画指令").click();
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
  await btn(page, "复制滚动动画指令").click();
  await stage(page, 0).click();
  await page.evaluate(() => window.lateReject(Error("late")));
  await stage(page, 4).click();
  await expect(page.locator(".copy-feedback")).not.toContainText(
    "自动复制不可用",
  );
  await page.evaluate(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          done: [0, 0, 9],
          range: "invalid",
          answers: [8, 1, null],
        }),
      ),
    key,
  );
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-bottom")).toContainText("1 / 5");
  await expect(btn(page, "全程0%–100%")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
    Storage.prototype.removeItem = () => {
      throw Error("denied");
    };
  });
  await btn(page, "填入标题示例").click();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});
