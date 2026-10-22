import { assertRemainingPlans32 } from "./catalog-boundary.js";
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import { glSize } from "../src/lesson-twenty-five-content.js";
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
const out = "/tmp/shader-acceptance",
  key = "frontend-observatory.lesson25.v1",
  prior = Array.from(
    { length: 24 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  lab = (p) => p.locator(".gl25-lab"),
  canvas = (p) => p.locator(".gl25-wrapper canvas"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十五节学习步骤" })
      .getByRole("button")
      .nth(n);
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(24), "lesson25");
  await expect(p.locator("#gl25-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  if (n < 3) await expect(lab(p)).toHaveAttribute("data-state", "ready");
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
async function sample(p) {
  return canvas(p).evaluate((e) => {
    const gl = e.getContext("webgl"),
      program = gl.getParameter(gl.CURRENT_PROGRAM),
      u = {};
    for (const n of [
      "u_amp",
      "u_frequency",
      "u_phase",
      "u_center",
      "u_resolution",
    ]) {
      const v = gl.getUniform(program, gl.getUniformLocation(program, n));
      u[n] = typeof v === "number" ? v : [...v];
    }
    const bytes = new Uint8Array(e.width * e.height * 4);
    gl.readPixels(0, 0, e.width, e.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    let hash = 2166136261;
    for (let i = 0; i < bytes.length; i++)
      hash = Math.imul(hash ^ bytes[i], 16777619) >>> 0;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      u,
      hash,
      width: e.width,
      height: e.height,
      css: e.getBoundingClientRect().toJSON(),
      dpr: devicePixelRatio,
      alpha: bytes[3],
      renderer: gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
      program: gl.getProgramParameter(program, gl.LINK_STATUS),
      children: e.childElementCount,
      draws: Number(e.dataset.draws),
    };
  });
}
async function changed(p, before) {
  await expect.poll(async () => (await sample(p)).hash).not.toBe(before.hash);
  return sample(p);
}
function save(name, x) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${name}.json`, JSON.stringify(x, null, 2));
}
function instrument() {
  const get = HTMLCanvasElement.prototype.getContext;
  window.glAudit = {
    created: { shader: 0, program: 0, buffer: 0 },
    deleted: { shader: 0, program: 0, buffer: 0 },
    draws: 0,
    frames: [],
    hold: false,
    context: null,
    handles: [],
  };
  const raf = requestAnimationFrame.bind(window),
    caf = cancelAnimationFrame.bind(window);
  window.glPending = new Set();
  window.requestAnimationFrame = (cb) => {
    let id;
    id = raf((t) => {
      window.glPending.delete(id);
      if (window.glAudit.hold) window.glAudit.frames.push(cb);
      else cb(t);
    });
    window.glPending.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    window.glPending.delete(id);
    caf(id);
  };
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const gl = get.call(this, type, ...args);
    if (type === "webgl" && gl && !gl.__audited) {
      gl.__audited = true;
      window.glAudit.context = gl;
      window.glAudit.handles = [];
      for (const [k, suffix] of [
        ["shader", "Shader"],
        ["program", "Program"],
        ["buffer", "Buffer"],
      ]) {
        for (const [prefix, bucket] of [
          ["create", "created"],
          ["delete", "deleted"],
        ]) {
          const n = prefix + suffix,
            fn = gl[n].bind(gl);
          gl[n] = (...args) => {
            if (prefix === "create" || args[0]) window.glAudit[bucket][k]++;
            const result = fn(...args);
            if (prefix === "create" && result)
              window.glAudit.handles.push({ gl, handle: result, suffix });
            return result;
          };
        }
      }
      const draw = gl.drawArrays.bind(gl);
      gl.drawArrays = (...args) => {
        window.glAudit.draws++;
        return draw(...args);
      };
    }
    return gl;
  };
}
test("budget math caps DPR dimensions and preserves aspect ratio", () => {
  expect(glSize(400, 240, 3)).toEqual({
    width: 600,
    height: 360,
    density: 1.5,
  });
  expect(glSize(400, 240, 3, true)).toEqual({
    width: 300,
    height: 180,
    density: 0.75,
  });
  expect(glSize(3000, 1800, 4).width).toBe(1024);
  expect(glSize(400, 240, 2, false, 128).width).toBe(128);
});
test("lazy release01–32 only, numbered32 opens with tool plans with local requests", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-twenty-five-.*\.js/.test(u))).toBe(false);
  await directory(page);
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  expect(urls.some((u) => /lesson-twenty-five-.*\.js/.test(u))).toBe(true);
  await expect(page.locator(".available-dot")).toHaveCount(32);
  expect(urls.filter((u) => !u.startsWith("http://127.0.0.1:4173/"))).toEqual(
    [],
  );
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await btn(page, "☰ 课程").click();
  await nav.getByRole("button").nth(31).click();
  await expect(
    page.getByRole("heading", { name: "Infinite Canvas.", exact: true }),
  ).toBeVisible();
  await assertRemainingPlans32(page, expect);
});
test("real linked shaders uniform uploads and readPixels change for independent parameters", async ({
  page,
}, info) => {
  await open(page);
  let a = await sample(page);
  expect(a.program).toBe(true);
  expect(a.alpha).toBe(255);
  expect(a.children).toBe(0);
  expect(a.renderer).toMatch(/SwiftShader/i);
  await btn(page, "强度0%").click();
  let b = await changed(page, a);
  expect(b.u.u_amp).toBe(0);
  await btn(page, "强度75%").click();
  let c = await changed(page, b);
  expect(c.u.u_amp).toBeCloseTo(0.75);
  await btn(page, "下一个静态采样").click();
  let d = await changed(page, c);
  expect(d.u.u_phase).toBeCloseTo(Math.PI / 3);
  await btn(page, "切换波纹密度").click();
  let e = await changed(page, d);
  expect(e.u.u_frequency).toBe(10);
  await btn(page, "中心偏左").click();
  let f = await changed(page, e);
  expect(f.u.u_center).toEqual([0.25, 0.5]);
  save(`pixels-${info.project.name}`, {
    softwareRenderer: true,
    hardwarePerformanceTest: false,
    samples: [a, b, c, d, e, f],
  });
});
test("real pointer center after page scroll and resize uses current CSS rectangle; cancel does not move", async ({
  page,
}) => {
  await open(page);
  await page.setViewportSize({ width: 375, height: 620 });
  await canvas(page).scrollIntoViewIfNeeded();
  const box = await canvas(page).boundingBox(),
    a = await sample(page);
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.25);
  const b = await changed(page, a);
  expect(b.u.u_center[0]).toBeCloseTo(0.75, 1);
  expect(b.u.u_center[1]).toBeCloseTo(0.75, 1);
  await canvas(page).dispatchEvent("pointerdown", {
    isPrimary: true,
    button: 0,
    pointerId: 9,
    clientX: 10,
    clientY: 10,
  });
  await canvas(page).dispatchEvent("pointercancel", { pointerId: 9 });
  await canvas(page).dispatchEvent("pointerup", {
    pointerId: 9,
    clientX: 20,
    clientY: 20,
  });
  expect((await sample(page)).u.u_center).toEqual(b.u.u_center);
});
test("DPR2 backing budget low quality and resize preserve uniforms and real pixels", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
      deviceScaleFactor: 2,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage();
  await open(p);
  await btn(p, "强度75%").click();
  await expect.poll(async () => (await sample(p)).u.u_amp).toBe(0.75);
  let a = await sample(p);
  expect(a.width).toBe(Math.floor(Math.min(a.css.width * 1.5, 1024)));
  await p
    .getByLabel("低分辨率预算：最多0.75倍CSS像素", { exact: true })
    .check();
  await expect
    .poll(async () => (await sample(p)).width)
    .toBe(Math.floor(a.css.width * 0.75));
  await p.setViewportSize({ width: 375, height: 620 });
  await expect.poll(async () => (await sample(p)).width).toBeLessThan(375);
  const b = await sample(p);
  expect(b.u.u_amp).toBe(0.75);
  expect(b.u.u_resolution).toEqual([b.width, b.height]);
  save(`dpr2-${info.project.name}`, { a, b, softwareRenderer: true });
  await c.close();
});
for (const fault of ["context", "compile", "link"])
  test(`actual ${fault} failure shows honest CSS fallback and retry rebuilds resources`, async ({
    page,
  }) => {
    await page.addInitScript((fault) => {
      window.fault = fault;
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, ...args) {
        if (t === "webgl" && window.fault === "context") return null;
        const gl = get.call(this, t, ...args);
        if (t === "webgl" && gl && !gl.__faulted) {
          gl.__faulted = true;
          const source = gl.shaderSource.bind(gl),
            link = gl.linkProgram.bind(gl);
          gl.shaderSource = (s, text) =>
            source(
              s,
              window.fault === "compile"
                ? text + " invalid shader source"
                : text,
            );
          gl.linkProgram = (p) => {
            if (window.fault === "link") {
              const s = gl
                .getAttachedShaders(p)
                .find(
                  (s) =>
                    gl.getShaderParameter(s, gl.SHADER_TYPE) ===
                    gl.FRAGMENT_SHADER,
                );
              gl.detachShader(p, s);
            }
            link(p);
          };
        }
        return gl;
      };
    }, fault);
    await page.goto("/");
    await directory(page);
    await expect(lab(page)).toHaveAttribute("data-state", "failed");
    await expect(page.locator(".gl25-fallback")).toContainText(
      "不是shader结果",
    );
    await expect(page.locator(".gl25-status")).toContainText(
      { context: "上下文不可用", compile: "编译失败", link: "链接失败" }[fault],
    );
    await page.evaluate(() => (window.fault = null));
    await btn(page, "重试WebGL绘制").click();
    await expect(lab(page)).toHaveAttribute("data-state", "ready");
    expect((await sample(page)).program).toBe(true);
  });
test("real WEBGL_lose_context loss/restoration reconstructs program and keeps latest uniforms", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await btn(page, "强度75%").click();
  await expect.poll(async () => (await sample(page)).u.u_amp).toBe(0.75);
  await canvas(page).evaluate((e) => {
    window.loss = e.getContext("webgl").getExtension("WEBGL_lose_context");
    window.loss.loseContext();
  });
  await expect(lab(page)).toHaveAttribute("data-state", "lost");
  await btn(page, "中心偏右").click();
  await expect(lab(page)).toHaveAttribute("data-state", "failed");
  await page.evaluate(() => window.loss.restoreContext());
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  const a = await sample(page);
  expect(a.u.u_amp).toBe(0.75);
  expect(a.u.u_center).toEqual([0.75, 0.5]);
  save(`restored-${info.project.name}`, {
    ...a,
    fixture:
      "real WEBGL_lose_context extension in software Chromium; not physical GPU failure",
  });
});
test("hidden releases resources, stale callback ignored, return rebuilds; idle has no loop and unmount disposes", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  const initial = await page.evaluate(() => window.glAudit.draws);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 100)));
  expect(await page.evaluate(() => window.glAudit.draws)).toBe(initial);
  await page.evaluate(() => (window.glAudit.hold = true));
  await btn(page, "强度75%").click();
  await expect
    .poll(() => page.evaluate(() => window.glAudit.frames.length))
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.glAudit.frames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(lab(page)).toHaveAttribute("data-state", "suspended");
  expect(await canvas(page).getAttribute("width")).toBe("1");
  const hidden = await page.evaluate(() => ({
    created: window.glAudit.created,
    deleted: window.glAudit.deleted,
    draws: window.glAudit.draws,
    live: window.glAudit.handles.filter((x) => x.gl["is" + x.suffix](x.handle))
      .length,
  }));
  expect(hidden.deleted).toEqual(hidden.created);
  expect(hidden.live).toBe(0);
  await page.evaluate(() => {
    window.glAudit.hold = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(lab(page)).toHaveAttribute("data-state", "ready");
  expect((await sample(page)).u.u_amp).toBe(0.75);
  await stage(page, 3).click();
  const disposed = await page.evaluate(() => ({
    created: window.glAudit.created,
    deleted: window.glAudit.deleted,
    lost: window.glAudit.context.isContextLost(),
  }));
  expect(disposed.deleted).toEqual(disposed.created);
  expect(disposed.lost).toBe(true);
  save(`cleanup-${info.project.name}`, {
    hidden,
    disposed,
    fixture:
      "synthetic document.hidden plus real deleteShader/deleteProgram/deleteBuffer and extension context release",
  });
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 and local crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 4) await btn(page, "生成WebGL效果指令").click();
    await axeCheck(page);
    mkdirSync(out, { recursive: true });
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station${n + 1}-${info.project.name}.png` });
    await (
      n < 3
        ? page.locator(".gl25-wrapper")
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
  await a("强度75%");
  await a("下一个静态采样");
  await a("填入标题示例");
  await edit(p.getByLabel("效果标题", { exact: true }), "caption");
  await next();
  await a("中心偏右");
  await a("记录Canvas、WebGL与3D区别");
  await next();
  await toggle(
    p.getByLabel("低分辨率预算：最多0.75倍CSS像素", { exact: true }),
    "low",
  );
  await toggle(
    p.getByLabel("模拟不支持：CSS静态回退", { exact: true }),
    "fallback",
  );
  await expect(pageFallback(p)).toBeVisible();
  await a("读取真实上下文与预算");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成WebGL效果指令");
  const draft = p.getByLabel("可编辑的 WebGL效果 Agent 指令");
  await expect(draft).toHaveValue(
    /效果目标与技术边界.*参数与输入.*性能预算.*错误与恢复.*生命周期与减少动态.*验收/s,
  );
  await edit(draft, "draft");
  await a("复制WebGL效果指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 效果、uniform、预算、回退与清理。", { exact: true }),
    "review",
  );
  await a("完成第二十五节");
  await expect(p.locator(".lesson-twenty-five .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-five .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十五节进度");
  await a("保留第二十五节进度");
  await expect(p.locator(".lesson-twenty-five .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十五节进度");
  await a("确认重置第二十五节");
  await expect(p.locator("#gl25-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-five .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  return done;
}
const pageFallback = (p) => p.locator(".gl25-fallback");
test("full actual Tab shader flow wrong retry edits copy refresh cancel confirm reset preserves24", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson25",
      profile: info.project.name,
    }),
    done = await flow(page, act, toggle, async (f, n) => {
      await seek(f, n);
      await page.keyboard.press("End");
      await page.keyboard.type(
        n === "caption"
          ? " edited"
          : "\nReview: shader uniforms and honest fallback.",
      );
    });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  save(`keyboard-${info.project.name}`, { passed: true, trace, done });
});
for (const reduced of [false, true, "unavailable"])
  test(`full zero keyboard touch ${reduced === "unavailable" ? "unavailable" : reduced ? "system reduce" : "normal"} flow fallback retry refresh reset preserves24`, async ({
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
    if (reduced === "unavailable")
      await p.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (t, ...a) {
          return t === "webgl" ? null : get.call(this, t, ...a);
        };
      });
    await p.addInitScript(() => {
      window.glKeys = [];
      for (const t of ["keydown", "keyup"])
        addEventListener(t, (e) => window.glKeys.push(e.key));
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
            ? "触屏编辑：二维shader"
            : (await f.inputValue()) + "\n触屏核对参数与回退。",
        );
      });
    expect(await p.evaluate(() => window.glKeys)).toEqual([]);
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    save(
      `touch-${reduced === "unavailable" ? "unavailable" : reduced ? "reduced" : "normal"}-${info.project.name}`,
      {
        passed: true,
        trace,
        done,
        keys: [],
      },
    );
    await c.close();
  });
test("live reduced motion and rapid reset retain static sampling and focused enabled controls", async ({
  page,
}) => {
  await open(page);
  await btn(page, "下一个静态采样").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".gl25-metrics")).toContainText(
    "系统减少动态已开启",
  );
  await btn(page, "强度75%").click();
  await expect(btn(page, "强度75%")).toBeFocused();
  await expect.poll(async () => (await sample(page)).u.u_amp).toBe(0.75);
  await btn(page, "恢复效果参数").click();
  await expect.poll(async () => (await sample(page)).u.u_amp).toBeCloseTo(0.45);
  await expect(btn(page, "恢复效果参数")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".gl25-metrics")).toContainText(
    "系统未要求减少动态",
  );
});
test("rapid input coalesces latest uniforms, live DPR resize obeys cap, and delayed navigation does not steal real Tab focus", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const before = await page.evaluate(() => window.glAudit.draws);
  await page.evaluate(() => (window.glAudit.hold = true));
  await btn(page, "强度75%").click();
  await expect
    .poll(() => page.evaluate(() => window.glAudit.frames.length))
    .toBeGreaterThan(0);
  for (let i = 0; i < 8; i++) await btn(page, "下一个静态采样").click();
  await btn(page, "中心偏左").click();
  expect(await page.evaluate(() => window.glAudit.draws)).toBe(before);
  await page.evaluate(() => {
    window.glAudit.hold = false;
    window.glAudit.frames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect
    .poll(() => page.evaluate(() => window.glAudit.draws))
    .toBe(before + 1);
  let a = await sample(page);
  expect(a.u.u_amp).toBe(0.75);
  expect(a.u.u_center).toEqual([0.25, 0.5]);
  await page.evaluate(() => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => (await sample(page)).width)
    .toBe(Math.floor(Math.min(a.css.width * 1.5, 1024)));
  a = await sample(page);
  expect(a.u.u_amp).toBe(0.75);
  await page.evaluate(() => (window.glAudit.hold = true));
  await stage(page, 0).click();
  await expect
    .poll(() => page.evaluate(() => window.glAudit.frames.length))
    .toBeGreaterThan(0);
  const trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson25-late-heading",
      profile: info.project.name,
    });
  await seek(btn(page, "强度75%"), "newer parameter focus");
  await page.evaluate(() => {
    window.glAudit.hold = false;
    window.glAudit.frames.splice(0).forEach((cb) => cb(performance.now()));
  });
  await expect(btn(page, "强度75%")).toBeFocused();
  save(`rapid-${info.project.name}`, {
    passed: true,
    trace,
    actualSoftwareWebGL: true,
    liveDPR: "test override + real resize event, not OS display switch",
    a,
  });
});
test("native touch pan keeps page scrolling, long press and window blur cancel center input", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage();
  await open(p);
  await canvas(p).scrollIntoViewIfNeeded();
  const a = await sample(p),
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
  expect((await sample(p)).u.u_center).toEqual(a.u.u_center);
  await canvas(p).scrollIntoViewIfNeeded();
  const box = await canvas(p).boundingBox();
  await p.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await p.mouse.down();
  await p.waitForTimeout(650);
  await p.mouse.up();
  expect((await sample(p)).u.u_center).toEqual(a.u.u_center);
  await canvas(p).dispatchEvent("pointerdown", {
    isPrimary: true,
    button: 0,
    pointerId: 1,
    clientX: 10,
    clientY: 10,
  });
  await p.evaluate(() => dispatchEvent(new Event("blur")));
  await canvas(p).dispatchEvent("pointerup", {
    pointerId: 1,
    clientX: 20,
    clientY: 20,
  });
  expect((await sample(p)).u.u_center).toEqual(a.u.u_center);
  save(`touch-pan-${info.project.name}`, {
    passed: true,
    nativeTouch: true,
    outerBefore: outer,
    centerUnchanged: true,
    blur: "synthetic window blur",
  });
  await session.detach();
  await c.close();
});
test("copy success, late reset rejection and corrupt/unavailable storage preserve usable lesson", async ({
  page,
}) => {
  await open(page, 4);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.glCopied = text;
        },
      },
    }),
  );
  await btn(page, "生成WebGL效果指令").click();
  const draft = page.getByLabel("可编辑的 WebGL效果 Agent 指令");
  await draft.fill((await draft.inputValue()) + "\n可编辑验收。");
  await btn(page, "复制WebGL效果指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.glCopied)).toContain("可编辑验收。");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((_, reject) => {
            window.rejectGLCopy = reject;
          }),
      },
    }),
  );
  await btn(page, "复制WebGL效果指令").click();
  await btn(page, "重置第二十五节进度").click();
  await btn(page, "确认重置第二十五节").click();
  await page.evaluate(() => window.rejectGLCopy(Error("late")));
  await expect(page.locator("#gl25-stage-heading")).toBeFocused();
  await expect(page.locator(".copy-feedback")).toHaveCount(0);
  await page.evaluate((k) => localStorage.setItem(k, "bad-json"), key);
  await page.reload();
  await directory(page);
  await expect(
    page.locator(".lesson-twenty-five .lesson-bottom"),
  ).toContainText("0 / 5");
  await page.addInitScript(() => {
    for (const n of ["getItem", "setItem", "removeItem"])
      Storage.prototype[n] = () => {
        throw Error("unavailable");
      };
  });
  await page.reload();
  await directory(page);
  await btn(page, "强度75%").click();
  await expect.poll(async () => (await sample(page)).u.u_amp).toBe(0.75);
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});
test("without optional lose-context extension unmount still unbinds and deletes actual GL objects", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => {
    const gl = window.glAudit.context,
      get = gl.getExtension.bind(gl);
    gl.getExtension = (n) => (n === "WEBGL_lose_context" ? null : get(n));
  });
  await stage(page, 3).click();
  const result = await page.evaluate(() => ({
    created: window.glAudit.created,
    deleted: window.glAudit.deleted,
    live: window.glAudit.handles.filter((x) => x.gl["is" + x.suffix](x.handle))
      .length,
    contextLost: window.glAudit.context.isContextLost(),
  }));
  expect(result.created).toEqual(result.deleted);
  expect(result.live).toBe(0);
  expect(result.contextLost).toBe(false);
  save(`optional-cleanup-${info.project.name}`, {
    ...result,
    fixture:
      "Optional WEBGL_lose_context extension unavailable; actual resource validity checks, browser owns eventual context reclamation",
  });
});
