import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
const out = "/tmp/layout-acceptance",
  key = "frontend-observatory.lesson20.v1",
  prior = Array.from(
    { length: 19 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  card = (p, id) => p.locator(`[data-layout-card="${id}"]`),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十节学习步骤" })
      .getByRole("button")
      .nth(n),
  list = (p) => p.getByRole("list", { name: "真实布局卡片列表" });
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "directory");
  await act(nav.getByRole("button").nth(19), "lesson20");
  await expect(p.locator("#layout-motion-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
  await expect(p.locator("#layout-motion-stage-heading")).toBeFocused();
}
async function order(p, value) {
  await expect(list(p)).toHaveAttribute("data-order", value);
  expect(
    await list(p).evaluate((e) =>
      [...e.children].map((n) => n.dataset.layoutCard).join(""),
    ),
  ).toBe(value);
}
async function fit(p) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
async function axeCheck(p) {
  await p.evaluate(axe);
  const r = await p.evaluate(() =>
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
async function geometry(p) {
  return list(p)
    .locator("[data-layout-card]")
    .evaluateAll((es) =>
      es.map((e) => {
        const r = e.getBoundingClientRect(),
          s = getComputedStyle(e),
          m = new DOMMatrix(s.transform);
        return {
          id: e.dataset.layoutCard,
          top: r.top,
          left: r.left,
          offsetTop: e.offsetTop,
          width: r.width,
          height: r.height,
          transform: s.transform,
          scaleX: m.a,
          scaleY: m.d,
          animations: e.getAnimations().map((a) => ({
            state: a.playState,
            currentTime: a.currentTime,
            frames: a.effect.getKeyframes(),
          })),
        };
      }),
    );
}
function instrument() {
  const original = Element.prototype.animate;
  window.layoutAnimations = [];
  window.pauseLayout = true;
  Element.prototype.animate = function (...args) {
    const a = original.apply(this, args);
    window.layoutAnimations.push(a);
    if (window.pauseLayout) a.pause();
    return a;
  };
}
const deny = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });
async function focusSnapshot(p) {
  return p.evaluate(() => {
    const e = document.activeElement,
      r = e.getBoundingClientRect(),
      s = getComputedStyle(e),
      h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      text: e.textContent.trim().slice(0, 80),
      tag: e.tagName,
      visible:
        r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight,
      enabled: !e.disabled,
      unoccluded: h === e || e.contains(h),
      outline: s.outlineWidth,
    };
  });
}
test("twentieth is lazy with twenty-four releases and honest FLIP mechanism without Motion or external requests", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-twenty-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(urls.some((u) => /lesson-twenty-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Layout Animation · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(32);
  await expect(page.getByTestId("layout-lab")).toContainText("未使用Motion");
  expect(
    urls
      .filter((u) => /^https?:/.test(u))
      .every((u) => u.startsWith("http://127.0.0.1:4173")),
  ).toBe(true);
});
test("real DOM and final offsets change immediately while native FLIP holds prior visual positions", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await btn(page, "慢速1200ms").click();
  const before = await geometry(page);
  await btn(page, "倒序排列").evaluate((e) => e.click());
  await order(page, "CBA");
  const during = await geometry(page);
  for (const d of during) {
    const old = before.find((x) => x.id === d.id);
    expect(d.scaleX).toBe(1);
    expect(d.scaleY).toBe(1);
    expect(d.top).toBeCloseTo(old.top, 1);
  }
  expect(during.find((x) => x.id === "A").offsetTop).toBeGreaterThan(
    before.find((x) => x.id === "A").offsetTop,
  );
  expect(during.find((x) => x.id === "C").offsetTop).toBeLessThan(
    before.find((x) => x.id === "C").offsetTop,
  );
  expect(during.some((x) => x.animations.length > 0)).toBe(true);
  await btn(page, "立即完成位置过渡").evaluate((e) => e.click());
  const after = await geometry(page);
  expect(
    after.every((x) => x.animations.length === 0 && x.transform === "none"),
  ).toBe(true);
  await order(page, "CBA");
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/real-layout-${info.project.name}.json`,
    JSON.stringify(
      {
        before,
        during,
        after,
        trigger:
          "diagnostic DOM click to keep scroll fixed; full input paths separately tested",
      },
      null,
      2,
    ),
  );
});
test("expansion changes actual height and sibling offsets with no text or image scaling and notes survive true reorder", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page, 1);
  const a = await card(page, "A").elementHandle();
  await page
    .getByLabel("卡片A备注", { exact: true })
    .fill("真实编辑，排序展开后保留");
  const before = await geometry(page),
    image = await card(page, "A").locator("svg").boundingBox(),
    font = await card(page, "A")
      .locator("input")
      .evaluate((e) => getComputedStyle(e).fontSize);
  await btn(page, "展开卡片A").evaluate((e) => e.click());
  await expect(card(page, "A")).toHaveAttribute("data-expanded", "true");
  const expanded = await geometry(page);
  expect(expanded.find((x) => x.id === "A").height).toBeGreaterThan(
    before.find((x) => x.id === "A").height,
  );
  expect(expanded.find((x) => x.id === "B").offsetTop).toBeGreaterThan(
    before.find((x) => x.id === "B").offsetTop,
  );
  for (const r of expanded) {
    expect(r.scaleX).toBe(1);
    expect(r.scaleY).toBe(1);
  }
  const nextImage = await card(page, "A").locator("svg").boundingBox();
  expect(nextImage.width).toBe(image.width);
  expect(nextImage.height).toBe(image.height);
  expect(
    await card(page, "A")
      .locator("input")
      .evaluate((e) => getComputedStyle(e).fontSize),
  ).toBe(font);
  await btn(page, "卡片C移到最前").evaluate((e) => e.click());
  await order(page, "CAB");
  expect(
    await a.evaluate(
      (e) => e === document.querySelector('[data-layout-card="A"]'),
    ),
  ).toBe(true);
  await expect(page.getByLabel("卡片A备注", { exact: true })).toHaveValue(
    "真实编辑，排序展开后保留",
  );
  await btn(page, "收起卡片A").evaluate((e) => e.click());
  await expect(card(page, "A").locator(".layout-details")).toBeHidden();
  await fit(page);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/content-${info.project.name}.json`,
    JSON.stringify({ before, expanded, image, nextImage, font }, null, 2),
  );
});
test("midway retarget starts from current picture and old finish cancel callbacks cannot clear new animations or restore old order", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page, 2);
  await btn(page, "慢速1200ms").click();
  await btn(page, "倒序排列").evaluate((e) => e.click());
  await page.evaluate(() => {
    window.oldLayoutCallbacks = window.layoutAnimations
      .flatMap((a) => [a.onfinish, a.oncancel])
      .filter(Boolean);
    for (const a of window.layoutAnimations)
      if (a.playState === "paused") a.currentTime = 600;
  });
  const halfway = await geometry(page);
  await btn(page, "按优先级排序").evaluate((e) => e.click());
  await order(page, "BCA");
  const restarted = await geometry(page);
  for (const d of restarted)
    expect(d.top).toBeCloseTo(halfway.find((x) => x.id === d.id).top, 1);
  const activeBefore = await page.evaluate(
    () => document.getAnimations().length,
  );
  await page.evaluate(() => {
    for (const f of window.oldLayoutCallbacks) f();
  });
  await order(page, "BCA");
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(
    activeBefore,
  );
  await btn(page, "立即完成位置过渡").evaluate((e) => e.click());
  await order(page, "BCA");
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/continuity-${info.project.name}.json`,
    JSON.stringify(
      {
        halfway,
        restarted,
        oldCallbacksIgnored: true,
        trigger: "diagnostic same-scroll DOM activation",
      },
      null,
      2,
    ),
  );
});
test("rapid native clicks and same-target requests preserve latest model content identity and one animation per card", async ({
  page,
}) => {
  await open(page, 2);
  await btn(page, "慢速1200ms").click();
  await btn(page, "填入卡片B示例备注").click();
  const saved = await card(page, "B").elementHandle();
  for (let i = 0; i < 8; i++)
    await btn(page, i % 2 ? "按优先级排序" : "倒序排列").click();
  await order(page, "BCA");
  await btn(page, "按优先级排序").click();
  await order(page, "BCA");
  expect(
    await saved.evaluate(
      (e) => e === document.querySelector('[data-layout-card="B"]'),
    ),
  ).toBe(true);
  await expect(page.getByLabel("卡片B备注", { exact: true })).toHaveValue(
    "正在评估方案B",
  );
  for (const r of await geometry(page))
    expect(r.animations.length).toBeLessThanOrEqual(1);
  await btn(page, "立即完成位置过渡").click();
  await order(page, "BCA");
  await expect(page.locator("[data-layout-card]")).toHaveCount(3);
});
test("real keyboard focused reorder expand collapse keep same visible operable node and external focus is never stolen", async ({
  page,
}, info) => {
  await open(page);
  await btn(page, "慢速1200ms").click();
  const trace = [],
    rows = [],
    { act, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson20-focus",
      profile: info.project.name,
    });
  const move = btn(page, "卡片C移到最前"),
    saved = await move.elementHandle();
  await act(move, "move focused C");
  await order(page, "CAB");
  await expect(move).toBeFocused();
  expect(await saved.evaluate((e) => e === document.activeElement)).toBe(true);
  rows.push(await focusSnapshot(page));
  await act(btn(page, "展开卡片C"), "expand focused C");
  await expect(btn(page, "收起卡片C")).toBeFocused();
  rows.push(await focusSnapshot(page));
  await page.keyboard.press("Enter");
  await expect(btn(page, "展开卡片C")).toBeFocused();
  rows.push(await focusSnapshot(page));
  for (const r of rows) {
    expect(r).toMatchObject({ visible: true, enabled: true, unoccluded: true });
    expect(r.outline).not.toBe("0px");
  }
  try {
    await seek(btn(page, "读取DOM与最终布局"), "external");
  } catch (error) {
    mkdirSync(out, { recursive: true });
    writeFileSync(
      `${out}/blocked-${info.project.name}.json`,
      JSON.stringify(
        await page.evaluate(() => {
          const e = document.activeElement,
            r = e.getBoundingClientRect(),
            h = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
          return {
            focused: e.outerHTML,
            rect: {
              top: r.top,
              bottom: r.bottom,
              left: r.left,
              right: r.right,
            },
            hit: h?.outerHTML,
            hitAncestors: h
              ? [
                  ...(function* (n) {
                    while (n) {
                      yield { tag: n.tagName, cls: n.className };
                      n = n.parentElement;
                    }
                  })(h),
                ]
              : [],
          };
        }),
        null,
        2,
      ),
    );
    throw error;
  }
  await btn(page, "卡片A移到最前").evaluate((e) => e.click());
  await order(page, "ACB");
  await expect(btn(page, "读取DOM与最终布局")).toBeFocused();
  await btn(page, "立即完成位置过渡").evaluate((e) => e.click());
  await expect(btn(page, "读取DOM与最终布局")).toBeFocused();
  rows.push(await focusSnapshot(page));
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/focus-${info.project.name}.json`,
    JSON.stringify({ rows, trace }, null, 2),
  );
});
test("realtime reduced motion and mode off settle true latest layout while preserving external focus", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, 2);
  await btn(page, "倒序排列").click();
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBeGreaterThan(0);
  await btn(page, "读取DOM与最终布局").focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("layout-lab")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(btn(page, "读取DOM与最终布局")).toBeFocused();
  await order(page, "CBA");
  await btn(page, "按优先级排序").click();
  await order(page, "BCA");
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.getByLabel("减少动态：直接最终布局", { exact: true }).check();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByTestId("layout-lab")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  await page.getByLabel("减少动态：直接最终布局", { exact: true }).uncheck();
  await btn(page, "倒序排列").click();
  expect(
    await page.evaluate(() => document.getAnimations().length),
  ).toBeGreaterThan(0);
  await page.getByLabel("播放FLIP位置过渡", { exact: true }).uncheck();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await order(page, "ACB");
});
test("width changes long content and hidden fixture cancel stale geometry without background rAF or content loss", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page, 2);
  await page.getByLabel("启用长内容压力", { exact: true }).check();
  await btn(page, "展开卡片B").click();
  await btn(page, "立即完成位置过渡").click();
  await fit(page);
  await btn(page, "倒序排列").click();
  await page.setViewportSize({
    width: info.project.name === "desktop" ? 1000 : 340,
    height: 812,
  });
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0);
  await order(page, "CBA");
  await expect(card(page, "B").locator(".layout-details")).toBeVisible();
  await fit(page);
  await btn(page, "按优先级排序").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await order(page, "BCA");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await fit(page);
});
test("natural and external-cancel completion only clean native effects and leave final DOM layout", async ({
  page,
}) => {
  await open(page);
  await btn(page, "倒序排列").click();
  await order(page, "CBA");
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0);
  expect((await geometry(page)).every((r) => r.transform === "none")).toBe(
    true,
  );
  await btn(page, "按优先级排序").click();
  await page.evaluate(() => {
    for (const a of document.getAnimations()) a.cancel();
  });
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0);
  await order(page, "BCA");
  await btn(page, "读取DOM与最终布局").click();
  await expect(page.getByTestId("layout-readout")).toContainText(
    "当前活跃位置过渡 0 个",
  );
});
test("reset latest layout preserves notes and progress reset plus leaving reject saved callbacks with no persistent rAF", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await page.addInitScript(() => {
    const r = requestAnimationFrame,
      c = cancelAnimationFrame;
    window.layoutFrames = new Set();
    window.requestAnimationFrame = (fn) => {
      const id = r.call(window, (t) => {
        window.layoutFrames.delete(id);
        fn(t);
      });
      window.layoutFrames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      window.layoutFrames.delete(id);
      c.call(window, id);
    };
  });
  await open(page, 2);
  await btn(page, "填入卡片A示例备注").click();
  await btn(page, "倒序排列").click();
  await page.evaluate(
    () =>
      (window.beforeReset = window.layoutAnimations
        .map((a) => a.onfinish)
        .filter(Boolean)),
  );
  await btn(page, "恢复初始布局").click();
  await page.evaluate(() => window.beforeReset.forEach((f) => f()));
  await order(page, "ABC");
  await expect(page.getByLabel("卡片A备注", { exact: true })).toHaveValue(
    "正在评估方案A",
  );
  await btn(page, "倒序排列").click();
  await page.evaluate(
    () =>
      (window.beforeLeave = window.layoutAnimations
        .map((a) => a.onfinish)
        .filter(Boolean)),
  );
  await stage(page, 3).click();
  await expect(page.locator("#layout-motion-stage-heading")).toBeFocused();
  expect(await page.evaluate(() => window.layoutFrames.size)).toBe(0);
  expect(
    await page.evaluate(() =>
      window.layoutAnimations.every((a) => a.playState === "idle"),
    ),
  ).toBe(true);
  await stage(page, 0).click();
  await expect(page.locator("#layout-motion-stage-heading")).toBeFocused();
  await page.evaluate(() => window.beforeLeave.forEach((f) => f()));
  await order(page, "ABC");
  await expect(page.getByLabel("卡片A备注", { exact: true })).toHaveValue(
    "卡片A的本地备注",
  );
  await btn(page, "倒序排列").click();
  await page.evaluate(
    () =>
      (window.beforeProgressReset = window.layoutAnimations
        .map((a) => a.onfinish)
        .filter(Boolean)),
  );
  await btn(page, "重置第二十节进度").click();
  await btn(page, "确认重置第二十节").click();
  await expect(page.locator("#layout-motion-stage-heading")).toBeFocused();
  await page.evaluate(() => window.beforeProgressReset.forEach((f) => f()));
  await order(page, "ABC");
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  expect(await page.evaluate(() => window.layoutFrames.size)).toBe(0);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/cleanup-${info.project.name}.json`,
    JSON.stringify(
      { passed: true, nativeAnimations: 0, pendingFrames: 0 },
      null,
      2,
    ),
  );
});
test("missing and throwing WAAPI leave real sort expansion and native actions functional", async ({
  browser,
}) => {
  for (const mode of ["missing", "throw"]) {
    const c = await browser.newContext({
        baseURL: "http://127.0.0.1:4173",
        viewport: { width: 375, height: 812 },
      }),
      p = await c.newPage();
    await p.addInitScript((m) => {
      Element.prototype.animate =
        m === "missing"
          ? undefined
          : function () {
              throw Error("unavailable");
            };
    }, mode);
    await open(p);
    await btn(p, "倒序排列").click();
    await order(p, "CBA");
    await expect(p.locator(".layout-fallback")).toBeVisible();
    await btn(p, "展开卡片B").click();
    await expect(card(p, "B")).toHaveAttribute("data-expanded", "true");
    await btn(p, "读取DOM与最终布局").click();
    await expect(p.getByTestId("layout-readout")).toContainText(
      "当前活跃位置过渡 0 个",
    );
    await axeCheck(p);
    await fit(p);
    await c.close();
  }
});
test("scope agrees with generated brief and all stations pass axe desktop375 local crops", async ({
  page,
}, info) => {
  await open(page);
  const wording = await page.getByTestId("layout-scope").innerText();
  expect(wording).toContain("先更新真实DOM顺序");
  expect(wording).toContain("只动画位置，不缩放宽高");
  mkdirSync(out, { recursive: true });
  for (let n = 0; n < 5; n++) {
    await stage(page, n).click();
    if (n === 4) {
      await btn(page, "生成布局动效指令").click();
      const draft = await page
        .getByLabel("可编辑的 布局动效 Agent 指令")
        .inputValue();
      expect(draft).toContain("动画范围：" + wording);
    }
    await axeCheck(page);
    await fit(page);
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station-${n + 1}-${info.project.name}.png` });
  }
});
async function seed(p) {
  await p.addInitScript((ks) => {
    for (const [i, k] of ks.entries())
      if (localStorage.getItem(k) === null)
        localStorage.setItem(
          k,
          JSON.stringify({ step: i % 5, done: [0], marker: "prior " + i }),
        );
  }, prior);
  await p.addInitScript(deny);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior);
}
async function flow(p, act, toggle, edit) {
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await directory(p, act);
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("倒序排列");
  await a("读取DOM与最终布局");
  await toggle(p.getByLabel("播放FLIP位置过渡", { exact: true }), "mode off");
  await toggle(p.getByLabel("播放FLIP位置过渡", { exact: true }), "mode on");
  await next();
  await a("填入卡片A示例备注");
  await a("展开卡片A");
  await a("收起卡片A");
  await toggle(
    p.getByLabel("我已核对位置过渡、即时尺寸与不拉伸内容", { exact: true }),
    "content review",
  );
  await next();
  await a("倒序排列");
  await a("按优先级排序");
  await toggle(p.getByLabel("启用长内容压力", { exact: true }), "long");
  await toggle(
    p.getByLabel("减少动态：直接最终布局", { exact: true }),
    "reduce",
  );
  await a("读取DOM与最终布局");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(1), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [0, 1, 0].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry " + i);
  await next();
  await a("生成布局动效指令");
  const draft = p.getByLabel("可编辑的 布局动效 Agent 指令");
  await expect(draft).toHaveValue(
    /动画范围.*实现与时序.*内容策略.*打断与清理.*焦点与滚动.*何时不动画.*验收/s,
  );
  if (edit) await edit(draft);
  await a("复制布局动效指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 布局目标、内容、打断、焦点与不动画条件。", {
      exact: true,
    }),
    "review",
  );
  await a("完成第二十节");
  await expect(p.locator(".lesson-twenty .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.layoutKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十节进度");
  await a("保留第二十节进度");
  await expect(p.locator(".lesson-twenty .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十节进度");
  await a("确认重置第二十节");
  await expect(p.locator("#layout-motion-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.layoutKeys ?? null),
  };
}
test("complete real keyboard edited brief wrong retry refresh cancel confirm reset preserves nineteen stores", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson20",
      profile: info.project.name,
    }),
    r = await flow(page, act, toggle, async (f) => {
      await seek(f, "edit");
      await page.keyboard.press("Control+End");
      await page.keyboard.type("\nReview: keep actual order and content.");
    });
  expect(
    await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
  ).toEqual(before);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...r }, null, 2),
  );
});
for (const reduced of [false, true])
  test(`complete zero keyboard touch ${reduced ? "reduced" : "normal"} wrong retry refresh cancel confirm reset preserves nineteen stores`, async ({
    browser,
  }, info) => {
    const c = await browser.newContext({
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: reduced ? "reduce" : "no-preference",
        baseURL: "http://127.0.0.1:4173",
      }),
      p = await c.newPage(),
      trace = [];
    await p.addInitScript(() => {
      window.layoutKeys = [];
      for (const type of ["keydown", "keyup"])
        addEventListener(type, (e) => window.layoutKeys.push(e.key));
    });
    const before = await seed(p),
      tap = async (l, n) => {
        await l.tap();
        trace.push(n);
      },
      r = await flow(p, tap, tap);
    expect(r.keysBefore).toEqual([]);
    expect(r.keysAfter).toEqual([]);
    expect(
      await p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior),
    ).toEqual(before);
    mkdirSync(out, { recursive: true });
    writeFileSync(
      `${out}/touch-${reduced ? "reduced" : "normal"}-${info.project.name}.json`,
      JSON.stringify({ passed: true, trace, ...r }, null, 2),
    );
    await c.close();
  });
test("editable copy success late failure corrupt unavailable storage and reset stay scoped", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.copied = t) },
    }),
  );
  await open(page, 4);
  await btn(page, "生成布局动效指令").click();
  const draft = page.getByLabel("可编辑的 布局动效 Agent 指令");
  await draft.fill(
    "自定义布局动效简报 " + "真实顺序，内容不拉伸，减少动态与焦点。".repeat(8),
  );
  await btn(page, "复制布局动效指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.copied)).toBe(
    await draft.inputValue(),
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise((r, j) => (window.lateReject = j)),
      },
    }),
  );
  await btn(page, "复制布局动效指令").click();
  await btn(page, "重置第二十节进度").click();
  await page.keyboard.press("Escape");
  await expect(btn(page, "重置第二十节进度")).toBeFocused();
  await btn(page, "重置第二十节进度").click();
  await btn(page, "确认重置第二十节").click();
  await page.evaluate(() => window.lateReject(Error("late")));
  await stage(page, 4).click();
  await expect(draft).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText(
    "自动复制不可用",
  );
  await page.evaluate(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 999,
          done: [0, 0, 8],
          duration: -1,
          answers: [0, 9, null],
        }),
      ),
    key,
  );
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-bottom")).toContainText("1 / 5");
  await expect(btn(page, "常速300ms")).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
    Storage.prototype.removeItem = () => {
      throw Error("denied");
    };
  });
  await page.getByLabel("播放FLIP位置过渡", { exact: true }).check();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  await btn(page, "重置第二十节进度").click();
  await btn(page, "确认重置第二十节").click();
  await expect(page.locator(".lesson-bottom")).toContainText("0 / 5");
});
