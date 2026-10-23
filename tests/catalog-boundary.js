// All32 numbered lessons, stagesA/B and T01–T12 are open, exactly46 entries.
// No remaining previews and no fabricated33rd numbered lesson.
export async function assertRemainingPlans32(page, expect) {
  await expect(
    page.getByRole("navigation", { name: "第三十二节学习步骤" }),
  ).toBeVisible();
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator(".coming-status")).toHaveCount(0);
  await expect(page.locator(".site-footer")).toContainText("01–32 · 32 / 32");
  await expect(page.locator(".site-footer")).toContainText(
    "综合A/B与T01–T12全部开放，共46项入口",
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
  await expect(outline.locator('[data-coverage-id="T09"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T10"] button')).toHaveCount(
    1,
  );
  await expect(outline.locator('[data-coverage-id="T11"] button')).toHaveCount(1);
  for(const id of ["A","B",...Array.from({length:12},(_,i)=>"T"+String(i+1).padStart(2,"0"))]){
    const tag=outline.locator(`[data-coverage-id="${id}"]`);await expect(tag).toContainText("已制作");await expect(tag.locator('button')).toHaveCount(1);
  }
  await expect(outline.locator('[data-coverage-id]').filter({hasText:'尚未制作'})).toHaveCount(0);
  await expect(outline).toContainText("目录制作齐备不等于学习进度全部通过");
}
