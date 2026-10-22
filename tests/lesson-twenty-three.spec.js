import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  pointerValues,
  localPointer,
} from "../src/lesson-twenty-three-content.js";
const out = "/tmp/pointer-acceptance",
  key = "frontend-observatory.lesson23.v1",
  prior = Array.from(
    { length: 22 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".pointer23-lab"),
  bounds = (p) => p.locator(".pointer23-bounds"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十三节学习步骤" })
      .getByRole("button")
      .nth(n);
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(22), "lesson23");
  await expect(p.locator("#pointer-interaction-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  if (n < 3) await expect(bounds(p)).toHaveAttribute("data-x", "0.5000");
}
async function xy(p, x, y) {
  await expect
    .poll(() => bounds(p).getAttribute("data-x").then(Number))
    .toBeCloseTo(x, 2);
  await expect
    .poll(() => bounds(p).getAttribute("data-y").then(Number))
    .toBeCloseTo(y, 2);
}
async function pointer(p, x, y) {
  await bounds(p).scrollIntoViewIfNeeded();
  const box = await bounds(p).boundingBox(),
    client = { x: box.x + box.width * x, y: box.y + box.height * y };
  await p.mouse.move(client.x, client.y);
  await xy(p, x, y);
  return client;
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
  window.pointerFrames = [];
  window.holdPointerFrame = false;
  window.pointerFrameMap = new Map();
  window.requestAnimationFrame = (cb) => {
    let id;
    id = raf((t) => {
      window.pointerFrameMap.delete(id);
      if (window.holdPointerFrame) window.pointerFrames.push(cb);
      else cb(t);
    });
    window.pointerFrameMap.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    caf(id);
    window.pointerFrameMap.delete(id);
  };
}
test("bounded normalized values, amplitude, viewport-local coordinates and zero size are safe", () => {
  expect(pointerValues(-3, 8, 50)).toEqual({ x: 0, y: 1, rx: -8, ry: -8 });
  expect(pointerValues(0.5, 0.5, 8)).toEqual({ x: 0.5, y: 0.5, rx: 0, ry: 0 });
  expect(pointerValues(NaN, Infinity).x).toBe(0.5);
  const r = {
    left: 100,
    top: 200,
    width: 400,
    height: 200,
    right: 500,
    bottom: 400,
  };
  expect(localPointer(200, 350, r)).toMatchObject({
    x: 0.25,
    y: 0.75,
    inside: true,
  });
  expect(localPointer(20, 900, r)).toMatchObject({ x: 0, y: 1, inside: false });
  expect(localPointer(1, 1, { ...r, width: 0 })).toMatchObject({
    x: 0.5,
    y: 0.5,
    inside: false,
  });
});
test("on-demand lesson23 registration opens01–28 only and next data visualization remains preview", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-twenty-three-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(urls.some((u) => /lesson-twenty-three-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Cursor/Pointer Driven · 前端观察室");
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
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("real mouse coordinates alter gradient CSS variables and transform; leave immediately restores center", async ({
  page,
}, info) => {
  await open(page);
  const card = await page.locator(".pointer23-card").elementHandle();
  await pointer(page, 0.2, 0.8);
  const snapshot = await bounds(page).evaluate((e) => {
    const c = e.querySelector(".pointer23-card"),
      g = e.querySelector(".pointer23-glow");
    return {
      x: e.dataset.x,
      y: e.dataset.y,
      rx: e.dataset.rx,
      ry: e.dataset.ry,
      px: getComputedStyle(e).getPropertyValue("--px"),
      py: getComputedStyle(e).getPropertyValue("--py"),
      matrix: getComputedStyle(c).transform,
      gradient: getComputedStyle(g).backgroundImage,
      hit: document.elementFromPoint(
        e.getBoundingClientRect().left + e.clientWidth * 0.2,
        e.getBoundingClientRect().top + e.clientHeight * 0.8,
      )?.className,
    };
  });
  expect(snapshot.matrix).not.toBe("none");
  expect(snapshot.gradient).toContain("20% 80%");
  expect(Number(snapshot.rx)).toBeCloseTo(-3, 1);
  expect(Number(snapshot.ry)).toBeCloseTo(-3, 1);
  expect(snapshot.hit).toBe("pointer23-bounds");
  await page.mouse.move(1, 1);
  await xy(page, 0.5, 0.5);
  await expect(bounds(page)).toHaveAttribute("data-rx", "0");
  expect(await card.evaluate((e) => e.isConnected)).toBe(true);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/native-${info.project.name}.json`,
    JSON.stringify(
      { passed: true, snapshot, sameDOM: true, leftResets: true },
      null,
      2,
    ),
  );
});
test("scroll and resize read current untransformed viewport rectangle rather than stale geometry", async ({
  page,
}) => {
  await open(page);
  let client = await pointer(page, 0.5, 0.5);
  await page.evaluate(() => scrollBy(0, 35));
  const expected = await bounds(page).evaluate((e, c) => {
    const r = e.getBoundingClientRect();
    return { x: (c.x - r.left) / r.width, y: (c.y - r.top) / r.height };
  }, client);
  await xy(page, expected.x, expected.y);
  await page.setViewportSize({ width: 400, height: 850 });
  const next = await bounds(page).evaluate((e, c) => {
    const r = e.getBoundingClientRect();
    return {
      x: (c.x - r.left) / r.width,
      y: (c.y - r.top) / r.height,
      inside:
        c.x >= r.left && c.x <= r.right && c.y >= r.top && c.y <= r.bottom,
    };
  }, client);
  if (next.inside) await xy(page, next.x, next.y);
  else await xy(page, 0.5, 0.5);
  await pointer(page, 0.75, 0.25);
  await expect(bounds(page)).toHaveCSS("transform", "none");
});
test("rapid inputs coalesce; keep card DOM and avoid rebuilding content; no perpetual RAF", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  await bounds(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    window.holdPointerFrame = true;
    window.pointerMutations = 0;
    new MutationObserver(
      (r) =>
        (window.pointerMutations += r.filter(
          (x) => x.type === "childList",
        ).length),
    ).observe(document.querySelector(".pointer23-card"), {
      childList: true,
      subtree: true,
    });
    const e = document.querySelector(".pointer23-bounds"),
      r = e.getBoundingClientRect();
    for (let i = 1; i <= 100; i++)
      e.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerType: "mouse",
          isPrimary: true,
          clientX: r.left + (r.width * i) / 101,
          clientY: r.top + r.height * 0.2,
        }),
      );
  });
  await expect
    .poll(() => page.evaluate(() => window.pointerFrames.length))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.pointerFrames.length)).toBeLessThan(
    3,
  );
  await page.evaluate(() => {
    window.holdPointerFrame = false;
    window.pointerFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await xy(page, 100 / 101, 0.2);
  expect(await page.evaluate(() => window.pointerMutations)).toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.pointerFrameMap.size))
    .toBe(0);
});
test("cancel and blur invalidate held callbacks without clearing a new input or stealing external focus", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  await bounds(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => (window.holdPointerFrame = true));
  await pointerWithoutWait(page, 0.2, 0.2);
  await expect
    .poll(() => page.evaluate(() => window.pointerFrames.length))
    .toBe(1);
  await bounds(page).dispatchEvent("pointercancel", {
    pointerType: "mouse",
    isPrimary: true,
  });
  await xy(page, 0.5, 0.5);
  await btn(page, "采样右下").click();
  await xy(page, 0.85, 0.85);
  await page.evaluate(() => window.pointerFrames.shift()(performance.now()));
  await xy(page, 0.85, 0.85);
  await expect(btn(page, "采样右下")).toBeFocused();
  await pointerWithoutWait(page, 0.3, 0.7);
  await expect
    .poll(() => page.evaluate(() => window.pointerFrames.length))
    .toBe(1);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await xy(page, 0.5, 0.5);
  await page.evaluate(() => {
    window.holdPointerFrame = false;
    window.pointerFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await xy(page, 0.5, 0.5);
});
async function pointerWithoutWait(p, x, y) {
  const b = await bounds(p).boundingBox();
  await p.mouse.move(b.x + b.width * x, b.y + b.height * y);
}
test("live reduced motion cancels pending input; manual static samples still change actual gradient coordinates", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  await pointer(page, 0.25, 0.25);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab(page)).toHaveAttribute("data-dynamic", "false");
  await xy(page, 0.5, 0.5);
  await expect(page.locator(".pointer23-card")).toHaveCSS("transform", "none");
  await btn(page, "采样右下").click();
  await xy(page, 0.85, 0.85);
  await expect(bounds(page)).toHaveAttribute("data-rx", "0");
  await pointerWithoutWait(page, 0.1, 0.1);
  await xy(page, 0.85, 0.85);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(lab(page)).toHaveAttribute("data-dynamic", "true");
  await xy(page, 0.5, 0.5);
});
test("manual alternatives work with follow paused, amplitude changes and light toggles preserve selected coordinates", async ({
  page,
}) => {
  await open(page, 1);
  await page.getByLabel("启用鼠标 / 笔局部跟随", { exact: true }).uncheck();
  await btn(page, "采样右上").click();
  await xy(page, 0.85, 0.15);
  await btn(page, "上限8°").click();
  await xy(page, 0.85, 0.15);
  await expect(bounds(page)).toHaveAttribute("data-ry", /5\.6/);
  await page.getByLabel("显示聚光装饰", { exact: true }).uncheck();
  await expect(page.locator(".pointer23-glow")).toHaveCSS("opacity", "0");
  await xy(page, 0.85, 0.15);
  await expect(page.locator(".pointer23-copy")).toBeVisible();
  await btn(page, "复位并检查清理").click();
  await xy(page, 0.5, 0.5);
});
test("unsupported Pointer Events and ResizeObserver keep complete static/button alternatives", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.PointerEvent = undefined;
    window.ResizeObserver = undefined;
  });
  await open(page, 2);
  await expect(page.locator(".pointer23-explain")).toContainText(
    "Pointer Events不可用",
  );
  await btn(page, "采样左上").click();
  await xy(page, 0.15, 0.15);
  await page.getByLabel("模拟能力不足：保留静态替代", { exact: true }).check();
  await xy(page, 0.5, 0.5);
  await btn(page, "采样右下").click();
  await xy(page, 0.85, 0.85);
  await expect(page.locator(".pointer23-card")).toHaveCSS("transform", "none");
  await axeCheck(page);
});
test("native touch drag over card scrolls page, never captures pointer and never starts follow", async ({
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
    window.pointerKeys = [];
    window.captures = 0;
    for (const t of ["keydown", "keyup"])
      addEventListener(t, (e) => window.pointerKeys.push(e.key));
    const original = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = function (...a) {
      window.captures++;
      return original.apply(this, a);
    };
  });
  await open(p);
  await bounds(p).scrollIntoViewIfNeeded();
  const b = await bounds(p).boundingBox(),
    before = await p.evaluate(() => scrollY),
    session = await c.newCDPSession(p),
    x = b.x + b.width * 0.5,
    y = b.y + Math.min(b.height * 0.8, 250);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 8; i++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - i * 20 }],
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
  await xy(p, 0.5, 0.5);
  expect(await p.evaluate(() => window.captures)).toBe(0);
  expect(await p.evaluate(() => window.pointerKeys)).toEqual([]);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/touch-scroll-${info.project.name}.json`,
    JSON.stringify(
      {
        passed: true,
        before,
        after: await p.evaluate(() => scrollY),
        captures: 0,
        keys: [],
        fixture: "native Chromium CDP touch gestures, not real device",
      },
      null,
      2,
    ),
  );
  await session.detach();
  await c.close();
});
test("short narrow viewport max tilt keeps card within protective frame and controls readable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 500 });
  await open(page, 1);
  await btn(page, "上限8°").click();
  await btn(page, "采样右下").click();
  const r = await page.locator(".pointer23-card").boundingBox(),
    frame = await page.locator(".pointer23-frame").boundingBox();
  expect(r.x).toBeGreaterThanOrEqual(frame.x - 1);
  expect(r.x + r.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
  await page
    .getByLabel("卡片文案", { exact: true })
    .fill("长内容保持可读 ".repeat(8));
  await expect(page.locator(".pointer23-copy")).toContainText("长内容");
  await fit(page);
  await axeCheck(page);
});
test("hidden, reset, leave and unmount invalidate late callbacks and restore a clean new session", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await pointer(page, 0.2, 0.2);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await xy(page, 0.5, 0.5);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.evaluate(() => (window.holdPointerFrame = true));
  await pointerWithoutWait(page, 0.8, 0.2);
  await expect
    .poll(() => page.evaluate(() => window.pointerFrames.length))
    .toBe(1);
  await stage(page, 1).click();
  await page.evaluate(() => {
    window.holdPointerFrame = false;
    window.pointerFrames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await xy(page, 0.5, 0.5);
  await btn(page, "采样左下").click();
  await btn(page, "重置第二十三节进度").click();
  await btn(page, "确认重置第二十三节").click();
  await xy(page, 0.5, 0.5);
  await expect(
    page.locator("#pointer-interaction-stage-heading"),
  ).toBeFocused();
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/cleanup-${info.project.name}.json`,
    JSON.stringify(
      {
        passed: true,
        visibility: "synthetic document.hidden, not OS background",
        unmountedCallbackIgnored: true,
      },
      null,
      2,
    ),
  );
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n < 3) await btn(page, "采样右上").click();
    if (n === 4) await btn(page, "生成指针交互指令").click();
    await axeCheck(page);
    await fit(page);
    mkdirSync(out, { recursive: true });
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
    const local =
      n < 3
        ? page.locator(".pointer23-frame")
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
  await a("采样右上");
  await xy(p, 0.85, 0.15);
  await a("复位并检查清理");
  await xy(p, 0.5, 0.5);
  await a("读取局部坐标与边界");
  await next();
  await a("上限8°");
  await toggle(p.getByLabel("显示聚光装饰", { exact: true }), "light");
  await a("填入文案示例");
  if (edit) await edit(p.getByLabel("卡片文案", { exact: true }), "caption");
  await a("采样左下");
  await next();
  await a("采样右下");
  await toggle(p.getByLabel("减少动态：静态采样", { exact: true }), "reduce");
  await xy(p, 0.5, 0.5);
  await a("采样右上");
  await xy(p, 0.85, 0.15);
  await expect(bounds(p)).toHaveAttribute("data-rx", "0");
  await toggle(
    p.getByLabel("模拟能力不足：保留静态替代", { exact: true }),
    "static",
  );
  await a("复位并检查清理");
  await xy(p, 0.5, 0.5);
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成指针交互指令");
  const draft = p.getByLabel("可编辑的 指针交互 Agent 指令");
  await expect(draft).toHaveValue(
    /坐标与跟随范围.*视觉与限幅.*更新成本.*输入替代.*退出与回退.*减少动态.*验收/s,
  );
  if (edit) await edit(draft, "draft");
  await a("复制指针交互指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 跟随范围、幅度、成本、替代与减少动态。", {
      exact: true,
    }),
    "review",
  );
  await a("完成第二十三节");
  await expect(p.locator(".lesson-twenty-three .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.pointerKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-three .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十三节进度");
  await a("保留第二十三节进度");
  await expect(p.locator(".lesson-twenty-three .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十三节进度");
  await a("确认重置第二十三节");
  await expect(p.locator("#pointer-interaction-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-three .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.pointerKeys ?? null),
  };
}
test("full actual Tab keyboard alternatives wrong retry edits copy refresh reset preserves22", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson23",
      profile: info.project.name,
    }),
    result = await flow(page, act, toggle, async (f, n) => {
      await seek(f, n);
      await page.keyboard.press("End");
      await page.keyboard.type(
        n === "caption"
          ? " edited"
          : "\nReview: local range and reduced motion.",
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
  test(`full zero keyboard touch ${reduced ? "system reduce" : "normal"} wrong retry refresh reset preserves22`, async ({
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
      window.pointerKeys = [];
      for (const t of ["keydown", "keyup"])
        addEventListener(t, (e) => window.pointerKeys.push(e.key));
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
            ? "触屏编辑，内容保持清楚"
            : (await f.inputValue()) + "\n触屏核对局部范围与静态采样。",
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
test("copy edited success late error corrupt and unavailable storage leave reset scoped", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.copied = t) },
    }),
  );
  await open(page, 4);
  await btn(page, "生成指针交互指令").click();
  const draft = page.getByLabel("可编辑的 指针交互 Agent 指令");
  await draft.fill(
    "自定义指针交互简报 " + "局部范围、限幅、替代与清理。".repeat(9),
  );
  await btn(page, "复制指针交互指令").click();
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
  await btn(page, "复制指针交互指令").click();
  await btn(page, "重置第二十三节进度").click();
  await page.keyboard.press("Escape");
  await expect(btn(page, "重置第二十三节进度")).toBeFocused();
  await btn(page, "重置第二十三节进度").click();
  await btn(page, "确认重置第二十三节").click();
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
          amplitude: 999,
          answers: [8, 1, null],
        }),
      ),
    key,
  );
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-bottom")).toContainText("1 / 5");
  await expect(btn(page, "适中5°")).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
    Storage.prototype.removeItem = () => {
      throw Error("denied");
    };
  });
  await btn(page, "填入文案示例").click();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});
