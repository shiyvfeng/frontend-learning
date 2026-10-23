import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL03_STORAGE as KEY,
  tool03Initial,
  tool03Brief,
  tool03Questions,
} from "../src/tool-three-content.js";
const out = "/tmp/tool03-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    const focus = await page
      .evaluate(() => {
        const a = document.activeElement,
          d = document.querySelector(".tool03-dialog");
        const rect = (e) =>
          e ? JSON.parse(JSON.stringify(e.getBoundingClientRect())) : null;
        return {
          focus: a?.textContent?.slice(0, 120),
          focusRect: rect(a),
          dialogRect: rect(d),
          scrollTop: d?.scrollTop,
          scrollHeight: d?.scrollHeight,
          viewport: [innerWidth, innerHeight],
        };
      })
      .catch(() => null);
    await info.attach("actual-focus-geometry", {
      body: JSON.stringify(focus),
      contentType: "application/json",
    });
    writeFileSync(
      `${out}/failed-focus-${info.project.name}-${info.line}.json`,
      JSON.stringify(focus, null, 2),
    );
  }
});
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  st = (p, i) =>
    p
      .getByRole("navigation", { name: "T03工具专题学习步骤" })
      .getByRole("button")
      .nth(i),
  dialog = (p) => p.getByRole("dialog", { name: "调整教学卡片", exact: true }),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  draft = (p) => p.locator("#tool03-agent-draft");
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", {
      name: "T03 · Radix / Base UI · 可学习",
      exact: true,
    }),
    "T03",
  );
  await expect(p.locator("#tool03-stage-heading")).toBeVisible();
}
async function open(p, i = 0) {
  await p.goto("/");
  await directory(p);
  if (i) await st(p, i).click();
}
async function launch(p, act = (l) => l.click()) {
  await act(b(p, "打开真实Radix对话框"), "open primitive");
  await expect(dialog(p)).toBeVisible();
  await expect(b(dialog(p), "关闭对话框")).toBeFocused();
}
async function close(p, act = (l) => l.click()) {
  await act(b(dialog(p), "关闭对话框"), "close");
  await expect(dialog(p)).toHaveCount(0);
  await expect(b(p, "打开真实Radix对话框")).toBeFocused();
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
  ...tool03Initial(),
  step: 4,
  done: [0, 1, 2, 3],
  context: "现有组件先复用，保留模态语义、视觉与焦点合同。",
});
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

test("real primitive package and source use Radix parts while Base UI is not installed and brief preserves responsibilities", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.dependencies["@radix-ui/react-dialog"]).toBe("1.3.1");
  expect(pkg.dependencies["@base-ui/react"]).toBeUndefined();
  const src = readFileSync("src/tool-three-lab.jsx", "utf8");
  for (const part of [
    "Root",
    "Trigger",
    "Portal",
    "Content",
    "Title",
    "Description",
    "Close",
  ])
    expect(src).toContain("Dialog." + part);
  const text = tool03Brief({
    ...tool03Initial(),
    context: "原文\n先不迁移项目",
  });
  for (const t of [
    "原文\n先不迁移项目",
    "Base UI仅作未安装",
    "不是浏览器top layer",
    "不要把ARIA声明当成",
    "原46项入口已制作",
  ])
    expect(text).toContain(t);
});
test("actual role name description portal and first safe focus then close returns native trigger", async ({
  page,
}) => {
  await open(page);
  await launch(page);
  await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
  await expect(dialog(page)).toHaveAccessibleDescription(
    "真实Radix模态演示；编辑仅在本地会话，取消不会保存。",
  );
  await b(dialog(page), "读取真实语义与Portal位置").click();
  const s = await page
    .locator(".tool03-workbench")
    .getAttribute("data-contract")
    .then(JSON.parse);
  expect(s).toMatchObject({
    tag: "DIV",
    role: "dialog",
    modal: "true",
    portal: true,
    focusInside: true,
    state: "open",
  });
  expect(s.title).toBe("调整教学卡片");
  await close(page);
  expect(await read(page)).toMatchObject({
    openedSeen: true,
    namedSeen: true,
    focusSeen: true,
    closedSeen: true,
    returnSeen: true,
    portalSeen: true,
  });
  await expect(page.locator("[data-radix-focus-guard]")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.pointerEvents)).toBe("");
});
test("native Enter Space Tab ShiftTab and Escape keep modal cycle then return focus without changing edit", async ({
  page,
}, info) => {
  await open(page);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool03-modal",
      profile: info.project.name,
    });
  await k.act(b(page, "打开真实Radix对话框"), "Enter open");
  const first = b(dialog(page), "关闭对话框"),
    last = b(dialog(page), "关闭并离开T03复习T02");
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await k.seek(
    dialog(page).getByRole("textbox", {
      name: "卡片标题（本地会话）",
      exact: true,
    }),
    "edit",
  );
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("未保存编辑");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(b(page, "打开真实Radix对话框")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(first).toBeFocused();
  await expect(
    dialog(page).getByRole("textbox", {
      name: "卡片标题（本地会话）",
      exact: true,
    }),
  ).toHaveValue("整理一张教学卡片");
  await close(page, k.act);
  writeFileSync(
    `${out}/${info.project.name}-native-dialog-keyboard.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("theme and size change live without remount or losing focus; field labels remain and portal not clipped", async ({
  page,
}) => {
  await open(page, 1);
  await launch(page);
  const field = dialog(page).getByRole("textbox", {
    name: "卡片标题（本地会话）",
    exact: true,
  });
  await field.fill("实际编辑");
  const id = await dialog(page).getAttribute("id");
  await dialog(page)
    .getByLabel("面板内主题", { exact: true })
    .selectOption("ink");
  await expect(dialog(page)).toHaveCSS("background-color", "rgb(40, 37, 53)");
  await dialog(page)
    .getByLabel("面板内尺寸", { exact: true })
    .selectOption("wide");
  expect(await dialog(page).getAttribute("id")).toBe(id);
  await expect(field).toHaveValue("实际编辑");
  const box = await dialog(page).boundingBox(),
    v = page.viewportSize();
  expect(box.width).toBeLessThanOrEqual(v.width - 30);
  expect(box.x).toBeGreaterThanOrEqual(14);
  await b(dialog(page), "读取真实语义与Portal位置").click();
  expect(
    (
      await page
        .locator(".tool03-workbench")
        .getAttribute("data-contract")
        .then(JSON.parse)
    ).portal,
  ).toBe(true);
  await b(dialog(page), "保存本地标题并关闭").click();
  await expect(b(page, "打开真实Radix对话框")).toBeFocused();
  await expect(page.locator(".tool03-static")).toContainText("实际编辑");
});
test("empty validation is own business rule, remains open with error and repairs via sample then local save", async ({
  page,
}) => {
  await open(page, 2);
  await launch(page);
  await b(dialog(page), "清空标题，观察本例校验").click();
  await b(dialog(page), "保存本地标题并关闭").click();
  await expect(dialog(page).getByRole("alert")).toContainText("未关闭或提交");
  await expect(
    dialog(page).getByRole("textbox", {
      name: "卡片标题（本地会话）",
      exact: true,
    }),
  ).toBeFocused();
  expect((await read(page)).invalidSeen).toBe(true);
  await b(dialog(page), "填入标题示例（替换本栏）").click();
  await b(dialog(page), "保存本地标题并关闭").click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(b(page, "打开真实Radix对话框")).toBeFocused();
  await expect(page.locator(".tool03-static")).toContainText(
    "整理一张可访问的教学卡片",
  );
});
test("missing trigger restores stable fallback and can restore reopen, explicit external handoff remains external", async ({
  page,
}) => {
  await open(page, 2);
  await launch(page);
  await b(dialog(page), "关闭并移除触发器").click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(b(page, "打开真实Radix对话框")).toHaveCount(0);
  await expect(b(page, "稳定入口：恢复触发器")).toBeFocused();
  expect((await read(page)).fallbackSeen).toBe(true);
  await b(page, "稳定入口：恢复触发器").click();
  await launch(page);
  await b(dialog(page), "关闭并前往外部说明").click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(b(page, "外部说明入口")).toBeFocused();
  expect((await read(page)).returnSeen).toBe(false);
});
test("actual outside pointer cancels without submitting, closed content and background locks disappear", async ({
  page,
}) => {
  await open(page);
  await launch(page);
  await dialog(page)
    .getByRole("textbox", { name: "卡片标题（本地会话）", exact: true })
    .fill("外点不保存");
  await page.mouse.click(2, 2);
  await expect(dialog(page)).toHaveCount(0);
  await expect(b(page, "打开真实Radix对话框")).toBeFocused();
  await expect(page.locator(".tool03-static")).not.toContainText("外点不保存");
  await expect(page.locator(".tool03-overlay")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.pointerEvents)).toBe("");
});
test("real modal leave route unmount cannot steal the next lesson heading or subsequent Tab focus", async ({
  page,
}) => {
  await open(page, 2);
  await launch(page);
  await b(dialog(page), "关闭并离开T03复习T02").click();
  await expect(page.locator("#tool02-stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const before = await page.evaluate(() => document.activeElement.outerHTML);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    before,
  );
  await expect(page.locator(".tool03-dialog")).toHaveCount(0);
  await expect(page.locator(".tool03-overlay")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.pointerEvents)).toBe("");
});
test("light and dark open dialogs axe and short375 long content retain controls and can close", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await open(page, 1);
  for (const theme of ["light", "ink"]) {
    await launch(page);
    await dialog(page)
      .getByLabel("面板内主题", { exact: true })
      .selectOption(theme);
    await dialog(page)
      .getByRole("checkbox", { name: "面板内长说明", exact: true })
      .check();
    await axes(page);
    if (info.project.name === "mobile") {
      const panel = dialog(page),
        r = await panel.boundingBox();
      const before = await panel.evaluate((e) => e.scrollTop);
      const outer = await page.evaluate(() => scrollY);
      const cd = await page.context().newCDPSession(page);
      const x = r.x + 8,
        y0 = r.y + r.height - 36,
        y1 = r.y + 36;
      await cd.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y: y0 }],
      });
      for (let i = 1; i <= 10; i++) {
        await cd.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 10 }],
        });
        await page.waitForTimeout(20);
      }
      await cd.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect
        .poll(() => panel.evaluate((e) => e.scrollTop))
        .toBeGreaterThan(before + 50);
      expect(await page.evaluate(() => scrollY)).toBe(outer);
      await cd.detach();
    }
    await dialog(page).screenshot({
      path: `${out}/${info.project.name}-short-${theme}-dialog.png`,
    });
    await b(dialog(page), "取消本地编辑").click();
    await expect(b(page, "打开真实Radix对话框")).toBeFocused();
  }
});
async function holdCloseFixture(p) {
  await p.addInitScript(() => {
    window.tool03Timers = [];
    const real = setTimeout.bind(window);
    window.setTimeout = (cb, delay, ...args) =>
      window.holdTool03 && delay === 0
        ? (window.tool03Timers.push(() => cb(...args)),
          900000 + window.tool03Timers.length)
        : real(cb, delay, ...args);
  });
}
test("delayed close callback cannot steal real Tab focus already moved outside or award trigger-return observation", async ({
  page,
}, info) => {
  await holdCloseFixture(page);
  await open(page);
  await launch(page);
  await page.evaluate(() => (window.holdTool03 = true));
  await b(dialog(page), "关闭对话框").click();
  await expect(dialog(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.tool03Timers.length)).toBeGreaterThan(
    0,
  );
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool03-close-external",
      profile: info.project.name,
    });
  await k.seek(
    b(page, "外部说明入口"),
    "real Tab external before delayed close",
  );
  await page.evaluate(() => {
    window.holdTool03 = false;
    window.tool03Timers.splice(0).forEach((cb) => cb());
  });
  await expect(b(page, "外部说明入口")).toBeFocused();
  expect((await read(page)).returnSeen).toBe(false);
  writeFileSync(
    `${out}/${info.project.name}-late-close-external.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("old close generation cannot steal reopened dialog focus or break its later native cycle", async ({
  page,
}, info) => {
  await holdCloseFixture(page);
  await open(page);
  await launch(page);
  await page.evaluate(() => (window.holdTool03 = true));
  await b(dialog(page), "关闭对话框").click();
  await expect(dialog(page)).toHaveCount(0);
  await page.evaluate(() => (window.holdTool03 = false));
  await launch(page);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool03-reopen",
      profile: info.project.name,
    }),
    field = dialog(page).getByRole("textbox", {
      name: "卡片标题（本地会话）",
      exact: true,
    });
  await k.seek(field, "new dialog field");
  await page.evaluate(() =>
    window.tool03Timers.splice(0).forEach((cb) => cb()),
  );
  await expect(field).toBeFocused();
  await expect(dialog(page)).toHaveCount(1);
  await k.seek(b(dialog(page), "关闭对话框"), "new first close");
  await page.keyboard.press("Shift+Tab");
  await expect(b(dialog(page), "关闭并离开T03复习T02")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(b(page, "打开真实Radix对话框")).toBeFocused();
  writeFileSync(
    `${out}/${info.project.name}-late-reopen.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("delayed close callback after route unmount cannot refocus old nodes or the next lesson", async ({
  page,
}) => {
  await holdCloseFixture(page);
  await open(page);
  await launch(page);
  await page.evaluate(() => (window.holdTool03 = true));
  await b(dialog(page), "关闭对话框").click();
  await expect(dialog(page)).toHaveCount(0);
  await page.evaluate(() => (window.holdTool03 = false));
  await b(page, "返回T02复习").click();
  await expect(page.locator("#tool02-stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const before = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() =>
    window.tool03Timers.splice(0).forEach((cb) => cb()),
  );
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    before,
  );
  await expect(
    page.locator(".tool03-dialog,.tool03-overlay,[data-radix-focus-guard]"),
  ).toHaveCount(0);
});
test("rapid repeated open close never duplicates content or leaves background lock and saves only explicit commit", async ({
  page,
}) => {
  await open(page, 2);
  for (let i = 0; i < 5; i++) {
    await launch(page);
    await expect(dialog(page)).toHaveCount(1);
    await dialog(page)
      .getByRole("textbox", { name: "卡片标题（本地会话）", exact: true })
      .fill("取消的编辑" + i);
    if (i % 2) await b(dialog(page), "取消本地编辑").click();
    else await page.keyboard.press("Escape");
    await expect(b(page, "打开真实Radix对话框")).toBeFocused();
    await expect(
      page.locator(".tool03-dialog,.tool03-overlay,[data-radix-focus-guard]"),
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.pointerEvents)).toBe(
      "",
    );
  }
  await expect(page.locator(".tool03-static")).toContainText(
    "整理一张教学卡片",
  );
  expect((await read(page)).savedSeen).toBe(false);
});
test("candidate selection changes explanation only, not actual runtime or guarantees, native fields remain native", async ({
  page,
}) => {
  await open(page);
  await b(page, "Base UI候选").click();
  await expect(page.locator(".tool03-choices")).toContainText(
    "真实实验始终运行Radix",
  );
  await launch(page);
  await expect(dialog(page)).toHaveAccessibleDescription(/真实Radix/);
  await expect(
    dialog(page).getByLabel("面板内主题", { exact: true }),
  ).toHaveJSProperty("tagName", "SELECT");
  await expect(
    dialog(page).getByRole("textbox", {
      name: "卡片标题（本地会话）",
      exact: true,
    }),
  ).toHaveJSProperty("tagName", "INPUT");
  await close(page);
});
test("live reduced motion and missing animation waits preserve real dialog and T02 iframe isolation after leave", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.raf03 = 0;
    const original = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.raf03++;
      return original(cb);
    };
  });
  await open(page, 1);
  await launch(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await dialog(page)
    .getByLabel("面板内主题", { exact: true })
    .selectOption("ink");
  await b(dialog(page), "读取真实语义与Portal位置").click();
  await axes(page);
  const n = await page.evaluate(() => window.raf03);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.raf03)).toBe(n);
  await close(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await b(page, "返回T02复习").click();
  await expect(page.locator("#tool02-stage-heading")).toBeFocused();
  await expect
    .poll(
      async () =>
        JSON.parse(
          await page.locator(".tool02-workbench").getAttribute("data-stats"),
        )?.ready,
    )
    .toBe(true);
  await expect(
    page
      .frameLocator('iframe[title="Tailwind真实编译样例"]')
      .locator(".demo-card")
      .first(),
  ).toHaveCSS("padding-top", "16px");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--surface"),
    ),
  ).toBe("");
});
test("quiz wrong answers explain and allow retry without library-name score", async ({
  page,
}) => {
  await open(page, 3);
  for (let i = 0; i < 3; i++) {
    const f = page.locator(".quiz-grid fieldset").nth(i);
    await f
      .getByRole("button")
      .nth(1 - tool03Questions[i].correct)
      .click();
    await expect(f).toContainText("再想一想");
    await f.getByRole("button").nth(tool03Questions[i].correct).click();
    await expect(f).toContainText(tool03Questions[i].why);
  }
  await b(page, "完成并继续").click();
  await expect(page.locator("#tool03-context")).toBeVisible();
});
test("brief actual editing preserves context, invalidates stale review and requires explicit retain or regenerate", async ({
  page,
}) => {
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  await draft(page).fill(
    (await draft(page).inputValue()) + "\n用户编辑：先复用现有Dialog。",
  );
  const edited = await draft(page).inputValue();
  await page.locator("#tool03-context").fill("用户现状：已有组件，不要重造div");
  await expect(draft(page)).toHaveValue(edited);
  await expect(
    page.getByRole("checkbox", {
      name: "我已核对实际primitive、样式、关闭/焦点与验收边界。",
      exact: true,
    }),
  ).toBeDisabled();
  await b(page, "保留编辑并确认当前实验参数").click();
  await expect(draft(page)).toHaveValue(edited);
  await b(page, "重新生成工具选型草稿").click();
  expect(await draft(page).inputValue()).toContain("用户现状：已有组件");
  expect(await draft(page).inputValue()).not.toContain("用户编辑：");
});
test("clipboard snapshot success and denied manual fallback use real edited draft without automatic sending", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.copy03 = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) => {
          window.copy03.push(t);
          return window.deny03
            ? Promise.reject(Error("denied fixture"))
            : Promise.resolve();
        },
      },
    });
  });
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  await draft(page).fill((await draft(page).inputValue()) + "\n真实编辑");
  const text = await draft(page).inputValue();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.copy03)).toEqual([text]);
  await page.evaluate(() => (window.deny03 = true));
  await b(page, "复制工具选型说明").click();
  await expect(draft(page)).toBeFocused();
  expect(
    await draft(page).evaluate((e) => e.selectionEnd - e.selectionStart),
  ).toBe(text.length);
});
test("old clipboard generations cannot unlock new pending copy or steal external and reset focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.copies03 = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) =>
          new Promise((resolve, reject) =>
            window.copies03.push({ t, resolve, reject }),
          ),
      },
    });
  });
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await st(page, 0).click();
  await st(page, 4).click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.copies03.length)).toBe(2);
  await page.evaluate(() => window.copies03[0].reject(Error("old fixture")));
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.copies03.length)).toBe(2);
  await b(page, "保留编辑并确认当前实验参数").click();
  await page.evaluate(() =>
    window.copies03[1].reject(Error("external fixture")),
  );
  await expect(b(page, "保留编辑并确认当前实验参数")).toBeFocused();
  await b(page, "复制工具选型说明").click();
  await b(page, "重置T03工具专题进度").click();
  await b(page, "确认重置T03工具专题").click();
  await expect(page.locator("#tool03-stage-heading")).toBeFocused();
  await page.evaluate(() => window.copies03[2].resolve());
  await expect(page.locator("#tool03-stage-heading")).toBeFocused();
  expect((await read(page)).generated).toBe(false);
});
test("corrupt unavailable and malformed progress preserves safe modal options and independent defaults", async ({
  page,
}) => {
  await seed(page, {
    step: 999,
    done: [0, 0, 99, -1],
    choice: "fake",
    theme: "url(secret)",
    size: "900vw",
    long: "yes",
    answers: [9, 1, 0],
    context: "x".repeat(900),
    draft: "y".repeat(15000),
    reviewed: true,
  });
  await open(page);
  await launch(page);
  const d = await read(page);
  expect(d).toMatchObject({
    step: 0,
    done: [0],
    choice: "existing",
    theme: "light",
    size: "compact",
    long: false,
    reviewed: false,
  });
  expect(d.context.length).toBe(700);
  expect(d.draft.length).toBe(10000);
  await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
  await close(page);
});
test("storage failure never blocks real primitive controls and is reported honestly", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("frontend-observatory.tool03.v1", "{bad");
    Storage.prototype.setItem = () => {
      throw Error("storage denied fixture");
    };
  });
  await open(page);
  await launch(page);
  await b(dialog(page), "读取真实语义与Portal位置").click();
  await close(page);
  await expect(page.locator(".saved")).toContainText("存储不可用");
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local behavior visual crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    await axes(page);
    await page
      .locator(
        n < 3 ? ".tool03-static" : n === 3 ? ".quiz-grid" : ".agent-grid",
      )
      .screenshot({ path: `${out}/${info.project.name}-station${n + 1}.png` });
    if (n < 3) {
      await launch(page);
      await axes(page);
      await dialog(page).screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-actual-dialog.png`,
      });
      await close(page);
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
];
async function seedPriors(p) {
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
  await act(b(p, "Base UI候选"), "candidate conditions");
  await launch(p, act);
  await act(b(dialog(p), "读取真实语义与Portal位置"), "read actual contract");
  await close(p, act);
  await act(b(p, "完成并继续"), "station0 finish");
  await launch(p, act);
  await select(dialog(p).getByLabel("面板内主题", { exact: true }), "ink");
  await select(dialog(p).getByLabel("面板内尺寸", { exact: true }), "wide");
  await act(b(dialog(p), "读取真实语义与Portal位置"), "read themed portal");
  await act(b(dialog(p), "填入标题示例（替换本栏）"), "field sample");
  await type(
    dialog(p).getByRole("textbox", {
      name: "卡片标题（本地会话）",
      exact: true,
    }),
    " 用户手改",
  );
  await act(b(dialog(p), "保存本地标题并关闭"), "local save");
  await expect(b(p, "打开真实Radix对话框")).toBeFocused();
  await expect(p.locator(".tool03-static")).toContainText("用户手改");
  await act(b(p, "完成并继续"), "station1 finish");
  await launch(p, act);
  await act(b(dialog(p), "清空标题，观察本例校验"), "empty field");
  await act(b(dialog(p), "保存本地标题并关闭"), "invalid local save");
  await expect(dialog(p).getByRole("alert")).toContainText("未关闭或提交");
  await act(b(dialog(p), "填入标题示例（替换本栏）"), "repair sample");
  await act(b(dialog(p), "取消本地编辑"), "cancel");
  await expect(b(p, "打开真实Radix对话框")).toBeFocused();
  await launch(p, act);
  await act(b(dialog(p), "关闭并移除触发器"), "missing trigger");
  await expect(b(p, "稳定入口：恢复触发器")).toBeFocused();
  await act(b(p, "稳定入口：恢复触发器"), "restore trigger");
  await act(b(p, "完成并继续"), "station2 finish");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool03Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool03Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3 finish");
  await act(b(p, "填入项目现状示例（替换本栏）"), "context sample");
  await type(p.locator("#tool03-context"), " 用户补充：先验收现有组件。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(draft(p), "\n用户编辑：保留行为合同。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对实际primitive、样式、关闭/焦点与验收边界。",
      exact: true,
    }),
    "manual review",
  );
  await act(b(p, "完成T03工具专题"), "complete T03");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, keyboard) {
  const before = await read(p);
  await act(b(p, "重置T03工具专题进度"), "reset open cancel");
  if (keyboard) await p.keyboard.press("Escape");
  else await act(b(p, "保留T03工具专题进度"), "cancel reset");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T03工具专题进度")).toBeFocused();
  await act(b(p, "重置T03工具专题进度"), "reset open confirm");
  await act(b(p, "确认重置T03工具专题"), "confirm reset");
  await expect(p.locator("#tool03-stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    context: "",
    draft: "",
  });
}
test("real Tab full five stations primitive contract retry edits copy refresh cancel confirm reset preserves36 stores", async ({
  page,
}, info) => {
  const prior = await seedPriors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool03-full",
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
      await k.seek(l, "actual edit");
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
  test(`zero keyboard touch full ${reducedMotion} primitive close validation retry refresh cancel confirm reset`, async ({
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
      window.keyEvents03 = 0;
      addEventListener("keydown", () => window.keyEvents03++);
    });
    const prior = await seedPriors(p),
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
    expect(await p.evaluate(() => window.keyEvents03)).toBe(0);
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
            "actual taps on primitive/native controls; selectOption/fill value fixtures, not OS picker/IME or physical phone",
        },
        null,
        2,
      ),
    );
    await c.close();
  });
test("T02 exit enters actual T03, six tool previews remain readonly without invented37", async ({
  page,
}) => {
  await open(page);
  await b(page, "返回T02复习").click();
  await b(page, "继续T03 · Radix / Base UI").click();
  await expect(page.locator("#tool03-stage-heading")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(14);
  await expect(nav.locator(".coverage-preview")).toHaveCount(0);
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator("body")).toContainText("T04 · shadcn/ui");
  await expect(page.locator('[data-lesson-id="37"]')).toHaveCount(0);
});
