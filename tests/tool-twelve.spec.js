import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL12_STORAGE as KEY,
  tool12Initial,
  tool12Brief,
  tool12Questions,
  recommendation,
} from "../src/tool-twelve-content.js";
import {
  CARD_IDS,
  ROWS,
  ROW_HEIGHT,
  createSortSession,
  moveByID,
  runtimeState,
  filterRows,
} from "../src/tool-twelve-model.js";
const out = "/tmp/tool12-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  f = (p, n) => p.locator("#tool12-" + n),
  board = (p) => p.locator(".tool12-board"),
  sort = (p) => p.locator(".tool12-sort"),
  virtual = (p) => p.locator(".tool12-virtual"),
  row = (p, id) => p.locator(`[data-row-id="${id}"]`),
  handle = (p, id) => b(p, `移动对象${id}把手`),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T12工具专题学习步骤" })
      .getByRole("button")
      .nth(n),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  sv = async (p) => JSON.parse(await sort(p).getAttribute("data-sort-view")),
  vv = async (p) =>
    JSON.parse(await virtual(p).getAttribute("data-virtual-view")),
  save = (n, v) =>
    writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", {
      name: "T12 · dnd-kit / Virtualization · 可学习",
      exact: true,
    }),
    "T12",
  );
  await expect(f(p, "stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  if (n) await stage(p, n).click();
}
async function seed(p, d) {
  await p.addInitScript(
    ([k, d]) => localStorage.setItem(k, JSON.stringify(d)),
    [KEY, d],
  );
}
async function inspect(p) {
  await b(p, "检查实际虚拟窗口与DOM").click();
  return JSON.parse(
    await p
      .locator("[data-virtual-snapshot]")
      .getAttribute("data-virtual-snapshot"),
  );
}
async function inspectSort(p) {
  await b(p, "读取排序模型与DOM快照").click();
  return JSON.parse(
    await p.locator("[data-sort-snapshot]").getAttribute("data-sort-snapshot"),
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
const good = () => ({
  ...tool12Initial(),
  done: [0, 1, 2, 3],
  needsSeen: ["small", "browse", "remote"],
  scopeSeen: true,
  movedSeen: true,
  canceledSeen: true,
  alternativeSeen: true,
  sortInspected: true,
  windowSeen: true,
  offscreenSeen: true,
  preservedSeen: true,
  filterSeen: true,
  emptySeen: true,
  answers: tool12Questions.map((q) => q.correct),
});
async function mouseDrag(p, id, target, cancel) {
  await handle(p, id).scrollIntoViewIfNeeded();
  const a = await handle(p, id).boundingBox(),
    z = await p.locator(`[data-sort-id="${target}"]`).boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await p.mouse.down();
  await expect(sort(p)).toHaveAttribute("data-sort-phase", "pointer");
  await p.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 6 });
  if (cancel) await p.keyboard.press("Escape");
  await p.mouse.up();
  await expect(sort(p)).toHaveAttribute("data-sort-phase", "idle");
}

test("native stable-ID transactional model preview duplicate cancel stale token undo and disposal", async () => {
  const base = runtimeState(),
    s = createSortSession();
  s.start();
  const a = s.begin("A", "pointer", 1);
  expect(s.begin("B")).toBeNull();
  s.preview("C", a);
  expect(s.inspect().order).toEqual(CARD_IDS);
  s.cancel("Escape", a);
  const next = s.begin("B", "buttons");
  expect(s.commit(a)).toBe(false);
  s.preview("D", next);
  expect(s.commit(next)).toBe(true);
  expect(s.inspect().order).toEqual(["A", "C", "D", "B", "E", "F"]);
  s.undo();
  expect(s.inspect().order).toEqual(CARD_IDS);
  expect(moveByID(CARD_IDS, "A", "C")).toEqual(["B", "C", "A", "D", "E", "F"]);
  expect(moveByID(CARD_IDS, "bad", "C")).toEqual(CARD_IDS);
  for (let i = 0; i < 30; i++) s.move("A", i % 2 ? "C" : "B");
  expect(s.inspect().events.length).toBeLessThanOrEqual(24);
  expect(s.inspect().undoDepth).toBeLessThanOrEqual(12);
  s.begin("C");
  s.destroy();
  expect(s.commit(next)).toBe(false);
  s.destroy();
  expect(runtimeState()).toEqual(base);
});
test("actual rows are2000 stable IDs filters retain identity independent of index", async () => {
  expect(ROWS).toHaveLength(2000);
  expect(new Set(ROWS.map((r) => r.id)).size).toBe(2000);
  expect(filterRows("odd")[1]).toBe(ROWS[2]);
  expect(filterRows("empty")).toEqual([]);
  expect(ROW_HEIGHT).toBe(72);
});
test("official sources real Virtual version native drag boundary current and legacy dnd routes", async ({
  page,
}) => {
  await open(page);
  const refs = page
    .locator(".tool-twelve .roadmap-details")
    .filter({ hasText: "T12工具专题核对说明与官方来源" });
  await refs.locator(":scope > summary").click();
  await expect(refs.getByRole("link")).toHaveCount(6);
  await expect(refs).toContainText("3.14.22");
  await expect(refs).toContainText("未安装运行dnd-kit");
  await expect(refs).not.toContainText(/XState|Stately|CLI|Radix/);
  for (const n of [
    "大量已加载对象浏览",
    "远端分批数据合同",
    "展开三种职责对照",
    "核对职责与当前实际机制",
  ])
    await b(page, n).click();
  expect((await read(page)).needsSeen).toEqual(["small", "browse", "remote"]);
  for (const term of [
    "稳定",
    "dnd-kit",
    "getItemKey",
    "overscan",
    "72",
    "2000",
    "取消",
    "动态",
    "46项入口",
  ])
    expect(tool12Brief(good())).toContain(term);
  expect(recommendation({ ...good(), need: "remote" })).toContain(
    "不保证旧DOM已卸载",
  );
});
test("actual mouse sort changes real order geometry and cancellation leaves original IDs", async ({
  page,
}, info) => {
  await open(page, 1);
  await mouseDrag(page, "A", "B", true);
  await expect(sort(page)).toHaveAttribute("data-sort-order", "A,B,C,D,E,F");
  await mouseDrag(page, "A", "B");
  await expect(sort(page)).toHaveAttribute("data-sort-order", "B,A,C,D,E,F");
  const snap = await inspectSort(page);
  expect(snap.dom.map((r) => r.id)).toEqual(snap.order);
  for (let i = 1; i < snap.dom.length; i++)
    expect(snap.dom[i].top).toBeGreaterThan(snap.dom[i - 1].top);
  await b(page, "撤销上次排序").click();
  await expect(sort(page)).toHaveAttribute("data-sort-order", "A,B,C,D,E,F");
  save(info.project.name + "-actual-pointer-sort", snap);
});
test("real keyboard handle preview arrows commit same node visible focus and Tab cancels", async ({
  page,
}, info) => {
  await open(page, 1);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool12-sort-key",
      profile: info.project.name,
    });
  await k.seek(handle(page, "A"), "handleA");
  const el = await handle(page, "A").elementHandle();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await expect(sort(page)).toHaveAttribute("data-sort-order", "A,B,C,D,E,F");
  await page.keyboard.press("Enter");
  await expect(sort(page)).toHaveAttribute("data-sort-order", "B,A,C,D,E,F");
  await expect(handle(page, "A")).toBeFocused();
  expect(await el.evaluate((e) => e === document.activeElement)).toBe(true);
  await k.seek(handle(page, "A"), "same node after move");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  await expect(sort(page)).toHaveAttribute("data-sort-phase", "idle");
  await expect(sort(page)).toHaveAttribute("data-sort-order", "B,A,C,D,E,F");
  expect(await page.evaluate(() => document.activeElement.tagName)).not.toBe(
    "BODY",
  );
  save(info.project.name + "-sort-keyboard", trace);
});
test("button alternative uses same transaction cancel duplicate start stable commit focus", async ({
  page,
}) => {
  await open(page, 1);
  await b(page, "开始按钮移动预览").click();
  const token = (await sv(page)).transaction.token;
  await b(page, "开始按钮移动预览").click();
  expect((await sv(page)).transaction.token).toBe(token);
  await b(page, "取消当前移动").click();
  await expect(sort(page)).toHaveAttribute("data-sort-order", "A,B,C,D,E,F");
  await b(page, "按所选位置移动").click();
  await expect(sort(page)).toHaveAttribute("data-sort-order", "B,C,A,D,E,F");
  await expect(b(page, "按所选位置移动")).toBeFocused();
  await expect.poll(async () => (await read(page)).alternativeSeen).toBe(true);
});
test("pointer outside drop capture loss blur resize and old callback cannot submit newer generation", async ({
  page,
}) => {
  await open(page, 1);
  await page.evaluate(() => {
    const add = window.addEventListener;
    window.oldUps12 = [];
    window.addEventListener = function (t, f, o) {
      if (t === "pointerup") window.oldUps12.push(f);
      return add.call(this, t, f, o);
    };
  });
  await handle(page, "A").scrollIntoViewIfNeeded();
  let r = await handle(page, "A").boundingBox();
  await page.mouse.move(r.x + 20, r.y + 20);
  await page.mouse.down();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  r = await handle(page, "A").boundingBox();
  await page.mouse.move(r.x + 20, r.y + 20);
  await page.mouse.down();
  const t = (await sv(page)).transaction.token;
  await page.evaluate(() =>
    window.oldUps12[0](
      new PointerEvent("pointerup", { pointerId: 1, clientX: 0, clientY: 0 }),
    ),
  );
  expect((await sv(page)).transaction.token).toBe(t);
  await handle(page, "A").evaluate((e) => e.releasePointerCapture(1));
  await page.mouse.move(r.x + 24, r.y + 21);
  await expect(sort(page)).toHaveAttribute("data-sort-phase", "idle");
  await page.mouse.up();
  await expect(sort(page)).toHaveAttribute("data-sort-order", "A,B,C,D,E,F");
  for (const kind of ["outside", "blur", "resize"]) {
    r = await handle(page, "A").boundingBox();
    await page.mouse.move(r.x + 20, r.y + 20);
    await page.mouse.down();
    if (kind === "outside") {
      await page.mouse.move(1, 1);
      await page.mouse.up();
    }
    if (kind === "blur") {
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await page.mouse.up();
    }
    if (kind === "resize") {
      const v = page.viewportSize();
      await page.setViewportSize({ width: v.width, height: v.height - 15 });
      await page.mouse.up();
    }
    await expect(sort(page)).toHaveAttribute("data-sort-phase", "idle");
  }
  await b(page, "读取排序模型与DOM快照").click();
  expect(
    JSON.parse(
      await page
        .locator("[data-sort-snapshot]")
        .getAttribute("data-sort-snapshot"),
    ).runtime,
  ).toMatchObject({ transactions: 0, listeners: 1 });
});
test("real Virtual instance items agree with mounted DOM totalSize and actual row geometry", async ({
  page,
}, info) => {
  await open(page, 2);
  await expect(row(page, "item-0001")).toBeVisible();
  const x = await inspect(page);
  expect(x.logicalLoaded).toBe(2000);
  expect(x.filteredCount).toBe(2000);
  expect(x.totalSize).toBe(144000);
  expect(x.dom.length).toBe(x.items.length);
  expect(x.dom.length).toBeGreaterThan(3);
  expect(x.dom.length).toBeLessThan(30);
  expect(x.items.map((i) => i.key)).toEqual(x.dom.map((d) => d.id));
  const position = await page.locator(".tool12-scroll").evaluate((e) => ({
    top: e.getBoundingClientRect().top,
    scroll: e.scrollTop,
    clientTop: e.clientTop,
  }));
  for (let i = 0; i < x.items.length; i++) {
    expect(x.dom[i].height).toBe(72);
    expect(
      Math.abs(
        x.dom[i].top -
          (position.top +
            position.clientTop -
            position.scroll +
            x.items[i].start),
      ),
    ).toBeLessThan(1.1);
  }
  expect(x.runtime).toMatchObject({
    virtualComponents: 1,
    rectObservers: 1,
    offsetObservers: 1,
  });
  save(info.project.name + "-actual-library-geometry", x);
});
test("genuine wheel scroll changes real window buffer mounted offscreen then unmounts preserving ID model", async ({
  page,
}, info) => {
  await open(page, 2);
  await b(page, "切换选中对象标记").click();
  await b(page, "填入对象备注示例").click();
  await f(page, "note").fill("用户真实编辑备注");
  const e = page.locator(".tool12-scroll");
  await e.scrollIntoViewIfNeeded();
  let r = await e.boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.wheel(0, 80);
  await expect.poll(() => e.evaluate((el) => el.scrollTop)).toBeGreaterThan(50);
  let x = await inspect(page);
  expect(x.selected).toMatchObject({ mounted: true, visible: false });
  await e.scrollIntoViewIfNeeded();
  r = await e.boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.wheel(0, 3000);
  await expect(row(page, "item-0001")).toHaveCount(0);
  x = await inspect(page);
  expect(x.selected).toMatchObject({
    mounted: false,
    record: { marked: true, note: "用户真实编辑备注" },
  });
  await b(page, "定位选中项").click();
  await expect(row(page, "item-0001")).toBeVisible();
  x = await inspect(page);
  expect(x.selected.visible).toBe(true);
  await expect.poll(async () => (await read(page)).preservedSeen).toBe(true);
  save(info.project.name + "-offscreen-unmounted-restored", x);
});
test("filter changes key identity not array index empty retains logical data and editor focus", async ({
  page,
}) => {
  await open(page, 2);
  await b(page, "切换选中对象标记").click();
  await b(page, "填入对象备注示例").click();
  await f(page, "filter").selectOption("odd");
  await expect(row(page, "item-0003")).toHaveAttribute("data-index", "1");
  await expect(row(page, "item-0001")).toHaveAttribute("data-marked", "true");
  let x = await inspect(page);
  expect(x.items[1].key).toBe("item-0003");
  expect(x.filteredCount).toBe(1000);
  expect(x.totalSize).toBe(72000);
  await f(page, "filter").selectOption("empty");
  await expect(page.locator("[data-row-id]")).toHaveCount(0);
  x = await inspect(page);
  expect(x.logicalLoaded).toBe(2000);
  expect(x.totalSize).toBe(0);
  expect(x.selected.record.note).toBe("此对象需优先核对");
  await f(page, "filter").selectOption("all");
  await expect(row(page, "item-0001")).toHaveAttribute("data-marked", "true");
  await f(page, "note").click();
  await page.keyboard.press("End");
  await page.keyboard.type("X");
  await b(page, "离开选中项窗口").click();
  await expect(row(page, "item-0001")).toHaveCount(0);
  await expect(b(page, "离开选中项窗口")).toBeFocused();
  await expect(f(page, "note")).toHaveValue("此对象需优先核对X");
});
test("native Home End and button location reach real extremes without trapping Tab", async ({
  page,
}, info) => {
  await open(page, 2);
  const k = createKeyboardNavigator(page, expect, [], {
      lesson: "tool12-window-native",
      profile: info.project.name,
    }),
    e = page.locator(".tool12-scroll");
  await k.seek(e, "native scroll");
  await page.keyboard.press("End");
  await expect(row(page, "item-2000")).toBeVisible();
  await page.keyboard.press("Home");
  await expect(row(page, "item-0001")).toBeVisible();
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => e.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(100);
  await page.keyboard.press("Tab");
  await expect(e).not.toBeFocused();
  await b(page, "移到列表末尾").click();
  await expect(row(page, "item-2000")).toBeVisible();
  await b(page, "回到列表开头").click();
  await expect(row(page, "item-0001")).toBeVisible();
});
test("ID input validates real edits and long labels remain full outside fixed rows", async ({
  page,
}) => {
  await open(page, 2);
  for (const value of ["", "0", "-1", "no", "2001"]) {
    await f(page, "id").fill(value);
    await b(page, "按编号选择").click();
    expect((await vv(page)).selected).toBe("item-0001");
    await expect(page.locator(".tool12-feedback")).toContainText("1–2000");
  }
  await b(page, "填入编号示例50").click();
  await f(page, "id").fill("51");
  await b(page, "按编号选择").click();
  await b(page, "定位选中项").click();
  await expect(row(page, "item-0051")).toBeVisible();
  await b(page, "切换长标题样例").click();
  await expect(page.locator("#tool12-editor-title + p")).toContainText(
    "长标题需要保留全文",
  );
  const style = await row(page, "item-0051")
    .locator("strong")
    .evaluate((e) => ({
      overflow: getComputedStyle(e).overflow,
      text: getComputedStyle(e).textOverflow,
    }));
  expect(style).toEqual({ overflow: "hidden", text: "ellipsis" });
  expect(
    await row(page, "item-0051").evaluate(
      (e) => e.getBoundingClientRect().height,
    ),
  ).toBe(72);
});

test("keyboard transaction yields immediately to deliberate external focus no old completion steals it", async ({
  page,
}, info) => {
  await open(page, 1);
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool12-external-focus",
    profile: info.project.name,
  });
  await k.seek(handle(page, "A"), "source");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  const active = await page.evaluate(() => document.activeElement.outerHTML);
  await b(page, "提交当前移动").click();
  await expect(sort(page)).toHaveAttribute("data-sort-order", "A,B,C,D,E,F");
  await expect(b(page, "提交当前移动")).toBeFocused();
  expect(active).not.toContain("<body");
});
test("real overscan and resize change range without changing fixed item geometry or selected state", async ({
  page,
}) => {
  await open(page, 2);
  let a = await inspect(page);
  await f(page, "overscan").selectOption("6");
  let z = await inspect(page);
  expect(z.dom.length).toBeGreaterThan(a.dom.length);
  await page.setViewportSize({ width: 375, height: 480 });
  z = await inspect(page);
  expect(z.scrollRect.height).toBeLessThan(300);
  expect(z.totalSize).toBe(144000);
  expect(z.items.every((i) => i.size === 72)).toBe(true);
  await b(page, "移到列表末尾").click();
  await expect(row(page, "item-2000")).toBeVisible();
  const geometry = await row(page, "item-2000").evaluate((el) => {
    const a = el.getBoundingClientRect(),
      b = el.closest(".tool12-scroll").getBoundingClientRect();
    return a.bottom <= b.bottom + 1 && a.top >= b.top - 1;
  });
  expect(geometry).toBe(true);
});
test("virtual row unmount preserves deliberate stable editor focus and edited input", async ({
  page,
}) => {
  await open(page, 2);
  await f(page, "note").fill("稳定编辑区");
  await expect(f(page, "note")).toBeFocused();
  const e = page.locator(".tool12-scroll");
  await e.scrollIntoViewIfNeeded();
  const r = await e.boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.wheel(0, 3000);
  await expect(row(page, "item-0001")).toHaveCount(0);
  await expect(f(page, "note")).toBeFocused();
  await expect(f(page, "note")).toHaveValue("稳定编辑区");
});
test("real observer teardown hidden restore and old native callback cannot revive unmounted virtualizer", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.evaluate(() => {
    const RO = window.ResizeObserver;
    window.oldRO12 = [];
    window.ResizeObserver = class extends RO {
      constructor(cb) {
        super(cb);
        this.callback12 = cb;
      }
      observe(el, opts) {
        if (el.classList.contains("tool12-scroll"))
          window.oldRO12.push({ cb: this.callback12, el });
        return super.observe(el, opts);
      }
    };
    window.hidden12 = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.hidden12,
    });
  });
  await stage(page, 2).click();
  await b(page, "填入对象备注示例").click();
  await page.evaluate(() => {
    window.hidden12 = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(virtual(page)).toContainText("观察器暂停");
  let x = await inspect(page);
  expect(x.runtime).toMatchObject({ rectObservers: 0, offsetObservers: 0 });
  await page.evaluate(() => {
    window.hidden12 = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(row(page, "item-0001")).toBeVisible();
  await expect(f(page, "note")).toHaveValue("此对象需优先核对");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await b(page, "移到列表末尾").click();
  await stage(page, 1).click();
  x = await inspectSort(page);
  expect(x.runtime).toMatchObject({
    virtualComponents: 0,
    rectObservers: 0,
    offsetObservers: 0,
    transactions: 0,
    sortSessions: 1,
    listeners: 1,
  });
  await page.evaluate(() => {
    for (const x of window.oldRO12)
      x.cb([
        { target: x.el, borderBoxSize: [{ inlineSize: 300, blockSize: 200 }] },
      ]);
  });
  await expect(sort(page)).toHaveAttribute("data-sort-order", "A,B,C,D,E,F");
  await stage(page, 2).click();
  await expect(row(page, "item-0001")).toBeVisible();
  x = await inspect(page);
  expect(x.runtime).toMatchObject({
    virtualComponents: 1,
    rectObservers: 1,
    offsetObservers: 1,
    sortSessions: 0,
    transactions: 0,
    listeners: 1,
  });
  expect(errors).toEqual([]);
  save(info.project.name + "-actual-cleanup", x);
});
test("parameter changes revoke review and preserve manually edited text until explicit regeneration", async ({
  page,
}) => {
  const d = {
    ...good(),
    context: "现有排序与对象浏览",
    generated: true,
    reviewed: true,
  };
  d.draft = tool12Brief(d) + "自己的限制";
  await seed(page, d);
  await open(page, 2);
  await f(page, "overscan").selectOption("6");
  await f(page, "filter").selectOption("odd");
  expect(await read(page)).toMatchObject({
    draft: d.draft,
    reviewed: false,
    draftStale: true,
  });
  await stage(page, 4).click();
  await expect(f(page, "agent-draft")).toHaveValue(d.draft);
  await b(page, "保留编辑并确认当前实验参数").click();
  expect((await read(page)).draftStale).toBe(false);
  await f(page, "context").fill("自己改写维护条件");
  await expect(f(page, "agent-draft")).toHaveValue(d.draft);
  await b(page, "重新生成工具选型草稿").click();
  await expect(f(page, "agent-draft")).toHaveValue(/overscan=6/);
  expect((await read(page)).reviewed).toBe(false);
});
test("malformed storage bounds enums stage and review do not invent a completed lesson", async ({
  page,
}) => {
  await seed(page, {
    ...good(),
    step: 8,
    done: [0, 0, 7, "1"],
    need: "unknown",
    overscan: 100000,
    filter: "secret",
    needsSeen: ["browse", "bad", "browse"],
    context: "x".repeat(900),
    draft: "short",
    reviewed: true,
  });
  await open(page);
  expect(await read(page)).toMatchObject({
    step: 0,
    done: [0],
    need: "small",
    overscan: 2,
    filter: "all",
    needsSeen: ["browse"],
    reviewed: false,
  });
  expect((await read(page)).context.length).toBe(700);
});
test("unavailable storage still permits actual library controls and reports browser-only limit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("fixture");
    };
  });
  await open(page, 2);
  await expect(row(page, "item-0001")).toBeVisible();
  await b(page, "移到列表末尾").click();
  await expect(row(page, "item-2000")).toBeVisible();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 actual sort virtual and local crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 1) {
      await b(page, "按所选位置移动").click();
    }
    if (n === 2) {
      await b(page, "切换选中对象标记").click();
    }
    if (n === 3)
      await page
        .locator(".quiz-grid fieldset")
        .first()
        .getByRole("button")
        .nth(1)
        .click();
    if (n === 4) {
      await b(page, "填入项目现状示例（替换本栏）").click();
      await b(page, "生成工具选型说明").click();
    }
    await axes(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .locator(".stage-intro")
      .screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-intro.png`,
      });
    await page
      .locator(
        n === 0
          ? ".tool12-lab"
          : n === 1
            ? ".tool12-sort"
            : n === 2
              ? ".tool12-virtual"
              : n === 3
                ? ".quiz-grid"
                : ".agent-editor",
      )
      .screenshot({
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
    { length: 11 },
    (_, i) => `frontend-observatory.tool${String(i + 1).padStart(2, "0")}.v1`,
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
      value: { writeText: () => Promise.reject(Error("fixture")) },
    });
  }, priorKeys);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), priorKeys);
}
async function complete(p, act, select, type, toggle = act) {
  for (const n of [
    "大量已加载对象浏览",
    "远端分批数据合同",
    "核对职责与当前实际机制",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "station0");
  await act(b(p, "开始按钮移动预览"), "preview");
  await act(b(p, "取消当前移动"), "cancel");
  await act(b(p, "按所选位置移动"), "same-model move");
  await expect(sort(p)).toHaveAttribute("data-sort-order", "B,C,A,D,E,F");
  await act(b(p, "读取排序模型与DOM快照"), "sort inspect");
  await act(b(p, "完成并继续"), "station1");
  await act(b(p, "切换选中对象标记"), "mark");
  await act(b(p, "填入对象备注示例"), "note sample");
  await type(f(p, "note"), " 用户编辑");
  await act(b(p, "离开选中项窗口"), "unmount selected");
  await expect(row(p, "item-0001")).toHaveCount(0);
  await act(b(p, "检查实际虚拟窗口与DOM"), "read unmount");
  await act(b(p, "定位选中项"), "locate");
  await expect(row(p, "item-0001")).toBeVisible();
  await act(b(p, "检查实际虚拟窗口与DOM"), "read restored");
  await select(f(p, "filter"), "odd");
  await act(b(p, "检查实际虚拟窗口与DOM"), "filter stable identity");
  await select(f(p, "filter"), "empty");
  await expect(p.locator("[data-row-id]")).toHaveCount(0);
  await select(f(p, "filter"), "all");
  await expect
    .poll(async () => {
      const d = await read(p);
      return (
        d.windowSeen &&
        d.offscreenSeen &&
        d.preservedSeen &&
        d.filterSeen &&
        d.emptySeen
      );
    })
    .toBe(true);
  await act(b(p, "完成并继续"), "station2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool12Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool12Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "sample");
  await type(f(p, "context"), " 用户补充动态测量和数据权限。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(f(p, "agent-draft"), "\n自己的取消和持久化约束。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对稳定ID、拖拽取消、虚拟窗口与数据加载验收。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T12工具专题"), "finish");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
  await expect(p.locator(".notice")).toContainText("46项入口均已制作");
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T12工具专题进度"), "reset cancel");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T12工具专题进度"), "retain");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T12工具专题进度")).toBeFocused();
  await act(b(p, "重置T12工具专题进度"), "reset");
  await act(b(p, "确认重置T12工具专题"), "confirm");
  await expect(f(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    draft: "",
    context: "",
  });
}
test("real Tab full five stations native select editable note brief wrong retry refresh cancel confirm reset preserves45", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool12-full",
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
  };
  await complete(
    page,
    k.act,
    select,
    async (l, t) => {
      await k.seek(l, "actual keyboard edit");
      await page.keyboard.press("End");
      await page.keyboard.type(t);
    },
    k.toggle,
  );
  const draft = (await read(page)).draft;
  await page.reload();
  await directory(page, k.act);
  await expect(f(page, "agent-draft")).toHaveValue(draft);
  await reset(page, k.act, true);
  expect(
    await page.evaluate(
      (ks) => ks.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(prior);
  save(info.project.name + "-keyboard-full", trace);
});
for (const reducedMotion of ["no-preference", "reduce"])
  test(`zero keyboard emulated touch full ${reducedMotion} editable wrong retry refresh reset preserves45`, async ({
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
      window.keys12 = 0;
      addEventListener("keydown", () => window.keys12++);
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
    expect(await p.evaluate(() => window.keys12)).toBe(0);
    const draft = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(f(p, "agent-draft")).toHaveValue(draft);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keys12)).toBe(0);
    expect(
      await p.evaluate(
        (ks) => ks.map((k) => localStorage.getItem(k)),
        priorKeys,
      ),
    ).toEqual(prior);
    save(info.project.name + "-touch-" + reducedMotion, {
      actions,
      keydown: 0,
      fixtures:
        "Actual taps plus selectOption/fill fixtures; not physical device or OS keyboard/IME",
    });
    await c.close();
  });
test("clipboard success uses clicked snapshot and never overwrites newer edits", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) => {
          window.copied08 = t;
          return new Promise((r) => (window.release08 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  const x = await f(page, "agent-draft").inputValue();
  await b(page, "复制工具选型说明").click();
  await f(page, "agent-draft").fill(x + "\n随后编辑");
  await page.evaluate(() => window.release08());
  expect(await page.evaluate(() => window.copied08)).toBe(x);
  await expect(f(page, "agent-draft")).toHaveValue(x + "\n随后编辑");
  await expect(page.locator(".copy-feedback")).toContainText("点击时的版本");
});
test("clipboard denial selects only while focus owned and later denial respects real Tab outside", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => new Promise((_, r) => (window.reject08 = r)) },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await page.evaluate(() => window.reject08(Error("fixture")));
  await expect(f(page, "agent-draft")).toBeFocused();
  expect(
    await f(page, "agent-draft").evaluate(
      (e) => e.selectionEnd - e.selectionStart,
    ),
  ).toBe((await f(page, "agent-draft").inputValue()).length);
  await b(page, "复制工具选型说明").click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.reject08(Error("fixture")));
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
test("copy mutex and reset invalidation cannot revive draft or steal newer focus", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => {
          window.calls08 = (window.calls08 || 0) + 1;
          return new Promise((r) => (window.release08 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.calls08)).toBe(1);
  await b(page, "重置T12工具专题进度").click();
  await b(page, "确认重置T12工具专题").click();
  await expect(f(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.release08());
  expect((await read(page)).draft).toBe("");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});

test("late title RAF respects deliberately moved real Tab focus", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    window.titleFrames09 = [];
    window.originalRAF09 = requestAnimationFrame;
    window.requestAnimationFrame = (f) => {
      window.titleFrames09.push(f);
      return 99009;
    };
  });
  await stage(page, 1).click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => {
    window.requestAnimationFrame = window.originalRAF09;
    for (const f of window.titleFrames09) f(performance.now());
  });
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});

for (const reducedMotion of ["no-preference", "reduce"])
  test(`native emulated touch drag cancel commit body pan and real virtual scroll ${reducedMotion}`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        reducedMotion,
      }),
      p = await c.newPage();
    await open(p, 1);
    const cd = await c.newCDPSession(p);
    const touch = async (type, x, y) =>
      cd.send("Input.dispatchTouchEvent", {
        type,
        touchPoints:
          type === "touchEnd" || type === "touchCancel"
            ? []
            : [{ x, y, id: 0, radiusX: 5, radiusY: 5, force: 1 }],
      });
    await handle(p, "A").scrollIntoViewIfNeeded();
    let a = await handle(p, "A").boundingBox(),
      z = await p.locator('[data-sort-id="B"]').boundingBox();
    await touch("touchStart", a.x + a.width / 2, a.y + a.height / 2);
    await touch("touchMove", z.x + z.width / 2, z.y + z.height / 2);
    await touch("touchCancel");
    await expect(sort(p)).toHaveAttribute("data-sort-phase", "idle");
    await expect(sort(p)).toHaveAttribute("data-sort-order", "A,B,C,D,E,F");
    await handle(p, "A").scrollIntoViewIfNeeded();
    a = await handle(p, "A").boundingBox();
    z = await p.locator('[data-sort-id="B"]').boundingBox();
    await touch("touchStart", a.x + a.width / 2, a.y + a.height / 2);
    for (let i = 1; i <= 5; i++)
      await touch(
        "touchMove",
        a.x + a.width / 2 + ((z.x + z.width / 2 - a.x - a.width / 2) * i) / 5,
        a.y +
          a.height / 2 +
          ((z.y + z.height / 2 - a.y - a.height / 2) * i) / 5,
      );
    await touch("touchEnd");
    await expect(sort(p)).toHaveAttribute("data-sort-order", "B,A,C,D,E,F");
    const body = p.locator('[data-sort-id="C"] > div');
    await body.scrollIntoViewIfNeeded();
    let r = await body.boundingBox(),
      before = await p.evaluate(() => scrollY);
    await touch("touchStart", r.x + r.width / 2, r.y + r.height / 2);
    for (let i = 1; i <= 5; i++)
      await touch("touchMove", r.x + r.width / 2, r.y + r.height / 2 - i * 15);
    await touch("touchEnd");
    await expect
      .poll(() => p.evaluate(() => scrollY))
      .toBeGreaterThan(before + 10);
    await expect(sort(p)).toHaveAttribute("data-sort-order", "B,A,C,D,E,F");
    await stage(p, 2).click();
    const e = p.locator(".tool12-scroll");
    await e.scrollIntoViewIfNeeded();
    r = await e.boundingBox();
    await touch("touchStart", r.x + r.width / 2, r.y + r.height * 0.8);
    for (let i = 1; i <= 6; i++)
      await touch(
        "touchMove",
        r.x + r.width / 2,
        r.y + r.height * 0.8 - i * 20,
      );
    await touch("touchEnd");
    await expect
      .poll(() => e.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(30);
    const v = await inspect(p);
    expect(v.items[0].index).toBeGreaterThanOrEqual(0);
    expect(v.dom.length).toBeLessThan(30);
    save(info.project.name + "-native-touch-" + reducedMotion, {
      order: "B,A,C,D,E,F",
      actualScroll: v.scrollOffset,
      records: v,
      device: "Chromium CDP emulated touch, not physical hardware",
    });
    await c.close();
  });

test("all46 original entries mount actual views zero previews and final T11 toT12 exits only to review", async ({
  page,
}, info) => {
  const seen = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const numbered = page.getByRole("navigation", { name: "课程目录" }),
    coverage = page.getByRole("navigation", { name: "综合与工具模块" }),
    show = async () => {
      if (!(await numbered.isVisible())) await b(page, "☰ 课程").click();
    };
  for (let i = 0; i < 32; i++) {
    await show();
    await expect(numbered.getByRole("button")).toHaveCount(32);
    await numbered.getByRole("button").nth(i).click();
    await expect(page.locator(".lesson-stage")).toBeVisible();
    await expect(page.locator(".coming-status")).toHaveCount(0);
    seen.push(String(i + 1).padStart(2, "0"));
  }
  const ids = [
    "A",
    "B",
    ...Array.from(
      { length: 12 },
      (_, i) => "T" + String(i + 1).padStart(2, "0"),
    ),
  ];
  for (const id of ids) {
    await show();
    await expect(coverage.getByRole("button")).toHaveCount(14);
    await coverage
      .getByRole("button", { name: new RegExp("^" + id + " ·") })
      .click();
    await expect(page.locator(".lesson-stage")).toBeVisible();
    await expect(page.locator(".coming-status")).toHaveCount(0);
    seen.push(id);
  }
  expect(new Set(seen).size).toBe(46);
  await expect(page.locator(".coverage-preview")).toHaveCount(0);
  await expect(page.locator(".site-footer")).toContainText("46项入口");
  await b(page, "返回T11复习").click();
  await b(page, "继续T12 · dnd-kit / Virtualization").click();
  await expect(f(page, "stage-heading")).toBeVisible();
  await page.getByText("路线核对说明与官方来源", { exact: true }).click();
  await page.getByText("查看完整 32 课目录及覆盖标签", { exact: true }).click();
  const outline = page.locator(".full-course-outline");
  for (const id of ids)
    await expect(
      outline.locator(`[data-coverage-id="${id}"] button`),
    ).toHaveCount(1);
  await expect(
    outline.locator("[data-coverage-id]").filter({ hasText: "尚未制作" }),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-lesson-id="33"],[data-coverage-id="T13"]'),
  ).toHaveCount(0);
  await expect(b(page, "继续T13")).toHaveCount(0);
  await b(page, "回顾综合B · Agent指令能力").click();
  await expect(page).toHaveTitle("Agent 指令能力 · 前端观察室");
  expect(errors).toEqual([]);
  save(info.project.name + "-all46-entry-coverage", {
    seen,
    pageErrors: errors,
  });
});

test("375 short viewport inert long brief actual Tab focus axe complete controls without overflow", async ({
  page,
}, info) => {
  await seed(page, { ...good(), step: 4 });
  await page.setViewportSize({ width: 375, height: 480 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await b(page, "填入项目现状示例（替换本栏）").click();
  await b(page, "生成工具选型说明").click();
  await f(page, "agent-draft").fill(
    (await f(page, "agent-draft").inputValue()) +
      "<img src=x onerror=bad()>" +
      "稳定ID与取消验收".repeat(80),
  );
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool12-short",
    profile: info.project.name,
  });
  await k.seek(f(page, "agent-draft"), "visible editable brief");
  await axes(page);
  expect(await page.locator(".tool-twelve img").count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".agent-editor")
    .screenshot({ path: `${out}/${info.project.name}-short.png` });
});
