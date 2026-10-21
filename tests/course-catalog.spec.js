import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const summary = "目前 01–18 课可以学习。其余保留目录，按节逐步制作。";
const chapterNames = [
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
  "第十二节学习步骤",
  "第十三节学习步骤",
  "第十四节学习步骤",
  "第十五节学习步骤",
  "第十六节学习步骤",
  "第十七节学习步骤",
  "第十八节学习步骤",
];
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" }),
    menu = page.getByRole("button", { name: "☰ 课程" });
  if (!(await nav.isVisible())) await menu.click();
  await nav.getByRole("button").nth(n).click();
}
async function expand(page) {
  await page.getByText("路线核对说明与官方来源", { exact: true }).click();
  await page.getByText("查看完整 32 课目录及覆盖标签", { exact: true }).click();
  return page.locator(".full-course-outline");
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
test("all eighteen implemented views, side directory, complete roadmap and footers agree on availability", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  const links = nav.getByRole("button");
  await expect(links).toHaveCount(32);
  await expect(page.locator(".nav-caption")).toContainText("18 / 32");
  for (let n = 0; n < 32; n++) {
    await expect(links.nth(n).locator(".available-dot")).toHaveCount(
      n < 18 ? 1 : 0,
    );
    if (n >= 18)
      await expect(links.nth(n).locator("small")).toHaveText("尚未制作");
    else await expect(links.nth(n).locator("small")).not.toHaveText("尚未制作");
  }
  for (let n = 0; n < 18; n++) {
    await course(page, n);
    await expect(
      page.getByRole("navigation", { name: chapterNames[n] }),
    ).toBeVisible();
    await expect(page.locator(".coming-status")).toHaveCount(0);
    await expect(page.locator(".site-footer")).toContainText(
      "可学习课程 01–18 · 18 / 32",
    );
    await expect(page.locator(".site-footer")).toContainText(
      n === 17
        ? "本节：React presence"
        : n === 16
          ? "本节：原生 CSS transition"
          : n === 15
            ? "本节：React + 普通转换表"
            : n === 14
              ? "本节：React State + 原生 CSS"
              : n === 13
                ? "本节：React 条件渲染"
                : n === 12
                  ? "本节：React Props"
                  : n === 11
                    ? "本节：React State"
                    : n === 10
                      ? "本节：React + 内联 SVG"
                      : "本节：React + 原生 CSS",
    );
    const outline = await expand(page);
    await expect(outline.locator(":scope > ol > li")).toHaveCount(32);
    await expect(
      page.locator(".roadmap-body").filter({ has: outline }),
    ).toContainText(summary);
    for (let i = 0; i < 32; i++)
      await expect(
        outline.locator(
          `[data-lesson-id="${String(i + 1).padStart(2, "0")}"] > span`,
        ),
      ).toHaveText(i < 18 ? "已制作" : "尚未制作");
  }
  await axeCheck(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("every unimplemented numbered course stays a preview with the same availability copy", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  for (let n = 18; n < 32; n++) {
    await course(page, n);
    await expect(page.locator(".coming-status")).toHaveText("尚未制作");
    await expect(page.locator(".stepper")).toHaveCount(0);
    await expect(page.locator(".coming-soon > .micro")).toHaveText(summary);
    await expect(page.locator(".site-footer")).toContainText(
      "目录预览 · 尚未制作",
    );
    await expect(page.locator(".site-footer")).not.toContainText("本节：");
    await expect(page.locator(".site-footer")).toContainText(
      "可学习课程 01–18 · 18 / 32",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expand(page);
  await axeCheck(page);
});
test("A, B and all twelve tool tags remain unmade plans without learning links", async ({
  page,
}) => {
  await page.goto("/");
  await course(page, 4);
  const outline = await expand(page),
    tags = outline.locator("[data-coverage-id]");
  await expect(tags).toHaveCount(14);
  for (const id of [
    "A",
    "B",
    ...Array.from(
      { length: 12 },
      (_, i) => "T" + String(i + 1).padStart(2, "0"),
    ),
  ]) {
    const tag = outline.locator(`[data-coverage-id="${id}"]`);
    await expect(tag).toContainText("尚未制作");
    await expect(tag.locator('a,button,[role="button"]')).toHaveCount(0);
  }
  await expect(outline).toContainText("尚未作为独立模块制作");
  await axeCheck(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
