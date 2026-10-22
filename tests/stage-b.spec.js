import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  B_STORAGE,
  bInitial,
  bFields,
  bTech,
  bCases,
  bScope,
  filledB,
  auditB,
  bBrief,
  updateBSource,
} from "../src/stage-b-content.js";
const out = "/tmp/stage-b-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "综合阶段B学习步骤" })
      .getByRole("button")
      .nth(n),
  read = (p) =>
    p.evaluate((k) => JSON.parse(localStorage.getItem(k)), B_STORAGE);
const priorKeys = [
  ...Array.from(
    { length: 32 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  "frontend-observatory.stageA.v1",
];
function save(n, v) {
  writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
}
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", {
      name: "B · Agent 指令能力 · 可学习",
      exact: true,
    }),
    "stageB",
  );
  await expect(p.locator("#writeb-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  if (n) await stage(p, n).click();
}
async function axes(p) {
  await p.evaluate(axe);
  expect(
    await p.evaluate(async () =>
      (
        await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ),
  ).toEqual([]);
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
const fieldInput = (p, id) => p.locator(`#writeb-${id}`),
  sample = (p, f) => btn(p, `填入${f.label}示例（替换本栏）`);
async function fillGroup(p, g, act = (l) => l.click()) {
  for (const f of bFields.filter((f) => f.group === g))
    await act(sample(p, f), `sample ${f.id}`);
}
const reviews = [
  "我已区分原始诉求、拟议方案和待确认内容",
  "我已人工核对触发前后状态、恢复路径及是否矛盾",
  "我已核对候选的成立条件，库数量不是质量标准",
  "我已人工核对质量约束和可观察的验收步骤",
  "我已人工核对原文、假设、当前草稿和待执行验收",
];
const draft = (p) =>
  p.getByRole("textbox", { name: "可编辑的Agent指令草稿", exact: true });
const snapshot = (p) =>
  p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), priorKeys);
async function seed(p) {
  await p.addInitScript((ks) => {
    for (const [i, k] of ks.entries())
      if (!localStorage.getItem(k))
        localStorage.setItem(
          k,
          JSON.stringify({ step: 0, done: [0], marker: "prior" + i }),
        );
  }, priorKeys);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return snapshot(p);
}
function completeData() {
  return {
    ...bInitial(),
    original: "原文\n也许只需要静态反馈，不要默认上线。",
    fields: Object.fromEntries(
      bFields.map((f) => [f.id, "这是待确认的" + f.label]),
    ),
    technology: "defer",
    techReason: "先比较现有能力和约束，不限定库。",
  };
}
async function seedB(p, d) {
  await p.addInitScript(
    ([k, d]) => localStorage.setItem(k, JSON.stringify(d)),
    [B_STORAGE, d],
  );
}

test("presence rules inspect independent fields, never keywords, sentiment, negation or library count as semantic score", async () => {
  let d = bInitial();
  expect(auditB(d)).toHaveLength(11);
  expect(auditB(d).every((r) => !r.filled)).toBe(true);
  expect(filledB(" \n\t")).toBe(false);
  d.fields.visual = "触发 状态 响应式 无障碍 性能 失败 验收 ".repeat(10);
  expect(auditB(d).filter((r) => r.filled)).toHaveLength(1);
  const filled = completeData();
  filled.fields = Object.fromEntries(
    bFields.map((f) => [f.id, "不要实现这些条件，内容可能互相矛盾。"]),
  );
  expect(auditB(filled).every((r) => r.filled)).toBe(true);
  for (const id of ["defer", "css", "motion", "svg", "chartlib"]) {
    const q = { ...filled, technology: id, techReason: "库A 库B 库C" };
    expect(auditB(q).filter((r) => r.filled)).toHaveLength(11);
  }
  expect(bScope).toContain("不理解否定、矛盾");
  expect(bScope).toContain("已填不等于正确");
});
test("brief quotes raw original and fields exactly, keeps unknown markers and does not fabricate completion", async () => {
  const d = bInitial();
  d.original = "  原文：不要请求服务。\n也许以后上线；现在不承诺。\n";
  const s = bBrief(d);
  expect(s).toContain(d.original);
  expect(s).toContain("【待确认：未填写】");
  expect(s).toContain("未发送、未执行、未评分");
  expect(s).toContain("待执行验收（计划不是通过报告）");
  expect(s).toContain("不是第34课");
  expect(s).toContain("在原文与项目约束允许时可提出合理替代");
  expect(s).toContain("若后续获授权实现");
  const max = {
    ...completeData(),
    original: "原".repeat(1200),
    fields: Object.fromEntries(bFields.map((f) => [f.id, "文".repeat(500)])),
    technology: "custom",
    customTech: "技".repeat(100),
    techReason: "理".repeat(500),
  };
  expect(bBrief(max).length).toBeLessThanOrEqual(12000);
  expect(updateBSource(d, { original: "changed" })).toMatchObject({
    original: "changed",
    revision: 1,
    reviewed: false,
  });
});
test("comparison shows same-effect missing information and concrete conditions without overwriting personal original", async ({
  page,
}, info) => {
  await open(page);
  await fieldInput(page, "original").fill(
    "我的原文：先不要做动画，也不要发送。",
  );
  await btn(page, "查看模糊示例").click();
  await expect(page.locator(".writeb-example")).toContainText("高级、顺滑");
  await expect(page.locator(".writeb-example li")).toHaveCount(3);
  await btn(page, "查看具体示例").click();
  await expect(page.locator(".writeb-example")).toContainText(
    "不是唯一正确表达",
  );
  await page.locator("#writeb-case").selectOption("chart");
  expect((await read(page)).original).toBe(
    "我的原文：先不要做动画，也不要发送。",
  );
  await btn(page, "查看模糊示例").click();
  await expect(page.locator(".writeb-example")).toContainText("数据面板");
  save(`comparison-${info.project.name}`, {
    raw: (await read(page)).original,
    caseId: (await read(page)).caseId,
    example: await page.locator(".writeb-example").innerText(),
  });
});
test("empty and merely checked review cannot complete writing station; explicit sample remains editable and invalidates review", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("checkbox", { name: reviews[0] }).check();
  await btn(page, "完成并继续").click();
  await expect(page.locator(".notice")).toContainText("先完成");
  await btn(page, "填入本案例原文示例（替换原文）").click();
  await btn(page, "查看模糊示例").click();
  await btn(page, "查看具体示例").click();
  await page.getByRole("checkbox", { name: reviews[0] }).check();
  await fieldInput(page, "original").fill("自己改写的原文");
  expect((await read(page)).comparisonReviewed).toBe(false);
  await page.getByRole("checkbox", { name: reviews[0] }).check();
  await btn(page, "完成并继续").click();
  await expect(page.locator("#writeb-stage-heading")).toHaveText(
    "说出看见什么、何时变化、如何恢复",
  );
});
test("live rules report missing columns, cannot award semantics for repeated keywords or contradictory nonempty text", async ({
  page,
}, info) => {
  await open(page, 1);
  await fieldInput(page, "visual").fill(
    "响应式 无障碍 性能 失败 验收 状态 触发",
  );
  await expect(page.locator(".writeb-audit [role=status]")).toContainText(
    "已填 1 / 11",
  );
  await expect(page.locator(".writeb-audit [role=status]")).toContainText(
    "触发与作用范围",
  );
  await fillGroup(page, 1);
  await fieldInput(page, "states").fill("不要提供任何恢复，先后状态可能矛盾。");
  await expect(page.locator(".writeb-field-status")).toHaveText(
    Array(3).fill("本栏已填；含义、矛盾和可行性未检查。"),
  );
  await expect(page.locator(".writeb-audit")).toContainText("不理解否定、矛盾");
  save(`rule-boundary-${info.project.name}`, {
    state: await read(page),
    audit: await page.locator(".writeb-audit").innerText(),
  });
});
test("all technical candidates have conditions, custom name required, switching preserves reason and hidden branch has no Tab target", async ({
  page,
}, info) => {
  await open(page, 2);
  await fieldInput(page, "reason").fill("保留我的取舍，不自动更换。");
  for (const t of bTech.filter((t) => t.id)) {
    await page.locator("#writeb-technology").selectOption(t.id);
    expect((await read(page)).techReason).toBe("保留我的取舍，不自动更换。");
    await expect(page.locator(".writeb-condition")).toContainText(t.condition);
    if (t.id === "custom") {
      expect(
        auditB(await read(page)).find((r) => r.id === "technology").filled,
      ).toBe(false);
      await fieldInput(page, "custom").fill("其他合理实现");
      expect(
        auditB(await read(page)).find((r) => r.id === "technology").filled,
      ).toBe(true);
    }
  }
  await page.locator("#writeb-technology").selectOption("css");
  await expect(fieldInput(page, "custom")).toHaveCount(0);
  await page.locator("#writeb-technology").selectOption("custom");
  await expect(fieldInput(page, "custom")).toHaveValue("其他合理实现");
  await expect(page.locator(".writeb-boundary").first()).toContainText(
    "不按库数量加分",
  );
  save(`technology-${info.project.name}`, await read(page));
});
test("source edits make draft stale without changing raw original or edited draft; explicit retain records manual decision", async ({
  page,
}) => {
  await seedB(page, completeData());
  await open(page, 4);
  await btn(page, "生成Agent指令草稿").click();
  await draft(page).fill(
    (await draft(page).inputValue()) + "\n我自己的待确认修改。",
  );
  const custom = await draft(page).inputValue(),
    original = (await read(page)).original;
  await stage(page, 1).click();
  await fieldInput(page, "visual").fill("新的视觉目标，未自动写入草稿。");
  await stage(page, 4).click();
  await expect(draft(page)).toHaveValue(custom);
  await expect(page.locator(".writeb-draft-state")).toContainText("未自动覆盖");
  expect((await read(page)).original).toBe(original);
  await expect(page.getByRole("checkbox", { name: reviews[4] })).toBeDisabled();
  await btn(page, "保留编辑，确认已核对当前输入").click();
  await expect(draft(page)).toHaveValue(custom);
  await expect(page.getByRole("checkbox", { name: reviews[4] })).toBeEnabled();
  expect((await read(page)).draftVersion).toBe((await read(page)).revision);
});
test("regeneration explicitly replaces only draft and keeps raw text including negation and line breaks", async ({
  page,
}) => {
  const d = completeData();
  d.original = "  不要上线。\n不发送；也许只需静态。\n";
  await seedB(page, d);
  await open(page, 4);
  await btn(page, "生成Agent指令草稿").click();
  await draft(page).fill("我的临时草稿".repeat(25));
  await btn(page, "重新生成（覆盖编辑草稿）").click();
  const r = await read(page);
  expect(r.original).toBe(d.original);
  expect(r.draft).toBe(bBrief(r));
  expect(r.draft).toContain(d.original);
  expect(r.reviewed).toBe(false);
});
test("incomplete generator marks unknowns rather than filling examples or claiming automatic execution", async ({
  page,
}) => {
  await open(page, 4);
  await btn(page, "生成Agent指令草稿").click();
  const s = await draft(page).inputValue();
  expect(s).toContain("【待确认：未填写】");
  expect(s).not.toContain(bCases[0].examples.visual);
  await expect(page.getByRole("checkbox", { name: reviews[4] })).toBeDisabled();
  await btn(page, "保存本站成果").click();
  await expect(page.locator(".notice")).toContainText("先完成");
  await expect(page.locator(".agent-options")).toContainText("不发送外部Agent");
});
test("quality examples replace only requested field, all fields remain editable and plans do not become pass reports", async ({
  page,
}) => {
  await seedB(page, { ...bInitial(), original: "不要改我的原文。" });
  await open(page, 3);
  await fillGroup(page, 3);
  const d = await read(page);
  await fieldInput(page, "acceptance").fill(
    "人工编辑：实施后再检查，尚未执行。",
  );
  const after = await read(page);
  expect(after.original).toBe("不要改我的原文。");
  for (const f of bFields.filter((f) => f.group === 3 && f.id !== "acceptance"))
    expect(after.fields[f.id]).toBe(d.fields[f.id]);
  await expect(page.locator(".writeb-boundary").first()).toContainText(
    "而非“已经通过”",
  );
  expect(after.fields.acceptance).toContain("尚未执行");
});
test("finishing only last station records practice not whole course approval and short edits invalidate review", async ({
  page,
}) => {
  await seedB(page, completeData());
  await open(page, 4);
  await btn(page, "生成Agent指令草稿").click();
  await page.getByRole("checkbox", { name: reviews[4] }).check();
  await btn(page, "保存本站成果").click();
  expect((await read(page)).done).toEqual([4]);
  await expect(page.locator(".notice")).toContainText("还有 4 站");
  await draft(page).fill("短");
  await expect(page.getByRole("checkbox", { name: reviews[4] })).toBeDisabled();
  expect((await read(page)).reviewed).toBe(false);
});
test("reduced motion and short viewport preserve writing and no idle or unmounted animation loop exists", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.rafB = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.rafB++;
      return raf(cb);
    };
  });
  await open(page, 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 480 });
  await fillGroup(page, 1);
  await fieldInput(page, "visual").fill("减少动态仍可编辑。");
  const n = await page.evaluate(() => window.rafB);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.rafB)).toBe(n);
  await axes(page);
  await stage(page, 0).click();
  const after = await page.evaluate(() => window.rafB);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.rafB)).toBe(after);
  save(`reduce-${info.project.name}`, {
    idleRaf: n,
    afterNavigation: after,
    content: (await read(page)).fields.visual,
  });
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local writing crop`, async ({
    page,
  }, info) => {
    await open(page, n);
    await axes(page);
    const selector =
      n === 0
        ? ".writeb-example"
        : n === 1
          ? ".writeb-field"
          : n === 2
            ? ".writeb-condition"
            : n === 3
              ? ".writeb-field"
              : ".agent-grid";
    await page
      .locator(selector)
      .first()
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
  });
async function fullFlow(p, info, mode) {
  const keyboard = mode === "keyboard",
    trace = [],
    k = createKeyboardNavigator(p, expect, trace, {
      lesson: "stageB",
      profile: info.project.name,
    });
  const act = keyboard
      ? k.act
      : async (l, name) => {
          await l.tap();
          trace.push({ tap: name });
        },
    toggle = keyboard
      ? k.toggle
      : async (l, name) => {
          await l.tap();
          trace.push({ tap: name });
        };
  const edit = keyboard
    ? async (l, text, name) => {
        await k.seek(l, name);
        await p.keyboard.press("ControlOrMeta+A");
        await p.keyboard.type(text);
      }
    : async (l, text) => l.fill(text);
  const choose = keyboard
    ? async (l, value, name) => {
        await k.seek(l, name);
        await p.keyboard.press("Home");
        const i = await l
          .locator("option")
          .evaluateAll((es, v) => es.findIndex((e) => e.value === v), value);
        for (let j = 0; j < i; j++) await p.keyboard.press("ArrowDown");
        await p.keyboard.press("Tab");
        await expect(l).toHaveValue(value);
      }
    : async (l, v) => l.selectOption(v);
  await p.addInitScript(() => {
    window.keysB = 0;
    document.addEventListener("keydown", () => window.keysB++);
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
  await act(btn(p, "完成并继续"), "incomplete retry");
  await expect(p.locator(".notice")).toContainText("先完成");
  await act(btn(p, "查看模糊示例"), "vague");
  await act(btn(p, "查看具体示例"), "concrete");
  await act(btn(p, "填入本案例原文示例（替换原文）"), "original sample");
  await edit(
    fieldInput(p, "original"),
    "Original: maybe static; do not send or deploy.",
    "edit original",
  );
  await toggle(
    p.getByRole("checkbox", { name: reviews[0] }),
    "review comparison",
  );
  await act(btn(p, "完成并继续"), "finish comparison");
  await fillGroup(p, 1, act);
  await edit(
    fieldInput(p, "visual"),
    "Keep readable text and restrained local feedback.",
    "edit visual",
  );
  await toggle(p.getByRole("checkbox", { name: reviews[1] }), "review effects");
  await act(btn(p, "完成并继续"), "finish effects");
  await choose(
    p.locator("#writeb-technology"),
    "custom",
    "technical alternative",
  );
  await act(btn(p, "填入自定义候选示例（替换名称）"), "candidate sample");
  await edit(
    fieldInput(p, "custom"),
    "Existing project + optional CSS",
    "edit alternative",
  );
  await act(btn(p, "填入取舍示例（替换理由）"), "reason sample");
  await toggle(
    p.getByRole("checkbox", { name: reviews[2] }),
    "review conditions",
  );
  await act(btn(p, "完成并继续"), "finish technology");
  await fillGroup(p, 3, act);
  await edit(
    fieldInput(p, "acceptance"),
    "After implementation test cancel, retry, focus and narrow width; no results claimed.",
    "edit acceptance",
  );
  await toggle(p.getByRole("checkbox", { name: reviews[3] }), "review quality");
  await act(btn(p, "完成并继续"), "finish quality");
  await act(btn(p, "生成Agent指令草稿"), "generate");
  const text = (await read(p)).draft;
  expect(text).toContain("Original: maybe static; do not send or deploy.");
  await edit(
    draft(p),
    text + "\nManual addition: confirm assumptions first.",
    "edit draft",
  );
  await act(btn(p, "复制Agent草稿"), "copy manual fallback");
  await expect(draft(p)).toBeFocused();
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByRole("checkbox", { name: reviews[4] }),
    "review full draft",
  );
  await act(btn(p, "完成综合阶段B"), "finish B");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
  await expect(p.locator(".notice")).toContainText(
    "T01/T02/T03/T04/T05已开放，T06–T12仍为预告",
  );
  await expect(p.locator(".notice")).not.toContainText("全课程已完成");
  const before = await read(p);
  await p.reload();
  await directory(p, act);
  expect((await read(p)).draft).toBe(before.draft);
  expect((await read(p)).original).toBe(before.original);
  expect((await read(p)).done).toHaveLength(5);
  await act(btn(p, "重置综合阶段B进度"), "reset");
  if (keyboard) {
    await expect(
      p.getByRole("dialog", { name: "重新开始综合阶段B？" }),
    ).toBeVisible();
    await p.keyboard.press("Escape");
    trace.push({ escape: "cancel reset" });
    await expect(btn(p, "重置综合阶段B进度")).toBeFocused();
  } else await act(btn(p, "保留综合阶段B进度"), "cancel reset");
  expect((await read(p)).done).toHaveLength(5);
  await act(btn(p, "重置综合阶段B进度"), "reset reopen");
  await act(btn(p, "确认重置综合阶段B"), "confirm reset");
  await expect(p.locator("#writeb-stage-heading")).toBeFocused();
  expect((await read(p)).original).toBe("");
  expect((await read(p)).done).toEqual([]);
  expect(await snapshot(p)).toEqual(prior);
  if (!keyboard) expect(await p.evaluate(() => window.keysB)).toBe(0);
  save(`full-${mode}-${info.project.name}`, {
    trace,
    old32AndAPreserved: true,
    keydown: await p.evaluate(() => window.keysB),
    final: await read(p),
  });
}
test("complete real Tab writing flow missing repair actual edits copy refresh cancel confirm reset preserves32+A", async ({
  page,
}, info) => {
  await fullFlow(page, info, "keyboard");
});
for (const reduce of [false, true])
  test(`complete zero-keyboard touch ${reduce ? "reduce" : "normal"} writing flow missing repair edits refresh reset`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: reduce ? "reduce" : "no-preference",
      }),
      p = await c.newPage();
    try {
      await fullFlow(p, info, reduce ? "touch-reduce" : "touch-normal");
    } finally {
      await c.close();
    }
  });
test("clipboard success copies clicked snapshot and later editing is preserved with truthful status", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text) =>
          new Promise((resolve) => {
            window.copyTextB = text;
            window.resolveB = resolve;
          }),
      },
    }),
  );
  await seedB(page, completeData());
  await open(page, 4);
  await btn(page, "生成Agent指令草稿").click();
  const before = await draft(page).inputValue();
  await btn(page, "复制Agent草稿").click();
  await draft(page).fill(before + "\nLater edited.");
  await page.evaluate(() => window.resolveB());
  await expect(page.locator(".copy-feedback")).toContainText(
    "当前草稿未重新复制",
  );
  expect(await draft(page).inputValue()).toBe(before + "\nLater edited.");
  expect(await page.evaluate(() => window.copyTextB)).toBe(before);
  save(`copy-snapshot-${info.project.name}`, {
    clicked: before,
    current: await draft(page).inputValue(),
  });
});
test("copy failure protects external focus, changed text and generation mutex through navigation and reset", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((resolve, reject) =>
            (window.copiesB ??= []).push({ resolve, reject }),
          ),
      },
    }),
  );
  await seedB(page, completeData());
  await open(page, 4);
  await btn(page, "生成Agent指令草稿").click();
  await btn(page, "复制Agent草稿").click();
  await stage(page, 0).click();
  await stage(page, 4).click();
  await btn(page, "复制Agent草稿").click();
  expect(await page.evaluate(() => window.copiesB.length)).toBe(2);
  await page.evaluate(() => window.copiesB[0].reject(Error("old")));
  await btn(page, "复制Agent草稿").click();
  expect(await page.evaluate(() => window.copiesB.length)).toBe(2);
  await draft(page).fill(
    (await draft(page).inputValue()) + "\nEdit while copying.",
  );
  await page.evaluate(() => window.copiesB[1].reject(Error("current changed")));
  await expect(draft(page)).toBeFocused();
  await expect(page.locator(".copy-feedback")).toContainText("草稿已修改");
  await btn(page, "复制Agent草稿").click();
  await btn(page, "保留编辑，确认已核对当前输入").click();
  await page.evaluate(() => window.copiesB[2].reject(Error("external")));
  await expect(btn(page, "保留编辑，确认已核对当前输入")).toBeFocused();
  await expect(page.locator(".copy-feedback")).toContainText(
    "当前焦点保持不变",
  );
  await btn(page, "复制Agent草稿").click();
  await btn(page, "重置综合阶段B进度").click();
  await btn(page, "确认重置综合阶段B").click();
  await expect(page.locator("#writeb-stage-heading")).toBeFocused();
  await page.evaluate(() => window.copiesB[3].resolve());
  await expect(page.locator("#writeb-stage-heading")).toBeFocused();
  expect((await read(page)).generated).toBe(false);
  save(`copy-generations-${info.project.name}`, {
    copies: await page.evaluate(() => window.copiesB.length),
    reset: await read(page),
  });
});
test("late navigation RAF respects real Tab focus and cannot steal focus after unmount", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.framesB = [];
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      window.holdB
        ? (window.framesB.push(cb), 80000 + window.framesB.length)
        : raf(cb);
  });
  await open(page);
  await page.evaluate(() => (window.holdB = true));
  await stage(page, 1).click();
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "stageB-late",
      profile: info.project.name,
    });
  const target = fieldInput(page, "visual");
  await k.seek(target, "user Tab after navigation");
  await page.evaluate(() =>
    window.framesB.forEach((cb) => cb(performance.now())),
  );
  await expect(target).toBeFocused();
  await page.evaluate(() => (window.holdB = false));
  await stage(page, 2).click();
  await expect(page.locator("#writeb-stage-heading")).toBeFocused();
  await page.evaluate(() => (window.holdB = true));
  await stage(page, 0).click();
  await page.evaluate(() => {
    window.oldBFrames = [...window.framesB];
    window.holdB = false;
  });
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").first().click();
  await expect(page.locator("#stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const before = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() =>
    window.oldBFrames.forEach((cb) => cb(performance.now())),
  );
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    before,
  );
  save(`late-navigation-${info.project.name}`, trace);
});
test("corrupt and unavailable B storage keeps writing usable and reset scoped toB", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("frontend-observatory.stageB.v1", "{bad");
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "frontend-observatory.stageB.v1") throw Error("denied");
      return orig.call(this, k, v);
    };
  });
  await open(page);
  await expect(page.locator(".saved")).toContainText("存储不可用");
  await btn(page, "填入本案例原文示例（替换原文）").click();
  await expect(fieldInput(page, "original")).not.toHaveValue("");
  await btn(page, "重置综合阶段B进度").click();
  await btn(page, "确认重置综合阶段B").click();
  await expect(fieldInput(page, "original")).toHaveValue("");
});
test("malformed stored types lengths and source revisions sanitize without inventing semantic approval", async ({
  page,
}) => {
  await seedB(page, {
    step: 90,
    done: [0, 0, 99, "bad"],
    caseId: "unknown",
    technology: "library-magic",
    fields: { visual: "x".repeat(900), trigger: 17 },
    original: "o".repeat(1400),
    techReason: 7,
    draft: "d".repeat(14000),
    revision: -9,
    draftVersion: 50,
    generated: true,
    reviewed: true,
  });
  await open(page);
  const d = await read(page);
  expect(d.step).toBe(0);
  expect(d.done).toEqual([0]);
  expect(d.caseId).toBe("favorite");
  expect(d.original).toHaveLength(1200);
  expect(d.fields.visual).toHaveLength(500);
  expect(d.fields.trigger).toBe("");
  expect(d.technology).toBe("");
  expect(d.techReason).toBe("");
  expect(d.revision).toBe(0);
  expect(d.draftVersion).toBe(-1);
  expect(d.reviewed).toBe(false);
  expect(d.draft).toHaveLength(12000);
});
test("A exit opens actual B, directory stays32 plus A/B and T01/T02/T03/T04/T05 open while7 tools remain previews", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(7);
  await nav
    .getByRole("button", { name: "A · 设计工具映射 · 可学习", exact: true })
    .click();
  await btn(page, "继续综合阶段B · Agent指令能力").click();
  await expect(
    page.getByRole("navigation", { name: "综合阶段B学习步骤" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Agent 指令能力 · 前端观察室");
  await expect(page.locator(".site-footer")).toContainText(
    "综合A/B已开放，T01/T02/T03/T04/T05已开放；T06–T12尚未制作",
  );
  await expect(page.locator(".writeb-boundary").last()).toContainText(
    "T06–T12工具模块仍为预告",
  );
  await page.getByText("路线核对说明与官方来源", { exact: true }).click();
  await page.getByText("查看完整 32 课目录及覆盖标签", { exact: true }).click();
  const outline = page.locator(".full-course-outline");
  await expect(outline.locator(":scope > ol > li")).toHaveCount(32);
  await expect(
    outline.locator("[data-coverage-id]").filter({ hasText: "尚未制作" }),
  ).toHaveCount(7);
  for (const id of ["A", "B", "T01", "T02", "T03", "T04", "T05"])
    await expect(
      outline.locator(`[data-coverage-id=${id}] button`),
    ).toHaveCount(1);
  for (let i = 6; i <= 12; i++)
    await expect(
      outline.locator(
        `[data-coverage-id=T${String(i).padStart(2, "0")}] a,[data-coverage-id=T${String(i).padStart(2, "0")}] button`,
      ),
    ).toHaveCount(0);
  await expect(outline.locator('[data-lesson-id="34"]')).toHaveCount(0);
});
