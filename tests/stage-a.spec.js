import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  aInitial,
  aMappings,
  aOptions,
  aBrief,
  readAProgress,
  A_STORAGE,
} from "../src/stage-a-content.js";
mkdirSync("/tmp/stage-a-acceptance", { recursive: true });
const out = "/tmp/stage-a-acceptance",
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true });
const stage = (p, n) =>
  p
    .getByRole("navigation", { name: "综合阶段A学习步骤" })
    .getByRole("button")
    .nth(n);
const lab = (p) => p.locator(".mapa-workbench");
const read = (p) =>
  p.evaluate((k) => JSON.parse(localStorage.getItem(k)), A_STORAGE);
const cardButton = (p) => p.locator("[data-card=A] button");
function save(n, v) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
}
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "course menu");
  await act(
    nav.getByRole("button", { name: "A · 设计工具映射 · 可学习" }),
    "stage A",
  );
  await expect(p.locator("#mapa-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  if (n) await stage(p, n).click();
}
async function axes(p) {
  await p.evaluate(axe);
  const r = await p.evaluate(async () =>
    (
      await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      })
    ).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  );
  expect(r).toEqual([]);
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
const valid = ["semantic", "flex", "component", "props", "tokens", "events"];
async function pairs(
  p,
  select = async (l, v) => l.selectOption(v),
  values = valid,
) {
  for (let i = 0; i < 6; i++)
    await select(p.locator(`#mapa-pair-${i}`), values[i], `pair${i}`);
}
async function configure(p, act = (l) => l.click()) {
  for (const n of [
    "窄容器 320px",
    "宽容器 最多768px",
    "space.card = 24px",
    "surface/text 深色mode",
    "Flex 换行方案",
  ])
    await act(btn(p, n), n);
}
async function flow(
  p,
  { act = (l) => l.click(), select = (l, v) => l.selectOption(v) } = {},
) {
  await act(btn(p, "卡片按钮 outline"), "variant");
  await act(btn(p, "反馈底色过渡120ms"), "motion");
  await act(btn(p, "收藏课程B"), "independent B");
  await select(p.locator("#mapa-result"), "error", "failure result");
  await act(cardButton(p), "start failure");
  await act(cardButton(p), "duplicate blocked");
  await expect(lab(p)).toHaveAttribute("data-phase", "pending");
  await expect(lab(p).getByRole("status")).toContainText("重复开始已阻止");
  await act(btn(p, "投递最早教学结果 (1)"), "deliver failure");
  await expect(lab(p)).toHaveAttribute("data-phase", "error");
  await select(p.locator("#mapa-result"), "success", "success result");
  await act(cardButton(p), "retry");
  await act(btn(p, "投递最早教学结果 (1)"), "deliver success");
  await expect(lab(p)).toHaveAttribute("data-phase", "success");
  await act(cardButton(p), "start to cancel");
  await act(btn(p, "取消本次报名等待"), "cancel");
  await expect(lab(p)).toHaveAttribute("data-phase", "idle");
  await act(cardButton(p), "new attempt");
  await act(btn(p, "投递最早教学结果 (2)"), "deliver stale");
  await expect(lab(p)).toHaveAttribute("data-phase", "pending");
  await expect(lab(p).getByRole("status")).toContainText("忽略旧尝试");
  await act(btn(p, "投递最早教学结果 (1)"), "deliver current");
  await expect(lab(p)).toHaveAttribute("data-phase", "success");
  await expect(btn(p, "取消收藏课程B")).toHaveAttribute("aria-pressed", "true");
}
async function quiz(p, act = (l) => l.click()) {
  const cards = p.locator(".quiz-card");
  for (let i = 0; i < 3; i++)
    await act(cards.nth(i).getByRole("button").nth([0, 1, 0][i]), `wrong${i}`);
  await expect(p.locator(".quiz-card.incorrect")).toHaveCount(3);
  for (let i = 0; i < 3; i++)
    await act(cards.nth(i).getByRole("button").nth([1, 0, 1][i]), `retry${i}`);
  await expect(p.locator(".quiz-card.correct")).toHaveCount(3);
}
async function oldSnapshot(p) {
  return p.evaluate(() =>
    Array.from({ length: 32 }, (_, i) =>
      localStorage.getItem(`frontend-observatory.lesson${i + 1}.v1`),
    ),
  );
}
async function seed(p) {
  await p.addInitScript(() => {
    for (let i = 1; i <= 32; i++) {
      const k = `frontend-observatory.lesson${i}.v1`;
      if (!localStorage.getItem(k))
        localStorage.setItem(
          k,
          JSON.stringify({ step: 0, done: [0], marker: "old" + i }),
        );
    }
  });
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return oldSnapshot(p);
}

test("pure mapping supports conditional alternatives and persisted input is bounded", async () => {
  const d = aInitial();
  expect(d.mappings).toHaveLength(6);
  for (let i = 0; i < 6; i++)
    expect(aMappings[i].accepts.length).toBeGreaterThan(0);
  expect(aMappings[0].accepts).toEqual(["semantic", "boundary"]);
  expect(aMappings[1].accepts).toEqual(["flex", "grid"]);
  expect(aMappings[3].accepts).toEqual(["props", "state"]);
  const text = aBrief({ ...d, mappings: valid });
  for (const s of [
    "Frame",
    "Auto Layout",
    "Component",
    "Variant",
    "Variables",
    "Prototype",
    "520px",
    "space.card=12px",
    "错误",
    "取消",
    "迟到",
    "prefers-reduced-motion",
    "不是第33课",
  ])
    expect(text).toContain(s);
});
test("all six wrong choices explain and accept two complete valid mappings without library-name scoring", async ({
  page,
}, info) => {
  await open(page);
  await pairs(page, undefined, Array(6).fill("layers"));
  await btn(page, "检查六组映射").click();
  await expect(
    page.getByText("这个落点不满足本题职责，请重选", { exact: true }),
  ).toHaveCount(6);
  expect((await read(page)).mappingChecked).toBe(false);
  await pairs(page);
  await btn(page, "检查六组映射").click();
  await expect(
    page.getByText("合理映射 · 注意适用条件", { exact: true }),
  ).toHaveCount(6);
  expect((await read(page)).mappingChecked).toBe(true);
  await pairs(page, undefined, [
    "boundary",
    "grid",
    "component",
    "state",
    "tokens",
    "state",
  ]);
  await btn(page, "检查六组映射").click();
  expect((await read(page)).mappingChecked).toBe(true);
  await expect(page.locator(".mapa-pairing")).toContainText(
    "Figma 现有横向、纵向和网格",
  );
  save(`mapping-${info.project.name}`, {
    mappings: (await read(page)).mappings,
    ruleFeedback: await page.locator(".mapa-pairing").innerText(),
  });
});
test("completion gate requires meaningful checks and edits invalidate stale mapping feedback", async ({
  page,
}) => {
  await open(page);
  await btn(page, "完成并继续").click();
  await expect(page.locator(".notice")).toContainText("先完成");
  await pairs(page);
  await btn(page, "检查六组映射").click();
  await page.locator("#mapa-pair-0").selectOption("layers");
  expect((await read(page)).mappingChecked).toBe(false);
  await expect(page.locator(".mapa-rule")).toHaveCount(0);
  await btn(page, "完成并继续").click();
  await expect(page.locator("#mapa-stage-heading")).toHaveText(
    "从设计意图找到开发职责",
  );
});
async function geometry(p) {
  return p.locator(".mapa-preview").evaluate((e) => {
    const a = e.querySelector("[data-card=A]"),
      b = e.querySelector("[data-card=B]"),
      cs = getComputedStyle(e.querySelector(".mapa-cards")),
      ra = a.getBoundingClientRect(),
      rb = b.getBoundingClientRect();
    return {
      width: e.getBoundingClientRect().width,
      gap: cs.gap,
      padding: getComputedStyle(a).padding,
      display: cs.display,
      a: { x: ra.x, y: ra.y, w: ra.width },
      b: { x: rb.x, y: rb.y, w: rb.width },
      color: getComputedStyle(a).color,
      background: getComputedStyle(e).backgroundColor,
    };
  });
}
test("token values and grid or flex change real layout within actual container, not fake device labels", async ({
  page,
}, info) => {
  await open(page, 1);
  await btn(page, "宽容器 最多768px").click();
  let wide = await geometry(page);
  expect(Math.abs(wide.a.y - wide.b.y) < 1).toBe(wide.width >= 520);
  await btn(page, "窄容器 320px").click();
  let narrow = await geometry(page);
  expect(narrow.width).toBeLessThanOrEqual(320);
  expect(narrow.b.y).toBeGreaterThan(narrow.a.y);
  await btn(page, "space.card = 24px").click();
  let spaced = await geometry(page);
  expect(spaced.gap).toBe("24px");
  expect(spaced.padding).toBe("24px");
  await btn(page, "surface/text 深色mode").click();
  let dark = await geometry(page);
  expect(dark.background).not.toBe(spaced.background);
  expect(dark.color).not.toBe(spaced.color);
  await btn(page, "Flex 换行方案").click();
  expect((await geometry(page)).display).toBe("flex");
  await btn(page, "宽容器 最多768px").click();
  let flex = await geometry(page);
  expect(Math.abs(flex.a.y - flex.b.y) < 1).toBe(flex.width >= 520);
  save(`geometry-${info.project.name}`, { wide, narrow, spaced, dark, flex });
});
test("live resize no ResizeObserver fallback long content and all design modes preserve controls", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.ResizeObserver = undefined;
  });
  await open(page, 1);
  await page.setViewportSize({ width: 720, height: 480 });
  await btn(page, "surface/text 深色mode").click();
  await btn(page, "space.card = 24px").click();
  await btn(page, "Flex 换行方案").click();
  await expect
    .poll(async () => Number(await lab(page).getAttribute("data-width")))
    .toBe(
      Math.round((await page.locator(".mapa-preview").boundingBox()).width),
    );
  await axes(page);
  await page
    .locator(".mapa-preview")
    .screenshot({ path: `${out}/resize-short-${info.project.name}.png` });
});
test("actual state flow guards duplicate and late results, preserves second instance and uniform variants", async ({
  page,
}, info) => {
  await open(page, 2);
  await flow(page);
  const d = await read(page);
  for (const k of [
    "failureSeen",
    "retrySeen",
    "successSeen",
    "cancelSeen",
    "staleSeen",
    "variantSeen",
    "secondSeen",
    "motionSeen",
  ])
    expect(d[k]).toBe(true);
  expect(await page.locator(".mapa-card.outline").count()).toBe(2);
  save(`state-flow-${info.project.name}`, {
    state: d,
    phase: await lab(page).getAttribute("data-phase"),
    feedback: await lab(page).getByRole("status").innerText(),
  });
});
test("last success failure and stale delivery keep immediate real keyboard focus on enabled visible entry", async ({
  page,
}, info) => {
  await open(page, 2);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "stageA-focus",
      profile: info.project.name,
    });
  for (const result of ["success", "error"]) {
    await page.locator("#mapa-result").selectOption(result);
    await cardButton(page).click();
    const delivery = page.locator(".mapa-events button").first();
    await k.act(delivery, "last " + result);
    await expect(delivery).toBeFocused();
    await expect(delivery).toBeEnabled();
    await expect(delivery).toHaveAttribute("data-empty", "true");
    expect(
      await delivery.evaluate((e) => getComputedStyle(e).outlineStyle),
    ).not.toBe("none");
  }
  await cardButton(page).click();
  await btn(page, "取消本次报名等待").click();
  await k.act(btn(page, "投递最早教学结果 (1)"), "last stale");
  await expect(btn(page, "投递最早教学结果 (0)")).toBeFocused();
  await expect(lab(page)).toHaveAttribute("data-phase", "idle");
  save(`instant-focus-${info.project.name}`, trace);
});
test("queue bound and snapshot result prevent later controls from changing old envelope", async ({
  page,
}) => {
  await open(page, 2);
  await page.locator("#mapa-result").selectOption("error");
  await cardButton(page).click();
  await page.locator("#mapa-result").selectOption("success");
  await btn(page, "投递最早教学结果 (1)").click();
  await expect(lab(page)).toHaveAttribute("data-phase", "error");
  for (let i = 0; i < 4; i++) {
    await cardButton(page).click();
    await btn(page, "取消本次报名等待").click();
  }
  await cardButton(page).click();
  await expect(lab(page)).toHaveAttribute("data-phase", "idle");
  await expect(lab(page).getByRole("status")).toContainText("最多4封");
  expect(JSON.parse(await lab(page).getAttribute("data-queue"))).toHaveLength(
    4,
  );
});
test("visibility cancels current attempt, leaving and returning clears volatile request data", async ({
  page,
}) => {
  await open(page, 2);
  await cardButton(page).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(lab(page)).toHaveAttribute("data-phase", "idle");
  await btn(page, "投递最早教学结果 (1)").click();
  await expect(lab(page).getByRole("status")).toContainText("忽略旧尝试");
  await cardButton(page).click();
  await stage(page, 1).click();
  await stage(page, 2).click();
  await expect(lab(page)).toHaveAttribute("data-phase", "idle");
  await expect(lab(page)).toHaveAttribute("data-queue", "[]");
});
test("real reduce switches off transition immediately, static controls retain results and idle owns no animation loop", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.rafA = 0;
    window.requestAnimationFrame = (cb) => {
      window.rafA++;
      return raf(cb);
    };
  });
  await open(page, 2);
  await btn(page, "反馈底色过渡120ms").click();
  await expect(page.locator(".mapa-preview .mapa-state").first()).toHaveCSS(
    "transition-duration",
    "0.12s",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".mapa-preview .mapa-state").first()).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await cardButton(page).click();
  await btn(page, "投递最早教学结果 (1)").click();
  await expect(lab(page)).toHaveAttribute("data-phase", "success");
  const n = await page.evaluate(() => window.rafA);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.rafA)).toBe(n);
  save(`reduce-${info.project.name}`, { idleRaf: n, staticSuccess: true });
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe actual viewport and local crop`, async ({
    page,
  }, info) => {
    await open(page, n);
    await axes(page);
    mkdirSync(out, { recursive: true });
    const selector =
      n === 0
        ? ".mapa-pair"
        : n < 3
          ? ".mapa-preview"
          : n === 3
            ? ".quiz-grid"
            : ".agent-grid";
    await page
      .locator(selector)
      .first()
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
  });
async function finishFlow(p, info, mode) {
  const trace = [],
    keyboard = mode === "keyboard",
    k = createKeyboardNavigator(p, expect, trace, {
      lesson: "stageA",
      profile: info.project.name,
    });
  const act = keyboard
    ? k.act
    : async (l, name) => {
        await l.tap();
        trace.push({ tap: name });
      };
  const select = keyboard
    ? async (l, value, name) => {
        await k.seek(l, name);
        await p.keyboard.press("Home");
        let idx = await l
          .locator("option")
          .evaluateAll(
            (opts, v) => opts.findIndex((o) => o.value === v),
            value,
          );
        for (let i = 0; i < idx; i++) await p.keyboard.press("ArrowDown");
        await p.keyboard.press("Tab");
        await expect(l).toHaveValue(value);
      }
    : async (l, v) => l.selectOption(v);
  await p.addInitScript(() => {
    window.keysA = 0;
    document.addEventListener("keydown", () => window.keysA++);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("denied");
        },
      },
    });
  });
  const prior = await seed(p);
  await directory(p, act);
  await pairs(p, select);
  await act(btn(p, "检查六组映射"), "check pairs");
  await act(btn(p, "完成并继续"), "finish pairs");
  await configure(p, act);
  await act(btn(p, "完成并继续"), "finish layout");
  await flow(p, { act, select });
  await act(btn(p, "完成并继续"), "finish state");
  await quiz(p, act);
  await act(btn(p, "完成并继续"), "finish quiz");
  await act(btn(p, "填入项目示例"), "project sample");
  const caption = p.locator("#mapa-caption");
  if (keyboard) {
    await k.seek(caption, "edit project");
    await p.keyboard.press("ControlOrMeta+A");
    await p.keyboard.type("Echo handoff edited");
  } else await caption.fill("触屏编辑的工作坊");
  await act(btn(p, "生成设计交接说明"), "generate");
  const draft = p.getByRole("textbox", { name: "可编辑的设计交接说明" });
  expect(await draft.inputValue()).toContain("Token合同");
  if (keyboard) {
    await k.seek(draft, "edit handoff");
    await p.keyboard.press("ControlOrMeta+End");
    await p.keyboard.type("\nCheck reading order.");
  } else
    await draft.fill((await draft.inputValue()) + "\n触屏补充阅读顺序验收。");
  await act(btn(p, "复制设计交接说明"), "copy fallback");
  await expect(draft).toBeFocused();
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  const review = p.getByRole("checkbox", {
    name: "我已检查 Token、组件变体、响应式和验收。",
  });
  if (keyboard) await k.toggle(review, "review");
  else await review.tap();
  await act(btn(p, "完成综合阶段A"), "finish A");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
  await expect(p.locator(".notice")).toContainText(
    "可以继续综合阶段B「Agent指令能力」。T01已开放，T02–T12仍为预告",
  );
  await p.reload();
  await directory(p, act);
  expect(await draft.inputValue()).toBe((await read(p)).draft);
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
  await act(btn(p, "重置综合阶段A进度"), "reset open");
  await act(btn(p, "保留综合阶段A进度"), "keep");
  expect((await read(p)).done).toHaveLength(5);
  await act(btn(p, "重置综合阶段A进度"), "reset reopen");
  await act(btn(p, "确认重置综合阶段A"), "reset confirm");
  await expect(p.locator("#mapa-stage-heading")).toBeFocused();
  expect((await read(p)).done).toEqual([]);
  expect(await oldSnapshot(p)).toEqual(prior);
  if (!keyboard) expect(await p.evaluate(() => window.keysA)).toBe(0);
  save(`full-${mode}-${info.project.name}`, {
    trace,
    old32Preserved: true,
    final: await read(p),
    keydown: await p.evaluate(() => window.keysA),
  });
}
test("complete real Tab flow wrong retry edit copy refresh reset keeps all32 progress", async ({
  page,
}, info) => {
  await finishFlow(page, info, "keyboard");
});
for (const reduce of [false, true])
  test(`complete zero-keyboard touch ${reduce ? "system reduce" : "normal"} wrong retry edit refresh reset`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: reduce ? "reduce" : "no-preference",
    });
    const p = await c.newPage();
    try {
      await finishFlow(p, info, reduce ? "touch-reduce" : "touch-normal");
    } finally {
      await c.close();
    }
  });
test("editable brief matches live design choices and incomplete work cannot mark all A complete", async ({
  page,
}) => {
  await open(page, 4);
  await btn(page, "填入项目示例").click();
  await page.locator("#mapa-caption").fill("长标题".repeat(20));
  await btn(page, "生成设计交接说明").click();
  let d = await read(page);
  expect(d.draft).toBe(aBrief(d));
  await page
    .getByRole("checkbox", { name: "我已检查 Token、组件变体、响应式和验收。" })
    .check();
  await btn(page, "保存本站成果").click();
  expect((await read(page)).done).toEqual([4]);
  await expect(page.locator(".notice")).toContainText("还有 4 站");
  await page.locator("#mapa-agent-draft").fill("短");
  await expect(page.getByRole("checkbox")).toBeDisabled();
  expect((await read(page)).reviewed).toBe(false);
});
test("copy success delayed failure cannot steal external focus or write after navigation/reset", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedA = text;
        },
      },
    }),
  );
  await open(page, 4);
  await btn(page, "生成设计交接说明").click();
  await btn(page, "复制设计交接说明").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.copiedA)).toBe(
    (await read(page)).draft,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((_, reject) => (window.rejectA = reject)),
      },
    }),
  );
  await btn(page, "复制设计交接说明").click();
  await page.locator("#mapa-caption").click();
  await page.evaluate(() => window.rejectA(Error("late")));
  await expect(page.locator("#mapa-caption")).toBeFocused();
  await expect(page.locator(".copy-feedback")).toContainText(
    "当前焦点保持不变",
  );
  await btn(page, "复制设计交接说明").click();
  await stage(page, 0).click();
  await page.evaluate(() => window.rejectA(Error("old")));
  await expect(page.locator(".copy-feedback")).toHaveCount(0);
  await stage(page, 4).click();
  await expect(page.locator(".copy-feedback")).not.toContainText(
    "自动复制不可用",
  );
});
test("corrupt unavailable storage is scoped to A and design inputs remain operable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("frontend-observatory.stageA.v1", "{broken");
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "frontend-observatory.stageA.v1") throw Error("denied");
      return original.call(this, k, v);
    };
  });
  await open(page);
  await expect(page.locator(".saved")).toContainText("存储不可用");
  await pairs(page);
  await btn(page, "检查六组映射").click();
  await btn(page, "完成并继续").click();
  await expect(page.locator("#mapa-stage-heading")).toHaveText(
    "让设计约束成为真实布局",
  );
});
test("directory roadmap and32 exit open actual A without invented33 while B and T01 open and11 tools stay planned", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(32);
  await nav.getByRole("button").nth(31).click();
  await btn(page, "继续综合阶段A · 设计工具映射").click();
  await expect(
    page.getByRole("navigation", { name: "综合阶段A学习步骤" }),
  ).toBeVisible();
  await expect(page.locator(".site-footer")).toContainText("另有综合A/B已开放");
  await expect(page.locator(".breadcrumb")).toContainText("设计工具映射");
  await expect(page).toHaveTitle("设计工具映射 · 前端观察室");
  await page.getByText("路线核对说明与官方来源", { exact: true }).click();
  await page.getByText("查看完整 32 课目录及覆盖标签", { exact: true }).click();
  const outline = page.locator(".full-course-outline");
  await expect(outline.locator("[data-coverage-id]")).toHaveCount(14);
  await expect(outline.locator("[data-coverage-id=A] button")).toHaveCount(1);
  await expect(outline.locator("[data-coverage-id=B] button")).toHaveCount(1);
  await expect(outline.locator("[data-coverage-id=T01] button")).toHaveCount(1);
  await expect(
    outline.locator("[data-coverage-id]").filter({ hasText: "尚未制作" }),
  ).toHaveCount(11);
  await expect(outline.locator('[data-lesson-id="33"]')).toHaveCount(0);
});

test("copy mutex is scoped to navigation generation; old completion cannot unlock newer pending copy or steal reset focus", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((resolve, reject) => {
            (window.copiesA ??= []).push({ resolve, reject });
          }),
      },
    }),
  );
  await open(page, 4);
  await btn(page, "生成设计交接说明").click();
  await btn(page, "复制设计交接说明").click();
  expect(await page.evaluate(() => window.copiesA.length)).toBe(1);
  await stage(page, 0).click();
  await stage(page, 4).click();
  await btn(page, "复制设计交接说明").click();
  expect(await page.evaluate(() => window.copiesA.length)).toBe(2);
  await page.evaluate(() => window.copiesA[0].reject(Error("old generation")));
  await btn(page, "复制设计交接说明").click();
  expect(await page.evaluate(() => window.copiesA.length)).toBe(2);
  await page.evaluate(() => window.copiesA[1].reject(Error("current")));
  await expect(page.locator("#mapa-agent-draft")).toBeFocused();
  await btn(page, "复制设计交接说明").click();
  await btn(page, "重置综合阶段A进度").click();
  await btn(page, "确认重置综合阶段A").click();
  await expect(page.locator("#mapa-stage-heading")).toBeFocused();
  await page.evaluate(() => window.copiesA[2].resolve());
  await expect(page.locator("#mapa-stage-heading")).toBeFocused();
  expect((await read(page)).generated).toBe(false);
  save(`copy-generation-${info.project.name}`, {
    copies: await page.evaluate(() => window.copiesA.length),
    resetFocus: await page
      .locator("#mapa-stage-heading")
      .evaluate((e) => e === document.activeElement),
  });
});
test("late navigation frame respects actual Tab moved focus and cannot write after unmount", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.framesA = [];
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      window.holdA
        ? (window.framesA.push(cb), 99000 + window.framesA.length)
        : raf(cb);
  });
  await open(page);
  await page.evaluate(() => (window.holdA = true));
  await stage(page, 1).click();
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "stageA-late",
      profile: info.project.name,
    });
  const target = btn(page, "space.card = 24px");
  await k.seek(target, "user Tab to external control");
  await page.evaluate(() =>
    window.framesA.forEach((cb) => cb(performance.now())),
  );
  await expect(target).toBeFocused();
  await page.evaluate(() => (window.holdA = false));
  await stage(page, 2).click();
  await expect(page.locator("#mapa-stage-heading")).toBeFocused();
  await page.evaluate(() => (window.holdA = true));
  await stage(page, 0).click();
  // Hold only A's old callbacks. The real main-directory navigation frame must
  // run normally before measuring the user's subsequent focus.
  await page.evaluate(() => {
    window.oldAFrames = [...window.framesA];
    window.holdA = false;
  });
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").first().click();
  await expect(page.locator("#stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement === document.body),
  ).toBe(false);
  const before = await page.evaluate(() => document.activeElement?.outerHTML);
  await page.evaluate(() =>
    window.oldAFrames.forEach((cb) => cb(performance.now())),
  );
  expect(await page.evaluate(() => document.activeElement?.outerHTML)).toBe(
    before,
  );
  await expect(page.locator(".stage-a")).toHaveCount(0);
  save(`late-navigation-${info.project.name}`, trace);
});
test("malformed persisted A values sanitize independently and never create invalid layout or checked mapping", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "frontend-observatory.stageA.v1",
      JSON.stringify({
        step: 99,
        done: [0, 99, "bad", 0],
        mappings: Array(6).fill("layers"),
        mappingChecked: true,
        width: "huge",
        spacing: 999,
        theme: "invalid",
        layout: "tables",
        caption: "长".repeat(1000),
        draft: "a".repeat(9000),
        answers: [5, 0, "bad"],
      }),
    ),
  );
  await open(page);
  const d = await read(page);
  expect(d.step).toBe(0);
  expect(d.done).toEqual([0]);
  expect(d.mappingChecked).toBe(false);
  expect(d.width).toBe("wide");
  expect(d.spacing).toBe(12);
  expect(d.layout).toBe("grid");
  expect(d.caption).toHaveLength(80);
  expect(d.draft).toHaveLength(8000);
  expect(d.answers).toEqual([null, 0, null]);
});

test("dark feedback transition keeps readable contrast at every sampled frame through failure and success", async ({
  page,
}, info) => {
  await open(page, 2);
  await btn(page, "surface/text 深色mode").click();
  await btn(page, "反馈底色过渡120ms").click();
  const evidence = [];
  for (const outcome of ["error", "success"]) {
    await page.locator("#mapa-result").selectOption(outcome);
    await cardButton(page).click();
    await page
      .locator(".mapa-events button")
      .first()
      .evaluate((button) => {
        window.contrastSamplesA = new Promise((resolve) =>
          button.addEventListener(
            "click",
            () => {
              const rows = [],
                start = performance.now();
              const sample = () => {
                const e = document.querySelector("[data-card=A] .mapa-state"),
                  s = getComputedStyle(e);
                rows.push({
                  t: performance.now() - start,
                  phase: e.closest("[data-phase]").dataset.phase,
                  color: s.color,
                  background: s.backgroundColor,
                });
                if (performance.now() - start < 240)
                  requestAnimationFrame(sample);
                else resolve(rows);
              };
              sample();
            },
            { once: true, capture: true },
          ),
        );
      });
    await btn(page, "投递最早教学结果 (1)").click();
    const samples = await page.evaluate(() => window.contrastSamplesA);
    const luminance = (color) => {
      const channels = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((x) => x / 255)
        .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return channels.reduce(
        (sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i],
        0,
      );
    };
    for (const row of samples) {
      const [low, high] = [
        luminance(row.color),
        luminance(row.background),
      ].sort((a, b) => a - b);
      row.contrast = (high + 0.05) / (low + 0.05);
      expect(row.contrast).toBeGreaterThanOrEqual(4.5);
    }
    expect(samples.some((row) => row.phase === outcome)).toBe(true);
    expect(new Set(samples.map((row) => row.background)).size).toBeGreaterThan(
      2,
    );
    evidence.push({
      outcome,
      samples,
      minimum: Math.min(...samples.map((row) => row.contrast)),
    });
  }
  await axes(page);
  save(`transition-contrast-${info.project.name}`, evidence);
});
