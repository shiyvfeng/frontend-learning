import { createKeyboardNavigator } from "./keyboard-navigation.js";
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson13.v1",
  priorKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
    (n) => `frontend-observatory.lesson${n}.v1`,
  ),
  out = "/tmp/props-acceptance";
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await nav.getByRole("button").nth(n).click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 12);
  await expect(page.locator("#props-stage-heading")).toBeVisible();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
const choose = (page, label, value) => choice(page, label, value).click();
const step = (page, n) =>
  page
    .getByRole("navigation", { name: "第十三节学习步骤" })
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

const action = (page, id) => page.getByTestId("action-" + id),
  card = (page, id) => page.getByTestId("instance-" + id);
async function inspect(page) {
  await page
    .getByRole("button", { name: "读取三个实例的 Props 与记忆" })
    .click();
}
async function firstThree(page) {
  await choose(page, "size 参数", "lg · 60px");
  await choose(page, "variant 参数", "outline · 描边");
  await inspect(page);
  await next(page);
  await action(page, "A").click();
  await action(page, "A").click();
  await action(page, "B").click();
  await choose(page, "参数作用范围", "仅 B 覆盖");
  await choose(page, "size 参数", "md · 52px");
  await page.getByRole("button", { name: "反转 A/B/C 顺序" }).click();
  await inspect(page);
  await next(page);
  await page.getByLabel("父级 disabled", { exact: true }).check();
  await page.getByRole("button", { name: "检查 A 的不可操作行为" }).click();
  await page.getByLabel("父级 disabled", { exact: true }).uncheck();
  await choose(page, "父级 loading", "仅 A 加载");
  await page.getByRole("button", { name: "检查 A 的不可操作行为" }).click();
  await page.getByLabel("父级 disabled", { exact: true }).check();
  await page.getByRole("button", { name: "检查 A 的不可操作行为" }).click();
  await page.getByRole("button", { name: "取消加载演示" }).click();
  await page.getByLabel("父级 disabled", { exact: true }).uncheck();
  await action(page, "A").click();
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [1, 0, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
test("thirteenth Props available on demand and twenty-first remains planned", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-thirteen-.*\.js/.test(u))).toBe(false);
  await course(page, 12);
  await expect(page.locator("#props-stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-thirteen-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Props与Variant · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(20);
  await course(page, 20);
  await expect(
    page.getByRole("heading", { name: "Shared Element Transition", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("three shared implementations change real size and visual variant while preserving DOM identity", async ({
  page,
}) => {
  await open(page);
  const nodes = await Promise.all(
    ["A", "B", "C"].map((id) => card(page, id).elementHandle()),
  );
  for (const [value, height] of [
    ["sm · 44px", 44],
    ["md · 52px", 52],
    ["lg · 60px", 60],
  ]) {
    await choose(page, "size 参数", value);
    for (const id of ["A", "B", "C"]) {
      expect((await action(page, id).boundingBox()).height).toBeCloseTo(
        height,
        1,
      );
      await expect(card(page, id)).toHaveAttribute(
        "data-size",
        value.slice(0, 2),
      );
    }
  }
  const colors = [];
  for (const value of ["solid · 实底", "outline · 描边", "quiet · 轻量"]) {
    await choose(page, "variant 参数", value);
    colors.push(
      await action(page, "A").evaluate(
        (e) => getComputedStyle(e).backgroundColor,
      ),
    );
    for (const id of ["A", "B", "C"])
      await expect(card(page, id)).toHaveAttribute(
        "data-variant",
        value.split(" ")[0],
      );
  }
  expect(new Set(colors).size).toBe(3);
  for (const [i, id] of ["A", "B", "C"].entries())
    expect(await card(page, id).evaluate((e, n) => e === n, nodes[i])).toBe(
      true,
    );
  await inspect(page);
  await expect(page.getByTestId("instance-report")).toContainText(
    "与初始 DOM 相同=是",
  );
  expect((await progress(page)).sizeChanged).toBe(true);
  expect((await progress(page)).variantChanged).toBe(true);
});
test("local instance memory remains independent through parent overrides defaults and stable-key reorder", async ({
  page,
}) => {
  await open(page);
  const a = await card(page, "A").elementHandle(),
    b = await card(page, "B").elementHandle();
  await step(page, 1);
  await action(page, "A").click();
  await action(page, "A").click();
  await action(page, "B").click();
  await expect(card(page, "A")).toHaveAttribute("data-count", "2");
  await expect(card(page, "B")).toHaveAttribute("data-count", "1");
  await expect(card(page, "C")).toHaveAttribute("data-count", "0");
  await choose(page, "参数作用范围", "仅 B 覆盖");
  await choose(page, "size 参数", "lg · 60px");
  await choose(page, "variant 参数", "outline · 描边");
  await expect(card(page, "A")).toHaveAttribute("data-size", "md");
  await expect(card(page, "B")).toHaveAttribute("data-size", "lg");
  await page.getByRole("button", { name: "反转 A/B/C 顺序" }).click();
  expect(
    await page
      .locator("[data-instance]")
      .evaluateAll((es) => es.map((e) => e.dataset.instance)),
  ).toEqual(["C", "B", "A"]);
  expect(await card(page, "A").evaluate((e, n) => e === n, a)).toBe(true);
  expect(await card(page, "B").evaluate((e, n) => e === n, b)).toBe(true);
  await inspect(page);
  expect((await progress(page)).independentVerified).toBe(true);
  expect((await progress(page)).identityVerified).toBe(true);
  await page.getByRole("button", { name: "恢复默认父级参数" }).click();
  await expect(card(page, "B")).toHaveAttribute("data-size", "md");
  await expect(card(page, "A")).toHaveAttribute("data-count", "2");
  await expect(card(page, "B")).toHaveAttribute("data-saved", "true");
});
test("same-turn activations use functional local updates and emit distinct callbacks only for their instance", async ({
  page,
}) => {
  await open(page);
  await action(page, "A").evaluate((e) => {
    e.click();
    e.click();
  });
  await action(page, "B").click();
  await expect(card(page, "A")).toHaveAttribute("data-count", "2");
  await expect(card(page, "A")).toHaveAttribute("data-saved", "false");
  await expect(card(page, "B")).toHaveAttribute("data-count", "1");
  await expect(card(page, "C")).toHaveAttribute("data-count", "0");
  await page.locator(".props-event-log summary").click();
  await expect(page.locator(".props-event-log li")).toHaveText([
    "A · 有效激活事件 #1",
    "A · 有效激活事件 #2",
    "B · 有效激活事件 #3",
  ]);
});
test("native disabled loading and overlap block physical synthetic and repeated activations with no callbacks", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await action(page, "A").click();
  const before = await card(page, "A").getAttribute("data-count");
  for (const [disabled, loading] of [
    [true, "不加载"],
    [false, "仅 A 加载"],
    [true, "仅 A 加载"],
  ]) {
    await page
      .getByLabel("父级 disabled", { exact: true })
      .setChecked(disabled);
    await choose(page, "父级 loading", loading);
    await expect(action(page, "A")).toBeDisabled();
    await action(page, "A").click({ force: true });
    await action(page, "A").dispatchEvent("click");
    await action(page, "A").evaluate((e) => {
      e.click();
      e.click();
    });
    await expect(card(page, "A")).toHaveAttribute("data-count", before);
    await page.getByRole("button", { name: "检查 A 的不可操作行为" }).click();
    await expect(page.getByTestId("blocked-report")).toContainText(
      "原生 button.disabled=true",
    );
    await expect(page.getByTestId("blocked-report")).toContainText(
      "onActivate 事件 1 → 1",
    );
    if (loading !== "不加载")
      await expect(action(page, "A")).toHaveAttribute("aria-busy", "true");
  }
  const d = await progress(page);
  expect(d.disabledVerified && d.loadingVerified && d.overlapVerified).toBe(
    true,
  );
  await page.getByRole("button", { name: "取消加载演示" }).click();
  await expect(action(page, "A")).toBeDisabled();
  await page.getByLabel("父级 disabled", { exact: true }).uncheck();
  await expect(action(page, "A")).toBeEnabled();
  await action(page, "A").click();
  await expect(card(page, "A")).toHaveAttribute("data-count", "2");
  expect((await progress(page)).restored).toBe(true);
});
test("loading can target A independently and manual cancellation preserves memory without asynchronous APIs", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.propsCalls = [];
    for (const name of ["fetch", "Audio"])
      Object.defineProperty(window, name, {
        configurable: true,
        value: function () {
          window.propsCalls.push(name);
          throw Error(name);
        },
      });
    XMLHttpRequest.prototype.send = () => {
      window.propsCalls.push("xhr");
      throw Error("xhr");
    };
  });
  await open(page);
  await step(page, 2);
  await action(page, "A").click();
  await choose(page, "父级 loading", "仅 A 加载");
  await expect(action(page, "A")).toBeDisabled();
  await expect(action(page, "B")).toBeEnabled();
  await action(page, "B").click();
  await page.getByRole("button", { name: "取消加载演示" }).click();
  await expect(card(page, "A")).toHaveAttribute("data-count", "1");
  await expect(card(page, "A")).toHaveAttribute("data-saved", "true");
  await expect(action(page, "A")).toBeEnabled();
  await choose(page, "父级 loading", "全部加载");
  for (const id of ["A", "B", "C"])
    await expect(action(page, id)).toBeDisabled();
  await step(page, 3);
  await step(page, 2);
  for (const id of ["A", "B", "C"])
    await expect(action(page, id)).toBeEnabled();
  await expect(card(page, "A")).toHaveAttribute("data-count", "1");
  expect(await page.evaluate(() => window.propsCalls)).toEqual([]);
  for (const pref of ["no-preference", "reduce"]) {
    await page.emulateMedia({ reducedMotion: pref });
    expect(
      await page
        .locator(".props-lab")
        .evaluate((e) => e.getAnimations({ subtree: true }).length),
    ).toBe(0);
  }
  await page.reload();
  await course(page, 12);
  for (const id of ["A", "B", "C"])
    await expect(card(page, id)).toHaveAttribute("data-count", "0");
  await expect(action(page, "A")).toBeEnabled();
});
test("behavior task proofs require the actual separate configurations and quiz return keeps instance memory", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await page.getByRole("button", { name: "检查 A 的不可操作行为" }).click();
  await expect(page.getByTestId("props-announcement")).toContainText(
    "先打开父级 disabled",
  );
  expect((await progress(page)).disabledVerified).toBe(false);
  await page.getByLabel("父级 disabled", { exact: true }).check();
  expect((await progress(page)).disabledVerified).toBe(false);
  await choose(page, "父级 loading", "仅 A 加载");
  await page.getByRole("button", { name: "检查 A 的不可操作行为" }).click();
  expect((await progress(page)).overlapVerified).toBe(true);
  expect((await progress(page)).disabledVerified).toBe(false);
  expect((await progress(page)).loadingVerified).toBe(false);
  await page.getByRole("button", { name: "取消加载演示" }).click();
  await page.getByLabel("父级 disabled", { exact: true }).uncheck();
  await action(page, "A").click();
  await step(page, 3);
  await expect(page.locator(".props-lab")).toBeHidden();
  await step(page, 1);
  await expect(card(page, "A")).toHaveAttribute("data-count", "1");
});
test("quiz retries explain read-only inputs versus state and parameter variation versus responsibilities", async ({
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
    "组件共享实现，不代表实例自动共享内部记忆",
  );
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await quiz(page);
  await expect(page.locator(".lesson-thirteen .lesson-bottom")).toContainText(
    "1 / 5",
  );
  await step(page, 3);
  await next(page);
  await expect(page.locator(".lesson-thirteen .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("two editable API briefs bind configuration defaults constraints callbacks and copy success or fallback", async ({
  page,
}) => {
  await open(page);
  await choose(page, "size 参数", "lg · 60px");
  await choose(page, "variant 参数", "outline · 描边");
  await step(page, 1);
  await choose(page, "参数作用范围", "仅 B 覆盖");
  await choose(page, "size 参数", "md · 52px");
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 组件 Agent 指令");
  await page.getByRole("button", { name: "生成组件指令" }).click();
  await expect(draft).toHaveValue(
    /RouteChoice.*默认 md.*共同 size=lg、variant=outline.*B 单独覆盖 size=md.*只读输入.*组合与事件合同.*实例与记忆.*近似映射/s,
  );
  await page.getByLabel("实现场景").selectOption("button");
  await page.getByRole("button", { name: "重新生成组件草稿" }).click();
  await expect(draft).toHaveValue(/ActionButton.*业务状态由调用方持有/s);
  await page.getByLabel("我已检查 API、默认值、组合、状态归属与反馈。").check();
  await draft.fill((await draft.inputValue()) + "\n保留稳定业务 ID。");
  await expect(
    page.getByLabel("我已检查 API、默认值、组合、状态归属与反馈。"),
  ).not.toBeChecked();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.propsCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制组件指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.propsCopied)).toContain(
    "保留稳定业务 ID",
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
    await page.getByRole("button", { name: "复制组件指令" }).click();
    await expect(page.locator(".copy-feedback")).toContainText(
      "自动复制不可用",
    );
    await expect(draft).toBeFocused();
    expect(await draft.evaluate((e) => e.selectionEnd - e.selectionStart)).toBe(
      (await draft.inputValue()).length,
    );
  }
});
test("late clipboard response cannot repopulate reset props", async ({
  page,
}) => {
  await open(page);
  await step(page, 4);
  await page.getByRole("button", { name: "生成组件指令" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r) => (window.resolvePropsCopy = r)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制组件指令" }).click();
  await page.getByRole("button", { name: "重置第十三节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("可编辑的 组件 Agent 指令")).not.toHaveValue("");
  await page.getByRole("button", { name: "重置第十三节进度" }).click();
  await page.getByRole("button", { name: "确认重置第十三节" }).click();
  await page.evaluate(() => window.resolvePropsCopy());
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 组件 Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});

test("corrupt progress defaults safely full completion is unique and unavailable storage remains honest", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          sharedSize: "bad",
          sharedVariant: "danger",
          bSize: 999,
          scope: "all",
          done: [999, null],
          answers: "bad",
          scopeSeen: ["shared", "shared", "wrong"],
          used: ["A", "X"],
          draft: 44,
        }),
      );
      sessionStorage.setItem("seed", "1");
    }
  }, key);
  await open(page);
  await expect(card(page, "A")).toHaveAttribute("data-size", "md");
  await expect(card(page, "A")).toHaveAttribute("data-variant", "solid");
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成组件指令" }).click();
  await page.getByLabel("我已检查 API、默认值、组合、状态归属与反馈。").check();
  await page
    .getByRole("button", { name: "完成第十三节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-thirteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  expect((await progress(page)).done.sort()).toEqual([0, 1, 2, 3, 4]);
  await expect(page.locator(".notice")).toContainText("可以从课程目录继续 14 条件渲染。");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 12);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("every station variants native busy states inspector mapping and sources pass axe with visible keyboard focus", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#props-stage-heading")).toBeFocused();
    await axeCheck(page);
    await noOverflow(page);
  }
  await step(page, 0);
  for (const v of ["solid · 实底", "outline · 描边", "quiet · 轻量"]) {
    await choose(page, "variant 参数", v);
    await axeCheck(page);
  }
  await inspect(page);
  await axeCheck(page);
  await step(page, 2);
  for (const [disabled, loading] of [
    [true, "不加载"],
    [false, "仅 A 加载"],
    [true, "全部加载"],
  ]) {
    await page
      .getByLabel("父级 disabled", { exact: true })
      .setChecked(disabled);
    await choose(page, "父级 loading", loading);
    await page.getByRole("button", { name: "检查 A 的不可操作行为" }).click();
    await axeCheck(page);
  }
  await page.locator(".props-mapping summary").click();
  await axeCheck(page);
  await page.getByText("第十三节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "Figma：创建与使用 Variants ↗",
      exact: true,
    }),
  ).toBeVisible();
  await axeCheck(page);
  await page.getByRole("button", { name: "取消加载演示" }).click();
  await page.getByLabel("父级 disabled", { exact: true }).uncheck();
  await action(page, "A").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(action(page, "A")).not.toHaveCSS("outline-style", "none");
});
async function completeFlow(page, act, toggle, edit) {
  async function directory(n) {
    const nav = page.getByRole("navigation", { name: "课程目录" });
    if (!(await nav.isVisible()))
      await act(page.getByRole("button", { name: "☰ 课程" }), "directory");
    await act(nav.getByRole("button").nth(n), "course " + (n + 1));
    const names = [
      "第一节学习步骤",
      "第二节学习步骤",
      "第三节学习步骤",
      "第四节学习步骤",
      "第五节学习步骤",
      "第六节学习步骤",
      "第七节学习步骤",
      "第八节学习步骤",
      "第九节学习步骤",
      "第十节学习步骤",
      "第十一节学习步骤",
      "第十二节学习步骤",
      "第十三节学习步骤",
    ];
    await expect(
      page.getByRole("navigation", { name: names[n] }),
    ).toBeVisible();
    // Lazy lessons must finish initialization before taking a storage baseline.
    await expect
      .poll(() =>
        page.evaluate(
          (k) => localStorage.getItem(k),
          `frontend-observatory.lesson${n + 1}.v1`,
        ),
      )
      .not.toBeNull();
    // Finish the mounted lesson's focus effects before the next keyboard action.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  }
  const pick = (label, value) =>
      act(choice(page, label, value), label + " -> " + value),
    advance = () =>
      act(page.getByRole("button", { name: "完成并继续" }), "next");
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(12);
  await act(
    page.getByRole("button", { name: "完成并继续" }),
    "blocked before tasks",
  );
  await expect(page.locator(".notice")).toContainText("先完成");
  await pick("size 参数", "lg · 60px");
  await pick("variant 参数", "outline · 描边");
  await act(
    page.getByRole("button", { name: "读取三个实例的 Props 与记忆" }),
    "inspect shared inputs",
  );
  await advance();
  await act(action(page, "A"), "A memory once");
  await act(action(page, "A"), "A memory twice");
  await act(action(page, "B"), "independent B memory");
  await pick("参数作用范围", "仅 B 覆盖");
  await pick("size 参数", "md · 52px");
  await act(
    page.getByRole("button", { name: "反转 A/B/C 顺序" }),
    "reorder stable instance IDs",
  );
  await act(
    page.getByRole("button", { name: "读取三个实例的 Props 与记忆" }),
    "inspect independent state and identity",
  );
  await expect(card(page, "A")).toHaveAttribute("data-count", "2");
  await expect(card(page, "B")).toHaveAttribute("data-count", "1");
  await advance();
  const disabled = page.getByLabel("父级 disabled", { exact: true }),
    probe = page.getByRole("button", { name: "检查 A 的不可操作行为" });
  await toggle(disabled, "disable all");
  await act(probe, "verify disabled native guard");
  await toggle(disabled, "remove disabled");
  await pick("父级 loading", "仅 A 加载");
  await act(probe, "verify busy repeat guard");
  await toggle(disabled, "overlap disabled and loading");
  await act(probe, "verify overlap guard");
  await expect(page.getByTestId("blocked-report")).toContainText("没有执行");
  await act(
    page.getByRole("button", { name: "取消加载演示" }),
    "cancel manual loading",
  );
  await toggle(disabled, "restore enabled");
  await act(action(page, "A"), "restored A activation");
  await expect(card(page, "A")).toHaveAttribute("data-count", "3");
  await advance();
  const cards = page.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong answer");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(page.getByRole("button", { name: "生成组件指令" }), "generate");
  const draft = page.getByLabel("可编辑的 组件 Agent 指令");
  await expect(draft).toHaveValue(
    /API 与默认值.*组合与事件合同.*实例与记忆.*设计映射/s,
  );
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制组件指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查 API、默认值、组合、状态归属与反馈。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第十三节" }), "finish");
  await expect(page.locator(".lesson-thirteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.propsKeys ?? null);
  await page.reload();
  await directory(12);
  await expect(page.locator(".lesson-thirteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(
    page.getByRole("button", { name: "重置第十三节进度" }),
    "open reset",
  );
  await act(
    page.getByRole("button", { name: "保留第十三节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-thirteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第十三节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第十三节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-thirteen .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#props-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.sharedSize).toBe("md");
  expect(reset.sharedVariant).toBe("solid");
  expect(reset.disabled).toBe(false);
  expect(reset.reversed).toBe(false);
  for (const id of ["A", "B", "C"]) {
    await expect(card(page, id)).toHaveAttribute("data-count", "0");
    await expect(action(page, id)).toBeEnabled();
  }
  expect(reset.draft).toBe("");
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.propsKeys ?? null),
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
test("complete keyboard-only props experiments retry edit refresh and cancel/confirm reset", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const trace = [];
  await page.addInitScript(denyClipboard);
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  const { seek, act, toggle } = createKeyboardNavigator(page, expect, trace, {
    lesson: "lesson-thirteen",
    profile: info.project.name,
  });
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
test("zero-keyboard touch-only props learning retry refresh cancel and confirm reset", async ({
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
    window.propsKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.propsKeys.push(e.key));
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
