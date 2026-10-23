import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL07_STORAGE as KEY,
  tool07Initial,
  tool07Brief,
  tool07Questions,
  recommendation,
} from "../src/tool-seven-content.js";
import { createAssetGate } from "../src/lesson-twenty-eight-content.js";
const out = "/tmp/tool07-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  f = (p, n) => p.locator("#tool07-" + n),
  lab = (p) => p.locator(".tool07-lab"),
  player = (p) => p.locator(".tool07-player"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T07工具专题学习步骤" })
      .getByRole("button")
      .nth(n),
  read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY),
  save = (n, x) =>
    writeFileSync(`${out}/${n}.json`, JSON.stringify(x, null, 2));
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await act(b(p, "☰ 课程"), "menu");
  await act(
    nav.getByRole("button", {
      name: "T07 · Rive / Lottie · 可学习",
      exact: true,
    }),
    "T07",
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
  await act(b(p, "准备或重试真实资源"), "prepare");
  await prepared(p);
  await act(b(p, "应用最早资源结果"), "apply");
  await expect(player(p)).toHaveAttribute("data-ready", "true");
}
async function inspect(p) {
  await b(p, "读取真实播放器快照").click();
  return JSON.parse(
    await p
      .locator("[data-player-snapshot]")
      .getAttribute("data-player-snapshot"),
  );
}
async function state(p) {
  return p.evaluate(async () => {
    const u = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((u) => /\/tool-seven-runtime-.*\.js/.test(u));
    return u
      ? (await import(u)).runtimeState()
      : { owned: 0, created: 0, destroyed: 0 };
  });
}
async function frame(p) {
  return p
    .locator("[data-lottie-host]")
    .getAttribute("data-frame")
    .then(Number);
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
  ...tool07Initial(),
  assetsSeen: ["json", "riv"],
  needsSeen: ["playback", "data"],
  environmentsSeen: ["web", "native"],
  comparedSeen: true,
  loadedSeen: true,
  playedSeen: true,
  pausedSeen: true,
  reversedSeen: true,
  sampledSeen: true,
  mappedSeen: true,
  failureSeen: true,
  retrySeen: true,
  canceledSeen: true,
  staleSeen: true,
  cleanupSeen: true,
  answers: tool07Questions.map((q) => q.correct),
  done: [0, 1, 2, 3],
});
test("condition workbench compares formats inputs platform and instances without fake conversion", async ({
  page,
}) => {
  await open(page);
  for (const n of ["已有Rive .riv", "需要持续业务输入", "部署原生App"])
    await b(page, n).click();
  await f(page, "budget").selectOption("many");
  const t = page.locator(".tool07-recommendation");
  await expect(t).toContainText(".riv");
  await expect(t).toContainText("View Model");
  await expect(t).toContainText("本页Web预览不能证明原生可用");
  await expect(t).toContainText("本例单实例不是性能跑分");
  await expect(lab(page)).toContainText("候选选择不切换真实预览引擎");
  await b(page, "已有dotLottie .lottie").click();
  await expect(t).toContainText("dotLottie runtime");
  expect((await read(page)).assetsSeen).toEqual(["json", "riv", "dot"]);
});
test("official sources and actual mechanism copy has no prior GSAP primitive CLI attribution", async ({
  page,
}) => {
  await open(page);
  const r = page
    .locator(".tool-seven .roadmap-details")
    .filter({ hasText: "T07工具专题核对说明与官方来源" });
  await r.locator("summary").click();
  await expect(r).toContainText("lottie-web 5.13.0");
  await expect(r.getByRole("link")).toHaveCount(5);
  await expect(r).not.toContainText(/GSAP|ScrollTrigger|Open Code|Radix|CLI/);
  await expect(lab(page)).toContainText("未安装对应runtime");
  expect(tool07Brief(good())).toContain("Data Binding");
  expect(tool07Brief(good())).toContain("dotLottie状态机");
  expect(tool07Brief(good())).not.toMatch(
    /pin\/scrub|Standard No Charge|Open Code/,
  );
});
test("selection rules allow conditional alternatives and do not claim all Lottie noninteractive", async () => {
  for (const asset of ["json", "riv", "dot"])
    for (const need of ["playback", "data"])
      for (const environment of ["web", "native"]) {
        const r = recommendation({
          ...tool07Initial(),
          asset,
          need,
          environment,
        });
        expect(r).toContain("不是AI评分或唯一正确方案");
        expect(r).not.toContain("Lottie只能播放");
      }
  expect(recommendation({ ...tool07Initial(), need: "data" })).toContain(
    "应用显式映射帧/片段",
  );
});
test("real runtime SVG actual sampled frames change geometry and snapshot names exact version", async ({
  page,
}, info) => {
  await open(page, 1);
  await load(page);
  const rows = [];
  for (const n of [0, 60, 119]) {
    await b(page, `采样第${n}帧`).click();
    const x = await inspect(page);
    expect(x).toMatchObject({
      version: "5.13.0",
      renderer: "svg",
      owned: 1,
      totalFrames: 120,
      currentFrame: n,
      isPaused: true,
      svgPresent: true,
    });
    rows.push({
      n,
      actual: x,
      transforms: await page
        .locator("[data-lottie-host] svg g[transform]")
        .evaluateAll((es) => es.map((e) => e.getAttribute("transform"))),
    });
  }
  expect(rows[0].transforms).not.toEqual(rows[1].transforms);
  expect(rows[1].transforms).not.toEqual(rows[2].transforms);
  save(info.project.name + "-actual-frames", rows);
});
test("actual play intermediate pause stability reverse and replay retain business boundary", async ({
  page,
}, info) => {
  await open(page, 1);
  await load(page);
  await b(page, "播放或重播真实预览").click();
  await expect.poll(() => frame(page)).toBeGreaterThan(2);
  await b(page, "暂停预览").click();
  const mid = await frame(page);
  expect(mid).toBeLessThan(119);
  await page.waitForTimeout(180);
  expect(await frame(page)).toBe(mid);
  await b(page, "采样第60帧").click();
  await b(page, "反向预览").click();
  await expect.poll(() => frame(page)).toBeLessThan(57);
  await b(page, "暂停预览").click();
  const reverse = await inspect(page);
  expect(reverse.direction).toBe(-1);
  await f(page, "speed").selectOption("2");
  await b(page, "采样第119帧").click();
  await b(page, "播放或重播真实预览").click();
  await expect(player(page)).toHaveAttribute("data-playing", "false", {
    timeout: 6000,
  });
  expect((await inspect(page)).currentFrame).toBeGreaterThan(118);
  await expect(page.locator("[data-business]")).toHaveText("idle");
  save(info.project.name + "-play-pause-reverse", {
    mid,
    reverse,
    completed: await inspect(page),
  });
});
test("real speed alters frame advance and explicit loop updates runtime without default autoplay", async ({
  page,
}, info) => {
  await open(page, 1);
  await load(page);
  const d = [];
  for (const speed of ["0.5", "2"]) {
    await f(page, "speed").selectOption(speed);
    await b(page, "采样第0帧").click();
    await b(page, "播放或重播真实预览").click();
    await page.waitForTimeout(240);
    await b(page, "暂停预览").click();
    d.push(await frame(page));
  }
  expect(d[1]).toBeGreaterThan(d[0] * 2);
  const loop = page.getByRole("checkbox", {
    name: "显式允许循环（默认关闭）",
    exact: true,
  });
  await loop.check();
  expect((await inspect(page)).loop).toBe(true);
  await loop.uncheck();
  expect((await inspect(page)).loop).toBe(false);
  save(info.project.name + "-speed", { advances: d });
});
test("same-frame mapping interrupts running preview and rapid business mapping respects latest explicit value", async ({
  page,
}) => {
  await open(page, 1);
  await load(page);
  await b(page, "播放或重播真实预览").click();
  await expect.poll(() => frame(page)).toBeGreaterThan(2);
  await b(page, "应用业务映射").click();
  expect(await inspect(page)).toMatchObject({
    currentFrame: 0,
    isPaused: true,
    business: "idle",
  });
  for (const n of ["success", "busy", "failure"]) {
    await b(page, "业务选择" + n).click();
    await b(page, "应用业务映射").click();
  }
  expect(await inspect(page)).toMatchObject({
    currentFrame: 0,
    isPaused: true,
    business: "failure",
  });
  await expect(page.locator(".tool07-error")).toBeVisible();
  await b(page, "播放或重播真实预览").click();
  await b(page, "暂停预览").click();
  await expect(page.locator("[data-business]")).toHaveText("failure");
});
test("live reduced motion pauses current runtime allows true static sampling and never autoplays on restore", async ({
  page,
}) => {
  await open(page, 1);
  await load(page);
  await b(page, "播放或重播真实预览").click();
  await expect.poll(() => frame(page)).toBeGreaterThan(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  const a = await frame(page);
  await page.waitForTimeout(150);
  expect(await frame(page)).toBe(a);
  await b(page, "采样第60帧").click();
  expect((await inspect(page)).currentFrame).toBe(60);
  await b(page, "播放或重播真实预览").click();
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect((await inspect(page)).isPaused).toBe(true);
});
test("synthetic hidden fixture pauses loop without auto resumption and removes visibility listener on leave", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.h07 = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.h07,
    });
  });
  await open(page, 1);
  await load(page);
  await page
    .getByRole("checkbox", { name: "显式允许循环（默认关闭）", exact: true })
    .check();
  await b(page, "播放或重播真实预览").click();
  await expect.poll(() => frame(page)).toBeGreaterThan(2);
  await page.evaluate(() => {
    window.h07 = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  const n = await frame(page);
  await page.waitForTimeout(150);
  expect(await frame(page)).toBe(n);
  await page.evaluate(() => {
    window.h07 = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect((await inspect(page)).isPaused).toBe(true);
  await b(page, "返回T06复习").click();
  await expect(f(page, "stage-heading")).toHaveCount(0);
  expect((await state(page)).owned).toBe(0);
});
test("manual static retains true frame and restoring normal never starts playback", async ({
  page,
}) => {
  await open(page, 1);
  await load(page);
  await b(page, "播放或重播真实预览").click();
  await f(page, "mode").selectOption("static");
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await b(page, "采样第119帧").click();
  expect((await inspect(page)).currentFrame).toBe(119);
  await f(page, "mode").selectOption("normal");
  expect((await inspect(page)).isPaused).toBe(true);
});
test("actual local JSON HTTP failure preserves text then normal retry creates one runtime", async ({
  page,
}) => {
  await page.route("**/lesson28-timeline.json", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await open(page, 2);
  await b(page, "准备或重试真实资源").click();
  await prepared(page);
  await b(page, "应用最早资源结果").click();
  await expect(lab(page)).toHaveAttribute("data-status", "failed");
  await expect(lab(page)).toContainText("HTTP 503");
  await expect(page.locator("[data-lottie-host] svg")).toHaveCount(0);
  await page.unrouteAll({ behavior: "wait" });
  await load(page);
  expect((await read(page)).retrySeen).toBe(true);
  expect((await state(page)).owned).toBe(1);
});
test("malformed actual JSON is rejected without creating player and remains retryable", async ({
  page,
}) => {
  await page.route("**/lesson28-timeline.json", (r) =>
    r.fulfill({ json: { w: 1 } }),
  );
  await open(page, 2);
  await b(page, "准备或重试真实资源").click();
  await prepared(page);
  await b(page, "应用最早资源结果").click();
  await expect(lab(page)).toContainText("原创资产结构不匹配");
  expect((await state(page)).owned).toBe(0);
  await page.unrouteAll({ behavior: "wait" });
  await load(page);
});
test("manual failure cancel stale old result and retry use real resource queue and stable focus", async ({
  page,
}, info) => {
  await open(page, 2);
  await b(page, "下次资源模拟失败").click();
  await b(page, "准备或重试真实资源").click();
  await prepared(page);
  await b(page, "应用最早资源结果").click();
  await expect(b(page, "应用最早资源结果")).toBeFocused();
  await b(page, "下次资源正常").click();
  await b(page, "准备或重试真实资源").click();
  await prepared(page);
  await b(page, "取消本次准备").click();
  await b(page, "准备或重试真实资源").click();
  await prepared(page, 2);
  await b(page, "应用最早资源结果").click();
  await expect(lab(page)).toContainText("旧结果已隔离");
  await expect(b(page, "应用最早资源结果")).toBeFocused();
  await b(page, "应用最早资源结果").click();
  await expect(player(page)).toHaveAttribute("data-ready", "true");
  await expect(b(page, "应用最早资源结果")).toBeFocused();
  expect(await read(page)).toMatchObject({
    failureSeen: true,
    canceledSeen: true,
    staleSeen: true,
    retrySeen: true,
  });
  save(info.project.name + "-resource-transactions", {
    state: await state(page),
    snapshot: await inspect(page),
  });
});
test("pure gate bounds packets ignores duplicate late delivery and disposed work without UI callbacks", async () => {
  const e = [],
    g = createAssetGate((v) => e.push(v)),
    old = g.start();
  old.prepare("old");
  g.cancel();
  const current = g.start();
  current.prepare("new");
  expect(g.deliver()).toBe("stale");
  expect(current.complete()).toBe("success");
  expect(current.complete()).toBe("duplicate");
  expect(e.filter((x) => x.type === "success").map((x) => x.value)).toEqual([
    "new",
  ]);
  for (let i = 0; i < 8; i++) {
    const r = g.start();
    r.prepare(i);
    g.cancel();
  }
  expect(g.start()).toBeNull();
  const n = e.length;
  g.dispose();
  expect(old.prepare("late")).toBe("disposed");
  expect(g.deliver()).toBe("disposed");
  expect(e.length).toBe(n);
});
test("duplicate preparation and empty delivery never disable current focus or create duplicate runtime", async ({
  page,
}) => {
  let release;
  const wait = new Promise((r) => (release = r));
  await page.route("**/lesson28-timeline.json", async (r) => {
    await wait;
    await r.continue().catch(() => {});
  });
  await open(page, 2);
  await b(page, "准备或重试真实资源").click();
  await b(page, "准备或重试真实资源").click();
  await expect(lab(page)).toHaveAttribute("data-queued", "1");
  await expect(b(page, "准备或重试真实资源")).toBeFocused();
  release();
  await prepared(page);
  await b(page, "应用最早资源结果").click();
  await expect(player(page)).toHaveAttribute("data-ready", "true");
  await b(page, "应用最早资源结果").click();
  await expect(b(page, "应用最早资源结果")).toBeFocused();
  expect((await state(page)).owned).toBe(1);
});
test("held late runtime after navigation cannot create SVG or steal newer real Tab focus", async ({
  page,
}) => {
  let release;
  const wait = new Promise((r) => (release = r));
  await page.route("**/tool-seven-runtime-*.js", async (r) => {
    await wait;
    await r.continue().catch(() => {});
  });
  await open(page, 1);
  await b(page, "准备或重试真实资源").click();
  await b(page, "返回T06复习").click();
  await expect(page.locator("#tool06-stage-heading")).toBeVisible();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  release();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
  expect((await state(page)).owned).toBe(0);
  await expect(page.locator(".tool07-player")).toHaveCount(0);
});
test("real player release and station unmount destroy SVG instances no perpetual RAF and remount remains paused", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window),
      caf = cancelAnimationFrame.bind(window);
    window.pending07 = new Set();
    window.frames07 = 0;
    window.requestAnimationFrame = (cb) => {
      let id;
      id = raf((t) => {
        window.pending07.delete(id);
        window.frames07++;
        cb(t);
      });
      window.pending07.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      window.pending07.delete(id);
      caf(id);
    };
  });
  await open(page, 1);
  await load(page);
  await b(page, "播放或重播真实预览").click();
  await expect.poll(() => frame(page)).toBeGreaterThan(1);
  const old = await page.locator("[data-lottie-host]").elementHandle();
  await b(page, "释放预览并恢复").click();
  expect((await state(page)).owned).toBe(0);
  await expect(page.locator("[data-lottie-host] svg")).toHaveCount(0);
  await expect(b(page, "释放预览并恢复")).toBeFocused();
  await load(page);
  expect((await inspect(page)).isPaused).toBe(true);
  await stage(page, 0).click();
  await expect(player(page)).toHaveCount(0);
  expect(await old.evaluate((e) => e.querySelector("svg"))).toBeNull();
  await expect.poll(() => page.evaluate(() => window.pending07.size)).toBe(0);
  const n = await page.evaluate(() => window.frames07);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.frames07)).toBe(n);
  save(info.project.name + "-cleanup", await state(page));
});
test("reset during held JSON and late result cannot recreate cleared preview or mutate reset progress", async ({
  page,
}) => {
  let release;
  const wait = new Promise((r) => (release = r));
  await page.route("**/lesson28-timeline.json", async (r) => {
    await wait;
    await r.continue().catch(() => {});
  });
  await open(page, 2);
  await b(page, "准备或重试真实资源").click();
  await b(page, "重置T07工具专题进度").click();
  await b(page, "确认重置T07工具专题").click();
  await expect(f(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  release();
  await page.waitForLoadState("networkidle");
  expect((await state(page)).owned).toBe(0);
  expect(await read(page)).toMatchObject({
    step: 0,
    loadedSeen: false,
    done: [],
  });
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
test("frame updates stay aria-live off and no per-frame business or storage writes", async ({
  page,
}) => {
  await open(page, 1);
  await load(page);
  await b(page, "播放或重播真实预览").click();
  const stored = await read(page);
  await page.waitForTimeout(180);
  expect(await read(page)).toEqual(stored);
  await expect(page.locator(".tool07-player output")).toHaveAttribute(
    "aria-live",
    "off",
  );
  await expect(page.locator("[data-business]")).toHaveText("idle");
  await b(page, "暂停预览").click();
});
test("quiz retry explains format binding and business without keyword scoring or source residue", async ({
  page,
}) => {
  await open(page, 3);
  await b(page, "完成并继续").click();
  await expect(page.locator(".notice")).toContainText("先完成");
  for (let i = 0; i < 3; i++) {
    const q = page.locator(".quiz-grid fieldset").nth(i);
    await q
      .getByRole("button")
      .nth(1 - tool07Questions[i].correct)
      .click();
    await expect(q).toContainText("再想一想");
    await q.getByRole("button").nth(tool07Questions[i].correct).click();
    await expect(q).toContainText(tool07Questions[i].why);
  }
  for (const t of [
    "合法来源",
    "complete不改业务成功",
    "View Model",
    "旧Inputs",
    "取消",
    "destroy",
    "375px",
    "T09–T12仍为4个预告",
  ])
    expect(tool07Brief(good())).toContain(t);
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
    name: "我已核对资产、输入合同、部署环境和回退验收。",
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
          window.copied07 = t;
          return new Promise((r) => (window.release07 = r));
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
  await page.evaluate(() => window.release07());
  expect(await page.evaluate(() => window.copied07)).toBe(x);
  await expect(f(page, "agent-draft")).toHaveValue(x + "\n随后编辑");
  await expect(page.locator(".copy-feedback")).toContainText("点击时的版本");
});
test("clipboard denial selects only while focus owned and later denial respects real Tab outside", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => new Promise((_, r) => (window.reject07 = r)) },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await page.evaluate(() => window.reject07(Error("fixture")));
  await expect(f(page, "agent-draft")).toBeFocused();
  expect(
    await f(page, "agent-draft").evaluate(
      (e) => e.selectionEnd - e.selectionStart,
    ),
  ).toBe((await f(page, "agent-draft").inputValue()).length);
  await b(page, "复制工具选型说明").click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.reject07(Error("fixture")));
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
          window.calls07 = (window.calls07 || 0) + 1;
          return new Promise((r) => (window.release07 = r));
        },
      },
    }),
  );
  await seed(page, good());
  await open(page, 4);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.calls07)).toBe(1);
  await b(page, "重置T07工具专题进度").click();
  await b(page, "确认重置T07工具专题").click();
  await expect(f(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.release07());
  expect((await read(page)).draft).toBe("");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
test("corrupt storage clamps formats arrays booleans frame and review without corrupting prior state", async ({
  page,
}) => {
  await seed(page, {
    ...good(),
    step: 9,
    done: [0, 0, 8, "1"],
    assetsSeen: ["riv", "evil", "riv"],
    frame: 1e20,
    context: "x".repeat(900),
    draft: "x",
    reviewed: true,
  });
  await open(page);
  const r = await read(page);
  expect(r).toMatchObject({
    step: 0,
    done: [0],
    assetsSeen: ["riv"],
    frame: 119,
    reviewed: false,
  });
  expect(r.context.length).toBe(700);
});
test("unavailable storage is honest while actual runtime remains usable", async ({
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
  expect((await inspect(page)).version).toBe("5.13.0");
});
test("held navigation title callback respects newer actual Tab focus", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    window.held07 = [];
    window.original07 = requestAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      window.held07.push(cb);
      return 99001;
    };
  });
  await stage(page, 1).click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => {
    window.requestAnimationFrame = window.original07;
    for (const f of window.held07) f(performance.now());
  });
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 scoped visual crops`, async ({
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
        n < 3 ? ".tool07-runtime" : n === 3 ? ".quiz-grid" : ".agent-editor",
      )
      .screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-body.png`,
      });
    if (n === 1)
      await page.locator(".tool07-art").screenshot({
        path: `${out}/${info.project.name}-station2-actual-svg.png`,
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
    { length: 6 },
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
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), priorKeys);
}
async function complete(p, act, type, toggle = act) {
  for (const n of [
    "已有Rive .riv",
    "需要持续业务输入",
    "部署原生App",
    "记录选型条件与非唯一答案",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "stage0");
  await load(p, act);
  for (const n of [
    "播放或重播真实预览",
    "暂停预览",
    "反向预览",
    "采样第60帧",
    "业务选择failure",
    "应用业务映射",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "stage1");
  await act(b(p, "下次资源模拟失败"), "failure");
  await act(b(p, "准备或重试真实资源"), "prepare fail");
  await prepared(p);
  await act(b(p, "应用最早资源结果"), "apply fail");
  await act(b(p, "下次资源正常"), "normal");
  await act(b(p, "准备或重试真实资源"), "prepare cancel");
  await prepared(p);
  await act(b(p, "取消本次准备"), "cancel");
  await act(b(p, "准备或重试真实资源"), "retry");
  await prepared(p, 2);
  await act(b(p, "应用最早资源结果"), "stale");
  await act(b(p, "应用最早资源结果"), "current");
  await expect(player(p)).toHaveAttribute("data-ready", "true");
  await act(b(p, "释放预览并恢复"), "release");
  await act(b(p, "完成并继续"), "stage2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool07Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool07Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "stage3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "sample");
  await type(f(p, "context"), " 用户补充静态回退。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(f(p, "agent-draft"), "\n自己的资产预算。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对资产、输入合同、部署环境和回退验收。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T07工具专题"), "finish");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T07工具专题进度"), "cancel reset");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T07工具专题进度"), "retain");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T07工具专题进度")).toBeFocused();
  await act(b(p, "重置T07工具专题进度"), "reset");
  await act(b(p, "确认重置T07工具专题"), "confirm");
  await expect(f(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    draft: "",
    context: "",
  });
}
test("real Tab five stations retry genuine edits clipboard refresh cancel confirm reset preserves40", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool07-full",
      profile: info.project.name,
    });
  await directory(page, k.act);
  await complete(
    page,
    k.act,
    async (l, t) => {
      await k.seek(l, "real edit");
      await page.keyboard.press("End");
      await page.keyboard.type(t);
    },
    k.toggle,
  );
  const draft = (await read(page)).draft;
  await page.reload();
  await directory(page, k.act);
  await expect(f(page, "agent-draft")).toHaveValue(draft);
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
  test(`zero keyboard touch full ${reducedMotion} retry real edits refresh cancel confirm reset preserves40`, async ({
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
      window.keys07 = 0;
      addEventListener("keydown", () => window.keys07++);
    });
    const prior = await priors(p),
      actions = [],
      act = async (l, n) => {
        await l.tap();
        actions.push(n);
      };
    await directory(p, act);
    await complete(p, act, async (l, t) => l.fill((await l.inputValue()) + t));
    const draft = (await read(p)).draft;
    await p.reload();
    await directory(p, act);
    await expect(f(p, "agent-draft")).toHaveValue(draft);
    await reset(p, act, false);
    expect(await p.evaluate(() => window.keys07)).toBe(0);
    expect(
      await p.evaluate(
        (ks) => ks.map((k) => localStorage.getItem(k)),
        priorKeys,
      ),
    ).toEqual(prior);
    save(info.project.name + "-touch-" + reducedMotion, {
      actions,
      keydown: 0,
      fixtures: "Actual taps plus fill fixtures, notOSIME/physicaldevice",
    });
    await c.close();
  });
test("T06 exit opens actual T07 ten available tags four readonly tools and numbered32 unchanged", async ({
  page,
}) => {
  await open(page);
  await b(page, "返回T06复习").click();
  await b(page, "继续T07 · Rive / Lottie").click();
  await expect(f(page, "stage-heading")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(10);
  await expect(nav.locator(".coverage-preview")).toHaveCount(4);
  await expect(nav.getByRole("button", { name: /T08/ })).toHaveCount(1);
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.locator('[data-lesson-id="41"]')).toHaveCount(0);
  await nav
    .getByRole("button", { name: "T07 · Rive / Lottie · 可学习", exact: true })
    .click();
  await page.getByText("路线核对说明与官方来源", { exact: true }).click();
  await page.getByText("查看完整 32 课目录及覆盖标签", { exact: true }).click();
  await expect(page.locator(".full-course-outline")).toContainText(
    "其他4个工具模块尚未作为独立模块制作",
  );
  await expect(
    page.locator(".full-course-outline [data-coverage-id=T07] button"),
  ).toHaveCount(1);
});
test("375 short resize keeps SVG aspect and controls reachable with real focus", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await open(page, 1);
  await load(page);
  await b(page, "采样第60帧").click();
  const a = await inspect(page);
  await page.setViewportSize({ width: 540, height: 620 });
  expect((await inspect(page)).currentFrame).toBe(a.currentFrame);
  await page.setViewportSize({ width: 375, height: 480 });
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool07-short",
      profile: info.project.name,
    });
  await k.act(b(page, "暂停预览"), "shortfocus");
  await axes(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".tool07-art")
    .screenshot({ path: `${out}/${info.project.name}-short480-svg.png` });
  save(info.project.name + "-short-focus", trace);
});

test("actual runtime module abort is honest and explicit reload recovers rather than claiming successful retry", async ({
  page,
}) => {
  await page.route("**/tool-seven-runtime-*.js", (r) => r.abort("failed"));
  await open(page, 1);
  await b(page, "准备或重试真实资源").click();
  await prepared(page);
  await b(page, "应用最早资源结果").click();
  await expect(lab(page)).toHaveAttribute("data-status", "failed");
  await expect(player(page)).toHaveAttribute("data-ready", "false");
  await b(page, "确认文字回退边界").click();
  expect((await read(page)).loadedSeen).toBe(false);
  await page.unrouteAll({ behavior: "wait" });
  await b(page, "重载页面重试资源与模块").click();
  await expect(page.locator("#stage-heading")).toBeVisible();
  await directory(page);
  await load(page);
  expect((await inspect(page)).version).toBe("5.13.0");
});
test("actual item renderer error fixture destroys own instance and captured late callbacks cannot change newer player", async ({
  page,
}, info) => {
  await open(page, 1);
  await b(page, "准备或重试真实资源").click();
  await prepared(page);
  await page.evaluate(async () => {
    const u = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((u) => /\/tool-seven-runtime-.*\.js/.test(u));
    const m = await import(u),
      a = await m.prepareAsset();
    const lib = a.library,
      load = lib.loadAnimation;
    lib.loadAnimation = function (...args) {
      const item = load.apply(this, args),
        add = item.addEventListener;
      window.callbacks07 = {};
      lib.loadAnimation = load;
      item.addEventListener = function (n, f) {
        window.callbacks07[n] = f;
        return add.call(this, n, f);
      };
      queueMicrotask(() => (item.addEventListener = add));
      return item;
    };
  });
  await b(page, "应用最早资源结果").click();
  await expect(player(page)).toHaveAttribute("data-ready", "true");
  const trace = [];
  const k = createKeyboardNavigator(page, expect, trace, {
    lesson: "tool07-renderer-error-focus",
    profile: info.project.name,
  });
  await k.act(
    b(page, "播放或重播真实预览"),
    "real player focus before renderer error",
  );
  const heldControl = await b(page, "播放或重播真实预览").elementHandle();
  await page.evaluate(() => {
    window.oldCallbacks07 = window.callbacks07;
    window.oldCallbacks07.error();
  });
  await expect(player(page)).toHaveAttribute("data-ready", "false");
  // Assert immediately after error commit, before any later click/Tab can repair it.
  await expect(b(page, "播放或重播真实预览")).toBeFocused();
  expect(
    await heldControl.evaluate(
      (e) => e.isConnected && e === document.activeElement,
    ),
  ).toBe(true);
  const immediateErrorFocus = await heldControl.evaluate((e) => {
    const r = e.getBoundingClientRect(),
      hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
    return {
      focused: e === document.activeElement,
      visible: r.top >= 0 && r.bottom <= innerHeight + 1,
      covered: hit !== e && !e.contains(hit),
      outline: getComputedStyle(e).outlineStyle,
      rect: { top: r.top, bottom: r.bottom },
      height: innerHeight,
    };
  });
  expect(immediateErrorFocus).toMatchObject({
    focused: true,
    visible: true,
    covered: false,
  });
  expect(immediateErrorFocus.outline).not.toBe("none");
  trace.push({ immediateErrorFocus });
  await expect(lab(page)).toContainText("初始化/渲染失败");
  expect((await state(page)).owned).toBe(0);
  await load(page);
  await b(page, "采样第60帧").click();
  const before = await inspect(page);
  await k.seek(
    b(page, "取消本次准备"),
    "newer external focus before old callbacks",
  );
  const externalFocus = await page.evaluate(
    () => document.activeElement.outerHTML,
  );
  await page.evaluate(() => {
    for (const f of Object.values(window.oldCallbacks07)) f();
  });
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    externalFocus,
  );
  await expect(b(page, "取消本次准备")).toBeFocused();
  expect(await inspect(page)).toEqual(before);
  await expect(lab(page)).not.toContainText("单次动画播放结束");
  save(info.project.name + "-renderer-error-late-fixture", {
    before,
    after: await inspect(page),
    trace,
    fixture:
      "Captured genuine item listeners invoked after removal to model late delivery, not a real GPU fault",
  });
});
test("destroy own preview leaves an independent real Lottie instance usable", async ({
  page,
}) => {
  await open(page, 1);
  await load(page);
  await page.evaluate(async () => {
    const u = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((u) => /\/tool-seven-runtime-.*\.js/.test(u));
    const a = await (await import(u)).prepareAsset();
    const host = document.createElement("div");
    host.id = "foreign07";
    document.body.append(host);
    window.foreign07 = a.library.loadAnimation({
      container: host,
      renderer: "svg",
      autoplay: false,
      loop: false,
      animationData: structuredClone(a.json),
    });
    window.foreign07.goToAndStop(20, true);
  });
  await expect(page.locator("#foreign07 svg")).toHaveCount(1);
  await b(page, "释放预览并恢复").click();
  expect((await state(page)).owned).toBe(0);
  await expect(page.locator("#foreign07 svg")).toHaveCount(1);
  expect(
    await page.evaluate(() => {
      window.foreign07.goToAndStop(60, true);
      return window.foreign07.currentFrame;
    }),
  ).toBe(60);
  await page.evaluate(() => {
    window.foreign07.destroy();
    document.querySelector("#foreign07").remove();
  });
});

test("long own context remains inert editable text and narrow brief focus stays visible", async ({
  page,
}, info) => {
  await seed(page, good());
  await page.setViewportSize({ width: 375, height: 480 });
  await open(page, 4);
  await b(page, "填入项目现状示例（替换本栏）").click();
  const text =
    "<script>window.executed07=true</script>" +
    "用户资产与输入要求，保留文字回退。".repeat(30);
  await f(page, "context").fill(text.slice(0, 700));
  await b(page, "生成工具选型说明").click();
  expect(await f(page, "agent-draft").inputValue()).toContain(
    "<script>window.executed07=true</script>",
  );
  expect(await page.evaluate(() => window.executed07)).toBeUndefined();
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool07-long",
      profile: info.project.name,
    });
  await k.seek(f(page, "agent-draft"), "long actual focus");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await axes(page);
  await page.screenshot({
    path: `${out}/${info.project.name}-short-long-brief-focus.png`,
  });
  save(info.project.name + "-long-focus", trace);
});

test("speed and loop contract changes preserve edited draft and invalidate prior human review", async ({
  page,
}) => {
  const d = {
    ...good(),
    context: "已有原创JSON与Web约束",
    generated: true,
    reviewed: true,
  };
  d.draft = tool07Brief(d) + "\n用户自己的修改。";
  await seed(page, d);
  await open(page, 4);
  await expect(f(page, "agent-draft")).toHaveValue(d.draft);
  await stage(page, 1).click();
  await f(page, "speed").selectOption("2");
  await stage(page, 4).click();
  expect((await read(page)).draftStale).toBe(true);
  expect((await read(page)).reviewed).toBe(false);
  await expect(f(page, "agent-draft")).toHaveValue(d.draft);
  const check = page.getByRole("checkbox", {
    name: "我已核对资产、输入合同、部署环境和回退验收。",
    exact: true,
  });
  await expect(check).toBeDisabled();
  await b(page, "重新生成工具选型草稿").click();
  expect(await f(page, "agent-draft").inputValue()).toContain("速度2倍");
  await check.check();
  const second = await f(page, "agent-draft").inputValue();
  await stage(page, 1).click();
  await page
    .getByRole("checkbox", { name: "显式允许循环（默认关闭）", exact: true })
    .check();
  await stage(page, 4).click();
  expect((await read(page)).draftStale).toBe(true);
  expect((await read(page)).reviewed).toBe(false);
  await expect(f(page, "agent-draft")).toHaveValue(second);
});
