import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  chartInitial,
  sampleMatrix,
  chartRows,
  chartGeometry,
  chartSummary,
  trendPath,
  parseMinutes,
  formatValue,
  chartBrief,
} from "../src/lesson-twenty-nine-content.js";
const out = "/tmp/chart-data-acceptance",
  key = "frontend-observatory.lesson29.v1",
  prior = Array.from(
    { length: 28 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".chart29-lab"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十九节学习步骤" })
      .getByRole("button")
      .nth(n),
  value = (p, name = "阅读屏", day = "周一") => btn(p, `查看${name}${day}`),
  stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
function save(n, x) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${n}.json`, JSON.stringify(x, null, 2));
}
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(28), "lesson29");
  await expect(p.locator("#chart29-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
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
async function consistency(p, expected) {
  const data = expected || (await stored(p)),
    rows = chartRows(data),
    geo = chartGeometry(rows, data.mode);
  await expect(p.locator("[data-table-row]")).toHaveCount(rows.length);
  for (const [r, i] of rows.map((x, i) => [x, i])) {
    const g = p.locator(`[data-point="${r.key}"]`),
      tr = p.locator(`[data-table-row="${r.key}"]`);
    await expect(g).toHaveAttribute(
      "data-value",
      r.value === null ? "missing" : String(r.value),
    );
    await expect(tr.locator("[data-table-value]")).toHaveAttribute(
      "data-table-value",
      r.value === null ? "missing" : String(r.value),
    );
    if (data.mode === "compare") {
      if (r.value === null) await expect(g.locator("rect")).toHaveCount(0);
      else
        expect(
          Number(await g.locator("rect").getAttribute("width")),
        ).toBeCloseTo(geo[i].width, 6);
    } else {
      if (r.value === null) await expect(g.locator("circle")).toHaveCount(0);
      else {
        expect(
          Number(await g.locator("circle").getAttribute("cx")),
        ).toBeCloseTo(geo[i].x, 6);
        expect(
          Number(await g.locator("circle").getAttribute("cy")),
        ).toBeCloseTo(geo[i].y, 6);
      }
    }
  }
  return { data, rows, geo };
}
function instrument() {
  const raf = requestAnimationFrame.bind(window),
    caf = cancelAnimationFrame.bind(window);
  window.chartPending = new Set();
  window.chartListenerBalance = { media: 0, key: 0 };
  const add = EventTarget.prototype.addEventListener,
    remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (t, f, o) {
    if (this === document && t === "keydown") window.chartListenerBalance.key++;
    if (this instanceof MediaQueryList && t === "change")
      window.chartListenerBalance.media++;
    return add.call(this, t, f, o);
  };
  EventTarget.prototype.removeEventListener = function (t, f, o) {
    if (this === document && t === "keydown") window.chartListenerBalance.key--;
    if (this instanceof MediaQueryList && t === "change")
      window.chartListenerBalance.media--;
    return remove.call(this, t, f, o);
  };
  window.requestAnimationFrame = (cb) => {
    let id;
    id = raf((t) => {
      window.chartPending.delete(id);
      cb(t);
    });
    window.chartPending.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    window.chartPending.delete(id);
    caf(id);
  };
}
test("projection separates empty missing zero and normal records without mutating source", () => {
  const d = chartInitial();
  expect(chartRows(d).map((r) => r.value)).toEqual([40, 60, 15]);
  expect(chartSummary(chartRows({ ...d, day: 2 }))).toEqual({
    records: 3,
    known: 2,
    missing: 1,
    zeros: 0,
  });
  expect(chartRows({ ...d, scenario: "empty" })).toEqual([]);
  expect(chartRows({ ...d, scenario: "missing" }).map((r) => r.value)).toEqual([
    null,
    null,
    null,
  ]);
  expect(chartRows({ ...d, scenario: "zero" }).map((r) => r.value)).toEqual([
    0, 0, 0,
  ]);
  expect(chartRows({ ...d, mode: "trend" })).toHaveLength(7);
  expect(d.matrix).toEqual(sampleMatrix());
});
test("numeric encoding has true zero baseline and missing line breaks", () => {
  const rows = chartRows({
      ...chartInitial(),
      mode: "trend",
      filter: "reader",
    }),
    pts = chartGeometry(rows, "trend"),
    path = trendPath(pts);
  expect(pts[3].value).toBe(0);
  expect(pts[3].y).toBe(240);
  expect(pts[2].y).toBeNull();
  expect(path.match(/M/g)).toHaveLength(2);
  expect(path).toContain("M300,240");
  const bars = chartGeometry(
    chartRows({ ...chartInitial(), scenario: "zero" }),
    "compare",
  );
  expect(bars.every((x) => x.width === 0 && x.x === 126)).toBe(true);
  expect(formatValue(null)).toBe("缺失（未知）");
  expect(formatValue(0)).toBe("0 分钟");
});
test("minute parser and brief retain field unit distribution and implementation limits", () => {
  for (const s of ["", " ", "-1", "1.5", "NaN", "abc", "241", "1e2"])
    expect(parseMinutes(s)).toBeNull();
  for (const [s, n] of [
    ["0", 0],
    [" 90 ", 90],
    ["240", 240],
  ])
    expect(parseMinutes(s)).toBe(n);
  const text = chartBrief(chartInitial());
  for (const re of [
    /未绘制直方图/,
    /没有服务端取数/,
    /没有接入ECharts\/D3/,
    /null处断开/,
    /单位分钟/,
  ])
    expect(text).toMatch(re);
});
test("lazy actual SVG lesson29 opens only01–30 and30 stays a preview without chart libraries", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-twenty-nine/.test(u))).toBe(false);
  await directory(page);
  await expect(page.locator(".chart29-svg")).toBeVisible();
  await expect(page.locator(".available-dot")).toHaveCount(30);
  expect(urls.some((u) => /lesson-twenty-nine/.test(u))).toBe(true);
  expect(urls.every((u) => new URL(u).origin === "http://127.0.0.1:4173")).toBe(
    true,
  );
  expect(urls.some((u) => /echarts|d3-|lottie_light|three|\.riv/.test(u))).toBe(
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
test("comparison bars encode actual values and fixed zero scale with table parity", async ({
  page,
}, info) => {
  await open(page);
  const x = await consistency(page);
  expect(x.rows.map((r) => r.value)).toEqual([40, 60, 15]);
  await expect(
    page.locator("svg[data-axis-min='0'][data-axis-max='240']"),
  ).toBeVisible();
  expect(
    Number(await page.locator('[data-bar="drawing:0"]').getAttribute("width")) /
      Number(await page.locator('[data-bar="reader:0"]').getAttribute("width")),
  ).toBeCloseTo(1.5, 6);
  save(`bars-${info.project.name}`, x);
});
test("trend has seven ordered days actual point positions and a missing gap rather than zero", async ({
  page,
}, info) => {
  await open(page);
  await btn(page, "趋势：每日折线图").click();
  await expect(lab(page)).toHaveAttribute("data-mode", "trend");
  const x = await consistency(page),
    path = await page.locator("[data-trend-line]").getAttribute("d");
  expect(x.rows.map((r) => r.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(path.match(/M/g)).toHaveLength(2);
  await expect(page.locator('[data-point="reader:2"] circle')).toHaveCount(0);
  await expect(page.locator('[data-dot="reader:3"]')).toHaveAttribute(
    "cy",
    "240",
  );
  save(`trend-${info.project.name}`, { ...x, path });
});
test("filters update visible rows and clear stale selected details without changing original matrix", async ({
  page,
}) => {
  await open(page);
  await value(page).click();
  await expect(page.locator(".chart29-detail")).toContainText("40 分钟");
  await btn(page, "筛选绘图板").click();
  await expect(page.locator(".chart29-detail")).toContainText("请重新选择");
  await expect(
    page.getByRole("group", { name: "可访问数值选择" }).getByRole("button"),
  ).toHaveCount(1);
  await btn(page, "比较周二").click();
  await value(page, "绘图板", "周二").click();
  await expect(page.locator(".chart29-detail")).toContainText("90 分钟");
  await consistency(page);
  expect((await stored(page)).matrix).toEqual(sampleMatrix());
});
test("actual mouse preview returns to pinned selection and does not move focus", async ({
  page,
}, info) => {
  await open(page);
  await value(page).click();
  await page.locator('[data-bar="drawing:0"]').hover();
  await expect(page.locator(".chart29-detail")).toContainText(
    "绘图板 · 周一：60 分钟",
  );
  await page.mouse.move(0, 0);
  await expect(page.locator(".chart29-detail")).toContainText(
    "阅读屏 · 周一：40 分钟",
  );
  save(`hover-${info.project.name}`, { actualMouse: true, pinRestored: true });
});
test("real Tab chooses numbers and retains focus after filter or empty projection replaces rows", async ({
  page,
}, info) => {
  await open(page, 2);
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson29",
      profile: info.project.name,
    });
  await nav.act(value(page), "pin");
  await expect(value(page)).toBeFocused();
  await expect(page.locator(".chart29-detail")).toContainText("40 分钟");
  await nav.act(btn(page, "筛选绘图板"), "filter");
  await expect(btn(page, "筛选绘图板")).toBeFocused();
  await nav.act(btn(page, "空结果（教学筛选）"), "empty");
  await expect(btn(page, "空结果（教学筛选）")).toBeFocused();
  await expect(page.locator("[data-point]")).toHaveCount(0);
  save(`focus-${info.project.name}`, {
    trace,
    immediateFilterAndEmptyFocus: true,
  });
});
test("editing one value changes actual geometry detail and table while preserving other records", async ({
  page,
}, info) => {
  await open(page, 1);
  await value(page).click();
  const before = (await stored(page)).matrix;
  await page
    .getByLabel("教学用量（分钟，0–240整数）", { exact: true })
    .fill("120");
  await btn(page, "应用教学数值").click();
  const x = await consistency(page);
  expect(x.data.matrix.reader[0]).toBe(120);
  expect(x.data.matrix.reader.slice(1)).toEqual(before.reader.slice(1));
  expect(x.data.matrix.drawing).toEqual(before.drawing);
  expect(x.data.matrix.display).toEqual(before.display);
  await expect(page.locator(".chart29-detail")).toContainText("120 分钟");
  await expect(page.locator('[data-bar="reader:0"]')).toHaveAttribute(
    "width",
    "210",
  );
  save(`edit-${info.project.name}`, x);
});
test("different edit device and day uses explicit target and trend remains on that device", async ({
  page,
}) => {
  await open(page, 1);
  await btn(page, "趋势：每日折线图").click();
  await page
    .getByRole("combobox", { name: "编辑设备", exact: true })
    .selectOption("display");
  await page
    .getByRole("combobox", { name: "编辑日期", exact: true })
    .selectOption("4");
  await page
    .getByLabel("教学用量（分钟，0–240整数）", { exact: true })
    .fill("240");
  await btn(page, "应用教学数值").click();
  await expect(page.locator('[data-dot="display:4"]')).toHaveAttribute(
    "cy",
    "48",
  );
  expect((await stored(page)).matrix.display[4]).toBe(240);
  await consistency(page);
});
test("invalid empty negative fractional and over-budget edits are rejected without silent zero", async ({
  page,
}) => {
  await open(page, 1);
  const before = (await stored(page)).matrix;
  for (const s of ["", "-1", "1.5", "241", "abc"]) {
    await page
      .getByLabel("教学用量（分钟，0–240整数）", { exact: true })
      .fill(s);
    await btn(page, "应用教学数值").click();
    await expect(page.locator(".chart29-status")).toContainText("输入无效");
    expect((await stored(page)).matrix).toEqual(before);
  }
  expect((await stored(page)).editedSeen).toBe(false);
});
test("zero missing and original restore alter real values with distinct encodings", async ({
  page,
}) => {
  await open(page, 1);
  await btn(page, "设为0分钟").click();
  await value(page).click();
  await expect(page.locator('[data-bar="reader:0"]')).toHaveAttribute(
    "width",
    "0",
  );
  await expect(page.locator(".chart29-detail")).toContainText("观测为零");
  await btn(page, "标记为缺失").click();
  await value(page).click();
  await expect(page.locator('[data-bar="reader:0"]')).toHaveCount(0);
  await expect(page.locator(".chart29-detail")).toContainText("未知，不代表零");
  await btn(page, "恢复原始教学数据").click();
  expect((await stored(page)).matrix).toEqual(sampleMatrix());
  await consistency(page);
});
test("empty result has no fake data points and all-missing retains rows unlike observed zeros", async ({
  page,
}) => {
  await open(page, 2);
  await btn(page, "空结果（教学筛选）").click();
  await expect(page.locator(".chart29-svg")).toHaveCount(0);
  await expect(page.locator("[data-table-row]")).toHaveCount(0);
  await expect(page.locator(".chart29-summary")).toContainText("当前结果 0 条");
  await btn(page, "全为缺失（教学）").click();
  await expect(page.locator("[data-table-row]")).toHaveCount(3);
  await expect(page.locator(".chart29-summary")).toContainText("缺失 3");
  await value(page).click();
  await expect(page.locator(".chart29-detail")).toContainText("缺失（未知）");
  await consistency(page);
  await btn(page, "全为0（教学）").click();
  await expect(page.locator(".chart29-summary")).toContainText(
    "观测为0的有 3 条",
  );
  await value(page).click();
  await expect(page.locator(".chart29-detail")).toContainText("0 分钟");
  await consistency(page);
});
test("all missing trend is empty path not zero line and projection restore keeps edits", async ({
  page,
}) => {
  await open(page, 1);
  await page
    .getByLabel("教学用量（分钟，0–240整数）", { exact: true })
    .fill("123");
  await btn(page, "应用教学数值").click();
  await stage(page, 2).click();
  await btn(page, "趋势：每日折线图").click();
  await btn(page, "全为缺失（教学）").click();
  await expect(page.locator("[data-trend-line]")).toHaveAttribute("d", "");
  await expect(page.locator("[data-dot]")).toHaveCount(0);
  await expect(page.locator("[data-table-row]")).toHaveCount(7);
  await btn(page, "恢复正常样例").click();
  expect(
    Number(await page.locator('[data-dot="reader:0"]').getAttribute("cy")),
  ).toBeCloseTo(141.6, 6);
  expect((await stored(page)).matrix.reader[0]).toBe(123);
  await consistency(page);
});
test("rapid data and filter changes use latest values without old state flashback", async ({
  page,
}) => {
  await open(page, 1);
  for (const n of [10, 240, 0, 85]) {
    await page
      .getByLabel("教学用量（分钟，0–240整数）", { exact: true })
      .fill(String(n));
    await btn(page, "应用教学数值").click();
    await btn(page, "趋势：每日折线图").click();
    await btn(page, "筛选绘图板").click();
    await btn(page, "比较：设备条形图").click();
    await btn(page, "全部设备").click();
  }
  await expect(page.locator('[data-bar="reader:0"]')).toHaveAttribute(
    "width",
    "148.75",
  );
  await consistency(page);
});
test("responsive SVG retains geometry and long content at375 wide and short viewports", async ({
  page,
}, info) => {
  await open(page);
  await page
    .getByLabel("图表标题", { exact: true })
    .fill("很长的教学图表标题用于检查窄屏换行".repeat(5));
  const measures = [];
  for (const [width, height] of [
    [375, 480],
    [1280, 900],
    [375, 812],
  ]) {
    await page.setViewportSize({ width, height });
    await consistency(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const r = await page.locator('[data-bar="reader:0"]').evaluate((e) => ({
      rendered: e.getBoundingClientRect().width,
      expected: Number(e.getAttribute("width")) * e.getScreenCTM().a,
    }));
    expect(r.rendered).toBeCloseTo(r.expected, 1);
    measures.push({ width, height, ...r });
  }
  save(`resize-${info.project.name}`, measures);
});
test("realtime reduce leave and reset remove listeners and have no idle animation", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  const before = await page.evaluate(() => ({
    ...window.chartListenerBalance,
  }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab(page)).toHaveAttribute("data-reduced", "true");
  await btn(page, "趋势：每日折线图").click();
  await value(page).click();
  await expect(page.locator(".chart29-detail")).toContainText("40 分钟");
  await stage(page, 3).click();
  await expect
    .poll(() => page.evaluate(() => window.chartListenerBalance.key))
    .toBe(before.key - 1);
  await expect
    .poll(() => page.evaluate(() => window.chartListenerBalance.media))
    .toBe(before.media - 1);
  await expect
    .poll(() => page.evaluate(() => window.chartPending.size))
    .toBe(0);
  await stage(page, 0).click();
  await expect(lab(page)).toHaveAttribute("data-reduced", "true");
  await consistency(page);
  save(`cleanup-${info.project.name}`, {
    before,
    afterReturn: await page.evaluate(() => window.chartListenerBalance),
    idleRAF: 0,
  });
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local chart table controls crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 1) {
      await btn(page, "填入90分钟示例").click();
      await btn(page, "应用教学数值").click();
    }
    if (n === 2) {
      await btn(page, "全为缺失（教学）").click();
      await value(page).click();
    }
    if (n === 4) await btn(page, "生成图表集成指令").click();
    await axeCheck(page);
    mkdirSync(out, { recursive: true });
    await page.screenshot({
      path: `${out}/station${n + 1}-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .locator(
        n < 3 ? ".chart29-figure" : n === 3 ? ".quiz-grid" : ".agent-grid",
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
  await a("比较：设备条形图");
  await a("趋势：每日折线图");
  await a("筛选阅读屏");
  await act(value(p), "inspect");
  await expect(p.locator(".chart29-detail")).toContainText("40 分钟");
  await a("比较：设备条形图");
  await a("全部设备");
  await a("填入标题示例");
  await edit(p.getByLabel("图表标题", { exact: true }), "caption");
  await next();
  await a("填入90分钟示例");
  await edit(
    p.getByLabel("教学用量（分钟，0–240整数）", { exact: true }),
    "minutes",
  );
  await a("应用教学数值");
  await expect(
    p.locator('[data-table-row="reader:0"] td[data-table-value]'),
  ).toHaveText("123");
  await consistency(p);
  await a("确认已对照数据表");
  await next();
  await a("空结果（教学筛选）");
  await expect(p.locator("[data-table-row]")).toHaveCount(0);
  await a("全为缺失（教学）");
  await act(value(p), "missing");
  await expect(p.locator(".chart29-detail")).toContainText("缺失（未知）");
  await a("全为0（教学）");
  await act(value(p), "zero");
  await expect(p.locator(".chart29-detail")).toContainText("0 分钟");
  await a("恢复正常样例");
  await expect(
    p.locator('[data-table-row="reader:0"] td[data-table-value]'),
  ).toHaveText("123");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成图表集成指令");
  const draft = p.getByLabel("可编辑的 图表集成 Agent 指令");
  await expect(draft).toHaveValue(
    /数据与实际机制.*字段与任务.*选型.*轴与编码.*筛选和编辑.*空与缺失.*数值访问与替代.*验收/s,
  );
  await edit(draft, "draft");
  await a("复制图表集成指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 字段、单位、交互与替代。", { exact: true }),
    "review",
  );
  await a("完成第二十九节");
  await expect(p.locator(".lesson-twenty-nine .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await stored(p);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-nine .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十九节进度");
  await a("保留第二十九节进度");
  await expect(p.locator(".lesson-twenty-nine .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十九节进度");
  await a("确认重置第二十九节");
  await expect(p.locator("#chart29-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-nine .lesson-bottom")).toContainText(
    "0 / 5",
  );
  expect((await stored(p)).matrix).toEqual(sampleMatrix());
  await consistency(p);
  await axeCheck(p);
  return done;
}
test("full actual Tab workflow wrong retry edits copy refresh cancel confirm reset preserves28", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson29",
      profile: info.project.name,
    }),
    done = await flow(page, act, toggle, async (f, n) => {
      await seek(f, n);
      if (n === "minutes") {
        await page.keyboard.press("ControlOrMeta+A");
        await page.keyboard.type("123");
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
  test(`full zero keyboard touch ${reduced ? "reduce" : "normal"} workflow preserves28`, async ({
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
          n === "minutes"
            ? "123"
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
test("copy reset corrupt and unavailable storage remain scoped to29", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          window.savedChartCopy = true;
        },
      },
    });
    localStorage.setItem("frontend-observatory.lesson29.v1", "{broken");
  });
  await open(page, 4);
  await btn(page, "生成图表集成指令").click();
  await btn(page, "复制图表集成指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.savedChartCopy)).toBe(true);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  });
  await page
    .getByLabel("可编辑的 图表集成 Agent 指令")
    .fill("edit while unavailable");
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  await btn(page, "重置第二十九节进度").click();
  await btn(page, "确认重置第二十九节").click();
  await expect(page.locator("#chart29-stage-heading")).toBeFocused();
  await consistency(page, chartInitial());
});
test("late clipboard rejection after reset cannot mutate a new instance", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, r) => (window.rejectChartCopy = r)),
      },
    });
  });
  await open(page, 4);
  await btn(page, "生成图表集成指令").click();
  await btn(page, "复制图表集成指令").click();
  await btn(page, "重置第二十九节进度").click();
  await btn(page, "确认重置第二十九节").click();
  await page.evaluate(() => window.rejectChartCopy(Error("late")));
  await expect(page.locator("#chart29-stage-heading")).toBeFocused();
  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(lab(page)).toHaveAttribute("data-scenario", "normal");
});
test("chart brief and references honestly match SVG sample semantics and library boundaries", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(".chart29-boundary")).toContainText(
    "没有接入ECharts/D3",
  );
  await expect(page.locator(".chart29-boundary")).toContainText("虚构设备");
  await expect(page.locator(".chart29-hero-boundary")).toContainText(
    "React状态→SVG与数据表",
  );
  await expect(page.locator(".chart29-hero-boundary")).not.toContainText(
    "lottie",
  );
  await stage(page, 4).click();
  await btn(page, "生成图表集成指令").click();
  const draft = page.getByLabel("可编辑的 图表集成 Agent 指令");
  for (const re of [
    /0–240/,
    /null处断开/,
    /不默默变0/,
    /没有服务端取数/,
    /T09后续/,
    /未绘制直方图/,
    /数据表/,
  ])
    await expect(draft).toHaveValue(re);
  const details = page.locator("details").filter({
    has: page.getByText("第二十九节核对说明与官方来源", { exact: true }),
  });
  await details.locator("summary").click();
  await expect(details.getByRole("link")).toHaveCount(6);
});
test("late clipboard denial preserves deliberately moved real Tab focus", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, r) => (window.rejectChartCopy = r)),
      },
    });
  });
  await open(page, 4);
  await btn(page, "生成图表集成指令").click();
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson29",
      profile: info.project.name,
    });
  await nav.act(btn(page, "复制图表集成指令"), "copy");
  const review = page.getByLabel("我已检查 字段、单位、交互与替代。", {
    exact: true,
  });
  await nav.seek(review, "outside-copy");
  await page.evaluate(() => window.rejectChartCopy(Error("late denial")));
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

test("real keyboard native selects change edit target without pointer or programmatic focus", async ({
  page,
}, info) => {
  await open(page, 1);
  const trace = [],
    nav = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson29",
      profile: info.project.name,
    });
  const device = page.getByRole("combobox", { name: "编辑设备", exact: true }),
    day = page.getByRole("combobox", { name: "编辑日期", exact: true });
  await nav.seek(device, "edit-device");
  await page.keyboard.press("End");
  await expect(device).toHaveValue("display");
  await nav.seek(day, "edit-day");
  await page.keyboard.press("Home");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await expect(day).toHaveValue("4");
  const input = page.getByLabel("教学用量（分钟，0–240整数）", { exact: true });
  await nav.seek(input, "edit-minutes");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("120");
  await nav.act(btn(page, "应用教学数值"), "write-value");
  expect((await stored(page)).matrix.display[4]).toBe(120);
  await expect(btn(page, "应用教学数值")).toBeFocused();
  await consistency(page);
  save(`keyboard-selects-${info.project.name}`, {
    trace,
    actualKeys: true,
    device: "display",
    day: 4,
  });
});
