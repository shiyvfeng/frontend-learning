import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson6.v1",
  priorKeys = [1, 2, 3, 4, 5].map((n) => `frontend-observatory.lesson${n}.v1`),
  out = "/tmp/responsive-acceptance";
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await nav.getByRole("button").nth(n).click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 5);
  await expect(page.locator("#responsive-stage-heading")).toBeVisible();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
const choose = (page, label, value) => choice(page, label, value).click();
const step = (page, n) =>
  page
    .getByRole("navigation", { name: "第六节学习步骤" })
    .getByRole("button")
    .nth(n)
    .click();
const next = (page) => page.getByRole("button", { name: "完成并继续" }).click();
const frame = (page) =>
  page.frameLocator('iframe[title="独立视口侧栏与导航抽屉实验"]');
const progress = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
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
async function firstThree(page) {
  await choose(page, "独立示例视口", "320px");
  await choose(page, "独立示例视口", "840px");
  await choose(page, "媒体查询断点", "480px");
  await choose(page, "组件容器宽度", "460px");
  await next(page);
  await choose(page, "导航示例视口", "340px · 窄视口");
  const f = frame(page);
  await f.getByRole("button", { name: "打开导航", exact: true }).click();
  await f.getByRole("button", { name: "关闭导航", exact: true }).click();
  await f.getByRole("button", { name: "打开导航", exact: true }).click();
  await f.getByRole("button", { name: "切到宽视口并收起" }).click();
  await expect(f.locator("body")).toHaveAttribute("data-layout", "wide");
  await next(page);
  await choose(page, "操作组件宽度", "240px");
  await page.getByLabel("换成长标题与完整说明").check();
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await page.getByText("更多操作", { exact: true }).click();
  await page.getByRole("button", { name: "查看说明", exact: true }).click();
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [1, 0, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
test("sixth available and twenty-fourth stays unmade using shared metadata", async ({
  page,
}) => {
  await open(page);
  await expect(page).toHaveTitle("响应式 · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(23);
  await expect(page.locator(".site-footer")).toContainText("01–23");
  await course(page, 23);
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
  await expect(
    page.getByRole("heading", { name: "Canvas" }),
  ).toBeVisible();
});
test("real media and container queries respond to independent widths and content breakpoints", async ({
  page,
}) => {
  await open(page);
  const iframe = page.frameLocator('iframe[title="独立视口媒体查询实验"]'),
    card = page.getByTestId("query-card"),
    host = page.viewportSize().width;
  await choose(page, "独立示例视口", "320px");
  await expect(iframe.locator(".side")).toBeHidden();
  await choose(page, "组件容器宽度", "460px");
  await expect
    .poll(() =>
      card.evaluate(
        (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
      ),
    )
    .toBe(2);
  expect(
    await page.getByTestId("query-container").evaluate((e) => e.clientWidth),
  ).toBe(460);
  await expect(iframe.locator(".side")).toBeHidden();
  await choose(page, "独立示例视口", "840px");
  await expect(iframe.locator(".side")).toBeVisible();
  expect(
    await iframe
      .locator("html")
      .evaluate((e) => e.ownerDocument.defaultView.innerWidth),
  ).toBe(840);
  await choose(page, "组件容器宽度", "200px");
  await expect
    .poll(() =>
      card.evaluate(
        (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
      ),
    )
    .toBe(1);
  await expect(iframe.locator(".side")).toBeVisible();
  expect(await page.evaluate(() => innerWidth)).toBe(host);
  await choose(page, "独立示例视口", "560px");
  await choose(page, "媒体查询断点", "480px");
  await expect(iframe.locator(".side")).toBeVisible();
  await choose(page, "媒体查询断点", "720px");
  await expect(iframe.locator(".side")).toBeHidden();
  expect(
    await iframe
      .locator("html")
      .evaluate((e) => e.ownerDocument.defaultView.innerWidth),
  ).toBe(560);
  await noOverflow(page);
});
test("container query fallback is honest and keeps content and secondary actions usable", async ({
  page,
}) => {
  await open(page);
  await choose(page, "组件容器宽度", "460px");
  await page.getByLabel("模拟不支持容器查询").check();
  await expect(page.getByTestId("container-readout")).toContainText(
    "基础单列回退",
  );
  await expect
    .poll(() =>
      page
        .getByTestId("query-card")
        .evaluate(
          (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
        ),
    )
    .toBe(1);
  await step(page, 2);
  await choose(page, "操作组件宽度", "240px");
  await page.getByRole("button", { name: "查看说明", exact: true }).click();
  await expect(page.locator(".priority-result")).toContainText("完整说明");
  await axeCheck(page);
  await page.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = (a, b) => (a === "container-type" ? false : original(a, b));
  });
  await page.reload();
  await course(page, 5);
  await step(page, 0);
  await expect(page.getByTestId("container-readout")).toContainText(
    "未通过容器查询能力检查",
  );
  await noOverflow(page);
});
test("native drawer has repeatable focus cycles, Escape/button exits and content reading order", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  await choose(page, "导航示例视口", "340px · 窄视口");
  const f = frame(page),
    menu = f.getByRole("button", { name: "打开导航", exact: true }),
    close = f.getByRole("button", { name: "关闭导航", exact: true }),
    wide = f.getByRole("button", { name: "切到宽视口并收起" });
  for (let i = 0; i < 3; i++) {
    await menu.click();
    await expect(close).toBeFocused();
    expect(await f.locator("dialog").evaluate((e) => e.matches(":modal"))).toBe(
      true,
    );
    await page.keyboard.press("Shift+Tab");
    await expect(wide).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    if (i === 1) await page.keyboard.press("Escape");
    else await close.click();
    await expect(menu).toBeFocused();
    await expect(f.locator("dialog")).not.toBeVisible();
  }
  await menu.click();
  const buttons = f
    .getByRole("navigation", { name: "项目栏目" })
    .getByRole("button");
  await buttons.nth(1).click();
  await expect(menu).toBeFocused();
  await expect(
    f.getByRole("heading", { name: "阅读清单", exact: true }),
  ).toBeVisible();
  await expect(f.locator(".layout-card > div").first()).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await noOverflow(page);
});
test("open drawers crossing native breakpoint clean modal state and restore visible focus", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  await choose(page, "导航示例视口", "340px · 窄视口");
  const f = frame(page),
    el = page.locator('iframe[title="独立视口侧栏与导航抽屉实验"]');
  for (let i = 0; i < 3; i++) {
    await f.getByRole("button", { name: "打开导航", exact: true }).click();
    await f.getByRole("button", { name: "切到宽视口并收起" }).click();
    await expect(f.locator("body")).toHaveAttribute("data-layout", "wide");
    await expect(f.locator("dialog")).not.toHaveAttribute("open");
    expect(await f.locator("dialog").evaluate((e) => e.matches(":modal"))).toBe(
      false,
    );
    await expect(f.locator(".desktop-nav nav button").first()).toBeFocused();
    await f.getByRole("button", { name: /记录一次观察/ }).click();
    await expect(f.locator(".result")).toHaveText("背景可操作。");
    await el.evaluate((e) => (e.style.width = "639px"));
    await expect(f.locator("body")).toHaveAttribute("data-layout", "narrow");
    await f.getByRole("button", { name: "打开导航", exact: true }).click();
    await el.evaluate((e) => (e.style.width = "640px"));
    await expect(f.locator("body")).toHaveAttribute("data-layout", "wide");
    await expect(f.locator("dialog")).not.toHaveAttribute("open");
    await expect(f.locator(".desktop-nav nav button").first()).toBeFocused();
    await choose(page, "导航示例视口", "340px · 窄视口");
    await expect(f.locator("body")).toHaveAttribute("data-layout", "narrow");
  }
  await f.getByRole("button", { name: "打开导航", exact: true }).click();
  const outerWide = choice(page, "导航示例视口", "820px · 宽视口");
  await outerWide.click();
  await expect(f.locator("body")).toHaveAttribute("data-layout", "wide");
  await expect(outerWide).toBeFocused();
  expect((await progress(page)).crossedOpen).toBe(true);
  await noOverflow(page);
});
test("unsupported modal capability falls back to ordinary expandable navigation", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  await choose(page, "导航示例视口", "340px · 窄视口");
  const f = frame(page);
  await f.locator("dialog").evaluate((e) => (e.showModal = undefined));
  await f.getByRole("button", { name: "打开导航", exact: true }).click();
  await expect(f.locator(".support-status")).toContainText("背景仍可操作");
  expect(await f.locator("dialog").evaluate((e) => e.matches(":modal"))).toBe(
    false,
  );
  await f.getByRole("button", { name: "关闭导航", exact: true }).click();
  await expect(
    f.getByRole("button", { name: "打开导航", exact: true }),
  ).toBeFocused();
});
test("long copy, priorities and container breakpoint preserve controls and hidden-control focus", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await page.getByLabel("换成长标题与完整说明").check();
  await choose(page, "操作组件宽度", "240px");
  const primary = page.getByRole("button", { name: "保存草稿", exact: true });
  expect(
    await primary.evaluate((e) => e.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  await primary.click();
  await page.getByText("更多操作", { exact: true }).click();
  await page.getByRole("button", { name: "查看说明", exact: true }).click();
  await expect(page.locator(".priority-result")).toContainText("完整说明");
  await choose(page, "操作组件宽度", "520px");
  await expect(page.locator(".priority-details")).toBeHidden();
  const inline = page.locator(".priority-inline button").first();
  await inline.focus();
  await page
    .getByTestId("priority-container")
    .evaluate((e) => (e.style.width = "240px"));
  await expect(primary).toBeFocused();
  // Reproduce a browser clearing a now-hidden target before the observer runs.
  await choose(page, "操作组件宽度", "240px");
  await choose(page, "操作组件宽度", "520px");
  await inline.focus();
  await expect(inline).toBeFocused();
  await page.getByTestId("priority-container").evaluate((e) => {
    e.style.width = "240px";
    document.activeElement.blur();
  });
  await expect(primary).toBeFocused();
  // A focused control outside the component must never lose its focus.
  await choose(page, "操作组件宽度", "240px");
  await choose(page, "操作组件宽度", "520px");
  const outside = choice(page, "操作组件宽度", "520px");
  await expect(outside).toBeFocused();
  await page.getByTestId("priority-container").evaluate((e) => {
    e.style.width = "240px";
  });
  await expect(outside).toBeFocused();
  const heading = page.locator(".responsive-priority h3");
  expect(await heading.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
  await axeCheck(page);
  await noOverflow(page);
});
test("practice retries with reasons and only completed tasks pass", async ({
  page,
}) => {
  await open(page);
  await step(page, 3);
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  const first = page.locator(".quiz-card").first();
  await first.getByRole("button").nth(0).click();
  await expect(first.getByRole("status")).toContainText("再想一想");
  await expect(first.getByRole("status")).toContainText("容器");
  await quiz(page);
  await expect(page.locator(".lesson-six .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("both editable prompts and clipboard success/missing/denied/late reset paths work", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 响应式 Agent 指令");
  await page.getByRole("button", { name: "生成响应式指令" }).click();
  await expect(draft).toHaveValue(/工作台.*container query.*触屏/s);
  await page.getByLabel("实现场景").selectOption("card");
  await page.getByRole("button", { name: "重新生成响应式草稿" }).click();
  await expect(draft).toHaveValue(/可复用资料卡片/);
  await draft.fill((await draft.inputValue()) + "\n检查长导航。");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.responsiveCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制响应式指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.responsiveCopied)).toContain(
    "长导航",
  );
  for (const missing of [true, false]) {
    await page.evaluate(
      (m) =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: m
            ? undefined
            : {
                writeText: async () => {
                  throw Error("denied");
                },
              },
        }),
      missing,
    );
    await page.getByRole("button", { name: "复制响应式指令" }).click();
    await expect(draft).toBeFocused();
    await expect(page.locator(".copy-feedback")).toContainText(
      "自动复制不可用",
    );
  }
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r) => (window.resolveResponsiveCopy = r)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制响应式指令" }).click();
  await page.getByRole("button", { name: "重置第六节进度" }).click();
  await page.getByRole("button", { name: "确认重置第六节" }).click();
  await page.evaluate(() => window.resolveResponsiveCopy());
  await step(page, 4);
  await expect(draft).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});
test("corrupt and unavailable storage remains usable and complete progress is stable", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 55,
          done: [8, null],
          viewWidth: 9,
          containerWidth: "bad",
          answers: "bad",
          viewportsSeen: null,
        }),
      );
      sessionStorage.setItem("seed", "1");
    }
  }, key);
  await open(page);
  await expect(page.getByTestId("media-readout")).toContainText("560px");
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成响应式指令" }).click();
  await page
    .getByLabel("我已检查布局变化、容器、优先级和交互验收方式。")
    .check();
  await page
    .getByRole("button", { name: "完成第六节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-six .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(page.locator(".notice")).toContainText("可以从课程目录继续 07");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 5);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("all stations plus both iframe documents and open drawer pass axe", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await axeCheck(page);
    await noOverflow(page);
    if (i <= 1) {
      const f = page.frames().find((f) => f !== page.mainFrame());
      await axeCheck(f);
      if (i === 1) {
        await choose(page, "导航示例视口", "340px · 窄视口");
        await frame(page)
          .getByRole("button", { name: "打开导航", exact: true })
          .click();
        await axeCheck(f);
        await frame(page)
          .getByRole("button", { name: "关闭导航", exact: true })
          .click();
      }
    }
  }
  await page.getByText("第六节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：容器查询与基础回退" }),
  ).toBeVisible();
  await axeCheck(page);
});

async function completeFlow(page, act, toggle, edit) {
  async function directory(n) {
    const nav = page.getByRole("navigation", { name: "课程目录" });
    if (!(await nav.isVisible()))
      await act(page.getByRole("button", { name: "☰ 课程" }), "directory");
    await act(nav.getByRole("button").nth(n), "course " + (n + 1));
  }
  const pick = (label, value) =>
      act(choice(page, label, value), label + " -> " + value),
    advance = () =>
      act(page.getByRole("button", { name: "完成并继续" }), "next");
  for (const n of [1, 2, 3, 4]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(5);
  await act(page.getByRole("button", { name: "完成并继续" }), "gate");
  await expect(page.locator(".notice")).toContainText("先完成");
  await pick("独立示例视口", "320px");
  await pick("独立示例视口", "840px");
  await pick("媒体查询断点", "480px");
  await pick("组件容器宽度", "460px");
  await advance();
  await pick("导航示例视口", "340px · 窄视口");
  const f = frame(page);
  await act(
    f.getByRole("button", { name: "打开导航", exact: true }),
    "open drawer",
  );
  await act(
    f.getByRole("button", { name: "关闭导航", exact: true }),
    "close drawer by button",
  );
  await expect(
    f.getByRole("button", { name: "打开导航", exact: true }),
  ).toBeFocused();
  await act(
    f.getByRole("button", { name: "打开导航", exact: true }),
    "reopen drawer",
  );
  await act(
    f.getByRole("button", { name: "切到宽视口并收起" }),
    "cross breakpoint with open drawer",
  );
  await expect(f.locator("body")).toHaveAttribute("data-layout", "wide");
  await expect(f.locator(".desktop-nav nav button").first()).toBeFocused();
  const iframeKeys = await f
    .locator("body")
    .evaluate(() => window.responsiveKeys ?? null);
  await advance();
  await pick("操作组件宽度", "240px");
  await toggle(page.getByLabel("换成长标题与完整说明"), "long copy");
  await act(
    page.getByRole("button", { name: "保存草稿", exact: true }),
    "primary action",
  );
  await act(page.getByText("更多操作", { exact: true }), "more actions");
  await act(
    page.getByRole("button", { name: "查看说明", exact: true }),
    "secondary action",
  );
  await advance();
  const cards = page.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong answer");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(page.getByRole("button", { name: "生成响应式指令" }), "generate");
  const draft = page.getByLabel("可编辑的 响应式 Agent 指令");
  await expect(draft).toHaveValue(/容器策略.*内容优先级/s);
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制响应式指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查布局变化、容器、优先级和交互验收方式。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第六节" }), "finish");
  await expect(page.locator(".lesson-six .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.responsiveKeys ?? null);
  await page.reload();
  await directory(5);
  await expect(page.locator(".lesson-six .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(page.getByRole("button", { name: "重置第六节进度" }), "open reset");
  await act(
    page.getByRole("button", { name: "保留第六节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-six .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第六节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第六节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-six .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#responsive-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.drawerOpened).toBe(false);
  expect(reset.crossedOpen).toBe(false);
  expect(reset.draft).toBe("");
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    iframeKeys,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.responsiveKeys ?? null),
  };
}
const denyClipboard = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });
test("complete keyboard-only responsive learning with drawer cross-breakpoint, retry, edit, refresh and reset", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const trace = [];
  await page.addInitScript(denyClipboard);
  await page.goto("/");
  async function seek(locator, name) {
    await expect(locator).toBeEnabled();
    for (let n = 0; n < 240; n++) {
      if (await locator.evaluate((e) => e === document.activeElement)) {
        const state = await locator.evaluate((e) => {
          const r = e.getBoundingClientRect(),
            w = e.ownerDocument.defaultView,
            hit = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
          let visible = r.top >= 0 && r.bottom <= w.innerHeight + 1,
            covered = hit !== e && !e.contains(hit);
          if (w.frameElement) {
            const fr = w.frameElement.getBoundingClientRect(),
              x = fr.left + w.frameElement.clientLeft + r.left + r.width / 2,
              y = fr.top + w.frameElement.clientTop + r.top + r.height / 2,
              outer = w.frameElement.ownerDocument;
            visible =
              visible &&
              y >= 0 &&
              y <= outer.defaultView.innerHeight &&
              x >= 0 &&
              x <= outer.defaultView.innerWidth;
            covered =
              covered || outer.elementFromPoint(x, y) !== w.frameElement;
          }
          return {
            outline: getComputedStyle(e).outlineStyle,
            visible,
            covered,
          };
        });
        expect(state.outline).not.toBe("none");
        expect(state.visible).toBe(true);
        expect(state.covered).toBe(false);
        trace.push({ name, tabs: n, ...state });
        return;
      }
      await page.keyboard.press("Tab");
    }
    throw Error("Unreachable " + name);
  }
  const act = async (locator, name) => {
      await seek(locator, name);
      await page.keyboard.press("Enter");
      trace.push({ enter: name });
    },
    toggle = async (locator, name) => {
      await seek(locator, name);
      await page.keyboard.press("Space");
      trace.push({ space: name });
    };
  const result = await completeFlow(page, act, toggle, async (draft) => {
    await seek(draft, "edit prompt");
    await page.keyboard.press("Control+End");
    await page.keyboard.type("\nReview: preserve reading order.");
  });
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...result }, null, 2),
  );
});
test("zero-keyboard touch-only full responsive learning, retry, refresh, cancel and confirm reset", async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    page = await context.newPage(),
    trace = [];
  await page.addInitScript(denyClipboard);
  await page.addInitScript(() => {
    window.responsiveKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.responsiveKeys.push(e.key));
  });
  await page.goto("/");
  const tap = async (locator, name) => {
    await locator.tap();
    trace.push(name);
  };
  const result = await completeFlow(page, tap, tap);
  expect(result.keysBeforeReload).toEqual([]);
  expect(result.keysAfterReload).toEqual([]);
  expect(result.iframeKeys).toEqual([]);
  expect(result.completed.done.sort()).toEqual([0, 1, 2, 3, 4]);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/touch-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...result }, null, 2),
  );
  await context.close();
});
