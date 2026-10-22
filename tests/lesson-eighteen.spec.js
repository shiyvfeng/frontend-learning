import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
const out = "/tmp/presence-acceptance",
  key = "frontend-observatory.lesson18.v1",
  prior = Array.from(
    { length: 17 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  row = (p, id) => p.locator(`.presence-row[data-id="${id}"]`),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第十八节学习步骤" })
      .getByRole("button")
      .nth(n),
  pause = (p) => p.getByLabel("暂停过渡以观察阶段", { exact: true });
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "directory");
  await act(nav.getByRole("button").nth(17), "lesson18");
  await expect(p.locator("#presence-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
}
async function phase(p, id, value) {
  await expect(row(p, id)).toHaveAttribute("data-phase", value);
  await expect(p.locator(`[data-state-id="${id}"]`)).toHaveAttribute(
    "data-phase",
    value,
  );
  if (value === "present")
    await expect(row(p, id)).not.toHaveAttribute("inert", "");
  else await expect(row(p, id)).toHaveAttribute("inert", "");
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
async function focusSnapshot(p) {
  return p.evaluate(() => {
    const e = document.activeElement,
      r = e.getBoundingClientRect(),
      s = getComputedStyle(e),
      h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      name: e.textContent.trim().slice(0, 80),
      tag: e.tagName,
      visible: r.width > 0 && r.height > 0 && s.visibility === "visible",
      enabled: !e.disabled,
      unoccluded: h === e || e.contains(h),
      outline: s.outlineWidth,
      inert: !!e.closest("[inert]"),
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
test("eighteenth lazy route opens first eighteen only without Motion or external requests", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-eighteen-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(requests.some((u) => /lesson-eighteen-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Enter/Exit · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(27);
  await expect(page.getByTestId("presence-lab")).toContainText("未使用 Motion");
  expect(
    requests
      .filter((u) => /^https?:/.test(u))
      .every((u) => u.startsWith("http://127.0.0.1:4173")),
  ).toBe(true);
});
test("direct conditional unmount has no exit object and closing its focused child restores safe focus", async ({
  page,
}, info) => {
  await open(page);
  const trace = [],
    { act } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson18-direct",
      profile: info.project.name,
    });
  await act(btn(page, "直接关闭此通知"), "direct close");
  await expect(page.getByTestId("direct-notice")).toHaveCount(0);
  await expect(page.getByTestId("direct-absent")).toContainText("DOM 不存在");
  await expect(btn(page, "重新挂载直接示例")).toBeFocused();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await btn(page, "重新挂载直接示例").click();
  await expect(page.getByTestId("direct-notice")).toHaveCount(1);
  await btn(page, "直接卸载示例").click();
  await expect(btn(page, "直接卸载示例")).toBeFocused();
});
test("actual WAAPI frames correspond to DOM phases and both manual and natural exit truly remove", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page);
  await pause(page).check();
  await btn(page, "添加通知").click();
  await phase(page, 2, "entering");
  await expect(row(page, 2)).toHaveAttribute("aria-hidden", "true");
  const measured = await row(page, 2).evaluate((e) => {
    const a = e.getAnimations()[0];
    a.currentTime = 140;
    return {
      playState: a.playState,
      frames: a.effect.getKeyframes(),
      opacity: Number(getComputedStyle(e).opacity),
      transform: getComputedStyle(e).transform,
    };
  });
  expect(measured.playState).toBe("paused");
  expect(measured.opacity).toBeGreaterThan(0);
  expect(measured.opacity).toBeLessThan(1);
  await btn(page, "立即完成当前动画").click();
  await phase(page, 2, "present");
  await btn(page, "移除通知 #2").click();
  await phase(page, 2, "exiting");
  await btn(page, "读取 DOM 与动画阶段").click();
  await expect(page.getByTestId("presence-state")).toContainText("#2：exiting");
  await btn(page, "立即完成当前动画").click();
  await expect(row(page, 2)).toHaveCount(0);
  await expect(page.locator('[data-state-id="2"]')).toHaveCount(0);
  await pause(page).uncheck();
  await btn(page, "添加通知").click();
  await phase(page, 3, "present");
  await btn(page, "移除通知 #3").click();
  await expect(row(page, 3)).toHaveCount(0);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/real-waapi-${info.project.name}.json`,
    JSON.stringify(measured, null, 2),
  );
});
test("rapid reversal preserves same DOM and edited note, stale real and diagnostic exit callbacks cannot remove it", async ({
  page,
}) => {
  await open(page, 2);
  await pause(page).check();
  const item = await row(page, 1).elementHandle();
  await page
    .getByLabel("通知 #1 的本地备注", { exact: true })
    .fill("真实编辑，撤回后保留");
  await btn(page, "移除通知 #1").click();
  await phase(page, 1, "exiting");
  await page.evaluate(
    () =>
      (window.oldExit = document
        .querySelector(".presence-row")
        .getAnimations()[0].onfinish),
  );
  await btn(page, "撤回最近离场").click();
  await phase(page, 1, "entering");
  expect(
    await item.evaluate(
      (e) => e === document.querySelector('.presence-row[data-id="1"]'),
    ),
  ).toBe(true);
  await page.evaluate(() => window.oldExit());
  await phase(page, 1, "entering");
  await btn(page, "投递一个旧完成信号").click();
  await expect(page.getByTestId("presence-feedback")).toContainText("已隔离");
  await btn(page, "立即完成当前动画").click();
  await phase(page, 1, "present");
  await expect(
    page.getByLabel("通知 #1 的本地备注", { exact: true }),
  ).toHaveValue("真实编辑，撤回后保留");
  for (let i = 0; i < 4; i++) {
    await btn(page, "移除通知 #1").click();
    await btn(page, "撤回最近离场").click();
    await btn(page, "立即完成当前动画").click();
  }
  await phase(page, 1, "present");
  await page.evaluate(() => window.oldExit());
  await phase(page, 1, "present");
});
test("entry removal duplicate requests identity cap and old callback cannot delete a newly recreated same-text instance", async ({
  page,
}) => {
  await open(page, 2);
  await pause(page).check();
  await btn(page, "移除通知 #1").click();
  const epoch = await row(page, 1).getAttribute("data-epoch");
  await row(page, 1)
    .locator("button")
    .evaluate((e) => {
      e.click();
      e.click();
    });
  await expect(row(page, 1)).toHaveAttribute("data-epoch", epoch);
  await btn(page, "立即完成当前动画").click();
  await expect(row(page, 1)).toHaveCount(0);
  await btn(page, "添加通知").click();
  await phase(page, 2, "entering");
  await page.evaluate(
    () =>
      (window.oldEnter = document
        .querySelector(".presence-row")
        .getAnimations()[0].onfinish),
  );
  await btn(page, "移除最早可用通知").click();
  await phase(page, 2, "exiting");
  await page.evaluate(() => window.oldEnter());
  await phase(page, 2, "exiting");
  await btn(page, "立即完成当前动画").click();
  await btn(page, "撤回最近离场").click();
  await phase(page, 3, "entering");
  await btn(page, "投递一个旧完成信号").click();
  await phase(page, 3, "entering");
  await btn(page, "立即完成当前动画").click();
  for (let i = 0; i < 5; i++) await btn(page, "添加通知").click();
  await expect(page.locator(".presence-row")).toHaveCount(6);
  await btn(page, "添加通知").click();
  await expect(page.locator(".presence-row")).toHaveCount(6);
  await expect(page.getByTestId("presence-feedback")).toContainText(
    "最多保留6个",
  );
  const ids = await page
    .locator(".presence-row")
    .evaluateAll((es) => es.map((e) => e.dataset.id));
  expect(new Set(ids).size).toBe(6);
});
test("cancel and unmount clear actual animations and saved callbacks cannot mutate a new session", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    window.presenceAnimations = [];
    Element.prototype.animate = function (...args) {
      const a = original.apply(this, args);
      window.presenceAnimations.push(a);
      return a;
    };
  });
  await open(page, 2);
  await pause(page).check();
  await btn(page, "移除通知 #1").click();
  await phase(page, 1, "exiting");
  await page.evaluate(
    () =>
      (window.savedExit = document
        .querySelector(".presence-row")
        .getAnimations()[0].onfinish),
  );
  await btn(page, "取消过渡并保留内容").click();
  await phase(page, 1, "present");
  expect(
    await page.evaluate(() =>
      window.presenceAnimations.every((a) => a.playState === "idle"),
    ),
  ).toBe(true);
  await page.evaluate(() => window.savedExit());
  await phase(page, 1, "present");
  await btn(page, "移除通知 #1").click();
  await phase(page, 1, "exiting");
  await page.evaluate(() => {
    const a = document.querySelector(".presence-row").getAnimations()[0];
    window.nativeCanceledFinish = a.onfinish;
    a.cancel();
  });
  await phase(page, 1, "present");
  await expect(page.getByTestId("presence-feedback")).toContainText(
    "动画已取消",
  );
  await page.evaluate(() => window.nativeCanceledFinish());
  await phase(page, 1, "present");

  await btn(page, "移除通知 #1").click();
  await page.evaluate(
    () =>
      (window.unmountedExit = document
        .querySelector(".presence-row")
        .getAnimations()[0].onfinish),
  );
  await stage(page, 3).click();
  await expect(page.getByTestId("presence-lab")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.presenceAnimations.every((a) => a.playState === "idle"),
    ),
  ).toBe(true);
  await page.evaluate(() => window.unmountedExit());
  await stage(page, 0).click();
  await phase(page, 1, "present");
  await page.evaluate(() => window.unmountedExit());
  await phase(page, 1, "present");
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/cleanup-${info.project.name}.json`,
    JSON.stringify(
      await page.evaluate(() =>
        window.presenceAnimations.map((a) => ({
          playState: a.playState,
          onfinishCleared: a.onfinish === null,
          oncancelCleared: a.oncancel === null,
        })),
      ),
      null,
      2,
    ),
  );
});
test("retiming invalidates prior completion and realtime reduced motion overrides paused exit without stealing focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, 2);
  await pause(page).check();
  await btn(page, "移除通知 #1").click();
  await page.evaluate(
    () =>
      (window.retimedExit = document
        .querySelector(".presence-row")
        .getAnimations()[0].onfinish),
  );
  const epoch = await row(page, 1).getAttribute("data-epoch");
  await btn(page, "慢速 · 1800ms").click();
  expect(await row(page, 1).getAttribute("data-epoch")).not.toBe(epoch);
  await page.evaluate(() => window.retimedExit());
  await phase(page, 1, "exiting");
  await btn(page, "读取 DOM 与动画阶段").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("presence-lab")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  await expect(row(page, 1)).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(btn(page, "读取 DOM 与动画阶段")).toBeFocused();
  await btn(page, "撤回最近离场").click();
  await phase(page, 2, "present");
  await btn(page, "投递一个旧完成信号").click();
  await phase(page, 2, "present");
  await page.getByLabel("减少动态并立即完成", { exact: true }).check();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByTestId("presence-lab")).toHaveAttribute(
    "data-reduced",
    "true",
  );
});
test("inert exits have no real Tab targets, immediate focused deletion chooses next row or stable add and keeps external focus", async ({
  page,
}, info) => {
  await open(page);
  await pause(page).check();
  await btn(page, "添加通知").click();
  await btn(page, "立即完成当前动画").click();
  const trace = [],
    rows = [],
    { act, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson18-immediate",
      profile: info.project.name,
    });
  await act(btn(page, "移除通知 #1"), "remove focused #1");
  await expect(btn(page, "移除通知 #2")).toBeFocused();
  rows.push(await focusSnapshot(page));
  await act(btn(page, "移除通知 #2"), "remove focused #2");
  await expect(btn(page, "添加通知")).toBeFocused();
  rows.push(await focusSnapshot(page));
  for (const r of rows) {
    expect(r).toMatchObject({
      visible: true,
      enabled: true,
      unoccluded: true,
      inert: false,
    });
    expect(r.outline).not.toBe("0px");
  }
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement.closest("[inert]")),
    ).toBe(false);
  }
  await seek(btn(page, "读取 DOM 与动画阶段"), "external");
  await btn(page, "立即完成当前动画").evaluate((e) => e.click());
  await expect(btn(page, "读取 DOM 与动画阶段")).toBeFocused();
  await expect(page.locator(".presence-row")).toHaveCount(0);
  rows.push(await focusSnapshot(page));
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/immediate-${info.project.name}.json`,
    JSON.stringify({ rows, trace }, null, 2),
  );
});
test("missing or throwing WAAPI completes immediately with honest fallback and no stranded inert controls", async ({
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
    await open(p, 2);
    await pause(p).check();
    await btn(p, "添加通知").click();
    await phase(p, 2, "present");
    await expect(p.locator(".presence-fallback")).toBeVisible();
    await btn(p, "移除通知 #1").click();
    await expect(row(p, 1)).toHaveCount(0);
    await btn(p, "撤回最近离场").click();
    await phase(p, 3, "present");
    await btn(p, "读取 DOM 与动画阶段").click();
    expect(
      await p.evaluate(
        () =>
          JSON.parse(localStorage.getItem("frontend-observatory.lesson18.v1"))
            .staticPolicyRead,
      ),
    ).toBe(true);
    await axeCheck(p);
    await c.close();
  }
});
test("experiment and generated brief agree on notification-only animation scope and layout stays outside this experiment", async ({
  page,
}, info) => {
  await open(page);
  const scope = page.getByTestId("presence-animation-scope");
  await expect(scope).toContainText("只作用于进入或离开的通知本身");
  await expect(scope).toContainText(
    "其余通知会按正常布局重新排列，可能直接跳到新位置",
  );
  await expect(scope).toContainText("尚未实现 Layout Animation");
  await expect(scope).toContainText("布局动画另见第20课");
  const wording = await scope.innerText();
  await fit(page);
  mkdirSync(out, { recursive: true });
  await scope.screenshot({
    path: `${out}/animation-scope-${info.project.name}.png`,
  });
  await stage(page, 4).click();
  await btn(page, "生成进入退出指令").click();
  const draft = await page
    .getByLabel("可编辑的 进入退出 Agent 指令")
    .inputValue();
  expect(draft).toContain(`动画范围：${wording}`);
  expect(draft.split(wording)).toHaveLength(2);
  await fit(page);
});
test("all five stations and inert transition phase pass axe and desktop 375 local crops", async ({
  page,
}, info) => {
  await open(page);
  mkdirSync(out, { recursive: true });
  for (let n = 0; n < 5; n++) {
    await stage(page, n).click();
    if (n === 4) await btn(page, "生成进入退出指令").click();
    await axeCheck(page);
    await fit(page);
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station-${n + 1}-${info.project.name}.png` });
  }
  await stage(page, 0).click();
  await pause(page).check();
  await btn(page, "移除通知 #1").click();
  await phase(page, 1, "exiting");
  await axeCheck(page);
  await fit(page);
  await page
    .locator(".presence-lab")
    .screenshot({ path: `${out}/exiting-${info.project.name}.png` });
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
async function flow(p, act, toggle, edit, staticMode = false) {
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await directory(p, act);
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("直接卸载示例");
  await a("添加通知");
  await a("立即完成当前动画");
  await a("移除最早可用通知");
  await a("立即完成当前动画");
  await next();
  await a("慢速 · 1800ms");
  await a("填入示例内容");
  await toggle(pause(p), "pause");
  await a("读取 DOM 与动画阶段");
  await a("记录 CSS / WAAPI / presence 分工");
  await next();
  await a("移除最早可用通知");
  await a("撤回最近离场");
  await a("立即完成当前动画");
  if (!staticMode) await a("移除最早可用通知");
  await a("取消过渡并保留内容");
  if (staticMode) await a("读取 DOM 与动画阶段");
  await a("投递一个旧完成信号");
  await expect(p.getByTestId("presence-feedback")).toContainText("已隔离");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(1), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [0, 1, 0].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry " + i);
  await next();
  await a("生成进入退出指令");
  const draft = p.getByLabel("可编辑的 进入退出 Agent 指令");
  await expect(draft).toHaveValue(
    /触发与属性.*技术选择.*时序与打断.*焦点与交互.*减少动态.*验收/s,
  );
  if (edit) await edit(draft);
  await a("复制进入退出指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 时序、卸载、打断、焦点与减少动态。", {
      exact: true,
    }),
    "review",
  );
  await a("完成第十八节");
  await expect(p.locator(".lesson-eighteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.presenceKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-eighteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十八节进度");
  await a("保留第十八节进度");
  await expect(p.locator(".lesson-eighteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十八节进度");
  await a("确认重置第十八节");
  await expect(p.locator("#presence-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-eighteen .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.presenceKeys ?? null),
  };
}
test("complete keyboard wrong retry real brief editing refresh cancel confirm reset preserves seventeen stores", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson18",
      profile: info.project.name,
    }),
    r = await flow(page, act, toggle, async (f) => {
      await seek(f, "edit");
      await page.keyboard.press("Control+End");
      await page.keyboard.type("\nReview: remove stale callbacks.");
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
  test(`complete zero keyboard touch ${reduced ? "reduced" : "normal"} wrong retry refresh cancel confirm reset preserves seventeen stores`, async ({
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
      window.presenceKeys = [];
      for (const type of ["keydown", "keyup"])
        addEventListener(type, (e) => window.presenceKeys.push(e.key));
    });
    const before = await seed(p),
      tap = async (l, n) => {
        await l.tap();
        trace.push(n);
      },
      r = await flow(p, tap, tap, null, reduced);
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
test("editable copy success failure late response reset and corrupt unavailable storage remain usable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.copied = t) },
    }),
  );
  await open(page, 4);
  await btn(page, "生成进入退出指令").click();
  const draft = page.getByLabel("可编辑的 进入退出 Agent 指令");
  await draft.fill(
    "自定义进入退出指令 " + "保留身份与焦点，减少动态，完成后卸载。".repeat(8),
  );
  await btn(page, "复制进入退出指令").click();
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
  await btn(page, "复制进入退出指令").click();
  await btn(page, "重置第十八节进度").click();
  await page.keyboard.press("Escape");
  await expect(btn(page, "重置第十八节进度")).toBeFocused();
  await btn(page, "重置第十八节进度").click();
  await btn(page, "确认重置第十八节").click();
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
          step: 99,
          done: [0, 0, 7],
          duration: -1,
          answers: [0, 8, null],
        }),
      ),
    key,
  );
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-bottom")).toContainText("1 / 5");
  await expect(btn(page, "常速 · 280ms")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
    Storage.prototype.removeItem = () => {
      throw Error("denied");
    };
  });
  await btn(page, "填入示例内容").click();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
  await btn(page, "重置第十八节进度").click();
  await btn(page, "确认重置第十八节").click();
  await expect(page.locator(".lesson-bottom")).toContainText("0 / 5");
});
