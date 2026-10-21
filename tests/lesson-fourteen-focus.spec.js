import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
const out = "/tmp/conditional-focus-acceptance";
const button = (page, name) => page.getByRole("button", { name, exact: true });
async function open(page, station) {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await button(page, "☰ 课程").click();
  await nav.getByRole("button").nth(13).click();
  await expect(page.locator("#conditional-stage-heading")).toBeVisible();
  await page
    .getByRole("navigation", { name: "第十四节学习步骤" })
    .getByRole("button")
    .nth(station)
    .click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}
async function snapshot(page) {
  return page.evaluate(() => {
    const e = document.activeElement,
      r = e.getBoundingClientRect();
    const hit = document.elementFromPoint(
      r.x + r.width / 2,
      r.y + r.height / 2,
    );
    return {
      tag: e.tagName,
      text: e.textContent.trim().slice(0, 150),
      disabled: !!e.disabled,
      ariaDisabled: e.getAttribute("aria-disabled"),
      visible:
        r.width > 0 &&
        r.height > 0 &&
        r.top >= 0 &&
        r.bottom <= innerHeight + 1,
      covered: hit !== e && !e.contains(hit),
      outline: getComputedStyle(e).outlineStyle,
      phase: document.querySelector('[data-testid="upload-branch"]').dataset
        .phase,
    };
  });
}
test("last queued result preserves immediate visible actionable keyboard focus in stations one and three", async ({
  page,
}, info) => {
  const rows = [],
    trace = [];
  const { seek } = createKeyboardNavigator(page, expect, trace, {
    lesson: "lesson-fourteen-delivery-focus",
    profile: info.project.name,
  });
  for (const station of [0, 2])
    for (const outcome of ["成功", "失败"])
      for (const cancelled of [false, true]) {
        await open(page, station);
        await page
          .getByRole("group", { name: "下一次模拟结果", exact: true })
          .getByRole("button", { name: outcome, exact: true })
          .click();
        await button(page, "开始模拟上传").click();
        await button(page, "模拟上传完成").click();
        if (cancelled) await button(page, "取消模拟任务").click();
        const delivery = button(page, "投递最早结果（1）");
        await seek(
          delivery,
          `station ${station + 1} ${outcome} cancelled=${cancelled}`,
        );
        await expect(delivery).toBeFocused();
        await page.keyboard.press("Enter");
        // Observe the committed state without any subsequent Tab or click.
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        rows.push({
          station: station + 1,
          outcome,
          cancelled,
          ...(await snapshot(page)),
        });
      }
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/immediate-${info.project.name}.json`,
    JSON.stringify({ rows, trace }, null, 2),
  );
  for (const row of rows) {
    expect(row.tag, JSON.stringify(row)).toBe("BUTTON");
    expect(row.text, JSON.stringify(row)).toBe("开始模拟上传");
    expect(row.outline, JSON.stringify(row)).not.toBe("none");
    expect(row.phase).toBe(
      row.cancelled ? "empty" : row.outcome === "成功" ? "success" : "failure",
    );
    expect(row.disabled, JSON.stringify(row)).toBe(false);
    expect(row.ariaDisabled, JSON.stringify(row)).not.toBe("true");
    expect(row.visible, JSON.stringify(row)).toBe(true);
    expect(row.covered, JSON.stringify(row)).toBe(false);
  }
});

test("delivery never steals an already external focus and retains its own focus when another item remains", async ({
  page,
}, info) => {
  const rows = [],
    trace = [];
  const { seek } = createKeyboardNavigator(page, expect, trace, {
    lesson: "lesson-fourteen-external-focus",
    profile: info.project.name,
  });
  for (const station of [0, 2])
    for (const outcome of ["成功", "失败"])
      for (const cancelled of [false, true]) {
        await open(page, station);
        await page
          .getByRole("group", { name: "下一次模拟结果", exact: true })
          .getByRole("button", { name: outcome, exact: true })
          .click();
        await button(page, "开始模拟上传").click();
        await button(page, "模拟上传完成").click();
        if (cancelled) await button(page, "取消模拟任务").click();
        const delivery = button(page, "投递最早结果（1）"),
          external = button(page, "完成并继续");
        await seek(
          external,
          `external station ${station + 1} ${outcome} cancelled=${cancelled}`,
        );
        // Native click() activates the delivery without moving the existing focus.
        await delivery.evaluate((e) => e.click());
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        rows.push({
          kind: "external",
          station: station + 1,
          outcome,
          cancelled,
          ...(await snapshot(page)),
        });
        await expect(external).toBeFocused();
      }
  for (const station of [0, 2]) {
    await open(page, station);
    await button(page, "开始模拟上传").click();
    await button(page, "模拟上传完成").click();
    await button(page, "取消模拟任务").click();
    await button(page, "开始模拟上传").click();
    await button(page, "模拟上传完成").click();
    const delivery = button(page, "投递最早结果（2）");
    await seek(delivery, `remaining queue station ${station + 1}`);
    await page.keyboard.press("Enter");
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    rows.push({
      kind: "remaining",
      station: station + 1,
      ...(await snapshot(page)),
    });
    await expect(button(page, "投递最早结果（1）")).toBeFocused();
    await expect(button(page, "投递最早结果（1）")).toBeEnabled();
    await expect(page.getByTestId("upload-branch")).toHaveAttribute(
      "data-phase",
      "processing",
    );
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/external-and-remaining-${info.project.name}.json`,
    JSON.stringify({ rows, trace }, null, 2),
  );
});
