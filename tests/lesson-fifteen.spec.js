import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
const out = "/tmp/feedback-acceptance",
  key = "frontend-observatory.lesson15.v1",
  prior = Array.from(
    { length: 14 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const button = (p, n) => p.getByRole("button", { name: n, exact: true });
const choice = (p, label, v) =>
  p
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: v, exact: true });
const step = (p, n) =>
  p
    .getByRole("navigation", { name: "第十五节学习步骤" })
    .getByRole("button")
    .nth(n);
const delivery = (p, kind) =>
  p.getByRole("button", { name: new RegExp(`^投递${kind}结果`) });
async function open(p, n = 0) {
  await p.goto("/");
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await button(p, "☰ 课程").click();
  await nav.getByRole("button").nth(14).click();
  await expect(p.locator("#feedback-stage-heading")).toBeVisible();
  await step(p, n).click();
  await settle(p);
}
async function settle(p) {
  await p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
async function axeCheck(p) {
  await p.evaluate(axe);
  const r = await p.evaluate(() =>
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
async function fit(p) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
const item = (p, label) =>
  p
    .locator("[data-entry-id]")
    .filter({ has: p.getByRole("heading", { name: label, exact: true }) });
const deny = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });

test("new feedback module loads on demand with fifteen releases and seventeenth planned", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-fifteen-.*\.js/.test(u))).toBe(false);
  await open(page);
  await expect(page).toHaveTitle("Loading/Skeleton/Optimistic UI · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(16);
  expect(urls.some((u) => /lesson-fifteen-.*\.js/.test(u))).toBe(true);
});
test("actual spinner skeleton known progress success failure duplicate guard and canceled stale result", async ({
  page,
}) => {
  await open(page);
  await button(page, "开始 / 重试模拟加载").click();
  await expect(page.locator(".feedback-spinner")).toBeVisible();
  await button(page, "开始 / 重试模拟加载").click();
  await expect(delivery(page, "加载")).toHaveText("投递加载结果（1）");
  await expect(page.getByTestId("loading-feedback")).toContainText(
    "重复点击已忽略",
  );
  await button(page, "手动推进至 50%").click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "50");
  await choice(page, "加载反馈方式", "Skeleton · 布局占位").click();
  await expect(page.getByTestId("skeleton-placeholders")).toBeVisible();
  await expect(
    page.getByTestId("skeleton-placeholders").locator("button,input,a"),
  ).toHaveCount(0);
  await expect(page.getByTestId("loading-surface")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await delivery(page, "加载").click();
  await expect(page.getByTestId("loading-surface")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".feedback-cards h4")).toHaveCount(3);
  await choice(page, "加载模拟结果", "失败").click();
  await button(page, "开始 / 重试模拟加载").click();
  await delivery(page, "加载").click();
  await expect(page.getByTestId("loading-surface")).toHaveAttribute(
    "data-phase",
    "error",
  );
  await button(page, "开始 / 重试模拟加载").click();
  await button(page, "取消加载尝试").click();
  await delivery(page, "加载").click();
  await expect(page.getByTestId("loading-surface")).toHaveAttribute(
    "data-phase",
    "cancelled",
  );
  await expect(page.getByTestId("loading-feedback")).toContainText("忽略失效");
  await axeCheck(page);
});
test("waited update and optimistic prediction rollback retry have genuinely different visible values", async ({
  page,
}) => {
  await open(page, 1);
  const card = page.getByTestId("favorite-surface");
  await button(page, "请求切换收藏").click();
  await expect(card).toHaveAttribute("data-visible", "false");
  await delivery(page, "收藏").click();
  await expect(card).toHaveAttribute("data-confirmed", "true");
  await choice(page, "下一次更新时机", "乐观显示").click();
  await choice(page, "收藏模拟结果", "失败").click();
  await button(page, "请求切换收藏").click();
  await expect(card).toHaveAttribute("data-visible", "false");
  await expect(card).toHaveAttribute("data-confirmed", "true");
  await delivery(page, "收藏").click();
  await expect(card).toHaveAttribute("data-visible", "true");
  await expect(card).toHaveAttribute("data-confirmed", "true");
  await choice(page, "收藏模拟结果", "成功").click();
  await button(page, "请求切换收藏").click();
  await delivery(page, "收藏").click();
  await expect(card).toHaveAttribute("data-visible", "false");
  await expect(card).toHaveAttribute("data-confirmed", "false");
});
async function ledgerFlow(p, act = (l) => l.click()) {
  const a = (n) => act(button(p, n), n),
    pick = (v) => act(choice(p, "新增或重试模拟结果", v), "result " + v);
  await a("乐观添加条目");
  await a("乐观添加条目");
  await settle(p);
  await expect(button(p, "乐观添加条目")).toBeFocused();
  await expect(p.getByTestId("ledger-feedback")).toContainText(
    "重复提交已忽略",
  );
  await a("填入后续示例 B");
  await pick("成功");
  await a("乐观添加条目");
  await act(p.getByRole("button", { name: /^投递最新条目结果/ }), "newest B");
  await expect(item(p, "路线 B")).toHaveAttribute("data-phase", "success");
  await act(
    p.getByRole("button", { name: /^投递最早条目结果/ }),
    "oldest A fail",
  );
  await expect(
    p.getByTestId("visible-items").locator("[data-entry-id]"),
  ).toHaveCount(1);
  await expect(p.getByTestId("visible-items")).toContainText("路线 B");
  await expect(item(p, "路线 A")).toHaveAttribute("data-phase", "failed");
  await a("重试 路线 A");
  await a("取消 路线 A");
  await a("重试 路线 A");
  await act(
    p.getByRole("button", { name: /^投递最早条目结果/ }),
    "old cancelled attempt",
  );
  await expect(item(p, "路线 A")).toHaveAttribute("data-phase", "pending");
  await expect(p.getByTestId("ledger-feedback")).toContainText("忽略失效");
  await act(
    p.getByRole("button", { name: /^投递最早条目结果/ }),
    "new retry result",
  );
  await expect(item(p, "路线 A")).toHaveAttribute("data-phase", "success");
  await expect(item(p, "路线 B")).toHaveAttribute("data-phase", "success");
}
test("per-item rollback preserves later B through out-of-order delivery duplicate cancel old attempt and retry", async ({
  page,
}) => {
  await open(page, 2);
  await ledgerFlow(page);
  await axeCheck(page);
  await fit(page);
});
test("real editing without samples works and no simulated operation issues network requests", async ({
  page,
}) => {
  await open(page, 2);
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.getByLabel("条目名称", { exact: true }).fill("真实编辑的条目");
  await button(page, "乐观添加条目").click();
  await expect(item(page, "真实编辑的条目")).toHaveAttribute(
    "data-phase",
    "pending",
  );
  await page.getByRole("button", { name: /^投递最早条目结果/ }).click();
  await expect(item(page, "真实编辑的条目")).toHaveAttribute(
    "data-phase",
    "failed",
  );
  expect(requests).toEqual([]);
});
test("decorative animation pause live reduced motion and discrete feedback remain honest", async ({
  page,
}) => {
  await open(page);
  await button(page, "开始 / 重试模拟加载").click();
  const spinner = page.locator(".feedback-spinner");
  await expect(spinner).toHaveCSS("animation-name", "none");
  await page.getByLabel("播放装饰动画（关闭即暂停）").check();
  await expect(spinner).toHaveCSS("animation-name", "feedback-spin");
  const text = await page.getByTestId("loading-feedback").textContent();
  await page.waitForTimeout(120);
  await expect(page.getByTestId("loading-feedback")).toHaveText(text);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(spinner).toHaveCSS("animation-name", "none");
  await expect(page.locator(".feedback-lab")).toContainText("系统减少动态");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByLabel("播放装饰动画（关闭即暂停）").uncheck();
  await expect(spinner).toHaveCSS("animation-name", "none");
  expect(
    await page
      .getByTestId("loading-feedback")
      .evaluate((e) => e.closest("[aria-busy=true]") === null),
  ).toBe(true);
});
test("all five stations plus pending skeleton pass axe and desktop/375 local crops", async ({
  page,
}, info) => {
  await open(page);
  mkdirSync(out, { recursive: true });
  for (let n = 0; n < 5; n++) {
    await step(page, n).click();
    if (n === 0) {
      await choice(page, "加载反馈方式", "Skeleton · 布局占位").click();
      await button(page, "开始 / 重试模拟加载").click();
    }
    if (n === 4) await button(page, "生成反馈指令").click();
    await axeCheck(page);
    await fit(page);
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station-${n + 1}-${info.project.name}.png` });
  }
});
async function snapshot(p) {
  return p.evaluate(() => {
    const e = document.activeElement,
      r = e.getBoundingClientRect(),
      hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      tag: e.tagName,
      text: e.textContent.trim().slice(0, 100),
      disabled: !!e.disabled,
      ariaDisabled: e.getAttribute("aria-disabled"),
      visible: r.top >= 0 && r.bottom <= innerHeight + 1 && r.width > 0,
      covered: hit !== e && !e.contains(hit),
      outline: getComputedStyle(e).outlineStyle,
    };
  });
}
function valid(row) {
  expect(row.tag, JSON.stringify(row)).toBe("BUTTON");
  expect(row.disabled, JSON.stringify(row)).toBe(false);
  expect(row.ariaDisabled).not.toBe("true");
  expect(row.visible).toBe(true);
  expect(row.covered).toBe(false);
  expect(row.outline).not.toBe("none");
}
test("immediate keyboard focus survives successful failed canceled stale and rollback results and respects external focus", async ({
  page,
}, info) => {
  const rows = [],
    trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson15-immediate",
      profile: info.project.name,
    });
  for (const n of [0, 1])
    for (const v of ["成功", "失败"])
      for (const cancel of [false, true]) {
        await open(page, n);
        await choice(
          page,
          n === 0 ? "加载模拟结果" : "收藏模拟结果",
          v,
        ).click();
        if (n === 1) await choice(page, "下一次更新时机", "乐观显示").click();
        await button(
          page,
          n === 0 ? "开始 / 重试模拟加载" : "请求切换收藏",
        ).click();
        const begin = button(
          page,
          n === 0 ? "开始 / 重试模拟加载" : "请求切换收藏",
        );
        await seek(begin, "repeat current request");
        await page.keyboard.press("Enter");
        await settle(page);
        const repeated = {
          kind: "repeat",
          station: n + 1,
          outcome: v,
          ...(await snapshot(page)),
        };
        valid(repeated);
        expect(repeated.text).toBe(
          n === 0 ? "开始 / 重试模拟加载" : "请求切换收藏",
        );
        rows.push(repeated);
        await expect(delivery(page, n === 0 ? "加载" : "收藏")).toContainText(
          "（1）",
        );
        if (cancel)
          await button(page, n === 0 ? "取消加载尝试" : "取消收藏尝试").click();
        const d = delivery(page, n === 0 ? "加载" : "收藏");
        await seek(d, "result");
        await page.keyboard.press("Enter");
        await settle(page);
        const row = {
          station: n + 1,
          outcome: v,
          cancel,
          ...(await snapshot(page)),
        };
        valid(row);
        rows.push(row);
      }
  for (const n of [0, 1]) {
    await open(page, n);
    await button(
      page,
      n === 0 ? "开始 / 重试模拟加载" : "请求切换收藏",
    ).click();
    const ext = button(page, "完成并继续");
    await seek(ext, "external");
    await delivery(page, n === 0 ? "加载" : "收藏").evaluate((e) => e.click());
    await settle(page);
    await expect(ext).toBeFocused();
  }
  await open(page, 2);
  await button(page, "乐观添加条目").click();
  await seek(button(page, "乐观添加条目"), "repeat ledger");
  await page.keyboard.press("Enter");
  await settle(page);
  const repeatedItem = { kind: "repeat item", ...(await snapshot(page)) };
  valid(repeatedItem);
  rows.push(repeatedItem);
  await expect(page.locator("[data-entry-id]")).toHaveCount(1);
  await seek(
    page.getByRole("button", { name: /^投递最早条目结果/ }),
    "rollback",
  );
  await page.keyboard.press("Enter");
  await settle(page);
  const row = { kind: "rollback", ...(await snapshot(page)) };
  valid(row);
  expect(row.text).toBe("乐观添加条目");
  rows.push(row);
  await seek(button(page, "重试 路线 A"), "retry");
  await page.keyboard.press("Enter");
  await settle(page);
  rows.push({ kind: "recovery", ...(await snapshot(page)) });
  valid(rows.at(-1));
  await seek(button(page, "取消 路线 A"), "cancel");
  await page.keyboard.press("Enter");
  await settle(page);
  rows.push({ kind: "recovery", ...(await snapshot(page)) });
  valid(rows.at(-1));
  await seek(page.getByRole("button", { name: /^投递最早条目结果/ }), "stale");
  await page.keyboard.press("Enter");
  await settle(page);
  rows.push({ kind: "recovery", ...(await snapshot(page)) });
  valid(rows.at(-1));
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/immediate-${info.project.name}.json`,
    JSON.stringify({ rows, trace }, null, 2),
  );
});
async function fullFlow(p, act, toggle, edit) {
  const a = (n) => act(button(p, n), n),
    pick = (g, v) => act(choice(p, g, v), g + " " + v);
  await openDirectory(p, act);
  await a("完成并继续");
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("开始 / 重试模拟加载");
  await a("开始 / 重试模拟加载");
  await a("手动推进至 50%");
  await pick("加载反馈方式", "Skeleton · 布局占位");
  await act(delivery(p, "加载"), "load success");
  await pick("加载模拟结果", "失败");
  await a("开始 / 重试模拟加载");
  await act(delivery(p, "加载"), "load failure");
  await a("开始 / 重试模拟加载");
  await a("取消加载尝试");
  await a("完成并继续");
  await a("请求切换收藏");
  await act(delivery(p, "收藏"), "wait success");
  await pick("下一次更新时机", "乐观显示");
  await pick("收藏模拟结果", "失败");
  await a("请求切换收藏");
  await act(delivery(p, "收藏"), "optimistic failure");
  await pick("收藏模拟结果", "成功");
  await a("请求切换收藏");
  await act(delivery(p, "收藏"), "retry favorite");
  await a("完成并继续");
  await ledgerFlow(p, act);
  await a("完成并继续");
  const qs = p.locator(".quiz-card");
  await act(qs.nth(0).getByRole("button").nth(0), "wrong");
  await expect(qs.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(qs.nth(i).getByRole("button").nth(v), "retry " + i);
  await a("完成并继续");
  await a("生成反馈指令");
  const draft = p.getByLabel("可编辑的 反馈 Agent 指令");
  await expect(draft).toHaveValue(
    /加载反馈.*乐观策略.*并发与回滚.*恢复与操作/s,
  );
  if (edit) await edit(draft);
  await a("复制反馈指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 重复、错误、取消、回滚、重试与完成反馈。"),
    "review",
  );
  await a("完成第十五节");
  await expect(p.locator(".lesson-fifteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.feedbackKeys ?? null);
  await p.reload();
  await openDirectory(p, act);
  await expect(p.locator(".lesson-fifteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十五节进度");
  await a("保留第十五节进度");
  await expect(p.locator(".lesson-fifteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十五节进度");
  await a("确认重置第十五节");
  await expect(p.locator(".lesson-fifteen .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(p.locator("#feedback-stage-heading")).toBeFocused();
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.feedbackKeys ?? null),
  };
}
async function openDirectory(p, act) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(button(p, "☰ 课程"), "directory");
  await act(nav.getByRole("button").nth(14), "lesson15");
  await expect(p.locator("#feedback-stage-heading")).toBeVisible();
  await settle(p);
}
async function seed(p) {
  await p.addInitScript((ks) => {
    for (const [i, k] of ks.entries())
      if (localStorage.getItem(k) === null)
        localStorage.setItem(
          k,
          JSON.stringify({ step: i % 5, done: [0], marker: "prior " + i }),
        );
  }, prior);
  await p.addInitScript(deny);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  await settle(p);
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior);
}
test("complete pure keyboard feedback learning edit wrong retry refresh cancel confirm reset preserves fourteen stores", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { seek, act, toggle } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson15",
      profile: info.project.name,
    });
  const r = await fullFlow(page, act, toggle, async (f) => {
    await seek(f, "edit");
    await page.keyboard.press("Control+End");
    await page.keyboard.type("\nReview: preserve later work.");
  });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...r }, null, 2),
  );
});
test("complete zero keyboard touch feedback wrong retry refresh cancel confirm reset preserves fourteen stores", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage(),
    trace = [];
  await p.addInitScript(() => {
    window.feedbackKeys = [];
    for (const type of ["keydown", "keyup"])
      addEventListener(type, (e) => window.feedbackKeys.push(e.key));
  });
  const before = await seed(p),
    tap = async (l, n) => {
      await l.tap();
      trace.push(n);
    },
    r = await fullFlow(p, tap, tap);
  expect(r.keysBefore).toEqual([]);
  expect(r.keysAfter).toEqual([]);
  expect(
    await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/touch-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...r }, null, 2),
  );
  await c.close();
});

test("same-turn repeats stay single and cancel plus restart discards only the old result with immediate focus", async ({
  page,
}) => {
  await open(page);
  await button(page, "开始 / 重试模拟加载").evaluate((e) => {
    e.click();
    e.click();
  });
  await expect(delivery(page, "加载")).toHaveText("投递加载结果（1）");
  await button(page, "取消加载尝试").click();
  await button(page, "开始 / 重试模拟加载").click();
  await delivery(page, "加载").click();
  await settle(page);
  await expect(delivery(page, "加载")).toBeFocused();
  await expect(delivery(page, "加载")).toBeEnabled();
  await expect(page.getByTestId("loading-surface")).toHaveAttribute(
    "data-phase",
    "pending",
  );
  await delivery(page, "加载").click();
  await settle(page);
  await expect(button(page, "开始 / 重试模拟加载")).toBeFocused();
  await step(page, 2).click();
  await button(page, "乐观添加条目").click();
  await button(page, "清空本地实验").click();
  await expect(button(page, "清空本地实验")).toBeFocused();
  await expect(page.locator("[data-entry-id]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^投递最早条目结果/ }),
  ).toHaveText("投递最早条目结果（0）");
  await button(page, "乐观添加条目").click();
  await page.reload();
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await button(page, "☰ 课程").click();
  await nav.getByRole("button").nth(14).click();
  await expect(page.locator("[data-entry-id]")).toHaveCount(0);
});

test("corrupt storage is sanitized and edited clipboard success plus late failure cannot overwrite reset", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("feedback-seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          done: [99, 0, 0],
          loadingModes: ["bad", "spinner"],
          answers: [99, 0, 1],
          draft: 3,
        }),
      );
      sessionStorage.setItem("feedback-seed", "yes");
    }
  }, key);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.feedbackCopied = text;
        },
      },
    }),
  );
  await open(page, 4);
  await button(page, "生成反馈指令").click();
  const draft = page.getByLabel("可编辑的 反馈 Agent 指令"),
    value = (await draft.inputValue()) + "\n实际编辑检查。";
  await draft.fill(value);
  await button(page, "复制反馈指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.feedbackCopied)).toBe(value);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((_, reject) => {
            window.rejectFeedback = reject;
          }),
      },
    }),
  );
  await button(page, "复制反馈指令").click();
  await button(page, "重置第十五节进度").click();
  await button(page, "确认重置第十五节").click();
  await page.evaluate(() => window.rejectFeedback(Error("late")));
  await step(page, 4).click();
  await expect(draft).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText(
    "自动复制不可用",
  );
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  });
  await page.reload();
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await button(page, "☰ 课程").click();
  await nav.getByRole("button").nth(14).click();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});

test("bounded canceled-result queue keeps recovery text and can resume after a stale result is drained", async ({
  page,
}) => {
  await open(page, 2);
  await button(page, "乐观添加条目").click();
  await button(page, "取消 路线 A").click();
  for (let n = 1; n < 16; n++) {
    await button(page, "重试 路线 A").click();
    await button(page, "取消 路线 A").click();
  }
  await expect(
    page.getByRole("button", { name: /^投递最早条目结果/ }),
  ).toHaveText("投递最早条目结果（16）");
  await button(page, "重试 路线 A").click();
  await expect(item(page, "路线 A")).toHaveAttribute("data-phase", "cancelled");
  await expect(button(page, "重试 路线 A")).toBeFocused();
  await expect(page.getByTestId("ledger-feedback")).toContainText(
    "先投递旧结果",
  );
  await page.getByRole("button", { name: /^投递最早条目结果/ }).click();
  await button(page, "重试 路线 A").click();
  await expect(item(page, "路线 A")).toHaveAttribute("data-phase", "pending");
  await expect(
    page.getByRole("button", { name: /^投递最早条目结果/ }),
  ).toHaveText("投递最早条目结果（16）");
});

test("observation gates count rendered pending feedback and actual spinner with known progress", async ({
  page,
}) => {
  await open(page);
  await choice(page, "加载反馈方式", "Skeleton · 布局占位").click();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).loadingModes,
      key,
    ),
  ).toEqual([]);
  await button(page, "开始 / 重试模拟加载").click();
  await button(page, "手动推进至 50%").click();
  let data = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(data.loadingModes).toEqual(["skeleton"]);
  expect(data.knownProgress).toBe(false);
  await choice(page, "加载反馈方式", "spinner · 忙碌图标").click();
  await expect(page.locator(".feedback-spinner")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "50");
  data = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  expect(data.loadingModes.sort()).toEqual(["skeleton", "spinner"]);
  expect(data.knownProgress).toBe(true);
});
