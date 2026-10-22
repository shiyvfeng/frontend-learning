import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
const out = "/tmp/shared-acceptance",
  key = "frontend-observatory.lesson21.v1",
  prior = Array.from(
    { length: 20 },
    (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
  ),
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const btn = (p, n) => p.getByRole("button", { name: n, exact: true }),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "第二十一节学习步骤" })
      .getByRole("button")
      .nth(n),
  lab = (p) => p.locator(".shared-lab");
async function directory(p, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(btn(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(20), "lesson21");
  await expect(p.locator("#shared-element-stage-heading")).toBeVisible();
}
async function open(p, n = 0) {
  await p.goto("/");
  await directory(p);
  await stage(p, n).click();
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
async function seed(p) {
  await p.addInitScript((ks) => {
    for (const [i, k] of ks.entries())
      if (localStorage.getItem(k) === null)
        localStorage.setItem(
          k,
          JSON.stringify({ step: i % 5, done: [0], marker: `prior-${i}` }),
        );
  }, prior);
  await p.addInitScript(deny);
  await p.goto("/");
  await expect(p.locator("#stage-heading")).toBeVisible();
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior);
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
function instrument() {
  window.sharedHandles = [];
  window.sharedCallbacks = [];
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = (cb) => {
    const vt = start(async () => {
      if (window.holdShared)
        await new Promise((r) => window.sharedCallbacks.push(r));
      return cb();
    });
    window.sharedHandles.push(vt);
    return vt;
  };
}
async function settled(p) {
  await expect
    .poll(() =>
      p.evaluate(() =>
        document.documentElement.classList.contains("lesson21-transition"),
      ),
    )
    .toBe(false);
}
async function detail(p, id) {
  await expect(lab(p)).toHaveAttribute("data-view", id);
  await expect(p.locator(`[data-detail="${id}"]`)).toBeVisible();
}
test("only 01–30 available; next remains preview", async ({ page }) => {
  await open(page);
  await expect(page.locator(".available-dot")).toHaveCount(30);
  await expect(page.locator(".site-footer")).toContainText("01–30");
  await page
    .getByRole("navigation", { name: "课程目录" })
    .isVisible()
    .then(async (v) => {
      if (!v) await btn(page, "☰ 课程").click();
    });
  await page
    .getByRole("navigation", { name: "课程目录" })
    .getByRole("button")
    .nth(30)
    .click();
  await expect(
    page.getByRole("heading", { name: "Drag/Drop/Resize", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".coming-status")).toContainText("尚未制作");
});
test("real native pairing changes geometry between different DOM nodes and returns correct B source", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await btn(page, "慢速1200ms").click();
  const thumb = await page
    .locator('[data-source="B"] [data-art]')
    .elementHandle();
  const old = await thumb.boundingBox();
  await btn(page, "打开对象B").click();
  await detail(page, "B");
  await expect(page.locator("#shared-detail-title")).toBeFocused();
  await page.waitForFunction(
    () =>
      window.sharedHandles.length &&
      document
        .getAnimations()
        .some((a) => a.effect?.pseudoElement?.includes("lesson21-b")),
  );
  const native = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.pseudoElement?.includes("lesson21-b"))
      .map((a) => ({
        pseudo: a.effect.pseudoElement,
        frames: a.effect.getKeyframes(),
        duration: a.effect.getTiming().duration,
      })),
  );
  expect(
    native.some(
      (a) =>
        a.pseudo === "::view-transition-group(lesson21-b)" &&
        a.frames.some((f) => f.width),
    ),
  ).toBe(true);
  expect(await thumb.evaluate((e) => e.isConnected)).toBe(false);
  const hero = page.locator(".shared-art.hero");
  await expect(hero).toHaveCSS("view-transition-name", "lesson21-b");
  const end = await hero.boundingBox();
  expect(end.width).toBeGreaterThan(old.width);
  expect(end.height).toBeGreaterThan(old.height);
  await settled(page);
  await btn(page, "返回来源卡片B").click();
  await expect(lab(page)).toHaveAttribute("data-view", "gallery");
  await expect(btn(page, "打开对象B")).toBeFocused();
  await expect(page.locator('[data-source="B"] [data-art]')).toHaveCSS(
    "view-transition-name",
    "lesson21-b",
  );
  await settled(page);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/native-${info.project.name}.json`,
    JSON.stringify(
      { old, end, native, differentDOM: true, returned: "B" },
      null,
      2,
    ),
  );
});
test("identity notes switch A/B without false pairing hidden controls or duplicate ids; Escape scoped", async ({
  page,
}) => {
  await open(page, 1);
  await page.getByLabel("减少动态：直接最新视图", { exact: true }).check();
  await btn(page, "打开对象A").click();
  await detail(page, "A");
  await btn(page, "填入备注示例").click();
  await page.getByLabel("对象A本地备注", { exact: true }).fill("edited A");
  await btn(page, "查看对象B").click();
  await detail(page, "B");
  await expect(btn(page, "查看对象B")).toBeFocused();
  await expect(page.locator(".shared-art")).toHaveCSS(
    "view-transition-name",
    "lesson21-b",
  );
  await btn(page, "查看对象A").click();
  await expect(page.getByLabel("对象A本地备注", { exact: true })).toHaveValue(
    "edited A",
  );
  await expect(page.locator("[data-open]")).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const a = [...document.querySelectorAll("[id]")].map((n) => n.id);
      return new Set(a).size === a.length;
    }),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(btn(page, "打开对象A")).toBeFocused();
  await btn(page, "打开对象C").click();
  await btn(page, "读取配对与真实DOM").focus();
  await page.keyboard.press("Escape");
  await detail(page, "C");
  await axeCheck(page);
});
test("rapid native intents latest wins, same target repeat and no old callback can undo return", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => (window.holdShared = true));
  await btn(page, "打开对象B").click();
  await expect
    .poll(() => page.evaluate(() => window.sharedCallbacks.length))
    .toBe(1);
  await btn(page, "返回列表 / 取消待开详情").click();
  await expect(lab(page)).toHaveAttribute("data-view", "gallery");
  await page.evaluate(() => {
    window.holdShared = false;
    window.sharedCallbacks.splice(0).forEach((r) => r());
  });
  await settled(page);
  await expect(lab(page)).toHaveAttribute("data-view", "gallery");
  await btn(page, "打开对象C").click();
  await detail(page, "C");
  await btn(page, "查看对象A").click();
  await btn(page, "查看对象B").click();
  await btn(page, "查看对象B").click();
  await detail(page, "B");
  await btn(page, "返回来源卡片B").click();
  await expect(btn(page, "打开对象B")).toBeFocused();
  await settled(page);
  await expect(lab(page)).toHaveAttribute("data-view", "gallery");
});
test("pending native callback never steals external focus; unmount isolates callbacks and root ownership", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => (window.holdShared = true));
  await btn(page, "打开对象A").click();
  await expect
    .poll(() => page.evaluate(() => window.sharedCallbacks.length))
    .toBe(1);
  await btn(page, "读取配对与真实DOM").focus();
  await page.evaluate(() => {
    window.holdShared = false;
    window.sharedCallbacks.splice(0).forEach((r) => r());
  });
  await detail(page, "A");
  await expect(btn(page, "读取配对与真实DOM")).toBeFocused();
  await settled(page);
  await btn(page, "返回来源卡片A").click();
  await settled(page);
  await page.evaluate(() => (window.holdShared = true));
  await btn(page, "打开对象C").click();
  await expect
    .poll(() => page.evaluate(() => window.sharedCallbacks.length))
    .toBe(1);
  await stage(page, 1).click();
  await page.evaluate(() => {
    window.holdShared = false;
    window.sharedCallbacks.splice(0).forEach((r) => r());
  });
  await settled(page);
  await expect(lab(page)).toHaveAttribute("data-view", "gallery");
  await btn(page, "打开对象B").click();
  await detail(page, "B");
  await settled(page);
  await stage(page, 0).click();
  await expect(lab(page)).toHaveAttribute("data-view", "gallery");
  await expect(page.locator(".shared-status")).not.toContainText("正在");
});
test("missing logical source returns visible heading fallback and restore does not steal focus", async ({
  page,
}) => {
  await open(page, 2);
  await btn(page, "打开对象B").click();
  await detail(page, "B");
  await page
    .getByLabel("模拟来源卡片暂不可用（本地）", { exact: true })
    .check();
  await btn(page, "返回来源卡片B").click();
  await expect(lab(page)).toHaveAttribute("data-view", "gallery");
  await expect(
    page.getByRole("heading", { name: "本地插画列表", exact: true }),
  ).toBeFocused();
  await expect(btn(page, "打开对象B")).toHaveCount(0);
  await expect(page.locator(".shared-status")).toContainText("来源暂不可用");
  await btn(page, "恢复全部来源卡片").click();
  await expect(btn(page, "恢复全部来源卡片")).toBeFocused();
  await expect(btn(page, "打开对象B")).toBeVisible();
  await axeCheck(page);
  await fit(page);
});
for (const mode of ["unsupported", "throws"])
  test(`${mode} native capability keeps functional actual view and focus`, async ({
    page,
  }) => {
    await page.addInitScript((m) => {
      document.startViewTransition =
        m === "unsupported"
          ? undefined
          : () => {
              throw Error("test");
            };
    }, mode);
    await open(page);
    await btn(page, "打开对象C").click();
    await detail(page, "C");
    await expect(page.locator("#shared-detail-title")).toBeFocused();
    await expect(page.locator(".shared-status")).toContainText(
      mode === "unsupported" ? "能力不支持" : "创建失败",
    );
    await btn(page, "返回来源卡片C").click();
    await expect(btn(page, "打开对象C")).toBeFocused();
    await expect(page.locator("html")).not.toHaveClass(/lesson21-transition/);
  });
test("reduced motion mid pending/active commits latest without callbacks or persistent animation", async ({
  page,
}) => {
  await page.addInitScript(instrument);
  await open(page, 2);
  await btn(page, "慢速1200ms").click();
  await page.evaluate(() => (window.holdShared = true));
  await btn(page, "打开对象B").click();
  await expect
    .poll(() => page.evaluate(() => window.sharedCallbacks.length))
    .toBe(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await detail(page, "B");
  await expect(page.locator("#shared-detail-title")).toBeFocused();
  await page.evaluate(() => {
    window.holdShared = false;
    window.sharedCallbacks.splice(0).forEach((r) => r());
  });
  await settled(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await btn(page, "返回来源卡片B").click();
  await expect(btn(page, "打开对象B")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settled(page);
  await expect(lab(page)).toHaveAttribute("data-view", "gallery");
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a.effect?.pseudoElement?.includes("lesson21")).length,
    ),
  ).toBe(0);
});
for (let n = 0; n < 5; n++)
  test(`station ${n + 1} axe viewport and local crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n < 3) {
      await btn(page, "打开对象B").click();
      await detail(page, "B");
      await settled(page);
    }
    if (n === 4) await btn(page, "生成共享元素指令").click();
    await axeCheck(page);
    await fit(page);
    mkdirSync(out, { recursive: true });
    await page.locator(".lesson-stage").screenshot({
      path: `${out}/station${n + 1}-${info.project.name}.png`,
      animations: "disabled",
    });
    if (n < 3)
      await page.locator(".shared-detail").screenshot({
        path: `${out}/detail${n + 1}-${info.project.name}.png`,
        animations: "disabled",
      });
  });
async function flow(p, act, toggle, edit) {
  await p.addInitScript(deny);
  await p.evaluate(deny);
  await directory(p, act);
  const a = (n) => act(btn(p, n), n),
    next = () => a("完成并继续");
  await next();
  await expect(p.locator(".notice")).toContainText("先完成");
  await a("打开对象B");
  await detail(p, "B");
  await a("返回来源卡片B");
  await a("读取配对与真实DOM");
  await next();
  await a("打开对象A");
  await detail(p, "A");
  await a("填入备注示例");
  if (edit) await edit(p.getByLabel("对象A本地备注", { exact: true }), "note");
  await a("查看对象B");
  await detail(p, "B");
  await a("返回来源卡片B");
  await a("记录两种候选的比较");
  await next();
  await a("打开对象C");
  await detail(p, "C");
  await a("返回来源卡片C");
  await a("打开对象B");
  await detail(p, "B");
  await toggle(
    p.getByLabel("模拟来源卡片暂不可用（本地）", { exact: true }),
    "missing",
  );
  await a("返回来源卡片B");
  await expect(
    p.getByRole("heading", { name: "本地插画列表", exact: true }),
  ).toBeFocused();
  await toggle(
    p.getByLabel("减少动态：直接最新视图", { exact: true }),
    "reduce",
  );
  await a("恢复全部来源卡片");
  await next();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "retry" + i);
  await next();
  await a("生成共享元素指令");
  const draft = p.getByLabel("可编辑的 共享元素 Agent 指令");
  await expect(draft).toHaveValue(
    /配对标识.*生命周期.*打断与回退.*返回与焦点.*验收/s,
  );
  if (edit) await edit(draft, "draft");
  await a("复制共享元素指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(
    p.getByLabel("我已检查 配对、生命周期、打断、焦点与回退条件。", {
      exact: true,
    }),
    "review",
  );
  await a("完成第二十一节");
  await expect(p.locator(".lesson-twenty-one .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.sharedKeys ?? null);
  await p.reload();
  await directory(p, act);
  await expect(p.locator(".lesson-twenty-one .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十一节进度");
  await a("保留第二十一节进度");
  await expect(p.locator(".lesson-twenty-one .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第二十一节进度");
  await a("确认重置第二十一节");
  await expect(p.locator("#shared-element-stage-heading")).toBeFocused();
  await expect(p.locator(".lesson-twenty-one .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await axeCheck(p);
  await fit(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.sharedKeys ?? null),
  };
}
test("full real Tab flow wrong retry editable brief refresh reset preserves20", async ({
  page,
}, info) => {
  const before = await seed(page),
    trace = [],
    { act, toggle, seek } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson21",
      profile: info.project.name,
    });
  const r = await flow(page, act, toggle, async (f, n) => {
    await seek(f, n);
    await page.keyboard.press("End");
    await page.keyboard.type(
      n === "note"
        ? " edited"
        : "\nReview: stable identity, latest view and focus.",
    );
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
  test(`full zero keyboard touch ${reduced ? "reduced" : "normal"} wrong retry refresh reset preserves20`, async ({
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
      window.sharedKeys = [];
      for (const t of ["keydown", "keyup"])
        addEventListener(t, (e) => window.sharedKeys.push(e.key));
    });
    const before = await seed(p),
      tap = async (l, n) => {
        await l.tap();
        trace.push(n);
      },
      r = await flow(p, tap, tap, async (f, n) => {
        await f.tap();
        await f.fill(
          n === "note"
            ? "触屏编辑备注"
            : (await f.inputValue()) + "\n触屏复核：配对与焦点。",
        );
      });
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
test("editable copy actual success late rejection isolation corrupt storage", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t) => (window.copied = t) },
    }),
  );
  await open(page, 4);
  await btn(page, "生成共享元素指令").click();
  const draft = page.getByLabel("可编辑的 共享元素 Agent 指令");
  await draft.fill(
    "自定义共享元素指令 " + "配对身份、最新状态、回退与焦点。".repeat(8),
  );
  await btn(page, "复制共享元素指令").click();
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
  await btn(page, "复制共享元素指令").click();
  await stage(page, 0).click();
  await page.evaluate(() => window.lateReject(Error("late")));
  await stage(page, 4).click();
  await expect(page.locator(".copy-feedback")).not.toContainText(
    "自动复制不可用",
  );
  await page.evaluate(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          step: 99,
          done: [0, 0, 9],
          duration: -1,
          answers: [8, 1, null],
        }),
      ),
    key,
  );
  await page.reload();
  await directory(page);
  await expect(page.locator(".lesson-bottom")).toContainText("1 / 5");
  await expect(btn(page, "常速400ms")).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("denied");
    };
    Storage.prototype.removeItem = () => {
      throw Error("denied");
    };
  });
  await btn(page, "打开对象A").click();
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});

test("native update rejection safely commits latest state and restores owned focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = () =>
      start(() => Promise.reject(Error("controlled update rejection")));
  });
  await open(page);
  await btn(page, "打开对象B").click();
  await detail(page, "B");
  await expect(page.locator("#shared-detail-title")).toBeFocused();
  await settled(page);
  await btn(page, "返回来源卡片B").click();
  await expect(btn(page, "打开对象B")).toBeFocused();
  await settled(page);
});
test("synthetic visibility fixture settles pending intent and never replays on return", async ({
  page,
}, info) => {
  await page.addInitScript(instrument);
  await open(page);
  await page.evaluate(() => (window.holdShared = true));
  await btn(page, "打开对象C").click();
  await expect
    .poll(() => page.evaluate(() => window.sharedCallbacks.length))
    .toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await detail(page, "C");
  await expect(page.locator("#shared-detail-title")).toBeFocused();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.holdShared = false;
    window.sharedCallbacks.splice(0).forEach((r) => r());
  });
  await settled(page);
  await detail(page, "C");
  await btn(page, "返回来源卡片C").click();
  await expect(btn(page, "打开对象C")).toBeFocused();
  await settled(page);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/visibility-${info.project.name}.json`,
    JSON.stringify(
      {
        passed: true,
        fixture:
          "synthetic document.hidden visibilitychange; not actual OS background",
      },
      null,
      2,
    ),
  );
});
test("lazy module actual mechanism and brief scope consistent with no external requests", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(requests.some((u) => /lesson-twenty-one-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(requests.some((u) => /lesson-twenty-one-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("Shared Element Transition · 前端观察室");
  await expect(page.locator(".shared-explain")).toContainText("不同DOM节点");
  await expect(page.locator(".shared-explain")).toContainText("不要求全屏");
  await stage(page, 4).click();
  await btn(page, "生成共享元素指令").click();
  const draft = page.getByLabel("可编辑的 共享元素 Agent 指令");
  await expect(draft).toHaveValue(
    /不同DOM节点.*根画面不配对.*Motion shared layout.*未安装.*skipTransition.*01–20/s,
  );
  expect(
    requests.filter((u) => !u.startsWith("http://127.0.0.1:4173/")),
  ).toEqual([]);
});
