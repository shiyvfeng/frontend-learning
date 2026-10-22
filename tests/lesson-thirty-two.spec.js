import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import { assertRemainingPlans32 } from "./catalog-boundary.js";
import {
  nodes32,
  view32,
  screenToWorld32,
  worldToScreen32,
  zoomAt32,
  pan32,
  fit32,
  moveNode32,
  readNodes32,
  spaceInitial,
  spaceBrief,
} from "../src/lesson-thirty-two-content.js";
const out = "/tmp/infinite-canvas-acceptance",
  key = "frontend-observatory.lesson32.v1",
  prior = Array.from(
    { length: 31 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".space32-lab"),
  vp = (p) => p.getByRole("region", { name: "教学无限画布", exact: true }),
  shape = (p, id) => p.locator(`[data-node-id="${id}"] .space32-node-body`),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第三十二节学习步骤" })
      .getByRole("button")
      .nth(n),
  stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
function save(n, v) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
}
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(31), "lesson32");
  await expect(p.locator("#space32-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  if (n < 3)
    await expect
      .poll(
        async () => JSON.parse(await lab(p).getAttribute("data-size")).width,
      )
      .toBeGreaterThan(0);
}
async function state(p) {
  return lab(p).evaluate((e) => {
    const svg = e.querySelector("svg"),
      r = svg?.getBoundingClientRect();
    return {
      view: JSON.parse(e.dataset.view),
      shownView: JSON.parse(e.dataset.shownView),
      nodes: JSON.parse(e.dataset.nodes),
      shownNodes: JSON.parse(e.dataset.shownNodes),
      size: JSON.parse(e.dataset.size),
      session: e.dataset.session,
      history: Number(e.dataset.history),
      box: r
        ? { left: r.left, top: r.top, width: r.width, height: r.height }
        : null,
      centers: [...e.querySelectorAll(".space32-node-body")].map((n) => {
        const r = n.getBoundingClientRect();
        return {
          id: n.closest("[data-node-id]").dataset.nodeId,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          width: r.width,
          height: r.height,
        };
      }),
    };
  });
}
async function idle(p) {
  await expect(lab(p)).toHaveAttribute("data-session", "idle");
}
async function projection(p) {
  const s = await state(p);
  for (const c of s.centers) {
    const n = s.shownNodes.find((n) => n.id === c.id),
      x = s.box.left + s.box.width / 2 + (n.x - s.shownView.cx) * s.shownView.z,
      y = s.box.top + s.box.height / 2 + (n.y - s.shownView.cy) * s.shownView.z;
    expect(Math.abs(c.x - x)).toBeLessThan(0.8);
    expect(Math.abs(c.y - y)).toBeLessThan(0.8);
    expect(Math.abs(c.width - 140 * s.shownView.z)).toBeLessThan(0.8);
  }
  return s;
}
async function prepare(p) {
  await vp(p).scrollIntoViewIfNeeded();
  return (await state(p)).box;
}
async function startPan(p) {
  const b = await prepare(p),
    point = { x: b.left + 5, y: b.top + 5 };
  await p.mouse.move(point.x, point.y);
  await p.mouse.down();
  await expect(lab(p)).toHaveAttribute("data-session", "pointer-pan");
  return point;
}
async function axes(p) {
  await p.evaluate(axe);
  expect(
    await p.evaluate(async () =>
      (
        await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ),
  ).toEqual([]);
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
test("coordinate roundtrip anchor pan clamps and zero rectangles are finite and distinct", () => {
  const b = { left: 50, top: 100, width: 300, height: 220 },
    v = { cx: 80, cy: -30, z: 1.4 },
    p = { x: 125, y: 200 };
  const w = screenToWorld32(p, v, b);
  expect(worldToScreen32(w, v, b).x).toBeCloseTo(p.x, 8);
  expect(worldToScreen32(w, v, b).y).toBeCloseTo(p.y, 8);
  const z = zoomAt32(v, 2.2, p, b);
  expect(screenToWorld32(p, z, b).x).toBeCloseTo(w.x, 8);
  expect(screenToWorld32(p, z, b).y).toBeCloseTo(w.y, 8);
  expect(pan32(v, 140, 0).cx).toBeCloseTo(-20);
  expect(view32({ cx: 1e8, cy: -1e8, z: 99 })).toEqual({
    cx: 2000,
    cy: -2000,
    z: 2.5,
  });
  expect(view32(null)).toEqual({ cx: 0, cy: 0, z: 1 });
  expect(screenToWorld32(p, v, { ...b, width: 0 })).toBeNull();
  expect(zoomAt32(v, 1, p, { ...b, height: 0 })).toBeNull();
  expect(fit32(nodes32(), { ...b, width: 0 })).toBeNull();
});
test("finite nodes fit including edge positions and brief separates camera from data and future modules", () => {
  const ns = moveNode32(nodes32(), "a", 999, -999);
  expect(ns[0]).toMatchObject({ x: 400, y: -400 });
  expect(nodes32()[0].x).toBe(-120);
  expect(readNodes32([{ id: "a" }])).toEqual(nodes32());
  const b = { left: 0, top: 0, width: 300, height: 220 },
    v = fit32(ns, b);
  for (const n of ns) {
    const p = worldToScreen32(n, v, b);
    expect(p.x - 70 * v.z).toBeGreaterThanOrEqual(0);
    expect(p.x + 70 * v.z).toBeLessThanOrEqual(300);
    expect(p.y - 40 * v.z).toBeGreaterThanOrEqual(0);
    expect(p.y + 40 * v.z).toBeLessThanOrEqual(220);
  }
  expect(spaceBrief(spaceInitial())).toMatch(
    /数据结构.*导航与锚点.*选择与编辑.*事务与输入.*滚动与无障碍.*性能与持久化.*验收/s,
  );
  expect(spaceBrief(spaceInitial())).toContain("综合A/B已开放，T01/T02/T03/T04/T05/T06已开放，T07–T12仍待制作");
});
test("actual SVG module is lazy all32 numbered open while A/B/T01–T06 open and6 tool modules remain previews", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  expect(requests.some((u) => /lesson-thirty-two/.test(u))).toBe(false);
  await directory(page);
  await expect(vp(page).locator("svg")).toHaveCount(1);
  expect(requests.some((u) => /lesson-thirty-two/.test(u))).toBe(true);
  expect(requests.some((u) => /reactflow|tldraw|pixi|three-/.test(u))).toBe(
    false,
  );
  await expect(page).toHaveTitle("Infinite Canvas · 前端观察室");
  await assertRemainingPlans32(page, expect);
});
test("actual mouse pan previews SVG viewport then commits without rewriting nodes", async ({
  page,
}, info) => {
  await open(page);
  const before = await state(page),
    p = await startPan(page);
  await page.mouse.move(p.x + 40, p.y + 25, { steps: 8 });
  await expect
    .poll(async () => (await state(page)).shownView.cx)
    .not.toBe(before.view.cx);
  const during = await projection(page);
  expect(during.view).toEqual(before.view);
  expect(during.nodes).toEqual(before.nodes);
  expect(during.shownView.cx).toBeCloseTo(
    before.view.cx - 40 / before.view.z,
    4,
  );
  await page.mouse.up();
  await idle(page);
  const after = await projection(page);
  expect(after.view.cx).toBeCloseTo(before.view.cx - 40 / before.view.z, 4);
  expect(after.nodes).toEqual(before.nodes);
  await expect(vp(page)).toBeFocused();
  save(`mouse-pan-${info.project.name}`, {
    before,
    during,
    after,
    realMouse: true,
  });
});
test("zoomed physical hit and node drag use world delta and update real connection geometry", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "选择节点B").click();
  await btn(page, "定位选中节点").click();
  await btn(page, "放大（中心锚点）").click();
  await prepare(page);
  const before = await projection(page),
    r = await shape(page, "b").boundingBox(),
    x = r.x + r.width / 2,
    y = r.y + r.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(lab(page)).toHaveAttribute("data-session", "pointer-node");
  await page.mouse.move(x + 35, y + 20, { steps: 8 });
  expect((await state(page)).nodes).toEqual(before.nodes);
  await page.mouse.up();
  await idle(page);
  const after = await projection(page),
    old = before.nodes.find((n) => n.id === "b"),
    n = after.nodes.find((n) => n.id === "b");
  expect(n.x).toBeCloseTo(old.x + 35 / before.view.z, 0);
  expect(n.y).toBeCloseTo(old.y + 20 / before.view.z, 0);
  expect(after.view).toEqual(before.view);
  await expect(vp(page)).toBeFocused();
  expect(
    Number(await page.locator('[data-edge-id="ab"]').getAttribute("x2")),
  ).toBe(n.x);
  expect(
    Number(await page.locator('[data-edge-id="bc"]').getAttribute("x1")),
  ).toBe(n.x);
  save(`zoom-hit-drag-${info.project.name}`, {
    before,
    after,
    realMouse: true,
  });
});
test("center buttons and real opt-in wheel preserve their respective zoom anchors", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.wheelPoints32 = [];
    document.addEventListener(
      "wheel",
      (e) => window.wheelPoints32.push({ x: e.clientX, y: e.clientY }),
      true,
    );
  });
  await open(page, 2);
  const before = await state(page);
  await btn(page, "放大（中心锚点）").click();
  const center = await state(page);
  expect(center.view.cx).toBe(before.view.cx);
  expect(center.view.cy).toBe(before.view.cy);
  expect(center.nodes).toEqual(before.nodes);
  await page
    .getByLabel("普通滚轮缩放画布（仅绘图区，默认关闭）", { exact: true })
    .check();
  const b = await prepare(page),
    p = { x: b.left + b.width * 0.28, y: b.top + b.height * 0.32 },
    s = await state(page),
    requestedAnchor = screenToWorld32(p, s.view, b);
  await page.mouse.move(p.x, p.y);
  await page.mouse.wheel(0, -80);
  await expect
    .poll(async () => (await state(page)).view.z)
    .toBeGreaterThan(s.view.z);
  const actualPoint = await page.evaluate(() => window.wheelPoints32.at(-1)),
    anchor = screenToWorld32(actualPoint, s.view, b),
    after = await projection(page),
    world = screenToWorld32(actualPoint, after.view, b);
  save(`wheel-quantization-${info.project.name}`, {
    requestedPoint: p,
    actualPoint,
    requestedAnchor,
    actualAnchor: anchor,
    afterWorld: world,
  });
  expect(world.x).toBeCloseTo(anchor.x, 4);
  expect(world.y).toBeCloseTo(anchor.y, 4);
  expect(after.nodes).toEqual(s.nodes);
  save(`wheel-anchor-${info.project.name}`, {
    before: s,
    after,
    anchor,
    afterWorld: world,
    realWheel: true,
  });
});
test("default wheel scrolls page outside and Ctrl wheel/keys are not intercepted by canvas", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.wheels32 = [];
    window.keys32 = [];
    addEventListener("wheel", (e) =>
      window.wheels32.push({ ctrl: e.ctrlKey, prevented: e.defaultPrevented }),
    );
    addEventListener("keydown", (e) =>
      window.keys32.push({
        key: e.key,
        ctrl: e.ctrlKey,
        prevented: e.defaultPrevented,
      }),
    );
  });
  await open(page, 2);
  const b = await prepare(page),
    before = await state(page),
    sy = await page.evaluate(() => scrollY);
  await page.mouse.move(b.left + 5, b.top + 5);
  await page.mouse.wheel(0, 130);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(sy);
  expect((await state(page)).view).toEqual(before.view);
  await page
    .getByLabel("普通滚轮缩放画布（仅绘图区，默认关闭）", { exact: true })
    .check();
  const q = await prepare(page);
  await page.mouse.click(q.left + 5, q.top + 5);
  const camera = (await state(page)).view;
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -60);
  await page.keyboard.press("Equal");
  await page.keyboard.up("Control");
  expect((await state(page)).view).toEqual(camera);
  const events = await page.evaluate(() => ({
    wheel: window.wheels32,
    keys: window.keys32,
  }));
  expect(events.wheel.filter((e) => e.ctrl).length).toBeGreaterThan(0);
  expect(events.wheel.filter((e) => e.ctrl).every((e) => !e.prevented)).toBe(
    true,
  );
  expect(
    events.keys
      .filter((e) => e.ctrl && ["+", "="].includes(e.key))
      .every((e) => !e.prevented),
  ).toBe(true);
  save(`native-browser-gestures-${info.project.name}`, events);
});
test("native keyboard canvas arrows modes plus Home and Tab use visible stable focus", async ({
  page,
}, info) => {
  await open(page, 1);
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson32",
      profile: info.project.name,
    });
  await nav.act(btn(page, "平移模式"), "pan-mode");
  await nav.seek(vp(page), "viewport");
  const before = await state(page);
  await page.keyboard.press("ArrowRight");
  await expect(vp(page)).toBeFocused();
  expect((await state(page)).view.cx).toBeCloseTo(
    before.view.cx - 40 / before.view.z,
    4,
  );
  expect((await state(page)).nodes).toEqual(before.nodes);
  await page.keyboard.press("Equal");
  await page.keyboard.press("Home");
  await nav.act(btn(page, "节点模式"), "node-mode");
  await nav.act(btn(page, "选择节点B"), "select-b");
  await nav.seek(vp(page), "node-viewport");
  const n = (await state(page)).nodes.find((n) => n.id === "b");
  await page.keyboard.press("ArrowRight");
  expect((await state(page)).nodes.find((n) => n.id === "b").x).toBe(n.x + 20);
  await expect(vp(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(btn(page, "画面向左80px")).toBeFocused();
  save(`keyboard-canvas-${info.project.name}`, {
    trace,
    after: await state(page),
    tabExited: true,
  });
});
test("same-model click preview confirm cancel undo and bounds keep external focus", async ({
  page,
}) => {
  await open(page, 1);
  const before = await state(page);
  await btn(page, "预览节点右移40").click();
  expect((await state(page)).nodes).toEqual(before.nodes);
  await btn(page, "取消当前预览").click();
  await expect(btn(page, "取消当前预览")).toBeFocused();
  expect((await state(page)).nodes).toEqual(before.nodes);
  await btn(page, "预览节点右移40").click();
  await btn(page, "确认当前预览").click();
  expect((await state(page)).nodes[0].x).toBe(before.nodes[0].x + 40);
  await expect(btn(page, "确认当前预览")).toBeFocused();
  await btn(page, "撤销节点提交").click();
  expect((await state(page)).nodes).toEqual(before.nodes);
  await expect(btn(page, "撤销节点提交")).toBeFocused();
});
test("actual capture loss pending withdrawal outside up blur and Escape cancel all committed changes", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.captures32 = [];
    for (const type of ["gotpointercapture", "lostpointercapture"])
      document.addEventListener(
        type,
        (e) => window.captures32.push({ type, id: e.pointerId }),
        true,
      );
  });
  await open(page);
  const before = await state(page),
    p = await startPan(page);
  await page.mouse.move(p.x + 2, p.y + 2);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.captures32.some((e) => e.type === "gotpointercapture"),
      ),
    )
    .toBe(true);
  const id = Number(await lab(page).getAttribute("data-pointer-id"));
  await vp(page).evaluate((e, id) => e.releasePointerCapture(id), id);
  await page.mouse.move(3, 3);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.captures32.some((e) => e.type === "lostpointercapture"),
      ),
    )
    .toBe(true);
  await idle(page);
  await page.mouse.up();
  expect((await state(page)).view).toEqual(before.view);
  await startPan(page);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await page.mouse.up();
  await idle(page);
  await startPan(page);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await idle(page);
  await startPan(page);
  await page.mouse.move(3, 3);
  await page.mouse.up();
  await idle(page);
  expect((await state(page)).view).toEqual(before.view);
  const nodeRect = await shape(page, "a").boundingBox();
  await page.mouse.move(
    nodeRect.x + nodeRect.width / 2,
    nodeRect.y + nodeRect.height / 2,
  );
  await page.mouse.down();
  await expect(lab(page)).toHaveAttribute("data-session", "pointer-node");
  await page.mouse.move(3, 3);
  await page.mouse.up();
  await idle(page);
  expect((await state(page)).nodes).toEqual(before.nodes);
  expect((await state(page)).view).toEqual(before.view);
  await page.evaluate(() => {
    const original = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = function (id) {
      original.call(this, id);
      this.releasePointerCapture(id);
    };
  });
  await startPan(page);
  await page.mouse.move(3, 3);
  await page.mouse.up();
  await idle(page);
  expect((await state(page)).view).toEqual(before.view);
  save(`capture-cancel-${info.project.name}`, {
    events: await page.evaluate(() => window.captures32),
    actualOutsideUp: true,
    releaseAndBlurAreFaultFixtures: true,
  });
});
test("resize preserves world center projection and zero-size recovery has no hidden Tab region", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "画面向右80px").click();
  const before = await state(page);
  await page.setViewportSize({ width: 480, height: 540 });
  await expect
    .poll(async () => (await state(page)).size.width)
    .not.toBe(before.size.width);
  const resized = await projection(page);
  expect(resized.view).toEqual(before.view);
  expect(resized.nodes).toEqual(before.nodes);
  await btn(page, "收起绘图区（零尺寸）").click();
  await expect(vp(page)).toHaveCount(0);
  await expect.poll(async () => (await state(page)).size.width).toBe(0);
  await btn(page, "放大（中心锚点）").click();
  expect((await state(page)).view).toEqual(before.view);
  await expect(btn(page, "放大（中心锚点）")).toBeFocused();
  await btn(page, "恢复绘图区").click();
  await expect(vp(page)).toBeVisible();
  const restored = await projection(page);
  expect(restored.view).toEqual(before.view);
  save(`resize-zero-${info.project.name}`, { before, resized, restored });
});
test("edge node recovery fit and long label keep real data and readable text alternative", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "选择节点C").click();
  await btn(page, "把选中节点移到边缘").click();
  const edge = await state(page);
  expect(edge.nodes.find((n) => n.id === "c")).toMatchObject({
    x: 400,
    y: 400,
  });
  await btn(page, "定位选中节点").click();
  expect((await state(page)).view).toMatchObject({ cx: 400, cy: 400 });
  await btn(page, "节点右移20").click();
  expect((await state(page)).nodes.find((n) => n.id === "c").x).toBe(400);
  await btn(page, "适应全部内容").click();
  const fitted = await projection(page);
  for (const n of fitted.centers) {
    expect(n.x - n.width / 2).toBeGreaterThanOrEqual(fitted.box.left - 0.6);
    expect(n.x + n.width / 2).toBeLessThanOrEqual(
      fitted.box.left + fitted.box.width + 0.6,
    );
    expect(n.y - n.height / 2).toBeGreaterThanOrEqual(fitted.box.top - 0.6);
    expect(n.y + n.height / 2).toBeLessThanOrEqual(
      fitted.box.top + fitted.box.height + 0.6,
    );
  }
  await btn(page, "填入长标签示例").click();
  const text = await page
    .getByLabel("选中节点标签", { exact: true })
    .inputValue();
  await btn(page, "应用节点文字").click();
  await expect(page.locator(".space32-objects")).toContainText(text);
  expect((await state(page)).nodes.find((n) => n.id === "c").label).toBe(text);
  await expect(vp(page).locator('a,button,input,[tabindex="0"]')).toHaveCount(
    0,
  );
  await axes(page);
  save(`edge-label-${info.project.name}`, { edge, fitted, label: text });
});
test("rapid interleaved commands cancel old pointer preview and zoom clamps are truthful", async ({
  page,
}) => {
  await open(page);
  const before = await state(page),
    p = await startPan(page);
  await page.mouse.move(p.x + 35, p.y + 10);
  await page.keyboard.press("Equal");
  await page.mouse.up();
  await idle(page);
  const after = await state(page);
  expect(after.view.cx).toBeCloseTo(before.view.cx, 4);
  expect(after.view.cy).toBeCloseTo(before.view.cy, 4);
  expect(after.view.z).toBeGreaterThan(before.view.z);
  for (let i = 0; i < 15; i++) await btn(page, "放大（中心锚点）").click();
  expect((await state(page)).view.z).toBe(2.5);
  await expect(btn(page, "放大（中心锚点）")).toBeFocused();
  for (let i = 0; i < 25; i++) await btn(page, "缩小（中心锚点）").click();
  expect((await state(page)).view.z).toBe(0.2);
  await expect(btn(page, "缩小（中心锚点）")).toBeFocused();
  expect((await state(page)).nodes).toEqual(before.nodes);
});
test("late coalesced wheel/pointer callbacks reduce hidden and unmount cannot overwrite new view", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const original = requestAnimationFrame;
    window.held32 = [];
    window.rafCalls32 = 0;
    window.requestAnimationFrame = (cb) => {
      window.rafCalls32++;
      if (window.hold32) {
        window.held32.push(cb);
        return original(() => {});
      }
      return original(cb);
    };
  });
  await open(page, 2);
  await page
    .getByLabel("普通滚轮缩放画布（仅绘图区，默认关闭）", { exact: true })
    .check();
  const b = await prepare(page);
  await page.mouse.click(b.left + 5, b.top + 5);
  await page.evaluate(() => (window.hold32 = true));
  await page.mouse.wheel(0, -80);
  await expect
    .poll(() => page.evaluate(() => window.held32.length))
    .toBeGreaterThan(0);
  await page.keyboard.press("Home");
  const fixed = await state(page);
  await page.evaluate(() => {
    window.hold32 = false;
    window.held32.forEach((cb) => cb(performance.now()));
  });
  expect((await state(page)).view).toEqual(fixed.view);
  const p = await startPan(page);
  await page.evaluate(() => (window.hold32 = true));
  await page.mouse.move(p.x + 25, p.y + 10);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.up();
  await idle(page);
  await page.evaluate(() => (window.hold32 = false));
  await stage(page, 3).click();
  await stage(page, 0).click();
  const remounted = await state(page);
  await page.evaluate(() =>
    window.held32.forEach((cb) => cb(performance.now())),
  );
  expect((await state(page)).view).toEqual(remounted.view);
  expect((await state(page)).nodes).toEqual(remounted.nodes);
  await expect(lab(page)).toHaveAttribute("data-reduced", "true");
  const calls = await page.evaluate(() => window.rafCalls32);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => window.rafCalls32)).toBe(calls);
  save(`late-frames-${info.project.name}`, {
    fixed,
    remounted,
    deliberatelyHeldRAF: true,
    idleCalls: calls,
  });
});
test("actual touch pan zoomed node move touchCancel and outside page scroll are distinct", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
    }),
    p = await c.newPage();
  await open(p, 2);
  const cdp = await c.newCDPSession(p),
    b = await prepare(p),
    before = await state(p),
    x = b.left + 5,
    y = b.top + 5;
  const gesture = async (x, y, dx, dy, cancel = false) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8, id: 1 }],
      });
      await p.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: cancel ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
  };
  await gesture(x, y, 36, 22);
  await idle(p);
  expect((await state(p)).view.cx).toBeCloseTo(
    before.view.cx - 36 / before.view.z,
    0,
  );
  expect((await state(p)).nodes).toEqual(before.nodes);
  await btn(p, "选择节点B").tap();
  await btn(p, "定位选中节点").tap();
  await btn(p, "放大（中心锚点）").tap();
  await prepare(p);
  const nodeBefore = await state(p),
    r = await shape(p, "b").boundingBox();
  await gesture(r.x + r.width / 2, r.y + r.height / 2, 24, 16);
  await idle(p);
  const moved = await state(p),
    old = nodeBefore.nodes.find((n) => n.id === "b");
  expect(moved.nodes.find((n) => n.id === "b").x).toBeCloseTo(
    old.x + 24 / nodeBefore.view.z,
    0,
  );
  const q = await prepare(p);
  await gesture(q.left + 5, q.top + 5, 18, 18, true);
  await idle(p);
  expect((await state(p)).view).toEqual(moved.view);
  const outer = await p.evaluate(() => scrollY);
  await gesture(20, 650, 0, -240);
  await expect.poll(() => p.evaluate(() => scrollY)).toBeGreaterThan(outer);
  save(`touch-native-${info.project.name}`, {
    before,
    moved,
    realCDPTouch: true,
    actualTouchCancel: true,
    outerBefore: outer,
    outerAfter: await p.evaluate(() => scrollY),
  });
  await c.close();
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local viewport controls object label crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 4) await btn(page, "生成无限画布指令").click();
    await axes(page);
    mkdirSync(out, { recursive: true });
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
    await page
      .locator(
        n < 3 ? ".space32-viewport" : n === 3 ? ".quiz-grid" : ".agent-grid",
      )
      .screenshot({ path: `${out}/crop${n + 1}-${info.project.name}.png` });
  });
async function flow(p, act, toggle, edit) {
  await directory(p, act);
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("填入标题示例");
  await edit(p.getByLabel("演练标题", { exact: true }), "caption");
  await a("画面向右80px");
  await a("放大（中心锚点）");
  await a("测量画布中心");
  await a("适应全部内容");
  await next();
  await a("选择节点B");
  await a("节点右移20");
  await a("预览节点右移40");
  await a("确认当前预览");
  await a("预览节点右移40");
  await a("取消当前预览");
  await a("撤销节点提交");
  expect((await state(p)).nodes.find((n) => n.id === "b").x).toBe(20);
  await next();
  await a("把选中节点移到边缘");
  await a("定位选中节点");
  expect((await state(p)).view).toMatchObject({ cx: 400, cy: 400 });
  await a("适应全部内容");
  await a("填入长标签示例");
  await edit(p.getByLabel("选中节点标签", { exact: true }), "label");
  await a("应用节点文字");
  const model = (await state(p)).nodes;
  await a("收起绘图区（零尺寸）");
  await expect(vp(p)).toHaveCount(0);
  await a("恢复绘图区");
  expect((await state(p)).nodes).toEqual(model);
  await toggle(
    p.getByLabel("普通滚轮缩放画布（仅绘图区，默认关闭）", { exact: true }),
    "wheel-on",
  );
  await toggle(
    p.getByLabel("普通滚轮缩放画布（仅绘图区，默认关闭）", { exact: true }),
    "wheel-off",
  );
  await next();
  const q = p.locator(".quiz-card");
  await act(q.nth(0).getByRole("button").nth(0), "wrong");
  await expect(q.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(q.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成无限画布指令");
  const draft = p.getByLabel("可编辑的 无限画布 Agent 指令");
  await expect(draft).toHaveValue(
    /数据结构.*导航与锚点.*选择与编辑.*事务与输入.*滚动与无障碍.*性能与持久化/s,
  );
  await edit(draft, "draft");
  await a("复制无限画布指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 坐标、导航、编辑与恢复。", { exact: true }),
    "review",
  );
  await a("完成第三十二节");
  await expect(p.locator(".notice")).toContainText(
    "可以继续综合阶段A「设计工具映射」，再到B「Agent指令能力」。T01/T02/T03/T04/T05/T06已开放，T07–T12尚未制作，课程仍在继续",
  );
  await expect(p.locator(".notice")).not.toContainText("全课程已完成");
  await expect(p.locator(".lesson-thirty-two .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await stored(p);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-thirty-two .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第三十二节进度");
  await a("保留第三十二节进度");
  await expect(p.locator(".lesson-thirty-two .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第三十二节进度");
  await a("确认重置第三十二节");
  await expect(p.locator("#space32-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-thirty-two .lesson-bottom")).toContainText(
    "0 / 5",
  );
  expect((await state(p)).nodes).toEqual(nodes32());
  await axes(p);
  return done;
}
test("full actual Tab flow retry real edits copy refresh cancel confirm reset preserves31", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson32",
      profile: info.project.name,
    });
  const done = await flow(page, nav.act, nav.toggle, async (f, n) => {
    await nav.seek(f, n);
    await page.keyboard.press("End");
    await page.keyboard.type(
      n === "draft"
        ? "\nReview viewport, anchors, recovery and remaining modules."
        : " edited",
    );
  });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  save(`keyboard-${info.project.name}`, { trace, done });
});
for (const reduced of [false, true])
  test(`full zero keyboard touch ${reduced ? "reduce" : "normal"} edits retry refresh reset preserves31`, async ({
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
          ? "触屏流程画布"
          : n === "label"
            ? "可真实编辑的教学长标签，全文保留在对象列表中。"
            : (await f.inputValue()) + "\n触屏检查坐标、恢复和后续模块。",
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
      textEntry: "input fill fixture, no OS keyboard/IME claim",
    });
    await c.close();
  });
test("corrupt nodes storage and missing ResizeObserver retain measurable interactive fallback", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    localStorage.setItem(
      k,
      JSON.stringify({
        nodes: [
          { id: "a", x: 0, y: 0, label: "bad" },
          { id: "a", x: 0, y: 0, label: "dup" },
        ],
        view: { cx: 1e9, z: 0 },
        step: 2,
      }),
    );
    window.ResizeObserver = undefined;
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
  }, key);
  await open(page, 2);
  expect((await state(page)).nodes).toEqual(nodes32());
  await btn(page, "重新测量绘图区").click();
  await page.setViewportSize({ width: 480, height: 540 });
  await expect
    .poll(async () => {
      const s = await state(page);
      return (
        Math.abs(s.size.width - s.box.width) +
        Math.abs(s.size.height - s.box.height)
      );
    })
    .toBeLessThan(0.1);
  await projection(page);
  const beforePan = await state(page),
    point = await startPan(page);
  await page.mouse.move(point.x + 18, point.y + 12, { steps: 5 });
  await page.mouse.up();
  await idle(page);
  expect((await state(page)).view.cx).toBeCloseTo(
    beforePan.view.cx - 18 / beforePan.view.z,
    4,
  );
  await projection(page);
  await btn(page, "节点右移20").click();
  expect((await state(page)).nodes[0].x).toBe(-100);
  await expect(page.locator(".saved")).toContainText("存储不可用");
});
test("copy success matches real edited brief and late denial cannot steal external focus or reset", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copied32 = text;
        },
      },
    }),
  );
  await open(page, 4);
  await btn(page, "生成无限画布指令").click();
  const draft = page.getByLabel("可编辑的 无限画布 Agent 指令");
  await draft.fill((await draft.inputValue()) + "\nExtra review.");
  const nav = createKeyboardNavigator(page, expect, [], {
    lesson: "lesson32",
    profile: info.project.name,
  });
  await nav.act(btn(page, "复制无限画布指令"), "copy-success");
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.copied32)).toBe(
    await draft.inputValue(),
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, reject) => (window.reject32 = reject)),
      },
    }),
  );
  await nav.act(btn(page, "复制无限画布指令"), "copy");
  await nav.seek(btn(page, "重置第三十二节进度"), "outside");
  await page.evaluate(() => window.reject32(Error("late")));
  await expect(btn(page, "重置第三十二节进度")).toBeFocused();
  await nav.act(btn(page, "复制无限画布指令"), "copy-again");
  await nav.act(btn(page, "重置第三十二节进度"), "reset");
  await nav.act(btn(page, "确认重置第三十二节"), "confirm");
  await page.evaluate(() => window.reject32(Error("old")));
  await expect(page.locator("#space32-stage-heading")).toBeFocused();
  expect((await stored(page)).draft).toBe("");
});
