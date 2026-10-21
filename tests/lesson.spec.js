import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
async function step(page, n) {
  await page
    .getByRole("navigation", { name: "第一节学习步骤" })
    .getByRole("button")
    .nth(n)
    .click();
}
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function axeCheck(page) {
  await page.evaluate(axe);
  const result = await page.evaluate(() =>
    window.axe.run(document, {
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
test("actual UI and trees select in both directions, distinct DOM tree", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle("页面不是一张图 · 前端观察室");
  await page.getByRole("button", { name: "选择 Sidebar", exact: true }).click();
  await expect(page.locator('[data-owner="Sidebar"]')).toHaveAttribute(
    "data-highlight",
    "component",
  );
  await expect(page.locator(".tree-node.active")).toHaveText("Sidebar");
  await page
    .locator(".tree-node")
    .filter({ hasText: /^Composer$/ })
    .click();
  await expect(
    page.getByRole("button", { name: "选择 Composer", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "选择 Message 2", exact: true })
    .click();
  const componentCount = await page.locator(".tree-node").count();
  await page.getByRole("button", { name: "DOM 树", exact: true }).click();
  expect(await page.locator(".tree-node").count()).toBeGreaterThan(
    componentCount,
  );
  await expect(
    page.locator(".tree-node").filter({ hasText: "<article>" }),
  ).toHaveCount(2);
  await page.locator(".tree-node").filter({ hasText: "<p>" }).last().click();
  await expect(page.locator('[data-owner="Message 2"] p')).toHaveAttribute(
    "data-highlight",
    "dom",
  );
  await page.locator('[data-owner="Message 1"] p').click();
  await expect(page.locator('[data-owner="Message 1"] p')).toHaveAttribute(
    "data-highlight",
    "dom",
  );
  await noOverflow(page);
  expect(errors).toEqual([]);
});
test("reuse, all props and boundaries work, safe empty and text content", async ({
  page,
}) => {
  await page.goto("/");
  await step(page, 1);
  await page
    .getByRole("button", { name: "新增 Message", exact: false })
    .click();
  await expect(page.locator(".message")).toHaveCount(3);
  await expect(
    page.locator(".tree-node").filter({ hasText: /^Message ·/ }),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "28px", exact: true }).click();
  expect(
    await page
      .locator(".message-body")
      .evaluateAll((nodes) =>
        nodes.map((n) => getComputedStyle(n).borderTopLeftRadius),
      ),
  ).toEqual(["28px", "28px", "28px"]);
  await page
    .getByRole("button", { name: "新增 Message", exact: false })
    .click({ clickCount: 5 });
  const count = await page.locator(".message").count();
  expect(count).toBeLessThanOrEqual(6);
  expect(count).toBeGreaterThan(3);
  while (
    await page
      .getByRole("button", { name: "新增 Message", exact: false })
      .isEnabled()
  )
    await page
      .getByRole("button", { name: "新增 Message", exact: false })
      .click();
  await expect(page.locator(".message")).toHaveCount(6);
  await step(page, 2);
  await page.getByLabel("role · 谁发的").selectOption("user");
  await page.getByLabel("status · 当前状态").selectOption("error");
  await page.getByLabel("content · 消息内容").fill("<script>alert(1)</script>");
  await expect(page.locator('[data-owner="Message 2"]')).toHaveClass(
    /role-user/,
  );
  await expect(
    page.locator('[data-owner="Message 2"] .message-status'),
  ).toHaveText("! 发送失败 · 请重试");
  await expect(page.locator('[data-owner="Message 2"] p')).toHaveText(
    "<script>alert(1)</script>",
  );
  await expect(page.locator('[data-owner="Message 1"]')).toHaveClass(
    /role-user/,
  );
  await page.getByLabel("status · 当前状态").selectOption("sending");
  await expect(
    page.locator('[data-owner="Message 2"] .message-status'),
  ).toHaveText("◌ 发送中…");
  await page.getByLabel("content · 消息内容").fill("");
  await expect(page.locator('[data-owner="Message 2"] p')).toHaveText(
    "（内容为空）",
  );
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator("#stage-heading")).toHaveText(
    "你能从界面推断什么？",
  );
  await noOverflow(page);
});
test("quiz retries, reasons, progress persists; reset cancel/escape/confirm", async ({
  page,
}) => {
  await page.goto("/");
  await step(page, 3);
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.getByRole("status").last()).toContainText("先完成");
  const cards = page.locator(".quiz-card");
  await cards.nth(0).getByRole("button").nth(1).click();
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  await cards.nth(0).getByRole("button").nth(0).click();
  await expect(cards.nth(0).getByRole("status")).toContainText("判断正确");
  await cards.nth(1).getByRole("button").nth(1).click();
  await cards.nth(2).getByRole("button").nth(1).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator("#stage-heading")).toHaveText(
    "把观察变成一条好指令",
  );
  await page.reload();
  await expect(page.locator("#stage-heading")).toHaveText(
    "把观察变成一条好指令",
  );
  await page.getByRole("button", { name: "重置本地进度" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "保留进度" }).click();
  await expect(page.locator("#stage-heading")).toHaveText(
    "把观察变成一条好指令",
  );
  await page.getByRole("button", { name: "重置本地进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "重置本地进度" }).click();
  await page.getByRole("button", { name: "确认重置" }).click();
  await expect(page.locator("#stage-heading")).toHaveText("先看职责，再看关系");
  await expect(page.locator(".lesson-bottom")).toContainText("0 / 5");
  await step(page, 3);
  await expect(page.locator(".quiz-feedback")).toHaveCount(0);
});
test("editable agent prompt, successful copy and explicit failure fallback", async ({
  page,
}) => {
  await page.goto("/");
  await step(page, 4);
  await page.getByRole("button", { name: "生成 Agent 指令" }).click();
  const draft = page.getByLabel("可编辑的 Agent 指令");
  await expect(draft).toHaveValue(/375px/);
  await expect(draft).toHaveValue(/避免重复提交/);
  await page.getByLabel("加入手机与桌面验收").uncheck();
  await page.getByRole("button", { name: "重新生成草稿" }).click();
  await expect(draft).toHaveValue(/目标桌面宽度/);
  await draft.fill((await draft.inputValue()) + "\n追加：初始标题为“留白”。");
  await page.evaluate(() => {
    window.copiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedText = text;
        },
      },
    });
  });
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.copiedText)).toContain("初始标题为");
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
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  expect(
    await draft.evaluate((el) => el.selectionEnd - el.selectionStart),
  ).toBe((await draft.inputValue()).length);
  await page
    .getByLabel("我已检查结构、交互和验收标准，能据此判断结果。")
    .check();
  await page.getByRole("button", { name: "保存本站成果" }).click();
  await expect(page.locator(".notice")).toContainText("还有 4 站未完成");
  await noOverflow(page);
  await axeCheck(page);
});
test("keyboard, visible focus, directory and accessibility at every stage", async ({
  page,
}, info) => {
  await page.goto("/");
  // React can commit after the document load event; wait for the actual UI.
  await expect(page.locator("#stage-heading")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到课程内容" })).toBeFocused();
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#stage-heading")).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.activeElement).outlineStyle,
      ),
    ).not.toBe("none");
    await noOverflow(page);
    await axeCheck(page);
  }
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await page
    .getByRole("navigation", { name: "课程目录" })
    .getByRole("button")
    .nth(12)
    .click();
  await expect(page.getByRole("heading", { name: "Props与Variant" })).toBeVisible();
  await expect(page.locator(".coming-status")).toBeVisible();
  await page.getByRole("button", { name: "返回第一节" }).click();
  await expect(page.locator("#stage-heading")).toHaveText(
    "把观察变成一条好指令",
  );
  await page.getByText("路线核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：滚动驱动动画" }),
  ).toBeVisible();
  await noOverflow(page);
});
test("corrupt or unavailable browser storage does not break the lesson", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "frontend-observatory.lesson1.v1",
      '{"step":99,"done":[null,9],"count":999,"answers":"broken"}',
    );
  });
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toHaveText("先看职责，再看关系");
  await expect(page.locator(".message")).toHaveCount(2);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
  await page.getByRole("button", { name: "选择 Sidebar", exact: true }).click();
  await expect(page.locator('[data-owner="Sidebar"]')).toHaveAttribute(
    "data-highlight",
    "component",
  );
});

test("five real tasks complete the lesson without skipping prerequisites", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "选择 Sidebar", exact: true }).click();
  await page
    .getByRole("button", { name: "选择 Message 2", exact: true })
    .click();
  await page.getByRole("button", { name: "DOM 树", exact: true }).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator("#stage-heading")).toHaveText(
    "一套组件，可以出现很多次",
  );
  await page
    .getByRole("button", { name: "新增 Message", exact: false })
    .click();
  await page.getByRole("button", { name: "4px", exact: true }).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await page.getByLabel("role · 谁发的").selectOption("user");
  await page.getByLabel("status · 当前状态").selectOption("error");
  await page.getByLabel("content · 消息内容").fill("每个实例拥有独立内容。");
  await page.getByRole("button", { name: "完成并继续" }).click();
  for (const [i, answer] of [0, 1, 1].entries())
    await page
      .locator(".quiz-card")
      .nth(i)
      .getByRole("button")
      .nth(answer)
      .click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".lesson-bottom")).toContainText("4 / 5");
  await page.getByRole("button", { name: "生成 Agent 指令" }).click();
  await page
    .getByLabel("我已检查结构、交互和验收标准，能据此判断结果。")
    .check();
  await page
    .getByRole("button", { name: "完成第一节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".notice")).toContainText("第一节已完成");
  await expect(page.locator(".lesson-bottom")).toContainText("5 / 5");
  await page.reload();
  await expect(page.locator(".lesson-bottom")).toContainText("5 / 5");
});
