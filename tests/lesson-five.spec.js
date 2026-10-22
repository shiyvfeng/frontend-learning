import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson5.v1",
  priorKeys = [1, 2, 3, 4].map((n) => `frontend-observatory.lesson${n}.v1`),
  out = "/tmp/sizing-acceptance";
async function course(page, n) {
  const menu = page.getByRole("button", { name: "☰ 课程" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "课程目录" })
    .getByRole("button")
    .nth(n)
    .click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 4);
  await expect(page.locator("#sizing-stage-heading")).toBeVisible();
}
async function step(page, n) {
  await page
    .getByRole("navigation", { name: "第五节学习步骤" })
    .getByRole("button")
    .nth(n)
    .click();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
async function choose(page, label, value) {
  await choice(page, label, value).click();
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
const progress = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
const next = (page) => page.getByRole("button", { name: "完成并继续" }).click();
async function firstThree(page) {
  await choose(page, "尺寸容器", "240px · 较窄");
  await choose(page, "min-width", "320px");
  await choose(page, "max-width", "100%");
  await choose(page, "box-sizing", "content-box");
  await next(page);
  await choose(page, "文本容器", "240px · 较窄");
  await choose(page, "标题长度", "超长标题");
  await page.getByLabel("允许主项目收缩 · min-width: 0").check();
  for (const name of ["auto · 内部滚动", "clip · 裁切", "ellipsis · 省略"])
    await choose(page, "标题溢出策略", name);
  await page.getByRole("button", { name: "查看完整标题" }).click();
  await next(page);
  await page.getByRole("button", { name: "新增 2 条" }).click();
  await page.getByRole("button", { name: "新增 2 条" }).click();
  await page.getByRole("button", { name: "滚到消息末尾" }).click();
  await choose(page, "滚动结构", "消息区内部滚动");
  await page.getByLabel("允许中间 Flex 项收缩 · min-height: 0").check();
  await page.getByRole("button", { name: "滚到消息末尾" }).click();
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [1, 0, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
test("fifth lesson is available, twenty-first stays unbuilt, full 32-course route retained", async ({
  page,
}) => {
  await open(page);
  await expect(page).toHaveTitle("Sizing与Overflow · 前端观察室");
  await expect(page.locator(".nav-caption")).toContainText("20 / 32");
  await expect(page.locator(".course-link")).toHaveCount(32);
  await expect(page.locator(".available-dot")).toHaveCount(20);
  await course(page, 20);
  await expect(page.getByRole("heading", { name: "Shared Element Transition" })).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
  await noOverflow(page);
});
test("min wins conflicting max; border/content-box and padding have measured effects", async ({
  page,
}) => {
  await open(page);
  const card = page.getByTestId("size-card"),
    frame = page.getByTestId("size-frame");
  await expect(card).toHaveCSS("box-sizing", "border-box");
  expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBe(240);
  await choose(page, "box-sizing", "content-box");
  expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBe(276);
  await choose(page, "每侧 padding", "32px");
  expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBe(308);
  await choose(page, "尺寸容器", "240px · 较窄");
  await choose(page, "box-sizing", "border-box");
  await choose(page, "max-width", "100%");
  await choose(page, "min-width", "320px");
  expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBe(320);
  const available = await frame.evaluate((e) => e.clientWidth);
  expect(available).toBeLessThan(320);
  await choose(page, "min-width", "0");
  expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBe(
    available,
  );
  await expect(page.getByTestId("size-outer")).toHaveText(available + "px");
  const protectedRegion = page.getByRole("region", {
    name: "尺寸故障实验区，可横向滚动",
  });
  await choose(page, "min-width", "320px");
  const boundary = await protectedRegion.evaluate((e) => ({
    client: e.clientWidth,
    scroll: e.scrollWidth,
  }));
  expect(boundary.scroll).toBeGreaterThanOrEqual(320);
  if (boundary.client < 320)
    expect(boundary.scroll).toBeGreaterThan(boundary.client);
  await protectedRegion.focus();
  await page.keyboard.press("End");
  await noOverflow(page);
});
test("long title actually pushes auto minimum; zero plus distinct overflow policies and accessible full text", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  await choose(page, "文本容器", "240px · 较窄");
  await choose(page, "标题长度", "超长标题");
  const main = page.getByTestId("text-main"),
    title = page.getByTestId("overflow-title");
  expect(
    await main.evaluate((e) => e.getBoundingClientRect().width),
  ).toBeGreaterThan(600);
  await page.getByLabel("允许主项目收缩 · min-width: 0").check();
  expect(
    await main.evaluate((e) => e.getBoundingClientRect().width),
  ).toBeLessThan(200);
  expect(await title.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  await choose(page, "标题溢出策略", "auto · 内部滚动");
  await title.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => title.evaluate((e) => e.scrollLeft))
    .toBeGreaterThan(0);
  await choose(page, "标题溢出策略", "clip · 裁切");
  await title.evaluate((e) => {
    e.scrollLeft = 0;
    e.scrollLeft = 100;
  });
  expect(await title.evaluate((e) => e.scrollLeft)).toBe(0);
  await choose(page, "标题溢出策略", "ellipsis · 省略");
  await expect(title).toHaveCSS("text-overflow", "ellipsis");
  await expect(title).toHaveCSS("white-space", "nowrap");
  await page.getByRole("button", { name: "查看完整标题" }).click();
  const full = page.locator("#sizing-full-title");
  await expect(full).toBeVisible();
  expect(await full.innerText()).toBe(await title.innerText());
  await expect(
    page.getByRole("button", { name: "收起完整标题" }),
  ).toBeFocused();
  await axeCheck(page);
  await choose(page, "标题溢出策略", "wrap · 换行");
  expect(await title.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
  expect(
    await title.evaluate((e) => e.getBoundingClientRect().height),
  ).toBeGreaterThan(40);
  await noOverflow(page);
});
test("message count creates genuine page/internal scrolling, auto height fault, and repeat actions never disable controls", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  const frame = page.frameLocator('iframe[title="消息尺寸与滚动归属实验"]'),
    end = page.getByRole("button", { name: "滚到消息末尾" });
  for (let n = 0; n < 4; n++)
    await page.getByRole("button", { name: "新增 2 条" }).click();
  await expect(page.getByRole("button", { name: "新增 2 条" })).toBeDisabled();
  await expect(frame.locator("[data-message]")).toHaveCount(10);
  await end.click();
  await expect
    .poll(() =>
      frame
        .locator("html")
        .evaluate((e) => e.ownerDocument.defaultView.scrollY),
    )
    .toBeGreaterThan(0);
  await choose(page, "滚动结构", "整页滚动 · 实验页");
  await page.getByLabel("允许中间 Flex 项收缩 · min-height: 0").check();
  await expect(end).toBeEnabled();
  await end.click();
  await choose(page, "滚动结构", "消息区内部滚动");
  await page.getByLabel("允许中间 Flex 项收缩 · min-height: 0").uncheck();
  await expect
    .poll(() => frame.locator("html").evaluate((e) => e.scrollHeight))
    .toBeGreaterThan(350);
  await expect(frame.locator("[data-slot]")).toHaveCSS("min-height", "auto");
  await page.getByLabel("允许中间 Flex 项收缩 · min-height: 0").check();
  await expect(frame.locator("[data-slot]")).toHaveCSS("min-height", "0px");
  await expect
    .poll(() => frame.locator("html").evaluate((e) => e.scrollHeight))
    .toBe(350);
  await expect(frame.locator("[data-messages]")).toHaveJSProperty(
    "clientHeight",
    256,
  );
  await expect
    .poll(async () => (await progress(page)).endsSeen.includes("internal"))
    .toBe(false);
  await frame.locator("[data-messages]").focus();
  await page.keyboard.press("End");
  await expect
    .poll(async () => (await progress(page)).endsSeen.includes("internal"))
    .toBe(true);

  await end.click();
  await expect
    .poll(() => frame.locator("[data-messages]").evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0);
  await expect(frame.locator("html")).toHaveJSProperty("scrollTop", 0);
  for (let i = 0; i < 3; i++) {
    await choose(page, "滚动结构", "消息区内部滚动");
    await page.getByRole("button", { name: "回到消息开头" }).click();
    await end.click();
  }
  expect((await progress(page)).endsSeen.sort()).toEqual(["internal", "page"]);
  await frame.locator("[data-messages]").focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("End");
  await expect
    .poll(() => frame.locator("[data-messages]").evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0);
  await axeCheck(page);
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "减少 2 条" }).click();
  await expect(page.getByRole("button", { name: "减少 2 条" })).toBeDisabled();
  await noOverflow(page);
});
test("quiz gate, wrong answer feedback and retry preserve useful reasons", async ({
  page,
}) => {
  await open(page);
  await step(page, 3);
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  const first = page.locator(".quiz-card").first();
  await first.getByRole("button").nth(0).click();
  await expect(first.getByRole("status")).toContainText("再想一想");
  await expect(first.getByRole("status")).toContainText("不是");
  await quiz(page);
  await expect(page.locator(".lesson-five .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("both prompt scenarios edit and copy with successful, missing and denied clipboard paths", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 Sizing Agent 指令");
  await page.getByRole("button", { name: "生成尺寸指令" }).click();
  await expect(draft).toHaveValue(/中间消息区域.*内部滚动/s);
  await page.getByLabel("实现场景").selectOption("catalog");
  await page.getByRole("button", { name: "重新生成尺寸草稿" }).click();
  await expect(draft).toHaveValue(/整页滚动.*全文入口/s);
  await draft.fill(
    (await draft.inputValue()) + "\n验收补充：保留最后一条消息。",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.sizingCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制尺寸指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.sizingCopied)).toContain("验收补充");
  for (const missing of [true, false]) {
    await page.evaluate(
      (missing) =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: missing
            ? undefined
            : {
                writeText: async () => {
                  throw Error("denied");
                },
              },
        }),
      missing,
    );
    await page.getByRole("button", { name: "复制尺寸指令" }).click();
    await expect(page.locator(".copy-feedback")).toContainText(
      "自动复制不可用",
    );
    await expect(draft).toBeFocused();
    expect(await draft.evaluate((e) => e.selectionEnd - e.selectionStart)).toBe(
      (await draft.inputValue()).length,
    );
  }
  await noOverflow(page);
});
test("late clipboard response cannot overwrite reset state", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  await page.getByRole("button", { name: "生成尺寸指令" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((resolve) => (window.resolveSizingCopy = resolve)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制尺寸指令" }).click();
  await page.getByRole("button", { name: "重置第五节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("可编辑的 Sizing Agent 指令")).not.toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "重置第五节进度" }).click();
  await page.getByRole("button", { name: "确认重置第五节" }).click();
  await page.evaluate(() => window.resolveSizingCopy());
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 Sizing Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});
test("corrupt/unavailable storage remains usable and full completion is stable", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("corruptSeeded")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 88,
          done: [null, 99],
          count: 999,
          minWidth: -5,
          box: "bad",
          answers: "bad",
          policiesSeen: ["bad"],
        }),
      );
      sessionStorage.setItem("corruptSeeded", "1");
    }
  }, key);
  await open(page);
  await expect(page.getByTestId("size-card")).toHaveCSS("width", "240px");
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成尺寸指令" }).click();
  await page
    .getByLabel("我已检查尺寸约束、滚动归属、全文入口和验收方式。")
    .check();
  await page
    .getByRole("button", { name: "完成第五节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-five .lesson-bottom")).toContainText(
    "5 / 5",
  );
  expect((await progress(page)).done.sort()).toEqual([0, 1, 2, 3, 4]);
  await expect(page.locator(".notice")).toContainText(
    "可以从课程目录继续 06 响应式",
  );
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 4);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("every fifth station and iframe passes axe and fits viewport", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#sizing-stage-heading")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(
          () => getComputedStyle(document.activeElement).outlineStyle,
        ),
      )
      .not.toBe("none");
    await axeCheck(page);
    if (i === 2) {
      const f = page.frames().find((f) => f !== page.mainFrame());
      await axeCheck(f);
    }
    await noOverflow(page);
  }
  await page.getByText("第五节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：box-sizing 的边界" }),
  ).toBeVisible();
  await axeCheck(page);
  await noOverflow(page);
});

async function completeFlow(page, act, toggle, edit) {
  async function directory(n) {
    const menu = page.getByRole("button", { name: "☰ 课程" });
    if (await menu.isVisible()) await act(menu, "open directory");
    await act(
      page
        .getByRole("navigation", { name: "课程目录" })
        .getByRole("button")
        .nth(n),
      "course " + (n + 1),
    );
  }
  const pick = (label, value) =>
      act(choice(page, label, value), label + " -> " + value),
    advance = () =>
      act(page.getByRole("button", { name: "完成并继续" }), "next station");
  for (const n of [1, 2, 3]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(4);
  await act(
    page.getByRole("button", { name: "完成并继续" }),
    "blocked before tasks",
  );
  await expect(page.locator(".notice")).toContainText("先完成");
  await pick("尺寸容器", "240px · 较窄");
  await pick("min-width", "320px");
  await pick("max-width", "100%");
  await pick("box-sizing", "content-box");
  await advance();
  await pick("文本容器", "240px · 较窄");
  await pick("标题长度", "超长标题");
  await toggle(
    page.getByLabel("允许主项目收缩 · min-width: 0"),
    "allow width shrink",
  );
  for (const policy of ["auto · 内部滚动", "clip · 裁切", "ellipsis · 省略"])
    await pick("标题溢出策略", policy);
  await act(
    page.getByRole("button", { name: "查看完整标题" }),
    "read full title",
  );
  await expect(page.locator("#sizing-full-title")).toBeVisible();
  await act(
    page.getByRole("button", { name: "收起完整标题" }),
    "close full title",
  );
  await advance();
  await act(page.getByRole("button", { name: "新增 2 条" }), "add messages 4");
  await act(page.getByRole("button", { name: "新增 2 条" }), "add messages 6");
  await act(
    page.getByRole("button", { name: "滚到消息末尾" }),
    "reach page end",
  );
  await pick("滚动结构", "消息区内部滚动");
  await toggle(
    page.getByLabel("允许中间 Flex 项收缩 · min-height: 0"),
    "allow height shrink",
  );
  await act(
    page.getByRole("button", { name: "滚到消息末尾" }),
    "reach inner end",
  );
  const f = page.frames().find((f) => f !== page.mainFrame());
  const iframeKeys = await f.evaluate(() => window.sizingKeys ?? []);
  await advance();
  const cards = page.locator(".quiz-card");
  await act(
    cards.nth(0).getByRole("button").nth(0),
    "intentional wrong answer",
  );
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(
    page.getByRole("button", { name: "生成尺寸指令" }),
    "generate prompt",
  );
  const draft = page.getByLabel("可编辑的 Sizing Agent 指令");
  await expect(draft).toHaveValue(/滚动归属.*截断边界.*全文入口/s);
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制尺寸指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查尺寸约束、滚动归属、全文入口和验收方式。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第五节" }), "finish lesson");
  await expect(page.locator(".lesson-five .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.sizingKeys ?? []);
  await page.reload();
  await directory(4);
  await expect(page.locator(".lesson-five .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(page.getByRole("button", { name: "重置第五节进度" }), "open reset");
  await act(
    page.getByRole("button", { name: "保留第五节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-five .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第五节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第五节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-five .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#sizing-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.draft).toBe("");
  expect(reset.count).toBe(2);
  expect(reset.fullRead).toBe(false);
  expect(reset.endsSeen).toEqual([]);
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.sizingKeys ?? []),
    iframeKeys,
  };
}
const clipboardDenied = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });
test("complete keyboard-only learning, wrong/retry, editable draft, refresh, cancel/reset preserve prior four lessons", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const trace = [];
  await page.addInitScript(clipboardDenied);
  await page.goto("/");
  async function seek(locator, name) {
    await expect(locator).toBeEnabled();
    for (let n = 0; n < 240; n++) {
      if (await locator.evaluate((e) => e === document.activeElement)) {
        const state = await locator.evaluate((e) => {
          const r = e.getBoundingClientRect(),
            at = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
          return {
            outline: getComputedStyle(e).outlineStyle,
            visible: r.top >= 0 && r.bottom <= innerHeight + 1,
            covered: at !== e && !e.contains(at),
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
    await seek(draft, "edit draft");
    await page.keyboard.press("Control+End");
    await page.keyboard.type("\nReview: preserve every message.");
  });
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...result }, null, 2),
  );
});
test("zero-keyboard 375px touch-only completion, retry, copy fallback, refresh and reset", async ({
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
  await page.addInitScript(clipboardDenied);
  await page.addInitScript(() => {
    window.sizingKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.sizingKeys.push(e.key));
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
