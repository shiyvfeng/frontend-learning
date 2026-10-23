import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL11_STORAGE as KEY,
  tool11Initial,
  tool11Brief,
  tool11Questions,
  recommendation,
} from "../src/tool-eleven-content.js";
import {
  createFlowSession,
  runtimeState,
  publicEvents,
} from "../src/tool-eleven-runtime.js";
const out = "/tmp/tool11-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  f = (p, n) => p.locator("#tool11-" + n),
  lab = (p) => p.locator(".tool11-lab[data-phase]"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T11工具专题学习步骤" })
      .getByRole("button")
      .nth(n),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  save = (n, v) =>
    writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", { name: "T11 · XState · 可学习", exact: true }),
    "T11",
  );
  await expect(f(p, "stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  if (n) await stage(p, n).click();
}
async function seed(p, d) {
  await p.addInitScript(
    ([k, d]) => localStorage.setItem(k, JSON.stringify(d)),
    [KEY, d],
  );
}
const view = async (p) => JSON.parse(await lab(p).getAttribute("data-view"));
const phase = async (p, v, status = "active") => {
  await expect(lab(p)).toHaveAttribute("data-phase", v);
  await expect(lab(p)).toHaveAttribute("data-actor-status", status);
};
const tick = () => new Promise((r) => setImmediate(r));
const fill = async (p, act = (l) => l.click()) => {
  await act(b(p, "填入申请标题示例"), "title sample");
  await act(b(p, "切换业务确认"), "confirm");
};
const prepare = (s) => {
  s.start();
  s.send({ type: "SET_TITLE", value: "社团设备申请" });
  s.send({ type: "TOGGLE_CONFIRM" });
};
async function axes(p) {
  await p.evaluate(axe);
  expect(
    await p.evaluate(
      async () =>
        (
          await axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          })
        ).violations,
    ),
  ).toEqual([]);
}
const good = () => ({
  ...tool11Initial(),
  done: [0, 1, 2, 3],
  scenariosSeen: ["simple", "workflow"],
  uiSeen: true,
  comparedSeen: true,
  guardSeen: true,
  illegalSeen: true,
  contextSeen: true,
  completedSeen: true,
  inspectedSeen: true,
  failureSeen: true,
  retrySeen: true,
  canceledSeen: true,
  lateSeen: true,
  ignoreSeen: true,
  stoppedSeen: true,
  cleanupSeen: true,
  answers: tool11Questions.map((q) => q.correct),
});

test("actual installed XState machine actor identity guard invalid duplicate context and final", async () => {
  const base = runtimeState(),
    s = createFlowSession();
  try {
    expect(s.actor.logic).toBe(s.machine);
    expect(s.machine.config.id).toBe("booking");
    expect(s.machine.implementations.actors.reserve).toBeTruthy();
    expect(runtimeState().actors).toBe(base.actors);
    s.start();
    expect(s.actor.getSnapshot().can({ type: "SUBMIT" })).toBe(false);
    expect(s.send({ type: "SUBMIT" }).guardBlocked).toBe(true);
    expect(s.api.snapshot().calls).toBe(0);
    s.send({ type: "FAKE_COMPLETE" });
    expect(s.actor.getSnapshot().value).toBe("draft");
    prepare(s);
    s.send({ type: "SUBMIT" });
    const child = s.actor.getSnapshot().children.reservation,
      context = s.actor.getSnapshot().context;
    expect(child.getSnapshot().status).toBe("active");
    s.send({ type: "SUBMIT" });
    expect(s.api.snapshot().calls).toBe(1);
    s.send({ type: "TOGGLE_MARK" });
    expect(s.actor.getSnapshot().children.reservation).toBe(child);
    expect(s.actor.getSnapshot().context).not.toBe(context);
    expect(s.actor.getSnapshot().context.marked).toBe(true);
    expect(s.actor.getSnapshot().context.sentTitle).toBe("社团设备申请");
    s.api.deliver(1);
    await tick();
    expect(s.actor.getSnapshot().value).toBe("reserved");
    expect(
      s
        .inspect()
        .events.some(
          (e) =>
            e.event === "xstate.done.actor.reservation" &&
            e.after === "reserved",
        ),
    ).toBe(true);
    s.send({ type: "FINISH" });
    expect(s.actor.getSnapshot().status).toBe("done");
    expect(s.inspect().snapshot.can.TOGGLE_MARK).toBe(false);
    expect(s.inspect().snapshot.rawCan.TOGGLE_MARK).toBe(true);
    expect(runtimeState().actors).toBe(base.actors);
    expect(runtimeState().subscriptions).toBe(base.subscriptions);
  } finally {
    s.destroy();
  }
  expect({ ...runtimeState(), created: 0 }).toEqual({ ...base, created: 0 });
});

test("real invoke rejection retry mismatch output guard edit and immutable inputs", async () => {
  const s = createFlowSession({ minLength: 6 });
  try {
    prepare(s);
    s.send({ type: "SUBMIT" });
    s.api.deliver(1, "error");
    await tick();
    expect(s.actor.getSnapshot().value).toBe("failure");
    expect(
      s
        .inspect()
        .events.some((e) => e.event === "xstate.error.actor.reservation"),
    ).toBe(true);
    s.send({ type: "RETRY" });
    expect(s.api.snapshot().calls).toBe(2);
    expect(s.actor.getSnapshot().context.attempt).toBe(2);
    s.api.deliver(2, "mismatch");
    await tick();
    expect(s.actor.getSnapshot().value).toBe("failure");
    expect(s.actor.getSnapshot().context.result).toBeNull();
    expect(s.actor.getSnapshot().context.error).toContain("试次不匹配");
    s.send({ type: "EDIT" });
    s.send({ type: "SET_TITLE", value: "新申请完整标题" });
    s.send({ type: "SUBMIT" });
    s.api.deliver(3);
    await tick();
    expect(s.actor.getSnapshot().context.result).toMatchObject({
      attempt: 3,
      title: "新申请完整标题",
    });
    expect(s.api.snapshot().records[0].title).toBe("社团设备申请");
  } finally {
    s.destroy();
  }
});
for (const mode of ["cooperate", "ignore"])
  test(`real Promise cancellation ${mode} late old success and rejection cannot change new invoke`, async () => {
    const base = runtimeState(),
      s = createFlowSession({ cancelMode: mode });
    try {
      prepare(s);
      s.send({ type: "SUBMIT" });
      const old = s.actor.getSnapshot().children.reservation;
      s.send({ type: "CANCEL" });
      expect(old.getSnapshot().status).toBe("stopped");
      expect(s.api.snapshot().records[0].status).toBe(
        mode === "ignore" ? "detached" : "canceled",
      );
      s.send({ type: "SUBMIT" });
      const next = s.actor.getSnapshot().children.reservation;
      s.api.deliver(1);
      await tick();
      expect(s.actor.getSnapshot().value).toBe("pending");
      expect(s.actor.getSnapshot().children.reservation).toBe(next);
      expect(s.actor.getSnapshot().context.attempt).toBe(2);
      expect(
        s
          .inspect()
          .events.filter((e) => e.event.startsWith("xstate.done.actor.")),
      ).toHaveLength(0);
      expect(s.api.snapshot().records[0].output.attempt).toBe(1);
      s.send({ type: "CANCEL" });
      s.send({ type: "SUBMIT" });
      s.api.deliver(2, "error");
      await tick();
      expect(s.actor.getSnapshot().value).toBe("pending");
      expect(s.actor.getSnapshot().context.attempt).toBe(3);
      s.api.deliver(3);
      await tick();
      expect(s.actor.getSnapshot().value).toBe("reserved");
      expect(s.actor.getSnapshot().context.result.attempt).toBe(3);
      const total = s.inspect().events.length;
      s.api.deliver(3);
      await tick();
      expect(s.inspect().events.length).toBe(total);
    } finally {
      s.destroy();
    }
    expect(runtimeState().pendingEffects).toBe(base.pendingEffects);
  });

test("actual actor stop unsubscribe destroy owns pending work and late callbacks", async () => {
  const base = runtimeState(),
    s = createFlowSession({ cancelMode: "ignore" });
  let notifications = 0;
  prepare(s);
  const unsub = s.subscribe(() => notifications++);
  s.send({ type: "SUBMIT" });
  expect(runtimeState().subscriptions).toBe(base.subscriptions + 1);
  s.stop();
  expect(s.actor.getSnapshot().status).toBe("stopped");
  expect(s.inspect().snapshot.can.SUBMIT).toBe(false);
  expect(runtimeState().subscriptions).toBe(base.subscriptions);
  s.api.deliver(1);
  await tick();
  expect(s.actor.getSnapshot().value).toBe("pending");
  expect(s.actor.getSnapshot().context.result).toBeNull();
  s.destroy();
  const n = notifications;
  s.api.deliver(1);
  s.send({ type: "FINISH" });
  unsub();
  unsub();
  s.destroy();
  await tick();
  expect(notifications).toBe(n);
  expect({ ...runtimeState(), created: 0 }).toEqual({ ...base, created: 0 });
});

test("bounded noncooperating effects actual invoke fails at capacity then draining recovers", async () => {
  const base = runtimeState(),
    s = createFlowSession({ cancelMode: "ignore" });
  try {
    prepare(s);
    for (let i = 0; i < 8; i++) {
      s.send({ type: "SUBMIT" });
      s.send({ type: "CANCEL" });
    }
    expect(s.api.snapshot().pending).toBe(8);
    s.send({ type: "SUBMIT" });
    await tick();
    expect(s.actor.getSnapshot().value).toBe("failure");
    expect(s.actor.getSnapshot().context.error).toContain("8");
    expect(s.api.snapshot().calls).toBe(9);
    for (let i = 1; i <= 8; i++) s.api.deliver(i);
    await tick();
    expect(s.api.snapshot().pending).toBe(0);
    s.send({ type: "RETRY" });
    s.api.deliver(10);
    await tick();
    expect(s.actor.getSnapshot().value).toBe("reserved");
    expect(s.actor.getSnapshot().context.result.attempt).toBe(10);
  } finally {
    s.destroy();
  }
  expect(runtimeState().pendingEffects).toBe(base.pendingEffects);
});

test("40 event24 history bounds still retain unsettled rows and dispose them", async () => {
  const s = createFlowSession();
  try {
    prepare(s);
    for (let i = 0; i < 30; i++) {
      s.send({ type: "SUBMIT" });
      s.send({ type: "CANCEL" });
    }
    expect(s.inspect().events).toHaveLength(40);
    expect(s.api.snapshot().records).toHaveLength(24);
    expect(s.api.snapshot().calls).toBe(30);
    expect(s.api.snapshot().pending).toBe(0);
  } finally {
    s.destroy();
  }
});

test("official sources actual stable core selection limits and no Query or old source residue", async ({
  page,
}) => {
  await open(page);
  const refs = page
    .locator(".tool-eleven .roadmap-details")
    .filter({ hasText: "T11工具专题核对说明与官方来源" });
  await refs.locator(":scope > summary").click();
  await expect(refs.getByRole("link")).toHaveCount(6);
  await expect(refs).toContainText("5.33.3");
  await expect(refs).not.toContainText(/TanStack|Open Code|CLI|Radix/);
  for (const n of [
    "受约束异步流程",
    "切换本地说明面板",
    "记录复杂性与选型条件",
  ])
    await b(page, n).click();
  expect((await read(page)).scenariosSeen).toEqual(["simple", "workflow"]);
  expect(recommendation(tool11Initial())).toContain("React");
  expect(
    recommendation({ ...tool11Initial(), scenario: "workflow" }),
  ).toContain("普通转换表");
  for (const term of [
    "guard",
    "context",
    "invoke",
    "AbortSignal",
    "Promise actor",
    "actor.stop",
    "原46项入口已制作",
  ])
    expect(tool11Brief(good())).toContain(term);
});

test("actual guard invalid and repeated events request count graph and context agree", async ({
  page,
}, info) => {
  await open(page, 1);
  await b(page, "提交申请").click();
  await phase(page, "draft");
  expect((await view(page)).service.calls).toBe(0);
  await b(page, "尝试非法完成事件").click();
  await fill(page);
  await f(page, "title").fill("可编辑的社团申请");
  await b(page, "提交申请").click();
  await phase(page, "pending");
  await b(page, "提交申请").click();
  await b(page, "切换关注标记").click();
  let v = await view(page);
  expect(v.service.calls).toBe(1);
  expect(v.snapshot.context).toMatchObject({
    marked: true,
    sentTitle: "可编辑的社团申请",
  });
  expect(
    v.events.filter((e) => e.event === "SUBMIT").map((e) => e.allowed),
  ).toEqual([false, true, false]);
  await expect(page.locator('[data-state-node="pending"]')).toHaveAttribute(
    "data-current",
    "true",
  );
  expect(
    v.transitions.filter((t) => t.from === "pending").map((t) => t.target),
  ).toEqual(["draft", "reserved", "failure", "failure"]);
  await b(page, "投递当前结果成功").click();
  await phase(page, "reserved");
  await b(page, "完成流程").click();
  await phase(page, "completed", "done");
  await b(page, "读取真实machine与actor快照").click();
  v = JSON.parse(
    await page
      .locator("[data-machine-snapshot]")
      .getAttribute("data-machine-snapshot"),
  );
  expect(v.snapshot.context.result).toMatchObject({
    attempt: 1,
    title: "可编辑的社团申请",
  });
  expect(
    v.events.some((e) => e.event === "xstate.done.actor.reservation"),
  ).toBe(true);
  expect(v.snapshot.can.FINISH).toBe(false);
  expect((await read(page)).completedSeen).toBe(true);
  save(info.project.name + "-actual-machine", v);
});

test("failure and incorrect attempt guard use actual invoke then retry succeeds", async ({
  page,
}) => {
  await open(page, 2);
  await fill(page);
  await b(page, "提交申请").click();
  await b(page, "投递当前结果试次错误").click();
  await phase(page, "failure");
  await expect(page.locator(".tool11-error")).toContainText("试次不匹配");
  await b(page, "重试申请").click();
  await phase(page, "pending");
  await b(page, "投递当前结果失败").click();
  await phase(page, "failure");
  await b(page, "重试申请").click();
  await b(page, "投递当前结果成功").click();
  await phase(page, "reserved");
  expect((await view(page)).service.calls).toBe(3);
  await expect.poll(async () => (await read(page)).retrySeen).toBe(true);
});

test("noncooperating canceled real Promise child stopped and late output does not finish current request", async ({
  page,
}, info) => {
  await open(page, 2);
  await f(page, "cancelMode").selectOption("ignore");
  await fill(page);
  await b(page, "提交申请").click();
  await b(page, "取消当前申请").click();
  await b(page, "提交申请").click();
  await b(page, "投递最早旧结果").click();
  await phase(page, "pending");
  let v = await view(page);
  expect(v.service.records[0]).toMatchObject({
    status: "late",
    wasDetached: true,
    childStatus: "stopped",
    output: { attempt: 1 },
  });
  expect(v.snapshot.context.attempt).toBe(2);
  expect(v.snapshot.context.result).toBeNull();
  expect(v.events.filter((e) => e.origin === "真实invoke")).toHaveLength(0);
  await b(page, "投递当前结果成功").click();
  await phase(page, "reserved");
  v = await view(page);
  expect(v.snapshot.context.result.attempt).toBe(2);
  await expect.poll(async () => (await read(page)).ignoreSeen).toBe(true);
  save(info.project.name + "-late-real-promise", v);
});

test("stop root actual snapshot remains stopped after old result and rebuild cleans subscriptions", async ({
  page,
}) => {
  await open(page, 2);
  await f(page, "cancelMode").selectOption("ignore");
  await fill(page);
  await b(page, "提交申请").click();
  await b(page, "停止本例actor").click();
  await phase(page, "pending", "stopped");
  await expect(b(page, "停止本例actor")).toBeFocused();
  let v = await view(page);
  expect(v.runtime.actors).toBe(0);
  expect(v.runtime.subscriptions).toBe(0);
  await b(page, "投递最早旧结果").click();
  await phase(page, "pending", "stopped");
  await b(page, "重建演练actor").click();
  await phase(page, "draft");
  await expect(b(page, "重建演练actor")).toBeFocused();
  v = await view(page);
  expect(v.runtime).toMatchObject({
    sessions: 1,
    actors: 1,
    subscriptions: 1,
    uiSubscribers: 1,
    pendingEffects: 0,
  });
});

for (const name of [
  "投递当前结果成功",
  "投递当前结果失败",
  "投递当前结果试次错误",
])
  test(`immediate focus stays on usable stable settlement control ${name}`, async ({
    page,
  }) => {
    await open(page, 1);
    await fill(page);
    await b(page, "提交申请").click();
    const k = createKeyboardNavigator(page, expect, [], {
      lesson: "tool11-focus",
      profile: "settlement",
    });
    await k.act(b(page, name), "settlement");
    await phase(page, name.endsWith("成功") ? "reserved" : "failure");
    await expect(b(page, name)).toBeFocused();
    await expect(b(page, name)).toBeEnabled();
    await expect(b(page, name)).toBeVisible();
    await expect(page.locator(":focus")).not.toHaveJSProperty(
      "tagName",
      "BODY",
    );
  });

test("config rebuild keeps focus and manual draft while revoking stale review", async ({
  page,
}) => {
  const d = {
    ...good(),
    generated: true,
    reviewed: true,
    context: "现有申请流程",
  };
  d.draft = tool11Brief(d) + "人工修改";
  await seed(page, d);
  await open(page, 1);
  await fill(page);
  await b(page, "提交申请").click();
  const keys = createKeyboardNavigator(page, expect, [], {
    lesson: "tool11-rule-focus",
    profile: "native",
  });
  await keys.seek(f(page, "minLength"), "guard native selection");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(f(page, "minLength")).toHaveValue("6");
  await phase(page, "draft");
  await expect(f(page, "minLength")).toBeFocused();
  await f(page, "cancelMode").selectOption("ignore");
  let v = await view(page);
  expect(v.runtime).toMatchObject({
    actors: 1,
    subscriptions: 1,
    pendingEffects: 0,
  });
  expect(v.snapshot.context.minLength).toBe(6);
  expect(await read(page)).toMatchObject({
    draft: d.draft,
    reviewed: false,
    draftStale: true,
  });
  await stage(page, 4).click();
  await expect(f(page, "agent-draft")).toHaveValue(d.draft);
  await b(page, "保留编辑并确认当前实验参数").click();
  expect((await read(page)).draftStale).toBe(false);
  await stage(page, 1).click();
  await f(page, "cancelMode").selectOption("cooperate");
  await stage(page, 4).click();
  await b(page, "重新生成工具选型草稿").click();
  await expect(f(page, "agent-draft")).toContainText("至少6字");
});

test("navigation unmount clears actual local effects and subscriptions no old records on return", async ({
  page,
}) => {
  await open(page, 2);
  await f(page, "cancelMode").selectOption("ignore");
  await fill(page);
  await b(page, "提交申请").click();
  await b(page, "取消当前申请").click();
  await b(page, "提交申请").click();
  expect((await view(page)).runtime.pendingEffects).toBe(2);
  await stage(page, 0).click();
  await stage(page, 2).click();
  const v = await view(page);
  expect(v.service).toMatchObject({ calls: 0, pending: 0, records: [] });
  expect(v.runtime).toMatchObject({
    actors: 1,
    subscriptions: 1,
    sessions: 1,
    uiSubscribers: 1,
    pendingEffects: 0,
  });
});

test("snapshot public graph uses actual machine config and effective can considers stopped status", async ({
  page,
}) => {
  await open(page, 1);
  const v = await view(page);
  expect(await page.locator(".tool11-transitions tbody tr").count()).toBe(
    v.transitions.length,
  );
  await expect(page.locator("[data-state-node]")).toHaveCount(5);
  await expect(page.locator("[data-event-can]")).toHaveCount(
    publicEvents.length,
  );
  await b(page, "停止本例actor").click();
  const s = await view(page);
  expect(Object.values(s.snapshot.can).every((v) => v === false)).toBe(true);
  await b(page, "提交申请").click();
  expect((await view(page)).service.calls).toBe(0);
});

// Reuse the established shell focus/clipboard and storage boundary regressions.
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 actual controls graph and local crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 1 || n === 2) {
      await fill(page);
      await b(page, "提交申请").click();
      await b(page, "投递当前结果成功").click();
      await phase(page, "reserved");
    }
    if (n === 3)
      await page
        .locator(".quiz-grid fieldset")
        .first()
        .getByRole("button")
        .nth(1)
        .click();
    if (n === 4) {
      await b(page, "填入项目现状示例（替换本栏）").click();
      await b(page, "生成工具选型说明").click();
    }
    await axes(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".stage-intro").screenshot({
      path: `${out}/${info.project.name}-station${n + 1}-intro.png`,
    });
    await page
      .locator(n < 3 ? ".tool11-lab" : n === 3 ? ".quiz-grid" : ".agent-editor")
      .screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-body.png`,
      });
  });
const priorKeys = [
  ...Array.from(
    { length: 32 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  "frontend-observatory.stageA.v1",
  "frontend-observatory.stageB.v1",
  ...Array.from(
    { length: 10 },
    (_, i) => `frontend-observatory.tool${String(i + 1).padStart(2, "0")}.v1`,
  ),
];
async function priors(p) {
  await p.addInitScript((ks) => {
    if (window === top)
      for (const [i, k] of ks.entries())
        if (!localStorage.getItem(k))
          localStorage.setItem(
            k,
            JSON.stringify({ step: 0, done: [0], marker: "prior" + i }),
          );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(Error("fixture")) },
    });
  }, priorKeys);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), priorKeys);
}
async function complete(p, act, select, type, toggle = act) {
  for (const n of [
    "受约束异步流程",
    "切换本地说明面板",
    "记录复杂性与选型条件",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "station0");
  await act(b(p, "提交申请"), "guard fails");
  await act(b(p, "尝试非法完成事件"), "illegal event");
  await fill(p, act);
  await type(f(p, "title"), " 用户编辑");
  await act(b(p, "提交申请"), "submit");
  await act(b(p, "切换关注标记"), "orthogonal context");
  await act(b(p, "投递当前结果成功"), "actual invoke success");
  await phase(p, "reserved");
  await act(b(p, "完成流程"), "final");
  await phase(p, "completed", "done");
  await act(b(p, "读取真实machine与actor快照"), "inspect");
  await act(b(p, "完成并继续"), "station1");
  await select(f(p, "cancelMode"), "ignore");
  await fill(p, act);
  await act(b(p, "提交申请"), "failure submit");
  await act(b(p, "投递当前结果失败"), "error");
  await phase(p, "failure");
  await act(b(p, "重试申请"), "retry");
  await act(b(p, "投递当前结果成功"), "retry result");
  await phase(p, "reserved");
  await act(b(p, "重建演练actor"), "new run");
  await fill(p, act);
  await act(b(p, "提交申请"), "old start");
  await act(b(p, "取消当前申请"), "cancel");
  await act(b(p, "提交申请"), "new start");
  await act(b(p, "投递最早旧结果"), "late");
  await phase(p, "pending");
  expect((await view(p)).snapshot.context.result).toBeNull();
  await act(b(p, "投递当前结果成功"), "new success");
  await phase(p, "reserved");
  await act(b(p, "重建演练actor"), "new stop test");
  await fill(p, act);
  await act(b(p, "提交申请"), "pending stop");
  await act(b(p, "停止本例actor"), "root stop");
  await phase(p, "pending", "stopped");
  await act(b(p, "重建演练actor"), "cleanup");
  await act(b(p, "完成并继续"), "station2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool11Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool11Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "sample");
  await type(f(p, "context"), " 用户补充幂等与权限。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(f(p, "agent-draft"), "\n自己的取消补偿约束。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对状态、事件、guard/context、invoke与停止验收。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T11工具专题"), "finish");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T11工具专题进度"), "reset cancel");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T11工具专题进度"), "retain");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T11工具专题进度")).toBeFocused();
  await act(b(p, "重置T11工具专题进度"), "reset");
  await act(b(p, "确认重置T11工具专题"), "confirm");
  await expect(f(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    draft: "",
    context: "",
  });
}
test("real Tab five stations genuine select editable title brief retry refresh cancel confirm reset preserves44", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool11-full",
      profile: info.project.name,
    });
  await directory(page, k.act);
  const select = async (l, v) => {
    await k.seek(l, "native select");
    const vs = await l
      .locator("option")
      .evaluateAll((es) => es.map((e) => e.value));
    await page.keyboard.press("Home");
    for (let i = 0; i < vs.indexOf(v); i++)
      await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(l).toHaveValue(v);
  };
  await complete(
    page,
    k.act,
    select,
    async (l, t) => {
      await k.seek(l, "actual edit");
      await page.keyboard.press("End");
      await page.keyboard.type(t);
    },
    k.toggle,
  );
  const draft = (await read(page)).draft;
  await page.reload();
  await directory(page, k.act);
  await expect(f(page, "agent-draft")).toHaveValue(draft);
  await reset(page, k.act, true);
  expect(
    await page.evaluate(
      (ks) => ks.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(prior);
  save(info.project.name + "-keyboard-full", trace);
});
for (const reducedMotion of ["no-preference", "reduce"])
  test(`zero keyboard emulated touch full ${reducedMotion} actual actor editable retry refresh reset preserves44`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        reducedMotion,
      }),
      p = await c.newPage();
    await p.addInitScript(() => {
      window.keys11 = 0;
      addEventListener("keydown", () => window.keys11++);
    });
    const prior = await priors(p),
      actions = [],
      act = async (l, n) => {
        await l.tap();
        actions.push(n);
      };
    await directory(p, act);
    await complete(
      p,
      act,
      (l, v) => l.selectOption(v),
      async (l, t) => l.fill((await l.inputValue()) + t),
    );
    expect(await p.evaluate(() => window.keys11)).toBe(0);
    const draft = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(f(p, "agent-draft")).toHaveValue(draft);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keys11)).toBe(0);
    expect(
      await p.evaluate(
        (ks) => ks.map((k) => localStorage.getItem(k)),
        priorKeys,
      ),
    ).toEqual(prior);
    save(info.project.name + "-touch-" + reducedMotion, {
      actions,
      keydown: 0,
      fixtures:
        "Actual taps plus selectOption/fill fixtures, not OS picker/IME/physical device",
    });
    await c.close();
  });

test("malformed storage enums min length text bounds and stale review sanitized", async ({
  page,
}) => {
  await seed(page, {
    ...good(),
    step: 9,
    done: [0, 0, 9, "1"],
    minLength: 0,
    cancelMode: "bad",
    scenariosSeen: ["workflow", "bad", "workflow"],
    context: "x".repeat(900),
    draft: "short",
    reviewed: true,
  });
  await open(page);
  expect(await read(page)).toMatchObject({
    step: 0,
    done: [0],
    minLength: 2,
    cancelMode: "cooperate",
    scenariosSeen: ["workflow"],
    reviewed: false,
  });
  expect((await read(page)).context.length).toBe(700);
});
test("unavailable storage does not break actual machine or controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("fixture");
    };
  });
  await open(page, 1);
  await fill(page);
  await b(page, "提交申请").click();
  await b(page, "投递当前结果成功").click();
  await phase(page, "reserved");
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});

test("T10 exit opens T11 fourteen released entries one T12 preview while numbered remains32", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(14);
  await expect(nav.locator(".coverage-preview")).toHaveCount(0);
  await expect(nav.getByRole("button",{name:/T12/})).toHaveCount(1);
  await nav.getByRole("button", { name: /T10/ }).click();
  await b(page, "继续T11 · XState").click();
  await expect(f(page, "stage-heading")).toBeVisible();
  await expect(page).toHaveTitle("XState · 前端观察室");
  await expect(page.locator(".site-footer")).toContainText("真实XState");
  await expect(page.locator(".available-dot")).toHaveCount(32);
});
test("375 short long inert brief actual Tab focus axe and no crop", async ({
  page,
}, info) => {
  await seed(page, { ...good(), step: 4 });
  await page.setViewportSize({ width: 375, height: 480 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await b(page, "填入项目现状示例（替换本栏）").click();
  await b(page, "生成工具选型说明").click();
  await f(page, "agent-draft").fill(
    (await f(page, "agent-draft").inputValue()) +
      "<img src=x onerror=bad()>" +
      "副作用与取消".repeat(80),
  );
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool11-short",
    profile: info.project.name,
  });
  await k.seek(f(page, "agent-draft"), "visible editable brief");
  await axes(page);
  expect(await page.locator(".tool-eleven img").count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".agent-editor")
    .screenshot({ path: `${out}/${info.project.name}-short.png` });
});
test("live reduced motion switching does not restart actor or change current invoke", async ({
  page,
}) => {
  await open(page, 1);
  await fill(page);
  await b(page, "提交申请").click();
  const before = await view(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 480 });
  let v = await view(page);
  expect(v.service.calls).toBe(1);
  expect(v.snapshot.context).toEqual(before.snapshot.context);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await b(page, "投递当前结果成功").click();
  await phase(page, "reserved");
  expect((await view(page)).service.calls).toBe(1);
});
test("clipboard success uses clicked snapshot and never overwrites newer edits", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) => {
          window.copied08 = t;
          return new Promise((r) => (window.release08 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  const x = await f(page, "agent-draft").inputValue();
  await b(page, "复制工具选型说明").click();
  await f(page, "agent-draft").fill(x + "\n随后编辑");
  await page.evaluate(() => window.release08());
  expect(await page.evaluate(() => window.copied08)).toBe(x);
  await expect(f(page, "agent-draft")).toHaveValue(x + "\n随后编辑");
  await expect(page.locator(".copy-feedback")).toContainText("点击时的版本");
});
test("clipboard denial selects only while focus owned and later denial respects real Tab outside", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => new Promise((_, r) => (window.reject08 = r)) },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await page.evaluate(() => window.reject08(Error("fixture")));
  await expect(f(page, "agent-draft")).toBeFocused();
  expect(
    await f(page, "agent-draft").evaluate(
      (e) => e.selectionEnd - e.selectionStart,
    ),
  ).toBe((await f(page, "agent-draft").inputValue()).length);
  await b(page, "复制工具选型说明").click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.reject08(Error("fixture")));
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
test("copy mutex and reset invalidation cannot revive draft or steal newer focus", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => {
          window.calls08 = (window.calls08 || 0) + 1;
          return new Promise((r) => (window.release08 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.calls08)).toBe(1);
  await b(page, "重置T11工具专题进度").click();
  await b(page, "确认重置T11工具专题").click();
  await expect(f(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.release08());
  expect((await read(page)).draft).toBe("");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});

test("late title RAF respects deliberately moved real Tab focus", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    window.titleFrames09 = [];
    window.originalRAF09 = requestAnimationFrame;
    window.requestAnimationFrame = (f) => {
      window.titleFrames09.push(f);
      return 99009;
    };
  });
  await stage(page, 1).click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => {
    window.requestAnimationFrame = window.originalRAF09;
    for (const f of window.titleFrames09) f(performance.now());
  });
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
