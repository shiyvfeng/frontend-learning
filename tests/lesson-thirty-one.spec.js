import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  initialBoard31,
  validBoard31,
  moveCard31,
  size31,
  moveInitial,
  moveBrief,
} from "../src/lesson-thirty-one-content.js";
const out = "/tmp/drag-resize-acceptance",
  key = "frontend-observatory.lesson31.v1",
  prior = Array.from(
    { length: 30 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".move31-lab"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第三十一节学习步骤" })
      .getByRole("button")
      .nth(n),
  handle = (p, id) => p.locator(`[data-card-id="${id}"] button`),
  board = (p) => lab(p).getAttribute("data-board").then(JSON.parse),
  stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
function save(n, v) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
}
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(30), "lesson31");
  await expect(p.locator("#move31-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  if (n < 3) await expect(lab(p)).toHaveAttribute("data-session", "idle");
}
async function idle(p) {
  await expect(lab(p)).toHaveAttribute("data-session", "idle");
}
async function dragStart(p, id = "a") {
  await p.getByRole("group", { name: "三卡教学看板" }).scrollIntoViewIfNeeded();
  const r = await handle(p, id).boundingBox();
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await p.mouse.down();
  await expect(lab(p)).toHaveAttribute("data-session", "pointer-move");
  return r;
}
async function dropPoint(p, column, above = null) {
  const r = await p
    .locator(
      above ? `[data-card-id="${above}"]` : `[data-drop-column="${column}"]`,
    )
    .boundingBox();
  return { x: r.x + r.width / 2, y: above ? r.y + 2 : r.y + r.height - 8 };
}
async function mouseDrop(p, id, column, above = null) {
  await dragStart(p, id);
  const t = await dropPoint(p, column, above);
  await p.mouse.move(t.x, t.y, { steps: 8 });
  await p.mouse.up();
  await idle(p);
}
async function axes(p) {
  await p.evaluate(axe);
  const v = await p.evaluate(async () =>
    (
      await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      })
    ).violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  );
  expect(v).toEqual([]);
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
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
test("pure transaction insertion indexes are after source removal and malformed targets do not mutate", () => {
  const initial = initialBoard31();
  expect(validBoard31(initial)).toBe(true);
  expect(moveCard31(initial, "a", { column: "todo", index: 1 })).toEqual({
    todo: ["b", "a"],
    doing: ["c"],
  });
  expect(moveCard31(initial, "a", { column: "doing", index: 0 })).toEqual({
    todo: ["b"],
    doing: ["a", "c"],
  });
  expect(moveCard31(initial, "a", { column: "archive", index: 0 })).toBe(
    initial,
  );
  expect(moveCard31(initial, "unknown", { column: "todo", index: 0 })).toBe(
    initial,
  );
  expect(validBoard31({ todo: ["a", "a"], doing: ["c"] })).toBe(false);
  expect(initial).toEqual(initialBoard31());
});
test("size helper clamps narrow containers and brief matches actual transaction boundaries", () => {
  expect(size31(5000, 5000, 220)).toMatchObject({ width: 220, height: 300 });
  expect(size31(0, 0, 120)).toMatchObject({ width: 120, height: 132 });
  expect(size31(NaN, Infinity, NaN)).toMatchObject({ width: 280, height: 160 });
  expect(moveBrief(moveInitial())).toMatch(
    /原生Pointer Events.*允许目标.*提交与取消.*尺寸约束.*等价操作与焦点.*持久化与减少动态.*验收/s,
  );
  expect(moveBrief(moveInitial())).toContain("未接入dnd-kit");
});
test("lazy chapter31 native implementation opens01–31 and only32 stays preview", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  expect(requests.some((u) => /lesson-thirty-one/.test(u))).toBe(false);
  await directory(page);
  await expect(page.locator(".available-dot")).toHaveCount(31);
  await expect(page.locator(".site-footer")).toContainText("01–31");
  expect(requests.some((u) => /lesson-thirty-one/.test(u))).toBe(true);
  expect(requests.some((u) => /dnd-kit|sortablejs/.test(u))).toBe(false);
  await expect(page).toHaveTitle("Drag/Drop/Resize · 前端观察室");
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(31).click();
  await expect(
    page.getByRole("heading", { name: "Infinite Canvas", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("real mouse capture preview does not commit until valid cross-column release", async ({
  page,
}, info) => {
  await open(page);
  const before = await board(page);
  await dragStart(page);
  const t = await dropPoint(page, "doing");
  await page.mouse.move(t.x, t.y, { steps: 10 });
  await expect(page.locator(".move31-preview")).toContainText("处理中");
  expect(await board(page)).toEqual(before);
  expect((await stored(page)).board).toEqual(before);
  await expect(page.locator(".move31-ghost")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(
    await page
      .locator(".move31-ghost")
      .evaluate((e) => e.inert && getComputedStyle(e).pointerEvents === "none"),
  ).toBe(true);
  await page.mouse.up();
  await idle(page);
  expect(await board(page)).toEqual({ todo: ["b"], doing: ["c", "a"] });
  await expect(handle(page, "a")).toBeFocused();
  save(`mouse-cross-${info.project.name}`, {
    before,
    after: await board(page),
    realMouse: true,
    immediateFocus: true,
  });
});
test("real mouse same-column sorting changes actual DOM order and model", async ({
  page,
}) => {
  await open(page);
  await mouseDrop(page, "b", "todo", "a");
  expect(await board(page)).toEqual({ todo: ["b", "a"], doing: ["c"] });
  expect(
    await page
      .locator('[data-drop-column="todo"] [data-card-id]')
      .evaluateAll((es) => es.map((e) => e.dataset.cardId)),
  ).toEqual(["b", "a"]);
  await expect(handle(page, "b")).toBeFocused();
});
test("invalid real mouse release and Escape preserve original committed board", async ({
  page,
}) => {
  await open(page);
  await dragStart(page);
  await page.mouse.move(4, 4, { steps: 5 });
  await page.mouse.up();
  await idle(page);
  expect(await board(page)).toEqual(initialBoard31());
  await expect(page.locator(".move31-status")).toContainText("无效区域");
  await dragStart(page);
  const t = await dropPoint(page, "doing");
  await page.mouse.move(t.x, t.y, { steps: 5 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await idle(page);
  expect(await board(page)).toEqual(initialBoard31());
});
test("lost capture fixture and window blur cancel without accepting late pointerup", async ({
  page,
}, info) => {
  await open(page);
  await dragStart(page);
  const id = Number(await lab(page).getAttribute("data-pointer-id"));
  await handle(page, "a").evaluate((e, id) => e.releasePointerCapture(id), id);
  await page.mouse.move(3, 3);
  await idle(page);
  await page.mouse.up();
  expect(await board(page)).toEqual(initialBoard31());
  await dragStart(page);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await page.mouse.up();
  await idle(page);
  expect(await board(page)).toEqual(initialBoard31());
  save(`cancel-fixtures-${info.project.name}`, {
    captureReleaseAPI: true,
    windowBlurDispatchedFixture: true,
    lateUpIgnored: true,
  });
});
test("real keyboard handle moves target and restores same ID focus after cross-column commit", async ({
  page,
}, info) => {
  await open(page);
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson31",
      profile: info.project.name,
    });
  await nav.seek(handle(page, "a"), "move-a");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  expect(await board(page)).toEqual(initialBoard31());
  await page.keyboard.press("Enter");
  await expect(handle(page, "a")).toBeFocused();
  expect(await board(page)).toEqual({ todo: ["b"], doing: ["c", "a"] });
  await page.keyboard.press("Space");
  await page.keyboard.press("Home");
  await page.keyboard.press("Space");
  await expect(handle(page, "a")).toBeFocused();
  expect((await board(page)).doing).toEqual(["a", "c"]);
  save(`keyboard-handle-${info.project.name}`, {
    trace,
    board: await board(page),
    immediateFocus: true,
  });
});
test("keyboard Tab cancels and exits handle; preview buttons keep external focus on commit", async ({
  page,
}, info) => {
  await open(page);
  const nav = createKeyboardNavigator(page, expect, [], {
    lesson: "lesson31",
    profile: info.project.name,
  });
  await nav.seek(handle(page, "a"), "a");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Tab");
  await idle(page);
  expect(await board(page)).toEqual(initialBoard31());
  await expect(handle(page, "b")).toBeFocused();
  await nav.act(btn(page, "预览移动到另一列"), "preview");
  await nav.act(btn(page, "确认当前预览"), "confirm");
  await expect(btn(page, "确认当前预览")).toBeFocused();
  expect((await board(page)).doing).toContain("a");
  await nav.seek(handle(page, "a"), "keyboard-return-a");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowLeft");
  await btn(page, "确认当前预览").click();
  expect((await board(page)).todo).toEqual(["b", "a"]);
  await expect(btn(page, "确认当前预览")).toBeFocused();
});
test("click alternatives reorder cross columns and undo same model with boundary feedback", async ({
  page,
}) => {
  await open(page);
  await btn(page, "选中卡片下移").click();
  expect((await board(page)).todo).toEqual(["b", "a"]);
  await btn(page, "选中卡片下移").click();
  await expect(btn(page, "选中卡片下移")).toBeFocused();
  expect((await board(page)).todo).toEqual(["b", "a"]);
  await btn(page, "移到处理中末尾").click();
  expect((await board(page)).doing).toEqual(["c", "a"]);
  await btn(page, "撤销上次提交").click();
  expect((await board(page)).todo).toEqual(["b", "a"]);
  await expect(btn(page, "撤销上次提交")).toBeFocused();
  const before = await board(page);
  await btn(page, "尝试放入只读归档区").click();
  expect(await board(page)).toEqual(before);
  await expect(page.locator(".move31-status")).toContainText("禁止");
});
test("last source card moves into empty column and duplicate rapid inputs keep exactly3 IDs", async ({
  page,
}) => {
  await open(page);
  await btn(page, "选择验证按钮").click();
  await btn(page, "移到待安排末尾").click();
  expect((await board(page)).doing).toEqual([]);
  await expect(page.locator(".move31-empty")).toContainText("空列");
  await btn(page, "移到处理中末尾").click();
  expect((await board(page)).doing).toEqual(["c"]);
  for (let i = 0; i < 5; i++) await btn(page, "预览移动到另一列").click();
  await expect(lab(page)).toHaveAttribute("data-session", "click-preview-move");
  await btn(page, "确认当前预览").click();
  for (let i = 0; i < 3; i++) await btn(page, "确认当前预览").click();
  expect(validBoard31(await board(page))).toBe(true);
});
test("real mouse resize previews actual box then commits and supports Escape restore", async ({
  page,
}, info) => {
  await open(page, 2);
  const h = btn(page, "调整尺寸把手");
  await h.scrollIntoViewIfNeeded();
  const r = await h.boundingBox(),
    before = await stored(page);
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 - 35, r.y + r.height / 2 + 45, {
    steps: 6,
  });
  const during = await page.locator(".move31-size-card").boundingBox();
  expect(during.height).toBeGreaterThan(before.height);
  expect((await stored(page)).height).toBe(before.height);
  await page.mouse.up();
  await idle(page);
  expect((await stored(page)).height).toBeGreaterThan(before.height);
  await expect(h).toBeFocused();
  const committed = await stored(page);
  await h.scrollIntoViewIfNeeded();
  const x = await h.boundingBox();
  await page.mouse.move(x.x + x.width / 2, x.y + x.height / 2);
  await page.mouse.down();
  await page.mouse.move(x.x + 5, x.y - 30, { steps: 5 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await stored(page)).height).toBe(committed.height);
  save(`resize-pointer-${info.project.name}`, {
    before,
    during,
    committed,
    realMouse: true,
  });
});
test("keyboard resize arrows bounds confirmation cancellation and Tab exit are real", async ({
  page,
}, info) => {
  await open(page, 2);
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson31",
      profile: info.project.name,
    }),
    h = btn(page, "调整尺寸把手");
  await nav.seek(h, "size");
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(h).toBeFocused();
  expect((await stored(page)).height).toBe(300);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  expect((await stored(page)).height).toBe(300);
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Tab");
  await idle(page);
  await expect(btn(page, "宽度减少32")).toBeFocused();
  expect((await stored(page)).height).toBe(300);
  save(`resize-keyboard-${info.project.name}`, {
    trace,
    height: 300,
    tabEscaped: true,
  });
});
test("size limits current container clamp resize and undo preserve desired width", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "请求超出上限尺寸").click();
  const d = await stored(page);
  expect(d.height).toBe(300);
  expect(d.width).toBeLessThanOrEqual(480);
  await page.setViewportSize({ width: 375, height: 480 });
  const actual = await page.locator(".move31-size-card").boundingBox(),
    area = await page.locator(".move31-size-area").boundingBox();
  expect(actual.width).toBeLessThanOrEqual(area.width);
  expect((await stored(page)).width).toBe(d.width);
  await btn(page, "使用最小尺寸").click();
  expect((await stored(page)).height).toBe(132);
  await btn(page, "撤销上次提交").click();
  expect((await stored(page)).height).toBe(300);
  await axes(page);
  save(`size-bounds-${info.project.name}`, { d, actual, area });
});
test("preview scroll resize reduce live changes cancel and committed data stays stable", async ({
  page,
}) => {
  await open(page);
  await btn(page, "预览移动到另一列").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await idle(page);
  await expect(lab(page)).toHaveAttribute("data-reduced", "true");
  expect(await board(page)).toEqual(initialBoard31());
  await dragStart(page);
  await page.mouse.wheel(0, 150);
  await page.mouse.up();
  await idle(page);
  expect(await board(page)).toEqual(initialBoard31());
  await btn(page, "预览移动到另一列").click();
  await page.setViewportSize({ width: 390, height: 700 });
  await idle(page);
  expect(await board(page)).toEqual(initialBoard31());
});
test("leave refresh station change discard previews preserve commits and clear undo history", async ({
  page,
}) => {
  await open(page);
  await btn(page, "移到处理中末尾").click();
  const committed = await board(page);
  await btn(page, "预览移动到另一列").click();
  await stage(page, 1).click();
  await idle(page);
  expect(await board(page)).toEqual(committed);
  await stage(page, 4).click();
  await stage(page, 0).click();
  await expect(lab(page)).toHaveAttribute("data-history", "0");
  expect(await board(page)).toEqual(committed);
  await btn(page, "预览移动到另一列").click();
  await page.reload();
  await directory(page);
  await idle(page);
  expect(await board(page)).toEqual(committed);
  await expect(lab(page)).toHaveAttribute("data-history", "0");
});

test("cancel and unmount isolate deliberately late RAF callbacks and idle has no loop", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const original = requestAnimationFrame;
    window.heldFrames31 = [];
    window.rafCalls31 = 0;
    window.requestAnimationFrame = (callback) => {
      window.rafCalls31++;
      if (window.holdFrames31) {
        window.heldFrames31.push(callback);
        return original(() => {});
      }
      return original(callback);
    };
  });
  await open(page);
  const r = await dragStart(page);
  await page.evaluate(() => (window.holdFrames31 = true));
  await page.mouse.move(r.x + 8, r.y + 8);
  expect(await page.evaluate(() => window.heldFrames31.length)).toBeGreaterThan(
    0,
  );
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.evaluate(() => (window.holdFrames31 = false));
  await stage(page, 3).click();
  await stage(page, 0).click();
  const before = await board(page);
  await page.evaluate(() =>
    window.heldFrames31.forEach((callback) => callback(performance.now())),
  );
  await idle(page);
  expect(await board(page)).toEqual(before);
  const calls = await page.evaluate(() => window.rafCalls31);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => window.rafCalls31)).toBe(calls);
  save(`late-frames-${info.project.name}`, {
    deliberatelyHeldCallbackFixture: true,
    afterCancelAndUnmountIgnored: true,
    idleCalls: calls,
  });
});
test("real touch capture drag and touchCancel preserve page scroll outside handles", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    }),
    p = await c.newPage();
  await open(p);
  await p.getByRole("group", { name: "三卡教学看板" }).scrollIntoViewIfNeeded();
  const r = await handle(p, "a").boundingBox(),
    t = await dropPoint(p, "doing"),
    cdp = await c.newCDPSession(p),
    x = r.x + r.width / 2,
    y = r.y + r.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x + ((t.x - x) * i) / 8, y: y + ((t.y - y) * i) / 8, id: 1 },
      ],
    });
    await p.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await idle(p);
  expect((await board(p)).doing).toEqual(["c", "a"]);
  await handle(p, "a").scrollIntoViewIfNeeded();
  const q = await handle(p, "a").boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: q.x + q.width / 2, y: q.y + q.height / 2, id: 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await idle(p);
  expect((await board(p)).doing).toEqual(["c", "a"]);
  const before = await p.evaluate(() => scrollY);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 20, y: 650, id: 3 }],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 20, y: 650 - i * 35, id: 3 }],
    });
    await p.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => p.evaluate(() => scrollY)).toBeGreaterThan(before);
  save(`touch-native-${info.project.name}`, {
    realCDPTouch: true,
    touchCancel: true,
    outerBefore: before,
    outerAfter: await p.evaluate(() => scrollY),
  });
  await c.close();
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe and desktop375 local board controls sizes crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 4) await btn(page, "生成拖放尺寸指令").click();
    await axes(page);
    mkdirSync(out, { recursive: true });
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
    const target =
      n < 3
        ? page.locator(n === 2 ? ".move31-size-section" : ".move31-board")
        : page.locator(n === 3 ? ".quiz-grid" : ".agent-grid");
    await target.screenshot({
      path: `${out}/crop${n + 1}-${info.project.name}.png`,
    });
  });
async function flow(p, act, toggle, edit) {
  await directory(p, act);
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("填入标题示例");
  await edit(p.getByLabel("演练标题", { exact: true }), "caption");
  await a("预览移动到另一列");
  expect(await board(p)).toEqual(initialBoard31());
  await a("取消当前预览");
  await a("预览移动到另一列");
  await a("确认当前预览");
  expect((await board(p)).doing).toContain("a");
  await next();
  await a("恢复教学看板");
  await a("选中卡片下移");
  expect((await board(p)).todo).toEqual(["b", "a"]);
  await a("尝试放入只读归档区");
  await a("撤销上次提交");
  expect((await board(p)).todo).toEqual(["a", "b"]);
  await next();
  await a("使用最小尺寸");
  await a("请求超出上限尺寸");
  await a("预览放大尺寸");
  await a("取消当前预览");
  await next();
  const q = p.locator(".quiz-card");
  await act(q.nth(0).getByRole("button").nth(0), "wrong");
  await expect(q.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(q.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成拖放尺寸指令");
  const draft = p.getByLabel("可编辑的 拖放尺寸 Agent 指令");
  await expect(draft).toHaveValue(
    /提交与取消.*尺寸约束.*等价操作与焦点.*持久化/s,
  );
  await edit(draft, "draft");
  await a("复制拖放尺寸指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 目标、约束、恢复与替代。", { exact: true }),
    "review",
  );
  await a("完成第三十一节");
  await expect(p.locator(".lesson-thirty-one .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await stored(p);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-thirty-one .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第三十一节进度");
  await a("保留第三十一节进度");
  await expect(p.locator(".lesson-thirty-one .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第三十一节进度");
  await a("确认重置第三十一节");
  await expect(p.locator("#move31-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-thirty-one .lesson-bottom")).toContainText(
    "0 / 5",
  );
  expect(await board(p)).toEqual(initialBoard31());
  await axes(p);
  return done;
}
test("full real Tab retry editable brief copy refresh cancel confirm reset preserves30", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson31",
      profile: info.project.name,
    });
  const done = await flow(page, nav.act, nav.toggle, async (f, n) => {
    await nav.seek(f, n);
    await page.keyboard.press("End");
    await page.keyboard.type(
      n === "caption" ? " edited" : "\nReview cancellation, bounds and focus.",
    );
  });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  save(`keyboard-${info.project.name}`, { trace, done });
});
for (const reduced of [false, true])
  test(`full zero keyboard touch ${reduced ? "reduce" : "normal"} retry refresh reset preserves30`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        baseURL: "http://127.0.0.1:4173",
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: reduced ? "reduce" : "no-preference",
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
      };
    const done = await flow(p, tap, tap, async (f, n) => {
      await f.tap();
      await f.fill(
        n === "caption"
          ? "触屏编辑看板"
          : (await f.inputValue()) + "\n触屏核对取消和边界。",
      );
    });
    expect(await p.evaluate(() => window.workflowKeys)).toEqual([]);
    expect(
      await p.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(reduced);
    await expect(lab(p)).toHaveAttribute("data-reduced", String(reduced));
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    save(`touch-${reduced ? "reduce" : "normal"}-${info.project.name}`, {
      trace,
      done,
      keys: [],
      textEntry: "editable input fill fixture; no key events",
    });
    await c.close();
  });
test("corrupt duplicate board unavailable storage and copy fallback stay usable", async ({
  page,
}) => {
  await page.addInitScript(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          board: { todo: ["a", "a"], doing: ["c"] },
          step: 99,
          width: 99999,
          height: -5,
        }),
      ),
    key,
  );
  await open(page);
  expect(await board(page)).toEqual(initialBoard31());
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
  });
  await page.reload();
  await directory(page);
  await btn(page, "移到处理中末尾").click();
  expect((await board(page)).doing).toContain("a");
  await expect(page.locator(".saved")).toContainText("存储不可用");
});
test("late clipboard denial after reset or deliberate external Tab focus cannot steal focus", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, reject) => (window.reject31 = reject)),
      },
    }),
  );
  await open(page, 4);
  await btn(page, "生成拖放尺寸指令").click();
  const nav = createKeyboardNavigator(page, expect, [], {
    lesson: "lesson31",
    profile: info.project.name,
  });
  await nav.act(btn(page, "复制拖放尺寸指令"), "copy");
  await nav.seek(btn(page, "重置第三十一节进度"), "outside");
  await page.evaluate(() => window.reject31(Error("late")));
  await expect(btn(page, "重置第三十一节进度")).toBeFocused();
  await nav.act(btn(page, "复制拖放尺寸指令"), "copy-again");
  await nav.act(btn(page, "重置第三十一节进度"), "reset");
  await nav.act(btn(page, "确认重置第三十一节"), "confirm");
  await page.evaluate(() => window.reject31(Error("old")));
  await expect(page.locator("#move31-stage-heading")).toBeFocused();
  expect((await stored(page)).draft).toBe("");
});
