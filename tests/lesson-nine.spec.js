import { assertRemainingPlans32 } from "./catalog-boundary.js";
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson9.v1",
  priorKeys = [1, 2, 3, 4, 5, 6, 7, 8].map(
    (n) => `frontend-observatory.lesson${n}.v1`,
  ),
  out = "/tmp/glow-acceptance";
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await nav.getByRole("button").nth(n).click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 8);
  await expect(page.locator("#glow-stage-heading")).toBeVisible();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
const choose = (page, label, value) => choice(page, label, value).click();
const step = (page, n) =>
  page
    .getByRole("navigation", { name: "第九节学习步骤" })
    .getByRole("button")
    .nth(n)
    .click();
const next = (page) => page.getByRole("button", { name: "完成并继续" }).click();
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
  await choose(page, "渐变类型", "radial · 辐射");
  await choose(page, "径向 / 环绕中心", "左上");
  await choose(page, "渐变类型", "conic · 环绕");
  await choose(page, "渐变色组", "暖橙与紫");
  await choose(page, "方向 / 起始角度", "180deg");
  await next(page);
  await page.getByLabel("显示右侧额外光晕").uncheck();
  await page.getByLabel("显示右侧额外光晕").check();
  await choose(page, "额外光源位置", "右上");
  await choose(page, "额外光源强度", "0.90 · 较强");
  await choose(page, "装饰层模糊", "24px");
  await next(page);
  await choose(page, "聚光位置", "左上");
  await choose(page, "聚光强度", "0 · 无聚光");
  await choose(page, "聚光强度", "0.80 · 较强");
  await page.getByTestId("spot-action").click();
  await expect(page.getByTestId("spot-result")).toContainText(
    "真实命中：收藏按钮",
  );
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [0, 1, 0].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
async function pseudo(page) {
  return page.getByTestId("layered-poster-art").evaluate((el) => {
    const s = getComputedStyle(el, "::before");
    return {
      content: s.content,
      opacity: s.opacity,
      filter: s.filter,
      image: s.backgroundImage,
      pointer: s.pointerEvents,
    };
  });
}
test("ninth available and numbered32 opens; tools stay planned; lesson is loaded on demand", async ({
  page,
}) => {
  const loaded = [];
  page.on("request", (r) => loaded.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(loaded.some((u) => /lesson-nine-.*\.js/.test(u))).toBe(false);
  await course(page, 8);
  await expect(page.locator("#glow-stage-heading")).toBeVisible();
  expect(loaded.some((u) => /lesson-nine-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("渐变光晕 · 前端观察室");
  await expect(
    page.getByRole("heading", { name: "渐变与光晕." }),
  ).toBeVisible();
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator(".site-footer")).toContainText("01–32");
  await course(page, 31);
  await expect(page.getByRole("heading", { name: "Infinite Canvas." })).toBeVisible();
  await assertRemainingPlans32(page, expect);
});
test("three native gradient types, angle, palette and center affect the correct CSS input", async ({
  page,
}) => {
  await open(page);
  const art = page.getByTestId("gradient-poster-art");
  await expect(art).toHaveCSS("background-image", /^linear-gradient/);
  const first = await art.evaluate((e) => getComputedStyle(e).backgroundImage);
  await choose(page, "径向 / 环绕中心", "左上");
  await expect(art).toHaveCSS("background-image", first);
  expect((await progress(page)).positionChanged).toBe(false);
  await choose(page, "渐变类型", "radial · 辐射");
  await expect(art).toHaveCSS(
    "background-image",
    /radial-gradient\(circle at 25% 25%/,
  );
  const radial = await art.evaluate((e) => getComputedStyle(e).backgroundImage);
  await choose(page, "方向 / 起始角度", "180deg");
  await expect(art).toHaveCSS("background-image", radial);
  expect((await progress(page)).angleChanged).toBe(false);
  await expect(page.getByTestId("gradient-reading")).toContainText(
    "角度控件不改变",
  );
  await choose(page, "径向 / 环绕中心", "右上");
  await expect(art).toHaveCSS("background-image", /75% 25%/);
  await choose(page, "渐变类型", "conic · 环绕");
  await expect(art).toHaveCSS(
    "background-image",
    /conic-gradient\(from 180deg at 75% 25%/,
  );
  await choose(page, "渐变色组", "蓝与青");
  await expect(art).toHaveCSS("background-image", /rgb\(72, 135, 208\)/);
  await noOverflow(page);
});
test("unsupported requested conic has an explicit simple CSS fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = (a, b) =>
      a === "background-image" && String(b).startsWith("conic-gradient")
        ? false
        : original(a, b);
  });
  await open(page);
  await choose(page, "渐变类型", "conic · 环绕");
  await expect(page.getByTestId("gradient-poster-art")).toHaveCSS(
    "background-image",
    /^linear-gradient/,
  );
  await expect(page.getByTestId("gradient-reading")).toContainText("回退");
  await axeCheck(page);
});
test("comparison uses a real empty pseudo-element, supports zero/off, position and separate blur", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  await expect(page.locator(".task-footer li").first()).toContainText(
    "比较右侧光晕的开关状态",
  );
  await page.getByLabel("显示右侧额外光晕").uncheck();
  await expect(page.locator(".task-footer li").first()).toHaveClass("done");
  expect((await progress(page)).overlayOnSeen).toBe(true);
  await page.getByLabel("显示右侧额外光晕").check();
  const left = page.getByTestId("simple-poster-art"),
    right = page.getByTestId("layered-poster-art");
  expect(await left.evaluate((e) => getComputedStyle(e).backgroundImage)).toBe(
    await right.evaluate((e) => getComputedStyle(e).backgroundImage),
  );
  expect(await pseudo(page)).toMatchObject({
    content: '""',
    opacity: "0.55",
    filter: "blur(12px)",
    pointer: "none",
  });
  await choose(page, "额外光源位置", "右上");
  expect((await pseudo(page)).image).toContain("75% 25%");
  await choose(page, "装饰层模糊", "0px");
  expect((await pseudo(page)).filter).toBe("blur(0px)");
  await expect(page.getByTestId("overlay-reading")).toContainText(
    "本身也能形成柔和过渡",
  );
  await choose(page, "额外光源强度", "0 · 关闭强度");
  expect((await pseudo(page)).opacity).toBe("0");
  await expect(page.getByTestId("overlay-reading")).toContainText(
    "没有可见光晕",
  );
  for (let i = 0; i < 3; i++) {
    await page.getByLabel("显示右侧额外光晕").uncheck();
    expect((await pseudo(page)).content).toBe("none");
    await page.getByLabel("显示右侧额外光晕").check();
    expect((await pseudo(page)).content).toBe('""');
  }
  await expect(right).toHaveCSS("filter", "none");
  await expect(
    page.getByTestId("layered-poster").locator(".glow-copy"),
  ).toHaveCSS("filter", "none");
  await noOverflow(page);
});
test("decorations cannot intercept actual repeated actions; text status and visible focus remain at zero intensity", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  const action = page.getByTestId("spot-action"),
    art = page.getByTestId("spot-poster-art");
  await choose(page, "聚光位置", "右上");
  await choose(page, "聚光强度", "0.80 · 较强");
  await choose(page, "聚光范围", "较宽");
  await expect(art).toHaveCSS("pointer-events", "none");
  expect(
    await art.evaluate((e) => getComputedStyle(e, "::before").pointerEvents),
  ).toBe("none");
  for (let i = 0; i < 4; i++) {
    await action.click();
    await expect(action).toHaveAttribute(
      "aria-pressed",
      i % 2 === 0 ? "true" : "false",
    );
    await expect(page.getByTestId("spot-result")).toContainText(
      "真实命中：收藏按钮",
    );
  }
  await choose(page, "聚光强度", "0 · 无聚光");
  await action.click();
  await expect(
    page.getByTestId("spot-poster").getByRole("status"),
  ).toContainText("✓ 已收藏");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(action).toBeFocused();
  await expect(action).toHaveCSS("outline-width", "3px");
  await page.getByLabel("检查更长的完整内容").check();
  await expect(page.getByTestId("spot-poster")).toContainText(
    "不把隐藏重要内容",
  );
  await noOverflow(page);
});
test("all decorative effects remain static with both motion preferences", async ({
  page,
}) => {
  await open(page);
  for (const preference of ["no-preference", "reduce"]) {
    await page.emulateMedia({ reducedMotion: preference });
    for (let i = 0; i < 3; i++) {
      await step(page, i);
      expect(
        await page
          .locator(".glow-art")
          .evaluateAll(
            (es) =>
              es.flatMap((e) => e.getAnimations({ subtree: true })).length,
          ),
      ).toBe(0);
      await noOverflow(page);
    }
  }
  await choose(page, "聚光位置", "左上");
  expect((await progress(page)).spotMoved).toBe(true);
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.getByTestId("spot-action")).toBeVisible();
  await expect(
    page.getByTestId("spot-poster").getByRole("status"),
  ).toContainText("文字状态");
});
test("wrong answer has reasons and retry; empty tasks cannot be marked complete", async ({
  page,
}) => {
  await open(page);
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await step(page, 3);
  await page.locator(".quiz-card").first().getByRole("button").nth(1).click();
  await expect(page.locator(".quiz-feedback").first()).toContainText(
    "再想一想",
  );
  await expect(page.locator(".quiz-feedback").first()).toContainText("按角度");
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await quiz(page);
  await expect(page.locator(".lesson-nine .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("two editable briefs include simple tools source position layering and readability; copy paths are truthful", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 渐变光晕 Agent 指令");
  await page.getByRole("button", { name: "生成渐变光晕指令" }).click();
  await expect(draft).toHaveValue(
    /介绍区.*光源合同.*装饰与层级.*可读性.*工具边界/s,
  );
  await page.getByLabel("实现场景").selectOption("card");
  await page.getByRole("button", { name: "重新生成渐变光晕草稿" }).click();
  await expect(draft).toHaveValue(/资料卡片/);
  await page.getByLabel("我已检查光源、层级、可读性和验收方式。").check();
  await draft.fill((await draft.inputValue()) + "\n关闭光晕仍保留清楚边界。");
  await expect(
    page.getByLabel("我已检查光源、层级、可读性和验收方式。"),
  ).not.toBeChecked();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.glowCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制渐变光晕指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.glowCopied)).toContain("清楚边界");
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
    await page.getByRole("button", { name: "复制渐变光晕指令" }).click();
    await expect(page.locator(".copy-feedback")).toContainText(
      "自动复制不可用",
    );
    await expect(draft).toBeFocused();
    expect(await draft.evaluate((e) => e.selectionEnd - e.selectionStart)).toBe(
      (await draft.inputValue()).length,
    );
  }
});
test("late clipboard completion cannot repopulate reset lesson", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  await page.getByRole("button", { name: "生成渐变光晕指令" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r) => (window.resolveGlowCopy = r)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制渐变光晕指令" }).click();
  await page.getByRole("button", { name: "重置第九节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("可编辑的 渐变光晕 Agent 指令")).not.toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "重置第九节进度" }).click();
  await page.getByRole("button", { name: "确认重置第九节" }).click();
  await page.evaluate(() => window.resolveGlowCopy());
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 渐变光晕 Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});
test("corrupt storage sanitizes, completion counts once, and unavailable storage is reported", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          type: "bad",
          palette: "bad",
          angle: 999,
          strength: 99,
          done: [99, null],
          answers: "bad",
        }),
      );
      sessionStorage.setItem("seed", "1");
    }
  }, key);
  await open(page);
  await expect(page.getByTestId("gradient-poster-art")).toHaveCSS(
    "background-image",
    /^linear-gradient/,
  );
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成渐变光晕指令" }).click();
  await page.getByLabel("我已检查光源、层级、可读性和验收方式。").check();
  await page
    .getByRole("button", { name: "完成第九节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-nine .lesson-bottom")).toContainText(
    "5 / 5",
  );
  expect((await progress(page)).done.sort()).toEqual([0, 1, 2, 3, 4]);
  await expect(page.locator(".notice")).toContainText("可以从课程目录继续 10");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 8);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("every station gradient palette extra layer and long content pass axe and fit viewport", async ({
  page,
}) => {
  await open(page);
  for (const type of ["linear · 直线", "radial · 辐射", "conic · 环绕"]) {
    await choose(page, "渐变类型", type);
    await axeCheck(page);
  }
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#glow-stage-heading")).toBeFocused();
    await axeCheck(page);
    await noOverflow(page);
  }
  await step(page, 2);
  await page.getByLabel("检查更长的完整内容").check();
  await page.getByTestId("spot-action").click();
  await axeCheck(page);
  await page.getByText("第九节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：conic-gradient ↗", exact: true }),
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
  for (const n of [1, 2, 3, 4, 5, 6, 7]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(8);
  await act(
    page.getByRole("button", { name: "完成并继续" }),
    "blocked before tasks",
  );
  await expect(page.locator(".notice")).toContainText("先完成");
  await pick("渐变类型", "radial · 辐射");
  await pick("径向 / 环绕中心", "左上");
  await pick("渐变类型", "conic · 环绕");
  await pick("渐变色组", "暖橙与紫");
  await pick("方向 / 起始角度", "180deg");
  await advance();
  await toggle(page.getByLabel("显示右侧额外光晕"), "disable extra glow");
  await toggle(page.getByLabel("显示右侧额外光晕"), "enable extra glow");
  await pick("额外光源位置", "右上");
  await pick("额外光源强度", "0.90 · 较强");
  await pick("装饰层模糊", "24px");
  await advance();
  await pick("聚光位置", "左上");
  await pick("聚光强度", "0 · 无聚光");
  await pick("聚光强度", "0.80 · 较强");
  await act(page.getByTestId("spot-action"), "save with decorative layer");
  await expect(page.getByTestId("spot-result")).toContainText(
    "真实命中：收藏按钮",
  );
  await advance();
  const cards = page.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(1), "wrong answer");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [0, 1, 0].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(page.getByRole("button", { name: "生成渐变光晕指令" }), "generate");
  const draft = page.getByLabel("可编辑的 渐变光晕 Agent 指令");
  await expect(draft).toHaveValue(/光源合同.*装饰与层级.*可读性.*工具边界/s);
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制渐变光晕指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查光源、层级、可读性和验收方式。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第九节" }), "finish");
  await expect(page.locator(".lesson-nine .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.glowKeys ?? null);
  await page.reload();
  await directory(8);
  await expect(page.locator(".lesson-nine .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(page.getByRole("button", { name: "重置第九节进度" }), "open reset");
  await act(
    page.getByRole("button", { name: "保留第九节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-nine .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第九节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第九节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-nine .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#glow-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.overlay).toBe(true);
  expect(reset.saved).toBe(false);
  expect(reset.hitVerified).toBe(false);
  expect(reset.draft).toBe("");
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.glowKeys ?? null),
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
test("complete keyboard-only glow experiments retry edit refresh and cancel/confirm reset", async ({
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
            hit = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
          return {
            outline: getComputedStyle(e).outlineStyle,
            visible: r.top >= 0 && r.bottom <= innerHeight + 1,
            covered: hit !== e && !e.contains(hit),
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
    await page.keyboard.type("\nReview: preserve text and focus.");
  });
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...result }, null, 2),
  );
});
test("zero-keyboard touch-only glow learning retry refresh cancel and confirm reset", async ({
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
    window.glowKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.glowKeys.push(e.key));
  });
  await page.goto("/");
  const tap = async (locator, name) => {
    await locator.tap();
    trace.push(name);
  };
  const result = await completeFlow(page, tap, tap);
  expect(result.keysBeforeReload).toEqual([]);
  expect(result.keysAfterReload).toEqual([]);
  expect(result.completed.done.sort()).toEqual([0, 1, 2, 3, 4]);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/touch-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...result }, null, 2),
  );
  await context.close();
});
