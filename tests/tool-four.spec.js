import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL04_STORAGE as KEY,
  tool04Initial,
  tool04Brief,
  tool04Questions,
} from "../src/tool-four-content.js";
const out = "/tmp/tool04-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T04工具专题学习步骤" })
      .getByRole("button")
      .nth(n),
  dialog = (p) =>
    p.getByRole("dialog", { name: "本地组件维护合同", exact: true }),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  field = (p, id) => p.locator("#tool04-" + id),
  stats = (p) =>
    p.locator("[data-computed]").getAttribute("data-computed").then(JSON.parse),
  cardbuttons = (p) => p.locator(".tool04-preview .tool04-button"),
  draft = (p) => field(p, "agent-draft");
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(b(nav, "T04 · shadcn/ui · 可学习"), "T04");
  await expect(field(p, "stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  if (n) await stage(p, n).click();
}
async function seed(p, d) {
  await p.addInitScript(
    ([k, d]) => {
      if (window === top) localStorage.setItem(k, JSON.stringify(d));
    },
    [KEY, d],
  );
}
const good = () => ({
  ...tool04Initial(),
  step: 4,
  done: [0, 1, 2, 3],
  context: "优先复用现有组件，保护本地变体并检查回归。",
});
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
async function plan(p, mode) {
  await field(p, "plan").selectOption(mode);
  await b(p, "准备教学候选快照").click();
  await b(p, "应用候选到本页预览").click();
}
async function holdClose(p) {
  await p.addInitScript(() => {
    window.tool04Timers = [];
    const real = setTimeout.bind(window);
    window.setTimeout = (cb, delay, ...args) =>
      window.holdTool04 && delay === 0
        ? (window.tool04Timers.push(() => cb(...args)),
          900000 + window.tool04Timers.length)
        : real(cb, delay, ...args);
  });
}
async function flush(p) {
  await p.evaluate(() => {
    window.holdTool04 = false;
    window.tool04Timers.splice(0).forEach((f) => f());
  });
}
test("actual local source provenance MIT dependency reuse and truthful finite model", async ({
  page,
}) => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.dependencies["@radix-ui/react-dialog"]).toBe("1.3.1");
  expect(pkg.dependencies.shadcn).toBeUndefined();
  await open(page);
  await b(page, "查看实际本地源码（只读）").click();
  expect(await page.locator(".tool04-code code").textContent()).toBe(
    readFileSync("src/components/tool04/card.jsx", "utf8"),
  );
  await field(page, "source").selectOption("button");
  expect(await page.locator(".tool04-code code").textContent()).toBe(
    readFileSync("src/components/tool04/button.jsx", "utf8"),
  );
  await field(page, "source").selectOption("css");
  expect(await page.locator(".tool04-code code").textContent()).toBe(
    readFileSync("src/components/tool04/components.css", "utf8"),
  );
  const license = await page.request.get("/licenses/shadcn-ui-MIT.txt");
  expect(license.ok()).toBe(true);
  expect(await license.text()).toContain("Copyright (c) 2023 shadcn");
  await expect(page.locator(".tool04-boundary").first()).toContainText(
    "未运行shadcn CLI",
  );
  expect(tool04Brief(good())).toContain("不写项目文件");
  expect(tool04Brief(good())).toContain("T08–T12仍为5个预告");
});
test("tokens variants sizes and real computed values share source while instances retain independent counts", async ({
  page,
}) => {
  await open(page, 1);
  await b(page, "读取真实组件样式与DOM").click();
  let s = await stats(page);
  expect(s.padding).toEqual(["16px", "16px"]);
  expect(s.radius).toEqual(["12px", "12px"]);
  expect(s.buttons.map((b) => b.tag)).toEqual(["BUTTON", "BUTTON"]);
  await cardbuttons(page).nth(0).click();
  await cardbuttons(page).nth(1).click();
  await cardbuttons(page).nth(1).click();
  await field(page, "palette").selectOption("forest");
  await field(page, "density").selectOption("roomy");
  await field(page, "radius").selectOption("18");
  await field(page, "variant").selectOption("solid");
  await field(page, "size").selectOption("large");
  await b(page, "读取真实组件样式与DOM").click();
  s = await stats(page);
  expect(s.padding).toEqual(["24px", "24px"]);
  expect(s.radius).toEqual(["18px", "18px"]);
  expect(
    s.buttons.every(
      (b) =>
        b.variant === "solid" &&
        b.height >= 52 &&
        b.background === "rgb(33, 97, 70)",
    ),
  ).toBe(true);
  expect(s.counts).toEqual([1, 2]);
  expect(s.buttons.map((b) => b.count)).toEqual([1, 2]);
  await field(page, "variant").selectOption("outline");
  expect(
    await cardbuttons(page)
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
});
test("native disabled and same model guard reject activation without false success or lost focus", async ({
  page,
}) => {
  await open(page, 1);
  const toggle = page.getByRole("checkbox", {
    name: "第一张原生disabled（第二张仍可用）",
    exact: true,
  });
  await toggle.check();
  await expect(cardbuttons(page).first()).toBeDisabled();
  await b(page, "同模型操作第一张（含禁用守卫）").click();
  await expect(b(page, "同模型操作第一张（含禁用守卫）")).toBeFocused();
  await expect(page.locator(".tool04-feedback")).toContainText("未增加计数");
  await cardbuttons(page).nth(1).click();
  await b(page, "读取真实组件样式与DOM").click();
  expect((await stats(page)).counts).toEqual([0, 1]);
  expect((await stats(page)).buttons.map((b) => b.count)).toEqual([0, 1]);
  expect((await read(page)).disabledSeen).toBe(true);
  await toggle.uncheck();
  await cardbuttons(page).first().click();
  await expect(cardbuttons(page).first()).toContainText("1");
});
test("long editable title is text with empty fallback and real resize never clips controls", async ({
  page,
}) => {
  await open(page, 1);
  await b(page, "填入长标题示例（替换本栏）").click();
  await field(page, "title").fill(
    "<button>这只是长标题文本</button>".repeat(5),
  );
  await expect(
    page.locator('.tool04-preview [data-slot="card-title"]').first(),
  ).toContainText("<button>");
  await expect(
    page.locator('.tool04-preview [data-slot="card-title"] button'),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 480 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await field(page, "title").fill("");
  await expect(page.locator(".tool04-preview h3").first()).toHaveText(
    "未命名教学活动",
  );
  await cardbuttons(page).nth(1).click();
});
test("four layers retain conditions and real Radix modal labels native keyboard trap Escape return", async ({
  page,
}, info) => {
  await open(page);
  for (const n of ["底层primitive", "项目组件", "业务实例"])
    await b(page, n).click();
  await expect(page.locator(".tool04-panel")).toContainText("不是实际报名");
  await b(page, "打开维护契约清单").click();
  await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
  await expect(b(dialog(page), "关闭维护清单")).toBeFocused();
  await expect(dialog(page)).toHaveAttribute("aria-describedby", /.+/);
  expect(
    await dialog(page).evaluate(
      (e) => !document.querySelector(".tool04-workbench").contains(e),
    ),
  ).toBe(true);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool04-native",
      profile: info.project.name,
    });
  await k.act(b(dialog(page), "记录已核对维护职责"), "record");
  await k.seek(b(dialog(page), "离开T04复习T03"), "last");
  await page.keyboard.press("Tab");
  await expect(b(dialog(page), "关闭维护清单")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(b(dialog(page), "离开T04复习T03")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(b(page, "打开维护契约清单")).toBeFocused();
  expect((await read(page)).contractSeen).toBe(true);
  writeFileSync(
    `${out}/${info.project.name}-native-dialog.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("rapid modal reopen close keeps a single content restores body locks and leave preserves next focus", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 5; i++) {
    await b(page, "打开维护契约清单").click();
    await expect(dialog(page)).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(b(page, "打开维护契约清单")).toBeFocused();
  }
  await b(page, "打开维护契约清单").click();
  await b(dialog(page), "离开T04复习T03").click();
  await expect(page.locator("#tool03-stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  await expect(page.locator(".tool04-dialog,.tool04-overlay")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.pointerEvents)).toBe("");
});
test("held close callback respects genuine outside Tab focus and never reclaims it", async ({
  page,
}, info) => {
  await holdClose(page);
  await open(page);
  await b(page, "打开维护契约清单").click();
  await page.evaluate(() => (window.holdTool04 = true));
  await b(dialog(page), "关闭维护清单").click();
  await page.evaluate(() => (window.holdTool04 = false));
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool04-late-close",
      profile: info.project.name,
    });
  await k.seek(field(page, "palette"), "external select");
  await flush(page);
  await expect(field(page, "palette")).toBeFocused();
  writeFileSync(
    `${out}/${info.project.name}-late-close.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("held old generation does not steal reopened modal or its subsequent native cycle", async ({
  page,
}, info) => {
  await holdClose(page);
  await open(page);
  await b(page, "打开维护契约清单").click();
  await page.evaluate(() => (window.holdTool04 = true));
  await b(dialog(page), "关闭维护清单").click();
  await page.evaluate(() => (window.holdTool04 = false));
  await b(page, "打开维护契约清单").click();
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool04-reopen",
      profile: info.project.name,
    });
  await k.seek(b(dialog(page), "记录已核对维护职责"), "new dialog control");
  await flush(page);
  await expect(b(dialog(page), "记录已核对维护职责")).toBeFocused();
  await k.seek(b(dialog(page), "关闭维护清单"), "new first close");
  await page.keyboard.press("Escape");
  await expect(b(page, "打开维护契约清单")).toBeFocused();
});
test("held old close after route unmount cannot move current user focus back into old topic", async ({
  page,
}) => {
  await holdClose(page);
  await open(page);
  await b(page, "打开维护契约清单").click();
  await page.evaluate(() => (window.holdTool04 = true));
  await b(dialog(page), "离开T04复习T03").click();
  await page.evaluate(() => (window.holdTool04 = false));
  await expect(page.locator("#tool03-stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await flush(page);
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  await expect(page.locator(".tool04-dialog")).toHaveCount(0);
});
test("whole replacement candidate genuinely changes variant and local rule fails without overwriting source or counts", async ({
  page,
}) => {
  await open(page, 2);
  await cardbuttons(page).nth(1).click();
  const source = readFileSync("src/components/tool04/card.jsx", "utf8");
  await plan(page, "replace");
  await expect(cardbuttons(page).first()).toHaveAttribute(
    "data-variant",
    "solid",
  );
  await b(page, "运行明确规则检查（非完整验收）").click();
  await expect(page.locator(".tool04-check")).toContainText("规则未通过");
  await expect(page.locator(".tool04-check")).toContainText(
    "○ 保留项目描边支持",
  );
  await b(page, "撤回候选预览").click();
  await expect(cardbuttons(page).first()).toHaveAttribute(
    "data-variant",
    "outline",
  );
  await expect(cardbuttons(page).nth(1)).toContainText("1");
  expect(readFileSync("src/components/tool04/card.jsx", "utf8")).toBe(source);
  expect((await read(page)).replacementSeen).toBe(true);
});
test("selective merge only changes actual padding preserves DOM business state focus and can roll back", async ({
  page,
}) => {
  await open(page, 2);
  await cardbuttons(page).first().click();
  const node = await cardbuttons(page).first().elementHandle();
  await plan(page, "selective");
  await expect(b(page, "应用候选到本页预览")).toBeFocused();
  expect(
    await node.evaluate((e) => e === document.querySelector(".tool04-button")),
  ).toBe(true);
  await b(page, "运行明确规则检查（非完整验收）").click();
  expect((await stats(page)).padding).toEqual(["20px", "20px"]);
  await expect(page.locator(".tool04-check")).toContainText("明确规则通过");
  expect((await read(page)).maintainedSeen).toBe(true);
  await expect(cardbuttons(page).first()).toContainText("1");
  await b(page, "撤回候选预览").click();
  await b(page, "读取真实组件样式与DOM").click();
  expect((await stats(page)).padding).toEqual(["16px", "16px"]);
});
test("deferring upstream is valid preservation with explicit followup rather than automatic update approval", async ({
  page,
}) => {
  await open(page, 2);
  await plan(page, "defer");
  await b(page, "运行明确规则检查（非完整验收）").click();
  await expect(page.locator(".tool04-check")).toContainText("明确规则通过");
  await expect(page.locator(".tool04-feedback")).toContainText(
    "延期方案仍需后续评估",
  );
  expect((await stats(page)).padding).toEqual(["16px", "16px"]);
  expect(tool04Brief({ ...good(), maintenanceChoice: "defer" })).toContain(
    "保留本地，记录上游待评估",
  );
});
test("changed configuration rejects old candidate and rapid interleaving never overwrites latest tokens", async ({
  page,
}) => {
  await open(page, 2);
  await b(page, "应用候选到本页预览").click();
  await expect(page.locator(".tool04-feedback")).toContainText("先准备");
  await b(page, "准备教学候选快照").click();
  await field(page, "palette").selectOption("forest");
  await b(page, "应用候选到本页预览").click();
  await expect(page.locator(".tool04-feedback")).toContainText("拒绝旧候选");
  expect((await read(page)).staleSeen).toBe(true);
  for (let i = 0; i < 5; i++) {
    await b(page, "准备教学候选快照").click();
    await field(page, "radius").selectOption(i % 2 ? "8" : "18");
    await b(page, "应用候选到本页预览").click();
  }
  await expect(page.locator(".tool04-preview")).toHaveAttribute(
    "data-applied",
    "local",
  );
  await b(page, "准备教学候选快照").click();
  await b(page, "应用候选到本页预览").click();
  await b(page, "运行明确规则检查（非完整验收）").click();
  const s = await stats(page);
  expect(s.radius).toEqual(["18px", "18px"]);
  expect(s.buttons.every((b) => b.color === "rgb(33, 97, 70)")).toBe(true);
});
test("leaving and returning clears transient counts and candidates while browser configuration remains", async ({
  page,
}) => {
  await open(page, 2);
  await field(page, "palette").selectOption("forest");
  await cardbuttons(page).nth(1).click();
  await plan(page, "selective");
  await b(page, "返回T03复习").click();
  await expect(page.locator("#tool03-stage-heading")).toBeFocused();
  await expect(page.locator(".tool04-workbench")).toHaveCount(0);
  await directory(page);
  await expect(page.locator(".tool04-preview")).toHaveAttribute(
    "data-applied",
    "local",
  );
  await expect(cardbuttons(page).nth(1)).toContainText("0");
  await expect(field(page, "palette")).toHaveValue("forest");
  await b(page, "应用候选到本页预览").click();
  await expect(page.locator(".tool04-feedback")).toContainText("先准备");
});
test("live reduce stays functional idle has no requestAnimationFrame loop and no external business network", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await open(page, 2);
  await page.evaluate(() => {
    window.frames04 = 0;
    const real = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.frames04++;
      return real(cb);
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await field(page, "palette").selectOption("forest");
  await plan(page, "selective");
  await b(page, "运行明确规则检查（非完整验收）").click();
  await expect(page.locator(".tool04-check")).toContainText("明确规则通过");
  await page.waitForTimeout(120);
  const n = await page.evaluate(() => window.frames04);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => window.frames04)).toBe(n);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await cardbuttons(page).first().click();
  expect(
    requests.filter((u) => new URL(u).origin !== "http://127.0.0.1:4173"),
  ).toEqual([]);
});
test("quiz explains wrong alternatives and permits retry without code memorization", async ({
  page,
}) => {
  await open(page, 3);
  await b(page, "完成并继续").click();
  await expect(page.locator(".notice")).toContainText("先完成");
  for (let i = 0; i < 3; i++) {
    const q = page.locator(".quiz-grid fieldset").nth(i);
    await q
      .getByRole("button")
      .nth(1 - tool04Questions[i].correct)
      .click();
    await expect(q).toContainText("再想一想");
    await q.getByRole("button").nth(tool04Questions[i].correct).click();
    await expect(q).toContainText(tool04Questions[i].why);
  }
});
test("editable brief preserves own text marks old context stale and requires explicit retain or regenerate", async ({
  page,
}) => {
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  const original = await draft(page).inputValue();
  await draft(page).fill(original + "\n自己的维护约定。");
  await field(page, "context").fill("新的项目约束");
  await expect(draft(page)).toHaveValue(original + "\n自己的维护约定。");
  await expect(
    page.getByRole("checkbox", {
      name: "我已核对来源许可、token/variant、本地维护与回归边界。",
      exact: true,
    }),
  ).toBeDisabled();
  await b(page, "保留编辑并确认当前实验参数").click();
  await page
    .getByRole("checkbox", {
      name: "我已核对来源许可、token/variant、本地维护与回归边界。",
      exact: true,
    })
    .check();
  await b(page, "重新生成工具选型草稿").click();
  expect(await draft(page).inputValue()).not.toContain("自己的维护约定");
  expect((await read(page)).reviewed).toBe(false);
});
test("clipboard copies clicked snapshot and never overwrites subsequent edits", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) => {
          window.copied04 = t;
          return new Promise((r) => (window.release04 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  const text = await draft(page).inputValue();
  await b(page, "复制工具选型说明").click();
  await draft(page).fill(text + "新的编辑");
  await page.evaluate(() => window.release04());
  await expect(page.locator(".copy-feedback")).toContainText("点击时的版本");
  expect(await page.evaluate(() => window.copied04)).toBe(text);
  await expect(draft(page)).toHaveValue(text + "新的编辑");
});
test("clipboard denied restores manual selection only with owned focus and respects external Tab movement", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => new Promise((_, r) => (window.reject04 = r)) },
    }),
  );
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await page.evaluate(() => window.reject04(Error("fixture denied")));
  await expect(draft(page)).toBeFocused();
  expect(
    await draft(page).evaluate((e) => e.selectionEnd - e.selectionStart),
  ).toBe((await draft(page).inputValue()).length);
  await b(page, "复制工具选型说明").click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.reject04(Error("fixture denied")));
  await expect(page.locator(".copy-feedback")).toContainText(
    "当前焦点保持不变",
  );
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
test("late clipboard generation mutex reset and navigate cannot revive old draft or reclaim focus", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => {
          window.calls04 = (window.calls04 || 0) + 1;
          return new Promise((r) => (window.release04 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.calls04)).toBe(1);
  await b(page, "重置T04工具专题进度").click();
  await b(page, "确认重置T04工具专题").click();
  await expect(field(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.release04());
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  expect((await read(page)).draft).toBe("");
  await expect(page.locator(".copy-feedback")).toHaveCount(0);
});
test("malformed and denied storage are bounded and cannot prevent real local components", async ({
  page,
  browser,
}) => {
  await seed(page, {
    ...good(),
    step: 99,
    radius: 999,
    title: "x".repeat(300),
    draft: "x".repeat(20000),
    done: [0, 0, 4, -1, 99],
    palettesSeen: ["bogus"],
    answers: [9, 0, 1],
    reviewed: true,
    draftStale: true,
  });
  await open(page);
  const s = await read(page);
  expect(s.step).toBe(0);
  expect(s.radius).toBe(12);
  expect(s.done).toEqual([0, 4]);
  expect(s.title.length).toBe(160);
  expect(s.draft.length).toBe(10000);
  expect(s.reviewed).toBe(false);
  await cardbuttons(page).nth(1).click();
  const c = await browser.newContext(),
    p = await c.newPage();
  await p.addInitScript(() => {
    localStorage.setItem("frontend-observatory.tool04.v1", "{bad");
    Storage.prototype.setItem = () => {
      throw Error("fixture denied");
    };
  });
  await open(p);
  await cardbuttons(p).first().click();
  await expect(p.locator(".saved")).toContainText("存储不可用");
  await c.close();
});
test("short375 source long content and modal retain real focus controls and no horizontal overflow", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await open(page);
  await b(page, "查看实际本地源码（只读）").click();
  await field(page, "source").selectOption("css");
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool04-short",
      profile: info.project.name,
    });
  await k.seek(
    page.getByRole("region", { name: "实际本地组件源码", exact: true }),
    "scrollable source",
  );
  await page.keyboard.press("End");
  await k.act(b(page, "打开维护契约清单"), "modal");
  await axes(page);
  await k.seek(b(dialog(page), "离开T04复习T03"), "last modal");
  await k.seek(b(dialog(page), "关闭维护清单"), "wrapped first");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".tool04-panel")
    .screenshot({ path: `${out}/${info.project.name}-short-source.png` });
  writeFileSync(
    `${out}/${info.project.name}-short.json`,
    JSON.stringify(trace, null, 2),
  );
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local source preview controls crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    await axes(page);
    await page
      .locator(
        n < 3 ? ".tool04-preview" : n === 3 ? ".quiz-grid" : ".agent-grid",
      )
      .screenshot({ path: `${out}/${info.project.name}-station${n + 1}.png` });
    if (n < 3) {
      await b(page, "打开维护契约清单").click();
      await axes(page);
      await dialog(page).screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-dialog.png`,
      });
      await page.keyboard.press("Escape");
    }
  });
const priorKeys = [
  ...Array.from(
    { length: 32 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  "frontend-observatory.stageA.v1",
  "frontend-observatory.stageB.v1",
  "frontend-observatory.tool01.v1",
  "frontend-observatory.tool02.v1",
  "frontend-observatory.tool03.v1",
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
      value: { writeText: () => Promise.reject(Error("denied fixture")) },
    });
  }, priorKeys);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), priorKeys);
}
async function complete(p, act, select, type, toggle) {
  await act(b(p, "项目组件"), "local layer");
  await act(b(p, "业务实例"), "business layer");
  await act(b(p, "查看实际本地源码（只读）"), "actual source");
  await act(b(p, "打开维护契约清单"), "real primitive");
  await act(b(dialog(p), "记录已核对维护职责"), "contract");
  await act(b(dialog(p), "关闭维护清单"), "close");
  await expect(b(p, "打开维护契约清单")).toBeFocused();
  await act(b(p, "完成并继续"), "station0");
  await select(field(p, "palette"), "forest");
  await select(field(p, "variant"), "solid");
  await select(field(p, "variant"), "outline");
  await act(cardbuttons(p).first(), "business1");
  await act(cardbuttons(p).nth(1), "business2");
  await act(b(p, "读取真实组件样式与DOM"), "computed");
  await toggle(
    p.getByRole("checkbox", {
      name: "第一张原生disabled（第二张仍可用）",
      exact: true,
    }),
    "disabled",
  );
  await act(b(p, "同模型操作第一张（含禁用守卫）"), "guard");
  await act(b(p, "完成并继续"), "station1");
  await select(field(p, "plan"), "replace");
  await act(b(p, "准备教学候选快照"), "replacement snapshot");
  await act(b(p, "应用候选到本页预览"), "replacement");
  await act(b(p, "运行明确规则检查（非完整验收）"), "failed rule");
  await expect(p.locator(".tool04-check")).toContainText("规则未通过");
  await select(field(p, "plan"), "selective");
  await act(b(p, "准备教学候选快照"), "candidate snapshot");
  await select(field(p, "radius"), "18");
  await act(b(p, "应用候选到本页预览"), "reject stale");
  await expect(p.locator(".tool04-feedback")).toContainText("拒绝旧候选");
  await act(b(p, "准备教学候选快照"), "fresh candidate");
  await act(b(p, "应用候选到本页预览"), "merge");
  await act(b(p, "运行明确规则检查（非完整验收）"), "rules");
  await expect(p.locator(".tool04-check")).toContainText("明确规则通过");
  await act(b(p, "完成并继续"), "station2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool04Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool04Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "context sample");
  await type(field(p, "context"), " 用户补充：保留来源和回滚。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(draft(p), "\n用户编辑：验收所有调用者。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对来源许可、token/variant、本地维护与回归边界。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T04工具专题"), "complete");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T04工具专题进度"), "reset cancel");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T04工具专题进度"), "cancel reset");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T04工具专题进度")).toBeFocused();
  await act(b(p, "重置T04工具专题进度"), "reset confirm");
  await act(b(p, "确认重置T04工具专题"), "confirm reset");
  await expect(field(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    context: "",
    draft: "",
  });
}
test("real Tab full five stations source config maintenance wrong retry edited copy refresh reset preserves37", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool04-full",
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
    },
    type = async (l, t) => {
      await k.seek(l, "real edit");
      await page.keyboard.press("End");
      await page.keyboard.type(t);
    };
  await complete(page, k.act, select, type, k.toggle);
  const text = (await read(page)).draft;
  await page.reload();
  await directory(page, k.act);
  await expect(draft(page)).toHaveValue(text);
  await reset(page, k.act, true);
  expect(
    await page.evaluate(
      (ks) => ks.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(prior);
  writeFileSync(
    `${out}/${info.project.name}-keyboard-full.json`,
    JSON.stringify(trace, null, 2),
  );
});
for (const reducedMotion of ["no-preference", "reduce"])
  test(`zero keyboard touch full ${reducedMotion} maintenance guards retry refresh cancel confirm reset`, async ({
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
      window.keyEvents04 = 0;
      addEventListener("keydown", () => window.keyEvents04++);
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
      (l, n) => act(l, n),
    );
    const text = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(draft(p)).toHaveValue(text);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keyEvents04)).toBe(0);
    expect(
      await p.evaluate(
        (ks) => ks.map((k) => localStorage.getItem(k)),
        priorKeys,
      ),
    ).toEqual(prior);
    writeFileSync(
      `${out}/${info.project.name}-touch-${reducedMotion}.json`,
      JSON.stringify(
        {
          actions,
          keyEvents: 0,
          fixtures:
            "actual taps plus fill/selectOption fixtures; not OS picker, IME or physical phone",
        },
        null,
        2,
      ),
    );
    await c.close();
  });
test("T03 exit opens actual T04 and leaves six previews without invented numbered38", async ({
  page,
}) => {
  await open(page);
  await b(page, "返回T03复习").click();
  await b(page, "继续T04 · shadcn/ui").click();
  await expect(field(page, "stage-heading")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(9);
  await expect(nav.locator(".coverage-preview")).toHaveCount(5);
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator('[data-lesson-id="38"]')).toHaveCount(0);
});
