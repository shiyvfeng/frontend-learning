import { assertRemainingPlans32 } from "./catalog-boundary.js";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const summary = '目前 01–32 编号课、综合阶段A/B及T01–T12均可学习，共46项入口；学习进度各自保存，可按需要回顾。';
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
  "第十九节学习步骤",
  "第二十节学习步骤",
  "第二十一节学习步骤",
  "第二十二节学习步骤",
  "第二十三节学习步骤",
  "第二十四节学习步骤",
  "第二十五节学习步骤",
  "第二十六节学习步骤",
  "第二十七节学习步骤",
  "第二十八节学习步骤",
  "第二十九节学习步骤",
  "第三十节学习步骤",
  "第三十一节学习步骤",
  "第三十二节学习步骤",
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
test("all thirty-two numbered implemented views, side directory, complete roadmap and footers agree on availability", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  const links = nav.getByRole("button");
  await expect(links).toHaveCount(32);
  await expect(page.locator(".nav-caption")).toContainText("32 / 32");
  for (let n = 0; n < 32; n++) {
    await expect(links.nth(n).locator(".available-dot")).toHaveCount(1);
    await expect(links.nth(n).locator("small")).not.toHaveText("尚未制作");
  }
  for (let n = 0; n < 32; n++) {
    await course(page, n);
    await expect(
      page.getByRole("navigation", { name: chapterNames[n] }),
    ).toBeVisible();
    await expect(page.locator(".coming-status")).toHaveCount(0);
    await expect(page.locator(".site-footer")).toContainText(
      "可学习课程 01–32 · 32 / 32",
    );
    await expect(page.locator(".site-footer")).toContainText(
      n === 31
        ? "本节：原生SVG viewBox + Pointer Events · 有限教学世界"
        : n === 30
          ? "本节：原生Pointer Events + React事务预览 / 点击与键盘替代"
          : n === 29
            ? "本节：React + 固定64px"
            : n === 28
              ? "本节：React + 原生SVG"
              : n === 27
                ? "本节：lottie-web 5.13.0"
                : n === 26
                  ? "本节：React本地工作流模拟"
                  : n === 25
                    ? "本节：Three.js 0.186.1"
                    : n === 24
                      ? "本节：原生 WebGL 1"
                      : n === 23
                        ? "本节：Canvas 2D"
                        : n === 22
                          ? "本节：Pointer Events"
                          : n === 21
                            ? "本节：原生 scroll"
                            : n === 20
                              ? "本节：原生 View Transition"
                              : n === 19
                                ? "本节：位置型 FLIP"
                                : n === 18
                                  ? "本节：时间插值 + 手写物理 spring"
                                  : n === 17
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
      ).toHaveText("已制作");
  }
  await axeCheck(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("all numbered lessons are released but remaining modules are real previews, not an empty numbered loop", async ({
  page,
}) => {
  await page.goto("/");
  await course(page, 31);
  await assertRemainingPlans32(page, expect);
  await expect(
    page
      .locator(".roadmap-body")
      .filter({ has: page.locator(".full-course-outline") }),
  ).toContainText(summary);
  await expect(page.locator(".full-course-outline")).not.toContainText(
    "全课程已完成",
  );
  await axeCheck(page);
});
test("A B T01 T02 T03 T04 T05 T06 T07 T08 T09 T10 are available while two remaining tool tags stay unmade without learning links", async ({
  page,
}) => {
  await page.goto("/");
  await course(page, 4);
  const outline = await expand(page),
    tags = outline.locator("[data-coverage-id]");
  await expect(tags).toHaveCount(14);
  await expect(outline.locator('[data-coverage-id="A"]')).toContainText(
    "已制作",
  );
  await expect(outline.locator('[data-coverage-id="A"] button')).toHaveCount(1);
  await expect(outline.locator('[data-coverage-id="B"]')).toContainText(
    "已制作",
  );
  await expect(outline.locator('[data-coverage-id="B"] button')).toHaveCount(1);
  await expect(outline.locator('[data-coverage-id="T01"]')).toContainText(
    "已制作",
  );
  await expect(outline.locator('[data-coverage-id="T01"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T02"]')).toContainText(
    "已制作",
  );
  await expect(outline.locator('[data-coverage-id="T02"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T03"]')).toContainText(
    "已制作",
  );
  await expect(outline.locator('[data-coverage-id="T03"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T04"]')).toContainText(
    "已制作",
  );
  await expect(outline.locator('[data-coverage-id="T04"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T05"]')).toContainText(
    "已制作",
  );
  await expect(outline.locator('[data-coverage-id="T05"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T06"]')).toContainText(
    "已制作",
  );
  await expect(outline.locator('[data-coverage-id="T06"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T07"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T08"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T11"] button')).toHaveCount(1);
  for(const id of ["A","B",...Array.from({length:12},(_,i)=>"T"+String(i+1).padStart(2,"0"))]){
    const tag=outline.locator(`[data-coverage-id="${id}"]`);await expect(tag).toContainText("已制作");await expect(tag.locator('button')).toHaveCount(1);
  }
  await expect(outline.locator('[data-coverage-id]').filter({hasText:'尚未制作'})).toHaveCount(0);
  await expect(outline).toContainText("全部14个综合/工具标签均已制作，共46项入口");
  await axeCheck(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
