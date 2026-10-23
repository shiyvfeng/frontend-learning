import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL02_STORAGE as KEY,
  tool02Initial,
  tool02Classes,
  tool02Palettes,
  tool02Brief,
  tool02LongTitle,
  tool02Questions,
} from "../src/tool-two-content.js";
const out = "/tmp/tool02-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  step = (p, i) =>
    p
      .getByRole("navigation", { name: "T02工具专题学习步骤" })
      .getByRole("button")
      .nth(i),
  f = (p) => p.frameLocator('iframe[title="Tailwind真实编译样例"]'),
  sel = (p, id, v) => p.locator("#tool02-" + id).selectOption(String(v));
const stats = (p) =>
    p.locator(".tool02-workbench").getAttribute("data-stats").then(JSON.parse),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", { name: "T02 · Tailwind · 可学习", exact: true }),
    "T02",
  );
  await expect(p.locator("#tool02-stage-heading")).toBeVisible();
}
async function open(p, i = 0) {
  await p.goto("/");
  await directory(p);
  if (i) await step(p, i).click();
  if (await p.locator(".tool02-workbench").count())
    await expect.poll(async () => (await stats(p))?.ready).toBe(true);
}
async function observe(p, act = (l) => l.click()) {
  await act(b(p, "读取实际样式并记录观察"), "read CSS");
}
async function seed(p, d) {
  await p.addInitScript(
    ([k, d]) => {
      if (window === window.top) localStorage.setItem(k, JSON.stringify(d));
    },
    [KEY, d],
  );
}
const good = () => ({
  ...tool02Initial(),
  step: 4,
  done: [0, 1, 2, 3],
  context: "现有React + Vite和CSS约定，只为增量组件评估utility。",
});
async function axes(p, frame = false) {
  const scope = frame ? f(p) : p;
  await scope.locator("body").evaluate((_, a) => {
    (0, eval)(a);
  }, axe);
  expect(
    await scope
      .locator("body")
      .evaluate(async () =>
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
    await scope
      .locator("body")
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}

test("actual compiler is pinned, explicit sources and no Preflight, raw CSS stays only in frame", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.devDependencies.tailwindcss).toBe("4.3.3");
  expect(pkg.devDependencies["@tailwindcss/cli"]).toBe("4.3.3");
  const input = readFileSync("src/tool-two-utilities.css", "utf8"),
    output = readFileSync("src/tool-two.generated.css", "utf8");
  expect(input).toContain("source(none)");
  expect(input).toContain("@source inline");
  expect(input).not.toMatch(/@import[^;]*preflight/);
  expect(output).toContain("tailwindcss v4.3.3");
  expect(output).toContain(".p-4");
  expect(output).toContain("@container panel");
  expect(output).toContain("@media");
  expect(output).not.toContain("box-sizing:border-box;border:0");
  expect(readFileSync("src/main.jsx", "utf8")).not.toContain(
    "tool-two.generated.css",
  );
  expect(readFileSync("src/tool-two-lab.jsx", "utf8")).toContain(
    ".generated.css?raw",
  );
});
test("utility maps and brief separate shared tokens, mutually exclusive variants, generated CSS and business semantics", () => {
  const d = tool02Initial(),
    c = tool02Classes(d);
  expect(c.card.split(" ").filter((x) => /^p-/.test(x))).toEqual(["p-4"]);
  expect(tool02Classes({ ...d, density: "roomy" }).card).toContain("p-6");
  expect(c.button).toContain("bg-brand");
  expect(tool02Classes({ ...d, variant: "outline" }).button).not.toMatch(
    /(?:^| )bg-brand(?: |$)/,
  );
  const raw = "现状：先不要迁移。\n不要把任意值当规范。";
  const text = tool02Brief({ ...d, context: raw });
  expect(text).toContain(raw);
  for (const t of [
    "不是自动生成的设计系统",
    "不导入Preflight",
    "构建期",
    "不能仅靠颜色",
    "T12仍为预告",
  ])
    expect(text).toContain(t);
});
test("computed spacing colors and CSSOM rules come from real utilities, not expected-number labels", async ({
  page,
}) => {
  await open(page);
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "padding-top",
    "16px",
  );
  await sel(page, "density", "roomy");
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "padding-top",
    "24px",
  );
  await sel(page, "unit", 6);
  for (const c of await f(page).locator(".demo-card").all())
    await expect(c).toHaveCSS("padding-top", "36px");
  await sel(page, "palette", "forest");
  await expect(f(page).locator(".demo-action").first()).toHaveCSS(
    "background-color",
    "rgb(23, 107, 90)",
  );
  await observe(page);
  const s = await stats(page);
  expect(s.secondPadding).toBe("36px");
  expect(s.compiledRules).toContain("padding");
  expect(s.compiledRules).toContain("--spacing");
  expect(s.compiledRules).toContain("@container panel");
  await sel(page, "query", "viewport");
  await observe(page);
  expect((await stats(page)).compiledRules).toContain("@media");
  expect(s.overflow).toBe(false);
});
test("real iframe viewport and independent container queries trigger on their own dimensions including narrow bounds", async ({
  page,
}) => {
  await open(page, 1);
  await sel(page, "frame", "compact");
  await sel(page, "query", "container");
  await sel(page, "panel", 100);
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "flex-direction",
    "row",
  );
  const before = await stats(page);
  await sel(page, "panel", 55);
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "flex-direction",
    "column",
  );
  const after = await stats(page);
  expect(after.viewport).toBe(before.viewport);
  expect(after.panel).toBeLessThan(before.panel);
  await sel(page, "query", "viewport");
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "flex-direction",
    "column",
  );
  await sel(page, "frame", "full");
  const s = await stats(page);
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "flex-direction",
    s.media ? "row" : "column",
  );
  expect(s.outerViewport).toBe(await page.evaluate(() => innerWidth));
  await observe(page);
  expect((await read(page)).viewportSeen).toBe(true);
});
test("native buttons keep independent state, disabled cannot activate, alternative uses same guard, long title remains readable", async ({
  page,
}) => {
  await open(page, 2);
  const a = f(page).getByRole("button", {
      name: "选择第1张教学卡片",
      exact: true,
    }),
    other = f(page).getByRole("button", {
      name: "选择第2张教学卡片",
      exact: true,
    });
  await a.click();
  await other.click();
  await expect(f(page).locator('[data-demo-count="0"]')).toContainText("1");
  await expect(f(page).locator('[data-demo-count="1"]')).toContainText("1");
  await page
    .getByRole("checkbox", {
      name: "第一张原生disabled（第二张仍可用）",
      exact: true,
    })
    .check();
  await expect(a).toBeDisabled();
  await a.click({ force: true });
  await expect(f(page).locator('[data-demo-count="0"]')).toContainText("1");
  await b(page, "同模型操作第一张（含禁用守卫）").click();
  await expect(page.locator(".tool02-feedback")).toContainText("未增加");
  await other.click();
  await expect(f(page).locator('[data-demo-count="1"]')).toContainText("2");
  await b(page, "填入长标题示例（替换本栏）").click();
  await page.locator("#tool02-title").fill(tool02LongTitle + "用户手改");
  await sel(page, "panel", 55);
  await observe(page);
  expect((await read(page)).longSeen).toBe(true);
  expect((await stats(page)).overflow).toBe(false);
});
test("real Tab enters iframe buttons with visible focus, activates independent state and exits without hidden targets", async ({
  page,
}, info) => {
  await open(page, 2);
  await sel(page, "frame", "compact");
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool02-frame",
      profile: info.project.name,
    }),
    a = f(page).getByRole("button", { name: "选择第1张教学卡片", exact: true }),
    other = f(page).getByRole("button", {
      name: "选择第2张教学卡片",
      exact: true,
    });
  await k.act(a, "first native frame button");
  await expect(a).toBeFocused();
  await expect(a).toHaveCSS("outline-style", "solid");
  await expect(f(page).locator('[data-demo-count="0"]')).toContainText("1");
  await k.act(other, "second native frame button");
  await expect(f(page).locator('[data-demo-count="1"]')).toContainText("1");
  await k.seek(
    page.getByText("查看当前完整类名组合（无需记忆）", { exact: true }),
    "leave iframe",
  );
  const rect = await page
    .getByText("查看当前完整类名组合（无需记忆）", { exact: true })
    .boundingBox();
  expect(rect.y).toBeGreaterThanOrEqual(0);
  writeFileSync(
    `${out}/${info.project.name}-iframe-keyboard.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("shared token updates both while local variant changes only first and palette contrast is deliberate", async ({
  page,
}) => {
  await open(page, 2);
  await sel(page, "palette", "amber");
  const a = f(page).locator(".demo-action").first(),
    other = f(page).locator(".demo-action").nth(1);
  await expect(a).toHaveCSS("background-color", "rgb(152, 80, 12)");
  await expect(other).toHaveCSS("color", "rgb(152, 80, 12)");
  const otherClasses = await other.getAttribute("class");
  await sel(page, "variant", "outline");
  await expect(a).toHaveCSS("color", "rgb(152, 80, 12)");
  await expect(a).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(await other.getAttribute("class")).toBe(otherClasses);
  await sel(page, "unit", 6);
  await expect(f(page).locator(".demo-card").nth(1)).toHaveCSS(
    "padding-top",
    "24px",
  );
  const lum = (hex) => {
    const a = hex
      .match(/[a-f0-9]{2}/gi)
      .map((x) => parseInt(x, 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  for (const p of tool02Palettes) {
    expect(1.05 / (lum(p.brand) + 0.05)).toBeGreaterThanOrEqual(4.5);
    expect(1.05 / (lum(p.deep) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
test("hover and keyboard focus use actual compiled pseudo selectors, disabled has honest colors", async ({
  page,
}, info) => {
  await open(page, 2);
  const a = f(page).locator(".demo-action").first();
  if (info.project.name === "desktop") {
    await a.hover();
    await expect(a).toHaveCSS("background-color", "rgb(64, 49, 126)");
    await page.mouse.move(0, 0);
  }
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool02-focus",
      profile: info.project.name,
    });
  await k.seek(a, "native focus");
  await expect(a).toHaveCSS("outline-style", "solid");
  await expect(a).toHaveCSS("outline-width", "2px");
  await page
    .getByRole("checkbox", {
      name: "第一张原生disabled（第二张仍可用）",
      exact: true,
    })
    .check();
  await expect(a).toBeDisabled();
  await expect(a).toHaveCSS("background-color", "rgb(236, 232, 248)");
  await expect(a).toHaveCSS("color", "rgb(81, 73, 95)");
});
test("raw generated CSS and runtime tokens never enter parent styles or alter earlier lesson layout", async ({
  page,
}) => {
  await page.goto("/");
  const sample = () =>
    page.evaluate(() => {
      const h = document.querySelector("h1"),
        c = getComputedStyle(h),
        body = getComputedStyle(document.body);
      return {
        font: c.fontSize,
        color: c.color,
        margin: c.margin,
        line: c.lineHeight,
        bodyFont: body.fontFamily,
        parentBrand: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--color-brand"),
        parentSpace: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--spacing"),
      };
    });
  const before = await sample();
  await directory(page);
  await expect.poll(async () => (await stats(page))?.ready).toBe(true);
  await sel(page, "unit", 6);
  await sel(page, "palette", "forest");
  expect(await page.locator("#tool02-compiled").count()).toBe(0);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--spacing"),
    ),
  ).toBe(before.parentSpace);
  expect(
    await f(page)
      .locator("html")
      .evaluate((e) =>
        getComputedStyle(e).getPropertyValue("--spacing").trim(),
      ),
  ).toBe("6px");
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await nav.getByRole("button").first().click();
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(await sample()).toEqual(before);
});
test("rapid configuration and resize use latest values, remain bounded, missing observer keeps explicit controls usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.ResizeObserver = undefined;
  });
  await open(page, 1);
  for (const value of ["roomy", "compact", "roomy"])
    await sel(page, "density", value);
  await sel(page, "unit", 6);
  await page.setViewportSize({ width: 375, height: 480 });
  await sel(page, "frame", "compact");
  await sel(page, "panel", 55);
  await sel(page, "query", "container");
  await observe(page);
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "padding-top",
    "36px",
  );
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "flex-direction",
    "column",
  );
  expect((await stats(page)).overflow).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("missing compiled sheet provides explicit static fallback without marking actual sample verified", async ({
  page,
}) => {
  await open(page);
  await f(page)
    .locator("body")
    .evaluate(() => document.querySelector("#tool02-compiled").remove());
  await observe(page);
  await expect(
    page.locator(".tool02-boundary").filter({ hasText: "编译样式没有生效" }),
  ).toBeVisible();
  expect((await read(page)).sampleSeen).toBe(false);
  await b(page, "阅读静态回退并记录验收限制").click();
  await b(page, "完成并继续").click();
  expect((await read(page)).done).toEqual([0]);
  expect((await read(page)).fallbackAccepted).toBe(true);
  expect(tool02Brief(await read(page))).toContain("不能把它当成真实编译样式");
});
test("reduce changes live without wait gates and idle or unmounted page schedules no animation loop", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.toolRaf = 0;
    const original = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.toolRaf++;
      return original(cb);
    };
  });
  await open(page, 1);
  await sel(page, "frame", "compact");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await sel(page, "panel", 55);
  await observe(page);
  expect((await read(page)).containerSeen).toBe(true);
  const n = await page.evaluate(() => window.toolRaf);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.toolRaf)).toBe(n);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await b(page, "返回T01复习").click();
  await expect(page.locator("#tool01-stage-heading")).toBeFocused();
  const m = await page.evaluate(() => window.toolRaf);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.toolRaf)).toBe(m);
});
test("leaving a station clears live frame state, recreates clean CSS while preserving learning and chosen token", async ({
  page,
}) => {
  await open(page, 2);
  await sel(page, "palette", "forest");
  await f(page)
    .getByRole("button", { name: "选择第1张教学卡片", exact: true })
    .click();
  expect((await read(page)).firstSeen).toBe(true);
  await step(page, 1).click();
  await expect(f(page).locator('[data-demo-count="0"]')).toContainText("0");
  await expect(f(page).locator(".demo-action").first()).toHaveCSS(
    "background-color",
    "rgb(23, 107, 90)",
  );
  await b(page, "返回T01复习").click();
  await directory(page);
  await expect(f(page).locator('[data-demo-count="0"]')).toContainText("0");
  expect((await read(page)).palette).toBe("forest");
});
test("quiz wrong answers explain and retry, no library-name scoring", async ({
  page,
}) => {
  await open(page, 3);
  for (let i = 0; i < 3; i++) {
    const q = page.locator(".quiz-grid fieldset").nth(i);
    await q
      .getByRole("button")
      .nth(1 - tool02Questions[i].correct)
      .click();
    await expect(q).toContainText("再想一想");
    await q.getByRole("button").nth(tool02Questions[i].correct).click();
    await expect(q).toContainText(tool02Questions[i].why);
  }
  await b(page, "完成并继续").click();
  await expect(page.locator("#tool02-context")).toBeVisible();
});
test("editable context and brief stay independent; upstream marks stale and retain or regenerate is explicit", async ({
  page,
}) => {
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  const d = page.locator("#tool02-agent-draft");
  const original = await d.inputValue();
  await d.fill(original + "\n用户编辑：不要迁移全站。");
  const edited = await d.inputValue();
  await page
    .locator("#tool02-context")
    .fill("现有CSS应保留，增量组件才评估utility");
  await expect(d).toHaveValue(edited);
  await expect(
    page.getByRole("checkbox", {
      name: "我已核对token、变体、响应范围、无障碍与编译边界。",
      exact: true,
    }),
  ).toBeDisabled();
  await b(page, "保留编辑并确认当前实验参数").click();
  await expect(d).toHaveValue(edited);
  await b(page, "重新生成工具选型草稿").click();
  expect(await d.inputValue()).not.toContain("用户编辑：");
  expect(await d.inputValue()).toContain("现有CSS应保留");
});
test("copy actual edited snapshot succeeds, manual denial fallback selects owned draft", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.copied = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) => {
          window.copied.push(t);
          return window.denyCopy
            ? Promise.reject(Error("denied fixture"))
            : Promise.resolve();
        },
      },
    });
  });
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  const d = page.locator("#tool02-agent-draft");
  await d.fill((await d.inputValue()) + "\n我实际编辑的草稿");
  const text = await d.inputValue();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.copied)).toEqual([text]);
  await page.evaluate(() => (window.denyCopy = true));
  await b(page, "复制工具选型说明").click();
  await expect(d).toBeFocused();
  expect(await d.evaluate((e) => e.selectionEnd - e.selectionStart)).toBe(
    text.length,
  );
});
test("async clipboard old generations cannot unlock current copy or steal moved focus across reset", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.copies = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) =>
          new Promise((resolve, reject) =>
            window.copies.push({ t, resolve, reject }),
          ),
      },
    });
  });
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await step(page, 0).click();
  await step(page, 4).click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.copies.length)).toBe(2);
  await page.evaluate(() => window.copies[0].reject(Error("old fixture")));
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.copies.length)).toBe(2);
  await b(page, "保留编辑并确认当前实验参数").click();
  await page.evaluate(() => window.copies[1].reject(Error("external fixture")));
  await expect(b(page, "保留编辑并确认当前实验参数")).toBeFocused();
  await b(page, "复制工具选型说明").click();
  await b(page, "重置T02工具专题进度").click();
  await b(page, "确认重置T02工具专题").click();
  await expect(page.locator("#tool02-stage-heading")).toBeFocused();
  await page.evaluate(() => window.copies[2].resolve());
  await expect(page.locator("#tool02-stage-heading")).toBeFocused();
  expect((await read(page)).generated).toBe(false);
});
test("malformed storage bounded and unknown variants rejected without HTML injection", async ({
  page,
}) => {
  await seed(page, {
    step: 999,
    done: [-1, 0, 0, 4, 9],
    density: "fake",
    palette: "url(secret)",
    unit: 999,
    frameSize: "900vw",
    disabled: "true",
    title: '<button onclick="alert(1)">文本</button>' + "长".repeat(200),
    context: "x".repeat(900),
    draft: "d".repeat(13000),
    reviewed: true,
    variantsSeen: ["solid", "fake", "solid"],
  });
  await open(page);
  const d = await read(page);
  expect(d).toMatchObject({
    step: 0,
    done: [0, 4],
    density: "compact",
    unit: 4,
    frameSize: "full",
    disabled: false,
    reviewed: false,
    variantsSeen: ["solid"],
  });
  expect(d.title.length).toBe(160);
  expect(d.context.length).toBe(700);
  expect(d.draft.length).toBe(10000);
  await expect(f(page).locator("button")).toHaveCount(2);
  await expect(f(page).locator("h3").first()).toContainText("<button");
});
test("unavailable local storage keeps actual CSS and actions usable with honest status", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("storage denied fixture");
    };
  });
  await open(page);
  await sel(page, "density", "roomy");
  await observe(page);
  await expect(f(page).locator(".demo-card").first()).toHaveCSS(
    "padding-top",
    "24px",
  );
  await expect(page.locator(".saved")).toContainText("存储不可用");
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} outer and actual iframe axe plus local crops desktop375`, async ({
    page,
  }, info) => {
    await open(page, n);
    await axes(page);
    if (n < 3) {
      await axes(page, true);
      await page
        .locator(".tool02-preview")
        .screenshot({
          path: `${out}/${info.project.name}-station${n + 1}-preview.png`,
        });
      await page
        .locator(".tool02-readout")
        .screenshot({
          path: `${out}/${info.project.name}-station${n + 1}-readout.png`,
        });
    } else
      await page
        .locator(n === 3 ? ".quiz-grid" : ".agent-grid")
        .screenshot({
          path: `${out}/${info.project.name}-station${n + 1}.png`,
        });
  });
const priorKeys = [
  ...Array.from(
    { length: 32 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  "frontend-observatory.stageA.v1",
  "frontend-observatory.stageB.v1",
  "frontend-observatory.tool01.v1",
];
async function seedPriors(p) {
  await p.addInitScript((ks) => {
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
async function complete(p, act, select, toggle, type) {
  await select("density", "roomy");
  await select("palette", "forest");
  await observe(p, act);
  await act(b(p, "完成并继续"), "station0 finish");
  await select("query", "viewport");
  await select("frame", "compact");
  await observe(p, act);
  await select("query", "container");
  await select("panel", "55");
  await observe(p, act);
  await act(b(p, "完成并继续"), "station1 finish");
  await select("frame", "full");
  await select("panel", "100");
  await select("density", "compact");
  await select("variant", "outline");
  await act(
    f(p).getByRole("button", { name: "选择第1张教学卡片", exact: true }),
    "native first",
  );
  await act(
    f(p).getByRole("button", { name: "选择第2张教学卡片", exact: true }),
    "native second",
  );
  const disabled = p.getByRole("checkbox", {
    name: "第一张原生disabled（第二张仍可用）",
    exact: true,
  });
  await toggle(disabled, "disable first");
  await act(b(p, "同模型操作第一张（含禁用守卫）"), "disabled guard");
  await expect(
    f(p).getByRole("button", { name: "选择第1张教学卡片", exact: true }),
  ).toBeDisabled();
  await toggle(disabled, "enable first");
  await act(b(p, "填入长标题示例（替换本栏）"), "long example");
  await type(p.locator("#tool02-title"), " 手动编辑");
  await select("panel", "55");
  await observe(p, act);
  await act(b(p, "完成并继续"), "station2 finish");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool02Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool02Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3 finish");
  await act(b(p, "填入项目现状示例（替换本栏）"), "context example");
  await type(p.locator("#tool02-context"), " 用户补充：先复用现有组件约定。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(
    p.locator("#tool02-agent-draft"),
    "\n用户编辑：验收范围明确后再实施。",
  );
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对token、变体、响应范围、无障碍与编译边界。",
      exact: true,
    }),
    "manual review",
  );
  await act(b(p, "完成T02工具专题"), "finish T02");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, keyboard) {
  const before = await read(p);
  await act(b(p, "重置T02工具专题进度"), "reset open cancel");
  if (keyboard) await p.keyboard.press("Escape");
  else await act(b(p, "保留T02工具专题进度"), "cancel reset");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T02工具专题进度")).toBeFocused();
  await act(b(p, "重置T02工具专题进度"), "reset open confirm");
  await act(b(p, "确认重置T02工具专题"), "confirm reset");
  await expect(p.locator("#tool02-stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    done: [],
    step: 0,
    context: "",
    draft: "",
  });
}
test("real Tab full five stations wrong retry real edits copy refresh cancel confirm reset preserves35 stores", async ({
  page,
}, info) => {
  const prior = await seedPriors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool02-full",
      profile: info.project.name,
    });
  await directory(page, k.act);
  const select = async (id, value) => {
    const l = page.locator("#tool02-" + id);
    await k.seek(l, id);
    const vs = await l
      .locator("option")
      .evaluateAll((es) => es.map((e) => e.value));
    await page.keyboard.press("Home");
    for (let i = 0; i < vs.indexOf(value); i++)
      await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(l).toHaveValue(value);
  };
  const type = async (l, t) => {
    await k.seek(l, "edit");
    await page.keyboard.press("End");
    await page.keyboard.type(t);
  };
  await complete(page, k.act, select, k.toggle, type);
  const saved = (await read(page)).draft;
  await page.reload();
  await directory(page, k.act);
  await expect(page.locator("#tool02-agent-draft")).toHaveValue(saved);
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
  test(`zero keyboard touch full ${reducedMotion} wrong retry refresh cancel confirm reset`, async ({
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
      window.keyEvents = 0;
      addEventListener("keydown", () => window.keyEvents++);
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
      (id, v) => sel(p, id, v),
      (l, n) => act(l, n),
      async (l, t) => l.fill((await l.inputValue()) + t),
    );
    const text = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(p.locator("#tool02-agent-draft")).toHaveValue(text);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keyEvents)).toBe(0);
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
            "native taps including iframe buttons; selectOption/fill supply values, not OS picker/IME or physical phone",
        },
        null,
        2,
      ),
    );
    await c.close();
  });
test("held late navigation RAF respects actual Tab focus and cannot steal after iframe unmount", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.frames = [];
    const raf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      window.hold
        ? (window.frames.push(cb), 80000 + window.frames.length)
        : raf(cb);
  });
  await open(page);
  await page.evaluate(() => (window.hold = true));
  await step(page, 1).click();
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool02-late",
      profile: info.project.name,
    }),
    target = page.locator("#tool02-query");
  await k.seek(target, "real Tab after delayed navigation");
  await page.evaluate(() =>
    window.frames.forEach((cb) => cb(performance.now())),
  );
  await expect(target).toBeFocused();
  await page.evaluate(() => (window.hold = false));
  await step(page, 2).click();
  await expect(page.locator("#tool02-stage-heading")).toBeFocused();
  await page.evaluate(() => (window.hold = true));
  await step(page, 0).click();
  await page.evaluate(() => {
    window.oldFrames = [...window.frames];
    window.hold = false;
  });
  await b(page, "返回T01复习").click();
  await expect(page.locator("#tool01-stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const before = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() =>
    window.oldFrames.forEach((cb) => cb(performance.now())),
  );
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    before,
  );
  writeFileSync(
    `${out}/${info.project.name}-late-navigation.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("T01 exit enters actual T02, six remaining modules are readonly and catalog is not numbered36", async ({
  page,
}) => {
  await open(page);
  await b(page, "返回T01复习").click();
  await b(page, "继续T02 · Tailwind").click();
  await expect(page.locator("#tool02-stage-heading")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(13);
  await expect(nav.locator(".coverage-preview")).toHaveCount(1);
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator("body")).toContainText(
    "T03已开放",
  );
  await expect(page.locator('[data-lesson-id="36"]')).toHaveCount(0);
});
test("375px short viewport long editor retains visible true keyboard focus and no clipping", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await seed(page, good());
  await open(page);
  await page
    .locator("#tool02-context")
    .fill("长约定：品牌、间距、语义、状态与验收。".repeat(25));
  await b(page, "生成工具选型说明").click();
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool02-short",
      profile: info.project.name,
    });
  await k.seek(page.locator("#tool02-agent-draft"), "long editable brief");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  writeFileSync(
    `${out}/${info.project.name}-short-editor.json`,
    JSON.stringify(trace, null, 2),
  );
});
