import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const key = "frontend-observatory.lesson2.v1";
const firstKey = "frontend-observatory.lesson1.v1";
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
  await course(page, 1);
  await expect(page.locator("#flex-stage-heading")).toBeVisible();
}
async function step(page, n) {
  await page
    .getByRole("navigation", { name: "第二节学习步骤" })
    .getByRole("button")
    .nth(n)
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
async function measure(page) {
  return page.getByTestId("space-demo").evaluate((el) => ({
    width: el.clientWidth,
    overflow: el.scrollWidth > el.clientWidth + 1,
    items: [...el.children].map((n) => n.getBoundingClientRect().width),
  }));
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
async function completeExperiments(page) {
  await choose(page, "flex-direction · 主轴方向", "column · 纵向");
  await choose(page, "gap · 相邻项目间距", "24px");
  await choose(page, "观察例子", "图标与内容卡片");
  await page.getByRole("button", { name: "完成并继续" }).click();
  await page
    .getByLabel("justify-content · 主轴空间分配")
    .selectOption("space-between");
  await page.getByLabel("align-items · 交叉轴对齐").selectOption("center");
  await page.getByRole("button", { name: "完成并继续" }).click();
  await choose(page, "B 的 grow 系数", "2");
  await choose(page, "容器目标宽度", "280px");
  await choose(page, "实验模式 · 固定 row，不换行", "shrink · 分担不足空间");
  await choose(page, "B 的 shrink 系数", "0");
  await page.getByLabel("给 B 换上不易断开的长内容").check();
  await page.getByLabel("允许 B 继续变窄并换行").check();
  await page.getByRole("button", { name: "完成并继续" }).click();
}
test("directory keeps Flex and future responsive lesson while axes and gap change real layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await expect(page).toHaveTitle("Flex——一维排列 · 前端观察室");
  const demo = page.getByTestId("direction-demo");
  await expect(demo).toHaveCSS("flex-direction", "row");
  await expect(demo).toHaveCSS("gap", "16px");
  const row = await demo
    .locator(":scope > span")
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().top));
  expect(new Set(row).size).toBe(1);
  await choose(page, "flex-direction · 主轴方向", "column · 纵向");
  await expect(demo).toHaveCSS("flex-direction", "column");
  await expect(page.locator(".flex-live-reading")).toContainText("主轴纵向");
  const column = await demo
    .locator(":scope > span")
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().top));
  expect(column[1]).toBeGreaterThan(column[0]);
  await choose(page, "gap · 相邻项目间距", "24px");
  await expect(demo).toHaveCSS("gap", "24px");
  await choose(page, "观察例子", "图标与内容卡片");
  await expect(demo.getByText("一页灵感")).toBeVisible();
  await noOverflow(page);
  await course(page, 15);
  await expect(page.getByRole("heading", { name: "State Machine" })).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
  await expect(page.locator(".course-link")).toHaveCount(32);
  expect(errors).toEqual([]);
});
test("justify and align follow direction with real geometry", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  const demo = page.getByTestId("alignment-demo");
  await page
    .getByRole("button", { name: "试试：用户名靠左，设置靠右 ↗" })
    .click();
  await expect(demo).toHaveCSS("justify-content", "space-between");
  await expect(demo).toHaveCSS("align-items", "center");
  const centers = await demo.locator(":scope > *").evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return r.top + r.height / 2;
    }),
  );
  expect(Math.abs(centers[0] - centers[1])).toBeLessThan(1);
  await choose(page, "flex-direction · 主轴方向", "column · 纵向");
  await expect(page.locator(".flex-live-reading")).toContainText(
    "justify-content 影响上下",
  );
  const pos = await demo.locator(":scope > *").evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y };
    }),
  );
  expect(Math.abs(pos[0].x - pos[1].x)).toBeLessThan(1);
  expect(pos[1].y - pos[0].y).toBeGreaterThan(100);
  await choose(page, "flex-direction · 主轴方向", "row · 横向");
  await page.getByLabel("align-items · 交叉轴对齐").selectOption("stretch");
  const heights = await demo
    .locator(":scope > *")
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().height));
  expect(Math.abs(heights[0] - heights[1])).toBeLessThan(1);
  await noOverflow(page);
});
test("grow, shrink, bounded width and long-content repair use measured CSS", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await choose(page, "B 的 grow 系数", "2");
  let m = await measure(page);
  expect(m.items[1]).toBeGreaterThan(m.items[0]);
  await choose(page, "B 的 grow 系数", "0");
  m = await measure(page);
  expect(m.items[1]).toBeCloseTo(80, 0);
  expect(m.items[0]).toBeGreaterThan(m.items[1]);
  await choose(page, "容器目标宽度", "280px");
  await choose(page, "实验模式 · 固定 row，不换行", "shrink · 分担不足空间");
  await choose(page, "B 的 shrink 系数", "0");
  m = await measure(page);
  expect(m.items[1]).toBeCloseTo(160, 0);
  expect(m.items[0]).toBeLessThan(m.items[1]);
  await page.getByLabel("给 B 换上不易断开的长内容").check();
  await expect(page.locator(".overflow-feedback")).toContainText(
    "发现横向溢出",
  );
  m = await measure(page);
  expect(m.overflow).toBe(true);
  await noOverflow(page);
  await page.getByLabel("允许 B 继续变窄并换行").check();
  await expect(page.locator(".overflow-feedback")).toContainText(
    "当前预览无横向溢出",
  );
  m = await measure(page);
  expect(m.overflow).toBe(false);
  await choose(page, "B 的 shrink 系数", "2");
  m = await measure(page);
  expect(m.items[1]).toBeLessThan(m.items[0]);
  await expect(page.getByTestId("item-measure-1")).toContainText(
    `${Math.round(m.items[1] * 10) / 10}px`,
  );
  await choose(page, "容器目标宽度", "560px");
  await choose(page, "容器目标宽度", "280px");
  await choose(page, "容器目标宽度", "280px");
  await noOverflow(page);
});
test("quiz errors retry with reasons; only satisfied tasks are complete", async ({
  page,
}) => {
  await open(page);
  await step(page, 3);
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".notice")).toContainText("先完成");
  const cards = page.locator(".quiz-card");
  await cards.nth(0).getByRole("button").nth(1).click();
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  await expect(cards.nth(0).getByRole("status")).toContainText("主轴");
  for (const [i, answer] of [0, 1, 1].entries())
    await cards.nth(i).getByRole("button").nth(answer).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator("#flex-stage-heading")).toHaveText(
    "把“排整齐”说成可验收的规则",
  );
  await expect(page.locator(".lesson-two .lesson-bottom")).toContainText(
    "1 / 5",
  );
  await course(page, 0);
  await course(page, 1);
  await expect(page.locator("#flex-stage-heading")).toHaveText(
    "把“排整齐”说成可验收的规则",
  );
  await noOverflow(page);
});
test("prompt edit, options, copy success, unavailable and denied fallbacks", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  await page.getByLabel("实现例子").selectOption("card");
  await page.getByRole("button", { name: "生成布局指令" }).click();
  const draft = page.getByLabel("可编辑的 Flex Agent 指令");
  await expect(draft).toHaveValue(/外层 column/);
  await expect(draft).toHaveValue(/近似映射/);
  await expect(draft).toHaveValue(/280px、420px/);
  await page.getByLabel("加入长内容与连续点击验收").uncheck();
  await page.getByRole("button", { name: "重新生成布局草稿" }).click();
  await expect(draft).not.toHaveValue(/连续点击不产生重复副作用/);
  await draft.fill(
    (await draft.inputValue()) + "\n补充：描述为空时仍保留可读结构。",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.flexCopied = text;
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "复制布局指令" })
    .click({ clickCount: 2 });
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.flexCopied)).toContain("描述为空");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    }),
  );
  await page.getByRole("button", { name: "复制布局指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  expect(
    await draft.evaluate((el) => el.selectionEnd - el.selectionStart),
  ).toBe((await draft.inputValue()).length);
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
  await page.getByRole("button", { name: "复制布局指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await page.getByLabel("我已检查主轴、交叉轴、尺寸约束和验收方式。").check();
  await page.getByRole("button", { name: "保存本站成果" }).click();
  await expect(page.locator(".notice")).toContainText("还有 4 站未完成");
  await noOverflow(page);
});
test("first progress survives navigation, reload and independent second reset", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "第一节学习步骤" })
    .getByRole("button")
    .nth(2)
    .click();
  await page.getByLabel("content · 消息内容").fill("保留第一节的实验内容。");
  const first = await page.evaluate((k) => localStorage.getItem(k), firstKey);
  await course(page, 1);
  await choose(page, "flex-direction · 主轴方向", "column · 纵向");
  await step(page, 4);
  await page.getByRole("button", { name: "生成布局指令" }).click();
  const text = await page.getByLabel("可编辑的 Flex Agent 指令").inputValue();
  await page.reload();
  await course(page, 1);
  await expect(page.getByLabel("可编辑的 Flex Agent 指令")).toHaveValue(text);
  await page.getByRole("button", { name: "重置第二节进度" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "保留第二节进度" }).click();
  await expect(page.getByLabel("可编辑的 Flex Agent 指令")).toHaveValue(text);
  await page.getByRole("button", { name: "重置第二节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "重置第二节进度" }).click();
  await page.getByRole("button", { name: "确认重置第二节" }).click();
  await expect(page.locator("#flex-stage-heading")).toHaveText(
    "先找到主轴，方向就清楚了",
  );
  await expect(page.locator(".lesson-two .lesson-bottom")).toContainText(
    "0 / 5",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), firstKey)).toBe(
    first,
  );
  await course(page, 0);
  await expect(page.getByLabel("content · 消息内容")).toHaveValue(
    "保留第一节的实验内容。",
  );
});
test("keyboard, focus, A/AA checks, content sources and no page overflow in all stages", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#flex-stage-heading")).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.activeElement).outlineStyle,
      ),
    ).not.toBe("none");
    await noOverflow(page);
    await axeCheck(page);
  }
  await page.getByText("在 Figma 中怎么表达？", { exact: true }).click();
  await expect(
    page.getByText("这是帮助协作的概念映射，不是 CSS 的一一翻译。", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByText("第二节主题与官方参考", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：flex-shrink" }),
  ).toBeVisible();
  await noOverflow(page);
});
test("corrupt and unavailable storage stays usable", async ({ page }) => {
  await page.addInitScript(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 999,
          done: [null, 4, 4, 8],
          direction: "broken",
          width: -2,
          answers: "wrong",
        }),
      ),
    key,
  );
  await open(page);
  await expect(page.getByTestId("direction-demo")).toHaveCSS(
    "flex-direction",
    "row",
  );
  await expect(page.locator(".lesson-two .lesson-bottom")).toContainText(
    "1 / 5",
  );
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  });
  await page.reload();
  await course(page, 1);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
  await choose(page, "flex-direction · 主轴方向", "column · 纵向");
  await expect(page.getByTestId("direction-demo")).toHaveCSS(
    "flex-direction",
    "column",
  );
});
test("complete all five stations and repeated finish keeps a stable progress count", async ({
  page,
}) => {
  await open(page);
  await completeExperiments(page);
  for (const [i, answer] of [0, 1, 1].entries())
    await page
      .locator(".quiz-card")
      .nth(i)
      .getByRole("button")
      .nth(answer)
      .click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".lesson-two .lesson-bottom")).toContainText(
    "4 / 5",
  );
  await page.getByRole("button", { name: "生成布局指令" }).click();
  await page.getByLabel("我已检查主轴、交叉轴、尺寸约束和验收方式。").check();
  await page
    .getByRole("button", { name: "完成第二节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".notice")).toContainText("第二节已完成");
  await expect(page.locator(".lesson-two .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await course(page, 0);
  await course(page, 1);
  await expect(page.locator(".lesson-two .lesson-bottom")).toContainText(
    "5 / 5",
  );
});
