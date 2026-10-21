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
  await page.getByRole("button", { name: "ⓘ 锚点说明" }).click();
  await page.getByRole("button", { name: "关闭锚点说明" }).click();
  await page.getByRole("button", { name: "完成并继续" }).click();
}
test("fourth lesson is available, thirteenth remains unbuilt and route count stays 32", async ({
  page,
}) => {
  await open(page);
  await expect(page).toHaveTitle("Position与浮层 · 前端观察室");
  await expect(page.locator(".nav-caption")).toContainText("12 / 32");
  await expect(page.locator(".course-link")).toHaveCount(32);
  await course(page, 12);
  await expect(page.getByRole("heading", { name: "Props与Variant" })).toBeVisible();
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
  await expect(page.locator(".notice")).toContainText("05 Sizing与Overflow");
  await expect(page.locator(".notice")).not.toContainText("尚未制作");
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
  const anchor = page.getByRole("button", { name: "ⓘ 锚点说明" });
  await activate(anchor, "open anchored nonmodal");
  await expect(
    page.getByRole("button", { name: "关闭锚点说明" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(anchor).toBeFocused();
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

async function anchorBounds(page) {
  const result = await page.locator("#position-anchor-popup").evaluate((el) => {
    const p = el.getBoundingClientRect(),
      a = document.querySelector(".anchor-trigger").getBoundingClientRect(),
      b = document
        .querySelector('[data-testid="anchor-board"]')
        .getBoundingClientRect();
    return {
      left: p.left,
      right: p.right,
      top: p.top,
      bottom: p.bottom,
      width: p.width,
      height: p.height,
      bounds: {
        left: Math.max(8, b.left + 8),
        right: Math.min(innerWidth - 8, b.right - 8),
        top: Math.max(8, b.top + 8),
        bottom: Math.min(innerHeight - 8, b.bottom - 8),
      },
      anchor: { top: a.top, bottom: a.bottom },
      side: el.dataset.placement,
      native: el.matches(":popover-open"),
      parent: el.parentElement.tagName,
    };
  });
  expect(result.width).toBeGreaterThan(100);
  expect(result.height).toBeGreaterThan(100);
  expect(result.left).toBeGreaterThanOrEqual(result.bounds.left - 1);
  expect(result.right).toBeLessThanOrEqual(result.bounds.right + 1);
  expect(result.top).toBeGreaterThanOrEqual(result.bounds.top - 1);
  expect(result.bottom).toBeLessThanOrEqual(result.bounds.bottom + 1);
  expect(result.parent).toBe("BODY");
  if (result.side === "below")
    expect(result.top).toBeGreaterThanOrEqual(result.anchor.bottom + 7);
  else expect(result.bottom).toBeLessThanOrEqual(result.anchor.top - 7);
  return result;
}
test("anchored nonmodal flips/shifts, preserves outside actions, returns focus and never traps Tab", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  const trigger = page.getByRole("button", { name: "ⓘ 锚点说明" }),
    popup = page.locator("#position-anchor-popup"),
    close = page.getByRole("button", { name: "关闭锚点说明" });
  for (const fallback of [false, true]) {
    await page
      .getByLabel("模拟不支持 Popover，检查兼容回退")
      .setChecked(fallback);
    await choose(page, "锚点的位置", "上方");
    await trigger.click();
    await expect(popup).toBeVisible();
    await expect(close).toBeFocused();
    expect((await anchorBounds(page)).native).toBe(!fallback);
    await expect(popup).toHaveAttribute("aria-modal", "false");
    await expect(popup).toHaveAttribute("data-placement", "below");
    await axeCheck(page);
    await page.keyboard.press("Tab");
    expect(
      await popup.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(false);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await choose(page, "锚点的位置", "右下边缘");
    for (let i = 0; i < 3; i++) {
      await trigger.click();
      await expect(popup).toBeVisible();
      await expect(popup).toHaveAttribute("data-placement", "above");
      await expect(popup).toHaveAttribute("data-shifted", "true");
      await anchorBounds(page);
      if (i === 0) {
        const viewport = page.viewportSize();
        await page.setViewportSize({
          ...viewport,
          height: viewport.height - 100,
        });
        await anchorBounds(page);
        await page.setViewportSize(viewport);
        await anchorBounds(page);
      }
      await close.click();
      await expect(trigger).toBeFocused();
      await expect(popup).not.toBeVisible();
    }
    await trigger.click();
    const background = page.getByRole("button", { name: /背景计数/ });
    await background.click();
    await expect(background).toContainText(fallback ? "2" : "1");
    await expect(popup).not.toBeVisible();
    await expect(background).toBeFocused();
    await trigger.click();
    await page
      .getByTestId("anchor-board")
      .click({ position: { x: 12, y: 12 } });
    await expect(popup).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(popup).not.toBeVisible();
    await noOverflow(page);
  }
});
test("missing and throwing Popover APIs both open a usable compatible nonmodal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLElement.prototype.showPopover = undefined;
  });
  await open(page);
  await step(page, 2);
  const trigger = page.getByRole("button", { name: "ⓘ 锚点说明" }),
    popup = page.locator("#position-anchor-popup");
  await trigger.click();
  await expect(popup).toBeVisible();
  await expect(popup).toHaveAttribute("data-native", "false");
  await anchorBounds(page);
  await page.getByRole("button", { name: "关闭锚点说明" }).click();
  await expect(trigger).toBeFocused();
  await page.evaluate(() => {
    HTMLElement.prototype.showPopover = () => {
      throw Error("simulated API failure");
    };
  });
  await step(page, 0);
  await step(page, 2);
  await trigger.click();
  await expect(popup).toBeVisible();
  await expect(popup).toHaveAttribute("data-native", "false");
  await expect(
    page.getByLabel("模拟不支持 Popover，检查兼容回退"),
  ).toBeChecked();
  await anchorBounds(page);
  await axeCheck(page);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
test("touch-only complete lesson, quiz retry, persisted progress and reset need no hardware keyboard", async ({
  browser,
}, info) => {
  test.setTimeout(60000);
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    baseURL: "http://127.0.0.1:4173",
  });
  const page = await context.newPage(),
    trace = [];
  // Every action is a real touch tap; record and reject any emitted key events.
  await page.addInitScript(() => {
    window.lessonKeyEvents = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.lessonKeyEvents.push(e.key));
  });
  async function tap(locator, name, options) {
    await locator.tap(options);
    trace.push(name);
  }
  async function directory(n) {
    await tap(page.getByRole("button", { name: "☰ 课程" }), "directory");
    await tap(
      page
        .getByRole("navigation", { name: "课程目录" })
        .getByRole("button")
        .nth(n),
      "course " + (n + 1),
    );
  }
  async function pick(label, value) {
    await tap(
      page
        .getByRole("group", { name: label, exact: true })
        .getByRole("button", { name: value, exact: true }),
      label + ": " + value,
    );
  }
  const next = () =>
    tap(page.getByRole("button", { name: "完成并继续" }), "next");
  await page.goto("/");
  await directory(1);
  await directory(2);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(3);
  await pick("角标的 position", "relative · 留住位置");
  await pick("角标的 position", "absolute · 脱离流");
  await pick("偏移距离", "24px");
  await pick("absolute 的定位参照", "卡片 static → 画布");
  await next();
  for (const mode of ["sticky · 区段内吸顶", "fixed · 实验视口固定"]) {
    await pick("标题栏的定位方式", mode);
    await tap(
      page.getByRole("button", { name: "680px · 区段之后" }),
      "scroll experiment",
    );
  }
  await next();
  await pick("A 内子元素的 z-index", "999");
  await pick("父上下文 A 的 z-index", "3 · 高于 B");
  for (let i = 0; i < 3; i++) {
    await tap(
      page.getByRole("button", { name: "打开原生模态对话框" }),
      "open modal",
    );
    await tap(
      page.getByRole("button", { name: "关闭并返回" }),
      "touch close modal",
    );
    await expect(
      page.getByRole("button", { name: "打开原生模态对话框" }),
    ).toBeFocused();
  }
  await pick("锚点的位置", "右下边缘");
  for (let i = 0; i < 3; i++) {
    await tap(
      page.getByRole("button", { name: "ⓘ 锚点说明" }),
      "open anchored",
    );
    await anchorBounds(page);
    await tap(
      page.getByRole("button", { name: "关闭锚点说明" }),
      "touch close anchored",
    );
    await expect(
      page.getByRole("button", { name: "ⓘ 锚点说明" }),
    ).toBeFocused();
  }
  await tap(
    page.getByRole("button", { name: "ⓘ 锚点说明" }),
    "touch outside open",
  );
  await tap(page.getByTestId("anchor-board"), "touch outside blank", {
    position: { x: 12, y: 12 },
  });
  await expect(page.locator("#position-anchor-popup")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "ⓘ 锚点说明" })).toBeFocused();
  await next();
  const cards = page.locator(".quiz-card");
  await tap(cards.nth(0).getByRole("button").nth(1), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [0, 1, 1].entries())
    await tap(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await next();
  await tap(page.getByRole("button", { name: "生成定位指令" }), "generate");
  const draft = page.getByLabel("可编辑的 Position Agent 指令");
  await expect(draft).toHaveValue(/锚点.*滚动.*触屏.*外点/s);
  await tap(
    page.getByLabel("我已检查定位参照、关闭路径、焦点和验收方式。"),
    "review",
  );
  await tap(page.getByRole("button", { name: "完成第四节" }), "finish");
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(completed.dialogEscapeClosed).toBe(false);
  expect(completed.dialogButtonClosed).toBe(true);
  expect(completed.done.sort()).toEqual([0, 1, 2, 3, 4]);
  expect(await page.evaluate(() => window.lessonKeyEvents)).toEqual([]);
  await page.reload();
  await directory(3);
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await tap(page.getByRole("button", { name: "重置第四节进度" }), "open reset");
  await tap(
    page.getByRole("button", { name: "确认重置第四节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-four .lesson-bottom")).toContainText(
    "0 / 5",
  );
  const reset = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(reset.dialogEscapeClosed).toBe(false);
  expect(reset.dialogButtonClosed).toBe(false);
  expect(reset.anchorOpened).toBe(false);
  expect(reset.anchorClosed).toBe(false);
  expect(reset.done).toEqual([]);
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  expect(await page.evaluate(() => window.lessonKeyEvents)).toEqual([]);
  await axeCheck(page);
  await noOverflow(page);
  mkdirSync("/tmp/position-acceptance", { recursive: true });
  writeFileSync(
    `/tmp/position-acceptance/touch-${info.project.name}.json`,
    JSON.stringify(
      {
        passed: true,
        keyEvents: [],
        completed,
        reset,
        priorStoresUnchanged: true,
        trace,
      },
      null,
      2,
    ),
  );
  await context.close();
});

test("delayed modal close event preserves a subsequent keyboard focus target", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await page.getByRole("button", { name: "打开原生模态对话框" }).click();
  await page.getByRole("button", { name: "关闭并返回" }).click();
  const trigger = page.getByRole("button", { name: "打开原生模态对话框" }),
    anchor = page.getByRole("button", { name: "ⓘ 锚点说明" });
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(anchor).toBeFocused();
  await page
    .locator(".position-demo-dialog")
    .evaluate((el) => el.dispatchEvent(new Event("close")));
  await expect(anchor).toBeFocused();
  await expect(anchor).not.toHaveCSS("outline-style", "none");
});
