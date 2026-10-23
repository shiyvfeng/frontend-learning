import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL08_STORAGE as KEY,
  tool08Initial,
  tool08Brief,
  tool08Questions,
  recommendation,
} from "../src/tool-eight-content.js";
test.use({
  launchOptions: {
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  },
});
const out = "/tmp/tool08-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  f = (p, n) => p.locator("#tool08-" + n),
  lab = (p) => p.locator(".tool08-lab"),
  scene = (p) => p.locator(".tool08-scene"),
  canvas = (p) => p.locator("[data-tool08-canvas]"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T08工具专题学习步骤" })
      .getByRole("button")
      .nth(n),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  save = (n, v) =>
    writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", {
      name: "T08 · Three.js / R3F / Spline · 可学习",
      exact: true,
    }),
    "T08",
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
    ([k, d]) => {
      if (window === top) localStorage.setItem(k, JSON.stringify(d));
    },
    [KEY, d],
  );
}
async function prepared(p, n = 1) {
  await expect(lab(p)).toHaveAttribute("data-prepared", String(n));
}
async function load(p, act = (l) => l.click()) {
  await act(b(p, "准备或重试3D模块"), "prepare");
  await prepared(p);
  await act(b(p, "应用最早模块结果"), "apply");
  await expect(scene(p)).toHaveAttribute("data-state", "ready");
}
async function inspect(p) {
  await b(p, "读取实际3D快照").click();
  return JSON.parse(
    await p
      .locator("[data-scene-snapshot]")
      .getAttribute("data-scene-snapshot"),
  );
}
async function state(p) {
  return p.evaluate(async () => {
    const u = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((u) => /\/tool-eight-runtime-.*\.js/.test(u));
    return u
      ? (await import(u)).runtimeState()
      : { controllers: 0, renderers: 0, created: 0 };
  });
}
async function pixels(p) {
  return canvas(p).evaluate((c) => {
    const g = c.getContext("webgl2"),
      a = new Uint8Array(c.width * c.height * 4);
    g.readPixels(0, 0, c.width, c.height, g.RGBA, g.UNSIGNED_BYTE, a);
    let hash = 2166136261;
    for (let i = 0; i < a.length; i += 4)
      hash = Math.imul(hash ^ a[i], 16777619) ^ a[i + 1] ^ a[i + 2];
    return {
      hash: hash >>> 0,
      width: c.width,
      height: c.height,
      nonzero: a.some((v) => v !== 0),
      error: g.getError(),
    };
  });
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
const good = () => ({
  ...tool08Initial(),
  routesSeen: ["three", "r3f"],
  inputsSeen: ["static", "data"],
  comparedSeen: true,
  loadedSeen: true,
  variantSeen: true,
  dataSeen: true,
  viewSeen: true,
  inspectedSeen: true,
  failureSeen: true,
  retrySeen: true,
  canceledSeen: true,
  staleSeen: true,
  cleanupSeen: true,
  answers: tool08Questions.map((q) => q.correct),
  done: [0, 1, 2, 3],
});
test("route conditions distinguish React renderer design asset and actual fixed engine", async ({
  page,
}) => {
  await open(page);
  for (const n of ["React Three Fiber候选", "动态业务数据需求"])
    await b(page, n).click();
  await f(page, "asset").selectOption("designer");
  await f(page, "app").selectOption("plain");
  await expect(page.locator(".tool08-recommendation")).toContainText(
    "R3F是Three.js的React renderer",
  );
  await expect(page.locator(".tool08-recommendation")).toContainText(
    "不必只为3D迁移整个应用",
  );
  await b(page, "Spline资产候选").click();
  await expect(lab(page)).toContainText("React包装不等于R3F");
  await expect(lab(page)).toContainText("没有安装R3F/Spline runtime");
  await expect(canvas(page)).toHaveCount(0);
  expect((await read(page)).routesSeen).toEqual(["three", "r3f", "spline"]);
});
test("official sources exact six and original attribution has no previous animation runtime residue", async ({
  page,
}) => {
  await open(page);
  const r = page
    .locator(".tool-eight .roadmap-details")
    .filter({ hasText: "T08工具专题核对说明与官方来源" });
  await r.locator("summary").click();
  await expect(r.getByRole("link")).toHaveCount(6);
  await expect(r).toContainText("Three.js 0.186.1");
  await expect(r).not.toContainText(/lottie-web|Rive|GSAP|Radix|Open Code/);
  for (const s of [
    "invalidate",
    "WebGL 2",
    "R3F",
    "Spline",
    "DPR",
    "dispose",
    "T09–T12仍为4个预告",
  ])
    expect(tool08Brief(good())).toContain(s);
});
test("all conditional route combinations preserve alternatives no automatic performance or asset guarantees", async () => {
  for (const route of ["three", "r3f", "spline"])
    for (const asset of ["geometry", "designer"])
      for (const app of ["react", "plain"])
        for (const input of ["static", "data"]) {
          const r = recommendation({
            ...tool08Initial(),
            route,
            asset,
            app,
            input,
          });
          expect(r).toContain("不是AI评分或唯一答案");
          expect(r).not.toContain("总是更快");
        }
});
test("actual Three renderer parameters and readPixels change for color height camera and stock", async ({
  page,
}, info) => {
  await open(page, 1);
  await load(page);
  await b(page, "重置侧面相机").click();
  expect((await read(page)).viewSeen).toBe(false);
  const rows = [];
  const collect = async (n) =>
    rows.push({ n, actual: await inspect(page), pixels: await pixels(page) });
  await collect("initial");
  expect(rows[0].actual).toMatchObject({
    revision: "186",
    renderer: true,
    kind: "actual-three",
    stockVisible: 3,
  });
  await f(page, "finish").selectOption("sage");
  await expect.poll(async () => (await inspect(page)).color).toBe("6f9c89");
  await collect("sage");
  await f(page, "height").selectOption("tall");
  await expect.poll(async () => (await inspect(page)).stemScale).toBe(1.4);
  await collect("tall");
  await b(page, "切换正面相机").click();
  await expect
    .poll(async () => (await inspect(page)).camera)
    .toEqual([0, 1, 5.2]);
  await collect("front");
  await b(page, "应用本地库存0").click();
  await expect.poll(async () => (await inspect(page)).stockVisible).toBe(0);
  await collect("stock0");
  for (let i = 1; i < rows.length; i++)
    expect(rows[i].pixels.hash).not.toBe(rows[i - 1].pixels.hash);
  expect(rows[4].actual.triangles).toBe(rows[3].actual.triangles - 36);
  expect(rows.every((r) => r.pixels.nonzero && r.pixels.error === 0)).toBe(
    true,
  );
  save(info.project.name + "-actual-three-pixels", rows);
});
test("actual budget projection resize and live DPR stay bounded and retain current model", async ({
  page,
}, info) => {
  await open(page, 1);
  await load(page);
  await page.setViewportSize({ width: 375, height: 480 });
  await page.evaluate(() => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => (await inspect(page)).height)
    .toBeLessThanOrEqual(480);
  const a = await inspect(page);
  expect(a.width).toBeLessThanOrEqual(640);
  await page
    .getByRole("checkbox", { name: "低分辨率预算", exact: true })
    .check();
  await expect
    .poll(async () => (await inspect(page)).width)
    .toBeLessThan(a.width);
  const c = await canvas(page).boundingBox(),
    x = await inspect(page);
  expect(x.aspect).toBeCloseTo(c.width / c.height, 2);
  await page.setViewportSize({ width: 800, height: 700 });
  await expect
    .poll(async () => (await inspect(page)).width)
    .toBeGreaterThan(x.width);
  expect((await inspect(page)).stockVisible).toBe(3);
  save(info.project.name + "-budget", {
    a,
    low: x,
    after: await inspect(page),
  });
});
test("normal idle has no perpetual RAF reduce static controls remain real without auto animation", async ({
  page,
}, info) => {
  await open(page, 1);
  await load(page);
  const n = (await inspect(page)).draws;
  await page.waitForTimeout(180);
  expect((await inspect(page)).draws).toBe(n);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(lab(page)).toHaveAttribute("data-reduced", "true");
  await f(page, "finish").selectOption("sage");
  await expect.poll(async () => (await inspect(page)).color).toBe("6f9c89");
  const after = (await inspect(page)).draws;
  await page.waitForTimeout(160);
  expect((await inspect(page)).draws).toBe(after);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(160);
  expect((await inspect(page)).draws).toBe(after);
  save(info.project.name + "-idle-reduce", { before: n, after });
});
test("manual non3D fallback disposes resources preserves text and actual return rebuilds once", async ({
  page,
}) => {
  await open(page, 1);
  await load(page);
  const x = await state(page);
  await page
    .getByRole("checkbox", { name: "手动非3D回退", exact: true })
    .check();
  await expect(scene(page)).toHaveAttribute("data-state", "fallback");
  expect((await inspect(page)).renderer).toBe(false);
  expect((await state(page)).renderers).toBe(0);
  await expect(scene(page)).toContainText("配置文字替代");
  await page
    .getByRole("checkbox", { name: "手动非3D回退", exact: true })
    .uncheck();
  await expect(scene(page)).toHaveAttribute("data-state", "ready");
  expect((await state(page)).renderers).toBe(1);
  expect((await state(page)).disposedRenderer).toBeGreaterThan(
    x.disposedRenderer,
  );
});
test("actual unavailable WebGL is honest text fallback and retry controls retain immediate focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (n, ...args) {
      return n === "webgl2" ? null : get.call(this, n, ...args);
    };
  });
  await open(page, 1);
  await b(page, "准备或重试3D模块").click();
  await prepared(page);
  await b(page, "应用最早模块结果").click();
  await expect(scene(page)).toHaveAttribute("data-state", "failed");
  await expect(scene(page)).toContainText("WebGL 2不可用");
  await b(page, "重建当前3D").click();
  await expect(b(page, "重建当前3D")).toBeFocused();
  expect((await inspect(page)).renderer).toBe(false);
  await b(page, "确认非3D回退边界").click();
  expect((await read(page)).loadedSeen).toBe(false);
});
test("real context loss restore rebuilds current parameters and retired canvas cannot claim current focus", async ({
  page,
}, info) => {
  await open(page, 1);
  await load(page);
  await f(page, "finish").selectOption("sage");
  await expect.poll(async () => (await inspect(page)).color).toBe("6f9c89");
  const supported = await canvas(page).evaluate((c) => {
    const x = c.getContext("webgl2").getExtension("WEBGL_lose_context");
    if (!x) return false;
    window.context08 = x;
    x.loseContext();
    return true;
  });
  expect(supported).toBe(true);
  await expect(scene(page)).toHaveAttribute("data-state", "lost");
  expect((await state(page)).renderers).toBe(0);
  await page.evaluate(() => window.context08.restoreContext());
  await expect(scene(page)).toHaveAttribute("data-state", "ready");
  expect((await inspect(page)).color).toBe("6f9c89");
  await page.evaluate(() => {
    window.hiddenContext08 = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.hiddenContext08,
    });
    window.context08 = document
      .querySelector("[data-tool08-canvas]")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context");
    window.context08.loseContext();
  });
  await expect(scene(page)).toHaveAttribute("data-state", "lost");
  await page.evaluate(() => {
    window.hiddenContext08 = true;
    document.dispatchEvent(new Event("visibilitychange"));
    window.hiddenContext08 = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(scene(page)).toHaveAttribute("data-state", "lost");
  await page.evaluate(() => window.context08.restoreContext());
  await expect(scene(page)).toHaveAttribute("data-state", "ready");
  expect((await inspect(page)).color).toBe("6f9c89");
  save(info.project.name + "-context-restored", await inspect(page));
});
test("missing optional context loss extension still disposes geometries materials and renderer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function (n) {
      return n === "WEBGL_lose_context" ? null : get.call(this, n);
    };
  });
  await open(page, 1);
  await load(page);
  await b(page, "释放本例3D资源").click();
  await expect(canvas(page)).toHaveCount(0);
  const s = await state(page);
  expect(s.controllers).toBe(0);
  expect(s.renderers).toBe(0);
  expect(s.disposedGeometry).toBeGreaterThanOrEqual(8);
  expect(s.disposedMaterial).toBeGreaterThanOrEqual(5);
  expect(s.disposedRenderer).toBe(1);
});
test("hidden releases GPU resources restore latest data and navigation has no pending animation", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.h08 = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.h08,
    });
    const r = requestAnimationFrame.bind(window),
      c = cancelAnimationFrame.bind(window);
    window.pending08 = new Set();
    window.frames08 = 0;
    window.requestAnimationFrame = (f) => {
      let id;
      id = r((t) => {
        window.pending08.delete(id);
        window.frames08++;
        f(t);
      });
      window.pending08.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      window.pending08.delete(id);
      c(id);
    };
  });
  await open(page, 1);
  await load(page);
  await page.evaluate(() => {
    window.h08 = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(scene(page)).toHaveAttribute("data-state", "suspended");
  expect((await state(page)).renderers).toBe(0);
  await b(page, "应用本地库存0").click();
  await page.evaluate(() => {
    window.h08 = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(scene(page)).toHaveAttribute("data-state", "ready");
  expect((await inspect(page)).stockVisible).toBe(0);
  await stage(page, 0).click();
  await expect(scene(page)).toHaveCount(0);
  expect((await state(page)).controllers).toBe(0);
  await expect.poll(() => page.evaluate(() => window.pending08.size)).toBe(0);
  const n = await page.evaluate(() => window.frames08);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.frames08)).toBe(n);
  save(info.project.name + "-hidden-cleanup", await state(page));
});
test("manual failure cancel stale prepared result and retry never remount operation controls", async ({
  page,
}, info) => {
  await open(page, 2);
  await b(page, "下次模块模拟失败").click();
  await b(page, "准备或重试3D模块").click();
  await prepared(page);
  await b(page, "应用最早模块结果").click();
  await expect(b(page, "应用最早模块结果")).toBeFocused();
  await b(page, "下次模块正常").click();
  await b(page, "准备或重试3D模块").click();
  await prepared(page);
  await b(page, "取消本次应用").click();
  await b(page, "准备或重试3D模块").click();
  await prepared(page, 2);
  await b(page, "应用最早模块结果").click();
  await expect(lab(page)).toContainText("旧代次已隔离");
  await expect(b(page, "应用最早模块结果")).toBeFocused();
  await b(page, "应用最早模块结果").click();
  await expect(scene(page)).toHaveAttribute("data-state", "ready");
  expect(await read(page)).toMatchObject({
    failureSeen: true,
    retrySeen: true,
    canceledSeen: true,
    staleSeen: true,
  });
  save(info.project.name + "-module-transactions", await inspect(page));
});
test("actual module abort and explicit reload recover without claiming fake 3D", async ({
  page,
}) => {
  await page.route("**/tool-eight-runtime-*.js", (r) => r.abort("failed"));
  await open(page, 1);
  await b(page, "准备或重试3D模块").click();
  await prepared(page);
  await b(page, "应用最早模块结果").click();
  await expect(lab(page)).toHaveAttribute("data-status", "failed");
  await expect(canvas(page)).toHaveCount(0);
  await page.unrouteAll({ behavior: "wait" });
  await b(page, "重载页面重试模块").click();
  await expect(page.locator("#stage-heading")).toBeVisible();
  await directory(page);
  await load(page);
});
test("held module after leave cannot create scene or steal newer real Tab focus", async ({
  page,
}) => {
  let release;
  const wait = new Promise((r) => (release = r));
  await page.route("**/tool-eight-runtime-*.js", async (r) => {
    await wait;
    await r.continue().catch(() => {});
  });
  await open(page, 1);
  await b(page, "准备或重试3D模块").click();
  await b(page, "返回T07复习").click();
  await expect(page.locator("#tool07-stage-heading")).toBeVisible();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  release();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  expect((await state(page)).controllers).toBe(0);
  await expect(canvas(page)).toHaveCount(0);
});
test("held resource reset invalidates old generation and leaves later actual Tab focus untouched", async ({
  page,
}) => {
  let release;
  const wait = new Promise((r) => (release = r));
  await page.route("**/tool-eight-runtime-*.js", async (r) => {
    await wait;
    await r.continue().catch(() => {});
  });
  await open(page, 2);
  await b(page, "准备或重试3D模块").click();
  await b(page, "重置T08工具专题进度").click();
  await b(page, "确认重置T08工具专题").click();
  await expect(f(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  release();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  expect((await state(page)).controllers).toBe(0);
  expect((await read(page)).done).toEqual([]);
});
test("editable brief retains changes marks stale and requires explicit human confirmation", async ({
  page,
}) => {
  await seed(page, good());
  await open(page, 4);
  await b(page, "填入项目现状示例（替换本栏）").click();
  await b(page, "生成工具选型说明").click();
  const x = await f(page, "agent-draft").inputValue();
  await f(page, "agent-draft").fill(x + "\n保留自己的部署约束");
  await f(page, "context").fill("用户新的资产约束");
  await expect(f(page, "agent-draft")).toHaveValue(x + "\n保留自己的部署约束");
  const check = page.getByRole("checkbox", {
    name: "我已核对三维路线、配置数据、资源释放与回退验收。",
    exact: true,
  });
  await expect(check).toBeDisabled();
  await b(page, "保留编辑并确认当前实验参数").click();
  await check.check();
  await b(page, "重新生成工具选型草稿").click();
  expect(await f(page, "agent-draft").inputValue()).not.toContain(
    "保留自己的部署约束",
  );
  expect((await read(page)).reviewed).toBe(false);
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
  await b(page, "重置T08工具专题进度").click();
  await b(page, "确认重置T08工具专题").click();
  await expect(f(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.release08());
  expect((await read(page)).draft).toBe("");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});

test("shader compile failure preserves immediate real Tab control identity visible focus and actual retry", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const compile = WebGL2RenderingContext.prototype.compileShader;
    WebGL2RenderingContext.prototype.compileShader = function (s) {
      if (window.badShader08) this.shaderSource(s, "invalid shader fixture");
      return compile.call(this, s);
    };
  });
  await open(page, 1);
  await load(page);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool08-shader-focus",
      profile: info.project.name,
    });
  await page.evaluate(() => (window.badShader08 = true));
  await k.act(
    b(page, "重建当前3D"),
    "actual focused rebuild before compile failure",
  );
  const held = await b(page, "重建当前3D").elementHandle();
  await expect(scene(page)).toHaveAttribute("data-state", "failed");
  await expect(b(page, "重建当前3D")).toBeFocused();
  const immediate = await held.evaluate((e) => {
    const r = e.getBoundingClientRect(),
      hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
    return {
      same: e.isConnected && e === document.activeElement,
      visible: r.top >= 0 && r.bottom <= innerHeight + 1,
      covered: hit !== e && !e.contains(hit),
      outline: getComputedStyle(e).outlineStyle,
    };
  });
  expect(immediate).toMatchObject({
    same: true,
    visible: true,
    covered: false,
  });
  expect(immediate.outline).not.toBe("none");
  expect((await state(page)).renderers).toBe(0);
  await page.evaluate(() => (window.badShader08 = false));
  await k.act(b(page, "重建当前3D"), "actual retry");
  await expect(scene(page)).toHaveAttribute("data-state", "ready");
  expect((await pixels(page)).nonzero).toBe(true);
  save(info.project.name + "-shader-focus", {
    immediate,
    trace,
    after: await inspect(page),
    fixture:
      "Actual compileShader receives invalid source for failure; not hardwarefault",
  });
});
test("coalesced held frame consumes latest actual controls not an earlier configuration", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window);
    window.held08 = [];
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (window.hold08) window.held08.push(() => cb(t));
        else cb(t);
      });
  });
  await open(page, 1);
  await load(page);
  await page.evaluate(() => (window.hold08 = true));
  await f(page, "finish").selectOption("sage");
  await f(page, "height").selectOption("tall");
  await b(page, "应用本地库存0").click();
  await b(page, "切换正面相机").click();
  await expect
    .poll(() => page.evaluate(() => window.held08.length))
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    window.hold08 = false;
    for (const f of window.held08.splice(0)) f();
  });
  await expect.poll(async () => (await inspect(page)).stockVisible).toBe(0);
  expect(await inspect(page)).toMatchObject({
    color: "6f9c89",
    stemScale: 1.4,
    camera: [0, 1, 5.2],
  });
  save(info.project.name + "-latest-frame", await inspect(page));
});
test("held old callback after release cannot allocate resources or steal newer external real Tab focus", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window);
    window.held08 = [];
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (window.hold08) window.held08.push(() => cb(t));
        else cb(t);
      });
  });
  await open(page, 1);
  await load(page);
  await page.evaluate(() => (window.hold08 = true));
  await b(page, "应用本地库存0").click();
  await expect
    .poll(() => page.evaluate(() => window.held08.length))
    .toBeGreaterThan(0);
  await b(page, "释放本例3D资源").click();
  await expect(canvas(page)).toHaveCount(0);
  const before = await state(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool08-late-frame",
      profile: info.project.name,
    });
  await k.seek(b(page, "取消本次应用"), "new external real focus");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => {
    window.hold08 = false;
    for (const f of window.held08.splice(0)) f();
  });
  expect(await state(page)).toEqual(before);
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  save(info.project.name + "-late-frame", {
    before,
    after: await state(page),
    trace,
  });
});
test("contract parameter edits preserve draft revoke review and regenerate current product values", async ({
  page,
}) => {
  const d = {
    ...good(),
    context: "已有React与几何预览",
    generated: true,
    reviewed: true,
  };
  d.draft = tool08Brief(d) + "\n自己的资源预算";
  await seed(page, d);
  await open(page, 4);
  await stage(page, 1).click();
  await f(page, "light").selectOption("1");
  await stage(page, 4).click();
  expect((await read(page)).draftStale).toBe(true);
  expect((await read(page)).reviewed).toBe(false);
  await expect(f(page, "agent-draft")).toHaveValue(d.draft);
  await b(page, "重新生成工具选型草稿").click();
  expect(await f(page, "agent-draft").inputValue()).toContain("主光1");
  await page
    .getByRole("checkbox", {
      name: "我已核对三维路线、配置数据、资源释放与回退验收。",
      exact: true,
    })
    .check();
  await stage(page, 1).click();
  await page
    .getByRole("checkbox", { name: "低分辨率预算", exact: true })
    .check();
  await stage(page, 4).click();
  expect((await read(page)).draftStale).toBe(true);
  expect((await read(page)).reviewed).toBe(false);
});
test("corrupt storage bounds route arrays strings stock and generated review without touching previous keys", async ({
  page,
}) => {
  await seed(page, {
    ...good(),
    step: 9,
    done: [0, 0, 9, "1"],
    routesSeen: ["spline", "unknown", "spline"],
    stock: 999,
    context: "x".repeat(900),
    draft: "x",
    reviewed: true,
  });
  await open(page);
  const r = await read(page);
  expect(r).toMatchObject({
    step: 0,
    done: [0],
    routesSeen: ["spline"],
    stock: 3,
    reviewed: false,
  });
  expect(r.context.length).toBe(700);
});
test("unavailable storage still allows real product rendering and announces page-only progress", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("fixture");
    };
  });
  await open(page, 1);
  await load(page);
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  expect((await inspect(page)).renderer).toBe(true);
});
test("quiz retries explain abstraction assets and budgets without pretending AI review", async ({
  page,
}) => {
  await open(page, 3);
  await b(page, "完成并继续").click();
  await expect(page.locator(".notice")).toContainText("先完成");
  for (let i = 0; i < 3; i++) {
    const q = page.locator(".quiz-grid fieldset").nth(i);
    await q
      .getByRole("button")
      .nth(1 - tool08Questions[i].correct)
      .click();
    await expect(q).toContainText("再想一想");
    await q.getByRole("button").nth(tool08Questions[i].correct).click();
    await expect(q).toContainText(tool08Questions[i].why);
  }
});
test("late title RAF respects deliberately moved real Tab focus", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    window.titleFrames08 = [];
    window.originalRAF08 = requestAnimationFrame;
    window.requestAnimationFrame = (f) => {
      window.titleFrames08.push(f);
      return 99008;
    };
  });
  await stage(page, 1).click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => {
    window.requestAnimationFrame = window.originalRAF08;
    for (const f of window.titleFrames08) f(performance.now());
  });
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 scoped actual product and controls crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 1) await load(page);
    if (n === 3)
      await page
        .locator(".quiz-grid fieldset")
        .first()
        .getByRole("button")
        .first()
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
      .locator(
        n < 3 ? ".tool08-runtime" : n === 3 ? ".quiz-grid" : ".agent-editor",
      )
      .screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-body.png`,
      });
    if (n === 1)
      await page.locator(".tool08-canvas-host").screenshot({
        path: `${out}/${info.project.name}-station2-actual-webgl.png`,
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
    { length: 7 },
    (_, i) => `frontend-observatory.tool0${i + 1}.v1`,
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
    "React Three Fiber候选",
    "动态业务数据需求",
    "记录抽象层级与选型条件",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "station0");
  await load(p, act);
  await select(f(p, "finish"), "sage");
  for (const n of ["切换正面相机", "应用本地库存0", "读取实际3D快照"])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "station1");
  await act(b(p, "下次模块模拟失败"), "fail");
  await act(b(p, "准备或重试3D模块"), "prepare failure");
  await prepared(p);
  await act(b(p, "应用最早模块结果"), "apply failure");
  await act(b(p, "下次模块正常"), "normal");
  await act(b(p, "准备或重试3D模块"), "prepare canceled");
  await prepared(p);
  await act(b(p, "取消本次应用"), "cancel");
  await act(b(p, "准备或重试3D模块"), "new prepare");
  await prepared(p, 2);
  await act(b(p, "应用最早模块结果"), "stale");
  await act(b(p, "应用最早模块结果"), "current");
  await expect(scene(p)).toHaveAttribute("data-state", "ready");
  await act(b(p, "释放本例3D资源"), "release");
  await act(b(p, "完成并继续"), "station2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool08Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool08Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "sample");
  await type(f(p, "context"), " 用户补充静态回退。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(f(p, "agent-draft"), "\n自己的资产预算。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对三维路线、配置数据、资源释放与回退验收。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T08工具专题"), "finish");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T08工具专题进度"), "reset cancel");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T08工具专题进度"), "retain");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T08工具专题进度")).toBeFocused();
  await act(b(p, "重置T08工具专题进度"), "reset");
  await act(b(p, "确认重置T08工具专题"), "confirm");
  await expect(f(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    draft: "",
    context: "",
  });
}
test("real Tab five stations genuine select edits retry clipboard refresh cancel confirm reset preserves41", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool08-full",
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
  const d = (await read(page)).draft;
  await page.reload();
  await directory(page, k.act);
  await expect(f(page, "agent-draft")).toHaveValue(d);
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
  test(`zero keyboard touch full ${reducedMotion} actual3D edits retry refresh reset preserves41`, async ({
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
      window.keys08 = 0;
      addEventListener("keydown", () => window.keys08++);
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
    const d = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(f(p, "agent-draft")).toHaveValue(d);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keys08)).toBe(0);
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
        "Actual taps plus selectOption/fill fixtures, not OS picker/IME/physicaldevice",
    });
    await c.close();
  });
test("T07 exit opens actual T08 ten entries four previews32 numbered and derived roadmap exact", async ({
  page,
}) => {
  await open(page);
  await b(page, "返回T07复习").click();
  await b(page, "继续T08 · Three.js / R3F / Spline").click();
  await expect(f(page, "stage-heading")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(10);
  await expect(nav.locator(".coverage-preview")).toHaveCount(4);
  await expect(nav.getByRole("button", { name: /T09/ })).toHaveCount(0);
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await nav
    .getByRole("button", {
      name: "T08 · Three.js / R3F / Spline · 可学习",
      exact: true,
    })
    .click();
  await page.getByText("路线核对说明与官方来源", { exact: true }).click();
  await page.getByText("查看完整 32 课目录及覆盖标签", { exact: true }).click();
  await expect(page.locator(".full-course-outline")).toContainText(
    "其他4个工具模块尚未作为独立模块制作",
  );
  await expect(page.locator('[data-lesson-id="42"]')).toHaveCount(0);
});
test("375 short viewport real focus and long inert editable brief preserve reading without overflow", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await open(page, 1);
  await load(page);
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool08-short",
      profile: info.project.name,
    });
  await k.act(b(page, "重置侧面相机"), "short real focus");
  await axes(page);
  await page
    .locator(".tool08-canvas-host")
    .screenshot({ path: `${out}/${info.project.name}-short-actual3D.png` });
  await stage(page, 4).click();
  await b(page, "填入项目现状示例（替换本栏）").click();
  await f(page, "context").fill(
    (
      "<script>window.executed08=true</script>" +
      "长资产与动态数据约束".repeat(50)
    ).slice(0, 700),
  );
  await b(page, "生成工具选型说明").click();
  expect(await f(page, "agent-draft").inputValue()).toContain(
    "<script>window.executed08=true</script>",
  );
  expect(await page.evaluate(() => window.executed08)).toBeUndefined();
  await k.seek(f(page, "agent-draft"), "short long actual focus");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await axes(page);
  save(info.project.name + "-short-focus", trace);
});

test("actual native touch pan over3D scrolls page preserves camera and leaves browser gestures enabled", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage();
  await p.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener("observe", (e) => {
      const r = e.detail;
      if (!r.isWebGLRenderer) return;
      const render = r.render.bind(r);
      r.render = (scene, camera) => {
        window.actualProduct08 = { scene, camera };
        return render(scene, camera);
      };
    });
  });
  await open(p, 1);
  await load(p);
  await canvas(p).scrollIntoViewIfNeeded();
  expect(await canvas(p).evaluate((e) => getComputedStyle(e).touchAction)).toBe(
    "auto",
  );
  const actual = () =>
    p.evaluate(() => ({
      camera: window.actualProduct08.camera.position.toArray(),
      color: window.actualProduct08.scene
        .getObjectByName("lamp-shade")
        .material.color.getHexString(),
    }));
  const before = await actual(),
    box = await canvas(p).boundingBox(),
    session = await c.newCDPSession(p),
    x = box.x + box.width * 0.8,
    y = box.y + box.height * 0.8,
    outer = await p.evaluate(() => scrollY);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 8; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - i * 12 }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => p.evaluate(() => scrollY)).toBeGreaterThan(outer);
  const after = await actual();
  expect(after).toEqual(before);
  save(info.project.name + "-actual-touch-pan", {
    outerBefore: outer,
    outerAfter: await p.evaluate(() => scrollY),
    before,
    after,
    actualCDPTouch: true,
    limit: "Browseremulatedtouch, notphysicaldevice orOSpinchstudy",
  });
  await session.detach();
  await c.close();
});
