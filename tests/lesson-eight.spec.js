import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson8.v1",
  priorKeys = [1, 2, 3, 4, 5, 6, 7].map(
    (n) => `frontend-observatory.lesson${n}.v1`,
  ),
  out = "/tmp/glass-acceptance";
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await nav.getByRole("button").nth(n).click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 7);
  await expect(page.locator("#glass-stage-heading")).toBeVisible();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
const choose = (page, label, value) => choice(page, label, value).click();
const step = (page, n) =>
  page
    .getByRole("navigation", { name: "第八节学习步骤" })
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
  await choose(page, "滤镜作用对象", "filter · 自身");
  await choose(page, "滤镜作用对象", "backdrop · 背后");
  await choose(page, "实验模糊强度", "6px");
  await next(page);
  await choose(page, "白色背景 alpha", "0.20 · 更透");
  await choose(page, "手动背景位置", "位置 B");
  await page.getByLabel("面板改成不透明白底").check();
  await page.getByLabel("移除背后图案").check();
  await next(page);
  await choose(page, "背板作用范围", "较大 · 90%");
  await choose(page, "成本实验半径", "24px");
  await page.getByLabel("模拟不支持 backdrop-filter").check();
  await page.getByLabel("我已确认文字底色、边框与文字状态仍清楚").check();
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [1, 0, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
test("eighth available and ninth remains unmade with unified catalog", async ({
  page,
}) => {
  await open(page);
  await expect(page).toHaveTitle("毛玻璃 · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(8);
  await expect(page.locator(".site-footer")).toContainText("01–08");
  await course(page, 8);
  await expect(page.getByRole("heading", { name: "渐变光晕" })).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("same real scene switches own filter and backdrop, adjusts blur and keeps external readable equivalent", async ({
  page,
}) => {
  await open(page);
  const panel = page.getByTestId("glass-pane");
  await expect(panel).toHaveCSS("filter", "none");
  await expect(panel).toHaveCSS("backdrop-filter", "none");
  await choose(page, "滤镜作用对象", "filter · 自身");
  await expect(panel).toHaveCSS("filter", "blur(12px)");
  await expect(panel).toHaveCSS("backdrop-filter", "none");
  await expect(page.getByTestId("glass-target-reading")).toContainText(
    "面板原文",
  );
  await choose(page, "滤镜作用对象", "backdrop · 背后");
  await expect(panel).toHaveCSS("filter", "none");
  await expect(panel).toHaveCSS("backdrop-filter", "blur(12px)");
  await choose(page, "实验模糊强度", "0px");
  await expect(panel).toHaveCSS("backdrop-filter", "blur(0px)");
  await expect(page.getByTestId("glass-target-reading")).toContainText(
    "不模糊",
  );
  await choose(page, "滤镜作用对象", "filter · 自身");
  await expect(panel).toHaveCSS("filter", "blur(0px)");
  await expect(page.getByTestId("glass-target-reading")).toContainText(
    "自身内容保持原样",
  );
  await choose(page, "实验模糊强度", "6px");
  await choose(page, "滤镜作用对象", "backdrop · 背后");
  await expect(panel).toHaveCSS("backdrop-filter", "blur(6px)");
  await noOverflow(page);
});
test("alpha opaque empty and manual movement change real inputs without changing whole opacity", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  const panel = page.getByTestId("glass-pane"),
    background = page.getByTestId("glass-background");
  await choose(page, "白色背景 alpha", "0.20 · 更透");
  await expect(panel).toHaveCSS("background-color", "rgba(255, 255, 255, 0.2)");
  await expect(panel).toHaveCSS("opacity", "1");
  await choose(page, "手动背景位置", "位置 C");
  await expect(background).toHaveCSS("animation-play-state", "paused");
  await expect(page.locator(".glass-backdrop-position")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, -96, 0)",
  );
  await page.getByLabel("面板改成不透明白底").check();
  await expect(panel).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.getByTestId("glass-condition-reading")).toContainText(
    "挡住",
  );
  await page.getByLabel("面板改成不透明白底").uncheck();
  await page.getByLabel("移除背后图案").check();
  await expect(background).toHaveCSS("visibility", "hidden");
  await expect(page.getByTestId("glass-condition-reading")).toContainText(
    "没有可见图案",
  );
  await page.getByLabel("移除背后图案").uncheck();
  await expect(background).toHaveCSS("visibility", "visible");
  await noOverflow(page);
});
test("background pauses repeats and honors reduced motion initially and on live changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const bg = page.getByTestId("glass-background");
  await expect(bg).toHaveCSS("animation-name", "none");
  await expect(
    page.getByRole("button", { name: "系统偏好：已停止背景运动" }),
  ).toBeDisabled();
  await step(page, 1);
  await choose(page, "手动背景位置", "位置 B");
  expect((await progress(page)).moved).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(bg).toHaveCSS("animation-play-state", "paused");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "播放背景", exact: true }).click();
    await expect(bg).toHaveCSS("animation-play-state", "running");
    await page.getByRole("button", { name: "暂停背景", exact: true }).click();
    await expect(bg).toHaveCSS("animation-play-state", "paused");
  }
  await page.getByRole("button", { name: "播放背景", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(bg).toHaveCSS("animation-name", "none");
  await expect(bg).toHaveCSS("animation-play-state", "paused");
  await expect(page.getByTestId("glass-motion-status")).toContainText(
    "手动移动仍可用",
  );
  await axeCheck(page);
});
test("actual no-support and prefixed capability branches use readable fallback or enhancement", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = (a, b) =>
      a.includes("backdrop-filter") ? false : original(a, b);
  });
  await open(page);
  await choose(page, "滤镜作用对象", "backdrop · 背后");
  const panel = page.getByTestId("glass-pane");
  await expect(panel).toHaveCSS("backdrop-filter", "none");
  await expect(panel).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.getByTestId("glass-target-reading")).toContainText(
    "不支持",
  );
  await step(page, 1);
  await expect(page.getByTestId("glass-condition-reading")).toContainText(
    "不支持",
  );
  await step(page, 2);
  await expect(page.getByTestId("glass-support-reading")).toContainText(
    "不透明回退",
  );
  await axeCheck(page);
});
test("WebKit-only capability is recognized and force fallback can be repeatedly reversed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = (a, b) =>
      a === "backdrop-filter"
        ? false
        : a === "-webkit-backdrop-filter"
          ? true
          : original(a, b);
  });
  await open(page);
  await step(page, 2);
  const panel = page.getByTestId("glass-pane"),
    small = (await panel.boundingBox()).width;
  await expect(panel).toHaveCSS("backdrop-filter", "blur(12px)");
  await choose(page, "背板作用范围", "较大 · 90%");
  expect((await panel.boundingBox()).width).toBeGreaterThan(small * 1.2);
  await choose(page, "成本实验半径", "24px");
  await expect(panel).toHaveCSS("backdrop-filter", "blur(24px)");
  for (let i = 0; i < 3; i++) {
    await page.getByLabel("模拟不支持 backdrop-filter").check();
    await expect(panel).toHaveCSS("backdrop-filter", "none");
    await expect(panel).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.getByLabel("模拟不支持 backdrop-filter").uncheck();
    await expect(panel).toHaveCSS("backdrop-filter", "blur(24px)");
  }
  await expect(panel.locator(".glass-readable")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(panel).toContainText("◇ 信息面板");
  await noOverflow(page);
});
test("retry reasons and task gates teach constraints rather than acknowledging a click", async ({
  page,
}) => {
  await open(page);
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await step(page, 3);
  await page.locator(".quiz-card").first().getByRole("button").nth(0).click();
  await expect(page.locator(".quiz-feedback").first()).toContainText(
    "再想一想",
  );
  await expect(page.locator(".quiz-feedback").first()).toContainText(
    "元素自身",
  );
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await quiz(page);
  await expect(page.locator(".lesson-eight .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("editable two briefs clipboard success missing denial and review invalidation are truthful", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 毛玻璃 Agent 指令");
  await page.getByRole("button", { name: "生成毛玻璃指令" }).click();
  await expect(draft).toHaveValue(
    /局部毛玻璃.*透明条件.*可读性与回退.*prefers-reduced-motion/s,
  );
  await page.getByLabel("实现场景").selectOption("bar");
  await page.getByRole("button", { name: "重新生成毛玻璃草稿" }).click();
  await expect(draft).toHaveValue(/导航栏/);
  await page.getByLabel("我已检查背景、可读性、回退和验收方式。").check();
  await draft.fill((await draft.inputValue()) + "\n核对真实背景。");
  await expect(
    page.getByLabel("我已检查背景、可读性、回退和验收方式。"),
  ).not.toBeChecked();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.glassCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制毛玻璃指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.glassCopied)).toContain(
    "核对真实背景",
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
    await page.getByRole("button", { name: "复制毛玻璃指令" }).click();
    await expect(page.locator(".copy-feedback")).toContainText(
      "自动复制不可用",
    );
    await expect(draft).toBeFocused();
    expect(await draft.evaluate((e) => e.selectionEnd - e.selectionStart)).toBe(
      (await draft.inputValue()).length,
    );
  }
});
test("late clipboard result never repopulates reset progress", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  await page.getByRole("button", { name: "生成毛玻璃指令" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r) => (window.resolveGlassCopy = r)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制毛玻璃指令" }).click();
  await page.getByRole("button", { name: "重置第八节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("可编辑的 毛玻璃 Agent 指令")).not.toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "重置第八节进度" }).click();
  await page.getByRole("button", { name: "确认重置第八节" }).click();
  await page.evaluate(() => window.resolveGlassCopy());
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 毛玻璃 Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});
test("corrupt storage sanitizes and repeated completion counts once; unavailable storage is honest", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          mode: "bad",
          alpha: 99,
          done: [99, null],
          answers: "bad",
          paused: "bad",
        }),
      );
      sessionStorage.setItem("seed", "1");
    }
  }, key);
  await open(page);
  await expect(page.getByTestId("glass-pane")).toHaveCSS(
    "background-color",
    "rgba(255, 255, 255, 0.55)",
  );
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成毛玻璃指令" }).click();
  await page.getByLabel("我已检查背景、可读性、回退和验收方式。").check();
  await page
    .getByRole("button", { name: "完成第八节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-eight .lesson-bottom")).toContainText(
    "5 / 5",
  );
  expect((await progress(page)).done.sort()).toEqual([0, 1, 2, 3, 4]);
  await expect(page.locator(".notice")).toContainText("下一课 09");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 7);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("all stations modes alpha and fallback retain axe checks focus and viewport fit", async ({
  page,
}) => {
  await open(page);
  for (const mode of ["无滤镜", "filter · 自身", "backdrop · 背后"]) {
    await choose(page, "滤镜作用对象", mode);
    await axeCheck(page);
  }
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#glass-stage-heading")).toBeFocused();
    await axeCheck(page);
    await noOverflow(page);
  }
  await step(page, 1);
  for (const alpha of ["0.20 · 更透", "0.55 · 适中", "0.85 · 更实"]) {
    await choose(page, "白色背景 alpha", alpha);
    await axeCheck(page);
  }
  await step(page, 2);
  await page.getByLabel("模拟不支持 backdrop-filter").check();
  await axeCheck(page);
  await page.getByText("第八节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "MDN：backdrop-filter 与透明条件 ↗",
      exact: true,
    }),
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
  for (const n of [1, 2, 3, 4, 5, 6]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(7);
  await act(
    page.getByRole("button", { name: "完成并继续" }),
    "blocked before tasks",
  );
  await expect(page.locator(".notice")).toContainText("先完成");
  await pick("滤镜作用对象", "filter · 自身");
  await pick("滤镜作用对象", "backdrop · 背后");
  await pick("实验模糊强度", "6px");
  await advance();
  await pick("白色背景 alpha", "0.20 · 更透");
  await pick("手动背景位置", "位置 B");
  await toggle(page.getByLabel("面板改成不透明白底"), "opaque");
  await expect(page.getByTestId("glass-pane")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await toggle(page.getByLabel("移除背后图案"), "empty background");
  await advance();
  await pick("背板作用范围", "较大 · 90%");
  await pick("成本实验半径", "24px");
  await toggle(page.getByLabel("模拟不支持 backdrop-filter"), "fallback");
  await expect(page.getByTestId("glass-pane")).toHaveCSS(
    "backdrop-filter",
    "none",
  );
  await toggle(
    page.getByLabel("我已确认文字底色、边框与文字状态仍清楚"),
    "readability",
  );
  await advance();
  const cards = page.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong answer");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(page.getByRole("button", { name: "生成毛玻璃指令" }), "generate");
  const draft = page.getByLabel("可编辑的 毛玻璃 Agent 指令");
  await expect(draft).toHaveValue(/透明条件.*可读性与回退.*性能与动态/s);
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制毛玻璃指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查背景、可读性、回退和验收方式。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第八节" }), "finish");
  await expect(page.locator(".lesson-eight .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.glassKeys ?? null);
  await page.reload();
  await directory(7);
  await expect(page.locator(".lesson-eight .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(page.getByRole("button", { name: "重置第八节进度" }), "open reset");
  await act(
    page.getByRole("button", { name: "保留第八节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-eight .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第八节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第八节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-eight .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#glass-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.opaque).toBe(false);
  expect(reset.empty).toBe(false);
  expect(reset.fallbackTested).toBe(false);
  expect(reset.draft).toBe("");
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.glassKeys ?? null),
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
test("complete keyboard-only glass experiments retry edit refresh and cancel/confirm reset", async ({
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
test("zero-keyboard touch-only glass learning retry refresh cancel and confirm reset", async ({
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
    window.glassKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.glassKeys.push(e.key));
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
