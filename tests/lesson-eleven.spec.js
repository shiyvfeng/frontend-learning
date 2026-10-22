import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson11.v1",
  priorKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
    (n) => `frontend-observatory.lesson${n}.v1`,
  ),
  out = "/tmp/vector-acceptance";
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await nav.getByRole("button").nth(n).click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 10);
  await expect(page.locator("#vector-stage-heading")).toBeVisible();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
const choose = (page, label, value) => choice(page, label, value).click();
const step = (page, n) =>
  page
    .getByRole("navigation", { name: "第十一节学习步骤" })
    .getByRole("button")
    .nth(n)
    .click();
const next = (page) => page.getByRole("button", { name: "完成并继续" }).click();
const progress = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function axeCheck(page) {
  await page.evaluate(axe);
  const r = await page.evaluate(() =>
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

async function firstThree(page) {
  for (const value of ["80px", "240px"])
    await choose(page, "SVG 显示尺寸", value);
  await choose(page, "viewBox 坐标范围", "160 × 160");
  await choose(page, "图标描边宽度", "8 单位");
  await choose(page, "图标填充", "fill=none");
  await page.getByRole("button", { name: "读取内联 SVG 结构与尺寸" }).click();
  await next(page);
  await choose(page, "曲线控制点 Y", "24 · 上抬");
  await choose(page, "路径线宽", "10 单位");
  for (const value of ["0%", "50%", "100%"])
    await choose(page, "手动描边进度", value);
  await page.getByRole("button", { name: "读取真实路径几何" }).click();
  await next(page);
  await page.getByRole("button", { name: "收藏路线卡", exact: true }).click();
  await choose(page, "SVG 使用语义", "信息图形");
  await choose(page, "SVG 使用语义", "交互图表");
  await choose(page, "选择月份", "二月");
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [1, 0, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
test("eleventh SVG available on demand, twenty-sixth remains planned", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-eleven-.*\.js/.test(u))).toBe(false);
  await course(page, 10);
  await expect(page.locator("#vector-stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-eleven-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("SVG · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(25);
  await course(page, 25);
  await expect(
    page.getByRole("heading", { name: "Three.js", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("real SVG structure sizes and viewBox produce actual coordinate transformations", async ({
  page,
}) => {
  await open(page);
  const svg = page.getByTestId("scale-svg"),
    path = svg.locator("path"),
    original = await path.elementHandle();
  expect(
    await svg.evaluate((e) => ({
      ns: e.namespaceURI,
      tags: [...e.children].map((n) => n.localName),
      shapes: [...e.querySelector("g").children].map((n) => n.localName),
      raster: e.querySelectorAll("image,img,canvas").length,
    })),
  ).toEqual({
    ns: "http://www.w3.org/2000/svg",
    tags: ["title", "desc", "g"],
    shapes: ["path", "circle"],
    raster: 0,
  });
  const widths = [];
  for (const size of [80, 160, 240]) {
    await choose(page, "SVG 显示尺寸", size + "px");
    const r = await svg.boundingBox();
    expect(r.width).toBeCloseTo(size, 1);
    expect(r.height).toBeCloseTo(size, 1);
    widths.push((await path.boundingBox()).width);
    expect(await svg.evaluate((e) => e.getScreenCTM().a)).toBeCloseTo(
      size / 100,
      3,
    );
  }
  expect(widths[2] / widths[0]).toBeCloseTo(3, 2);
  await choose(page, "viewBox 坐标范围", "160 × 160");
  expect((await path.boundingBox()).width / widths[2]).toBeCloseTo(0.625, 3);
  expect(await path.evaluate((e, old) => e === old, original)).toBe(true);
  await page.getByRole("button", { name: "读取内联 SVG 结构与尺寸" }).click();
  await expect(page.getByTestId("scale-report")).toContainText(
    "title → desc → g",
  );
  await expect(page.getByTestId("scale-report")).toContainText("1.50 CSS px");
  await noOverflow(page);
});
test("fill stroke and non-scaling-stroke alter live vector attributes without a raster substitute", async ({
  page,
}) => {
  await open(page);
  const svg = page.getByTestId("scale-svg"),
    path = svg.locator("path");
  await choose(page, "图标填充", "fill=none");
  await expect(path).toHaveCSS("fill", "none");
  await choose(page, "图标描边宽度", "8 单位");
  await expect(path).toHaveCSS("stroke-width", "8px");
  await choose(page, "图标颜色", "青色");
  await expect(path).toHaveCSS("stroke", "rgb(23, 109, 104)");
  await page.getByLabel("non-scaling-stroke：描边保持屏幕线宽").check();
  for (const tag of ["path", "circle"])
    await expect(svg.locator(tag)).toHaveCSS(
      "vector-effect",
      "non-scaling-stroke",
    );
  await page.getByLabel("non-scaling-stroke：描边保持屏幕线宽").uncheck();
  await expect(path).toHaveCSS("vector-effect", "none");
});
test("path controls change actual geometry length stroke caps and manual normalized progress", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  const path = page.getByTestId("progress-path"),
    lengths = [];
  for (const [value, y] of [
    ["24 · 上抬", 24],
    ["90 · 中间", 90],
    ["156 · 下压", 156],
  ]) {
    await choose(page, "曲线控制点 Y", value);
    await expect(path).toHaveAttribute("d", `M24 138 Q150 ${y} 276 60`);
    lengths.push(await path.evaluate((e) => e.getTotalLength()));
  }
  expect(lengths[0]).not.toBeCloseTo(lengths[1], 1);
  expect(lengths.every((v) => v > 263)).toBe(true);
  await choose(page, "路径线宽", "10 单位");
  await expect(path).toHaveCSS("stroke-width", "10px");
  await choose(page, "描边端点", "butt · 平头");
  await expect(path).toHaveCSS("stroke-linecap", "butt");
  for (const percent of [0, 50, 100]) {
    await choose(page, "手动描边进度", percent + "%");
    await expect(path).toHaveAttribute(
      "stroke-dashoffset",
      String(100 - percent),
    );
    await expect(path).toHaveAttribute(
      "visibility",
      percent === 0 ? "hidden" : "visible",
    );
  }
  await page.getByRole("button", { name: "读取真实路径几何" }).click();
  await expect(page.getByTestId("path-report")).toContainText("getTotalLength");
  expect(await path.evaluate((e) => e.getTotalLength())).not.toBe(100);
});
test("decorative versus meaningful SVG semantics and chart data remain accessible outside geometry", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  const button = page.getByRole("button", { name: "收藏路线卡", exact: true });
  await expect(page.getByTestId("decorative-svg")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(button).toHaveAccessibleName("收藏路线卡");
  await choose(page, "SVG 使用语义", "信息图形");
  await expect(page.getByTestId("meaningful-svg")).toHaveAccessibleName(
    "示例路线目的地：海岸",
  );
  await expect(page.getByTestId("meaningful-svg")).toHaveAccessibleDescription(
    /位置标记/,
  );
  await choose(page, "SVG 使用语义", "交互图表");
  await expect(page.getByTestId("chart-svg")).toHaveAccessibleName(
    "示例月份学习时长",
  );
  await expect(page.getByTestId("chart-svg")).toHaveAccessibleDescription(
    /一月 12.*二月 20.*三月 16/,
  );
  await expect(page.locator(".lesson-eleven table tbody tr")).toHaveCount(3);
  for (const value of ["二月", "三月", "一月"]) {
    await choose(page, "选择月份", value);
    await expect(page.getByTestId("chart-selection")).toContainText(value);
    await expect(page.getByTestId("chart-svg")).toHaveAccessibleDescription(
      new RegExp("当前选择 " + value),
    );
    await expect(
      page.getByTestId("chart-svg").locator("text").filter({ hasText: "已选" }),
    ).toHaveCount(1);
  }
  expect(
    await page
      .getByTestId("chart-svg")
      .locator('button,a,[tabindex="0"]')
      .count(),
  ).toBe(0);
  for (let i = 0; i < 4; i++) {
    await button.click();
    await expect(button).toHaveAttribute(
      "aria-pressed",
      i % 2 === 0 ? "true" : "false",
    );
  }
  await expect(page.locator(".vector-semantic")).toContainText("尚未收藏");
});
test("measurement APIs failing are reported honestly and still permit inspecting fallback", async ({
  page,
}) => {
  await open(page);
  await page.getByTestId("scale-svg").evaluate((e) => {
    e.getScreenCTM = () => {
      throw Error("unsupported");
    };
  });
  await page.getByRole("button", { name: "读取内联 SVG 结构与尺寸" }).click();
  await expect(page.getByTestId("scale-report")).toContainText(
    "测量 API 不可用",
  );
  expect((await progress(page)).inspected).toBe(true);
  await choose(page, "SVG 显示尺寸", "80px");
  await expect(page.getByTestId("scale-svg")).toHaveAttribute("width", "80");
  await step(page, 1);
  await page.getByTestId("progress-path").evaluate((e) => {
    e.getTotalLength = () => {
      throw Error("unsupported");
    };
  });
  await page.getByRole("button", { name: "读取真实路径几何" }).click();
  await expect(page.getByTestId("path-report")).toContainText(
    "测量 API 不可用",
  );
  expect((await progress(page)).pathInspected).toBe(true);
});
test("static vector controls respect reduced motion and focus/state survive forced colors", async ({
  page,
}) => {
  await open(page);
  for (const pref of ["no-preference", "reduce"]) {
    await page.emulateMedia({ reducedMotion: pref });
    for (let i = 0; i < 3; i++) {
      await step(page, i);
      expect(
        await page
          .locator(".vector-lab")
          .evaluate((e) => e.getAnimations({ subtree: true }).length),
      ).toBe(0);
      await noOverflow(page);
    }
  }
  const button = page.getByRole("button", { name: "收藏路线卡", exact: true });
  await button.click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(button).toBeFocused();
  await page.emulateMedia({ forcedColors: "active" });
  await expect(button).not.toHaveCSS("outline-style", "none");
  await expect(page.locator(".vector-semantic")).toContainText("✓ 已收藏");
});
test("quiz wrong feedback reasons retry and gated progress are repeatable", async ({
  page,
}) => {
  await open(page);
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await step(page, 3);
  await page.locator(".quiz-card").first().getByRole("button").nth(0).click();
  await expect(page.locator(".quiz-feedback").first()).toContainText(
    "再想一想",
  );
  await expect(page.locator(".quiz-feedback").first()).toContainText("100/160");
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await quiz(page);
  await expect(page.locator(".lesson-eleven .lesson-bottom")).toContainText(
    "1 / 5",
  );
  await step(page, 3);
  await next(page);
  await expect(page.locator(".lesson-eleven .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("four editable Agent scenarios bind actual parameters and implement honest copy paths", async ({
  page,
}) => {
  await open(page);
  await choose(page, "SVG 显示尺寸", "240px");
  await choose(page, "viewBox 坐标范围", "160 × 160");
  await choose(page, "图标描边宽度", "8 单位");
  await step(page, 1);
  await choose(page, "曲线控制点 Y", "24 · 上抬");
  await choose(page, "手动描边进度", "50%");
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 矢量 Agent 指令");
  await page.getByRole("button", { name: "生成矢量指令" }).click();
  await expect(draft).toHaveValue(/240×240.*0 0 160 160.*stroke-width=8/s);
  for (const [value, pattern] of [
    ["button", /24×24.*aria-hidden=true/s],
    ["path", /Q150 24.*手动进度 50\/100/s],
    ["chart", /一月 12.*全部数据的 HTML 表格/s],
  ]) {
    await page.getByLabel("实现场景").selectOption(value);
    await page.getByRole("button", { name: "重新生成矢量草稿" }).click();
    await expect(draft).toHaveValue(pattern);
  }
  await page.getByLabel("我已检查坐标、描边、语义、操作与性能。").check();
  await draft.fill((await draft.inputValue()) + "\n保留可见操作。");
  await expect(
    page.getByLabel("我已检查坐标、描边、语义、操作与性能。"),
  ).not.toBeChecked();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.vectorCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制矢量指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.vectorCopied)).toContain(
    "保留可见操作",
  );
  for (const missing of [true, false]) {
    await page.evaluate(
      (m) =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: m
            ? undefined
            : {
                writeText: async () => {
                  throw Error("denied");
                },
              },
        }),
      missing,
    );
    await page.getByRole("button", { name: "复制矢量指令" }).click();
    await expect(page.locator(".copy-feedback")).toContainText(
      "自动复制不可用",
    );
    await expect(draft).toBeFocused();
    expect(await draft.evaluate((e) => e.selectionEnd - e.selectionStart)).toBe(
      (await draft.inputValue()).length,
    );
  }
});
test("late clipboard response cannot repopulate reset state", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  await page.getByRole("button", { name: "生成矢量指令" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r) => (window.resolveVectorCopy = r)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制矢量指令" }).click();
  await page.getByRole("button", { name: "重置第十一节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("可编辑的 矢量 Agent 指令")).not.toHaveValue("");
  await page.getByRole("button", { name: "重置第十一节进度" }).click();
  await page.getByRole("button", { name: "确认重置第十一节" }).click();
  await page.evaluate(() => window.resolveVectorCopy());
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 矢量 Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});

test("corrupt storage is sanitized full completion stable and unavailable storage reported", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          size: 999,
          box: 0,
          done: [99, null],
          answers: "bad",
          sizesSeen: [80, 80, 999],
          draft: 99,
        }),
      );
      sessionStorage.setItem("seed", "1");
    }
  }, key);
  await open(page);
  await expect(page.getByTestId("scale-svg")).toHaveAttribute("width", "160");
  expect((await progress(page)).sizesSeen).toEqual([80]);
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成矢量指令" }).click();
  await page.getByLabel("我已检查坐标、描边、语义、操作与性能。").check();
  await page
    .getByRole("button", { name: "完成第十一节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-eleven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  expect((await progress(page)).done.sort()).toEqual([0, 1, 2, 3, 4]);
  await expect(page.locator(".notice")).toContainText("可以从课程目录继续 12");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 10);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("every station actual SVG meaning modes measured results and sources pass axe and no overflow", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#vector-stage-heading")).toBeFocused();
    await axeCheck(page);
    await noOverflow(page);
  }
  await step(page, 0);
  await page.getByRole("button", { name: "读取内联 SVG 结构与尺寸" }).click();
  await axeCheck(page);
  await step(page, 1);
  await page.getByRole("button", { name: "读取真实路径几何" }).click();
  await axeCheck(page);
  await step(page, 2);
  for (const value of ["装饰图标", "信息图形", "交互图表"]) {
    await choose(page, "SVG 使用语义", value);
    await axeCheck(page);
  }
  await page.getByText("第十一节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：SVG 的 viewBox ↗", exact: true }),
  ).toBeVisible();
  await axeCheck(page);
});
async function completeFlow(page, act, toggle, edit) {
  async function directory(n) {
    const nav = page.getByRole("navigation", { name: "课程目录" });
    if (!(await nav.isVisible()))
      await act(page.getByRole("button", { name: "☰ 课程" }), "directory");
    await act(nav.getByRole("button").nth(n), "course " + (n + 1));
    const names = [
      "第一节学习步骤",
      "第二节学习步骤",
      "第三节学习步骤",
      "第四节学习步骤",
      "第五节学习步骤",
      "第六节学习步骤",
      "第七节学习步骤",
      "第八节学习步骤",
      "第九节学习步骤",
      "第十节学习步骤",
      "第十一节学习步骤",
    ];
    await expect(
      page.getByRole("navigation", { name: names[n] }),
    ).toBeVisible();
    // Lazy lessons must finish initialization before taking a storage baseline.
    await expect
      .poll(() =>
        page.evaluate(
          (k) => localStorage.getItem(k),
          `frontend-observatory.lesson${n + 1}.v1`,
        ),
      )
      .not.toBeNull();
  }
  const pick = (label, value) =>
      act(choice(page, label, value), label + " -> " + value),
    advance = () =>
      act(page.getByRole("button", { name: "完成并继续" }), "next");
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(10);
  await act(
    page.getByRole("button", { name: "完成并继续" }),
    "blocked before tasks",
  );
  await expect(page.locator(".notice")).toContainText("先完成");
  await pick("SVG 显示尺寸", "80px");
  await pick("SVG 显示尺寸", "240px");
  await pick("viewBox 坐标范围", "160 × 160");
  await pick("图标描边宽度", "8 单位");
  await pick("图标填充", "fill=none");
  await act(
    page.getByRole("button", { name: "读取内联 SVG 结构与尺寸" }),
    "inspect SVG",
  );
  await advance();
  await pick("曲线控制点 Y", "24 · 上抬");
  await pick("路径线宽", "10 单位");
  for (const value of ["0%", "50%", "100%"]) await pick("手动描边进度", value);
  await act(
    page.getByRole("button", { name: "读取真实路径几何" }),
    "inspect path",
  );
  await advance();
  await act(
    page.getByRole("button", { name: "收藏路线卡", exact: true }),
    "named icon button",
  );
  await pick("SVG 使用语义", "信息图形");
  await pick("SVG 使用语义", "交互图表");
  await pick("选择月份", "二月");
  await expect(page.getByTestId("chart-selection")).toContainText(
    "二月 · 20 小时",
  );
  await advance();
  const cards = page.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong answer");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(page.getByRole("button", { name: "生成矢量指令" }), "generate");
  const draft = page.getByLabel("可编辑的 矢量 Agent 指令");
  await expect(draft).toHaveValue(/坐标与视觉.*语义与操作.*技术取舍/s);
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制矢量指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查坐标、描边、语义、操作与性能。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第十一节" }), "finish");
  await expect(page.locator(".lesson-eleven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.vectorKeys ?? null);
  await page.reload();
  await directory(10);
  await expect(page.locator(".lesson-eleven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(
    page.getByRole("button", { name: "重置第十一节进度" }),
    "open reset",
  );
  await act(
    page.getByRole("button", { name: "保留第十一节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-eleven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第十一节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第十一节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-eleven .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#vector-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.box).toBe(100);
  expect(reset.saved).toBe(false);
  expect(reset.inspected).toBe(false);
  expect(reset.draft).toBe("");
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.vectorKeys ?? null),
  };
}
const denyClipboard = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });
test("complete keyboard-only vector experiments retry edit refresh and cancel/confirm reset", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const trace = [];
  await page.addInitScript(denyClipboard);
  await page.goto("/");
  async function seek(locator, name) {
    await expect(locator).toBeEnabled();
    for (let n = 0; n < 240; n++) {
      if (await locator.evaluate((e) => e === document.activeElement)) {
        const state = await locator.evaluate((e) => {
          const r = e.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
          return {
            outline: getComputedStyle(e).outlineStyle,
            visible: r.top >= 0 && r.bottom <= innerHeight + 1,
            covered: hit !== e && !e.contains(hit),
          };
        });
        expect(state.outline).not.toBe("none");
        expect(state.visible).toBe(true);
        expect(state.covered).toBe(false);
        trace.push({ name, tabs: n, ...state });
        return;
      }
      await page.keyboard.press("Tab");
    }
    throw Error("Unreachable " + name);
  }
  const act = async (locator, name) => {
      await seek(locator, name);
      await page.keyboard.press("Enter");
      trace.push({ enter: name });
    },
    toggle = async (locator, name) => {
      await seek(locator, name);
      await page.keyboard.press("Space");
      trace.push({ space: name });
    };
  const result = await completeFlow(page, act, toggle, async (draft) => {
    await seek(draft, "edit draft");
    await page.keyboard.press("Control+End");
    await page.keyboard.type("\nReview: preserve text and focus.");
  });
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...result }, null, 2),
  );
});
test("zero-keyboard touch-only vector learning retry refresh cancel and confirm reset", async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    page = await context.newPage(),
    trace = [];
  await page.addInitScript(denyClipboard);
  await page.addInitScript(() => {
    window.vectorKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.vectorKeys.push(e.key));
  });
  await page.goto("/");
  const tap = async (locator, name) => {
    await locator.tap();
    trace.push(name);
  };
  const result = await completeFlow(page, tap, tap);
  expect(result.keysBeforeReload).toEqual([]);
  expect(result.keysAfterReload).toEqual([]);
  expect(result.completed.done.sort()).toEqual([0, 1, 2, 3, 4]);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/touch-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...result }, null, 2),
  );
  await context.close();
});
