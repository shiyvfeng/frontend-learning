import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8"),
  key = "frontend-observatory.lesson10.v1",
  priorKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (n) => `frontend-observatory.lesson${n}.v1`,
  ),
  out = "/tmp/mask-acceptance";
async function course(page, n) {
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "☰ 课程" }).click();
  await nav.getByRole("button").nth(n).click();
}
async function open(page) {
  await page.goto("/");
  await course(page, 9);
  await expect(page.locator("#mask-stage-heading")).toBeVisible();
}
const choice = (page, label, value) =>
  page
    .getByRole("group", { name: label, exact: true })
    .getByRole("button", { name: value, exact: true });
const choose = (page, label, value) => choice(page, label, value).click();
const step = (page, n) =>
  page
    .getByRole("navigation", { name: "第十节学习步骤" })
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

async function firstThree(page) {
  await choose(page, "视觉处理方式", "clip-path · 几何");
  await choose(page, "显示范围参数", "35%");
  await choose(page, "视觉处理方式", "mask · 透明");
  await page.getByRole("button", { name: "检查素材节点与占位" }).click();
  await next(page);
  await page.getByRole("button", { name: "测量命中与焦点" }).click();
  await expect(page.getByTestId("hit-result")).toContainText("B 命中：底层");
  await choose(page, "命中实验样式", "mask · 透明");
  await page.getByRole("button", { name: "测量命中与焦点" }).click();
  await expect(page.getByTestId("hit-result")).toContainText("B 命中：素材层");
  await next(page);
  await page.getByLabel("模拟所选效果不受支持").check();
  await page.locator(".mask-full-details summary").click();
  await expect(page.getByTestId("full-art")).toBeVisible();
  await page.getByRole("button", { name: "切换查看状态" }).click();
  await next(page);
}
async function quiz(page) {
  for (const [i, v] of [0, 1, 0].entries())
    await page.locator(".quiz-card").nth(i).getByRole("button").nth(v).click();
  await next(page);
}
test("tenth available fourteenth planned and lesson module loads on demand", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-ten-.*\.js/.test(u))).toBe(false);
  await course(page, 9);
  await expect(page.locator("#mask-stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-ten-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Mask/Clip Path · 前端观察室");
  await expect(
    page.getByRole("heading", { name: "Mask / Clip Path." }),
  ).toBeVisible();
  await expect(page.locator(".available-dot")).toHaveCount(13);
  await expect(page.locator(".site-footer")).toContainText("01–13");
  await course(page, 13);
  await expect(
    page.getByRole("heading", { name: "条件渲染", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toHaveText("尚未制作");
});
test("same SVG node and reference box survive real clip shapes mask and range changes", async ({
  page,
}) => {
  await open(page);
  const material = page.getByTestId("boundary-material"),
    svg = await material.locator("svg").elementHandle(),
    before = await material.boundingBox();
  await choose(page, "显示范围参数", "35%");
  expect((await progress(page)).rangeChanged).toBe(false);
  await choose(page, "视觉处理方式", "clip-path · 几何");
  await expect(material).toHaveCSS("clip-path", "inset(0px 65% 0px 0px)");
  for (const [shape, prefix] of [
    ["circle · 圆形", "circle"],
    ["polygon · 斜边", "polygon"],
    ["inset · 直边", "inset"],
  ]) {
    await choose(page, "几何轮廓", shape);
    expect(
      await material.evaluate((e) => getComputedStyle(e).clipPath),
    ).toContain(prefix);
  }
  await choose(page, "显示范围参数", "85%");
  await expect(material).toHaveCSS("clip-path", "inset(0px 15% 0px 0px)");
  await choose(page, "视觉处理方式", "mask · 透明");
  await expect(material).toHaveCSS("clip-path", "none");
  await expect(material).toHaveCSS("mask-image", /^linear-gradient/);
  const rightMask = await material.evaluate(
    (e) => getComputedStyle(e).maskImage,
  );
  await choose(page, "渐隐方向", "向下");
  await expect(material).not.toHaveCSS("mask-image", rightMask);
  await expect(
    page.getByTestId("boundary-reading").locator("code"),
  ).toContainText("to bottom");
  await choose(page, "渐隐方向", "从中心向外");
  await expect(material).toHaveCSS("mask-image", /^radial-gradient/);
  expect(await svg.evaluate((e) => e.isConnected)).toBe(true);
  expect(await material.boundingBox()).toMatchObject({
    width: before.width,
    height: before.height,
  });
  await page.getByRole("button", { name: "检查素材节点与占位" }).click();
  await expect(page.getByTestId("dom-report")).toContainText(
    "原 SVG 节点未替换：是",
  );
  await expect(material).toHaveAccessibleName(/完整素材：太阳、山丘与波纹/);
  await noOverflow(page);
});
test("alpha mask accepts both opaque black and white without claiming luminance", async ({
  page,
}) => {
  await open(page);
  await choose(page, "视觉处理方式", "mask · 透明");
  const material = page.getByTestId("boundary-material");
  await expect(material).toHaveCSS("mask-mode", "alpha");
  await expect(material).toHaveCSS("mask-image", /rgb\(0, 0, 0\)/);
  await choose(page, "alpha 遮罩颜色", "白色不透明");
  await expect(material).toHaveCSS("mask-image", /rgb\(255, 255, 255\)/);
  await expect(page.getByTestId("boundary-reading")).toContainText(
    "黑白不透明区等效",
  );
  await step(page, 2);
  await expect(page.locator(".flex-note")).toContainText(
    "本课不演示 luminance",
  );
  await noOverflow(page);
});
test("actual hit test distinguishes clipped region from transparent mask and immediately returns probe focus", async ({
  page,
}) => {
  await open(page);
  await step(page, 1);
  const measure = page.getByRole("button", { name: "测量命中与焦点" }),
    result = page.getByTestId("hit-result"),
    probe = page.getByTestId("focus-probe");
  for (const [mode, b] of [
    ["clip-path · 几何", "底层"],
    ["mask · 透明", "素材层"],
    ["完整素材", "素材层"],
    ["clip-path · 几何", "底层"],
  ]) {
    await choose(page, "命中实验样式", mode);
    await measure.click();
    await expect(result).toContainText("A 命中：素材层");
    await expect(result).toContainText("B 命中：" + b);
    await expect(result).toContainText("探针可程序性聚焦：是");
    await expect(result).toContainText("焦点已返回可见测量按钮：是");
    await expect(measure).toBeFocused();
    expect(
      await measure.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return r.top >= 68 && r.bottom <= innerHeight;
      }),
    ).toBe(true);
    const board = page.getByTestId("hit-board"),
      r = await board.boundingBox();
    await board.click({ position: { x: r.width * 0.88, y: r.height * 0.5 } });
    await expect(page.locator(".mask-pointer-reading")).toContainText(
      "这次指针命中：" + b,
    );
  }
  await expect(probe).toHaveAttribute("tabindex", "-1");
  await measure.click();
  await page.keyboard.press("Tab");
  await expect(probe).not.toBeFocused();
  expect((await progress(page)).clipMeasured).toBe(true);
  expect((await progress(page)).maskMeasured).toBe(true);
  expect((await progress(page)).focusVerified).toBe(true);
  await axeCheck(page);
});
test("missing clip and both mask capabilities display full fallback and still allow learning tasks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = (a, b) =>
      ["clip-path", "mask-image", "-webkit-mask-image"].includes(a)
        ? false
        : original(a, b);
  });
  await open(page);
  await choose(page, "视觉处理方式", "clip-path · 几何");
  await expect(page.getByTestId("boundary-material")).toHaveCSS(
    "clip-path",
    "none",
  );
  await expect(page.getByTestId("boundary-reading")).toContainText("完整显示");
  await choose(page, "视觉处理方式", "mask · 透明");
  await expect(page.getByTestId("boundary-material")).toHaveCSS(
    "mask-image",
    "none",
  );
  await step(page, 1);
  for (const mode of ["clip-path · 几何", "mask · 透明"]) {
    await choose(page, "命中实验样式", mode);
    await page.getByRole("button", { name: "测量命中与焦点" }).click();
    await expect(page.getByTestId("hit-result")).toContainText("完整显示回退");
    await expect(page.getByTestId("hit-result")).toContainText(
      "B 命中：素材层",
    );
  }
  expect((await progress(page)).clipMeasured).toBe(true);
  expect((await progress(page)).maskMeasured).toBe(true);
  await step(page, 2);
  await expect(page.getByTestId("fallback-reading")).toContainText(
    "无支持回退",
  );
  await axeCheck(page);
});
test("WebKit-only mask capability is recognized and safe primary actions stay outside the effect", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = (a, b) =>
      a === "mask-image"
        ? false
        : a === "-webkit-mask-image"
          ? true
          : original(a, b);
  });
  await open(page);
  await choose(page, "视觉处理方式", "mask · 透明");
  await expect(page.getByTestId("boundary-material")).not.toHaveCSS(
    "mask-image",
    "none",
  );
  await step(page, 2);
  const action = page.getByRole("button", { name: "切换查看状态" });
  for (let i = 0; i < 3; i++) {
    await page.getByLabel("模拟所选效果不受支持").check();
    await expect(page.getByTestId("safe-material")).toHaveCSS(
      "mask-image",
      "none",
    );
    await action.click();
    await expect(action).toHaveAttribute(
      "aria-pressed",
      i % 2 === 0 ? "true" : "false",
    );
    await page.getByLabel("模拟所选效果不受支持").uncheck();
    await expect(page.getByTestId("safe-material")).not.toHaveCSS(
      "mask-image",
      "none",
    );
  }
  expect(
    await action.evaluate(
      (e) => e.closest("[data-intentional-visual]") === null,
    ),
  ).toBe(true);
  await page.locator(".mask-full-details summary").click();
  await expect(page.getByTestId("full-art")).toBeVisible();
  expect((await progress(page)).fullSeen).toBe(true);
  await expect(page.getByTestId("full-art")).toHaveCSS("mask-image", "none");
  await page.locator(".mask-full-details summary").click();
  await expect(page.getByTestId("full-art")).not.toBeVisible();
  await noOverflow(page);
});
test("effects are static and primary focus remains visible under reduced motion and forced colors", async ({
  page,
}) => {
  await open(page);
  for (const pref of ["no-preference", "reduce"]) {
    await page.emulateMedia({ reducedMotion: pref });
    for (let i = 0; i < 3; i++) {
      await step(page, i);
      expect(
        await page
          .locator(".mask-lab")
          .evaluateAll(
            (es) =>
              es.flatMap((e) => e.getAnimations({ subtree: true })).length,
          ),
      ).toBe(0);
      await noOverflow(page);
    }
  }
  const action = page.getByRole("button", { name: "切换查看状态" });
  await action.click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(action).toBeFocused();
  await expect(action).toHaveCSS("outline-width", "3px");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(action).not.toHaveCSS("outline-style", "none");
  await expect(page.locator(".mask-state")).toContainText("✓ 已查看");
});
test("quiz has wrong feedback reasons retry and gated progress", async ({
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
    "不改变 CSS 盒",
  );
  await next(page);
  await expect(page.locator(".notice")).toContainText("先完成");
  await quiz(page);
  await expect(page.locator(".lesson-ten .lesson-bottom")).toContainText(
    "1 / 5",
  );
});
test("two editable instructions bind intended shape fade hit focus and fallback, with honest copy paths", async ({
  page,
}) => {
  await open(page);
  await choose(page, "视觉处理方式", "clip-path · 几何");
  await choose(page, "几何轮廓", "circle · 圆形");
  await choose(page, "显示范围参数", "35%");
  await step(page, 4);
  const draft = page.getByLabel("可编辑的 裁切 Agent 指令");
  await page.getByRole("button", { name: "生成裁切指令" }).click();
  await expect(draft).toHaveValue(
    /clip-path: circle\(17.5%.*视觉合同|视觉合同.*clip-path: circle\(17.5%/s,
  );
  await expect(draft).toHaveValue(/结构与语义.*交互合同.*兼容回退/s);
  await step(page, 2);
  await choose(page, "安全卡片效果", "mask · 渐隐");
  await choose(page, "安全卡片范围", "85%");
  await choose(page, "安全卡片渐隐方向", "向下");
  await step(page, 4);
  await page.getByLabel("实现场景").selectOption("card");
  await page.getByRole("button", { name: "重新生成裁切草稿" }).click();
  await expect(draft).toHaveValue(
    /可操作卡片.*linear-gradient\(to bottom.*transparent 85%/s,
  );
  await page.getByLabel("我已检查轮廓、渐隐、命中、焦点和回退。").check();
  await draft.fill((await draft.inputValue()) + "\n保留完整信息。");
  await expect(
    page.getByLabel("我已检查轮廓、渐隐、命中、焦点和回退。"),
  ).not.toBeChecked();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.maskCopied = t) },
    }),
  );
  await page.getByRole("button", { name: "复制裁切指令" }).click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.maskCopied)).toContain(
    "保留完整信息",
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
    await page.getByRole("button", { name: "复制裁切指令" }).click();
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
  await page.getByRole("button", { name: "生成裁切指令" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r) => (window.resolveMaskCopy = r)),
      },
    }),
  );
  await page.getByRole("button", { name: "复制裁切指令" }).click();
  await page.getByRole("button", { name: "重置第十节进度" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("可编辑的 裁切 Agent 指令")).not.toHaveValue("");
  await page.getByRole("button", { name: "重置第十节进度" }).click();
  await page.getByRole("button", { name: "确认重置第十节" }).click();
  await page.evaluate(() => window.resolveMaskCopy());
  await step(page, 4);
  await expect(page.getByLabel("可编辑的 裁切 Agent 指令")).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText("已复制");
});
test("corrupt progress sanitizes and full completion is stable; blocked storage is reported", async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          mode: "bad",
          extent: 999,
          shape: "bad",
          done: [99, null],
          answers: "bad",
        }),
      );
      sessionStorage.setItem("seed", "1");
    }
  }, key);
  await open(page);
  await expect(page.getByTestId("boundary-material")).toHaveCSS(
    "clip-path",
    "none",
  );
  await firstThree(page);
  await quiz(page);
  await page.getByRole("button", { name: "生成裁切指令" }).click();
  await page.getByLabel("我已检查轮廓、渐隐、命中、焦点和回退。").check();
  await page
    .getByRole("button", { name: "完成第十节" })
    .click({ clickCount: 2 });
  await expect(page.locator(".lesson-ten .lesson-bottom")).toContainText(
    "5 / 5",
  );
  expect((await progress(page)).done.sort()).toEqual([0, 1, 2, 3, 4]);
  await expect(page.locator(".notice")).toContainText("可以从课程目录继续 11");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("unavailable");
    };
  });
  await page.reload();
  await course(page, 9);
  await expect(page.locator(".saved")).toContainText("浏览器存储不可用");
});
test("each station measured probe and safe full content pass axe and no page overflow", async ({
  page,
}) => {
  await open(page);
  for (const mode of ["完整素材", "clip-path · 几何", "mask · 透明"]) {
    await choose(page, "视觉处理方式", mode);
    await axeCheck(page);
  }
  for (let i = 0; i < 5; i++) {
    await step(page, i);
    await expect(page.locator("#mask-stage-heading")).toBeFocused();
    await axeCheck(page);
    await noOverflow(page);
  }
  await step(page, 1);
  await page.getByRole("button", { name: "测量命中与焦点" }).click();
  await axeCheck(page);
  await step(page, 2);
  await page.locator(".mask-full-details summary").click();
  await axeCheck(page);
  await page.getByText("第十节核对说明与官方来源", { exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "CSSWG：裁切、遮罩与命中标准 ↗",
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
  }
  const pick = (label, value) =>
      act(choice(page, label, value), label + " -> " + value),
    advance = () =>
      act(page.getByRole("button", { name: "完成并继续" }), "next");
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) await directory(n);
  const before = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    priorKeys,
  );
  await directory(9);
  await act(
    page.getByRole("button", { name: "完成并继续" }),
    "blocked before tasks",
  );
  await expect(page.locator(".notice")).toContainText("先完成");
  await pick("视觉处理方式", "clip-path · 几何");
  await pick("显示范围参数", "35%");
  await pick("视觉处理方式", "mask · 透明");
  await act(
    page.getByRole("button", { name: "检查素材节点与占位" }),
    "inspect same node",
  );
  await expect(page.getByTestId("dom-report")).toContainText(
    "原 SVG 节点未替换：是",
  );
  await advance();
  await act(
    page.getByRole("button", { name: "测量命中与焦点" }),
    "measure clip and focus",
  );
  await expect(page.getByTestId("hit-result")).toContainText("B 命中：底层");
  await pick("命中实验样式", "mask · 透明");
  await act(
    page.getByRole("button", { name: "测量命中与焦点" }),
    "measure mask and focus",
  );
  await expect(page.getByTestId("hit-result")).toContainText("B 命中：素材层");
  await advance();
  await toggle(
    page.getByLabel("模拟所选效果不受支持"),
    "force readable fallback",
  );
  await expect(page.getByTestId("safe-material")).toHaveCSS(
    "mask-image",
    "none",
  );
  await act(page.locator(".mask-full-details summary"), "show full source");
  await expect(page.getByTestId("full-art")).toBeVisible();
  await act(
    page.getByRole("button", { name: "切换查看状态" }),
    "external visible action",
  );
  await advance();
  const cards = page.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(1), "wrong answer");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [0, 1, 0].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry/correct " + i);
  await advance();
  await act(page.getByRole("button", { name: "生成裁切指令" }), "generate");
  const draft = page.getByLabel("可编辑的 裁切 Agent 指令");
  await expect(draft).toHaveValue(/视觉合同.*结构与语义.*交互合同.*兼容回退/s);
  if (edit) await edit(draft);
  await act(
    page.getByRole("button", { name: "复制裁切指令" }),
    "copy fallback",
  );
  await expect(page.locator(".copy-feedback")).toContainText("自动复制不可用");
  await expect(draft).toBeFocused();
  await toggle(
    page.getByLabel("我已检查轮廓、渐隐、命中、焦点和回退。"),
    "review",
  );
  await act(page.getByRole("button", { name: "完成第十节" }), "finish");
  await expect(page.locator(".lesson-ten .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const completed = await progress(page),
    keysBeforeReload = await page.evaluate(() => window.maskKeys ?? null);
  await page.reload();
  await directory(9);
  await expect(page.locator(".lesson-ten .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await expect(draft).not.toHaveValue("");
  await act(page.getByRole("button", { name: "重置第十节进度" }), "open reset");
  await act(
    page.getByRole("button", { name: "保留第十节进度" }),
    "cancel reset",
  );
  await expect(page.locator(".lesson-ten .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await act(
    page.getByRole("button", { name: "重置第十节进度" }),
    "reopen reset",
  );
  await act(
    page.getByRole("button", { name: "确认重置第十节" }),
    "confirm reset",
  );
  await expect(page.locator(".lesson-ten .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(page.locator("#mask-stage-heading")).toBeFocused();
  expect(
    await page.evaluate(
      (keys) => keys.map((k) => localStorage.getItem(k)),
      priorKeys,
    ),
  ).toEqual(before);
  const reset = await progress(page);
  expect(reset.done).toEqual([]);
  expect(reset.forceFallback).toBe(false);
  expect(reset.marked).toBe(false);
  expect(reset.focusVerified).toBe(false);
  expect(reset.draft).toBe("");
  await axeCheck(page);
  await noOverflow(page);
  return {
    completed,
    reset,
    priorStoresUnchanged: true,
    keysBeforeReload,
    keysAfterReload: await page.evaluate(() => window.maskKeys ?? null),
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
test("complete keyboard-only mask experiments retry edit refresh and cancel/confirm reset", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const trace = [];
  await page.addInitScript(denyClipboard);
  await page.goto("/");
  async function seek(locator, name) {
    await expect(locator).toBeEnabled();
    for (let n = 0; n < 240; n++) {
      if (await locator.evaluate((e) => e === document.activeElement)) {
        const state = await locator.evaluate((e) => {
          const r = e.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
          return {
            outline: getComputedStyle(e).outlineStyle,
            visible: r.top >= 0 && r.bottom <= innerHeight + 1,
            covered: hit !== e && !e.contains(hit),
          };
        });
        expect(state.outline).not.toBe("none");
        expect(state.visible).toBe(true);
        expect(state.covered).toBe(false);
        trace.push({ name, tabs: n, ...state });
        return;
      }
      await page.keyboard.press("Tab");
    }
    throw Error("Unreachable " + name);
  }
  const act = async (locator, name) => {
      await seek(locator, name);
      await page.keyboard.press("Enter");
      trace.push({ enter: name });
    },
    toggle = async (locator, name) => {
      await seek(locator, name);
      await page.keyboard.press("Space");
      trace.push({ space: name });
    };
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
test("zero-keyboard touch-only mask learning retry refresh cancel and confirm reset", async ({
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
    window.maskKeys = [];
    for (const type of ["keydown", "keyup"])
      window.addEventListener(type, (e) => window.maskKeys.push(e.key));
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
