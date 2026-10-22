// All32 numbered lessons plus separate stagesA/B are released. T01/T02 are open; the10 other tool
// coverage modules are read-only plans, never a fabricated33rd course.
export async function assertRemainingPlans32(page, expect) {
  await expect(
    page.getByRole("navigation", { name: "第三十二节学习步骤" }),
  ).toBeVisible();
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator(".coming-status")).toHaveCount(0);
  await expect(page.locator(".site-footer")).toContainText("01–32 · 32 / 32");
  await expect(page.locator(".site-footer")).toContainText(
    "综合A/B已开放，T01/T02/T03/T04已开放；T05–T12尚未制作",
  );
  const summary = page.getByText("路线核对说明与官方来源", { exact: true });
  if (!(await summary.evaluate((e) => e.closest("details").open)))
    await summary.click();
  const outline = page.locator(".full-course-outline");
  if (!(await outline.evaluate((e) => e.open)))
    await page
      .getByText("查看完整 32 课目录及覆盖标签", { exact: true })
      .click();
  await expect(outline.locator(":scope > ol > li")).toHaveCount(32);
  await expect(outline.locator('[data-lesson-id="32"] > span')).toHaveText(
    "已制作",
  );
  await expect(outline.locator("[data-coverage-id]")).toHaveCount(14);
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
  await expect(outline.locator('[data-coverage-id="T02"]')).toContainText("已制作");
  await expect(outline.locator('[data-coverage-id="T02"] button')).toHaveCount(1);
  await expect(outline.locator('[data-coverage-id="T03"]')).toContainText("已制作");
  await expect(outline.locator('[data-coverage-id="T03"] button')).toHaveCount(1);
  await expect(outline.locator('[data-coverage-id="T04"]')).toContainText("已制作");
  await expect(outline.locator('[data-coverage-id="T04"] button')).toHaveCount(1);
  for (const id of [
    ...Array.from(
      { length: 8 },
      (_, i) => "T" + String(i + 5).padStart(2, "0"),
    ),
  ]) {
    const tag = outline.locator(`[data-coverage-id="${id}"]`);
    await expect(tag).toContainText("尚未制作");
    await expect(tag.locator('a,button,[role="button"]')).toHaveCount(0);
  }
  await expect(outline).toContainText("不代表全课程结束");
}
