// All numbered lessons are released. Remaining plans are read-only coverage
// modules, not a fabricated 33rd numbered course or an empty preview loop.
export async function assertRemainingPlans32(page, expect) {
  await expect(
    page.getByRole("navigation", { name: "第三十二节学习步骤" }),
  ).toBeVisible();
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator(".coming-status")).toHaveCount(0);
  await expect(page.locator(".site-footer")).toContainText("01–32 · 32 / 32");
  await expect(page.locator(".site-footer")).toContainText(
    "A/B与T01–T12尚未制作",
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
  await expect(outline).toContainText("不代表全课程结束");
}
