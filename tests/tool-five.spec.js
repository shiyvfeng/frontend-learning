import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL05_STORAGE as KEY,
  tool05Initial,
  tool05Brief,
  tool05Questions,
} from "../src/tool-five-content.js";
const out = "/tmp/tool05-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  field = (p, n) => p.locator("#tool05-" + n),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T05工具专题学习步骤" })
      .getByRole("button")
      .nth(n),
  row = (p, id) => p.locator(`.tool05-scene [data-item="${id}"]`),
  note = (p, id) =>
    p.getByRole("textbox", {
      name: id.toUpperCase() + "卡片备注（本地会话）",
      exact: true,
    }),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  draft = (p) => field(p, "agent-draft");
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(b(nav, "T05 · Motion · 可学习"), "T05");
  await expect(field(p, "stage-heading")).toBeVisible();
}
async function open(p, n = 0, ready = true) {
  await p.goto("/");
  await directory(p);
  if (n) await stage(p, n).click();
  if (n < 3 && ready)
    await expect(p.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
}
async function seed(p, d) {
  await p.addInitScript(
    ([k, d]) => {
      if (window === top) localStorage.setItem(k, JSON.stringify(d));
    },
    [KEY, d],
  );
}
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
async function frames(p, ms = 240) {
  return p.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const rows = [],
          start = performance.now();
        function sample(t) {
          rows.push({
            t: t - start,
            rows: [
              ...document.querySelectorAll(".tool05-scene [data-item]"),
            ].map((e) => {
              const c = getComputedStyle(e),
                r = e.getBoundingClientRect(),
                m = new DOMMatrixReadOnly(c.transform);
              return {
                id: e.dataset.item,
                present: e.dataset.present,
                phase: e.dataset.phase,
                inert: e.inert,
                opacity: Number(c.opacity),
                x: m.m41,
                y: m.m42,
                sx: m.m11,
                sy: m.m22,
                top: r.top,
                height: r.height,
                layoutTop: e.offsetTop,
              };
            }),
          });
          if (t - start >= ms) resolve(rows);
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
    ms,
  );
}
async function settled(p, id) {
  await expect
    .poll(
      () =>
        row(p, id).evaluate((e) => {
          const c = getComputedStyle(e),
            m = new DOMMatrixReadOnly(c.transform);
          return (
            Math.abs(m.m42) < 0.1 && Math.abs(Number(c.opacity) - 1) < 0.001
          );
        }),
      { timeout: 8000 },
    )
    .toBe(true);
}
const good = () => ({
  ...tool05Initial(),
  step: 4,
  done: [0, 1, 2, 3],
  context: "现有CSS足够简单反馈，动态列表才评估Motion；保护退出/反向与焦点。",
});
test("actual pinned Motion lazy runtime and CSS division are honest while existing dependencies remain", async ({
  page,
}) => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.dependencies.motion).toBe("14.6.0");
  expect(
    JSON.parse(readFileSync("node_modules/motion/package.json", "utf8"))
      .version,
  ).toBe("14.6.0");
  const source = readFileSync("src/tool-five-motion.jsx", "utf8");
  for (const s of [
    'from "motion/react"',
    'layout="position"',
    'mode="popLayout"',
    "useIsPresent",
    "forwardRef",
  ])
    expect(source).toContain(s);
  await open(page);
  await b(page, "CSS颜色反馈 · 本地次数0").click();
  await expect(b(page, "CSS颜色反馈 · 本地次数1")).toBeVisible();
  await b(page, "退出与动态布局").click();
  await b(page, "读取运行时、DOM与当前样式").click();
  const sample = JSON.parse(
    await page.locator("[data-samples]").getAttribute("data-samples"),
  );
  expect(sample.renderer).toBe("motion14.6.0");
  expect(sample.visible).toEqual(["a", "b"]);
  expect((await read(page)).runtimeSeen).toBe(true);
  for (const s of [
    "CSS",
    "inert",
    "position",
    "不声称卡片尺寸平滑",
    "T08–T12仍为5个预告",
  ])
    expect(tool05Brief(good())).toContain(s);
});
test("references identify real Motion APIs original cards and native reset dialog without T04 provenance", async ({
  page,
}) => {
  await open(page);
  const references = page.locator(".tool-five .roadmap-details").filter({
    hasText: "T05工具专题核对说明与官方来源",
  });
  await references.locator("summary").click();
  await expect(references).toContainText("Motion官方React文档与已安装类型");
  await expect(references).toContainText("AnimatePresence/popLayout");
  await expect(references).toContainText("Motion14.6.0");
  await expect(references).toContainText("教学卡片和业务模型为本站原创");
  await expect(references).toContainText("重置确认使用浏览器原生dialog");
  await expect(references).toContainText("MIT声明单独保留");
  await expect(references).not.toContainText(
    /Open\s*Code|主题\s*token|CLI|shadcn|Radix|Dialog\s*1\.3\.1/,
  );
  expect(
    await references
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    "/licenses/motion-MIT.txt",
    "https://motion.dev/docs/react-motion-component",
    "https://motion.dev/docs/react-animate-presence",
    "https://motion.dev/docs/react-layout-animations",
    "https://motion.dev/docs/react-motion-config",
    "https://motion.dev/docs/react-use-reduced-motion",
    "https://motion.dev/docs/react-transitions",
  ]);
  await b(page, "重置T05工具专题进度").click();
  await expect(page.getByRole("dialog")).toHaveJSProperty("tagName", "DIALOG");
  await expect(page.getByRole("dialog")).toHaveJSProperty("open", true);
  await b(page, "保留T05工具专题进度").click();
});
test("real Motion enter and exit intermediate computed styles geometry DOM presence inert and eventual removal", async ({
  page,
}, info) => {
  await open(page);
  await field(page, "playback").selectOption("slow");
  await b(page, "加入C卡片").click();
  const entering = await frames(page, 260);
  expect(
    entering.some((f) =>
      f.rows.some((r) => r.id === "c" && r.opacity === 1 && Math.abs(r.y) > 1),
    ),
  ).toBe(true);
  await settled(page, "c");
  await note(page, "c").fill("会话备注保留");
  await b(page, "移除C卡片").click();
  await expect(b(page, "撤回最近移除")).toBeFocused();
  await expect(row(page, "c")).toHaveAttribute("data-present", "false");
  expect(await row(page, "c").evaluate((e) => e.inert)).toBe(true);
  expect(
    await row(page, "c")
      .locator("button,input")
      .evaluateAll((es) => es.every((e) => e.disabled)),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "移除C卡片", exact: true }),
  ).toHaveCount(0);
  const exiting = await frames(page, 220);
  expect(
    exiting.some((f) =>
      f.rows.some(
        (r) => r.id === "c" && r.opacity > 0 && r.opacity < 1 && r.inert,
      ),
    ),
  ).toBe(true);
  await expect(row(page, "c")).toHaveCount(0, { timeout: 8000 });
  writeFileSync(
    `${out}/${info.project.name}-enter-exit-frames.json`,
    JSON.stringify({ entering, exiting }, null, 2),
  );
});
test("real layout changes DOM order first with intermediate translation and no text scale then latest final geometry", async ({
  page,
}, info) => {
  await open(page, 1);
  await field(page, "playback").selectOption("slow");
  await note(page, "a").fill("保留同一业务备注");
  const handle = await row(page, "a").elementHandle();
  await b(page, "反转卡片顺序").click();
  expect(
    await page
      .locator('.tool05-card[data-present="true"]')
      .evaluateAll((es) => es.map((e) => e.dataset.item)),
  ).toEqual(["b", "a"]);
  const moving = await frames(page, 260);
  expect(moving.some((f) => f.rows.some((r) => Math.abs(r.y) > 2))).toBe(true);
  for (const f of moving)
    for (const r of f.rows) {
      expect(Math.abs(r.sx - 1)).toBeLessThan(0.002);
      expect(Math.abs(r.sy - 1)).toBeLessThan(0.002);
    }
  expect(
    await handle.evaluate(
      (e) => e === document.querySelector('[data-item="a"]'),
    ),
  ).toBe(true);
  await settled(page, "a");
  await expect(note(page, "a")).toHaveValue("保留同一业务备注");
  await b(page, "反转卡片顺序").click();
  await settled(page, "b");
  const before = await row(page, "b").evaluate((e) => e.offsetTop);
  await b(page, "切换选中卡片说明").click();
  const expanded = await frames(page, 260);
  expect(await row(page, "b").evaluate((e) => e.offsetTop)).toBeGreaterThan(
    before,
  );
  expect(
    expanded.some((f) => f.rows.some((r) => r.id === "b" && Math.abs(r.y) > 1)),
  ).toBe(true);
  for (const f of expanded)
    for (const r of f.rows) expect(Math.abs(r.sy - 1)).toBeLessThan(0.002);
  await settled(page, "b");
  writeFileSync(
    `${out}/${info.project.name}-layout-frames.json`,
    JSON.stringify({ moving, expanded }, null, 2),
  );
});
test("exit reversal rapid repeated remove undo never loses newest notes or duplicates stable IDs", async ({
  page,
}, info) => {
  await open(page, 2);
  await field(page, "playback").selectOption("slow");
  await note(page, "a").fill("最新备注不丢");
  await b(page, "移除A卡片").click();
  await frames(page, 100);
  const opacity = await row(page, "a").evaluate((e) =>
    Number(getComputedStyle(e).opacity),
  );
  await b(page, "撤回最近移除").click();
  const reversed = await frames(page, 150);
  expect(reversed[0].rows.find((r) => r.id === "a").opacity).toBeGreaterThan(
    opacity - 0.2,
  );
  for (let i = 0; i < 4; i++) {
    await b(page, "移除A卡片").click();
    await b(page, "撤回最近移除").click();
    await b(page, "反转卡片顺序").click();
  }
  await b(page, "显示全部三张卡片").click();
  await settled(page, "a");
  await settled(page, "c");
  for (const id of ["a", "b", "c"]) await expect(row(page, id)).toHaveCount(1);
  await expect(note(page, "a")).toHaveValue("最新备注不丢");
  expect(
    await page
      .locator(".tool05-card")
      .evaluateAll((es) => es.map((e) => e.dataset.item)),
  ).toEqual(["a", "b", "c"]);
  await field(page, "selected").click();
  await page.waitForTimeout(1200);
  await expect(field(page, "selected")).toBeFocused();
  await expect(note(page, "a")).toHaveValue("最新备注不丢");
  writeFileSync(
    `${out}/${info.project.name}-reversal-frames.json`,
    JSON.stringify(reversed, null, 2),
  );
});
test("actual Tab removal immediately restores owned focus and exiting subtree has no keyboard target", async ({
  page,
}, info) => {
  await open(page, 2);
  await field(page, "playback").selectOption("slow");
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool05-remove-focus",
      profile: info.project.name,
    });
  await k.act(b(page, "移除A卡片"), "remove focused item");
  await expect(b(page, "撤回最近移除")).toBeFocused();
  expect(await row(page, "a").evaluate((e) => e.inert)).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement.closest("[inert]")),
  ).toBeNull();
  await expect(b(page, "显示全部三张卡片")).toBeFocused();
  await field(page, "selected").selectOption("a");
  await b(page, "移除选中卡片").click();
  await expect(b(page, "移除选中卡片")).toBeFocused();
  await expect(page.locator(".tool05-feedback")).toContainText(
    "已移除，不重复提交",
  );
  await page.waitForTimeout(1250);
  await expect(b(page, "移除选中卡片")).toBeFocused();
  writeFileSync(
    `${out}/${info.project.name}-remove-focus.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("live reduce mid exit and layout stops actual Motion preserves input selection and never replays on restore", async ({
  page,
}, info) => {
  await open(page, 1);
  await field(page, "playback").selectOption("slow");
  await b(page, "加入C卡片").click();
  await b(page, "反转卡片顺序").click();
  await note(page, "a").click();
  await page.keyboard.type("真实键盘备注");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  const before = await note(page, "a").evaluate((e) => ({
    start: e.selectionStart,
    end: e.selectionEnd,
    value: e.value,
  }));
  const old = await note(page, "a").elementHandle();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-renderer="static-react"]')).toHaveCount(1);
  await expect(note(page, "a")).toBeFocused();
  expect(
    await note(page, "a").evaluate((e) => ({
      start: e.selectionStart,
      end: e.selectionEnd,
      value: e.value,
    })),
  ).toEqual(before);
  expect(await old.evaluate((e) => e.isConnected)).toBe(false);
  await b(page, "移除C卡片").click();
  await expect(row(page, "c")).toHaveCount(0);
  await b(page, "撤回最近移除").click();
  await expect(note(page, "c")).toBeVisible();
  await field(page, "selected").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
  await expect(field(page, "selected")).toBeFocused();
  const resumed = await frames(page, 150);
  expect(
    resumed.every((f) =>
      f.rows.every((r) => r.opacity === 1 && Math.abs(r.y) < 0.1),
    ),
  ).toBe(true);
  writeFileSync(
    `${out}/${info.project.name}-live-reduce.json`,
    JSON.stringify({ before, resumed }, null, 2),
  );
});
test("manual static switching and restored normal keep final model notes and external focus through rapid changes", async ({
  page,
}) => {
  await open(page, 1);
  await b(page, "加入C卡片").click();
  await note(page, "b").fill("保留B");
  for (let i = 0; i < 4; i++) {
    await field(page, "playback").selectOption("static");
    await expect(page.locator('[data-renderer="static-react"]')).toHaveCount(1);
    await b(page, "反转卡片顺序").click();
    await field(page, "playback").selectOption("slow");
  }
  await expect(note(page, "b")).toHaveValue("保留B");
  await field(page, "selected").click();
  await page.waitForTimeout(1300);
  await expect(field(page, "selected")).toBeFocused();
  await expect(page.locator(".tool05-card")).toHaveCount(3);
});
test("hidden visibility policy unmounts animated renderer and returns static final state without replay", async ({
  page,
}) => {
  await open(page);
  await field(page, "playback").selectOption("slow");
  await b(page, "加入C卡片").click();
  await note(page, "a").fill("后台不丢备注");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator('[data-renderer="static-react"]')).toHaveCount(1);
  await expect(note(page, "a")).toHaveValue("后台不丢备注");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
  const trace = await frames(page, 120);
  expect(
    trace.every((f) =>
      f.rows.every((r) => r.opacity === 1 && Math.abs(r.y) < 0.1),
    ),
  ).toBe(true);
});
test("reset while entering exiting and layout clears session rejects old signals and keeps reset button focus", async ({
  page,
}) => {
  await open(page, 2);
  await field(page, "playback").selectOption("slow");
  await b(page, "加入C卡片").click();
  await note(page, "a").fill("旧会话");
  await b(page, "移除B卡片").click();
  await b(page, "反转卡片顺序").click();
  await b(page, "恢复场景初始状态（清空会话备注）").click();
  await expect(b(page, "恢复场景初始状态（清空会话备注）")).toBeFocused();
  await expect(page.locator(".tool05-card")).toHaveCount(2);
  await expect(note(page, "a")).toHaveValue("");
  await expect(row(page, "c")).toHaveCount(0);
  await page.waitForTimeout(1300);
  await expect(b(page, "恢复场景初始状态（清空会话备注）")).toBeFocused();
  expect(
    await page
      .locator(".tool05-card")
      .evaluateAll((es) => es.map((e) => e.dataset.item)),
  ).toEqual(["a", "b"]);
  await b(page, "撤回最近移除").click();
  await expect(page.locator(".tool05-feedback")).toContainText("没有可撤回");
});
test("empty model remains operable removes all exiting controls and restores all unique IDs without focus steal", async ({
  page,
}) => {
  await open(page, 2);
  await field(page, "playback").selectOption("slow");
  await b(page, "加入C卡片").click();
  for (const id of ["a", "b", "c"]) {
    await field(page, "selected").selectOption(id);
    await b(page, "移除选中卡片").click();
  }
  await expect(page.locator(".tool05-empty")).toBeVisible();
  expect(
    await page
      .locator(".tool05-card")
      .evaluateAll((es) => es.every((e) => e.inert)),
  ).toBe(true);
  await b(page, "显示全部三张卡片").click();
  await expect(b(page, "显示全部三张卡片")).toBeFocused();
  await settled(page, "a");
  for (const id of ["a", "b", "c"]) await expect(row(page, id)).toHaveCount(1);
  await expect(page.locator(".tool05-empty")).toHaveCount(0);
});
test("late actual Motion module download after leaving cannot mount into old topic or move newer real Tab focus", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/tool-five-motion-*.js", async (r) => {
    await gate;
    await r.continue();
  });
  await open(page, 0, false);
  await expect(page.locator(".tool05-runtime")).toContainText("加载中");
  await b(page, "返回T04复习").click();
  await expect(page.locator("#tool04-stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  release();
  await expect.poll(() => page.locator(".tool05-scene").count()).toBe(0);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  await directory(page);
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
  await expect(note(page, "a")).toHaveValue("");
});
test("real module request failure gives honest same model static fallback acknowledgement and reload recovery", async ({
  page,
}) => {
  await page.route("**/tool-five-motion-*.js", (r) => r.abort("failed"));
  await open(page, 0, false);
  await expect(page.locator(".tool05-runtime")).toContainText("模块加载失败");
  await expect(page.locator('[data-renderer="static-react"]')).toHaveCount(1);
  await b(page, "加入C卡片").click();
  await b(page, "反转卡片顺序").click();
  await b(page, "确认静态回退边界并继续").click();
  await b(page, "读取运行时、DOM与当前样式").click();
  expect((await read(page)).runtimeSeen).toBe(false);
  expect((await read(page)).fallbackAcknowledged).toBe(true);
  expect(tool05Brief(await read(page))).toContain("真实Motion尚待补测");
  await axes(page);
  await page.unroute("**/tool-five-motion-*.js");
  await b(page, "重载页面重试Motion模块").click();
  await directory(page);
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
});
test("typing in static loading fallback survives actual module completion with selection and current ownership", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/tool-five-motion-*.js", async (r) => {
    await gate;
    await r.continue();
  });
  await open(page, 0, false);
  await note(page, "a").click();
  await page.keyboard.type("加载期间真实输入");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  const before = await note(page, "a").evaluate((e) => ({
    value: e.value,
    start: e.selectionStart,
    end: e.selectionEnd,
  }));
  release();
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
  await expect(note(page, "a")).toBeFocused();
  expect(
    await note(page, "a").evaluate((e) => ({
      value: e.value,
      start: e.selectionStart,
      end: e.selectionEnd,
    })),
  ).toEqual(before);
});
test("delayed frames released after real navigation unmount cannot revive old model or refocus old controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window);
    window.held05 = [];
    window.requestAnimationFrame = (cb) =>
      window.hold05
        ? (window.held05.push(cb), 90000 + window.held05.length)
        : raf(cb);
  });
  await open(page, 2);
  await field(page, "playback").selectOption("slow");
  await page.evaluate(() => (window.hold05 = true));
  await b(page, "加入C卡片").click();
  await b(page, "移除A卡片").click();
  await b(page, "返回T04复习").click();
  await expect(page.locator("#tool04-stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => {
    window.hold05 = false;
    window.held05.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(page.locator(".tool05-scene")).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  await directory(page);
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
  await expect(note(page, "a")).toHaveValue("");
  await expect(row(page, "c")).toHaveCount(0);
});
test("normal settled scene and unmount do not keep an application animation frame loop running", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window);
    window.frameCalls05 = 0;
    window.requestAnimationFrame = (cb) => {
      window.frameCalls05++;
      return raf(cb);
    };
  });
  await open(page);
  await b(page, "加入C卡片").click();
  await settled(page, "c");
  await page.waitForTimeout(180);
  let n = await page.evaluate(() => window.frameCalls05);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.frameCalls05)).toBe(n);
  await b(page, "返回T04复习").click();
  await expect(page.locator("#tool04-stage-heading")).toBeFocused();
  await page.waitForTimeout(180);
  n = await page.evaluate(() => window.frameCalls05);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.frameCalls05)).toBe(n);
});
test("375 short viewport long notes expand and real resize preserve readable unscaled controls", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await open(page, 1);
  await field(page, "playback").selectOption("slow");
  await b(page, "加入C卡片").click();
  await note(page, "a").fill("窄屏备注文字".repeat(25));
  await b(page, "切换选中卡片说明").click();
  await b(page, "反转卡片顺序").click();
  await page.setViewportSize({ width: 620, height: 480 });
  await page.setViewportSize({ width: 375, height: 480 });
  await settled(page, "a");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool05-short",
      profile: info.project.name,
    });
  await k.seek(note(page, "a"), "long note visible focus");
  await page.keyboard.press("End");
  await page.keyboard.type("自己的补充");
  await expect(note(page, "a")).toHaveValue(/自己的补充$/);
  await axes(page);
  await page
    .locator(".tool05-scene")
    .screenshot({ path: `${out}/${info.project.name}-short-scene.png` });
  writeFileSync(
    `${out}/${info.project.name}-short.json`,
    JSON.stringify(trace, null, 2),
  );
});
test("quiz wrong answers explain CSS Motion lifecycle and size boundaries then permit retry", async ({
  page,
}) => {
  await open(page, 3);
  await b(page, "完成并继续").click();
  await expect(page.locator(".notice")).toContainText("先完成");
  for (let i = 0; i < 3; i++) {
    const q = page.locator(".quiz-grid fieldset").nth(i);
    await q
      .getByRole("button")
      .nth(1 - tool05Questions[i].correct)
      .click();
    await expect(q).toContainText("再想一想");
    await q.getByRole("button").nth(tool05Questions[i].correct).click();
    await expect(q).toContainText(tool05Questions[i].why);
  }
});
test("editable brief keeps user context edits and requires explicit retain or regeneration after changed parameters", async ({
  page,
}) => {
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  const text = await draft(page).inputValue();
  await draft(page).fill(text + "\n自己的性能与回滚约定。");
  await field(page, "context").fill("新的项目现状");
  await expect(draft(page)).toHaveValue(text + "\n自己的性能与回滚约定。");
  const review = page.getByRole("checkbox", {
    name: "我已核对CSS分工、Motion生命周期、布局尺寸与验收边界。",
    exact: true,
  });
  await expect(review).toBeDisabled();
  await b(page, "保留编辑并确认当前实验参数").click();
  await review.check();
  await b(page, "重新生成工具选型草稿").click();
  expect(await draft(page).inputValue()).not.toContain(
    "自己的性能与回滚约定。",
  );
  expect((await read(page)).reviewed).toBe(false);
});
test("clipboard snapshot success never overwrites edits and source text is not sent or executed", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t) => {
          window.copied05 = t;
          return new Promise((r) => (window.release05 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  const text = await draft(page).inputValue();
  await b(page, "复制工具选型说明").click();
  await draft(page).fill(text + "\n随后编辑");
  await page.evaluate(() => window.release05());
  await expect(page.locator(".copy-feedback")).toContainText("点击时的版本");
  expect(await page.evaluate(() => window.copied05)).toBe(text);
  await expect(draft(page)).toHaveValue(text + "\n随后编辑");
});
test("late clipboard rejection respects newer outside real Tab focus and offers manual copying only when owned", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => new Promise((_, r) => (window.reject05 = r)) },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await page.evaluate(() => window.reject05(Error("fixture denied")));
  await expect(draft(page)).toBeFocused();
  expect(
    await draft(page).evaluate((e) => e.selectionEnd - e.selectionStart),
  ).toBe((await draft(page).inputValue()).length);
  await b(page, "复制工具选型说明").click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.reject05(Error("fixture denied")));
  await expect(page.locator(".copy-feedback")).toContainText(
    "当前焦点保持不变",
  );
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
test("copy mutex reset and old completion cannot revive cleared draft or reclaim newer focus", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => {
          window.calls05 = (window.calls05 || 0) + 1;
          return new Promise((r) => (window.release05 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.calls05)).toBe(1);
  await b(page, "重置T05工具专题进度").click();
  await b(page, "确认重置T05工具专题").click();
  await expect(field(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.release05());
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  expect((await read(page)).draft).toBe("");
  await expect(page.locator(".copy-feedback")).toHaveCount(0);
});
test("malformed storage bounds enums and draft while unavailable storage leaves real Motion actions usable", async ({
  page,
  browser,
}) => {
  await seed(page, {
    ...good(),
    step: 99,
    done: [0, 0, 4, -1, 99],
    playback: "bogus",
    selected: "x",
    needsSeen: ["css", "wrong"],
    answers: [9, 0, 1],
    context: "x".repeat(900),
    draft: "x".repeat(20000),
    reviewed: true,
    draftStale: true,
  });
  await open(page);
  const s = await read(page);
  expect(s.step).toBe(0);
  expect(s.done).toEqual([0, 4]);
  expect(s.playback).toBe("standard");
  expect(s.selected).toBe("a");
  expect(s.needsSeen).toEqual(["css"]);
  expect(s.context.length).toBe(700);
  expect(s.draft.length).toBe(10000);
  expect(s.reviewed).toBe(false);
  await b(page, "加入C卡片").click();
  const c = await browser.newContext(),
    p = await c.newPage();
  await p.addInitScript(() => {
    localStorage.setItem("frontend-observatory.tool05.v1", "{bad");
    Storage.prototype.setItem = () => {
      throw Error("fixture denied");
    };
  });
  await open(p);
  await b(p, "加入C卡片").click();
  await expect(row(p, "c")).toHaveCount(1);
  await expect(p.locator(".saved")).toContainText("存储不可用");
  await c.close();
});
test("normal app navigation out and return clears session but preserves selected speed and stored progress", async ({
  page,
}) => {
  await open(page, 2);
  await field(page, "playback").selectOption("slow");
  await note(page, "a").fill("离站应清空");
  await b(page, "加入C卡片").click();
  await b(page, "移除B卡片").click();
  await b(page, "返回T04复习").click();
  await expect(page.locator("#tool04-stage-heading")).toBeFocused();
  await expect(page.locator(".tool05-scene")).toHaveCount(0);
  await directory(page);
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
  await expect(note(page, "a")).toHaveValue("");
  await expect(row(page, "c")).toHaveCount(0);
  await expect(field(page, "playback")).toHaveValue("slow");
  await b(page, "撤回最近移除").click();
  await expect(page.locator(".tool05-feedback")).toContainText("没有可撤回");
});
test("CSS feedback uses actual native hover focus and press colors independently from Motion", async ({
  page,
}, info) => {
  await open(page);
  const target = b(page, "CSS颜色反馈 · 本地次数0"),
    base = await target.evaluate((e) => getComputedStyle(e).backgroundColor);
  await target.hover();
  const hover = await target.evaluate(
    (e) => getComputedStyle(e).backgroundColor,
  );
  await expect
    .poll(() => target.evaluate((e) => getComputedStyle(e).backgroundColor))
    .not.toBe(base);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool05-css",
      profile: info.project.name,
    });
  await k.seek(target, "real CSS focus");
  expect(
    await target.evaluate((e) => getComputedStyle(e).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("Space");
  await expect(b(page, "CSS颜色反馈 · 本地次数1")).toBeFocused();
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
  expect((await read(page)).cssSeen).toBe(true);
  writeFileSync(
    `${out}/${info.project.name}-css-focus.json`,
    JSON.stringify({ base, hover, trace }, null, 2),
  );
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and actual current scene controls crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    await axes(page);
    await page
      .locator(n < 3 ? ".tool05-scene" : n === 3 ? ".quiz-grid" : ".agent-grid")
      .screenshot({ path: `${out}/${info.project.name}-station${n + 1}.png` });
    if (n < 3) {
      await b(page, "加入C卡片").click();
      await b(page, "读取运行时、DOM与当前样式").click();
      await axes(page);
      await page.locator(".tool05-readout").screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-actual-snapshot.png`,
      });
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
  "frontend-observatory.tool04.v1",
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
async function complete(p, act, select, type, toggle = act) {
  await expect(
    p.locator('[data-renderer="motion14.6.0"], [data-renderer="static-react"]'),
  ).toHaveCount(1);
  await expect(p.locator(".tool05-runtime")).toContainText("模块已加载");
  await act(b(p, "退出与动态布局"), "need conditions");
  await act(b(p, "CSS颜色反馈 · 本地次数0"), "CSS feedback");
  await act(b(p, "加入C卡片"), "add C");
  await act(b(p, "读取运行时、DOM与当前样式"), "actual runtime");
  await act(b(p, "完成并继续"), "station0");
  await act(b(p, "反转卡片顺序"), "layout order");
  await act(b(p, "切换选中卡片说明"), "CSS size layout position");
  await act(b(p, "读取运行时、DOM与当前样式"), "actual geometry");
  await act(b(p, "完成并继续"), "station1");
  await act(b(p, "填入A备注示例（替换本栏）"), "note sample");
  await type(note(p, "a"), " 用户自己编辑");
  await act(b(p, "移除A卡片"), "remove focused A");
  await expect(b(p, "撤回最近移除")).toBeFocused();
  await act(b(p, "撤回最近移除"), "undo");
  await expect(note(p, "a")).toHaveValue(/用户自己编辑/);
  await act(b(p, "恢复场景初始状态（清空会话备注）"), "reset scene");
  await act(b(p, "完成并继续"), "station2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool05Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool05Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "context sample");
  await type(field(p, "context"), " 用户补充：先比较CSS是否足够。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(draft(p), "\n用户编辑：验收中途帧与最终状态。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对CSS分工、Motion生命周期、布局尺寸与验收边界。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T05工具专题"), "complete T05");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T05工具专题进度"), "reset cancel");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T05工具专题进度"), "cancel reset");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T05工具专题进度")).toBeFocused();
  await act(b(p, "重置T05工具专题进度"), "reset confirm");
  await act(b(p, "确认重置T05工具专题"), "confirm reset");
  await expect(field(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    context: "",
    draft: "",
  });
}
test("real Tab complete five stations Motion CSS retry actual edits copy refresh cancel confirm reset preserves38", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool05-full",
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
  test(`zero keyboard touch full ${reducedMotion} actual Motion or explicit static path retry refresh reset`, async ({
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
      window.keyEvents05 = 0;
      addEventListener("keydown", () => window.keyEvents05++);
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
    const text = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(draft(p)).toHaveValue(text);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keyEvents05)).toBe(0);
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
            "actual taps plus fill/selectOption fixtures; not OS picker/IME or physical phone",
        },
        null,
        2,
      ),
    );
    await c.close();
  });
test("T04 exit opens actual T05 with nine available tags and five readonly previews not numbered39", async ({
  page,
}) => {
  await open(page);
  await b(page, "返回T04复习").click();
  await expect(page.locator("#tool04-stage-heading")).toBeFocused();
  await b(page, "继续T05 · Motion").click();
  await expect(field(page, "stage-heading")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(9);
  await expect(nav.locator(".coverage-preview")).toHaveCount(5);
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(nav.getByRole("button", { name: /T06/ })).toHaveCount(1);
  await expect(nav.getByRole("button", { name: /T07/ })).toHaveCount(1);
  await expect(page.locator('[data-lesson-id="39"]')).toHaveCount(0);
});
test("actual delayed module after topic reset mounts only fresh scene and preserves new owned input", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/tool-five-motion-*.js", async (r) => {
    await gate;
    await r.continue();
  });
  await open(page, 0, false);
  await note(page, "a").fill("旧场景");
  await b(page, "加入C卡片").click();
  await b(page, "重置T05工具专题进度").click();
  await b(page, "确认重置T05工具专题").click();
  await expect(field(page, "stage-heading")).toBeFocused();
  await expect(note(page, "a")).toHaveValue("");
  await note(page, "a").click();
  await page.keyboard.type("重置后新输入");
  release();
  await expect(page.locator('[data-renderer="motion14.6.0"]')).toHaveCount(1);
  await expect(note(page, "a")).toBeFocused();
  await expect(note(page, "a")).toHaveValue("重置后新输入");
  await expect(row(page, "c")).toHaveCount(0);
  expect((await read(page)).addedSeen).toBe(false);
});
