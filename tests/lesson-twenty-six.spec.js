import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  threeSize,
  cameraPositions,
} from "../src/lesson-twenty-six-content.js";
test.use({
  launchOptions: {
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  },
});
const out = "/tmp/three-acceptance",
  key = "frontend-observatory.lesson26.v1",
  prior = Array.from(
    { length: 25 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".three26-lab"),
  canvas = (p) => p.locator(".three26-wrapper canvas"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十六节学习步骤" })
      .getByRole("button")
      .nth(n);
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(25), "lesson26");
  await expect(p.locator("#three26-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  if (n < 3) await expect(lab(p)).toHaveAttribute("data-state", "ready");
}
function observe() {
  window.threeAudit = {
    revision: null,
    renderers: [],
    latest: null,
    renders: 0,
    disposed: { geometry: 0, material: 0, renderer: 0 },
    frames: [],
    hold: false,
  };
  const seen = new WeakSet();
  window.__THREE_DEVTOOLS__ = new EventTarget();
  window.__THREE_DEVTOOLS__.addEventListener(
    "register",
    (e) => (window.threeAudit.revision = e.detail.revision),
  );
  window.__THREE_DEVTOOLS__.addEventListener("observe", (e) => {
    const r = e.detail;
    if (!r.isWebGLRenderer) return;
    window.threeAudit.renderers.push(r);
    const render = r.render.bind(r),
      dispose = r.dispose.bind(r);
    r.render = (scene, camera) => {
      window.threeAudit.latest = { scene, camera, renderer: r };
      scene.traverse((o) => {
        if (o.isMesh)
          for (const [k, v] of [
            ["geometry", o.geometry],
            ["material", o.material],
          ])
            if (!seen.has(v)) {
              seen.add(v);
              v.addEventListener(
                "dispose",
                () => window.threeAudit.disposed[k]++,
              );
            }
      });
      window.threeAudit.renders++;
      return render(scene, camera);
    };
    r.dispose = () => {
      window.threeAudit.disposed.renderer++;
      return dispose();
    };
  });
  const raf = requestAnimationFrame.bind(window),
    caf = cancelAnimationFrame.bind(window);
  window.threePending = new Set();
  window.requestAnimationFrame = (cb) => {
    let id;
    id = raf((t) => {
      window.threePending.delete(id);
      if (window.threeAudit.hold) window.threeAudit.frames.push(cb);
      else cb(t);
    });
    window.threePending.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    window.threePending.delete(id);
    caf(id);
  };
}
test.beforeEach(async ({ page }) => page.addInitScript(observe));
async function snapshot(p) {
  return canvas(p).evaluate((e) => {
    const { scene, camera, renderer } = window.threeAudit.latest,
      mesh = scene.getObjectByName("教学立方体"),
      light = scene.getObjectByName("主光"),
      gl = renderer.getContext(),
      ext = gl.getExtension("WEBGL_debug_renderer_info"),
      bytes = new Uint8Array(e.width * e.height * 4);
    gl.readPixels(0, 0, e.width, e.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    let hash = 2166136261;
    for (const v of bytes) hash = Math.imul(hash ^ v, 16777619) >>> 0;
    const rect = e.getBoundingClientRect();
    return {
      revision: window.threeAudit.revision,
      renderer: renderer.isWebGLRenderer,
      version: gl.getParameter(gl.VERSION),
      driver: gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
      scene: scene.isScene,
      mesh: mesh.isMesh,
      geometry: mesh.geometry.type,
      material: mesh.material.type,
      rotation: mesh.rotation.y,
      scale: mesh.scale.toArray(),
      roughness: mesh.material.roughness,
      metalness: mesh.material.metalness,
      camera: camera.position.toArray(),
      isPerspective: camera.isPerspectiveCamera,
      aspect: camera.aspect,
      projection: camera.projectionMatrix.toArray(),
      light: light.intensity,
      triangles: renderer.info.render.triangles,
      calls: renderer.info.render.calls,
      width: e.width,
      height: e.height,
      css: { width: rect.width, height: rect.height },
      dpr: devicePixelRatio,
      hash,
      alpha: bytes[3],
      draws: Number(e.dataset.draws),
      children: e.childElementCount,
    };
  });
}
async function changed(p, a) {
  await expect.poll(async () => (await snapshot(p)).hash).not.toBe(a.hash);
  return snapshot(p);
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
function save(n, v) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${n}.json`, JSON.stringify(v, null, 2));
}
test("pixel budget caps density dimensions while preserving aspect", () => {
  expect(threeSize(400, 240, 2)).toEqual({ width: 600, height: 360 });
  expect(threeSize(400, 240, 3, true)).toEqual({ width: 300, height: 180 });
  expect(threeSize(3000, 1800, 3).width).toBe(1024);
  expect(threeSize(400, 240, 2, false, 128).width).toBe(128);
});
test("lazy real Three module release01–29 and virtualization30 remains preview, requests local", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-twenty-six/.test(u))).toBe(false);
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  expect(urls.some((u) => /lesson-twenty-six-engine-/.test(u))).toBe(true);
  expect(urls.filter((u) => !u.startsWith("http://127.0.0.1:4173/"))).toEqual(
    [],
  );
  await expect(page.locator(".available-dot")).toHaveCount(29);
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(29).click();
  await expect(
    page.getByRole("heading", { name: "长列表虚拟化", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toContainText("尚未制作");
});
test("real Three revision renderer scene mesh material camera light and pixels change independently", async ({
  page,
}, info) => {
  await open(page);
  const a = await snapshot(page);
  expect(a.revision).toBe("186");
  expect(a.driver).toMatch(/SwiftShader/i);
  expect(a.version).toContain("WebGL 2");
  expect(a.renderer && a.scene && a.mesh && a.isPerspective).toBe(true);
  expect(a.geometry).toBe("BoxGeometry");
  expect(a.material).toBe("MeshStandardMaterial");
  expect(a.calls).toBe(2);
  expect(a.triangles).toBe(14);
  expect(a.children).toBe(0);
  expect(a.alpha).toBe(255);
  await btn(page, "对象旋转30度").click();
  const b = await changed(page, a);
  expect(b.rotation).toBeCloseTo(Math.PI / 6);
  expect(b.camera).toEqual(a.camera);
  await btn(page, "放大对象").click();
  const c = await changed(page, b);
  expect(c.scale).toEqual([1.25, 1.25, 1.25]);
  await btn(page, "正面视角").click();
  const d = await changed(page, c);
  expect(d.camera).toEqual(cameraPositions.front);
  expect(d.rotation).toBe(b.rotation);
  await btn(page, "柔和主光").click();
  const e = await changed(page, d);
  expect(e.light).toBe(0.6);
  await btn(page, "切换金属感材质").click();
  const f = await changed(page, e);
  expect(f.metalness).toBe(0.65);
  await btn(page, "重置相机").click();
  const g = await changed(page, f);
  expect(g.camera).toEqual(cameraPositions.side);
  await btn(page, "恢复对象").click();
  const h = await changed(page, g);
  expect(h.scale).toEqual([1, 1, 1]);
  expect(h.rotation).toBe(0);
  save(`pixels-${info.project.name}`, {
    softwareWebGL: true,
    hardwarePerformanceTest: false,
    samples: [a, b, c, d, e, f, g, h],
  });
});
test("real container aspect resize updates projection and bounded DPR2 buffers without losing parameters", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
      deviceScaleFactor: 2,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage();
  await p.addInitScript(observe);
  await open(p);
  await btn(p, "对象旋转30度").click();
  await expect
    .poll(async () => (await snapshot(p)).rotation)
    .toBeCloseTo(Math.PI / 6);
  let a = await snapshot(p);
  expect(a.width).toBe(Math.floor(Math.min(a.css.width * 1.5, 1024)));
  await p
    .getByLabel("低分辨率预算：最多0.75倍CSS像素", { exact: true })
    .check();
  await expect
    .poll(async () => (await snapshot(p)).width)
    .toBe(Math.floor(a.css.width * 0.75));
  await p
    .locator(".three26-wrapper")
    .evaluate((e) => (e.style.aspectRatio = "1 / 1"));
  await expect.poll(async () => (await snapshot(p)).aspect).toBeCloseTo(1, 2);
  let b = await snapshot(p);
  expect(b.projection).not.toEqual(a.projection);
  expect(b.rotation).toBe(a.rotation);
  await p.setViewportSize({ width: 375, height: 620 });
  await expect.poll(async () => (await snapshot(p)).width).toBeLessThan(375);
  b = await snapshot(p);
  expect(b.rotation).toBe(a.rotation);
  save(`dpr-resize-${info.project.name}`, {
    a,
    b,
    containerChange: "Real CSS square layout fixture, not OS zoom",
    softwareRenderer: true,
  });
  await c.close();
});
test("WebGL2 unavailable is an honest fallback, retry renders real scene", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.denyThree = true;
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...a) {
      return t === "webgl2" && window.denyThree
        ? null
        : get.call(this, t, ...a);
    };
  });
  await page.goto("/");
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-state", "failed");
  await expect(page.locator(".three26-status")).toContainText("WebGL 2不可用");
  await expect(page.locator(".three26-fallback")).toContainText("不是真实3D");
  await page.evaluate(() => (window.denyThree = false));
  await btn(page, "重试3D绘制").click();
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  expect((await snapshot(page)).renderer).toBe(true);
});
test("actual module request failure offers explicit page reload then real retry after recovery", async ({
  page,
}) => {
  const route = "**/lesson-twenty-six-engine-*.js";
  await page.route(route, (r) => r.abort());
  await page.goto("/");
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-state", "failed");
  await expect(page.locator(".three26-status")).toContainText("模块加载失败");
  expect(await page.evaluate(() => window.threeAudit.renderers.length)).toBe(0);
  await page.unroute(route);
  await btn(page, "重新加载页面重试模块").click();
  await expect(page.locator("#stage-heading")).toBeVisible();
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  expect((await snapshot(page)).renderer).toBe(true);
});
test("delayed module completion after leaving creates no renderer in the old lesson", async ({
  page,
}) => {
  let held;
  await page.route("**/lesson-twenty-six-engine-*.js", (r) => {
    held = r;
  });
  await page.goto("/");
  await directory(page);
  await expect.poll(() => Boolean(held)).toBe(true);
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(0).click();
  await expect(page.locator("#stage-heading")).toBeVisible();
  await held.continue();
  await expect
    .poll(() => page.evaluate(() => window.threeAudit.revision))
    .toBe("186");
  expect(await page.evaluate(() => window.threeAudit.renderers.length)).toBe(0);
  await page.unroute("**/lesson-twenty-six-engine-*.js");
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
});
test("hidden during delayed loading then visible before completion still builds only latest live scene", async ({
  page,
}) => {
  let held;
  await page.route("**/lesson-twenty-six-engine-*.js", (r) => {
    held = r;
  });
  await page.goto("/");
  await directory(page);
  await expect.poll(() => Boolean(held)).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await btn(page, "放大对象").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await held.continue();
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  expect((await snapshot(page)).scale).toEqual([1.25, 1.25, 1.25]);
});
test("real context loss restoration reconstructs disposed scene and retains latest camera and light", async ({
  page,
}, info) => {
  await open(page);
  await btn(page, "正面视角").click();
  await expect
    .poll(async () => (await snapshot(page)).camera)
    .toEqual(cameraPositions.front);
  await page.evaluate(() => {
    window.threeLoss = window.threeAudit.latest.renderer
      .getContext()
      .getExtension("WEBGL_lose_context");
    window.threeLoss.loseContext();
  });
  await expect(lab(page)).toHaveAttribute("data-state", "lost");
  await btn(page, "柔和主光").click();
  await page.evaluate(() => window.threeLoss.restoreContext());
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  const a = await snapshot(page);
  expect(a.camera).toEqual(cameraPositions.front);
  expect(a.light).toBe(0.6);
  save(`restored-${info.project.name}`, {
    a,
    fixture:
      "Real WEBGL_lose_context extension under software WebGL, not physical device loss",
  });
});
test("hidden disposes actual geometry material renderer and rejects late frames; idle and unmount stay clean", async ({
  page,
}, info) => {
  await open(page);
  const draws = await page.evaluate(() => window.threeAudit.renders);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 100)));
  expect(await page.evaluate(() => window.threeAudit.renders)).toBe(draws);
  await page.evaluate(() => (window.threeAudit.hold = true));
  await btn(page, "对象旋转30度").click();
  await expect
    .poll(() => page.evaluate(() => window.threeAudit.frames.length))
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.threeAudit.frames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(lab(page)).toHaveAttribute("data-state", "suspended");
  expect(await canvas(page).getAttribute("width")).toBe("1");
  const hidden = await page.evaluate(() => ({
    ...window.threeAudit.disposed,
    renderers: window.threeAudit.renderers.length,
    memory: window.threeAudit.latest.renderer.info.memory.geometries,
  }));
  expect(hidden.geometry).toBe(hidden.renderers * 2);
  expect(hidden.material).toBe(hidden.renderers * 2);
  expect(hidden.renderer).toBe(hidden.renderers);
  expect(hidden.memory).toBe(0);
  await page.evaluate(() => {
    window.threeAudit.hold = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  expect((await snapshot(page)).rotation).toBeCloseTo(Math.PI / 6);
  await stage(page, 3).click();
  const disposed = await page.evaluate(() => ({
    ...window.threeAudit.disposed,
    renderers: window.threeAudit.renderers.length,
    lost: window.threeAudit.latest.renderer.getContext().isContextLost(),
  }));
  expect(disposed.geometry).toBe(disposed.renderers * 2);
  expect(disposed.material).toBe(disposed.renderers * 2);
  expect(disposed.renderer).toBe(disposed.renderers);
  expect(disposed.lost).toBe(true);
  save(`cleanup-${info.project.name}`, {
    hidden,
    disposed,
    fixture:
      "Synthetic document.hidden; actual Three dispose events/memory and real optional context loss on unmount",
  });
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 4) await btn(page, "生成Three.js场景指令").click();
    await axeCheck(page);
    mkdirSync(out, { recursive: true });
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
    await (
      n < 3
        ? page.locator(".three26-wrapper")
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
  await a("对象旋转30度");
  await a("记录五个角色");
  await a("填入标题示例");
  await edit(p.getByLabel("场景标题", { exact: true }), "caption");
  await next();
  await a("正面视角");
  await a("柔和主光");
  await a("重置相机");
  await next();
  await toggle(
    p.getByLabel("低分辨率预算：最多0.75倍CSS像素", { exact: true }),
    "low",
  );
  await toggle(
    p.getByLabel("模拟3D不可用：文字与CSS回退", { exact: true }),
    "fallback",
  );
  await expect(p.locator(".three26-fallback")).toBeVisible();
  await a("读取场景与渲染预算");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成Three.js场景指令");
  const draft = p.getByLabel("可编辑的 Three.js场景 Agent 指令");
  await expect(draft).toHaveValue(
    /真实机制与对象.*视角与交互.*材质与光照.*加载失败与回退.*性能与尺寸.*清理与减少动态.*验收/s,
  );
  await edit(draft, "draft");
  await a("复制Three.js场景指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 对象、视角、材质、交互、加载与预算。", {
      exact: true,
    }),
    "review",
  );
  await a("完成第二十六节");
  await expect(p.locator(".lesson-twenty-six .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-six .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十六节进度");
  await a("保留第二十六节进度");
  await expect(p.locator(".lesson-twenty-six .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十六节进度");
  await a("确认重置第二十六节");
  await expect(p.locator("#three26-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-six .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  return done;
}
test("full actual Tab scene flow wrong retry edits copy refresh cancel confirm reset preserves25", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson26",
      profile: info.project.name,
    }),
    done = await flow(page, act, toggle, async (f, n) => {
      await seek(f, n);
      await page.keyboard.press("End");
      await page.keyboard.type(
        n === "caption"
          ? " edited"
          : "\nReview: camera, material and fallback.",
      );
    });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  save(`keyboard-${info.project.name}`, { passed: true, trace, done });
});
for (const mode of ["normal", "reduce", "unavailable"])
  test(`full zero keyboard touch ${mode} scene flow preserves25`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
        baseURL: "http://127.0.0.1:4173",
      }),
      p = await c.newPage();
    await p.addInitScript(observe);
    await p.addInitScript(() => {
      window.threeKeys = [];
      for (const t of ["keydown", "keyup"])
        addEventListener(t, (e) => window.threeKeys.push(e.key));
    });
    if (mode === "unavailable")
      await p.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (t, ...a) {
          return t === "webgl2" ? null : get.call(this, t, ...a);
        };
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
            ? "触屏编辑：自制几何场景"
            : (await f.inputValue()) + "\n触屏核对视角与清理。",
        );
      });
    expect(await p.evaluate(() => window.threeKeys)).toEqual([]);
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    save(`touch-${mode}-${info.project.name}`, {
      passed: true,
      trace,
      done,
      keys: [],
    });
    await c.close();
  });
test("rapid parameters coalesce latest scene, live reduce and delayed title callback retain new real Tab focus", async ({
  page,
}, info) => {
  await open(page);
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const draws = await page.evaluate(() => window.threeAudit.renders);
  await page.evaluate(() => (window.threeAudit.hold = true));
  await btn(page, "对象旋转30度").click();
  await expect
    .poll(() => page.evaluate(() => window.threeAudit.frames.length))
    .toBeGreaterThan(0);
  for (let i = 0; i < 4; i++) await btn(page, "对象旋转30度").click();
  await btn(page, "俯视角").click();
  await btn(page, "柔和主光").click();
  expect(await page.evaluate(() => window.threeAudit.renders)).toBe(draws);
  await page.evaluate(() => {
    window.threeAudit.hold = false;
    window.threeAudit.frames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect
    .poll(() => page.evaluate(() => window.threeAudit.renders))
    .toBe(draws + 1);
  const a = await snapshot(page);
  expect(a.rotation).toBeCloseTo((Math.PI * 5) / 6);
  expect(a.camera).toEqual(cameraPositions.top);
  expect(a.light).toBe(0.6);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".three26-metrics")).toContainText(
    "系统减少动态已开启",
  );
  await btn(page, "重置相机").click();
  await expect
    .poll(async () => (await snapshot(page)).camera)
    .toEqual(cameraPositions.side);
  await page.evaluate(() => (window.threeAudit.hold = true));
  await stage(page, 0).click();
  await expect
    .poll(() => page.evaluate(() => window.threeAudit.frames.length))
    .toBeGreaterThan(0);
  const trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson26-late-heading",
      profile: info.project.name,
    });
  await seek(btn(page, "放大对象"), "newer object focus");
  await page.evaluate(() => {
    window.threeAudit.hold = false;
    window.threeAudit.frames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(btn(page, "放大对象")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".three26-metrics")).toContainText(
    "系统未要求减少动态",
  );
  save(`rapid-${info.project.name}`, { passed: true, trace, a });
});
test("actual material shader failure falls back and retries with clean resources", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.badThreeShader = true;
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...a) {
      const gl = get.call(this, t, ...a);
      if (t === "webgl2" && gl && !gl.__faulted) {
        gl.__faulted = true;
        const source = gl.shaderSource.bind(gl);
        gl.shaderSource = (s, text) =>
          source(
            s,
            window.badThreeShader ? text + " invalid GLSL input" : text,
          );
      }
      return gl;
    };
  });
  await page.goto("/");
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-state", "failed");
  await expect(page.locator(".three26-status")).toContainText(
    "材质着色器编译或链接失败",
  );
  await page.evaluate(() => (window.badThreeShader = false));
  await btn(page, "重试3D绘制").click();
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  expect((await snapshot(page)).triangles).toBe(14);
});
test("live DPR override and missing optional loss extension retain projection and dispose all Three resources", async ({
  page,
}, info) => {
  await open(page);
  const a = await snapshot(page);
  await page.evaluate(() => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => (await snapshot(page)).width)
    .toBe(Math.floor(Math.min(a.css.width * 1.5, 1024)));
  const b = await snapshot(page);
  expect(b.camera).toEqual(a.camera);
  expect(b.aspect).toBe(a.aspect);
  await page.evaluate(() => {
    const gl = window.threeAudit.latest.renderer.getContext(),
      get = gl.getExtension.bind(gl);
    gl.getExtension = (n) => (n === "WEBGL_lose_context" ? null : get(n));
  });
  await stage(page, 3).click();
  const disposed = await page.evaluate(() => ({
    disposed: window.threeAudit.disposed,
    renderers: window.threeAudit.renderers.length,
    memory: window.threeAudit.latest.renderer.info.memory.geometries,
    lost: window.threeAudit.latest.renderer.getContext().isContextLost(),
    program: window.threeAudit.latest.renderer
      .getContext()
      .getParameter(
        window.threeAudit.latest.renderer.getContext().CURRENT_PROGRAM,
      ),
  }));
  expect(disposed.disposed.renderer).toBe(disposed.renderers);
  expect(disposed.disposed.geometry).toBe(disposed.renderers * 2);
  expect(disposed.disposed.material).toBe(disposed.renderers * 2);
  expect(disposed.memory).toBe(0);
  expect(disposed.lost).toBe(false);
  expect(disposed.program).toBe(null);
  save(`optional-dpr-${info.project.name}`, {
    a,
    b,
    disposed,
    fixture:
      "DPR override/resize and optional extension unavailable; not physical display switch",
  });
});
test("native touch pan over scene keeps outer scrolling and does not change camera or object", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage();
  await p.addInitScript(observe);
  await open(p);
  await canvas(p).scrollIntoViewIfNeeded();
  const a = await snapshot(p),
    b = await canvas(p).boundingBox(),
    session = await c.newCDPSession(p),
    x = b.x + b.width * 0.8,
    y = b.y + b.height * 0.8,
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
  const after = await snapshot(p);
  expect(after.camera).toEqual(a.camera);
  expect(after.rotation).toBe(a.rotation);
  save(`touch-pan-${info.project.name}`, {
    passed: true,
    outerBefore: outer,
    outerAfter: await p.evaluate(() => scrollY),
    unchangedCamera: true,
    actualCDPTouch: true,
  });
  await session.detach();
  await c.close();
});
test("copy success late reset error and corrupt unavailable storage remain scoped to26", async ({
  page,
}) => {
  await open(page, 4);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.threeCopied = t) },
    }),
  );
  await btn(page, "生成Three.js场景指令").click();
  const draft = page.getByLabel("可编辑的 Three.js场景 Agent 指令");
  await draft.fill((await draft.inputValue()) + "\n明确相机重置。");
  await btn(page, "复制Three.js场景指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.threeCopied)).toContain(
    "明确相机重置。",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((_, reject) => (window.rejectThreeCopy = reject)),
      },
    }),
  );
  await btn(page, "复制Three.js场景指令").click();
  await btn(page, "重置第二十六节进度").click();
  await btn(page, "确认重置第二十六节").click();
  await page.evaluate(() => window.rejectThreeCopy(Error("late")));
  await expect(page.locator("#three26-stage-heading")).toBeFocused();
  await expect(page.locator(".copy-feedback")).toHaveCount(0);
  await page.evaluate((k) => localStorage.setItem(k, "bad-json"), key);
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-twenty-six .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await page.addInitScript(() => {
    for (const n of ["getItem", "setItem", "removeItem"])
      Storage.prototype[n] = () => {
        throw Error("unavailable");
      };
  });
  await page.reload();
  await directory(page);
  await btn(page, "放大对象").click();
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  await expect
    .poll(async () => (await snapshot(page)).scale)
    .toEqual([1.25, 1.25, 1.25]);
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});
