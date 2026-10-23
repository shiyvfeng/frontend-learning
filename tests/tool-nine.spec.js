import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL09_STORAGE as KEY,
  tool09Initial,
  tool09Brief,
  tool09Questions,
  recommendation,
  rowsFor,
} from "../src/tool-nine-content.js";

const out = "/tmp/tool09-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  f = (p, n) => p.locator("#tool09-" + n),
  lab = (p) => p.locator(".tool09-lab"),
  svg = (p) => p.locator("[data-d3-chart]"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T09工具专题学习步骤" })
      .getByRole("button")
      .nth(n),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  save = (n, v) =>
    writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", {
      name: "T09 · ECharts / D3 · 可学习",
      exact: true,
    }),
    "T09",
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
async function ready(p) {
  await expect(svg(p).locator(".mark")).toHaveCount(6);
}
async function inspect(p) {
  await b(p, "读取图表与数据快照").click();
  return JSON.parse(
    await p
      .locator("[data-chart-snapshot]")
      .getAttribute("data-chart-snapshot"),
  );
}
async function state(p) {
  return p.evaluate(async () => {
    const u = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((u) => /\/tool-nine-runtime-.*\.js/.test(u));
    return u
      ? (await import(u)).runtimeState()
      : { controllers: 0, created: 0, draws: 0, removed: 0 };
  });
}
const good = () => ({
  ...tool09Initial(),
  done: [0, 1, 2, 3],
  routesSeen: ["d3", "echarts"],
  needsSeen: ["standard", "custom"],
  comparedSeen: true,
  modesSeen: ["bar", "line"],
  filtersSeen: ["all", "recent"],
  changedSeen: true,
  zeroSeen: true,
  missingSeen: true,
  inspectedSeen: true,
  failureSeen: true,
  retrySeen: true,
  canceledSeen: true,
  staleSeen: true,
  cleanupSeen: true,
  answers: tool09Questions.map((q) => q.correct),
});
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

test("official sources six, actual module provenance and both route need combinations conditional", async ({
  page,
}) => {
  await open(page);
  await page
    .locator(".tool-nine .roadmap-details")
    .filter({ hasText: "T09工具专题核对说明与官方来源" })
    .locator(":scope > summary")
    .click();
  const ref = page
    .locator(".tool-nine .roadmap-details")
    .filter({ hasText: "T09工具专题核对说明与官方来源" });
  await expect(ref.getByRole("link")).toHaveCount(6);
  await expect(ref).toContainText("d3-selection 3.0.0");
  await expect(ref).not.toContainText(/Three.js|Rive|GSAP|Radix|Open Code/);
  for (const route of ["d3", "echarts"])
    for (const need of ["standard", "custom"]) {
      const r = recommendation({ ...good(), route, need });
      expect(r).toContain("并非绝对二选一");
      expect(r).toContain(need === "custom" ? "维护成本" : "已有图表组件");
    }
  for (const n of [
    "ECharts配置候选",
    "特殊图形交互需求",
    "记录配置层与定制层的选型条件",
  ])
    await b(page, n).click();
  await expect(lab(page)).toContainText("未安装运行");
  await expect(svg(page)).toHaveCount(0);
  expect((await read(page)).routesSeen).toEqual(["d3", "echarts"]);
  for (const t of [
    "keyed join",
    "line.defined",
    "0–40次",
    "缺失",
    "setOption",
    "resize",
    "dispose",
    "T11–T12仍为2个预告",
  ])
    expect(tool09Brief(good())).toContain(t);
});
test("real D3 bound data actual SVG bar geometry table and zero versus missing", async ({
  page,
}, info) => {
  await open(page, 1);
  await ready(page);
  const s = await inspect(page);
  expect(s.rows).toEqual(rowsFor("A", "all"));
  expect(s.mode).toBe("bar");
  for (const r of s.geometry) {
    const d = s.rows.find((d) => d.id === r.id);
    if (d.value === null) {
      expect(r.rect).toBeNull();
      expect(r.zero).toBe(false);
    } else {
      expect(r.rect.y).toBeCloseTo(216 - (d.value / 40) * 192);
      expect(r.rect.height).toBeCloseTo((d.value / 40) * 192);
      expect(r.rect.width).toBeGreaterThan(0);
    }
  }
  expect(s.geometry[1].rect.height).toBe(0);
  expect(s.geometry[1].zero).toBe(true);
  expect(s.geometry[2].rect).toBeNull();
  for (const r of s.rows)
    await expect(page.locator(`[data-table-row=${r.id}]`)).toContainText(
      r.value === null ? "缺失（未记录）" : `${r.value} 次`,
    );
  const node = await svg(page).locator('[data-row="day1"]').elementHandle();
  expect(await node.evaluate((e) => e.__data__.value)).toBe(12);
  await b(page, "切换教学样例A/B").click();
  await expect.poll(() => node.evaluate((e) => e.__data__.value)).toBe(24);
  expect(await node.evaluate((e) => e.isConnected)).toBe(true);
  expect((await inspect(page)).geometry[0].rect.height).toBeCloseTo(115.2);
  save(info.project.name + "-actual-d3-geometry", {
    before: s,
    after: await inspect(page),
  });
});
test("real line defined leaves gap missing zero stays at baseline geometry changes with mode", async ({
  page,
}, info) => {
  await open(page, 1);
  await ready(page);
  await f(page, "mode").selectOption("line");
  await expect(svg(page)).toHaveAttribute("data-mode", "line");
  const s = await inspect(page);
  expect(s.path.match(/M/g)).toHaveLength(2);
  expect(s.geometry[1].circle.cy).toBe(216);
  expect(s.geometry[2].circle).toBeNull();
  expect(s.geometry.every((r) => r.rect === null)).toBe(true);
  await expect(svg(page).locator("circle")).toHaveCount(5);
  save(info.project.name + "-line-gap", s);
});
test("actual graph pointer selection and HTML buttons share details no hover or color only", async ({
  page,
}) => {
  await open(page, 1);
  await ready(page);
  await svg(page).locator('[data-row="day1"] rect').click();
  await expect(page.locator(".tool09-summary")).toContainText("周一：12 次");
  await b(page, "查看周二").click();
  await expect(page.locator(".tool09-summary")).toContainText(
    "有记录，测得没有借用",
  );
  await b(page, "查看周三").click();
  await expect(page.locator(".tool09-summary")).toContainText(
    "不能推断没有借用",
  );
  expect(await read(page)).toMatchObject({ zeroSeen: true, missingSeen: true });
});
test("filter keyed joins preserve retained nodes empty is not zero and external focus remains", async ({
  page,
}) => {
  await open(page, 1);
  await ready(page);
  const retained = await svg(page).locator('[data-row="day4"]').elementHandle();
  await b(page, "查看周二").click();
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool09-filter",
    profile: "both",
  });
  await k.seek(f(page, "filter"), "actual focus before filter fixture");
  await f(page, "filter").selectOption("recent");
  await expect(svg(page).locator(".mark")).toHaveCount(3);
  expect(await retained.evaluate((e) => e.isConnected)).toBe(true);
  await expect(page.locator(".tool09-summary")).not.toContainText("周二：");
  await expect(f(page, "filter")).toBeFocused();
  await f(page, "filter").selectOption("empty");
  await expect(svg(page).locator(".mark")).toHaveCount(0);
  await expect(svg(page)).toContainText("不是0次");
  await expect(page.locator(".tool09-data")).toContainText("不代表0次");
  await f(page, "filter").selectOption("all");
  await ready(page);
});
test("container resize recalculates real coordinate width without changing data zero width recovers", async ({
  page,
}, info) => {
  await open(page, 1);
  await ready(page);
  const a = await inspect(page);
  await page
    .locator(".tool09-chart-host")
    .evaluate((e) => (e.style.width = "210px"));
  await expect
    .poll(async () => Number(await svg(page).getAttribute("width")))
    .toBe(208);
  const z = await inspect(page);
  expect(z.rows).toEqual(a.rows);
  expect(z.geometry[0].rect.width).toBeLessThan(a.geometry[0].rect.width);
  await page
    .locator(".tool09-chart-host")
    .evaluate((e) => (e.style.width = "0px"));
  await page
    .locator(".tool09-chart-host")
    .evaluate((e) => (e.style.width = "200px"));
  await expect(svg(page)).toHaveAttribute("width", "198");
  save(info.project.name + "-resize", {
    before: a,
    narrow: z,
    after: await inspect(page),
  });
});
test("local failure preserves accepted rows retries snapshot outcome and repeat start guards", async ({
  page,
}) => {
  await open(page, 2);
  await ready(page);
  await b(page, "下次样例模拟失败").click();
  await b(page, "开始或重试样例").click();
  await b(page, "开始或重试样例").click();
  await expect(lab(page)).toHaveAttribute("data-queue", "1");
  await b(page, "下次样例正常").click();
  await b(page, "投递最早样例结果").click();
  await expect(lab(page)).toHaveAttribute("data-phase", "error");
  expect((await read(page)).dataset).toBe("A");
  await b(page, "开始或重试样例").click();
  await b(page, "投递最早样例结果").click();
  await expect(lab(page)).toHaveAttribute("data-phase", "success");
  expect(await read(page)).toMatchObject({
    dataset: "B",
    failureSeen: true,
    retrySeen: true,
  });
  await expect.poll(async () => (await inspect(page)).rows[0].value).toBe(24);
});
test("canceled old success and failure cannot replace newer intent queue bounded8", async ({
  page,
}, info) => {
  await open(page, 2);
  for (let i = 0; i < 8; i++) {
    await b(page, i % 2 ? "下次样例模拟失败" : "下次样例正常").click();
    await b(page, "开始或重试样例").click();
    await b(page, "取消本次样例").click();
  }
  await b(page, "开始或重试样例").click();
  await expect(lab(page)).toHaveAttribute("data-queue", "8");
  for (let i = 0; i < 8; i++) await b(page, "投递最早样例结果").click();
  expect((await read(page)).dataset).toBe("A");
  await b(page, "投递最早样例结果").click();
  await expect(lab(page)).toHaveAttribute("data-queue", "0");
  await b(page, "下次样例正常").click();
  await b(page, "开始或重试样例").click();
  await b(page, "取消本次样例").click();
  await b(page, "开始或重试样例").click();
  await b(page, "投递最早样例结果").click();
  await expect(lab(page)).toHaveAttribute("data-phase", "pending");
  await b(page, "投递最早样例结果").click();
  expect((await read(page)).dataset).toBe("B");
  save(info.project.name + "-transactions", await read(page));
});
for (const outcome of ["success", "failure", "stale"])
  test(`last ${outcome} result immediate real Tab focus stays enabled visible same button`, async ({
    page,
  }, info) => {
    await open(page, 2);
    await b(
      page,
      outcome === "failure" ? "下次样例模拟失败" : "下次样例正常",
    ).click();
    await b(page, "开始或重试样例").click();
    if (outcome === "stale") await b(page, "取消本次样例").click();
    const k = createKeyboardNavigator(page, expect, [], {
      lesson: "tool09-result",
      profile: info.project.name,
    });
    await k.seek(b(page, "投递最早样例结果"), "last result");
    const node = await b(page, "投递最早样例结果").elementHandle();
    await page.keyboard.press("Enter");
    expect(
      await node.evaluate(
        (e) => e === document.activeElement && e.isConnected && !e.disabled,
      ),
    ).toBe(true);
    await expect(b(page, "投递最早样例结果")).toBeFocused();
    await k.seek(b(page, "投递最早样例结果"), "immediate after result");
  });
test("actual module failure table fallback retry retains control and loads genuine SVG", async ({
  page,
}) => {
  await page.route("**/tool-nine-runtime-*.js", (r) => r.abort());
  await open(page, 1);
  await expect(page.locator(".tool09-view")).toHaveAttribute(
    "data-state",
    "error",
  );
  await b(page, "查看周三").click();
  await b(page, "读取图表与数据快照").click();
  expect((await read(page)).missingSeen).toBe(true);
  await expect(svg(page)).toHaveCount(0);
  await page.unroute("**/tool-nine-runtime-*.js");
  await b(page, "重试D3模块").click();
  await page.waitForLoadState();
  await directory(page);
  await stage(page, 1).click();
  await ready(page);
});
test("late held module after leave does not create SVG or steal actual new Tab focus", async ({
  page,
}) => {
  let release, held;
  const gate = new Promise((r) => (release = r));
  await page.route("**/tool-nine-runtime-*.js", async (r) => {
    held = true;
    await gate;
    await r.continue();
  });
  await open(page, 1);
  await expect.poll(() => held).toBe(true);
  await stage(page, 3).click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  release();
  await expect
    .poll(() =>
      page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((e) => /\/tool-nine-runtime-.*\.js/.test(e.name)),
      ),
    )
    .toBe(true);
  await expect.poll(async () => (await state(page)).controllers).toBe(0);
  await expect(svg(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
test("release and navigation remove own SVG and chart events restore current model no idle loop", async ({
  page,
}, info) => {
  await open(page, 1);
  await ready(page);
  const old = await svg(page).elementHandle();
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const before = await state(page);
  await page.waitForTimeout(150);
  expect(await state(page)).toEqual(before);
  await expect.poll(async () => (await state(page)).draws).toBeGreaterThan(0);
  await b(page, "释放本例D3资源").click();
  await expect(svg(page)).toHaveCount(0);
  expect((await state(page)).controllers).toBe(0);
  expect(
    await old.evaluate((e) => e.querySelector(".mark").__on),
  ).toBeUndefined();
  await b(page, "切换教学样例A/B").click();
  await b(page, "恢复D3绘图").click();
  await ready(page);
  expect((await inspect(page)).rows[0].value).toBe(24);
  await stage(page, 3).click();
  expect((await state(page)).controllers).toBe(0);
  const a = await state(page);
  await page.waitForTimeout(150);
  expect(await state(page)).toEqual(a);
  save(info.project.name + "-cleanup", { before, after: a });
});
test("hidden cancels pending frame visible uses latest snapshot and live reduce has no animation gate", async ({
  page,
}) => {
  await open(page, 1);
  await ready(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const a = await state(page);
  await b(page, "切换教学样例A/B").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await state(page)).draws).toBe(a.draws);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await inspect(page)).rows[0].value).toBe(24);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await f(page, "mode").selectOption("line");
  await expect(svg(page)).toHaveAttribute("data-mode", "line");
});
test("held RAF and ResizeObserver callback after destroy cannot redraw or alter later focus", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.held09 = [];
    const raf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (window.hold09) window.held09.push(() => cb(t));
        else cb(t);
      });
    const RO = ResizeObserver;
    window.ro09 = [];
    window.ResizeObserver = class extends RO {
      constructor(cb) {
        super(cb);
        window.ro09.push(cb);
      }
    };
  });
  await open(page, 1);
  await ready(page);
  await page.evaluate(() => (window.hold09 = true));
  await b(page, "切换教学样例A/B").click();
  await expect
    .poll(() => page.evaluate(() => window.held09.length))
    .toBeGreaterThan(0);
  await b(page, "释放本例D3资源").click();
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool09-late",
    profile: info.project.name,
  });
  await k.seek(b(page, "恢复D3绘图"), "external focus");
  const before = await state(page);
  await page.evaluate(() => {
    window.hold09 = false;
    for (const f of window.held09.splice(0)) f();
    for (const f of window.ro09) f([]);
  });
  expect(await state(page)).toEqual(before);
  await expect(b(page, "恢复D3绘图")).toBeFocused();
  save(info.project.name + "-late-callbacks", {
    before,
    after: await state(page),
    fixture:
      "Captured actual RAF/RO callbacks manually delivered after destroy, not a physical resize",
  });
});
test("editable brief retains changes marks stale and requires explicit human confirmation", async ({
  page,
}) => {
  await seed(page, good());
  await open(page, 4);
  await b(page, "填入项目现状示例（替换本栏）").click();
  await b(page, "生成工具选型说明").click();
  const x = await f(page, "agent-draft").inputValue();
  await f(page, "agent-draft").fill(x + "\n保留自己的部署约束");
  await f(page, "context").fill("用户新的字段约束");
  await expect(f(page, "agent-draft")).toHaveValue(x + "\n保留自己的部署约束");
  const check = page.getByRole("checkbox", {
    name: "我已核对图表选型、字段单位、缺失语义与可访问验收。",
    exact: true,
  });
  await expect(check).toBeDisabled();
  await b(page, "保留编辑并确认当前实验参数").click();
  await check.check();
  await b(page, "重新生成工具选型草稿").click();
  expect(await f(page, "agent-draft").inputValue()).not.toContain(
    "保留自己的部署约束",
  );
  expect((await read(page)).reviewed).toBe(false);
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
  await b(page, "重置T09工具专题进度").click();
  await b(page, "确认重置T09工具专题").click();
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

test("malformed storage bounded enums text and review no injected HTML", async ({
  page,
}) => {
  await seed(page, {
    ...good(),
    step: 9,
    done: [0, 0, 9, "1"],
    dataset: "private",
    routesSeen: ["echarts", "bad", "echarts"],
    context: "x".repeat(900),
    draft: "<script>bad</script>",
    reviewed: true,
  });
  await open(page);
  const r = await read(page);
  expect(r).toMatchObject({
    step: 0,
    done: [0],
    dataset: "A",
    routesSeen: ["echarts"],
    reviewed: false,
  });
  expect(r.context.length).toBe(700);
});
test("unavailable storage and missing ResizeObserver retain real chart controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.ResizeObserver = undefined;
    Storage.prototype.setItem = () => {
      throw Error("fixture");
    };
  });
  await open(page, 1);
  await ready(page);
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 380, height: 700 });
  await expect.poll(async () => (await inspect(page)).width).toBeGreaterThan(0);
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 actual D3 scoped crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 1 || n === 2) await ready(page);
    if (n === 3)
      await page
        .locator(".quiz-grid fieldset")
        .first()
        .getByRole("button")
        .first()
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
    await page.locator(".stage-intro").screenshot({
      path: `${out}/${info.project.name}-station${n + 1}-intro.png`,
    });
    await page
      .locator(n < 3 ? ".tool09-lab" : n === 3 ? ".quiz-grid" : ".agent-editor")
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
    { length: 8 },
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
      value: { writeText: () => Promise.reject(Error("fixture")) },
    });
  }, priorKeys);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), priorKeys);
}
async function complete(p, act, select, type, toggle = act) {
  for (const n of [
    "ECharts配置候选",
    "特殊图形交互需求",
    "记录配置层与定制层的选型条件",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "station0");
  await ready(p);
  await select(f(p, "mode"), "line");
  await select(f(p, "filter"), "recent");
  await select(f(p, "filter"), "all");
  for (const n of [
    "切换教学样例A/B",
    "查看周二",
    "查看周三",
    "读取图表与数据快照",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "station1");
  for (const n of [
    "下次样例模拟失败",
    "开始或重试样例",
    "投递最早样例结果",
    "下次样例正常",
    "开始或重试样例",
    "取消本次样例",
    "开始或重试样例",
    "投递最早样例结果",
    "投递最早样例结果",
    "释放本例D3资源",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "station2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool09Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool09Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "sample");
  await type(f(p, "context"), " 用户补充文字回退。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(f(p, "agent-draft"), "\n自己的字段验收。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对图表选型、字段单位、缺失语义与可访问验收。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T09工具专题"), "finish");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T09工具专题进度"), "reset cancel");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T09工具专题进度"), "retain");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T09工具专题进度")).toBeFocused();
  await act(b(p, "重置T09工具专题进度"), "reset");
  await act(b(p, "确认重置T09工具专题"), "confirm");
  await expect(f(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    draft: "",
    context: "",
  });
}
test("real Tab five stations genuine select edits retry clipboard refresh cancel confirm reset preserves42", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool09-full",
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
      await k.seek(l, "actual edit");
      await page.keyboard.press("End");
      await page.keyboard.type(t);
    },
    k.toggle,
  );
  const d = (await read(page)).draft;
  await page.reload();
  await directory(page, k.act);
  await expect(f(page, "agent-draft")).toHaveValue(d);
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
  test(`zero keyboard touch full ${reducedMotion} actualD3 edits retry refresh reset preserves42`, async ({
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
      window.keys09 = 0;
      addEventListener("keydown", () => window.keys09++);
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
    const d = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(f(p, "agent-draft")).toHaveValue(d);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keys09)).toBe(0);
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
        "Actual taps plus selectOption/fill fixtures, not OS picker/IME/physicaldevice",
    });
    await c.close();
  });

test("T08 exit opens T09 twelve entries two previews and no fabricated numbered33", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(12);
  await expect(nav.locator(".coverage-preview")).toHaveCount(2);
  await nav.getByRole("button", { name: /T08/ }).click();
  await b(page, "继续T09 · ECharts / D3").click();
  await expect(f(page, "stage-heading")).toBeVisible();
  await expect(page.locator(".breadcrumb")).toContainText("ECharts / D3");
  await expect(page).toHaveTitle("ECharts / D3 · 前端观察室");
  await expect(page.locator(".site-footer")).toContainText("真实D3模块");
});
test("375 short viewport long editable inert text real focus no overflow axe", async ({
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
      "长标签与缺失验收".repeat(80),
  );
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool09-short",
    profile: info.project.name,
  });
  await k.seek(f(page, "agent-draft"), "visible editable brief");
  expect(await page.locator(".tool-nine img").count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await axes(page);
  await page
    .locator(".agent-editor")
    .screenshot({ path: `${out}/${info.project.name}-short.png` });
});

test("coalesced held draw consumes newest sample mode filter together", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window);
    window.heldNewest09 = [];
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (window.holdNewest09) window.heldNewest09.push(() => cb(t));
        else cb(t);
      });
  });
  await open(page, 1);
  await ready(page);
  await page.evaluate(() => (window.holdNewest09 = true));
  await b(page, "切换教学样例A/B").click();
  await f(page, "mode").selectOption("line");
  await f(page, "filter").selectOption("recent");
  await expect
    .poll(() => page.evaluate(() => window.heldNewest09.length))
    .toBeGreaterThan(0);
  expect(await svg(page).getAttribute("data-mode")).toBe("bar");
  await page.evaluate(() => {
    window.holdNewest09 = false;
    for (const f of window.heldNewest09.splice(0)) f();
  });
  await expect(svg(page)).toHaveAttribute("data-mode", "line");
  const s = await inspect(page);
  expect(s.rows).toEqual(rowsFor("B", "recent"));
  await expect(svg(page).locator(".mark")).toHaveCount(3);
  save(info.project.name + "-latest-frame", s);
});
test("navigation and refresh clear only live transaction while accepted data persists", async ({
  page,
}) => {
  await open(page, 2);
  await b(page, "开始或重试样例").click();
  await expect(lab(page)).toHaveAttribute("data-queue", "1");
  await stage(page, 1).click();
  await stage(page, 2).click();
  await expect(lab(page)).toHaveAttribute("data-phase", "idle");
  await expect(lab(page)).toHaveAttribute("data-queue", "0");
  await b(page, "开始或重试样例").click();
  await page.reload();
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-phase", "idle");
  await expect(lab(page)).toHaveAttribute("data-queue", "0");
  await b(page, "投递最早样例结果").click();
  expect((await read(page)).dataset).toBe("A");
});
