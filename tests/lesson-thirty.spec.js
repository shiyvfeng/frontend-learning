import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  listInitial,
  listData,
  ROW_HEIGHT,
  PAGE_SIZE,
  filteredItems,
  windowRange,
  anchorPosition,
  parseRecord,
  listBrief,
} from "../src/lesson-thirty-content.js";
const out = "/tmp/windowed-list-acceptance",
  key = "frontend-observatory.lesson30.v1",
  prior = Array.from(
    { length: 29 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".list30-lab"),
  vp = (p) => p.getByRole("region", { name: "教学列表滚动区", exact: true }),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第三十节学习步骤" })
      .getByRole("button")
      .nth(n),
  stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
function save(n, x) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${n}.json`, JSON.stringify(x, null, 2));
}
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(29), "lesson30");
  await expect(p.locator("#list30-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  if (n < 3)
    await expect.poll(() => lab(p).getAttribute("data-rows")).not.toBe("0");
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
async function snapshot(p) {
  await expect
    .poll(async () => {
      const top = await vp(p).evaluate((e) => e.scrollTop),
        model = Number(await lab(p).getAttribute("data-top"));
      return Math.abs(top - model);
    })
    .toBeLessThan(0.6);
  return lab(p).evaluate((e) => {
    const v = e.querySelector(".list30-viewport"),
      r = v.getBoundingClientRect(),
      b = parseFloat(getComputedStyle(v).borderTopWidth);
    return {
      mode: e.dataset.mode,
      pool: e.dataset.pool,
      filter: e.dataset.filter,
      top: v.scrollTop,
      height: v.clientHeight,
      scrollHeight: v.scrollHeight,
      first: Number(e.dataset.first),
      end: Number(e.dataset.end),
      start: Number(e.dataset.renderStart),
      renderEnd: Number(e.dataset.renderEnd),
      count: Number(e.dataset.rows),
      elements: Number(e.dataset.elements),
      actualElements: v.querySelectorAll("*").length,
      rows: [...v.querySelectorAll("[data-list-row]")].map((n) => ({
        id: Number(n.dataset.id),
        index: Number(n.dataset.index),
        height: n.getBoundingClientRect().height,
        top: n.getBoundingClientRect().top - r.top - b,
        zone: n.dataset.zone,
        tab: n.tabIndex,
      })),
    };
  });
}
async function consistency(p, expected) {
  const settings = expected || (await stored(p));
  const s = await snapshot(p),
    items = filteredItems(s.pool, s.filter, s.mode);
  expect(s.rows).toHaveLength(s.count);
  expect(s.elements).toBe(s.actualElements);
  expect(new Set(s.rows.map((x) => x.id)).size).toBe(s.count);
  if (s.mode === "virtual") {
    const r = windowRange(items.length, s.top, s.height, settings.overscan);
    expect([s.first, s.end, s.start, s.renderEnd]).toEqual([
      r.first,
      r.last,
      r.start,
      r.end,
    ]);
    expect(s.rows.map((x) => x.id)).toEqual(
      items.slice(r.start, r.end).map((x) => x.id),
    );
    expect(s.count).toBeLessThanOrEqual(
      Math.ceil(s.height / 64) + 1 + 2 * settings.overscan,
    );
    expect(s.scrollHeight).toBe(Math.max(s.height, items.length * 64));
  } else if (s.mode === "normal") expect(s.count).toBe(items.length);
  else expect(s.count).toBeLessThanOrEqual(25);
  const base =
    s.mode === "pages" ? Math.floor((s.rows[0]?.index || 0) / 25) * 25 : 0;
  for (const row of s.rows) {
    expect(row.id).toBe(items[row.index].id);
    expect(row.height).toBeCloseTo(64, 1);
    expect(row.top).toBeCloseTo((row.index - base) * 64 - s.top, 1);
    if (s.mode !== "pages") expect(row.tab).toBe(-1);
  }
  return s;
}
async function find(p, text = "1500") {
  await p.getByLabel("查找源记录编号（1–3000）", { exact: true }).fill(text);
  await btn(p, "查找并定位编号").click();
}
function instrument() {
  const raf = requestAnimationFrame.bind(window),
    caf = cancelAnimationFrame.bind(window),
    RO = window.ResizeObserver;
  window.listPending = new Set();
  window.listObservers = [];
  if (RO)
    window.ResizeObserver = class {
      constructor(cb) {
        this.active = false;
        this.real = new RO((es, o) => cb(es, o));
        window.listObservers.push(this);
        this.late = () => cb([], this);
      }
      observe(e) {
        this.active = true;
        this.real.observe(e);
      }
      unobserve(e) {
        this.real.unobserve(e);
      }
      disconnect() {
        this.active = false;
        this.real.disconnect();
      }
    };
  window.requestAnimationFrame = (cb) => {
    let id;
    id = raf((t) => {
      window.listPending.delete(id);
      cb(t);
    });
    window.listPending.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    window.listPending.delete(id);
    caf(id);
  };
}
test("fixed window pure boundaries include fractional scroll buffer empty and invalid inputs", () => {
  expect(windowRange(3000, 0, 320, 2)).toMatchObject({
    first: 0,
    last: 5,
    start: 0,
    end: 7,
  });
  expect(windowRange(3000, 13, 320, 2)).toMatchObject({
    first: 0,
    last: 6,
    end: 8,
  });
  expect(windowRange(3000, 999999, 320, 6)).toMatchObject({
    top: 191680,
    first: 2995,
    last: 3000,
    start: 2989,
    end: 3000,
    after: 0,
  });
  expect(windowRange(0, 100, 320)).toMatchObject({
    first: 0,
    last: 0,
    start: 0,
    end: 0,
    top: 0,
  });
  expect(windowRange(3000, -9, 0)).toMatchObject({ start: 0, end: 0, top: 0 });
  expect(windowRange(3, NaN, 64, Infinity)).toMatchObject({
    first: 0,
    last: 1,
    start: 0,
    end: 1,
  });
});
test("data model all3000 stable IDs and filtered ordinals differ from source IDs", () => {
  expect(listData).toHaveLength(3000);
  expect(new Set(listData.map((x) => x.id)).size).toBe(3000);
  expect(filteredItems("large", "checked")).toHaveLength(1000);
  expect(filteredItems("compare", "checked")).toHaveLength(66);
  expect(filteredItems("large", "all", "normal")).toHaveLength(200);
  expect(filteredItems("large", "empty")).toEqual([]);
  expect(anchorPosition(filteredItems("large", "checked"), 1500, 13)).toEqual({
    index: 499,
    found: true,
    offset: 13,
  });
  expect(anchorPosition(filteredItems("large", "pending"), 1500, 13)).toEqual({
    index: 0,
    found: false,
    offset: 0,
  });
});
test("record parser and brief do not conflate pagination loading or dynamic support", () => {
  for (const s of ["", "0", "-1", "3001", "1.5", "1e3", "abc"])
    expect(parseRecord(s)).toBeNull();
  expect(parseRecord(" 1500 ")).toBe(1500);
  const text = listBrief(listInitial());
  for (const re of [
    /固定64px/,
    /3000条已经在内存|源模型3000条|3000条均/,
    /分页.*不是虚拟化/s,
    /不支持动态行高/,
    /不设万能条数阈值/,
    /只清本课/,
  ])
    expect(text).toMatch(re);
});
test("lazy actual window opens01–31 only32 preview and no virtual library request", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-thirty/.test(u))).toBe(false);
  await directory(page);
  await expect.poll(() => lab(page).getAttribute("data-rows")).not.toBe("0");
  await expect(page.locator(".available-dot")).toHaveCount(31);
  expect(urls.every((u) => new URL(u).origin === "http://127.0.0.1:4173")).toBe(
    true,
  );
  expect(
    urls.some((u) => /tanstack|react-window|lottie_light|three/.test(u)),
  ).toBe(false);
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(31).click();
  await expect(
    page.getByRole("heading", { name: "Infinite Canvas", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("actual DOM window has only visible plus buffer rows despite resident3000 model", async ({
  page,
}, info) => {
  await open(page);
  const s = await consistency(page);
  expect(s.count).toBeLessThan(20);
  expect(s.scrollHeight).toBe(192000);
  expect(s.rows[0].id).toBe(1);
  await expect(page.locator(".list30-counts")).toContainText("本地源模型 3000");
  await expect(vp(page).locator('button,input,a,[tabindex="0"]')).toHaveCount(
    0,
  );
  save(`initial-${info.project.name}`, s);
});
test("same200 collection ordinary versus virtual counts are fair and buffer changes real nodes", async ({
  page,
}, info) => {
  await open(page);
  await btn(page, "普通200条（同样集合）").click();
  await expect(lab(page)).toHaveAttribute("data-rows", "200");
  const normal = await consistency(page);
  expect(normal.rows.map((x) => x.id)).toEqual(
    Array.from({ length: 200 }, (_, i) => i + 1),
  );
  await btn(page, "虚拟200条（同样集合）").click();
  const virtual = await consistency(page);
  await btn(page, "每侧缓冲6行").click();
  const buffered = await consistency(page);
  expect(buffered.count).toBeGreaterThan(virtual.count);
  expect(buffered.pool).toBe("compare");
  expect(normal.pool).toBe("compare");
  await btn(page, "每侧缓冲0行").click();
  const unbuffered = await consistency(page);
  expect(unbuffered.count).toBe(unbuffered.end - unbuffered.first);
  save(`comparison-${info.project.name}`, {
    normalCount: normal.count,
    virtualCount: virtual.count,
    bufferedCount: buffered.count,
    unbufferedCount: unbuffered.count,
  });
});
test("real mouse wheel changes native scroll position removes old rows and leaves data count", async ({
  page,
}, info) => {
  await open(page);
  const old = await vp(page).locator("[data-list-row]").first().elementHandle();
  await vp(page).hover();
  await page.mouse.wheel(0, 713);
  await expect
    .poll(() => vp(page).evaluate((e) => e.scrollTop))
    .toBeGreaterThan(600);
  const s = await consistency(page);
  expect(s.first).toBeGreaterThan(8);
  expect(await old.evaluate((e) => e.isConnected)).toBe(false);
  await old.dispose();
  await expect(page.locator(".list30-counts")).toContainText("本地源模型 3000");
  save(`wheel-${info.project.name}`, s);
});
test("native End Home PageDown retain actual viewport focus while nodes unmount and Tab escapes", async ({
  page,
}, info) => {
  await open(page);
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson30",
      profile: info.project.name,
    });
  await nav.seek(vp(page), "viewport");
  const old = await vp(page).locator("[data-list-row]").first().elementHandle();
  await page.keyboard.press("End");
  await expect(lab(page)).toHaveAttribute("data-end", "3000");
  await expect(vp(page)).toBeFocused();
  expect(await old.evaluate((e) => e.isConnected)).toBe(false);
  const end = await consistency(page);
  expect(end.rows.at(-1).id).toBe(3000);
  await page.keyboard.press("Home");
  await expect(lab(page)).toHaveAttribute("data-first", "0");
  await expect(vp(page)).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => vp(page).evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0);
  await expect(vp(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(btn(page, "聚焦滚动区")).toBeFocused();
  await old.dispose();
  save(`native-keys-${info.project.name}`, {
    trace,
    end,
    focusStable: true,
    tabEscaped: true,
  });
});
test("source lookup and checked filter preserve true ID anchor plus intra-row offset", async ({
  page,
}, info) => {
  await open(page, 1);
  await find(page);
  await expect(lab(page)).toHaveAttribute("data-first", "1499");
  await vp(page).hover();
  await page.mouse.wheel(0, 13);
  await expect.poll(() => vp(page).evaluate((e) => e.scrollTop)).toBe(95949);
  await btn(page, "仅已核对").click();
  await expect(lab(page)).toHaveAttribute("data-first", "499");
  await expect.poll(() => vp(page).evaluate((e) => e.scrollTop)).toBe(31949);
  await expect(page.locator(".list30-status")).toContainText(
    "已保留首个可见记录#1500",
  );
  const kept = await consistency(page);
  expect(kept.rows.find((x) => x.index === 499).id).toBe(1500);
  await btn(page, "仅待核对").click();
  await expect(lab(page)).toHaveAttribute("data-first", "0");
  await expect(page.locator(".list30-status")).toContainText(
    "原滚动锚点不在新结果",
  );
  await consistency(page);
  save(`anchor-${info.project.name}`, { kept, removedAnchorReset: true });
});
test("invalid and filtered-out lookup never silently resets filters or invents data", async ({
  page,
}) => {
  await open(page, 1);
  await btn(page, "仅已核对").click();
  for (const s of ["", "0", "3001", "1.5", "-1"]) {
    await find(page, s);
    await expect(page.locator(".list30-status")).toContainText("编号无效");
    await expect(lab(page)).toHaveAttribute("data-filter", "checked");
  }
  await find(page, "1");
  await expect(page.locator(".list30-status")).toContainText("不在当前结果");
  await expect(lab(page)).toHaveAttribute("data-first", "0");
  await find(page, "3000");
  await expect(lab(page)).toHaveAttribute("data-end", "1000");
  await expect(page.locator(".list30-detail")).toContainText("#3000");
  await consistency(page);
});
test("mode subset removes absent anchor explicitly and empty recovery has no fake rows", async ({
  page,
}) => {
  await open(page, 1);
  await find(page, "3000");
  await btn(page, "普通200条（同样集合）").click();
  await expect(lab(page)).toHaveAttribute("data-first", "0");
  await expect(page.locator(".list30-status")).toContainText(
    "原滚动锚点不在新结果",
  );
  await btn(page, "空结果（教学）").click();
  await expect(lab(page)).toHaveAttribute("data-rows", "0");
  await expect(vp(page).locator("[data-list-row]")).toHaveCount(0);
  await btn(page, "读取可见首条").click();
  await expect(page.locator(".list30-status")).toContainText("没有可读取记录");
  await expect(btn(page, "读取可见首条")).toBeFocused();
  await btn(page, "全部记录").click();
  await expect(lab(page)).toHaveAttribute("data-rows", "200");
  await consistency(page);
});
test("nonvirtual pages keep whole25 native buttons and can locate all3000 without pretending windowing", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "非虚拟分页3000条").click();
  await expect(vp(page).getByRole("button")).toHaveCount(25);
  await btn(page, "下一页（非虚拟）").click();
  await expect(vp(page).getByRole("button").first()).toHaveAccessibleName(
    "读取记录0026",
  );
  await expect(btn(page, "下一页（非虚拟）")).toBeFocused();
  await find(page, "1500");
  await expect(vp(page).getByRole("button").last()).toHaveAccessibleName(
    "读取记录1500",
  );
  await expect(vp(page).getByRole("button")).toHaveCount(25);
  await expect(page.locator(".list30-detail")).toContainText("#1500");
  const s = await consistency(page);
  await btn(page, "跳到结果末尾").click();
  await expect(vp(page).getByRole("button").last()).toHaveAccessibleName(
    "读取记录3000",
  );
  save(`pages-${info.project.name}`, {
    middle: s,
    fullPageDOM: true,
    sourceModel: 3000,
  });
});
test("paged row real Tab selection and stable page-change focus never land on body", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "非虚拟分页3000条").click();
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson30",
      profile: info.project.name,
    });
  await nav.act(btn(page, "读取记录0001"), "read");
  await expect(btn(page, "读取记录0001")).toBeFocused();
  await expect(page.locator(".list30-detail")).toContainText("#0001");
  await nav.act(btn(page, "下一页（非虚拟）"), "page-next");
  await expect(btn(page, "下一页（非虚拟）")).toBeFocused();
  await expect(btn(page, "读取记录0001")).toHaveCount(0);
  await consistency(page);
  save(`page-focus-${info.project.name}`, { trace, immediateFocus: true });
});
test("resize and height controls recalculate real clientHeight and keep bounded last rows", async ({
  page,
}, info) => {
  await open(page);
  await btn(page, "跳到结果末尾").click();
  const states = [];
  for (const [w, h, height] of [
    [375, 480, 400],
    [1280, 900, 240],
    [375, 812, 320],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await btn(page, `视口${height}px`).click();
    await btn(page, "跳到结果末尾").click();
    await expect(lab(page)).toHaveAttribute("data-end", "3000");
    const s = await consistency(page);
    expect(s.height).toBeLessThanOrEqual(Math.min(height, h * 0.6));
    expect(s.rows.at(-1).id).toBe(3000);
    states.push(s);
  }
  save(`resize-${info.project.name}`, states);
});
test("rapid scroll commands modes and filters leave only latest correct window", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 4; i++) {
    await btn(page, "跳到结果末尾").click();
    await btn(page, "回到结果开头").click();
    await btn(page, "仅已核对").click();
    await btn(page, "全部记录").click();
    await btn(page, "虚拟200条（同样集合）").click();
    await btn(page, "虚拟3000条").click();
  }
  await find(page, "1800");
  await expect(lab(page)).toHaveAttribute("data-first", "1799");
  const s = await consistency(page);
  expect(s.rows.some((x) => x.id === 1800)).toBe(true);
});
test("dynamic model measures actual growth but virtual rows remain64px", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "增加第二行说明").click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('[data-model-measure="1"]')
          .getAttribute("data-height"),
      ),
    )
    .toBeGreaterThan(64);
  const measure = await page.locator("[data-model-measure]").evaluateAll((es) =>
    es.map((e) => ({
      height: Number(e.dataset.height),
      offset: Number(e.dataset.offset),
    })),
  );
  expect(measure[2].offset).toBeGreaterThan(128);
  await consistency(page);
  await btn(page, "恢复三行示意").click();
  await expect(page.locator('[data-model-measure="2"]')).toHaveAttribute(
    "data-offset",
    "128",
  );
  save(`dynamic-model-${info.project.name}`, {
    measure,
    notIntegrated: true,
    virtualHeight: 64,
  });
});
test("ResizeObserver absence has honest native fallback and all core controls work", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.ResizeObserver = undefined;
  });
  await open(page, 2);
  await expect(page.locator(".list30-explain")).toContainText(
    "ResizeObserver不可用",
  );
  await btn(page, "视口240px").click();
  await find(page, "1500");
  await consistency(page);
  await btn(page, "增加第二行说明").click();
  await expect(page.locator(".list30-model")).toHaveAttribute(
    "data-fallback",
    "true",
  );
  expect((await stored(page)).modelSeen).toBe(true);
});
test("real touch scrolling changes viewport and outer page remains scrollable without keyboard", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage();
  await open(p);
  const cd = await c.newCDPSession(p);
  const swipe = async () => {
    const r = await vp(p).boundingBox(),
      x = r.x + r.width / 2,
      y0 = r.y + r.height - 24,
      y1 = r.y + 24;
    await cd.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: y0 }],
    });
    for (let i = 1; i <= 10; i++) {
      await cd.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 10 }],
      });
      await p.waitForTimeout(20);
    }
    await cd.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    return { x, y: (y0 + y1) / 2 };
  };
  await btn(p, "聚焦滚动区").tap();
  const point = await swipe();
  await expect
    .poll(() => vp(p).evaluate((e) => e.scrollTop))
    .toBeGreaterThan(200);
  await p.touchscreen.tap(point.x, point.y);
  const native = await consistency(p);
  await btn(p, "跳到结果末尾").tap();
  await btn(p, "聚焦滚动区").tap();
  const before = await p.evaluate(() => scrollY);
  await swipe();
  await expect.poll(() => p.evaluate(() => scrollY)).toBeGreaterThan(before);
  save(`touch-native-${info.project.name}`, {
    native,
    actualCDPTouchStartMoveEnd: true,
    outerPageScrolled: true,
    physicalPhone: false,
  });
  await c.close();
});
test("reduced motion live switch cleanup and disconnected callbacks cannot write new window", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page, 2);
  await btn(page, "增加第二行说明").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab(page)).toHaveAttribute("data-reduced", "true");
  await btn(page, "向下滚动一屏").click();
  await stage(page, 3).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.listObservers.filter((x) => x.active).length),
    )
    .toBe(0);
  await page.evaluate(() => window.listObservers.forEach((x) => x.late()));
  await expect.poll(() => page.evaluate(() => window.listPending.size)).toBe(0);
  await stage(page, 0).click();
  await expect(lab(page)).toHaveAttribute("data-first", "0");
  await expect(lab(page)).toHaveAttribute("data-reduced", "true");
  await page.evaluate(() =>
    window.listObservers.slice(0, -1).forEach((x) => x.late()),
  );
  await consistency(page);
  await expect.poll(() => page.evaluate(() => window.listPending.size)).toBe(0);
  save(`cleanup-${info.project.name}`, {
    oldObserverCallbackFixture: true,
    activeObservers: await page.evaluate(
      () => window.listObservers.filter((x) => x.active).length,
    ),
    noIdleRAF: true,
  });
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 local viewport and controls crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 1) await find(page);
    if (n === 2) await btn(page, "增加第二行说明").click();
    if (n === 4) await btn(page, "生成列表集成指令").click();
    await axeCheck(page);
    mkdirSync(out, { recursive: true });
    await page.screenshot({
      path: `${out}/station${n + 1}-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .locator(
        n < 3 ? ".list30-viewport" : n === 3 ? ".quiz-grid" : ".agent-grid",
      )
      .screenshot({ path: `${out}/crop${n + 1}-${info.project.name}.png` });
    if (n < 3) await consistency(page);
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
  await a("虚拟200条（同样集合）");
  await a("普通200条（同样集合）");
  await expect(lab(p)).toHaveAttribute("data-rows", "200");
  await a("虚拟200条（同样集合）");
  await a("每侧缓冲6行");
  await a("向下滚动一屏");
  await expect
    .poll(() => vp(p).evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0);
  await a("填入标题示例");
  await edit(p.getByLabel("演练标题", { exact: true }), "caption");
  await next();
  await a("虚拟3000条");
  await a("填入1500示例");
  await edit(
    p.getByLabel("查找源记录编号（1–3000）", { exact: true }),
    "record",
  );
  await a("查找并定位编号");
  await expect(p.locator(".list30-detail")).toContainText("#1800");
  await a("仅已核对");
  await a("仅待核对");
  await a("全部记录");
  await a("跳到结果末尾");
  await expect(lab(p)).toHaveAttribute("data-end", "3000");
  await a("空结果（教学）");
  await expect(lab(p)).toHaveAttribute("data-rows", "0");
  await a("全部记录");
  await next();
  await a("非虚拟分页3000条");
  await a("读取记录0001");
  await expect(p.locator(".list30-detail")).toContainText("#0001");
  await a("下一页（非虚拟）");
  await a("上一页（非虚拟）");
  await a("增加第二行说明");
  await expect
    .poll(async () =>
      Number(
        await p.locator('[data-model-measure="1"]').getAttribute("data-height"),
      ),
    )
    .toBeGreaterThan(64);
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成列表集成指令");
  const draft = p.getByLabel("可编辑的 列表集成 Agent 指令");
  await expect(draft).toHaveValue(
    /实际机制与边界.*规模与公平对照.*行高与窗口.*定位与保持.*动态行高.*焦点与可访问性.*会话、减少动态与清理.*验收/s,
  );
  await edit(draft, "draft");
  await a("复制列表集成指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 规模、行高、缓冲与键盘。", { exact: true }),
    "review",
  );
  await a("完成第三十节");
  await expect(p.locator(".lesson-thirty .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await stored(p);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-thirty .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第三十节进度");
  await a("保留第三十节进度");
  await expect(p.locator(".lesson-thirty .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第三十节进度");
  await a("确认重置第三十节");
  await expect(p.locator("#list30-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-thirty .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(lab(p)).toHaveAttribute("data-mode", "virtual");
  await expect(lab(p)).toHaveAttribute("data-first", "0");
  await consistency(p);
  await axeCheck(p);
  return done;
}
test("full actual Tab workflow wrong retry edits copy refresh cancel confirm reset preserves29", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson30",
      profile: info.project.name,
    }),
    done = await flow(page, act, toggle, async (f, n) => {
      await seek(f, n);
      if (n === "record") {
        await page.keyboard.press("ControlOrMeta+A");
        await page.keyboard.type("1800");
      } else {
        await page.keyboard.press("End");
        await page.keyboard.type(
          n === "caption"
            ? " edited"
            : "\nReview: units, missing, accessible table.",
        );
      }
    });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  save(`keyboard-${info.project.name}`, { passed: true, trace, done });
});
for (const reduced of [false, true])
  test(`full zero keyboard touch ${reduced ? "reduce" : "normal"} workflow preserves29`, async ({
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
          n === "record"
            ? "1800"
            : n === "caption"
              ? "触屏编辑：教学样例"
              : (await f.inputValue()) + "\n触屏核对数据表与缺失。",
        );
      });
    expect(
      await p.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(reduced);
    await expect(lab(p)).toHaveAttribute("data-reduced", String(reduced));
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
test("copy reset corrupt and unavailable storage remain scoped to30", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          window.savedListCopy = true;
        },
      },
    });
    localStorage.setItem("frontend-observatory.lesson30.v1", "{broken");
  });
  await open(page, 4);
  await btn(page, "生成列表集成指令").click();
  await btn(page, "复制列表集成指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.savedListCopy)).toBe(true);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  });
  await page
    .getByLabel("可编辑的 列表集成 Agent 指令")
    .fill("edit while unavailable");
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  await btn(page, "重置第三十节进度").click();
  await btn(page, "确认重置第三十节").click();
  await expect(page.locator("#list30-stage-heading")).toBeFocused();
  await consistency(page, listInitial());
});
test("late clipboard rejection after reset cannot mutate a new instance", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, r) => (window.rejectListCopy = r)),
      },
    });
  });
  await open(page, 4);
  await btn(page, "生成列表集成指令").click();
  await btn(page, "复制列表集成指令").click();
  await btn(page, "重置第三十节进度").click();
  await btn(page, "确认重置第三十节").click();
  await page.evaluate(() => window.rejectListCopy(Error("late")));
  await expect(page.locator("#list30-stage-heading")).toBeFocused();
  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(lab(page)).toHaveAttribute("data-mode", "virtual");
});
test("hero brief sources match real fixed row boundary and accessibility alternative", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(".list30-hero-boundary")).toContainText(
    "固定行高真实窗口化",
  );
  await expect(page.locator(".list30-boundary")).toContainText(
    "未接入TanStack Virtual/react-window",
  );
  await stage(page, 4).click();
  await btn(page, "生成列表集成指令").click();
  const draft = page.getByLabel("可编辑的 列表集成 Agent 指令");
  for (const re of [
    /固定64px/,
    /3000条/,
    /不是虚拟化/,
    /不支持动态行高/,
    /普通200/,
    /稳定记录ID/,
    /从辅助树隐藏/,
    /不设万能条数阈值/,
  ])
    await expect(draft).toHaveValue(re);
  const details = page.locator("details").filter({
    has: page.getByText("第三十节核对说明与官方来源", { exact: true }),
  });
  await details.locator("summary").click();
  await expect(details.getByRole("link")).toHaveCount(5);
});
test("late clipboard denial preserves deliberately moved real Tab focus", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, r) => (window.rejectListCopy = r)),
      },
    });
  });
  await open(page, 4);
  await btn(page, "生成列表集成指令").click();
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson30",
      profile: info.project.name,
    });
  await nav.act(btn(page, "复制列表集成指令"), "copy");
  const review = page.getByLabel("我已检查 规模、行高、缓冲与键盘。", {
    exact: true,
  });
  await nav.seek(review, "outside-copy");
  await page.evaluate(() => window.rejectListCopy(Error("late denial")));
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

test("native paging boundary activation preserves immediate scroll position and focus", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "非虚拟分页3000条").click();
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson30",
      profile: info.project.name,
    });
  await page
    .getByLabel("查找源记录编号（1–3000）", { exact: true })
    .fill("2976");
  await nav.act(btn(page, "查找并定位编号"), "find-last-page-start");
  await expect(vp(page).getByRole("button").first()).toHaveAccessibleName(
    "读取记录2976",
  );
  for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+Tab");
  await expect(btn(page, "下一页（非虚拟）")).toBeFocused();
  await nav.seek(btn(page, "下一页（非虚拟）"), "verify-last-next");
  const lastBefore = await vp(page).evaluate((e) => e.scrollTop);
  expect(lastBefore).toBe(0);
  await page.keyboard.press("Enter");
  await expect(btn(page, "下一页（非虚拟）")).toBeFocused();
  expect(await vp(page).evaluate((e) => e.scrollTop)).toBe(lastBefore);
  await expect(page.locator(".list30-status")).toContainText("位置和焦点保留");
  await page.getByLabel("查找源记录编号（1–3000）", { exact: true }).fill("1");
  await nav.act(btn(page, "查找并定位编号"), "find-first-page");
  await nav.act(btn(page, "向下滚动一屏"), "read-position-in-first-page");
  await nav.seek(btn(page, "上一页（非虚拟）"), "verify-first-prev");
  const firstBefore = await vp(page).evaluate((e) => e.scrollTop);
  expect(firstBefore).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  await expect(btn(page, "上一页（非虚拟）")).toBeFocused();
  expect(await vp(page).evaluate((e) => e.scrollTop)).toBe(firstBefore);
  await consistency(page);
  await nav.act(btn(page, "空结果（教学）"), "empty-page");
  await nav.act(btn(page, "下一页（非虚拟）"), "empty-next");
  await expect(btn(page, "下一页（非虚拟）")).toBeFocused();
  await expect(vp(page).getByRole("button")).toHaveCount(0);
  expect(await vp(page).evaluate((e) => e.scrollTop)).toBe(0);
  await expect(page.locator(".list30-status")).toContainText("当前没有记录");
  save(`paging-boundary-${info.project.name}`, {
    trace,
    lastBefore,
    firstBefore,
    immediateFocus: true,
    noEvaluateFocusOrScrollWrites: true,
  });
});
