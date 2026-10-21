import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson7.v1",
  priorKeys = [1, 2, 3, 4, 5, 6].map(
    (n) => `frontend-observatory.lesson${n}.v1`,
  ),
  out = "/tmp/surface-acceptance";
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await nav.getByRole("button").nth(n).click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 6);
  await expect(page.locator("#surface-stage-heading")).toBeVisible();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
const choose = (page, label, value) => choice(page, label, value).click();
const step = (page, n) =>
  page
    .getByRole("navigation", { name: "第七节学习步骤" })
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
  await choose(page, "卡片圆角", "28px");
  await choose(page, "卡片边框", "2px");
  await choose(page, "表面亮度", "更暗");
  await choose(page, "卡片阴影", "较强阴影");
  await choose(page, "卡片阴影", "无阴影");
  await page.getByRole("button", { name: "标记已读", exact: true }).click();
  await next(page);
  await choose(page, "透明素材形状", "圆环");
  await choose(page, "向下偏移", "14px");
  await choose(page, "模糊参数", "0px");
  await page.getByLabel("给透明素材铺白底").check();
  await next(page);
  await choose(page, "A 的视觉阴影", "较强阴影");
  await page.getByRole("button", { name: "测量真实重叠点" }).click();
  await expect(page.getByTestId("elevation-result")).toContainText(
    "真实命中：B",
  );
  await choose(page, "A 的真实 z-index", "3 · 高于 B");
  await page.getByRole("button", { name: "测量真实重叠点" }).click();
  await expect(page.getByTestId("elevation-result")).toContainText(
    "真实命中：A",
  );
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [0, 1, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
test("seventh available, tenth unmade, existing route and tags remain plans", async ({
  page,
}) => {
  await open(page);
  await expect(page).toHaveTitle("圆角阴影层级 · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(9);
  await expect(page.locator(".site-footer")).toContainText("01–09");
  await course(page, 9);
  await expect(page.getByRole("heading", { name: "Mask/Clip Path" })).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("radius border shadow and brightness change actual CSS while fixed reference stays intact", async ({
  page,
}) => {
  await open(page);
  const live = page.getByTestId("live-surface"),
    reference = page.getByTestId("reference-surface");
  await choose(page, "卡片圆角", "28px");
  await expect(live).toHaveCSS("border-radius", "28px");
  await expect(reference).toHaveCSS("border-radius", "12px");
  await choose(page, "卡片边框", "0px");
  await expect(live).toHaveCSS("border-top-width", "0px");
  await choose(page, "表面亮度", "更暗");
  await expect(live).toHaveCSS("background-color", "rgb(216, 204, 233)");
  await expect(reference).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await choose(page, "卡片阴影", "无阴影");
  await expect(live).toHaveCSS("box-shadow", "none");
  await choose(page, "卡片阴影", "较强阴影");
  await expect(live).not.toHaveCSS("box-shadow", "none");
  await page.getByLabel("显示固定参考对照").uncheck();
  await expect(reference).toHaveCount(0);
  await page.getByLabel("使用更长的完整说明").check();
  await expect(live).toContainText("重要文字与操作");
  expect(await live.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await noOverflow(page);
});
test("state has text symbol and aria even without shadow; keyboard focus survives forced colors", async ({
  page,
}) => {
  await open(page);
  await choose(page, "卡片阴影", "无阴影");
  await choose(page, "卡片边框", "0px");
  const button = page.getByRole("button", { name: "标记已读", exact: true });
  await button.click();
  const reset = page.getByRole("button", { name: "恢复待读", exact: true });
  await expect(reset).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("live-surface").getByRole("status")).toHaveText(
    "✓ 已读 · 有文字标记",
  );
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(reset).toBeFocused();
  await expect(reset).toHaveCSS("outline-style", "solid");
  await expect(reset).toHaveCSS("outline-width", "3px");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(reset).toBeVisible();
  await expect(reset).not.toHaveCSS("outline-style", "none");
  await expect(
    page.getByTestId("live-surface").getByRole("status"),
  ).toContainText("已读");
  await page.emulateMedia({ forcedColors: "none" });
});
test("same transparent SVG has different real shadow properties, hole, shape and opaque input", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  const box = page.getByTestId("asset-box"),
    alpha = page.getByTestId("asset-alpha");
  expect(await box.boundingBox()).toMatchObject({ width: 190, height: 133 });
  expect(await alpha.boundingBox()).toMatchObject({ width: 190, height: 133 });
  await expect(box).not.toHaveCSS("box-shadow", "none");
  await expect(box).toHaveCSS("filter", "none");
  await expect(alpha).toHaveCSS("box-shadow", "none");
  await expect(alpha).not.toHaveCSS("filter", "none");
  await expect(alpha.locator("path")).toHaveAttribute("fill-rule", "evenodd");
  const before = await alpha.locator("path").getAttribute("d");
  await choose(page, "透明素材形状", "圆环");
  expect(await alpha.locator("path").getAttribute("d")).not.toBe(before);
  expect(await alpha.locator("path").getAttribute("d")).toBe(
    await box.locator("path").getAttribute("d"),
  );
  await choose(page, "模糊参数", "0px");
  await choose(page, "向下偏移", "14px");
  await choose(page, "box-shadow 扩散", "8px");
  await expect(box).toHaveCSS("box-shadow", /14px 0px 8px/);
  await expect(alpha).toHaveCSS("filter", /drop-shadow/);
  await expect(alpha.locator("rect")).toHaveCount(0);
  await page.getByLabel("给透明素材铺白底").check();
  await expect(alpha.locator("rect")).toHaveAttribute("fill", "#ffffff");
  await expect(box.locator("rect")).toHaveCount(1);
  await page.getByLabel("给透明素材铺白底").uncheck();
  await expect(alpha.locator("rect")).toHaveCount(0);
  await axeCheck(page);
  await noOverflow(page);
});
test("visual shadow cannot raise actual overlap order; measurements repeat with visible focus", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  const measure = page.getByRole("button", { name: "测量真实重叠点" }),
    result = page.getByTestId("elevation-result");
  await choose(page, "A 的视觉阴影", "较强阴影");
  for (let i = 0; i < 3; i++) {
    await measure.click();
    await expect(result).toContainText("真实命中：B");
  }
  await choose(page, "A 的真实 z-index", "3 · 高于 B");
  await measure.click();
  await expect(result).toContainText("真实命中：A");
  await choose(page, "A 的视觉阴影", "无阴影");
  await measure.click();
  await expect(result).toContainText("真实命中：A");
  expect(
    await measure.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    }),
  ).toBe(true);
  await expect(measure).toBeFocused();
  expect((await progress(page)).measuredBack).toBe(true);
  expect((await progress(page)).measuredFront).toBe(true);
  await choose(page, "A 的真实 z-index", "1 · 低于 B");
  await measure.click();
  await expect(result).toContainText("真实命中：B");
  await noOverflow(page);
});
test("judgment retries with explanation and gate cannot be bypassed", async ({
  page,
}) => {
  await open(page);
  await step(page, 3);
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  const first = page.locator(".quiz-card").first();
  await first.getByRole("button").nth(1).click();
  await expect(first.getByRole("status")).toContainText("再想一想");
  await expect(first.getByRole("status")).toContainText("alpha");
  await quiz(page);
  await expect(page.locator(".lesson-seven .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("both editable briefs and clipboard success missing and denied paths are truthful", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 表面 Agent 指令");
  await page.getByRole("button", { name: "生成表面指令" }).click();
  await expect(draft).toHaveValue(/资料卡片界面.*表面合同.*焦点/s);
  await page.getByLabel("实现场景").selectOption("asset");
  await page.getByRole("button", { name: "重新生成表面草稿" }).click();
  await expect(draft).toHaveValue(/透明轮廓与镂空/);
  await draft.fill((await draft.inputValue()) + "\n检查清楚的边界。");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.surfaceCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制表面指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.surfaceCopied)).toContain(
    "清楚的边界",
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
    await page.getByRole("button", { name: "复制表面指令" }).click();
    await expect(page.locator(".copy-feedback")).toContainText(
      "自动复制不可用",
    );
    await expect(draft).toBeFocused();
    expect(await draft.evaluate((e) => e.selectionEnd - e.selectionStart)).toBe(
      (await draft.inputValue()).length,
    );
  }
});
test("late clipboard response cannot repopulate reset state", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  await page.getByRole("button", { name: "生成表面指令" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r) => (window.resolveSurfaceCopy = r)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制表面指令" }).click();
  await page.getByRole("button", { name: "重置第七节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("可编辑的 表面 Agent 指令")).not.toHaveValue("");
  await page.getByRole("button", { name: "重置第七节进度" }).click();
  await page.getByRole("button", { name: "确认重置第七节" }).click();
  await page.evaluate(() => window.resolveSurfaceCopy());
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 表面 Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});
test("corrupt and unavailable storage stays usable and completion counts once", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          radius: 999,
          shadow: "bad",
          brightness: "bad",
          done: [9, null],
          answers: "bad",
        }),
      );
      sessionStorage.setItem("seed", "1");
    }
  }, key);
  await open(page);
  await expect(page.getByTestId("live-surface")).toHaveCSS(
    "border-radius",
    "12px",
  );
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成表面指令" }).click();
  await page.getByLabel("我已检查表面、边界、状态、焦点和验收方式。").check();
  await page
    .getByRole("button", { name: "完成第七节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-seven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(page.locator(".notice")).toContainText("可以从课程目录继续 08");
  expect((await progress(page)).done.sort()).toEqual([0, 1, 2, 3, 4]);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 6);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("each station and every surface brightness is accessible and fits viewport", async ({
  page,
}) => {
  await open(page);
  for (const brightness of ["白色", "浅色", "更暗"]) {
    await choose(page, "表面亮度", brightness);
    await axeCheck(page);
  }
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#surface-stage-heading")).toBeFocused();
    await axeCheck(page);
    await noOverflow(page);
  }
  await page.getByText("第七节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "MDN：drop-shadow 与 alpha" }),
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
  for (const n of [1, 2, 3, 4, 5]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(6);
  await act(
    page.getByRole("button", { name: "完成并继续" }),
    "blocked before tasks",
  );
  await expect(page.locator(".notice")).toContainText("先完成");
  await pick("卡片圆角", "28px");
  await pick("卡片边框", "2px");
  await pick("表面亮度", "更暗");
  await pick("卡片阴影", "较强阴影");
  await pick("卡片阴影", "无阴影");
  await act(
    page.getByRole("button", { name: "标记已读", exact: true }),
    "mark read without shadow",
  );
  await expect(
    page.getByTestId("live-surface").getByRole("status"),
  ).toContainText("✓ 已读");
  await advance();
  await pick("透明素材形状", "圆环");
  await pick("向下偏移", "14px");
  await pick("模糊参数", "0px");
  await toggle(page.getByLabel("给透明素材铺白底"), "opaque background");
  await advance();
  await pick("A 的视觉阴影", "较强阴影");
  await act(
    page.getByRole("button", { name: "测量真实重叠点" }),
    "measure shadow behind B",
  );
  await expect(page.getByTestId("elevation-result")).toContainText(
    "真实命中：B",
  );
  await pick("A 的真实 z-index", "3 · 高于 B");
  await act(
    page.getByRole("button", { name: "测量真实重叠点" }),
    "measure raised A",
  );
  await expect(page.getByTestId("elevation-result")).toContainText(
    "真实命中：A",
  );
  await advance();
  const cards = page.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(1), "wrong answer");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [0, 1, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(page.getByRole("button", { name: "生成表面指令" }), "generate");
  const draft = page.getByLabel("可编辑的 表面 Agent 指令");
  await expect(draft).toHaveValue(/表面合同.*状态与焦点/s);
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制表面指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查表面、边界、状态、焦点和验收方式。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第七节" }), "finish");
  await expect(page.locator(".lesson-seven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.surfaceKeys ?? null);
  await page.reload();
  await directory(6);
  await expect(page.locator(".lesson-seven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(page.getByRole("button", { name: "重置第七节进度" }), "open reset");
  await act(
    page.getByRole("button", { name: "保留第七节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-seven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第七节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第七节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-seven .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#surface-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.marked).toBe(false);
  expect(reset.stateUsed).toBe(false);
  expect(reset.measuredBack).toBe(false);
  expect(reset.draft).toBe("");
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.surfaceKeys ?? null),
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
test("complete keyboard-only surface experiments retry edit refresh and cancel/confirm reset", async ({
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
test("zero-keyboard touch-only surface learning retry refresh cancel and confirm reset", async ({
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
    window.surfaceKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.surfaceKeys.push(e.key));
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
