import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const gridKey = "frontend-observatory.lesson3.v1",
  firstKey = "frontend-observatory.lesson1.v1",
  secondKey = "frontend-observatory.lesson2.v1";
async function course(page, index) {
  if (await page.getByRole("button", { name: "☰ 课程" }).isVisible())
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await page
    .getByRole("navigation", { name: "课程目录" })
    .getByRole("button")
    .nth(index)
    .click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 2);
  await expect(page.locator("#grid-stage-heading")).toBeVisible();
}
async function step(page, index) {
  await page
    .getByRole("navigation", { name: "第三节学习步骤" })
    .getByRole("button")
    .nth(index)
    .click();
}
async function choose(page, label, value) {
  await page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true })
    .click();
}
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function measures(grid) {
  return grid.evaluate((el) => ({
    width: el.clientWidth,
    columns: getComputedStyle(el)
      .gridTemplateColumns.split(" ")
      .map(parseFloat)
      .filter((n) => n > 0.5),
    items: [...el.children].map((n) => n.getBoundingClientRect().width),
  }));
}
async function axeCheck(page) {
  await page.evaluate(axe);
  const result = await page.evaluate(() =>
    axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    }),
  );
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
async function completeExperiments(page) {
  await choose(page, "列数 · grid-template-columns", "2 列");
  await choose(page, "row-gap · 行与行之间", "8px");
  await choose(page, "column-gap · 列与列之间", "24px");
  await choose(page, "第一张 · grid-column", "跨 2 列");
  await choose(page, "第一张 · grid-row", "跨 2 行");
  await page.getByRole("button", { name: "完成并继续" }).click();
  await choose(page, "轨道方案", "1fr + 2fr");
  await choose(page, "轨道方案", "固定侧栏 + 弹性主区");
  await choose(page, "轨道容器目标宽度", "280px");
  await page.getByRole("button", { name: "完成并继续" }).click();
  await choose(page, "卡片排列规则", "auto-fit · 自动列数");
  await choose(page, "卡片容器目标宽度", "280px");
  await choose(page, "卡片首选最小宽度", "200px");
  await page.getByRole("button", { name: "新增卡片", exact: false }).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
}
test("third lesson is Grid, complete route is present, thirty-second remains unbuilt", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await expect(page).toHaveTitle("Grid——二维布局 · 前端观察室");
  await expect(page.locator(".course-link")).toHaveCount(32);
  await expect(page.locator(".nav-caption")).toContainText("31 / 32");
  await course(page, 31);
  await expect(page.getByRole("heading", { name: "Infinite Canvas" })).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
  await expect(page.locator("#grid-stage-heading")).toHaveCount(0);
  await course(page, 31);
  await expect(
    page.getByRole("heading", { name: "Infinite Canvas" }),
  ).toBeVisible();
  await course(page, 2);
  await expect(page.locator("#grid-stage-heading")).toBeFocused();
  await noOverflow(page);
  expect(errors).toEqual([]);
});
test("columns, independent gaps and grid-row/grid-column change real geometry", async ({
  page,
}) => {
  await open(page);
  const grid = page.getByTestId("tracks-grid");
  expect((await measures(grid)).columns).toHaveLength(3);
  await choose(page, "列数 · grid-template-columns", "2 列");
  expect((await measures(grid)).columns).toHaveLength(2);
  await choose(page, "row-gap · 行与行之间", "8px");
  await choose(page, "column-gap · 列与列之间", "24px");
  await expect(grid).toHaveCSS("row-gap", "8px");
  await expect(grid).toHaveCSS("column-gap", "24px");
  await choose(page, "第一张 · grid-column", "跨 2 列");
  await choose(page, "第一张 · grid-row", "跨 2 行");
  await expect(grid.locator("article").first()).toHaveCSS(
    "grid-column-start",
    "span 2",
  );
  await expect(grid.locator("article").first()).toHaveCSS(
    "grid-row-start",
    "span 2",
  );
  const m = await measures(grid);
  expect(m.items[0]).toBeCloseTo(m.width, 0);
  await choose(page, "列数 · grid-template-columns", "1 列");
  await expect(grid.locator("article").first()).toHaveCSS(
    "grid-column-start",
    "span 1",
  );
  expect((await measures(grid)).columns).toHaveLength(1);
  await choose(page, "第一张 · grid-column", "跨 2 列");
  expect((await measures(grid)).columns).toHaveLength(2);
  await noOverflow(page);
});
test("fr ratio excludes gap and fixed sidebar keeps width as main area changes", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  const grid = page.getByTestId("fraction-grid");
  await choose(page, "轨道容器目标宽度", "280px");
  await choose(page, "轨道方案", "1fr + 2fr");
  let m = await measures(grid);
  expect(m.columns[1] / m.columns[0]).toBeCloseTo(2, 2);
  expect(m.columns[0] + m.columns[1] + 16).toBeCloseTo(m.width, 0);
  expect(m.columns[1]).not.toBeCloseTo((m.width * 2) / 3, 0);
  await choose(page, "轨道方案", "固定侧栏 + 弹性主区");
  m = await measures(grid);
  expect(m.items[0]).toBeCloseTo(160, 0);
  expect(m.items[1]).toBeCloseTo(m.width - 160 - 16, 0);
  const narrowMain = m.items[1];
  await choose(page, "轨道容器目标宽度", "620px");
  m = await measures(grid);
  expect(m.items[0]).toBeCloseTo(160, 0);
  expect(m.items[1]).toBeGreaterThan(narrowMain);
  await choose(page, "固定侧栏宽度", "200px");
  m = await measures(grid);
  expect(m.items[0]).toBeCloseTo(200, 0);
  await expect(page.getByTestId("fraction-item-0")).toContainText("200px");
  await noOverflow(page);
});
test("repeat/minmax auto-fit responds to actual width and additions are bounded", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  const grid = page.getByTestId("adaptive-grid");
  await choose(page, "卡片容器目标宽度", "280px");
  expect((await measures(grid)).columns).toHaveLength(3);
  await choose(page, "卡片排列规则", "auto-fit · 自动列数");
  await choose(page, "卡片首选最小宽度", "200px");
  expect((await measures(grid)).columns).toHaveLength(1);
  await choose(page, "卡片容器目标宽度", "620px");
  await choose(page, "卡片首选最小宽度", "120px");
  let m = await measures(grid);
  expect(m.columns.length).toBe(
    Math.min(4, Math.floor((m.width + 16) / (120 + 16))),
  );
  const add = page.getByRole("button", { name: "新增卡片", exact: false });
  while (await add.isEnabled()) await add.click();
  await expect(grid.locator("article")).toHaveCount(8);
  await expect(add).toBeDisabled();
  await page.getByLabel("试试第一张卡片的长内容").check();
  await expect(grid.locator("article").first()).toContainText(
    "UnbreakableGridContentNeedsWrapping",
  );
  m = await measures(grid);
  expect(m.items.every((n) => n > 0)).toBe(true);
  await noOverflow(page);
  await choose(page, "卡片容器目标宽度", "280px");
  await choose(page, "卡片容器目标宽度", "280px");
  await noOverflow(page);
});
test("Flex/Grid choices retry with reasons and task completion is gated", async ({
  page,
}) => {
  await open(page);
  await step(page, 3);
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".notice")).toContainText("先完成");
  const cards = page.locator(".quiz-card");
  await cards.nth(0).getByRole("button").nth(1).click();
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  await expect(cards.nth(0).getByRole("status")).toContainText("Flex");
  for (const [i, v] of [0, 1, 1].entries())
    await cards.nth(i).getByRole("button").nth(v).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".lesson-three .lesson-bottom")).toContainText(
    "1 / 5",
  );
  await expect(page.locator("#grid-stage-heading")).toHaveText(
    "把“卡片排得一样”说具体",
  );
});
test("editable prompt has both scenarios, copy success and explicit failure fallback", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  await page.getByRole("button", { name: "生成 Grid 指令" }).click();
  const draft = page.getByLabel("可编辑的 Grid Agent 指令");
  await expect(draft).toHaveValue(/auto-fit/);
  await expect(draft).toHaveValue(/fr 是可分配空间的份额/);
  await page.getByLabel("实现场景").selectOption("sidebar");
  await page.getByLabel("加入长内容与异常资产验收").uncheck();
  await page.getByRole("button", { name: "重新生成网格草稿" }).click();
  await expect(draft).toHaveValue(/160px minmax/);
  await expect(draft).not.toHaveValue(/图片缺失/);
  await draft.fill(
    (await draft.inputValue()) + "\n补充：所有操作保留明确的键盘焦点。",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.gridCopy = text;
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "复制 Grid 指令" })
    .click({ clickCount: 2 });
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.gridCopy)).toContain("补充");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("denied");
        },
      },
    }),
  );
  await page.getByRole("button", { name: "复制 Grid 指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  expect(
    await draft.evaluate((el) => el.selectionEnd - el.selectionStart),
  ).toBe((await draft.inputValue()).length);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    }),
  );
  await page.getByRole("button", { name: "复制 Grid 指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await page.getByLabel("我已检查行列约束、尺寸边界和验收标准。").check();
  await page.getByRole("button", { name: "保存本站成果" }).click();
  await expect(page.locator(".notice")).toContainText("还有 4 站未完成");
  await noOverflow(page);
});
test("third progress reload/reset preserves both prior lessons and handles late clipboard completion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "第一节学习步骤" })
    .getByRole("button")
    .nth(2)
    .click();
  await page.getByLabel("content · 消息内容").fill("保留前课的消息内容。");
  await course(page, 1);
  await choose(page, "gap · 相邻项目间距", "24px");
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    [firstKey, secondKey],
  );
  await course(page, 2);
  await step(page, 4);
  await page.getByRole("button", { name: "生成 Grid 指令" }).click();
  const value = await page.getByLabel("可编辑的 Grid Agent 指令").inputValue();
  await page.reload();
  await course(page, 2);
  await expect(page.getByLabel("可编辑的 Grid Agent 指令")).toHaveValue(value);
  await page.getByRole("button", { name: "重置第三节进度" }).click();
  await page.getByRole("button", { name: "保留第三节进度" }).click();
  await expect(page.getByLabel("可编辑的 Grid Agent 指令")).toHaveValue(value);
  await page.getByRole("button", { name: "重置第三节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((resolve) => {
            window.resolveGridClipboard = resolve;
          }),
      },
    }),
  );
  await page.getByRole("button", { name: "复制 Grid 指令" }).click();
  await page.getByRole("button", { name: "重置第三节进度" }).click();
  await page.getByRole("button", { name: "确认重置第三节" }).click();
  await page.evaluate(() => window.resolveGridClipboard());
  await expect(page.locator("#grid-stage-heading")).toHaveText(
    "从一条轴，走到行列关系",
  );
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      [firstKey, secondKey],
    ),
  ).toEqual(before);
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 Grid Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});
test("keyboard focus, axe, sources and no page overflow at each station", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#grid-stage-heading")).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.activeElement).outlineStyle,
      ),
    ).not.toBe("none");
    await noOverflow(page);
    await axeCheck(page);
  }
  await page.getByText("第三节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：fr 的份额" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByText("路线核对说明与官方来源", { exact: true }).click();
  await page.getByText("查看完整 32 课目录及覆盖标签", { exact: true }).click();
  await expect(page.locator(".full-course-outline li")).toHaveCount(32);
  await expect(page.locator(".full-course-outline")).toContainText("T12");
  await noOverflow(page);
  await axeCheck(page);
});
test("corrupt storage stays usable and all five real tasks complete without duplicate counts", async ({
  page,
}) => {
  await page.addInitScript(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 9,
          done: [99, null],
          columns: 1,
          columnSpan: 2,
          count: 999,
        }),
      ),
    gridKey,
  );
  await open(page);
  expect(
    (await measures(page.getByTestId("tracks-grid"))).columns,
  ).toHaveLength(1);
  await expect(
    page.getByTestId("tracks-grid").locator("article").first(),
  ).toHaveCSS("grid-column-start", "span 1");
  await completeExperiments(page);
  for (const [i, v] of [0, 1, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".lesson-three .lesson-bottom")).toContainText(
    "4 / 5",
  );
  await page.getByRole("button", { name: "生成 Grid 指令" }).click();
  await page.getByLabel("我已检查行列约束、尺寸边界和验收标准。").check();
  await page
    .getByRole("button", { name: "完成第三节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".notice")).toContainText("第三节已完成");
  await expect(page.locator(".lesson-three .lesson-bottom")).toContainText(
    "5 / 5",
  );
});
test("unavailable storage reports honestly while controls keep working", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await open(page);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
  await choose(page, "列数 · grid-template-columns", "2 列");
  expect(
    (await measures(page.getByTestId("tracks-grid"))).columns,
  ).toHaveLength(2);
});
