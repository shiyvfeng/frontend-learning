import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const key = "frontend-observatory.lesson4.v1";
const priorKeys = [1, 2, 3].map((n) => `frontend-observatory.lesson${n}.v1`);
async function course(page, index) {
  const menu = page.getByRole("button", { name: "☰ 课程" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "课程目录" })
    .getByRole("button")
    .nth(index)
    .click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 3);
  await expect(page.locator("#position-stage-heading")).toBeVisible();
}
async function step(page, n) {
  await page
    .getByRole("navigation", { name: "第四节学习步骤" })
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
async function badgeGeometry(page) {
  return page.evaluate(() => {
    const r = (n) =>
      document.querySelector(`[data-testid="${n}"]`).getBoundingClientRect();
    const b = r("position-badge"),
      c = r("position-card"),
      o = r("position-board"),
      p = r("position-body");
    return {
      body: p.top - c.top,
      badgeCard: b.top - c.top,
      badgeBoard: b.top - o.top,
    };
  });
}
async function hitLayer(page) {
  await page.getByTestId("stack-stage").scrollIntoViewIfNeeded();
  return page.getByTestId("context-child").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return document
      .elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      ?.closest("[data-layer]")?.dataset.layer;
  });
}
async function completeFirstThree(page) {
  await choose(page, "角标的 position", "relative · 留住位置");
  await choose(page, "角标的 position", "absolute · 脱离流");
  await choose(page, "偏移距离", "24px");
  await choose(page, "absolute 的定位参照", "卡片 static → 画布");
  await page.getByRole("button", { name: "完成并继续" }).click();
  for (const mode of ["sticky · 区段内吸顶", "fixed · 实验视口固定"]) {
    await choose(page, "标题栏的定位方式", mode);
    await page.getByRole("button", { name: "680px · 区段之后" }).click();
  }
  await page.getByRole("button", { name: "完成并继续" }).click();
  await choose(page, "A 内子元素的 z-index", "999");
  await choose(page, "父上下文 A 的 z-index", "3 · 高于 B");
  await page.getByRole("button", { name: "打开原生模态对话框" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "打开原生模态对话框" }).click();
  await page.getByRole("button", { name: "关闭并返回" }).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
}
test("fourth lesson is available, fifth remains unbuilt and route count stays 32", async ({
  page,
}) => {
  await open(page);
  await expect(page).toHaveTitle("Position与浮层 · 前端观察室");
  await expect(page.locator(".nav-caption")).toContainText("04 / 32");
  await expect(page.locator(".course-link")).toHaveCount(32);
  await course(page, 4);
  await expect(
    page.getByRole("heading", { name: "Sizing与Overflow" }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
  await noOverflow(page);
});
test("relative preserves flow, absolute removes space and containing block changes", async ({
  page,
}) => {
  await open(page);
  const normal = await badgeGeometry(page);
  await choose(page, "角标的 position", "relative · 留住位置");
  await choose(page, "偏移距离", "24px");
  const relative = await badgeGeometry(page);
  expect(relative.body).toBeCloseTo(normal.body, 0);
  expect(relative.badgeCard).toBeGreaterThan(normal.badgeCard + 20);
  await choose(page, "角标的 position", "absolute · 脱离流");
  const absolute = await badgeGeometry(page);
  expect(absolute.body).toBeLessThan(normal.body - 30);
  expect(absolute.badgeCard).toBeCloseTo(25, 0);
  await choose(page, "absolute 的定位参照", "卡片 static → 画布");
  const board = await badgeGeometry(page);
  expect(board.badgeBoard).toBeCloseTo(24, 0);
  expect(board.badgeCard).not.toBeCloseTo(absolute.badgeCard, 0);
  await expect(page.getByTestId("position-card")).toHaveCSS(
    "position",
    "static",
  );
  await noOverflow(page);
});
test("sticky releases at section boundary while fixed stays in iframe viewport", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  const frame = page.frameLocator('iframe[title="定位方式滚动实验"]');
  await choose(page, "标题栏的定位方式", "sticky · 区段内吸顶");
  await expect(frame.locator("[data-bar]")).toContainText("sticky");
  await page.getByRole("button", { name: "0px", exact: true }).click();
  await expect(page.getByTestId("scroll-top")).toHaveText("100px");
  await page.getByRole("button", { name: "220px", exact: true }).click();
  await expect(page.getByTestId("scroll-top")).toHaveText("0px");
  await page.getByRole("button", { name: "680px · 区段之后" }).click();
  await expect(page.getByTestId("scroll-y")).toHaveText("680px");
  await expect
    .poll(async () =>
      Number(
        (await page.getByTestId("scroll-top").innerText()).replace("px", ""),
      ),
    )
    .toBeLessThan(0);
  await choose(page, "标题栏的定位方式", "fixed · 实验视口固定");
  await expect(frame.locator("[data-bar]")).toContainText("fixed");
  for (const name of ["0px", "220px", "680px · 区段之后"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByTestId("scroll-top")).toHaveText("0px");
  }
  await choose(page, "标题栏的定位方式", "static · 随流滚走");
  await page.getByRole("button", { name: "220px", exact: true }).click();
  await expect(page.getByTestId("scroll-top")).toHaveText("-120px");
  await noOverflow(page);
});
test("child z-index cannot escape its parent stacking context", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await choose(page, "A 内子元素的 z-index", "999");
  expect(await hitLayer(page)).toBe("B");
  await choose(page, "父上下文 A 的 z-index", "3 · 高于 B");
  expect(await hitLayer(page)).toBe("child");
  await choose(page, "父上下文 A 的 z-index", "1 · 低于 B");
  expect(await hitLayer(page)).toBe("B");
  await noOverflow(page);
});
test("native modal supports repeated open, Tab cycles, Escape/button close and focus return", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await step(page, 2);
  const trigger = page.getByRole("button", { name: "打开原生模态对话框" }),
    dialog = page.locator(".position-demo-dialog"),
    close = page.getByRole("button", { name: "关闭并返回" });
  for (let i = 0; i < 3; i++) {
    await trigger.click();
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("link")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("link")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await axeCheck(page);
    if (i % 2 === 0) await page.keyboard.press("Escape");
    else await close.click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await trigger.click({ clickCount: 2 });
  await close.click({ clickCount: 2 });
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
  await noOverflow(page);
});
test("unsupported/open failure is truthful and the same trigger can retry", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  const trigger = page.getByRole("button", { name: "打开原生模态对话框" }),
    dialog = page.locator(".position-demo-dialog");
  await dialog.evaluate((el) => {
    el.showModal = undefined;
  });
  await trigger.click();
  await expect(page.locator(".position-demo-status")).toContainText("不支持");
  await expect(dialog).not.toBeVisible();
  await dialog.evaluate((el) => {
    el.showModal = () => {
      throw Error("test open failure");
    };
  });
  await trigger.click();
  await expect(page.locator(".position-demo-status")).toContainText("重试");
  await expect(dialog).not.toBeVisible();
  await dialog.evaluate((el) => {
    delete el.showModal;
  });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
test("quiz retries with explanations and completion remains gated", async ({
  page,
}) => {
  await open(page);
  await step(page, 3);
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".notice")).toContainText("先完成");
  const cards = page.locator(".quiz-card");
  await cards.nth(0).getByRole("button").nth(1).click();
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [0, 1, 1].entries())
    await cards.nth(i).getByRole("button").nth(v).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("three prompt variants, editing and clipboard fallbacks work", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 Position Agent 指令");
  await page.getByRole("button", { name: "生成定位指令" }).click();
  await expect(draft).toHaveValue(/角标/);
  for (const [value, match] of [
    ["sticky", /sticky/],
    ["dialog", /showModal/],
  ]) {
    await page.getByLabel("实现场景").selectOption(value);
    await page.getByRole("button", { name: "重新生成定位草稿" }).click();
    await expect(draft).toHaveValue(match);
  }
  await draft.fill(
    (await draft.inputValue()) + "\nReview: test keyboard focus.",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text) => (window.positionCopied = text) },
    }),
  );
  await page.getByRole("button", { name: "复制定位指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.positionCopied)).toContain("Review:");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    }),
  );
  await page.getByRole("button", { name: "复制定位指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  expect(
    await draft.evaluate((el) => el.selectionEnd - el.selectionStart),
  ).toBe((await draft.inputValue()).length);
  await noOverflow(page);
});
test("fourth progress reload/reset preserves all three prior stores", async ({
  page,
}) => {
  await page.goto("/");
  await course(page, 1);
  await course(page, 2);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await course(page, 3);
  await choose(page, "角标的 position", "relative · 留住位置");
  await step(page, 4);
  await page.getByRole("button", { name: "生成定位指令" }).click();
  const draft = await page
    .getByLabel("可编辑的 Position Agent 指令")
    .inputValue();
  await page.reload();
  await course(page, 3);
  await expect(page.getByLabel("可编辑的 Position Agent 指令")).toHaveValue(
    draft,
  );
  await page.getByRole("button", { name: "重置第四节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "重置第四节进度" }).click();
  await page.getByRole("button", { name: "确认重置第四节" }).click();
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "0 / 5",
  );
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  await expect(page.locator("#position-stage-heading")).toBeFocused();
});
test("each station is keyboard reachable, accessible and within desktop/mobile width", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#position-stage-heading")).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.activeElement).outlineStyle,
      ),
    ).not.toBe("none");
    await noOverflow(page);
    await axeCheck(page);
  }
  await page.getByText("第四节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：定位包含块" }),
  ).toBeVisible();
  await axeCheck(page);
  await noOverflow(page);
});
test("corrupt/unavailable storage remains usable and all tasks complete once", async ({
  page,
}) => {
  await page.addInitScript(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          done: [null, 8],
          mode: "bad",
          offset: 999,
          answers: "wrong",
        }),
      ),
    key,
  );
  await open(page);
  await expect(page.getByTestId("position-badge")).toHaveCSS(
    "position",
    "static",
  );
  await completeFirstThree(page);
  for (const [i, v] of [0, 1, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "4 / 5",
  );
  await page.getByRole("button", { name: "生成定位指令" }).click();
  await page.getByLabel("我已检查定位参照、关闭路径、焦点和验收方式。").check();
  await page
    .getByRole("button", { name: "完成第四节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".notice")).toContainText("第四节已完成");
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 3);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("full keyboard-only experiment, retry, native overlay and reset flow", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const trace = [];
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("denied");
        },
      },
    }),
  );
  await page.goto("/");
  async function seek(locator, name, backward = false) {
    await expect(locator).toBeEnabled();
    for (let n = 0; n < 240; n++) {
      if (await locator.evaluate((el) => el === document.activeElement)) {
        const state = await locator.evaluate((el) => {
          const r = el.getBoundingClientRect(),
            css = getComputedStyle(el),
            at = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
          return {
            outline: css.outlineStyle,
            visible: r.top >= 0 && r.bottom <= innerHeight + 1,
            covered: at !== el && !el.contains(at),
          };
        });
        expect(state.outline).not.toBe("none");
        expect(state.visible).toBe(true);
        expect(state.covered).toBe(false);
        trace.push({ name, tabs: n, backward, ...state });
        return;
      }
      await page.keyboard.press(backward ? "Shift+Tab" : "Tab");
    }
    throw Error("Unreachable by keyboard: " + name);
  }
  async function activate(locator, name, backward = false) {
    await seek(locator, name, backward);
    await page.keyboard.press("Enter");
    trace.push({ enter: name });
  }
  async function choice(label, value) {
    await activate(
      page
        .getByRole("group", { name: label, exact: true })
        .getByRole("button", { name: value, exact: true }),
      label + " -> " + value,
    );
  }
  if (await page.getByRole("button", { name: "☰ 课程" }).isVisible())
    await activate(
      page.getByRole("button", { name: "☰ 课程" }),
      "open directory",
    );
  await activate(
    page
      .getByRole("navigation", { name: "课程目录" })
      .getByRole("button")
      .nth(3),
    "04 Position",
  );
  await choice("角标的 position", "relative · 留住位置");
  await choice("角标的 position", "absolute · 脱离流");
  await choice("偏移距离", "24px");
  await choice("absolute 的定位参照", "卡片 static → 画布");
  await activate(
    page.getByRole("button", { name: "完成并继续" }),
    "finish flow",
  );
  for (const mode of ["sticky · 区段内吸顶", "fixed · 实验视口固定"]) {
    await choice("标题栏的定位方式", mode);
    await activate(
      page.getByRole("button", { name: "680px · 区段之后" }),
      "scroll to section end",
    );
  }
  await activate(
    page.getByRole("button", { name: "完成并继续" }),
    "finish scrolling",
  );
  await choice("A 内子元素的 z-index", "999");
  await choice("父上下文 A 的 z-index", "3 · 高于 B");
  const trigger = page.getByRole("button", { name: "打开原生模态对话框" });
  await activate(trigger, "open native modal");
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".position-demo-dialog a")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "关闭并返回" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await activate(trigger, "reopen native modal");
  await activate(
    page.getByRole("button", { name: "关闭并返回" }),
    "button close modal",
  );
  await expect(trigger).toBeFocused();
  await activate(
    page.getByRole("button", { name: "完成并继续" }),
    "finish layers",
  );
  const cards = page.locator(".quiz-card");
  await activate(
    cards.nth(0).getByRole("button").nth(1),
    "intentional wrong answer",
  );
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  await activate(
    cards.nth(0).getByRole("button").nth(0),
    "retry correct answer",
    true,
  );
  await activate(cards.nth(1).getByRole("button").nth(1), "quiz 2");
  await activate(cards.nth(2).getByRole("button").nth(1), "quiz 3");
  await activate(
    page.getByRole("button", { name: "完成并继续" }),
    "finish quiz",
  );
  const select = page.getByLabel("实现场景");
  await seek(select, "prompt scenario");
  await page.keyboard.press("End");
  await expect(select).toHaveValue("dialog");
  await activate(
    page.getByRole("button", { name: "生成定位指令" }),
    "generate prompt",
  );
  const draft = page.getByLabel("可编辑的 Position Agent 指令");
  await seek(draft, "edit prompt");
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\nReview: repeated open and close.");
  await activate(
    page.getByRole("button", { name: "复制定位指令" }),
    "copy denied",
    true,
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await seek(
    page.getByLabel("我已检查定位参照、关闭路径、焦点和验收方式。"),
    "review checkbox",
  );
  await page.keyboard.press("Space");
  await activate(
    page.getByRole("button", { name: "完成第四节" }),
    "finish lesson",
  );
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await activate(
    page.getByRole("button", { name: "重置第四节进度" }),
    "open reset",
  );
  await activate(
    page.getByRole("button", { name: "确认重置第四节" }),
    "confirm reset",
  );
  await expect(page.locator("#position-stage-heading")).toBeFocused();
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "0 / 5",
  );
  mkdirSync("/tmp/position-acceptance", { recursive: true });
  writeFileSync(
    `/tmp/position-acceptance/keyboard-${info.project.name}.json`,
    JSON.stringify(
      { project: info.project.name, passed: true, trace },
      null,
      2,
    ),
  );
});
