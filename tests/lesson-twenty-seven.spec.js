import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  workflowObjects,
  applyWorkflowBinding,
  createWorkflowController,
} from "../src/lesson-twenty-seven-content.js";
const out = "/tmp/spline-workflow-acceptance",
  key = "frontend-observatory.lesson27.v1",
  prior = Array.from(
    { length: 26 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".spline27-lab"),
  object = (p, n) => p.locator(`[data-object="${n}"]`),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十七节学习步骤" })
      .getByRole("button")
      .nth(n),
  trigger = (p) => btn(p, "网页事件入口（本地演练）"),
  begin = (p) => btn(p, "开始或重试模拟加载").click(),
  deliver = (p) => btn(p, "投递最早模拟结果").click();
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(26), "lesson27");
  await expect(p.locator("#spline27-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
}
async function ready(p) {
  await p
    .getByLabel("演练假定：场景自制且已获使用授权", { exact: true })
    .check();
  await btn(p, "生成交付记录（模拟）").click();
  await begin(p);
  await deliver(p);
  await expect(lab(p)).toHaveAttribute("data-status", "ready");
}
async function axeCheck(p) {
  await p.evaluate(axe);
  expect(
    await p.evaluate(async () => {
      const x = await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return x.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      }));
    }),
  ).toEqual([]);
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
function save(n, x) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${n}.json`, JSON.stringify(x, null, 2));
}
function instrument() {
  const raf = requestAnimationFrame.bind(window),
    caf = cancelAnimationFrame.bind(window);
  window.workflowFrames = [];
  window.holdWorkflow = false;
  window.workflowPending = new Set();
  window.requestAnimationFrame = (cb) => {
    let id;
    id = raf((t) => {
      window.workflowPending.delete(id);
      if (window.holdWorkflow) window.workflowFrames.push(cb);
      else cb(t);
    });
    window.workflowPending.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    window.workflowPending.delete(id);
    caf(id);
  };
}
test("controller stale duplicate cancel retry and disposed packets cannot overwrite a newer session", () => {
  const events = [],
    c = createWorkflowController((e) => events.push(e));
  const a = c.start("success");
  c.cancel();
  const b = c.start("failure");
  expect(a.complete()).toBe("stale");
  expect(c.snapshot().status).toBe("loading");
  expect(b.complete()).toBe("failure");
  expect(b.complete()).toBe("duplicate");
  expect(c.snapshot().status).toBe("failed");
  const d = c.start("success");
  c.dispose();
  const before = events.length;
  expect(d.complete()).toBe("disposed");
  expect(events.length).toBe(before);
  expect(c.snapshot()).toMatchObject({ status: "disposed", queued: 0 });
});
test("controller repeated start cap8 invalidation and drain retain a bounded manual queue", () => {
  const c = createWorkflowController();
  expect(c.start("success").type).toBe("started");
  expect(c.start("failure").type).toBe("repeated");
  c.cancel();
  for (let i = 0; i < 7; i++) {
    c.start("success");
    c.cancel();
  }
  expect(c.snapshot().queued).toBe(8);
  expect(c.start("success").type).toBe("full");
  for (let i = 0; i < 8; i++) expect(c.deliver()).toBe("stale");
  const a = c.start("success");
  c.invalidate();
  expect(a.complete()).toBe("stale");
  expect(c.snapshot().status).toBe("empty");
  expect(c.deliver()).toBe("empty");
});
test("typed binding only changes specified object and rejects unsaved missing wrong event/type", () => {
  const objects = workflowObjects(),
    b = {
      target: "stage",
      variable: "theme",
      event: "activate",
      bound: true,
      missing: false,
      typeFault: false,
    };
  const r = applyWorkflowBinding(objects, b, "activate");
  expect(r.ok).toBe(true);
  expect(r.objects.stage.theme).toBe("night");
  expect(r.objects.tag).toEqual(objects.tag);
  expect(objects.stage.theme).toBe("day");
  for (const x of [
    { bound: false },
    { missing: true },
    { typeFault: true },
    { target: "unknown" },
    { variable: "unknown" },
  ])
    expect(applyWorkflowBinding(objects, { ...b, ...x }, "activate").ok).toBe(
      false,
    );
  expect(applyWorkflowBinding(objects, b, "focus").ok).toBe(false);
  expect(
    applyWorkflowBinding(
      objects,
      { ...b, target: "tag", variable: "accent" },
      "activate",
    ).objects.tag.accent,
  ).toBe(true);
});
test("lazy01–31 release has no Spline Three SDK or assets and32 remains preview", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-twenty-seven/.test(u))).toBe(false);
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-status", "empty");
  await expect(page.locator(".available-dot")).toHaveCount(31);
  expect(urls.filter((u) => !u.startsWith("http://127.0.0.1:4173/"))).toEqual(
    [],
  );
  expect(
    urls.some((u) =>
      /splinecode|splinetool|three|lesson-twenty-six-engine/.test(u),
    ),
  ).toBe(false);
  await expect(page.locator("canvas,iframe")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(31).click();
  await expect(
    page.getByRole("heading", { name: "Infinite Canvas", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toContainText("尚未制作");
});
test("provenance export and image guards are actionable and do not pretend to export a file", async ({
  page,
}) => {
  await open(page);
  await btn(page, "生成交付记录（模拟）").click();
  await expect(page.locator(".spline27-status")).toContainText("先勾选");
  await begin(page);
  await expect(lab(page)).toHaveAttribute("data-status", "empty");
  await page
    .getByLabel("演练假定：场景自制且已获使用授权", { exact: true })
    .check();
  await btn(page, "静态图片交付").click();
  await btn(page, "生成交付记录（模拟）").click();
  await expect(page.locator(".spline27-status")).toContainText("未实际导出");
  await begin(page);
  await expect(page.locator(".spline27-status")).toContainText("图片不保留");
  await expect(lab(page)).toHaveAttribute("data-queued", "0");
  await btn(page, "网页运行时交付").click();
  await btn(page, "生成交付记录（模拟）").click();
  await begin(page);
  await deliver(page);
  await expect(lab(page)).toHaveAttribute("data-status", "ready");
});
test("actual DOM click changes typed variables of selected schematic object only", async ({
  page,
}, info) => {
  await open(page);
  await ready(page);
  await btn(page, "保存模拟绑定").click();
  const day = await object(page, "stage").evaluate(
    (e) => getComputedStyle(e).backgroundColor,
  );
  await trigger(page).click();
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "night");
  expect(
    await object(page, "stage").evaluate(
      (e) => getComputedStyle(e).backgroundColor,
    ),
  ).not.toBe(day);
  await expect(object(page, "tag")).toHaveAttribute("data-theme", "day");
  await btn(page, "目标：标签牌").click();
  await btn(page, "变量：强调布尔值").click();
  await btn(page, "保存模拟绑定").click();
  await trigger(page).click();
  await expect(object(page, "tag")).toHaveAttribute("data-accent", "true");
  await expect(object(page, "stage")).toHaveAttribute("data-accent", "false");
  save(`binding-${info.project.name}`, {
    actualDOMClick: true,
    stageTheme: "night",
    tagAccent: true,
    mechanism: "React local rule + HTML/CSS schematic, no Spline/3D runtime",
  });
});
test("real Tab focus event fires once on entry and Enter does not masquerade as another focus", async ({
  page,
}, info) => {
  await open(page);
  await ready(page);
  await btn(page, "事件：DOM聚焦").click();
  await btn(page, "保存模拟绑定").click();
  const trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson27-focus",
      profile: info.project.name,
    });
  await seek(trigger(page), "actual focus event entrance");
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "night");
  await page.keyboard.press("Enter");
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "night");
  await btn(page, "把焦点送入事件入口").click();
  await expect(trigger(page)).toBeFocused();
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "day");
  save(`focus-${info.project.name}`, {
    trace,
    realTab: true,
    explicitFocusButtonAlternative: true,
  });
});
test("missing object and type fault block writes and repair restores the intended target", async ({
  page,
}) => {
  await open(page);
  await ready(page);
  await btn(page, "保存模拟绑定").click();
  await page.getByLabel("模拟展示台对象缺失", { exact: true }).check();
  await trigger(page).click();
  await expect(page.locator(".spline27-status")).toContainText("目标对象缺失");
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "day");
  await expect(trigger(page)).toBeFocused();
  await page.getByLabel("模拟展示台对象缺失", { exact: true }).uncheck();
  await trigger(page).click();
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "night");
  await page.getByLabel("模拟变量类型不匹配", { exact: true }).check();
  await trigger(page).click();
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "night");
  await expect(page.locator(".spline27-status")).toContainText("类型不匹配");
  await page.getByLabel("模拟变量类型不匹配", { exact: true }).uncheck();
  await trigger(page).click();
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "day");
  await expect(object(page, "tag")).toHaveAttribute("data-theme", "day");
});
test("captured outcome repeated begin and failure retry use actual local transitions", async ({
  page,
}) => {
  await open(page);
  await ready(page);
  await btn(page, "下次结果：失败").click();
  await begin(page);
  await begin(page);
  await expect(lab(page)).toHaveAttribute("data-queued", "1");
  await expect(page.locator(".spline27-status")).toContainText("重复开始");
  await btn(page, "下次结果：成功").click();
  await deliver(page);
  await expect(lab(page)).toHaveAttribute("data-status", "failed");
  await begin(page);
  await deliver(page);
  await expect(lab(page)).toHaveAttribute("data-status", "ready");
  const p = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(p.failureSeen && p.retrySeen).toBe(true);
});
test("cancel and retry isolate late packet and keep immediate actionable focus on final delivery", async ({
  page,
}, info) => {
  await open(page);
  await ready(page);
  await begin(page);
  await btn(page, "取消本次模拟加载").click();
  await begin(page);
  await expect(lab(page)).toHaveAttribute("data-queued", "2");
  const trace = [],
    { act } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson27-delivery",
      profile: info.project.name,
    });
  await act(btn(page, "投递最早模拟结果"), "late packet");
  await expect(lab(page)).toHaveAttribute("data-status", "loading");
  await expect(btn(page, "投递最早模拟结果")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(lab(page)).toHaveAttribute("data-status", "ready");
  await expect(lab(page)).toHaveAttribute("data-queued", "0");
  await expect(btn(page, "投递最早模拟结果")).toBeFocused();
  await expect(btn(page, "投递最早模拟结果")).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(lab(page)).toHaveAttribute("data-status", "ready");
  await expect(page.locator(".spline27-status")).toContainText("没有待投递");
  save(`delivery-${info.project.name}`, {
    trace,
    lateIgnored: true,
    focusImmediatelyRetained: true,
    queueDrained: true,
  });
});
test("changed delivery condition invalidates pending and ready plans without accepting old results", async ({
  page,
}) => {
  await open(page);
  await ready(page);
  await begin(page);
  await btn(page, "程序化数据场景").click();
  await expect(lab(page)).toHaveAttribute("data-status", "empty");
  await deliver(page);
  await expect(lab(page)).toHaveAttribute("data-status", "empty");
  await expect(page.locator(".spline27-status")).toContainText("旧结果");
  await begin(page);
  await expect(page.locator(".spline27-status")).toContainText("缺少");
  await btn(page, "生成交付记录（模拟）").click();
  await begin(page);
  await deliver(page);
  await expect(lab(page)).toHaveAttribute("data-status", "ready");
});
test("manual queue cap8 is recoverable by draining stale packets without background work", async ({
  page,
}) => {
  await open(page);
  await ready(page);
  for (let i = 0; i < 8; i++) {
    await begin(page);
    await btn(page, "取消本次模拟加载").click();
  }
  await begin(page);
  await expect(lab(page)).toHaveAttribute("data-queued", "8");
  await expect(page.locator(".spline27-status")).toContainText("8条上限");
  for (let i = 0; i < 8; i++) await deliver(page);
  await expect(lab(page)).toHaveAttribute("data-queued", "0");
  await begin(page);
  await deliver(page);
  await expect(lab(page)).toHaveAttribute("data-status", "ready");
});
test("leaving and refresh clear temporary queue and variables while learning config persists", async ({
  page,
}) => {
  await open(page);
  await ready(page);
  await btn(page, "保存模拟绑定").click();
  await trigger(page).click();
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "night");
  await begin(page);
  await stage(page, 3).click();
  await stage(page, 1).click();
  await expect(lab(page)).toHaveAttribute("data-status", "empty");
  await expect(lab(page)).toHaveAttribute("data-queued", "0");
  await expect(object(page, "stage")).toHaveAttribute("data-theme", "day");
  await expect(page.locator(".spline27-metrics")).toContainText("不跨刷新");
  await page.reload();
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-status", "empty");
  await expect(
    page.getByLabel("演练假定：场景自制且已获使用授权", { exact: true }),
  ).toBeChecked();
  expect(
    (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key))
      .loadedSeen,
  ).toBe(true);
});
test("live reduce and result arrival preserve outside real Tab focus; idle has no pending RAF", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await ready(page);
  await begin(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".spline27-metrics")).toContainText(
    "系统减少动态已开启",
  );
  const trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson27-external",
      profile: info.project.name,
    });
  await seek(page.getByLabel("演练标题", { exact: true }), "outside focus");
  await btn(page, "投递最早模拟结果").dispatchEvent("click");
  await expect(lab(page)).toHaveAttribute("data-status", "ready");
  await expect(page.getByLabel("演练标题", { exact: true })).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => window.workflowPending.size))
    .toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".spline27-metrics")).toContainText(
    "系统未要求减少动态",
  );
  save(`outside-${info.project.name}`, {
    trace,
    delivery:
      "programmatic DOM click fixture as result arrival; no focus/evaluate scroll shortcut",
    idlePendingFrames: 0,
  });
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 local diagram and controls fit`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n < 3) {
      await ready(page);
      await btn(page, "保存模拟绑定").click();
      await trigger(page).click();
    }
    if (n === 4) await btn(page, "生成Spline集成指令").click();
    await axeCheck(page);
    mkdirSync(out, { recursive: true });
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
    await (
      n < 3
        ? page.locator(".spline27-diagram")
        : n === 3
          ? page.locator(".quiz-card").first()
          : page.locator(".agent-options")
    ).screenshot({ path: `${out}/crop${n + 1}-${info.project.name}.png` });
  });
const deny = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });
async function seed(p) {
  await p.addInitScript((ks) => {
    for (const [i, k] of ks.entries())
      if (localStorage.getItem(k) === null)
        localStorage.setItem(
          k,
          JSON.stringify({ step: i % 5, done: [0], marker: "prior" + i }),
        );
  }, prior);
  await p.addInitScript(deny);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior);
}
async function flow(p, act, toggle, edit) {
  await directory(p, act);
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await toggle(
    p.getByLabel("演练假定：场景自制且已获使用授权", { exact: true }),
    "rights",
  );
  await a("生成交付记录（模拟）");
  await a("开始或重试模拟加载");
  await a("投递最早模拟结果");
  await expect(lab(p)).toHaveAttribute("data-status", "ready");
  await a("记录交付与计划边界");
  await a("填入标题示例");
  await edit(p.getByLabel("演练标题", { exact: true }), "caption");
  await next();
  await a("保存模拟绑定");
  await a("网页事件入口（本地演练）");
  await expect(object(p, "stage")).toHaveAttribute("data-theme", "night");
  await toggle(p.getByLabel("模拟展示台对象缺失", { exact: true }), "missing");
  await a("网页事件入口（本地演练）");
  await expect(object(p, "stage")).toHaveAttribute("data-theme", "night");
  await toggle(p.getByLabel("模拟展示台对象缺失", { exact: true }), "restore");
  await a("网页事件入口（本地演练）");
  await expect(object(p, "stage")).toHaveAttribute("data-theme", "day");
  await next();
  await a("下次结果：失败");
  await a("开始或重试模拟加载");
  await a("投递最早模拟结果");
  await expect(lab(p)).toHaveAttribute("data-status", "failed");
  await a("下次结果：成功");
  await a("开始或重试模拟加载");
  await a("取消本次模拟加载");
  await a("开始或重试模拟加载");
  await a("投递最早模拟结果");
  await expect(lab(p)).toHaveAttribute("data-status", "loading");
  await a("投递最早模拟结果");
  await expect(lab(p)).toHaveAttribute("data-status", "ready");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成Spline集成指令");
  const draft = p.getByLabel("可编辑的 Spline集成 Agent 指令");
  await expect(draft).toHaveValue(
    /模拟边界.*场景来源与协作.*设计、资产与运行时.*事件\/对象\/变量.*加载与失败.*许可、计划与导出.*输入、性能与清理.*验收/s,
  );
  await edit(draft, "draft");
  await a("复制Spline集成指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 来源、交付、绑定、回退、许可与成本。", {
      exact: true,
    }),
    "review",
  );
  await a("完成第二十七节");
  await expect(p.locator(".lesson-twenty-seven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-seven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十七节进度");
  await a("保留第二十七节进度");
  await expect(p.locator(".lesson-twenty-seven .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十七节进度");
  await a("确认重置第二十七节");
  await expect(p.locator("#spline27-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-seven .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(lab(p)).toHaveAttribute("data-status", "empty");
  await expect(lab(p)).toHaveAttribute("data-queued", "0");
  await axeCheck(p);
  return done;
}
test("full actual Tab workflow wrong retry edits copy refresh cancel confirm reset preserves26", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson27",
      profile: info.project.name,
    }),
    done = await flow(page, act, toggle, async (f, n) => {
      await seek(f, n);
      await page.keyboard.press("End");
      await page.keyboard.type(
        n === "caption"
          ? " edited"
          : "\nReview: simulation boundary and late results.",
      );
    });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  save(`keyboard-${info.project.name}`, { passed: true, trace, done });
});
for (const reduced of [false, true])
  test(`full zero keyboard touch ${reduced ? "reduce" : "normal"} workflow preserves26`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: reduced ? "reduce" : "no-preference",
        baseURL: "http://127.0.0.1:4173",
      }),
      p = await c.newPage();
    await p.addInitScript(() => {
      window.workflowKeys = [];
      for (const t of ["keydown", "keyup"])
        addEventListener(t, (e) => window.workflowKeys.push(e.key));
    });
    const before = await seed(p),
      trace = [],
      tap = async (l, n) => {
        await l.tap();
        trace.push(n);
      },
      done = await flow(p, tap, tap, async (f, n) => {
        await f.tap();
        await f.fill(
          n === "caption"
            ? "触屏编辑：工作流模拟"
            : (await f.inputValue()) + "\n触屏核对模拟边界。",
        );
      });
    expect(await p.evaluate(() => window.workflowKeys)).toEqual([]);
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    save(`touch-${reduced ? "reduce" : "normal"}-${info.project.name}`, {
      passed: true,
      trace,
      done,
      keys: [],
    });
    await c.close();
  });
test("copy success late rejection reset and corrupt unavailable storage remain scoped27", async ({
  page,
}) => {
  await open(page, 4);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.workflowCopied = t) },
    }),
  );
  await btn(page, "生成Spline集成指令").click();
  const draft = page.getByLabel("可编辑的 Spline集成 Agent 指令");
  await draft.fill((await draft.inputValue()) + "\n不承诺免费导出。");
  await btn(page, "复制Spline集成指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.workflowCopied)).toContain(
    "不承诺免费导出。",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((_, reject) => (window.rejectWorkflowCopy = reject)),
      },
    }),
  );
  await btn(page, "复制Spline集成指令").click();
  await btn(page, "重置第二十七节进度").click();
  await btn(page, "确认重置第二十七节").click();
  await page.evaluate(() => window.rejectWorkflowCopy(Error("late")));
  await expect(page.locator("#spline27-stage-heading")).toBeFocused();
  await expect(page.locator(".copy-feedback")).toHaveCount(0);
  await page.evaluate((k) => localStorage.setItem(k, "bad-json"), key);
  await page.reload();
  await directory(page);
  await expect(
    page.locator(".lesson-twenty-seven .lesson-bottom"),
  ).toContainText("0 / 5");
  await page.addInitScript(() => {
    for (const n of ["getItem", "setItem", "removeItem"])
      Storage.prototype[n] = () => {
        throw Error("unavailable");
      };
  });
  await page.reload();
  await directory(page);
  await ready(page);
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});
test("hero diagram brief and official references consistently state simulation and plan boundaries", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(".spline27-hero-boundary")).toContainText(
    "未运行Spline",
  );
  await expect(page.locator(".spline27-boundary")).toContainText(
    "纯React/HTML/CSS",
  );
  await expect(page.locator(".spline27-diagram-label")).toContainText(
    "不是Spline编辑器或3D预览",
  );
  await stage(page, 4).click();
  await btn(page, "生成Spline集成指令").click();
  for (const required of [
    /没有导入Spline runtime/,
    /不等于任意账号均免费/,
    /生效条款/,
  ])
    await expect(page.getByLabel("可编辑的 Spline集成 Agent 指令")).toHaveValue(
      required,
    );
  const details = page.locator("details").filter({
    has: page.getByText("第二十七节核对说明与官方来源", { exact: true }),
  });
  await details.locator("summary").click();
  await expect(details).toContainText("许可和计划权限需分别确认");
  await expect(details.getByRole("link")).toHaveCount(6);
});
