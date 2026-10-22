import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  sceneInitial,
  canvasPoint,
  canvasView,
  canvasHit,
  clampShape,
} from "../src/lesson-twenty-four-content.js";
const out = "/tmp/canvas-acceptance",
  key = "frontend-observatory.lesson24.v1",
  prior = Array.from(
    { length: 23 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".canvas24-lab"),
  canvas = (p) => p.locator(".canvas24-wrapper canvas"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十四节学习步骤" })
      .getByRole("button")
      .nth(n),
  object = (p, id) => p.locator(`[data-canvas-object="${id}"]`);
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(23), "lesson24");
  await expect(p.locator("#canvas-stage-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  if (n < 3) await drawn(p, 3);
}
async function drawn(p, n) {
  await expect(lab(p)).toHaveAttribute("data-count", String(n));
  await expect(canvas(p)).toHaveAttribute("data-drawn-objects", String(n));
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
async function pixel(p, x, y) {
  return canvas(p).evaluate(
    (e, [x, y]) => {
      const ctx = e.getContext("2d"),
        m = ctx.getTransform();
      return [
        ...ctx.getImageData(
          Math.round(m.a * x + m.c * y + m.e),
          Math.round(m.b * x + m.d * y + m.f),
          1,
          1,
        ).data,
      ];
    },
    [x, y],
  );
}
async function blank(p) {
  return canvas(p).evaluate((e) => {
    const a = e.getContext("2d").getImageData(0, 0, e.width, e.height).data;
    let painted = 0;
    for (let i = 3; i < a.length; i += 4) if (a[i]) painted++;
    return painted;
  });
}
async function hit(p, x, y, z = 1) {
  await canvas(p).scrollIntoViewIfNeeded();
  const b = await canvas(p).boundingBox(),
    s = Math.min(b.width / 600, b.height / 360) * z,
    ox = (b.width - 600 * s) / 2,
    oy = (b.height - 360 * s) / 2;
  await p.mouse.click(b.x + ox + x * s, b.y + oy + y * s);
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
  window.canvasFrames = [];
  window.holdCanvasFrame = false;
  window.canvasFrameMap = new Map();
  window.requestAnimationFrame = (cb) => {
    let id;
    id = raf((t) => {
      window.canvasFrameMap.delete(id);
      if (window.holdCanvasFrame) window.canvasFrames.push(cb);
      else cb(t);
    });
    window.canvasFrameMap.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    caf(id);
    window.canvasFrameMap.delete(id);
  };
}
test("logical view inversion, topmost geometry hit and full-shape bounds", () => {
  const scene = sceneInitial();
  expect(canvasHit(scene.items, 140, 110)).toBe("A");
  expect(canvasHit(scene.items, 0, 0)).toBe(null);
  expect(
    canvasHit([...scene.items, { ...scene.items[0], id: "top" }], 140, 110),
  ).toBe("top");
  const b = { left: 100, top: 50, width: 300, height: 180 };
  expect(canvasPoint(250, 140, b, 1.25)).toEqual({ x: 300, y: 180 });
  expect(canvasPoint(1, 1, { ...b, width: 0, height: 0 })).toEqual({
    x: -1,
    y: -1,
  });
  expect(clampShape(scene.items[0], -100, 1000)).toMatchObject({
    x: 34,
    y: 326,
  });
  expect(canvasView(300, 180, 0.75).scale).toBe(0.375);
});
test("lazy Canvas release01–24 only, next WebGL remains preview and local requests", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-twenty-four-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(urls.some((u) => /lesson-twenty-four-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Canvas · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(24);
  expect(urls.filter((u) => !u.startsWith("http://127.0.0.1:4173/"))).toEqual(
    [],
  );
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(24).click();
  await expect(
    page.getByRole("heading", { name: "WebGL/Shader", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("actual2D pixels, transparent corner, no per-shape canvas DOM; resize retains model and redraws", async ({
  page,
}, info) => {
  await open(page);
  expect(await pixel(page, 120, 110)).toEqual([112, 98, 173, 255]);
  const meta = await canvas(page).evaluate((e) => ({
    tag: e.tagName,
    children: e.childElementCount,
    css: e.getBoundingClientRect().toJSON(),
    width: e.width,
    height: e.height,
    dpr: devicePixelRatio,
    corner: [...e.getContext("2d").getImageData(0, 0, 1, 1).data],
  }));
  expect(meta.children).toBe(0);
  expect(meta.corner).toEqual([0, 0, 0, 0]);
  await btn(page, "添加圆形").click();
  await drawn(page, 4);
  await object(page, "B").click();
  await btn(page, "所选向右30").click();
  await expect(object(page, "B").locator("..")).toContainText("350, 185");
  await page.setViewportSize({ width: 375, height: 620 });
  await drawn(page, 4);
  await expect(object(page, "B").locator("..")).toContainText("350, 185");
  expect((await pixel(page, 440, 110))[3]).toBe(255);
  await fit(page);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/native-${info.project.name}.json`,
    JSON.stringify(
      { passed: true, meta, afterResizeObjects: 4, positionRetained: true },
      null,
      2,
    ),
  );
});
test("real canvas click after zoom and page scroll selects same object; empty click only deselects", async ({
  page,
}) => {
  await open(page, 1);
  for (const z of [0.75, 1.25, 1]) {
    await btn(page, `视图${Math.round(z * 100)}%`).click();
    await hit(page, 460, 110, z);
    await expect(lab(page)).toHaveAttribute("data-selected", "C");
    await expect(object(page, "C")).toHaveAttribute("aria-pressed", "true");
  }
  await page.evaluate(() => scrollBy(0, 35));
  await hit(page, 140, 110);
  await expect(lab(page)).toHaveAttribute("data-selected", "A");
  await hit(page, 20, 20);
  await expect(lab(page)).toHaveAttribute("data-selected", "none");
  await drawn(page, 3);
});
test("rapid additions cap8 unique IDs; actual move bounds, delete and model undo preserve editable scene", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "添加圆形",
    );
    for (let i = 0; i < 12; i++) b.click();
  });
  await drawn(page, 8);
  expect(
    new Set(
      await page
        .locator("[data-canvas-object]")
        .evaluateAll((es) => es.map((e) => e.dataset.canvasObject)),
    ).size,
  ).toBe(8);
  await expect(page.locator(".canvas24-status")).toContainText("上限8");
  await object(page, "A").click();
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "所选向左30",
    );
    for (let i = 0; i < 25; i++) b.click();
  });
  await expect(object(page, "A").locator("..")).toContainText("34, 110");
  await btn(page, "所选向左30").click();
  await expect(page.locator(".canvas24-status")).toContainText("边界");
  await btn(page, "删除所选").click();
  await drawn(page, 7);
  await btn(page, "撤销一步").click();
  await drawn(page, 8);
  await expect(object(page, "A").locator("..")).toContainText("34, 110");
});
test("empty canvas really clears all alpha, retains controls and undo restores original pixel data", async ({
  page,
}) => {
  await open(page, 2);
  await btn(page, "清空画布").click();
  await drawn(page, 0);
  expect(await blank(page)).toBe(0);
  await expect(
    page.getByText("没有对象。添加、撤销和恢复初始入口都在画布外保留。", {
      exact: true,
    }),
  ).toBeVisible();
  await btn(page, "删除所选").click();
  await expect(btn(page, "删除所选")).toBeFocused();
  await expect(page.locator(".canvas24-status")).toContainText("未执行删除");
  await btn(page, "撤销一步").click();
  await drawn(page, 3);
  expect(await pixel(page, 120, 110)).toEqual([112, 98, 173, 255]);
  await expect(btn(page, "撤销一步")).toBeFocused();
  await btn(page, "清空画布").click();
  await btn(page, "恢复初始图形").click();
  await drawn(page, 3);
  await btn(page, "撤销一步").click();
  await drawn(page, 0);
  await axeCheck(page);
});
test("semi-transparent fill pixels preserve alpha while geometric selection stays explicit", async ({
  page,
}) => {
  await open(page, 2);
  await page.getByLabel("半透明图形（40%不透明度）", { exact: true }).check();
  await btn(page, "读取尺寸与重绘").click();
  const rgba = await pixel(page, 440, 110);
  expect(rgba[3]).toBeCloseTo(102, 0);
  await hit(page, 460, 110);
  await expect(lab(page)).toHaveAttribute("data-selected", "C");
  await expect(page.locator(".canvas24-lab")).toContainText(
    "半透明不代表点击穿透",
  );
});
test("real long press, moved press and synthetic cancel do not select or modify shapes", async ({
  page,
}) => {
  await open(page);
  await canvas(page).scrollIntoViewIfNeeded();
  const b = await canvas(page).boundingBox(),
    s = Math.min(b.width / 600, b.height / 360),
    x = b.x + (b.width - 600 * s) / 2 + 460 * s,
    y = b.y + (b.height - 360 * s) / 2 + 110 * s;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(lab(page)).toHaveAttribute("data-selected", "A");
  await canvas(page).dispatchEvent("pointerdown", {
    pointerId: 9,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  await canvas(page).dispatchEvent("pointercancel", { pointerId: 9 });
  await canvas(page).dispatchEvent("pointerup", {
    pointerId: 9,
    clientX: x,
    clientY: y,
  });
  await expect(lab(page)).toHaveAttribute("data-selected", "A");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y);
  await page.mouse.up();
  await expect(lab(page)).toHaveAttribute("data-selected", "A");
  await drawn(page, 3);
});
test("coalesced redraw adopts latest scene, no idle RAF; old unmounted frames cannot repaint new canvas", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => {
    window.holdCanvasFrame = true;
    const b = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "添加圆形",
    );
    for (let i = 0; i < 4; i++) b.click();
  });
  await expect
    .poll(() => page.evaluate(() => window.canvasFrames.length))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.canvasFrames.length)).toBeLessThan(4);
  await page.evaluate(() => {
    window.holdCanvasFrame = false;
    window.canvasFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await drawn(page, 7);
  await expect
    .poll(() => page.evaluate(() => window.canvasFrameMap.size))
    .toBe(0);
  await page.evaluate(() => (window.holdCanvasFrame = true));
  await btn(page, "添加矩形").click();
  await expect
    .poll(() => page.evaluate(() => window.canvasFrames.length))
    .toBeGreaterThan(0);
  await stage(page, 1).click();
  await page.evaluate(() => {
    window.holdCanvasFrame = false;
    window.canvasFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await drawn(page, 3);
  await expect
    .poll(() => page.evaluate(() => window.canvasFrameMap.size))
    .toBe(0);
});
test("unavailable context preserves scene/list and retries real2D without DOM shape replacement", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    window.noCanvas = true;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      return window.noCanvas && args[0] === "2d" ? null : get.apply(this, args);
    };
  });
  await page.goto("/");
  await directory(page);
  await expect(page.locator(".canvas24-fallback")).toContainText(
    "未用DOM图形冒充",
  );
  await btn(page, "添加圆形").click();
  await expect(lab(page)).toHaveAttribute("data-count", "4");
  await object(page, "B").click();
  await btn(page, "所选向右30").click();
  await expect(object(page, "B").locator("..")).toContainText("350, 185");
  expect(await canvas(page).evaluate((e) => e.childElementCount)).toBe(0);
  await page.evaluate(() => (window.noCanvas = false));
  await btn(page, "读取尺寸与重绘").click();
  await drawn(page, 4);
  await expect(page.locator(".canvas24-fallback")).toHaveCount(0);
  expect((await pixel(page, 440, 110))[3]).toBe(255);
});
for (const dpr of [1, 2])
  test(`DPR${dpr} real browser density bitmap and pixel sampling`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: dpr,
        baseURL: "http://127.0.0.1:4173",
      }),
      p = await c.newPage();
    await open(p, 2);
    const sample = await canvas(p).evaluate((e) => {
      const r = e.getBoundingClientRect(),
        ctx = e.getContext("2d"),
        m = ctx.getTransform();
      return {
        css: { width: r.width, height: r.height },
        bitmap: { width: e.width, height: e.height },
        dpr: devicePixelRatio,
        transform: { a: m.a, d: m.d, e: m.e, f: m.f },
        corner: [...ctx.getImageData(0, 0, 1, 1).data],
        core: [
          ...ctx.getImageData(
            Math.round(m.a * 120 + m.e),
            Math.round(m.d * 110 + m.f),
            1,
            1,
          ).data,
        ],
      };
    });
    expect(sample.dpr).toBe(dpr);
    expect(sample.bitmap.width).toBe(Math.round(sample.css.width * dpr));
    expect(sample.bitmap.height).toBe(Math.round(sample.css.height * dpr));
    expect(sample.core).toEqual([112, 98, 173, 255]);
    expect(sample.corner).toEqual([0, 0, 0, 0]);
    mkdirSync(out, { recursive: true });
    await canvas(p).screenshot({
      path: `${out}/dpr${dpr}-${info.project.name}.png`,
    });
    writeFileSync(
      `${out}/dpr${dpr}-${info.project.name}.json`,
      JSON.stringify(
        {
          passed: true,
          fixture: "browser deviceScaleFactor, not physical display",
          sample,
        },
        null,
        2,
      ),
    );
    await c.close();
  });
test("live DPR override plus resize keeps scene and resets backing context correctly", async ({
  page,
}) => {
  await open(page);
  await btn(page, "添加矩形").click();
  await drawn(page, 4);
  await page.evaluate(() => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2.5,
    });
    dispatchEvent(new Event("resize"));
  });
  await btn(page, "读取尺寸与重绘").click();
  await expect(page.locator(".canvas24-metrics")).toContainText("DPR 2.50");
  const m = await canvas(page).evaluate((e) => ({
    w: e.width,
    css: e.getBoundingClientRect().width,
  }));
  expect(m.w).toBe(Math.round(m.css * 2.5));
  await drawn(page, 4);
  expect((await pixel(page, 440, 110))[3]).toBe(255);
});
test("focused list item removal restores only owned focus, external focus remains untouched", async ({
  page,
}) => {
  await open(page);
  await object(page, "A").focus();
  await btn(page, "删除所选").dispatchEvent("click");
  await expect(btn(page, "添加圆形")).toBeFocused();
  await btn(page, "撤销一步").click();
  await drawn(page, 3);
  await object(page, "A").focus();
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent === "删除所选")
      .click();
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent === "读取尺寸与重绘")
      .focus();
  });
  await expect(btn(page, "读取尺寸与重绘")).toBeFocused();
  await drawn(page, 2);
});
test("native touch pan over drawing area scrolls page without capture or shape movement", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage();
  await p.addInitScript(() => {
    window.canvasKeys = [];
    window.captures = 0;
    for (const t of ["keydown", "keyup"])
      addEventListener(t, (e) => window.canvasKeys.push(e.key));
    const old = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = function (...a) {
      window.captures++;
      return old.apply(this, a);
    };
  });
  await open(p);
  await canvas(p).scrollIntoViewIfNeeded();
  const b = await canvas(p).boundingBox(),
    before = await p.evaluate(() => scrollY),
    session = await c.newCDPSession(p),
    x = b.x + b.width * 0.5,
    y = b.y + b.height * 0.8;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 8; i++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - i * 18 }],
    });
    await p.waitForTimeout(20);
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => p.evaluate(() => scrollY))
    .toBeGreaterThan(before + 20);
  await expect(object(p, "A").locator("..")).toContainText("140, 110");
  expect(await p.evaluate(() => window.captures)).toBe(0);
  expect(await p.evaluate(() => window.canvasKeys)).toEqual([]);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/touch-scroll-${info.project.name}.json`,
    JSON.stringify({
      passed: true,
      before,
      after: await p.evaluate(() => scrollY),
      captures: 0,
      keys: [],
      fixture: "Chromium native CDP touch gesture, not real device",
    }),
  );
  await session.detach();
  await c.close();
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local Canvas crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 4) await btn(page, "生成Canvas绘图指令").click();
    await axeCheck(page);
    await fit(page);
    mkdirSync(out, { recursive: true });
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
    const local =
      n < 3
        ? page.locator(".canvas24-wrapper")
        : n === 3
          ? page.locator(".quiz-card").first()
          : page.locator(".agent-options");
    await local.screenshot({
      path: `${out}/crop${n + 1}-${info.project.name}.png`,
    });
  });
async function flow(p, act, toggle, edit) {
  await directory(p, act);
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("添加圆形");
  await drawn(p, 4);
  await a("选择B 矩形");
  await a("所选向右30");
  await expect(object(p, "B").locator("..")).toContainText("350, 185");
  await a("填入标题示例");
  if (edit) await edit(p.getByLabel("场景标题", { exact: true }), "caption");
  await next();
  await a("删除所选");
  await drawn(p, 2);
  await a("撤销一步");
  await drawn(p, 3);
  await a("读取尺寸与重绘");
  await expect(p.locator(".canvas24-inspection")).toContainText("DPR");
  await next();
  await a("视图125%");
  await toggle(
    p.getByLabel("半透明图形（40%不透明度）", { exact: true }),
    "alpha",
  );
  await a("清空画布");
  await drawn(p, 0);
  await a("撤销一步");
  await drawn(p, 3);
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成Canvas绘图指令");
  const draft = p.getByLabel("可编辑的 Canvas绘图 Agent 指令");
  await expect(draft).toHaveValue(
    /对象模型.*像素密度与视图.*坐标与命中.*替代与语义.*撤销与边界.*输入和清理.*选型与回退.*验收/s,
  );
  if (edit) await edit(draft, "draft");
  await a("复制Canvas绘图指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 对象、命中、DPR、撤销与替代操作。", { exact: true }),
    "review",
  );
  await a("完成第二十四节");
  await expect(p.locator(".lesson-twenty-four .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.canvasKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-four .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十四节进度");
  await a("保留第二十四节进度");
  await expect(p.locator(".lesson-twenty-four .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十四节进度");
  await a("确认重置第二十四节");
  await expect(p.locator("#canvas-stage-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-four .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.canvasKeys ?? null),
  };
}
test("full actual Tab keyboard object alternatives wrong retry edits copy refresh reset preserves23", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson24",
      profile: info.project.name,
    }),
    result = await flow(page, act, toggle, async (f, n) => {
      await seek(f, n);
      await page.keyboard.press("End");
      await page.keyboard.type(
        n === "caption" ? " edited" : "\nReview: DPR, editable model and undo.",
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
for (const reduced of [false, true])
  test(`full zero keyboard touch ${reduced ? "system reduce" : "normal"} wrong retry refresh reset preserves23`, async ({
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
      window.canvasKeys = [];
      for (const t of ["keydown", "keyup"])
        addEventListener(t, (e) => window.canvasKeys.push(e.key));
    });
    const before = await seed(p),
      tap = async (l, n) => {
        await l.tap();
        trace.push(n);
      },
      result = await flow(p, tap, tap, async (f, n) => {
        await f.tap();
        await f.fill(
          n === "caption"
            ? "触屏编辑：数据和像素分开"
            : (await f.inputValue()) + "\n触屏核对：语义、撤销与像素密度。",
        );
      });
    expect(result.keysBefore).toEqual([]);
    expect(result.keysAfter).toEqual([]);
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    mkdirSync(out, { recursive: true });
    writeFileSync(
      `${out}/touch-${reduced ? "reduced" : "normal"}-${info.project.name}.json`,
      JSON.stringify({ passed: true, trace, ...result }, null, 2),
    );
    await c.close();
  });
test("editable copy success late error corrupt/unavailable storage and reset remain scoped", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.copied = t) },
    }),
  );
  await open(page, 4);
  await btn(page, "生成Canvas绘图指令").click();
  const draft = page.getByLabel("可编辑的 Canvas绘图 Agent 指令");
  await draft.fill(
    "自定义Canvas绘图简报 " + "模型、命中、像素密度和语义。".repeat(9),
  );
  await btn(page, "复制Canvas绘图指令").click();
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
  await btn(page, "复制Canvas绘图指令").click();
  await btn(page, "重置第二十四节进度").click();
  await page.keyboard.press("Escape");
  await expect(btn(page, "重置第二十四节进度")).toBeFocused();
  await btn(page, "重置第二十四节进度").click();
  await btn(page, "确认重置第二十四节").click();
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
          step: 99,
          done: [0, 0, 9],
          zoom: 99,
          answers: [8, 1, null],
        }),
      ),
    key,
  );
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-bottom")).toContainText("1 / 5");
  await expect(btn(page, "视图100%")).toHaveAttribute("aria-pressed", "true");
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

test("synthetic hidden/context-loss recovery and reset reject old draw callbacks but retain model", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.isContextLost;
    CanvasRenderingContext2D.prototype.isContextLost = function () {
      return window.fixtureCanvasLost === true || original?.call(this) || false;
    };
  });
  await open(page);
  await page.evaluate(() => (window.holdCanvasFrame = true));
  await btn(page, "添加圆形").click();
  await expect
    .poll(() => page.evaluate(() => window.canvasFrames.length))
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.holdCanvasFrame = false;
    window.canvasFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(lab(page)).toHaveAttribute("data-count", "4");
  await expect(canvas(page)).toHaveAttribute("data-drawn-objects", "3");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await drawn(page, 4);
  await page.evaluate(() => (window.fixtureCanvasLost = true));
  await canvas(page).dispatchEvent("contextlost");
  await expect(page.locator(".canvas24-fallback")).toBeVisible();
  await object(page, "B").click();
  await btn(page, "所选向右30").click();
  await expect(object(page, "B").locator("..")).toContainText("350, 185");
  await expect(page.locator(".canvas24-fallback")).toBeVisible();
  await page.evaluate(() => (window.fixtureCanvasLost = false));
  await canvas(page).dispatchEvent("contextrestored");
  await drawn(page, 4);
  await expect(page.locator(".canvas24-fallback")).toHaveCount(0);
  await page.evaluate(() => (window.holdCanvasFrame = true));
  await btn(page, "添加矩形").click();
  await expect
    .poll(() => page.evaluate(() => window.canvasFrames.length))
    .toBeGreaterThan(0);
  await btn(page, "重置第二十四节进度").click();
  await btn(page, "确认重置第二十四节").click();
  await page.evaluate(() => {
    window.holdCanvasFrame = false;
    window.canvasFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await drawn(page, 3);
  await expect(page.locator("#canvas-stage-stage-heading")).toBeFocused();
  await expect(object(page, "B").locator("..")).toContainText("320, 185");
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/cleanup-${info.project.name}.json`,
    JSON.stringify(
      {
        passed: true,
        fixtures:
          "synthetic document.hidden and contextlost/isContextLost; not real OS background or GPU context loss",
        latestModelRetained: true,
        oldFramesIgnored: true,
      },
      null,
      2,
    ),
  );
});

test("delayed station-heading callback never steals a newer object-list focus", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => (window.holdCanvasFrame = true));
  await stage(page, 0).click();
  await expect
    .poll(() => page.evaluate(() => window.canvasFrames.length))
    .toBeGreaterThan(0);
  await object(page, "A").focus();
  await expect(object(page, "A")).toBeFocused();
  await page.evaluate(() => {
    window.holdCanvasFrame = false;
    window.canvasFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  const evidence = await page.evaluate(() => ({
    activeTag: document.activeElement.tagName,
    activeId: document.activeElement.id,
    activeText: document.activeElement.textContent.trim().slice(0, 80),
    fixture:
      "deliberately held requestAnimationFrame after same-station navigation",
  }));
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/late-heading-${info.project.name}.json`,
    JSON.stringify(evidence, null, 2),
  );
  await expect(object(page, "A")).toBeFocused();
});
