import { createKeyboardNavigator } from "./keyboard-navigation.js";
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson12.v1",
  priorKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(
    (n) => `frontend-observatory.lesson${n}.v1`,
  ),
  out = "/tmp/state-acceptance";
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await nav.getByRole("button").nth(n).click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 11);
  await expect(page.locator("#state-stage-heading")).toBeVisible();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
const choose = (page, label, value) => choice(page, label, value).click();
const step = (page, n) =>
  page
    .getByRole("navigation", { name: "第十二节学习步骤" })
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

const event = (page, name) =>
  page
    .getByRole("group", { name: "模拟流程事件" })
    .getByRole("button", { name, exact: true });
const send = (page, name) => event(page, name).click();
const phase = (page, value) =>
  expect(page.getByTestId("assistant-view")).toHaveAttribute(
    "data-phase",
    value,
  );
async function firstThree(page) {
  for (const value of [
    "idle · 待机",
    "listening · 等待输入",
    "thinking · 处理中",
    "speaking · 展示答复",
    "error · 发生错误",
  ])
    await choose(page, "预览阶段", value);
  await page.getByRole("button", { name: "更新旁边计数（保持状态）" }).click();
  await next(page);
  for (const name of [
    "开始模拟",
    "提交示例主题",
    "模拟成功",
    "结束展示",
    "开始模拟",
    "提交示例主题",
    "模拟失败",
    "重试当前主题",
    "取消当前流程",
  ])
    await send(page, name);
  await next(page);
  await page.getByLabel("静音偏好（仅教学，无实际声音）").check();
  await page.getByRole("button", { name: "切换详细说明" }).click();
  await page.getByRole("button", { name: "清空模拟会话" }).click();
  for (const name of [
    "开始模拟",
    "提交示例主题",
    "取消当前流程",
    "开始模拟",
    "提交示例主题",
  ])
    await send(page, name);
  await page.getByRole("button", { name: "投递最旧结果" }).click();
  await phase(page, "thinking");
  await page.getByRole("button", { name: "投递最旧结果" }).click();
  await phase(page, "speaking");
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [0, 1, 1].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
test("twelfth State available on demand and seventeenth remains planned", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-twelve-.*\.js/.test(u))).toBe(false);
  await course(page, 11);
  await expect(page.locator("#state-stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-twelve-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("State · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(16);
  await course(page, 16);
  await expect(
    page.getByRole("heading", { name: "Micro Interaction", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("one real assistant DOM previews five states and retains phase across unrelated re-renders", async ({
  page,
}) => {
  await open(page);
  const root = await page.getByTestId("assistant-view").elementHandle();
  for (const [value, id] of [
    ["idle · 待机", "idle"],
    ["listening · 等待输入", "listening"],
    ["thinking · 处理中", "thinking"],
    ["speaking · 展示答复", "speaking"],
    ["error · 发生错误", "error"],
  ]) {
    await choose(page, "预览阶段", value);
    await phase(page, id);
    expect(
      await root.evaluate(
        (e) => e === document.querySelector('[data-testid="assistant-view"]'),
      ),
    ).toBe(true);
    await expect(page.getByTestId("assistant-view")).toContainText("本地模拟");
  }
  for (let n = 1; n <= 6; n++) {
    await page
      .getByRole("button", { name: "更新旁边计数（保持状态）" })
      .click();
    await phase(page, "error");
    await expect(page.getByTestId("preview-memory")).toContainText(
      "独立计数 = " + n,
    );
  }
  await expect(
    page.getByRole("button", { name: "更新旁边计数（保持状态）" }),
  ).toBeDisabled();
  expect((await progress(page)).memoryChecked).toBe(true);
  expect((await progress(page)).previewSeen).toHaveLength(5);
});
test("events and allowed operations agree through success error retry cancel and same-turn duplicate clicks", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  const initial = await page.getByTestId("assistant-view").elementHandle();
  await expect(event(page, "模拟成功")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await event(page, "模拟成功").click({ force: true });
  await phase(page, "idle");
  await expect(page.getByTestId("event-announcement")).toContainText(
    "不能模拟成功",
  );
  await event(page, "开始模拟").evaluate((e) => {
    e.click();
    e.click();
  });
  await phase(page, "listening");
  await event(page, "提交示例主题").evaluate((e) => {
    e.click();
    e.click();
  });
  await phase(page, "thinking");
  await expect(page.getByTestId("submitted-topic")).toContainText("请求 #1");
  await send(page, "模拟成功");
  await phase(page, "speaking");
  await send(page, "结束展示");
  await phase(page, "idle");
  await send(page, "开始模拟");
  await send(page, "提交示例主题");
  await send(page, "模拟失败");
  await phase(page, "error");
  await send(page, "重试当前主题");
  await phase(page, "thinking");
  await expect(page.getByTestId("submitted-topic")).toContainText("请求 #3");
  await send(page, "取消当前流程");
  await phase(page, "idle");
  expect(
    await initial.evaluate(
      (e) => e === document.querySelector('[data-testid="assistant-view"]'),
    ),
  ).toBe(true);
  expect((await progress(page)).eventsSeen.sort()).toEqual([
    "cancel",
    "fail",
    "finish",
    "retry",
    "start",
    "submit",
    "success",
  ]);
  await noOverflow(page);
});
test("independent mute and expansion booleans coexist without changing the exclusive phase", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await send(page, "开始模拟");
  await send(page, "提交示例主题");
  await send(page, "模拟成功");
  for (let n = 0; n < 3; n++) {
    await page
      .getByLabel("静音偏好（仅教学，无实际声音）")
      .setChecked(n % 2 === 0);
    await page.getByRole("button", { name: "切换详细说明" }).click();
    await phase(page, "speaking");
  }
  await expect(page.getByTestId("assistant-details")).toBeVisible();
  await expect(page.getByTestId("assistant-view")).toContainText(
    "静音偏好已开",
  );
  await expect(
    page.getByRole("button", { name: "切换详细说明" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.reload();
  await course(page, 11);
  await step(page, 2);
  await phase(page, "idle");
  await expect(page.getByLabel("静音偏好（仅教学，无实际声音）")).toBeChecked();
  await expect(page.getByTestId("assistant-details")).toBeVisible();
});
test("manual late canceled packet cannot overwrite a new request and topic is captured at submit", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await send(page, "开始模拟");
  await send(page, "提交示例主题");
  await send(page, "取消当前流程");
  await choose(page, "下次提交的主题", "复习清单");
  await send(page, "开始模拟");
  await send(page, "提交示例主题");
  await choose(page, "下次提交的主题", "对比两种布局");
  await expect(page.getByTestId("submitted-topic")).toContainText("复习清单");
  await page.getByRole("button", { name: "投递最旧结果" }).click();
  await phase(page, "thinking");
  await expect(page.getByTestId("event-announcement")).toContainText(
    "忽略旧结果 #1",
  );
  await expect(page.getByTestId("submitted-topic")).toContainText("请求 #2");
  await expect(page.getByTestId("assistant-result")).toHaveCount(0);
  await page.getByRole("button", { name: "投递最旧结果" }).click();
  await phase(page, "speaking");
  await expect(page.getByTestId("assistant-result")).toContainText(
    "示例答复 #2：复习清单",
  );
  await expect(page.getByTestId("assistant-result")).not.toContainText(
    "对比两种布局",
  );
  await page
    .getByRole("button", { name: "投递最旧结果" })
    .click({ force: true });
  await phase(page, "speaking");
  await expect(page.getByTestId("event-announcement")).toContainText(
    "没有待投递",
  );
  expect((await progress(page)).freshAfterStale).toBe(true);
});
test("retry uses failed topic bounded mailbox stays small and refresh or course exit clears session", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await send(page, "开始模拟");
  await send(page, "提交示例主题");
  await send(page, "模拟失败");
  await choose(page, "下次提交的主题", "复习清单");
  await send(page, "重试当前主题");
  await expect(page.getByTestId("submitted-topic")).toContainText("整理路线");
  await send(page, "取消当前流程");
  for (let n = 0; n < 7; n++) {
    await send(page, "开始模拟");
    await send(page, "提交示例主题");
    await send(page, "取消当前流程");
  }
  await expect(page.locator(".state-envelope-list li")).toHaveCount(4);
  await expect(page.locator(".state-log li")).toHaveCount(6);
  await send(page, "开始模拟");
  await send(page, "提交示例主题");
  await course(page, 0);
  await course(page, 11);
  await phase(page, "idle");
  await expect(page.getByTestId("mailbox-count")).toContainText("待投递 0");
  await send(page, "开始模拟");
  await send(page, "提交示例主题");
  await page.reload();
  await course(page, 11);
  await phase(page, "idle");
  await expect(page.getByTestId("mailbox-count")).toContainText("待投递 0");
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key),
  ).not.toHaveProperty("session");
});
test("all assistant actions remain local silent static and do not access microphone AI or network", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.stateApiCalls = [];
    const track = (n) => () => {
      window.stateApiCalls.push(n);
      throw Error(n + " forbidden");
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: track("microphone") },
    });
    window.fetch = track("fetch");
    XMLHttpRequest.prototype.send = track("xhr");
    window.Audio = track("audio");
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak: track("speech") },
    });
  });
  await open(page);
  const requests = [];
  page.on("request", (r) => {
    if (["fetch", "xhr", "websocket"].includes(r.resourceType()))
      requests.push(r.url());
  });
  await step(page, 1);
  for (const name of [
    "开始模拟",
    "提交示例主题",
    "模拟成功",
    "结束展示",
    "开始模拟",
    "提交示例主题",
    "模拟失败",
    "重试当前主题",
    "取消当前流程",
  ])
    await send(page, name);
  expect(await page.evaluate(() => window.stateApiCalls)).toEqual([]);
  expect(requests).toEqual([]);
  for (const pref of ["no-preference", "reduce"]) {
    await page.emulateMedia({ reducedMotion: pref });
    expect(
      await page
        .locator(".state-lab")
        .evaluate((e) => e.getAnimations({ subtree: true }).length),
    ).toBe(0);
  }
  await page.emulateMedia({ forcedColors: "active" });
  await event(page, "开始模拟").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(event(page, "开始模拟")).not.toHaveCSS("outline-style", "none");
});
test("quiz retry reasons and task gates teach exclusive phases independent flags and stale results", async ({
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
  await expect(page.locator(".quiz-feedback").first()).toContainText(
    "同时听和说",
  );
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await quiz(page);
  await expect(page.locator(".lesson-twelve .lesson-bottom")).toContainText(
    "1 / 5",
  );
  await step(page, 3);
  await next(page);
  await expect(page.locator(".lesson-twelve .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("two editable Agent briefs list phases events feedback cancellation and honest copy paths", async ({
  page,
}) => {
  await open(page);
  await step(page, 2);
  await choose(page, "下次提交的主题", "复习清单");
  await page.getByLabel("静音偏好（仅教学，无实际声音）").check();
  await page.getByRole("button", { name: "切换详细说明" }).click();
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 状态 Agent 指令");
  await page.getByRole("button", { name: "生成状态指令" }).click();
  await expect(draft).toHaveValue(
    /idle \/ listening \/ thinking \/ speaking \/ error.*静音偏好 开启.*说明展开 开启.*事件与允许操作.*复习清单.*异常与取消/s,
  );
  await page.getByLabel("实现场景").selectOption("task");
  await page.getByRole("button", { name: "重新生成状态草稿" }).click();
  await expect(draft).toHaveValue(/idle \/ running \/ success \/ error/);
  await page.getByLabel("我已检查状态、事件、允许操作、反馈与取消。").check();
  await draft.fill((await draft.inputValue()) + "\n保留可见焦点。");
  await expect(
    page.getByLabel("我已检查状态、事件、允许操作、反馈与取消。"),
  ).not.toBeChecked();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.stateCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制状态指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.stateCopied)).toContain(
    "保留可见焦点",
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
    await page.getByRole("button", { name: "复制状态指令" }).click();
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
  await page.getByRole("button", { name: "生成状态指令" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r) => (window.resolveStateCopy = r)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制状态指令" }).click();
  await page.getByRole("button", { name: "重置第十二节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("可编辑的 状态 Agent 指令")).not.toHaveValue("");
  await page.getByRole("button", { name: "重置第十二节进度" }).click();
  await page.getByRole("button", { name: "确认重置第十二节" }).click();
  await page.evaluate(() => window.resolveStateCopy());
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 状态 Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});

test("corrupt progress sanitizes full completion stays unique unavailable storage is explicit", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          preview: "both",
          neighbor: 999,
          done: [999, null],
          answers: "bad",
          previewSeen: ["idle", "idle", "bad"],
          session: { phase: "speaking", active: 5 },
          draft: 44,
        }),
      );
      sessionStorage.setItem("seed", "1");
    }
  }, key);
  await open(page);
  await phase(page, "idle");
  expect((await progress(page)).neighbor).toBe(0);
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成状态指令" }).click();
  await page.getByLabel("我已检查状态、事件、允许操作、反馈与取消。").check();
  await page
    .getByRole("button", { name: "完成第十二节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-twelve .lesson-bottom")).toContainText(
    "5 / 5",
  );
  expect((await progress(page)).done.sort()).toEqual([0, 1, 2, 3, 4]);
  await expect(page.locator(".notice")).toContainText("可以从课程目录继续 13");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 11);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("all stations five preview states event outcomes expanded mailbox and sources pass axe", async ({
  page,
}) => {
  await open(page);
  for (const value of [
    "idle · 待机",
    "listening · 等待输入",
    "thinking · 处理中",
    "speaking · 展示答复",
    "error · 发生错误",
  ]) {
    await choose(page, "预览阶段", value);
    await axeCheck(page);
  }
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#state-stage-heading")).toBeFocused();
    await axeCheck(page);
    await noOverflow(page);
  }
  await step(page, 2);
  await page.getByLabel("静音偏好（仅教学，无实际声音）").check();
  await page.getByRole("button", { name: "切换详细说明" }).click();
  for (const name of [
    "开始模拟",
    "提交示例主题",
    "模拟失败",
    "重试当前主题",
    "取消当前流程",
  ]) {
    await send(page, name);
    await axeCheck(page);
  }
  await page.getByText("第十二节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "React：State 是组件的记忆 ↗",
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
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(11);
  await act(
    page.getByRole("button", { name: "完成并继续" }),
    "blocked before tasks",
  );
  await expect(page.locator(".notice")).toContainText("先完成");
  for (const value of [
    "idle · 待机",
    "listening · 等待输入",
    "thinking · 处理中",
    "speaking · 展示答复",
    "error · 发生错误",
  ])
    await pick("预览阶段", value);
  await act(
    page.getByRole("button", { name: "更新旁边计数（保持状态）" }),
    "state memory survives neighbor render",
  );
  await advance();
  for (const name of [
    "开始模拟",
    "提交示例主题",
    "模拟成功",
    "结束展示",
    "开始模拟",
    "提交示例主题",
    "模拟失败",
    "重试当前主题",
    "取消当前流程",
  ])
    await act(event(page, name), "event " + name);
  await advance();
  await toggle(
    page.getByLabel("静音偏好（仅教学，无实际声音）"),
    "independent mute",
  );
  await act(
    page.getByRole("button", { name: "切换详细说明" }),
    "independent expansion",
  );
  await act(
    page.getByRole("button", { name: "清空模拟会话" }),
    "clear pending session",
  );
  for (const name of ["开始模拟", "提交示例主题", "取消当前流程"])
    await act(event(page, name), "A " + name);
  await pick("下次提交的主题", "复习清单");
  for (const name of ["开始模拟", "提交示例主题"])
    await act(event(page, name), "B " + name);
  await act(
    page.getByRole("button", { name: "投递最旧结果" }),
    "ignore canceled A",
  );
  await phase(page, "thinking");
  await expect(page.getByTestId("event-announcement")).toContainText(
    "忽略旧结果",
  );
  await act(
    page.getByRole("button", { name: "投递最旧结果" }),
    "accept current B",
  );
  await phase(page, "speaking");
  await expect(page.getByTestId("assistant-result")).toContainText("复习清单");
  await advance();
  const cards = page.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(1), "wrong answer");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [0, 1, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(page.getByRole("button", { name: "生成状态指令" }), "generate");
  const draft = page.getByLabel("可编辑的 状态 Agent 指令");
  await expect(draft).toHaveValue(
    /状态合同.*事件与允许操作.*内容反馈.*异常与取消/s,
  );
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制状态指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查状态、事件、允许操作、反馈与取消。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第十二节" }), "finish");
  await expect(page.locator(".lesson-twelve .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.stateKeys ?? null);
  await page.reload();
  await directory(11);
  await expect(page.locator(".lesson-twelve .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(
    page.getByRole("button", { name: "重置第十二节进度" }),
    "open reset",
  );
  await act(
    page.getByRole("button", { name: "保留第十二节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-twelve .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第十二节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第十二节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-twelve .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#state-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.preview).toBe("idle");
  expect(reset.muted).toBe(false);
  expect(reset.staleIgnored).toBe(false);
  await act(
    page
      .getByRole("navigation", { name: "第十二节学习步骤" })
      .getByRole("button")
      .nth(2),
    "inspect cleared runtime after reset",
  );
  await phase(page, "idle");
  await expect(page.getByTestId("mailbox-count")).toContainText("待投递 0");
  expect(reset.draft).toBe("");
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.stateKeys ?? null),
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
test("complete keyboard-only state experiments retry edit refresh and cancel/confirm reset", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const trace = [];
  await page.addInitScript(denyClipboard);
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  const { seek, act, toggle } = createKeyboardNavigator(page, expect, trace, {
    lesson: "lesson-twelve",
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
test("zero-keyboard touch-only state learning retry refresh cancel and confirm reset", async ({
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
    window.stateKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.stateKeys.push(e.key));
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
