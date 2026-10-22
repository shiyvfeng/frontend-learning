import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  stateNames,
  eventNames,
  rules,
  initialTask,
  assess,
  transition,
} from "../src/lesson-sixteen-machine.js";
const out = "/tmp/machine-acceptance",
  key = "frontend-observatory.lesson16.v1",
  prior = Array.from(
    { length: 15 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const button = (p, n) => p.getByRole("button", { name: n, exact: true }),
  ev = (p, id) => p.locator(`[data-event="${id}"]`),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第十六节学习步骤" })
      .getByRole("button")
      .nth(n),
  oldest = (p) => p.getByRole("button", { name: /^投递最早模拟结果/ }),
  newest = (p) => p.getByRole("button", { name: /^投递最新模拟结果/ });
async function settle(p) {
  await p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(button(p, "☰ 课程"), "directory");
  await act(nav.getByRole("button").nth(15), "lesson16");
  await expect(p.locator("#machine-stage-heading")).toBeVisible();
  await settle(p);
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  await settle(p);
}
async function phase(p, expected) {
  await expect(p.getByTestId("machine-state")).toHaveAttribute(
    "data-phase",
    expected,
  );
  await expect(p.getByTestId("state-graph")).toHaveAttribute(
    "data-current",
    expected,
  );
  await expect(p.locator(".machine-node[data-active=true]")).toHaveCount(1);
  await expect(p.locator(".machine-node[data-active=true]")).toHaveAttribute(
    "data-state",
    expected,
  );
  for (const r of rules) {
    const row = p.locator(`[data-rule="${r.key}"]`);
    await expect(row).toHaveAttribute(
      "data-current-from",
      String(r.from === expected),
    );
  }
}
async function ready(p, act = (l) => l.click(), toggle = (l) => l.check()) {
  await act(button(p, "填入示例标题"), "sample");
  await act(ev(p, "REVIEW"), "review");
  await toggle(p.getByLabel("已核对任务说明", { exact: true }), "consent");
  await act(ev(p, "START"), "start");
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
const deny = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });

test("pure transition model enumerates all state-event combinations and validates guards without mutation", () => {
  for (const state of Object.keys(stateNames))
    for (const type of Object.keys(eventNames)) {
      const m = {
        ...initialTask(),
        phase: state,
        context: { ...initialTask().context, title: "样例任务", consent: true },
        active: state === "running" ? 3 : 0,
        sequence: 3,
      };
      const before = JSON.stringify(m),
        event = { type, attempt: m.active },
        rule = rules.find((r) => r.from === state && r.event === type),
        result = transition(m, event);
      expect(result.decision.ok).toBe(!!rule);
      expect(result.model.phase).toBe(rule?.to ?? state);
      expect(JSON.stringify(m)).toBe(before);
      expect(Object.hasOwn(stateNames, result.model.phase)).toBe(true);
      if (!rule) expect(result.model).toBe(m);
    }
  const blank = initialTask();
  expect(assess(blank, { type: "REVIEW" }).code).toBe("title");
  const review = {
    ...blank,
    phase: "review",
    context: { ...blank.context, title: "任务" },
  };
  expect(assess(review, { type: "START" }).code).toBe("consent");
  expect(
    assess(
      {
        ...review,
        context: { ...review.context, consent: true },
        queue: Array(16).fill({}),
      },
      { type: "START" },
    ).code,
  ).toBe("capacity");
  expect(
    assess(
      { ...review, phase: "running", active: 5 },
      { type: "DONE", attempt: 4 },
    ).code,
  ).toBe("attempt");
  expect(
    assess(
      { ...review, phase: "running", active: 5 },
      { type: "DONE", attempt: 4, source: "queue" },
    ).code,
  ).toBe("stale");
  expect(assess(blank, { type: "UNKNOWN" }).code).toBe("unknown-event");
});
test("sixteenth is lazy with twenty-two releases and no runtime XState or Rive dependency", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-sixteen-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(urls.some((u) => /lesson-sixteen-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("State Machine · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(22);
  await expect(page.locator(".machine-lab")).toContainText("无 XState / Rive");
  await phase(page, "draft");
});
test("guards illegal and duplicate events keep phase and attempt identity while error retry succeeds", async ({
  page,
}) => {
  await open(page, 1);
  await ev(page, "REVIEW").click();
  await expect(page.getByTestId("machine-feedback")).toContainText(
    "标题守卫失败",
  );
  await phase(page, "draft");
  await button(page, "填入示例标题").click();
  await ev(page, "REVIEW").click();
  await ev(page, "START").click();
  await expect(page.getByTestId("machine-feedback")).toContainText(
    "确认守卫失败",
  );
  await phase(page, "review");
  await page.getByLabel("已核对任务说明", { exact: true }).check();
  await ev(page, "START").click();
  const attempt = await page
    .getByTestId("machine-state")
    .getAttribute("data-attempt");
  await ev(page, "START").evaluate((e) => {
    e.click();
    e.click();
  });
  await expect(page.getByTestId("machine-state")).toHaveAttribute(
    "data-attempt",
    attempt,
  );
  await expect(oldest(page)).toHaveText("投递最早模拟结果（1）");
  await ev(page, "EDIT").click();
  await expect(page.getByTestId("machine-feedback")).toContainText(
    "不允许 EDIT",
  );
  await phase(page, "running");
  await ev(page, "FAIL").click();
  await phase(page, "error");
  await ev(page, "RETRY").click();
  await ev(page, "DONE").click();
  await phase(page, "success");
  await ev(page, "DONE").click();
  await expect(page.getByTestId("machine-feedback")).toContainText(
    "不允许 DONE",
  );
  await phase(page, "success");
});
test("graph table and real transition state agree through every phase and independent data coexist", async ({
  page,
}) => {
  await open(page);
  await ready(page);
  await phase(page, "running");
  await page.getByLabel("标记重要任务", { exact: true }).check();
  await page.getByLabel("展开任务详情", { exact: true }).check();
  await phase(page, "running");
  await expect(page.getByTestId("orthogonal-data")).toHaveAttribute(
    "data-pinned",
    "true",
  );
  await expect(page.getByTestId("orthogonal-data")).toHaveAttribute(
    "data-details",
    "true",
  );
  await button(page, "读取当前状态与可用事件").click();
  await expect(page.getByTestId("machine-inspection")).toContainText("一致=是");
  await page.getByLabel("显示全部转换（默认只画当前出边与上次转换）").check();
  await expect(page.locator("[data-edge]")).toHaveCount(11);
  await ev(page, "FAIL").click();
  await phase(page, "error");
  await ev(page, "RETRY").click();
  await phase(page, "running");
  await ev(page, "CANCEL").click();
  await phase(page, "cancelled");
  await ev(page, "RESET").click();
  await phase(page, "draft");
  await expect(page.getByLabel("任务标题", { exact: true })).toHaveValue(
    "资料整理任务",
  );
  await expect(
    page.getByLabel("已核对任务说明", { exact: true }),
  ).not.toBeChecked();
  await expect(page.getByLabel("标记重要任务", { exact: true })).toBeChecked();
});
test("canceled old success and failure cannot change new running attempt or lose orthogonal data", async ({
  page,
}) => {
  for (const type of ["DONE", "FAIL"]) {
    await open(page, 2);
    await page
      .getByRole("group", { name: "下一次本地结果", exact: true })
      .getByRole("button", {
        name: type === "DONE" ? "成功事件 DONE" : "失败事件 FAIL",
        exact: true,
      })
      .click();
    await ready(page);
    await ev(page, "CANCEL").click();
    await ev(page, "RESET").click();
    await page
      .getByRole("group", { name: "下一次本地结果", exact: true })
      .getByRole("button", { name: "成功事件 DONE", exact: true })
      .click();
    await ev(page, "REVIEW").click();
    await page.getByLabel("已核对任务说明", { exact: true }).check();
    await ev(page, "START").click();
    const attempt = await page
      .getByTestId("machine-state")
      .getAttribute("data-attempt");
    await oldest(page).click();
    await phase(page, "running");
    await expect(page.getByTestId("machine-state")).toHaveAttribute(
      "data-attempt",
      attempt,
    );
    await expect(page.getByTestId("machine-feedback")).toContainText(
      "旧尝试 #1 已失效",
    );
    await oldest(page).click();
    await phase(page, "success");
  }
});
test("rendered current rules and edges track guard values without changing phase", async ({
  page,
}) => {
  await open(page);
  const edge = page.locator('[data-edge="draft-REVIEW"]');
  await expect(edge).toHaveAttribute("data-status", "blocked");
  await page.getByLabel("任务标题", { exact: true }).fill("真实编辑任务");
  await expect(edge).toHaveAttribute("data-status", "allowed");
  await expect(ev(page, "REVIEW")).toHaveAttribute("data-allowed", "true");
  await ev(page, "REVIEW").click();
  await expect(page.locator('[data-edge="review-START"]')).toHaveAttribute(
    "data-status",
    "blocked",
  );
  await page.getByLabel("已核对任务说明", { exact: true }).check();
  await expect(page.locator('[data-edge="review-START"]')).toHaveAttribute(
    "data-status",
    "allowed",
  );
  await phase(page, "review");
});
test("bounded old-event queue is recoverable and all simulation stays local", async ({
  page,
}) => {
  await open(page);
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await ready(page);
  await ev(page, "FAIL").click();
  for (let i = 1; i < 16; i++) {
    await ev(page, "RETRY").click();
    await ev(page, "FAIL").click();
  }
  await ev(page, "RETRY").click();
  await expect(page.getByTestId("machine-feedback")).toContainText(
    "队列已满16",
  );
  await phase(page, "error");
  await oldest(page).click();
  await ev(page, "RETRY").click();
  await phase(page, "running");
  expect(requests).toEqual([]);
  await button(page, "新建空白本地实验").click();
  await expect(oldest(page)).toHaveText("投递最早模拟结果（0）");
  await stage(page, 1).click();
  await phase(page, "draft");
  await expect(page.getByLabel("任务标题", { exact: true })).toHaveValue("");
});
test("every station and each real business phase passes axe with desktop/375 local crops and no mandatory motion", async ({
  page,
}, info) => {
  await open(page);
  mkdirSync(out, { recursive: true });
  for (let n = 0; n < 5; n++) {
    await stage(page, n).click();
    if (n === 4) await button(page, "生成状态机指令").click();
    await axeCheck(page);
    await fit(page);
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station-${n + 1}-${info.project.name}.png` });
  }
  await stage(page, 0).click();
  await ready(page);
  for (const id of ["FAIL", "RETRY", "CANCEL", "RESET"]) {
    await ev(page, id).click();
    await axeCheck(page);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("state-graph")).toBeVisible();
  expect(
    await page
      .locator(".machine-lab")
      .evaluate((e) =>
        [...e.querySelectorAll("*")].every(
          (n) => getComputedStyle(n).animationName === "none",
        ),
      ),
  ).toBe(true);
});
async function snapshot(p) {
  return p.evaluate(() => {
    const e = document.activeElement,
      r = e.getBoundingClientRect(),
      h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      tag: e.tagName,
      text: e.textContent.trim().slice(0, 100),
      disabled: !!e.disabled,
      visible: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1,
      covered: h !== e && !e.contains(h),
      outline: getComputedStyle(e).outlineStyle,
      phase: document.querySelector('[data-testid="machine-state"]').dataset
        .phase,
    };
  });
}
function valid(r) {
  expect(r.tag, JSON.stringify(r)).toBe("BUTTON");
  expect(r.disabled).toBe(false);
  expect(r.visible).toBe(true);
  expect(r.covered).toBe(false);
  expect(r.outline).not.toBe("none");
}
test("immediate real keyboard focus for guard failure illegal duplicate cancel success error stale and external control", async ({
  page,
}, info) => {
  const rows = [],
    trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson16-immediate",
      profile: info.project.name,
    });
  const act = async (l, name) => {
    await seek(l, name);
    await page.keyboard.press("Enter");
    await settle(page);
    const r = { name, ...(await snapshot(page)) };
    valid(r);
    rows.push(r);
  };
  await open(page);
  await act(ev(page, "REVIEW"), "title guard");
  await button(page, "填入示例标题").click();
  await act(ev(page, "REVIEW"), "review");
  await act(ev(page, "START"), "consent guard");
  await page.getByLabel("已核对任务说明", { exact: true }).check();
  await act(ev(page, "START"), "start");
  await act(ev(page, "START"), "duplicate");
  await act(ev(page, "EDIT"), "illegal");
  await act(ev(page, "CANCEL"), "cancel");
  await act(oldest(page), "old success");
  expect(rows.at(-1).text).toBe("读取当前状态与可用事件");
  await act(ev(page, "RESET"), "reset");
  await ready(page);
  await act(oldest(page), "success");
  expect(rows.at(-1).text).toBe("读取当前状态与可用事件");
  await act(ev(page, "RESET"), "new draft");
  await page
    .getByRole("group", { name: "下一次本地结果", exact: true })
    .getByRole("button", { name: "失败事件 FAIL", exact: true })
    .click();
  await ready(page);
  await act(oldest(page), "failure");
  expect(rows.at(-1).text).toBe("读取当前状态与可用事件");
  const ext = button(page, "完成并继续");
  await ev(page, "RETRY").click();
  await seek(ext, "external");
  await oldest(page).evaluate((e) => e.click());
  await settle(page);
  await expect(ext).toBeFocused();
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/immediate-${info.project.name}.json`,
    JSON.stringify({ rows, trace }, null, 2),
  );
});
async function flow(p, act, toggle, edit) {
  const a = (n) => act(button(p, n), n),
    e = (id) => act(ev(p, id), id),
    next = () => a("完成并继续");
  await directory(p, act);
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await ready(p, act, toggle);
  await e("DONE");
  await a("读取当前状态与可用事件");
  await next();
  await e("REVIEW");
  await expect(p.getByTestId("machine-feedback")).toContainText("标题守卫失败");
  await a("填入示例标题");
  await e("REVIEW");
  await e("START");
  await expect(p.getByTestId("machine-feedback")).toContainText("确认守卫失败");
  await toggle(p.getByLabel("已核对任务说明", { exact: true }), "consent");
  await e("START");
  await e("EDIT");
  await e("START");
  await e("FAIL");
  await e("RETRY");
  await e("DONE");
  await next();
  await ready(p, act, toggle);
  await toggle(p.getByLabel("标记重要任务", { exact: true }), "pinned");
  await toggle(p.getByLabel("展开任务详情", { exact: true }), "details");
  await e("CANCEL");
  await e("RESET");
  await e("REVIEW");
  await toggle(p.getByLabel("已核对任务说明", { exact: true }), "confirm new");
  await e("START");
  await act(oldest(p), "old ignored");
  await phase(p, "running");
  await act(oldest(p), "new success");
  await phase(p, "success");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry " + i);
  await next();
  await a("生成状态机指令");
  const draft = p.getByLabel("可编辑的 状态机 Agent 指令");
  await expect(draft).toHaveValue(
    /互斥状态.*事件与允许转换.*守卫.*错误、取消与迟到结果/s,
  );
  if (edit) await edit(draft);
  await a("复制状态机指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 状态、事件、守卫、允许/禁止转换与恢复验收。"),
    "review draft",
  );
  await a("完成第十六节");
  await expect(p.locator(".lesson-sixteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.machineKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-sixteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十六节进度");
  await a("保留第十六节进度");
  await expect(p.locator(".lesson-sixteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十六节进度");
  await a("确认重置第十六节");
  await expect(p.locator("#machine-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-sixteen .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await phase(p, "draft");
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.machineKeys ?? null),
  };
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
test("complete keyboard machine flow guard and illegal retry edit quiz refresh cancel confirm reset preserves fifteen stores", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { seek, act, toggle } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson16",
      profile: info.project.name,
    });
  const r = await flow(page, act, toggle, async (f) => {
    await seek(f, "edit");
    await page.keyboard.press("Control+End");
    await page.keyboard.type("\nReview: guarded events.");
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
test("complete zero keyboard touch machine flow guard retry wrong quiz refresh cancel confirm reset preserves fifteen stores", async ({
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
    window.machineKeys = [];
    for (const type of ["keydown", "keyup"])
      addEventListener(type, (e) => window.machineKeys.push(e.key));
  });
  const before = await seed(p),
    tap = async (l, n) => {
      await l.tap();
      trace.push(n);
    },
    r = await flow(p, tap, tap);
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
test("clipboard success real editing late error and unavailable storage leave reset honest", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (t) => {
          window.machineCopied = t;
        },
      },
    }),
  );
  await open(page, 4);
  await button(page, "生成状态机指令").click();
  const draft = page.getByLabel("可编辑的 状态机 Agent 指令"),
    text = (await draft.inputValue()) + "\n真实编辑。";
  await draft.fill(text);
  await button(page, "复制状态机指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.machineCopied)).toBe(text);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((_, reject) => (window.rejectMachine = reject)),
      },
    }),
  );
  await button(page, "复制状态机指令").click();
  await button(page, "重置第十六节进度").click();
  await button(page, "确认重置第十六节").click();
  await page.evaluate(() => window.rejectMachine(Error("late")));
  await stage(page, 4).click();
  await expect(draft).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText(
    "自动复制不可用",
  );
  await page.addInitScript((k) => {
    localStorage.setItem(k, '{"step":99,"done":[0,99],"answers":[9,0,1]}');
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  }, key);
  await page.reload();
  await directory(page);
  await expect(stage(page, 0)).toHaveAttribute("aria-current", "step");
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});

test("learning gates distinguish review cancellation completed duplicates and a genuinely canceled attempt", async ({
  page,
}) => {
  await open(page, 2);
  await button(page, "填入示例标题").click();
  await ev(page, "REVIEW").click();
  await ev(page, "CANCEL").click();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).cancelled,
      key,
    ),
  ).toBe(false);
  await ev(page, "RESET").click();
  await ready(page);
  await ev(page, "DONE").click();
  await oldest(page).click();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).lateIgnored,
      key,
    ),
  ).toBe(false);
  await ev(page, "RESET").click();
  await ready(page);
  await ev(page, "CANCEL").click();
  await oldest(page).click();
  const d = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(d.cancelled).toBe(true);
  expect(d.lateIgnored).toBe(true);
  const allocated = await page.getByTestId("machine-state").textContent();
  await button(page, "新建空白本地实验").click();
  await ready(page);
  await expect(page.getByTestId("machine-state")).toHaveAttribute(
    "data-attempt",
    "3",
  );
});
