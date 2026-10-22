import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
const out = "/tmp/micro-acceptance",
  key = "frontend-observatory.lesson17.v1",
  prior = Array.from(
    { length: 16 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  target = (p, k) => p.getByTestId(`micro-${k}`),
  step = (p, n) =>
    p
      .getByRole("navigation", { name: "第十七节学习步骤" })
      .getByRole("button")
      .nth(n);
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "directory");
  await act(nav.getByRole("button").nth(16), "lesson17");
  await expect(p.locator("#micro-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await step(p, n).click();
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
async function frame(p) {
  await p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
async function snapshot(p, k) {
  return target(p, k).evaluate((e) => {
    const r = e.getBoundingClientRect(),
      cs = getComputedStyle(e),
      hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
    return {
      pressed: e.dataset.pressed,
      count: Number(e.dataset.count),
      hover: e.dataset.hover,
      focus: e === document.activeElement,
      transform: cs.transform,
      outline: cs.outlineWidth,
      motion: e.dataset.motion,
      value: Number(e.dataset.value ?? 0),
      enabled: !e.disabled,
      visible: r.width > 0 && r.height > 0 && cs.visibility === "visible",
      unoccluded: hit === e || e.contains(hit),
    };
  });
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
test("seventeenth is lazy, first seventeen metadata agree and later lessons remain previews", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(urls.some((u) => /lesson-seventeen-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(urls.some((u) => /lesson-seventeen-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Micro Interaction · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(26);
  await expect(page.getByTestId("micro-lab")).toContainText("未使用 Motion");
  expect(
    urls
      .filter((u) => /https?:/.test(u))
      .every((u) => u.startsWith("http://127.0.0.1:4173")),
  ).toBe(true);
});
test("real hover focus press release and cancel change actual CSS and spring feedback", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page);
  const records = [];
  for (const k of ["css", "spring"]) {
    const t = target(page, k);
    await t.scrollIntoViewIfNeeded();
    const box = await t.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(t).toHaveAttribute("data-hover", "true");
    await expect
      .poll(async () => await t.evaluate((e) => getComputedStyle(e).transform))
      .not.toBe("matrix(1, 0, 0, 1, 0, 0)");
    await page.mouse.down();
    await expect(t).toHaveAttribute("data-pressed", "true");
    await expect(t).toBeFocused();
    await page.mouse.up();
    await expect(t).toHaveAttribute("data-pressed", "false");
    await expect(t).toHaveAttribute("data-count", "1");
    records.push({ kind: k, afterClick: await snapshot(page, k) });
    await page.mouse.down();
    await expect(t).toHaveAttribute("data-pressed", "true");
    await page.mouse.move(box.x - 20, box.y);
    await page.mouse.up();
    await expect(t).toHaveAttribute("data-pressed", "false");
    await expect(t).toHaveAttribute("data-count", "1");
    await expect(page.locator(`#micro-status-${k}`)).toContainText("取消");
    records.push({ kind: k, afterCancel: await snapshot(page, k) });
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/real-events-${info.project.name}.json`,
    JSON.stringify(records, null, 2),
  );
});
test("Space Enter repeat Escape blur and external focus never leave pressed or falsely activate", async ({
  page,
}, info) => {
  await open(page);
  const rows = [],
    trace = [],
    { seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson17-immediate",
      profile: info.project.name,
    });
  for (const k of ["css", "spring"]) {
    const t = target(page, k);
    await seek(t, k);
    await page.keyboard.down("Space");
    await page.keyboard.down("Space");
    await expect(t).toHaveAttribute("data-pressed", "true");
    await page.keyboard.up("Space");
    await expect(t).toHaveAttribute("data-count", "1");
    await expect(t).toBeFocused();
    await page.keyboard.down("Enter");
    await page.keyboard.press("Escape");
    await page.keyboard.up("Enter");
    await expect(t).toHaveAttribute("data-count", "1");
    await expect(t).toHaveAttribute("data-pressed", "false");
    await expect(t).toBeFocused();
    const escaped = await snapshot(page, k);
    expect(escaped).toMatchObject({
      focus: true,
      enabled: true,
      visible: true,
      unoccluded: true,
      pressed: "false",
    });
    expect(escaped.outline).not.toBe("0px");
    rows.push({ kind: k, afterEscape: escaped });
    await page.keyboard.down("Space");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Space");
    await expect(t).toHaveAttribute("data-pressed", "false");
    await expect(t).toHaveAttribute("data-count", "1");
    await expect(t).not.toBeFocused();
    await seek(t, k);
    await page.keyboard.press("Enter");
    await expect(t).toHaveAttribute("data-count", "2");
    const entered = await snapshot(page, k);
    expect(entered).toMatchObject({
      focus: true,
      enabled: true,
      visible: true,
      unoccluded: true,
      pressed: "false",
    });
    expect(entered.outline).not.toBe("0px");
    rows.push({ kind: k, afterEnter: entered });
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/keyboard-events-${info.project.name}.json`,
    JSON.stringify({ rows, trace }, null, 2),
  );
});
test("trusted touch pointercancel and lost capture clear without activation and next tap recovers", async ({
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
  const cdp = await c.newCDPSession(p),
    records = [];
  for (const k of ["css", "spring"]) {
    const t = target(p, k);
    await t.scrollIntoViewIfNeeded();
    const r = await t.boundingBox(),
      point = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await expect(t).toHaveAttribute("data-pressed", "true");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(t).toHaveAttribute("data-pressed", "false");
    await expect(t).toHaveAttribute("data-count", "0");
    await expect(p.locator(`#micro-status-${k}`)).toContainText(
      "pointercancel",
    );
    await t.tap();
    await expect(t).toHaveAttribute("data-count", "1");
    records.push({ kind: k, state: await snapshot(p, k) });
    await t.dispatchEvent("pointerdown", {
      pointerId: 88,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
    });
    await expect(t).toHaveAttribute("data-pressed", "true");
    await t.dispatchEvent("lostpointercapture", { pointerId: 88 });
    await expect(t).toHaveAttribute("data-pressed", "false");
    await expect(t).toHaveAttribute("data-count", "1");
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/touch-cancel-${info.project.name}.json`,
    JSON.stringify(records, null, 2),
  );
  await c.close();
});
test("parameters affect properties and spring trajectory includes controlled rebound rather than fixed CSS timing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, 1);
  await btn(page, "明显 · 7px").click();
  await btn(page, "320ms").click();
  await btn(page, "弹性 · 阻尼11").click();
  await page.getByLabel("反馈文案", { exact: true }).fill("真实编辑");
  await expect(target(page, "css")).toContainText("真实编辑");
  expect(
    await target(page, "css").evaluate(
      (e) => getComputedStyle(e).transitionDuration,
    ),
  ).toContain("0.32s");
  await target(page, "spring").scrollIntoViewIfNeeded();
  const t = target(page, "spring"),
    r = await t.boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  const samples = await t.evaluate(
    (e) =>
      new Promise((resolve) => {
        const values = [],
          start = performance.now();
        function sample() {
          values.push(Number(e.dataset.value || 0));
          if (performance.now() - start < 550) requestAnimationFrame(sample);
          else resolve(values);
        }
        requestAnimationFrame(sample);
      }),
  );
  expect(Math.max(...samples)).toBeGreaterThan(7);
  await page.mouse.up();
  await btn(page, "无位移 · 0px").click();
  await expect
    .poll(async () => Number(await t.getAttribute("data-value")))
    .toBe(0);
});
test("midflight system reduced motion and manual pause stop displacement while state and outline survive", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, 2);
  await btn(page, "弹性 · 阻尼11").click();
  await btn(page, "明显 · 7px").click();
  const t = target(page, "spring");
  await t.scrollIntoViewIfNeeded();
  await t.hover();
  await page.mouse.down();
  await expect(t).toHaveAttribute("data-pressed", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("micro-preference")).toContainText(
    "系统减少动态：开启",
  );
  await expect(page.getByTestId("micro-lab")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  await expect(t).toHaveAttribute("data-motion", "settled");
  for (const k of ["css", "spring"])
    expect(
      await target(page, k).evaluate((e) => getComputedStyle(e).transform),
    ).toBe("none");
  await page.mouse.up();
  await expect(t).toHaveAttribute("data-count", "1");
  expect((await snapshot(page, "spring")).outline).not.toBe("0px");
  await page.getByLabel("暂停非必要位移", { exact: true }).check();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByTestId("micro-lab")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  await page.getByLabel("暂停非必要位移", { exact: true }).uncheck();
  await expect(page.getByTestId("micro-lab")).toHaveAttribute(
    "data-reduced",
    "false",
  );
  await t.click();
  await expect(t).toHaveAttribute("data-count", "2");
});
test("disabled has no fake activation and animation frames clean up on repeated interruption stage switch and leaving", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const r = requestAnimationFrame,
      c = cancelAnimationFrame;
    window.microFrames = new Set();
    window.requestAnimationFrame = (fn) => {
      const id = r.call(window, (t) => {
        window.microFrames.delete(id);
        fn(t);
      });
      window.microFrames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      window.microFrames.delete(id);
      c.call(window, id);
    };
  });
  await open(page, 2);
  const disabled = btn(page, "不可用的本地操作");
  await expect(disabled).toBeDisabled();
  await disabled.evaluate((e) => e.click());
  await expect(page.locator(".micro-result").first()).toContainText(
    "激活 0 次",
  );
  await btn(page, "弹性 · 阻尼11").click();
  for (let i = 0; i < 6; i++) {
    await target(page, "spring").click();
  }
  await expect(target(page, "spring")).toHaveAttribute("data-count", "6");
  await target(page, "spring").hover();
  await page.mouse.down();
  await step(page, 3).focus();
  await page.keyboard.press("Enter");
  await page.mouse.up();
  await expect(page.getByTestId("micro-lab")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.microFrames.size)).toBe(0);
  await step(page, 0).click();
  await expect(target(page, "spring")).toHaveAttribute("data-pressed", "false");
  await expect(target(page, "spring")).toHaveAttribute("data-count", "0");
  await target(page, "spring").hover();
  await page.mouse.down();
  await expect(target(page, "spring")).toHaveAttribute("data-pressed", "true");
  await expect(target(page, "spring")).toHaveAttribute(
    "data-motion",
    "running",
  );
  // Diagnostic route activation during pointer capture; frame cleanup must not depend on pointerup.
  await page
    .locator('nav[aria-label="课程目录"] button')
    .first()
    .evaluate((e) => e.click());
  await page.mouse.up();
  await expect(page.locator("#stage-heading")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.microFrames.size)).toBe(0);
});
test("all stations axe desktop 375 local crops forced colors focus and reduced motion", async ({
  page,
}, info) => {
  await open(page);
  mkdirSync(out, { recursive: true });
  for (let n = 0; n < 5; n++) {
    await step(page, n).click();
    if (n === 4) await btn(page, "生成微交互指令").click();
    await axeCheck(page);
    await fit(page);
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station-${n + 1}-${info.project.name}.png` });
  }
  await step(page, 0).click();
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await btn(page, "将焦点移到 CSS 示例").click();
  await expect(target(page, "css")).toBeFocused();
  expect((await snapshot(page, "css")).outline).not.toBe("0px");
  await axeCheck(page);
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
  await act(target(p, "css"), "CSS");
  await act(target(p, "spring"), "spring");
  await a("将焦点移到 CSS 示例");
  await next();
  await a("明显 · 7px");
  await a("320ms");
  await a("弹性 · 阻尼11");
  await a("填入示例文案");
  await a("记录比较：简单反馈优先 CSS");
  await next();
  await toggle(p.getByLabel("暂停非必要位移", { exact: true }), "pause");
  await act(target(p, "css"), "static CSS");
  await toggle(
    p.getByLabel("我已核对取消、禁用与静态状态反馈", { exact: true }),
    "boundary",
  );
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry " + i);
  await next();
  await a("生成微交互指令");
  const draft = p.getByLabel("可编辑的 微交互 Agent 指令");
  await expect(draft).toHaveValue(
    /触发.*变化属性.*激活与取消.*减少动态.*验收/s,
  );
  if (edit) await edit(draft);
  await a("复制微交互指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 触发、属性、强度、减少动态与验收。", {
      exact: true,
    }),
    "review",
  );
  await a("完成第十七节");
  await expect(p.locator(".lesson-seventeen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.microKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-seventeen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十七节进度");
  await a("保留第十七节进度");
  await expect(p.locator(".lesson-seventeen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十七节进度");
  await a("确认重置第十七节");
  await expect(p.locator("#micro-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-seventeen .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.microKeys ?? null),
  };
}
test("complete keyboard wrong retry real editable brief refresh cancel confirm reset preserves sixteen stores", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { seek, act, toggle } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson17",
      profile: info.project.name,
    });
  const r = await flow(page, act, toggle, async (f) => {
    await seek(f, "edit");
    await page.keyboard.press("Control+End");
    await page.keyboard.type("\nReview: retain visible focus.");
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
test("complete zero keyboard touch wrong retry refresh cancel confirm reset preserves sixteen stores", async ({
  browser,
}, info) => {
  const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      baseURL: "http://127.0.0.1:4173",
    }),
    p = await c.newPage(),
    trace = [];
  await p.addInitScript(() => {
    window.microKeys = [];
    for (const type of ["keydown", "keyup"])
      addEventListener(type, (e) => window.microKeys.push(e.key));
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
    `${out}/touch-${info.project.name}.json`,
    JSON.stringify({ passed: true, trace, ...r }, null, 2),
  );
  await c.close();
});
test("editable copy success fallback late response reset and unavailable or corrupt storage stay honest", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copied = text;
        },
      },
    });
  });
  await open(page, 4);
  await btn(page, "生成微交互指令").click();
  const draft = page.getByLabel("可编辑的 微交互 Agent 指令");
  await draft.fill(
    "自定义微交互简报 " + "保留触发与焦点，减少动态，取消路径。".repeat(8),
  );
  await btn(page, "复制微交互指令").click();
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
  await btn(page, "复制微交互指令").click();
  await btn(page, "重置第十七节进度").click();
  await page.keyboard.press("Escape");
  await expect(btn(page, "重置第十七节进度")).toBeFocused();
  await btn(page, "重置第十七节进度").click();
  await btn(page, "确认重置第十七节").click();
  await page.evaluate(() => window.lateReject(Error("late")));
  await step(page, 4).click();
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
          done: [0, 0, 9],
          strength: -1,
          preset: "bad",
          answers: [1, 9, null],
        }),
      ),
    key,
  );
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-bottom")).toContainText("1 / 5");
  await expect(btn(page, "轻 · 3px")).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
    Storage.prototype.removeItem = () => {
      throw Error("denied");
    };
  });
  await btn(page, "填入示例文案").click();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  await btn(page, "重置第十七节进度").click();
  await btn(page, "确认重置第十七节").click();
  await expect(page.locator(".lesson-bottom")).toContainText("0 / 5");
  await expect(page.locator("#micro-stage-heading")).toBeFocused();
});
