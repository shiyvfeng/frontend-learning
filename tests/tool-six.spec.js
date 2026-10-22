import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL06_STORAGE as KEY,
  tool06Initial,
  tool06Brief,
  tool06Questions,
} from "../src/tool-six-content.js";
const out = "/tmp/tool06-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  field = (p, n) => p.locator("#tool06-" + n),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T06工具专题学习步骤" })
      .getByRole("button")
      .nth(n),
  lab = (p) => p.locator(".tool06-lab"),
  time = (p) => p.locator("[data-time-root]"),
  region = (p) =>
    p.getByRole("region", { name: "T06局部原生滚动实验框", exact: true }),
  scrollArt = (p) => p.locator("[data-scroll-art]"),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  draft = (p) => field(p, "agent-draft");
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", {
      name: "T06 · GSAP / ScrollTrigger · 可学习",
      exact: true,
    }),
    "T06",
  );
  await expect(field(p, "stage-heading")).toBeVisible();
}
async function open(p, n = 0, ready = true) {
  await p.goto("/");
  await directory(p);
  if (n) await stage(p, n).click();
  if (ready && n < 3)
    await expect(lab(p)).toHaveAttribute("data-policy", "active");
  if (ready && n > 0 && n < 3)
    await expect
      .poll(() => lab(p).getAttribute("data-end").then(Number))
      .toBeGreaterThan(0);
}
async function seed(p, d) {
  await p.addInitScript(
    ([k, d]) => {
      if (window === top) localStorage.setItem(k, JSON.stringify(d));
    },
    [KEY, d],
  );
}
async function inspect(p) {
  await b(p, "读取真实实例与区间快照").click();
  return JSON.parse(
    await p.locator("[data-snapshot]").getAttribute("data-snapshot"),
  );
}
async function axes(p) {
  await p.evaluate(axe);
  expect(
    await p.evaluate(
      async () =>
        (
          await axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          })
        ).violations,
    ),
  ).toEqual([]);
}
async function frames(p, selector, ms = 260) {
  return p.locator(selector).evaluate(
    (el, ms) =>
      new Promise((resolve) => {
        const rows = [],
          start = performance.now();
        function sample(t) {
          const dot = el.querySelector("[data-dot]"),
            bar = el.querySelector("[data-bar]"),
            badge = el.querySelector("[data-badge]");
          const dx = new DOMMatrixReadOnly(getComputedStyle(dot).transform),
            bx = new DOMMatrixReadOnly(getComputedStyle(bar).transform),
            r = dot.getBoundingClientRect();
          rows.push({
            t: t - start,
            progress: Number(el.dataset.progress),
            time: Number(el.dataset.time),
            x: dx.m41,
            barScale: bx.m11,
            badge: getComputedStyle(badge).transform,
            rectX: r.x,
          });
          if (t - start >= ms) resolve(rows);
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
    ms,
  );
}
const save = (n, x) =>
  writeFileSync(`${out}/${n}.json`, JSON.stringify(x, null, 2));
const good = () => ({
  ...tool06Initial(),
  step: 4,
  done: [0, 1, 2, 3],
  context: "现有CSS和Motion不迁移；GSAP只做多段时间线/指定局部滚动。",
});
test("actual pinned GSAP Timeline and ScrollTrigger source and honest provenance license links", async ({
  page,
}) => {
  expect(
    JSON.parse(readFileSync("package.json", "utf8")).dependencies.gsap,
  ).toBe("3.15.0");
  const src = readFileSync("src/tool-six-runtime.js", "utf8");
  for (const s of [
    'from "gsap"',
    'from "gsap/ScrollTrigger"',
    "gsap.timeline",
    "ScrollTrigger.create",
    "gsap.context",
    "ctx.revert",
    "ScrollTrigger.disable",
    "ScrollTrigger.enable",
  ])
    expect(src).toContain(s);
  expect(src).not.toMatch(/scrollY|normalizeScroll\(/);
  await open(page);
  const r = page
    .locator(".tool-six .roadmap-details")
    .filter({ hasText: "T06工具专题核对说明与官方来源" });
  await r.locator("summary").click();
  for (const s of [
    "GSAP官方Timeline",
    "3.15.0",
    "本站原创",
    "原生dialog",
    "不是MIT",
    "许可正文当前跳离线页",
  ])
    await expect(r).toContainText(s);
  await expect(r).not.toContainText(/CLI|primitive|Radix|Open\s*Code/);
  expect(
    await r
      .getByRole("link")
      .evaluateAll((ls) => ls.map((l) => l.getAttribute("href"))),
  ).toContain("https://gsap.com/docs/v3/Plugins/ScrollTrigger/");
  const x = await inspect(page);
  expect(x).toMatchObject({
    kind: "time",
    gsap: "3.15.0",
    duration: 2.4,
    paused: true,
    progress: 0,
    triggerCount: 0,
  });
});
test("real timeline advances intermediate pixels pauses stably and reverses current time", async ({
  page,
}, info) => {
  await open(page);
  await field(page, "speed").selectOption("0.5");
  await b(page, "播放时间线").click();
  const forward = await frames(page, "[data-time-root]", 420);
  expect(forward.at(-1).x).toBeGreaterThan(forward[0].x + 4);
  expect(forward.at(-1).progress).toBeGreaterThan(0);
  expect(forward.at(-1).progress).toBeLessThan(1);
  await b(page, "暂停时间线").click();
  const paused = await frames(page, "[data-time-root]", 240);
  expect(
    Math.max(...paused.map((r) => r.x)) - Math.min(...paused.map((r) => r.x)),
  ).toBeLessThan(0.1);
  const before = Number(await time(page).getAttribute("data-time"));
  await b(page, "反向时间线").click();
  const reversed = await frames(page, "[data-time-root]", 250);
  expect(reversed.at(-1).time).toBeLessThan(before);
  await expect(b(page, "反向时间线")).toBeFocused();
  save(info.project.name + "-timeline-frames", { forward, paused, reversed });
});
test("timeline phase seek and playback speed affect time not scroll distance and bounded duplicate controls", async ({
  page,
}) => {
  await open(page);
  await b(page, "时间线跳到50%").click();
  expect(await inspect(page)).toMatchObject({
    progress: 0.5,
    time: 1.2,
    paused: true,
  });
  await b(page, "播放时间线").click();
  await b(page, "反向时间线").click();
  await b(page, "暂停时间线").click();
  await field(page, "speed").selectOption("0.5");
  await b(page, "时间线跳到100%").click();
  expect(await inspect(page)).toMatchObject({
    progress: 1,
    time: 2.4,
    paused: true,
  });
  await b(page, "恢复场景起点").click();
  expect(await inspect(page)).toMatchObject({
    progress: 0,
    time: 0,
    triggerCount: 0,
  });
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
});
test("actual ScrollTrigger scroller bounds scrub and pin match native geometry not text only", async ({
  page,
}, info) => {
  await open(page, 1);
  let x = await inspect(page);
  expect(x).toMatchObject({
    kind: "scroll",
    gsap: "3.15.0",
    scrollTrigger: "3.15.0",
    scrollerMatches: true,
    triggerCount: 1,
    pin: true,
    scrub: true,
  });
  expect(x.end - x.start).toBeCloseTo(480, 1);
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  const before = await scrollArt(page).boundingBox();
  await b(page, "辅助定位滚动50%").click();
  await expect
    .poll(() => scrollArt(page).getAttribute("data-progress").then(Number))
    .toBeCloseTo(0.5, 2);
  x = await inspect(page);
  expect(x.progress).toBeCloseTo(0.5, 2);
  expect(x.animationProgress).toBeCloseTo(0.5, 2);
  const at = await scrollArt(page).boundingBox(),
    vr = await region(page).boundingBox();
  expect(Math.abs(at.y - vr.y)).toBeLessThan(5);
  const pixels = await frames(page, "[data-scroll-art]", 100);
  expect(pixels.at(-1).x).toBeGreaterThan(20);
  save(info.project.name + "-scroll-binding", {
    before,
    at,
    viewport: vr,
    actual: x,
    pixels,
  });
});
test("real native wheel or touch scroll moves forward and backward through actual ScrollTrigger", async ({
  page,
}, info) => {
  await open(page, 1);
  await region(page).scrollIntoViewIfNeeded();
  const r = await region(page).boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.wheel(0, 330);
  await expect
    .poll(() => lab(page).getAttribute("data-scroll-progress").then(Number))
    .toBeGreaterThan(0.2);
  const f = Number(await lab(page).getAttribute("data-scroll-progress"));
  await page.mouse.wheel(0, -220);
  await expect
    .poll(() => lab(page).getAttribute("data-scroll-progress").then(Number))
    .toBeLessThan(f - 0.1);
  expect((await read(page)).backSeen).toBe(true);
  save(info.project.name + "-native-wheel", {
    f,
    final: await inspect(page),
    input: "actual wheel, not scrollTop assignment",
  });
});
test("real Tab region End and Home retain focus and leave with native Tab after completed scroll gestures", async ({
  page,
}, info) => {
  await open(page, 1);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool06-native-scroll",
      profile: info.project.name,
    });
  await k.seek(region(page), "native region");
  await region(page).evaluate((el) => {
    el.dataset.ends = "0";
    el.addEventListener(
      "scrollend",
      () => (el.dataset.ends = String(Number(el.dataset.ends) + 1)),
    );
  });
  const outer = await page.evaluate(() => scrollY);
  await page.keyboard.press("End");
  await expect
    .poll(() => region(page).getAttribute("data-ends").then(Number))
    .toBeGreaterThan(0);
  await expect
    .poll(() => lab(page).getAttribute("data-scroll-progress").then(Number))
    .toBe(1);
  await expect(region(page)).toBeFocused();
  const count = Number(await region(page).getAttribute("data-ends"));
  await page.keyboard.press("Home");
  await expect
    .poll(() => region(page).getAttribute("data-ends").then(Number))
    .toBeGreaterThan(count);
  await expect
    .poll(() => lab(page).getAttribute("data-scroll-progress").then(Number))
    .toBe(0);
  await expect(region(page)).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(outer);
  await page.keyboard.press("Tab");
  await expect(b(page, "辅助定位滚动0%")).toBeFocused();
  save(info.project.name + "-native-keys", {
    trace,
    outer,
    keys: ["Tab", "End", "Home", "Tab"],
    scrollendObserved: true,
  });
});
test("scrub numeric catchup has real intermediate transform then reaches target and scroll back", async ({
  page,
}, info) => {
  await open(page, 2);
  await field(page, "scrub").selectOption("catchup");
  await b(page, "辅助定位滚动100%").click();
  // Record initialization as well: ScrollTrigger intentionally synchronizes
  // initial/refresh positions before buffered scrubbing begins.
  const startup = await frames(page, "[data-scroll-art]", 650);
  await b(page, "辅助定位滚动0%").click();
  await expect
    .poll(() => scrollArt(page).getAttribute("data-progress").then(Number))
    .toBe(0);
  const sampling = frames(page, "[data-scroll-art]", 250);
  await b(page, "辅助定位滚动100%").click();
  const f = await sampling;
  save(info.project.name + "-scrub-frames", { startup, buffered: f });
  expect(f.some((r) => r.progress > 0 && r.progress < 0.98)).toBe(true);
  await expect
    .poll(() => scrollArt(page).getAttribute("data-progress").then(Number))
    .toBeCloseTo(1, 2);
  await b(page, "辅助定位滚动0%").click();
  await expect
    .poll(() => scrollArt(page).getAttribute("data-progress").then(Number))
    .toBe(0);
  expect(await inspect(page)).toMatchObject({ scrub: 0.35, triggerCount: 1 });
});
test("pin toggle removes actual spacer and changing distance rebuilds exactly one trigger with new bounds", async ({
  page,
}) => {
  await open(page, 2);
  await field(page, "pin").uncheck();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(await inspect(page)).toMatchObject({ pin: false, triggerCount: 1 });
  await field(page, "distance").selectOption("720");
  let x = await inspect(page);
  expect(x.end - x.start).toBeCloseTo(720, 1);
  await field(page, "pin").check();
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  for (let i = 0; i < 5; i++) {
    await field(page, "distance").selectOption(i % 2 ? "480" : "720");
    await b(page, "辅助定位滚动100%").click();
    await b(page, "恢复场景起点").click();
  }
  x = await inspect(page);
  expect(x).toMatchObject({
    progress: 0,
    animationProgress: 0,
    triggerCount: 1,
    spacers: 1,
  });
  await expect(b(page, "读取真实实例与区间快照")).toBeFocused();
});
test("resize updates real geometry refresh and short viewport releases pin without hiding controls", async ({
  page,
}, info) => {
  await open(page, 2);
  await page.setViewportSize({ width: 375, height: 480 });
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(await inspect(page)).toMatchObject({
    pin: false,
    scrollerMatches: true,
    triggerCount: 1,
  });
  await b(page, "辅助定位滚动50%").click();
  await expect
    .poll(() => scrollArt(page).getAttribute("data-progress").then(Number))
    .toBeCloseTo(0.5, 2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool06-short",
      profile: info.project.name,
    });
  await k.seek(field(page, "distance"), "short select");
  await axes(page);
  await page
    .locator(".tool06-controls")
    .screenshot({ path: `${out}/${info.project.name}-short-controls.png` });
  await page.setViewportSize({ width: 900, height: 850 });
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  const x = await inspect(page);
  expect(x.end - x.start).toBeCloseTo(480, 1);
  save(info.project.name + "-resize", { trace, actual: x });
});
test("live reduced motion mid playback and scrub removes bindings preserves external focus and static stage alternatives", async ({
  page,
}, info) => {
  await open(page);
  await b(page, "播放时间线").click();
  await frames(page, "[data-time-root]", 100);
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab(page)).toHaveAttribute("data-policy", "static");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  expect(await inspect(page)).toMatchObject({
    kind: "static",
    triggerCount: 0,
    reason: "system-reduce",
  });
  await b(page, "时间线跳到50%").click();
  expect(Number(await time(page).getAttribute("data-progress"))).toBe(0.5);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await inspect(page)).toMatchObject({
    kind: "time",
    paused: true,
    progress: 0,
  });
  await stage(page, 1).click();
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await b(page, "静态示意跳到100%").click();
  await b(page, "静态示意跳到0%").click();
  expect(await inspect(page)).toMatchObject({
    kind: "static",
    progress: 0,
    triggerCount: 0,
  });
  save(info.project.name + "-live-reduce", { focus, staticButtons: true });
});
test("manual static during catchup stops tween removes pin and restore starts clean without auto play", async ({
  page,
}) => {
  await open(page, 2);
  await field(page, "scrub").selectOption("catchup");
  await b(page, "辅助定位滚动100%").click();
  await field(page, "mode").selectOption("static");
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(await inspect(page)).toMatchObject({
    kind: "static",
    triggerCount: 0,
    reason: "manual-static",
  });
  await field(page, "mode").selectOption("normal");
  expect(await inspect(page)).toMatchObject({
    progress: 0,
    animationProgress: 0,
    triggerCount: 1,
  });
});
test("hidden document stops playback plugin and old callbacks then visible restores paused fresh scene", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.isHidden06 = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.isHidden06,
    });
  });
  await open(page, 1);
  await b(page, "辅助定位滚动100%").click();
  await page.evaluate(() => {
    window.isHidden06 = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(await inspect(page)).toMatchObject({
    kind: "static",
    reason: "hidden",
    triggerCount: 0,
  });
  await page.evaluate(() => {
    window.isHidden06 = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  expect(await inspect(page)).toMatchObject({ progress: 0, triggerCount: 1 });
});
test("actual module failure static acknowledgement and reload recovery never claim GSAP success", async ({
  page,
}) => {
  await page.route("**/tool-six-runtime-*.js", (r) => r.abort("failed"));
  await open(page, 0, false);
  await expect(page.locator(".tool06-runtime")).toContainText("模块加载失败");
  await b(page, "播放时间线").click();
  await b(page, "暂停时间线").click();
  await b(page, "反向时间线").click();
  await b(page, "确认静态回退边界并继续").click();
  expect((await read(page)).runtimeSeen).toBe(false);
  expect(await inspect(page)).toMatchObject({
    kind: "static",
    reason: "module-error",
  });
  await page.unrouteAll({ behavior: "wait" });
  await b(page, "重载页面重试GSAP模块").click();
  await expect(page.locator("#stage-heading")).toBeVisible();
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-policy", "active");
  expect(await inspect(page)).toMatchObject({ kind: "time", gsap: "3.15.0" });
});
test("late module completion after leaving cannot build pin or steal newer actual Tab focus", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/tool-six-runtime-*.js", async (r) => {
    await gate;
    await r.continue();
  });
  await open(page, 1, false);
  await b(page, "返回T05复习").click();
  await expect(page.locator("#tool05-stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  release();
  await expect(page.locator(".tool06-lab")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
});
test("unmount scroll scene releases global plugin frames listeners and pin; remount has one trigger", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window),
      caf = cancelAnimationFrame.bind(window);
    window.pending06 = new Map();
    window.frames06 = 0;
    window.requestAnimationFrame = (cb) => {
      let id;
      id = raf((t) => {
        window.pending06.delete(id);
        window.frames06++;
        cb(t);
      });
      window.pending06.set(id, cb);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      caf(id);
      window.pending06.delete(id);
    };
  });
  await open(page, 1);
  await b(page, "辅助定位滚动100%").click();
  await b(page, "返回T05复习").click();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.pending06.size), { timeout: 8000 })
    .toBe(0);
  const before = await page.evaluate(() => window.frames06);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.frames06)).toBe(before);
  await b(page, "继续T06 · GSAP / ScrollTrigger").click();
  await stage(page, 1).click();
  expect(await inspect(page)).toMatchObject({ triggerCount: 1, spacers: 1 });
  save(info.project.name + "-unmount-cleanup", {
    noPendingFrames: true,
    before,
    remount: await inspect(page),
  });
});
test("rapid reset repeated controls leave exactly current state and keep immediate focus on stable reset", async ({
  page,
}) => {
  await open(page, 2);
  for (let i = 0; i < 6; i++) {
    await b(page, "辅助定位滚动100%").click();
    await b(page, "恢复场景起点").click();
    await expect(b(page, "恢复场景起点")).toBeFocused();
    await expect(lab(page)).toHaveAttribute("data-scroll-progress", "0.00000");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
  }
  await stage(page, 0).click();
  await b(page, "播放时间线").click();
  await b(page, "恢复场景起点").click();
  await expect(b(page, "恢复场景起点")).toBeFocused();
  expect(await inspect(page)).toMatchObject({
    time: 0,
    paused: true,
    triggerCount: 0,
  });
});
test("quiz incorrect explanations allow retry and brief separates seconds distance scrub pin and license", async ({
  page,
}) => {
  await open(page, 3);
  await b(page, "完成并继续").click();
  await expect(page.locator(".notice")).toContainText("先完成");
  for (let i = 0; i < 3; i++) {
    const q = page.locator(".quiz-grid fieldset").nth(i);
    await q
      .getByRole("button")
      .nth(1 - tool06Questions[i].correct)
      .click();
    await expect(q).toContainText("再想一想");
    await q.getByRole("button").nth(tool06Questions[i].correct).click();
    await expect(q).toContainText(tool06Questions[i].why);
  }
  for (const s of [
    "0.8–1.6",
    "480px",
    "scrub=true",
    "pin",
    "CSS",
    "Motion",
    "清理",
    "T08–T12仍为5个预告",
    "不是MIT",
    "不提供任意动画创作",
  ])
    expect(tool06Brief(good())).toContain(s);
});
test("editable brief keeps user context edits and requires explicit retain or regeneration after changed parameters", async ({
  page,
}) => {
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  const text = await draft(page).inputValue();
  await draft(page).fill(text + "\n自己的性能与回滚约定。");
  await field(page, "context").fill("新的项目现状");
  await expect(draft(page)).toHaveValue(text + "\n自己的性能与回滚约定。");
  const review = page.getByRole("checkbox", {
    name: "我已核对时间阶段、滚动区间、pin/scrub目的和回退验收。",
    exact: true,
  });
  await expect(review).toBeDisabled();
  await b(page, "保留编辑并确认当前实验参数").click();
  await review.check();
  await b(page, "重新生成工具选型草稿").click();
  expect(await draft(page).inputValue()).not.toContain(
    "自己的性能与回滚约定。",
  );
  expect((await read(page)).reviewed).toBe(false);
});
test("clipboard snapshot success never overwrites edits and source text is not sent or executed", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) => {
          window.copied06 = t;
          return new Promise((r) => (window.release06 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  const text = await draft(page).inputValue();
  await b(page, "复制工具选型说明").click();
  await draft(page).fill(text + "\n随后编辑");
  await page.evaluate(() => window.release06());
  await expect(page.locator(".copy-feedback")).toContainText("点击时的版本");
  expect(await page.evaluate(() => window.copied06)).toBe(text);
  await expect(draft(page)).toHaveValue(text + "\n随后编辑");
});
test("late clipboard rejection respects newer outside real Tab focus and offers manual copying only when owned", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => new Promise((_, r) => (window.reject06 = r)) },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await page.evaluate(() => window.reject06(Error("fixture denied")));
  await expect(draft(page)).toBeFocused();
  expect(
    await draft(page).evaluate((e) => e.selectionEnd - e.selectionStart),
  ).toBe((await draft(page).inputValue()).length);
  await b(page, "复制工具选型说明").click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.reject06(Error("fixture denied")));
  await expect(page.locator(".copy-feedback")).toContainText(
    "当前焦点保持不变",
  );
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
test("copy mutex reset and old completion cannot revive cleared draft or reclaim newer focus", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => {
          window.calls06 = (window.calls06 || 0) + 1;
          return new Promise((r) => (window.release06 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.calls06)).toBe(1);
  await b(page, "重置T06工具专题进度").click();
  await b(page, "确认重置T06工具专题").click();
  await expect(field(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.release06());
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  expect((await read(page)).draft).toBe("");
  await expect(page.locator(".copy-feedback")).toHaveCount(0);
});

for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and scoped actual controls crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    await axes(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".stage-intro").screenshot({
      path: `${out}/${info.project.name}-station${n + 1}-intro.png`,
    });
    if (n < 3) {
      await inspect(page);
      await axes(page);
      await page.locator(".tool06-controls").screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-controls.png`,
      });
      await page
        .locator(n === 0 ? "[data-time-root]" : ".tool06-viewport")
        .screenshot({
          path: `${out}/${info.project.name}-station${n + 1}-scene.png`,
        });
    } else
      await page.locator(n === 3 ? ".quiz-grid" : ".agent-editor").screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-body.png`,
      });
  });
const priorKeys = [
  ...Array.from(
    { length: 32 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  "frontend-observatory.stageA.v1",
  "frontend-observatory.stageB.v1",
  ...Array.from(
    { length: 5 },
    (_, i) => `frontend-observatory.tool0${i + 1}.v1`,
  ),
];
async function priors(p) {
  await p.addInitScript((ks) => {
    if (window === top)
      for (const [i, k] of ks.entries())
        if (!localStorage.getItem(k))
          localStorage.setItem(
            k,
            JSON.stringify({ step: 0, done: [0], marker: "prior" + i }),
          );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(Error("denied fixture")) },
    });
  }, priorKeys);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), priorKeys);
}
async function complete(p, act, select, type, toggle = act) {
  await expect(p.locator(".tool06-runtime")).not.toContainText("模块准备中");
  await act(b(p, "多段时间与滚动编排"), "need");
  await act(b(p, "播放时间线"), "play");
  await act(b(p, "暂停时间线"), "pause");
  await act(b(p, "反向时间线"), "reverse");
  await act(b(p, "完成并继续"), "station0");
  await expect(p.locator(".tool06-runtime")).not.toContainText("模块准备中");
  const staticMode = (await lab(p).getAttribute("data-policy")) === "static";
  await act(
    b(p, staticMode ? "静态示意跳到100%" : "辅助定位滚动100%"),
    "scroll forward",
  );
  await act(
    b(p, staticMode ? "静态示意跳到0%" : "辅助定位滚动0%"),
    "scroll back",
  );
  await act(b(p, "读取真实实例与区间快照"), "inspect");
  await act(b(p, "完成并继续"), "station1");
  await toggle(field(p, "pin"), "pin");
  await select(field(p, "scrub"), "catchup");
  await act(b(p, "恢复场景起点"), "reset scene");
  await act(b(p, "完成并继续"), "station2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool06Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool06Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "sample");
  await type(field(p, "context"), " 用户补充：允许静态，不锁阅读。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(draft(p), "\n用户编辑：核对区间与清理。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对时间阶段、滚动区间、pin/scrub目的和回退验收。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T06工具专题"), "finish");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T06工具专题进度"), "reset cancel");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T06工具专题进度"), "cancel reset");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T06工具专题进度")).toBeFocused();
  await act(b(p, "重置T06工具专题进度"), "reset confirm");
  await act(b(p, "确认重置T06工具专题"), "confirm reset");
  await expect(field(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    context: "",
    draft: "",
  });
}
test("real Tab complete five stations GSAP ScrollTrigger retry actual edits copy refresh cancel confirm reset preserves39", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool06-full",
      profile: info.project.name,
    });
  await directory(page, k.act);
  const select = async (l, v) => {
      await k.seek(l, "native select");
      const vs = await l
        .locator("option")
        .evaluateAll((es) => es.map((e) => e.value));
      await page.keyboard.press("Home");
      for (let i = 0; i < vs.indexOf(v); i++)
        await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(l).toHaveValue(v);
    },
    type = async (l, t) => {
      await k.seek(l, "real edit");
      await page.keyboard.press("End");
      await page.keyboard.type(t);
    };
  await complete(page, k.act, select, type, k.toggle);
  const text = (await read(page)).draft;
  await page.reload();
  await directory(page, k.act);
  await expect(draft(page)).toHaveValue(text);
  await reset(page, k.act, true);
  expect(
    await page.evaluate(
      (ks) => ks.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(prior);
  writeFileSync(
    `${out}/${info.project.name}-keyboard-full.json`,
    JSON.stringify(trace, null, 2),
  );
});
for (const reducedMotion of ["no-preference", "reduce"])
  test(`zero keyboard touch full ${reducedMotion} actual GSAP or explicit static path retry refresh reset`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        reducedMotion,
      }),
      p = await c.newPage();
    await p.addInitScript(() => {
      window.keyEvents05 = 0;
      addEventListener("keydown", () => window.keyEvents05++);
    });
    const prior = await priors(p),
      actions = [],
      act = async (l, n) => {
        await l.tap();
        actions.push(n);
      };
    await directory(p, act);
    await complete(
      p,
      act,
      (l, v) => l.selectOption(v),
      async (l, t) => l.fill((await l.inputValue()) + t),
    );
    const text = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(draft(p)).toHaveValue(text);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keyEvents05)).toBe(0);
    expect(
      await p.evaluate(
        (ks) => ks.map((k) => localStorage.getItem(k)),
        priorKeys,
      ),
    ).toEqual(prior);
    writeFileSync(
      `${out}/${info.project.name}-touch-${reducedMotion}.json`,
      JSON.stringify(
        {
          actions,
          keyEvents: 0,
          fixtures:
            "actual taps plus fill/selectOption fixtures; not OS picker/IME or physical phone",
        },
        null,
        2,
      ),
    );
    await c.close();
  });
test("T05 exit opens real T06 nine available tags five readonly tools and keeps numbered32", async ({
  page,
}) => {
  await open(page);
  await b(page, "返回T05复习").click();
  await b(page, "继续T06 · GSAP / ScrollTrigger").click();
  await expect(field(page, "stage-heading")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(9);
  await expect(nav.locator(".coverage-preview")).toHaveCount(5);
  await expect(nav.getByRole("button", { name: /T07/ })).toHaveCount(1);
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator('[data-lesson-id="40"]')).toHaveCount(0);
});
test("corrupt and unavailable storage are bounded and do not prevent real GSAP controls", async ({
  page,
  browser,
}) => {
  await seed(page, {
    ...good(),
    step: 99,
    done: [0, 0, 4, -1, 99],
    needsSeen: ["gsap", "wrong"],
    scrub: "wrong",
    mode: "wrong",
    distance: "wrong",
    context: "x".repeat(900),
    draft: "x".repeat(20000),
    reviewed: true,
    draftStale: true,
  });
  await open(page);
  const d = await read(page);
  expect(d).toMatchObject({
    step: 0,
    done: [0, 4],
    mode: "normal",
    scrub: "direct",
    distance: "480",
    needsSeen: ["gsap"],
    reviewed: false,
  });
  expect(d.context).toHaveLength(700);
  expect(d.draft).toHaveLength(10000);
  const c = await browser.newContext();
  const p = await c.newPage();
  await p.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw Error("fixture");
    };
    Storage.prototype.setItem = () => {
      throw Error("fixture");
    };
    Storage.prototype.removeItem = () => {
      throw Error("fixture");
    };
  });
  await open(p);
  await b(p, "播放时间线").click();
  await b(p, "暂停时间线").click();
  await expect(p.locator("body")).toContainText("浏览器存储不可用");
  await c.close();
});

test("actual touch pan scrolls the local region and outside page normally without changing timeline owner", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await c.newPage();
  await open(p, 1);
  await region(p).scrollIntoViewIfNeeded();
  const r = await region(p).boundingBox();
  const session = await c.newCDPSession(p);
  async function pan(x, y, dy) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 8; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + (dy * i) / 8 }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await pan(r.x + r.width / 2, r.y + r.height - 35, -160);
  await expect
    .poll(() => region(p).evaluate((e) => e.scrollTop))
    .toBeGreaterThan(50);
  await expect
    .poll(() => lab(p).getAttribute("data-scroll-progress").then(Number))
    .toBeGreaterThan(0);
  await p.locator(".stage-intro").scrollIntoViewIfNeeded();
  const outerBefore = await p.evaluate(() => scrollY);
  await pan(5, 650, -160);
  await expect
    .poll(() => p.evaluate(() => scrollY))
    .toBeGreaterThan(outerBefore + 20);
  save(info.project.name + "-actual-touch-pan", {
    scrollTop: await region(p).evaluate((e) => e.scrollTop),
    actual: await inspect(p),
    input:
      "CDP touchStart/move/end, not physical device or direct scroll assignment",
  });
  await c.close();
});
test("GSAP owned global input listeners are removed after unmount", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener;
    window.listener06 = [];
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (
        (this === window || this === document || this === document.body) &&
        new Error().stack.includes("tool-six-runtime-")
      )
        window.listener06.push({
          target: this,
          type,
          fn,
          capture: typeof opts === "boolean" ? opts : !!opts?.capture,
        });
      return add.call(this, type, fn, opts);
    };
    EventTarget.prototype.removeEventListener = function (type, fn, opts) {
      const capture = typeof opts === "boolean" ? opts : !!opts?.capture;
      window.listener06 = window.listener06.filter(
        (x) =>
          !(
            x.target === this &&
            x.type === type &&
            x.fn === fn &&
            x.capture === capture
          ),
      );
      return remove.call(this, type, fn, opts);
    };
  });
  await open(page, 1);
  const before = await page.evaluate(() =>
    window.listener06.map((x) => ({ type: x.type, name: x.fn?.name })),
  );
  expect(before.length).toBeGreaterThan(0);
  await b(page, "返回T05复习").click();
  const after = await page.evaluate(() =>
    window.listener06.map((x) => ({
      type: x.type,
      name: x.fn?.name,
      body: String(x.fn).slice(0, 180),
    })),
  );
  save(info.project.name + "-listeners", { before, after });
  expect(after).toEqual([]);
});

test("delayed navigation title callback respects newer actual Tab control focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window);
    window.held06 = [];
    window.hold06 = false;
    window.requestAnimationFrame = (cb) =>
      raf((t) => (window.hold06 ? window.held06.push(cb) : cb(t)));
  });
  await open(page);
  await page.evaluate(() => (window.hold06 = true));
  await stage(page, 1).click();
  await expect
    .poll(() => page.evaluate(() => window.held06.length))
    .toBeGreaterThan(0);
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool06-late-title",
    profile: "native",
  });
  await k.seek(field(page, "distance"), "new native select");
  await page.evaluate(() => {
    window.hold06 = false;
    window.held06.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(field(page, "distance")).toBeFocused();
  expect(await inspect(page)).toMatchObject({
    kind: "scroll",
    triggerCount: 1,
  });
});
test("topic reset while actual module is delayed ignores old generation and builds only current scene", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/tool-six-runtime-*.js", async (r) => {
    await gate;
    await r.continue();
  });
  await open(page, 1, false);
  await b(page, "重置T06工具专题进度").click();
  await b(page, "确认重置T06工具专题").click();
  await expect(field(page, "stage-heading")).toBeFocused();
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool06-reset-load",
    profile: "native",
  });
  await k.seek(field(page, "mode"), "new strategy");
  release();
  await expect(lab(page)).toHaveAttribute("data-policy", "active");
  await expect(field(page, "mode")).toBeFocused();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(await inspect(page)).toMatchObject({
    kind: "time",
    paused: true,
    progress: 0,
    triggerCount: 0,
  });
});

test("GSAP media-query subscriptions are owned and removed across resets static and unmount", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.media06 = [];
    window.originalMatch06 = window.matchMedia;
    window.externalMedia06 = window.matchMedia("(max-width: 500px)");
    window.externalCount06 = 0;
    window.externalMedia06.addEventListener(
      "change",
      () => window.externalCount06++,
    );
    for (const [addName, removeName] of [
      ["addListener", "removeListener"],
      ["addEventListener", "removeEventListener"],
    ]) {
      const add = MediaQueryList.prototype[addName],
        remove = MediaQueryList.prototype[removeName];
      MediaQueryList.prototype[addName] = function (...args) {
        const fn = addName === "addListener" ? args[0] : args[1];
        if (new Error().stack.includes("tool-six-runtime-"))
          window.media06.push({ target: this, fn, query: this.media });
        return add.apply(this, args);
      };
      MediaQueryList.prototype[removeName] = function (...args) {
        const fn = removeName === "removeListener" ? args[0] : args[1];
        window.media06 = window.media06.filter(
          (x) => !(x.target === this && x.fn === fn),
        );
        return remove.apply(this, args);
      };
    }
  });
  await open(page, 1);
  const initialService = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .find((e) => /tool-six-runtime-[^/]+\.js/.test(e.name)).name;
    const module = await import(url);
    window.readService06 = module.getServiceState;
    return module.getServiceState();
  });
  expect(initialService).toMatchObject({
    methodsRestored: true,
    pluginEnabled: true,
    triggerCount: 1,
  });
  for (let i = 0; i < 3; i++) await b(page, "恢复场景起点").click();
  const during = await page.evaluate(() => window.media06.map((x) => x.query));
  expect(during).toEqual(["(orientation: portrait)"]);
  await b(page, "返回T05复习").click();
  const after = await page.evaluate(() => window.media06.map((x) => x.query));
  const service = await page.evaluate(() => window.readService06());
  const methodsRestored = service.methodsRestored;
  expect(methodsRestored).toBe(true);
  const globalRestored = await page.evaluate(
    () => window.matchMedia === window.originalMatch06,
  );
  expect(globalRestored).toBe(true);
  const externalBefore = await page.evaluate(() => window.externalCount06);
  await page.evaluate(() =>
    window.externalMedia06.dispatchEvent(new Event("change")),
  );
  const externalAfter = await page.evaluate(() => window.externalCount06);
  save(info.project.name + "-media-subscriptions", {
    during,
    after,
    globalRestored,
    methodsRestored,
    externalBefore,
    externalAfter,
    service,
    externalPreserved: externalAfter === externalBefore + 1,
  });
  expect(externalAfter).toBe(externalBefore + 1);
  expect(service).toEqual({
    methodsRestored: true,
    pluginEnabled: false,
    triggerCount: 0,
    globalAnimationCount: 0,
  });
  expect(after).toEqual([]);
});

for (const shortViewport of [false, true])
  for (const distance of ["480", "720"])
    test(`pin-off ${distance}px ${shortViewport ? "automatic-short" : "explicit-normal"} real scroll maximum and helper reach end then native Home returns`, async ({
      page,
    }, info) => {
      await open(page, 2);
      if (shortViewport)
        await page.setViewportSize({ width: 375, height: 480 });
      else await field(page, "pin").uncheck();
      await field(page, "distance").selectOption(distance);
      await expect(page.locator(".pin-spacer")).toHaveCount(0);
      await expect(lab(page)).toHaveAttribute("data-pin", "false");
      await b(page, "辅助定位滚动100%").click();
      const helper = await inspect(page);
      const dimensions = await region(page).evaluate((el) => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        maxScrollTop: el.scrollHeight - el.clientHeight,
      }));
      await b(page, "辅助定位滚动0%").click();
      const trace = [],
        k = createKeyboardNavigator(page, expect, trace, {
          lesson: "tool06-pin-off-bounds",
          profile: info.project.name,
        });
      await k.seek(region(page), "pin-off native scroll viewport");
      await region(page).evaluate((el) => {
        el.dataset.completedScrolls = "0";
        el.addEventListener(
          "scrollend",
          () =>
            (el.dataset.completedScrolls = String(
              Number(el.dataset.completedScrolls) + 1,
            )),
        );
      });
      const outer = await page.evaluate(() => scrollY);
      await page.keyboard.press("End");
      await expect
        .poll(() =>
          region(page).getAttribute("data-completed-scrolls").then(Number),
        )
        .toBeGreaterThan(0);
      await expect(region(page)).toBeFocused();
      const nativeEnd = await lab(page).evaluate((el) => {
        const v = el.querySelector(".tool06-viewport"),
          a = el.querySelector("[data-scroll-art]");
        return {
          top: v.scrollTop,
          max: v.scrollHeight - v.clientHeight,
          progress: Number(el.dataset.scrollProgress),
          animationProgress: Number(a.dataset.progress),
        };
      });
      const endCount = Number(
        await region(page).getAttribute("data-completed-scrolls"),
      );
      await page.keyboard.press("Home");
      await expect
        .poll(() =>
          region(page).getAttribute("data-completed-scrolls").then(Number),
        )
        .toBeGreaterThan(endCount);
      await expect(region(page)).toBeFocused();
      const nativeHome = await lab(page).evaluate((el) => ({
        top: el.querySelector(".tool06-viewport").scrollTop,
        progress: Number(el.dataset.scrollProgress),
        animationProgress: Number(
          el.querySelector("[data-scroll-art]").dataset.progress,
        ),
      }));
      save(
        `${info.project.name}-pin-off-${distance}-${shortViewport ? "short" : "normal"}`,
        {
          helper,
          dimensions,
          nativeEnd,
          nativeHome,
          outer,
          trace,
          input:
            "Actual helper native scrollTo + genuine Tab/End/Home with native scrollend; no scripted focus or timeline.progress assignment.",
        },
      );
      expect(dimensions.maxScrollTop).toBeGreaterThanOrEqual(helper.end);
      expect(helper.end - helper.start).toBeCloseTo(Number(distance), 1);
      expect(helper.progress).toBe(1);
      expect(helper.animationProgress).toBe(1);
      expect(nativeEnd.top).toBe(nativeEnd.max);
      expect(nativeEnd.progress).toBe(1);
      expect(nativeEnd.animationProgress).toBe(1);
      expect(nativeHome).toEqual({ top: 0, progress: 0, animationProgress: 0 });
      expect(await page.evaluate(() => scrollY)).toBe(outer);
    });

test("pin flow runway switches resize reduce and teardown preserve real reachable bounds without leftover layout", async ({
  page,
}, info) => {
  await open(page, 2);
  await field(page, "distance").selectOption("720");
  const track = page.locator("[data-scroll-track]");
  const capture = async (name, pin) => {
    await b(page, "辅助定位滚动100%").click();
    await expect
      .poll(() => scrollArt(page).getAttribute("data-progress").then(Number))
      .toBe(1);
    const x = await inspect(page);
    expect(x.maxScrollTop).toBeGreaterThanOrEqual(x.end);
    expect(x).toMatchObject({
      pin,
      progress: 1,
      animationProgress: 1,
      triggerCount: 1,
    });
    expect(x.flowRunwayPx).toBe(pin ? 0 : 720);
    return { name, ...x };
  };
  const rows = [];
  rows.push(await capture("pin-on", true));
  await field(page, "pin").uncheck();
  await expect(page.locator("[data-snapshot]")).toHaveCount(0);
  rows.push(await capture("explicit-off", false));
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await field(page, "pin").check();
  rows.push(await capture("pin-on-again", true));
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  await page.setViewportSize({ width: 375, height: 480 });
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  rows.push(await capture("automatic-short-off", false));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  rows.push(await capture("restored-pin", true));
  await field(page, "pin").uncheck();
  rows.push(await capture("off-before-reduce", false));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab(page)).toHaveAttribute("data-policy", "static");
  await expect
    .poll(() => track.evaluate((e) => getComputedStyle(e).paddingBottom))
    .toBe("0px");
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(await inspect(page)).toMatchObject({
    kind: "static",
    triggerCount: 0,
  });
  await b(page, "静态示意跳到100%").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(lab(page)).toHaveAttribute("data-policy", "active");
  rows.push(await capture("normal-after-reduce", false));
  await field(page, "mode").selectOption("static");
  await expect
    .poll(() => track.evaluate((e) => getComputedStyle(e).paddingBottom))
    .toBe("0px");
  await field(page, "mode").selectOption("normal");
  rows.push(await capture("normal-after-manual-static", false));
  await b(page, "恢复场景起点").click();
  await expect(b(page, "恢复场景起点")).toBeFocused();
  expect(await inspect(page)).toMatchObject({
    progress: 0,
    animationProgress: 0,
    triggerCount: 1,
    flowRunwayPx: 720,
  });
  const handle = await track.elementHandle();
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .find((e) => /tool-six-runtime-[^/]+\.js/.test(e.name)).name;
    window.pinFixService = (await import(url)).getServiceState;
  });
  await b(page, "返回T05复习").click();
  await expect(page.locator("#tool05-stage-heading")).toBeVisible();
  await expect(lab(page)).toHaveCount(0);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(
    await handle.evaluate((e) => ({
      connected: e.isConnected,
      padding: e.style.paddingBottom,
    })),
  ).toEqual({ connected: false, padding: "" });
  expect(await page.evaluate(() => window.pinFixService())).toEqual({
    methodsRestored: true,
    pluginEnabled: false,
    triggerCount: 0,
    globalAnimationCount: 0,
  });
  save(info.project.name + "-pin-runway-lifecycle", {
    rows,
    staticPaddingRestored: true,
    teardownPaddingRestored: true,
  });
});
