import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
import {
  TOOL10_STORAGE as KEY,
  tool10Initial,
  tool10Brief,
  tool10Questions,
  recommendation,
} from "../src/tool-ten-content.js";
import {
  applyMutationResult,
  createLocalSession,
  queryKey,
  runtimeState,
} from "../src/tool-ten-runtime.js";
const out = "/tmp/tool10-acceptance";
mkdirSync(out, { recursive: true });
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = (p, n) => p.getByRole("button", { name: n, exact: true }),
  f = (p, n) => p.locator("#tool10-" + n),
  lab = (p) => p.locator(".tool10-lab"),
  result = (p) => p.locator(".tool10-result"),
  stage = (p, n) =>
    p
      .getByRole("navigation", { name: "T10工具专题学习步骤" })
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
      name: "T10 · TanStack Query · 可学习",
      exact: true,
    }),
    "T10",
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
    ([k, d]) => localStorage.setItem(k, JSON.stringify(d)),
    [KEY, d],
  );
}
const session = async (p) =>
  JSON.parse(await lab(p).getAttribute("data-session"));
async function inspect(p) {
  await b(p, "读取实际Query缓存快照").click();
  return JSON.parse(
    await p
      .locator("[data-query-snapshot]")
      .getAttribute("data-query-snapshot"),
  );
}
async function pending(p, n = 1) {
  await expect(lab(p)).toHaveAttribute("data-pending", String(n));
}
async function load(p, act = (l) => l.click()) {
  await act(b(p, "开启读取或手动重试"), "read");
  await pending(p);
  await act(b(p, "投递最早待处理成功"), "read success");
  await expect(result(p)).toHaveAttribute("data-status", "success");
  await expect(result(p)).toHaveAttribute("data-fetch", "idle");
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
  ...tool10Initial(),
  done: [0, 1, 2, 3],
  scenariosSeen: ["simple", "shared"],
  uiSeen: true,
  comparedSeen: true,
  groupsSeen: ["A", "B"],
  firstSeen: true,
  cacheHitSeen: true,
  backgroundSeen: true,
  inspectedSeen: true,
  refreshErrorSeen: true,
  retrySeen: true,
  canceledSeen: true,
  lateSeen: true,
  mutationSeen: true,
  invalidationSeen: true,
  cleanupSeen: true,
  answers: tool10Questions.map((q) => q.correct),
});
test("official sources six real Query version no previous graphics residue and conditional needs", async ({
  page,
}) => {
  await open(page);
  const refs = page
    .locator(".tool-ten .roadmap-details")
    .filter({ hasText: "T10工具专题核对说明与官方来源" });
  await refs.locator(":scope > summary").click();
  await expect(refs.getByRole("link")).toHaveCount(6);
  await expect(refs).toContainText("5.104.5");
  await expect(refs).not.toContainText(/D3|ECharts|Three.js|Rive|GSAP|Radix/);
  for (const n of [
    "多个视图共享外部数据",
    "切换本地说明面板",
    "记录状态职责与选型条件",
  ])
    await b(page, n).click();
  expect((await read(page)).scenariosSeen).toEqual(["simple", "shared"]);
  await expect(lab(page)).toContainText("本地展开状态");
  expect(recommendation({ ...good(), scenario: "simple" })).toContain(
    "普通请求",
  );
  expect(recommendation({ ...good(), scenario: "shared" })).toContain(
    "现有框架",
  );
  for (const s of [
    "query key",
    "AbortSignal",
    "cancelQueries",
    "invalidate",
    "retry=false",
    "staleTime",
    "static",
    "数据库",
    "T11/T12仍为2个预告",
  ])
    expect(tool10Brief(good())).toContain(s);
});
test("real first query pending log Promise settlement data and actual QueryCache agree", async ({
  page,
}, info) => {
  await open(page, 1);
  await expect(result(page)).toHaveAttribute("data-count", "none");
  await b(page, "开启读取或手动重试").click();
  await pending(page);
  await expect(result(page)).toHaveAttribute("data-fetch", "fetching");
  await expect(result(page)).toHaveAttribute("data-count", "none");
  let s = await inspect(page);
  expect(s.queries[0]).toMatchObject({
    key: queryKey("A"),
    status: "pending",
    fetchStatus: "fetching",
    data: null,
  });
  await b(page, "投递最早待处理成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "8");
  await expect(result(page)).toHaveAttribute("data-version", "1");
  s = await inspect(page);
  expect(s.queries[0].data).toEqual({ group: "A", count: 8, version: 1 });
  expect(s.records[0]).toMatchObject({
    kind: "read",
    group: "A",
    status: "success",
    result: { count: 8, version: 1 },
  });
  save(info.project.name + "-actual-query", s);
});
test("fresh close reopen hits real cache without another API call and local controls deduplicate pending", async ({
  page,
}, info) => {
  await open(page, 1);
  await b(page, "开启读取或手动重试").click();
  await b(page, "开启读取或手动重试").click();
  await pending(page);
  await expect(lab(page)).toHaveAttribute("data-requests", "1");
  await b(page, "投递最早待处理成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "8");
  await b(page, "关闭读取保留缓存").click();
  await b(page, "开启读取或手动重试").click();
  await expect(result(page)).toHaveAttribute("data-count", "8");
  await expect(result(page)).toHaveAttribute("data-fetch", "idle");
  await expect(lab(page)).toHaveAttribute("data-requests", "1");
  expect((await read(page)).cacheHitSeen).toBe(true);
  save(info.project.name + "-cache-hit", await inspect(page));
});
test("stale0 keeps old data and observer reopening actually refetches while Infinity can invalidate", async ({
  page,
}, info) => {
  await open(page, 1);
  await load(page);
  await f(page, "policy").selectOption("stale");
  await expect(result(page)).toHaveAttribute("data-stale", "true");
  await b(page, "关闭读取保留缓存").click();
  await b(page, "开启读取或手动重试").click();
  await pending(page);
  await expect(result(page)).toHaveAttribute("data-fetch", "fetching");
  await expect(result(page)).toHaveAttribute("data-count", "8");
  await b(page, "投递最早待处理成功").click();
  await f(page, "policy").selectOption("fresh");
  await b(page, "失效当前key并刷新").click();
  await pending(page);
  const s = await inspect(page);
  expect(s.queries[0]).toMatchObject({
    invalidated: true,
    fetchStatus: "fetching",
    data: { count: 8 },
  });
  save(info.project.name + "-stale-background", s);
});
test("refresh failure real error retains prior data no automatic retries and manual retry recovers", async ({
  page,
}, info) => {
  await open(page, 2);
  await load(page);
  await b(page, "失效当前key并刷新").click();
  await pending(page);
  await b(page, "投递最早待处理失败").click();
  await expect(result(page)).toHaveAttribute("data-status", "error");
  await expect(result(page)).toHaveAttribute("data-count", "8");
  await expect(result(page)).toContainText("刷新失败，旧数据保留");
  await expect(result(page)).toHaveAttribute("data-fetch", "idle");
  const failed = await inspect(page);
  await page.waitForTimeout(150);
  await expect(lab(page)).toHaveAttribute("data-requests", "2");
  await b(page, "开启读取或手动重试").click();
  await pending(page);
  await b(page, "投递最早待处理成功").click();
  await expect(result(page)).toHaveAttribute("data-status", "success");
  await expect
    .poll(() => read(page))
    .toMatchObject({
      refreshErrorSeen: true,
      retrySeen: true,
    });
  save(info.project.name + "-refresh-error", {
    failed,
    recovered: await inspect(page),
  });
});
test("first error has no invented data and retry is genuine query call", async ({
  page,
}) => {
  await open(page, 1);
  await b(page, "开启读取或手动重试").click();
  await pending(page);
  await b(page, "投递最早待处理失败").click();
  await expect(result(page)).toHaveAttribute("data-status", "error");
  await expect(result(page)).toHaveAttribute("data-count", "none");
  await expect(result(page)).toContainText("读取失败，尚无数据");
  await load(page);
  await expect(lab(page)).toHaveAttribute("data-requests", "2");
});
test("different keys concurrent reversed delivery enters exact cache not active group", async ({
  page,
}, info) => {
  await open(page, 1);
  await b(page, "开启读取或手动重试").click();
  await b(page, "预取另一分组").click();
  await pending(page, 2);
  await b(page, "投递#2成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "none");
  await expect(result(page)).toHaveAttribute("data-group", "A");
  let s = await inspect(page);
  expect(s.queries.find((q) => q.key[2] === "B").data).toMatchObject({
    group: "B",
    count: 3,
  });
  await b(page, "投递#1成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "8");
  await f(page, "group").selectOption("B");
  await expect(result(page)).toHaveAttribute("data-count", "3");
  await expect(lab(page)).toHaveAttribute("data-requests", "2");
  save(info.project.name + "-keys-concurrent", await inspect(page));
});
test("switching active parameter consumes signal and late canceled response cannot override newer key", async ({
  page,
}, info) => {
  await open(page, 1);
  await b(page, "开启读取或手动重试").click();
  await pending(page);
  await f(page, "group").selectOption("B");
  await pending(page);
  await expect(page.locator('[data-request-id="1"]')).toHaveAttribute(
    "data-request-status",
    "canceled",
  );
  await b(page, "投递#2成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "3");
  await b(page, "投递#1成功").click();
  await expect(result(page)).toHaveAttribute("data-group", "B");
  await expect(result(page)).toHaveAttribute("data-count", "3");
  const s = await inspect(page);
  expect(s.queries.find((q) => q.key[2] === "A").data).toBeNull();
  save(info.project.name + "-parameter-cancel", s);
});
test("cancelQueries restores old data actual canceled late resolve and repeat delivery do not resurrect", async ({
  page,
}, info) => {
  await open(page, 2);
  await load(page);
  await b(page, "失效当前key并刷新").click();
  await pending(page);
  await b(page, "取消当前查询").click();
  await pending(page, 0);
  await expect(result(page)).toHaveAttribute("data-count", "8");
  await expect(result(page)).toHaveAttribute("data-fetch", "idle");
  await b(page, "投递已取消的迟到结果").click();
  await b(page, "投递#2成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "8");
  expect(await read(page)).toMatchObject({
    canceledSeen: true,
    lateSeen: true,
  });
  save(info.project.name + "-late-canceled", await inspect(page));
});
test("real mutation commits local source then targeted invalidation rereads new version", async ({
  page,
}, info) => {
  await open(page, 2);
  await load(page);
  await b(page, "提交当前组数量+1").click();
  await pending(page);
  await b(page, "提交当前组数量+1").click();
  await expect(lab(page)).toHaveAttribute("data-requests", "2");
  await b(page, "投递最早待处理成功").click();
  await pending(page);
  await expect(result(page)).toHaveAttribute("data-count", "8");
  const before = await inspect(page);
  expect(before.source.A).toEqual({ group: "A", count: 9, version: 2 });
  expect(before.queries.find((q) => q.key[2] === "A")).toMatchObject({
    invalidated: true,
    fetchStatus: "fetching",
    data: { count: 8, version: 1 },
  });
  await b(page, "投递最早待处理成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "9");
  await expect(result(page)).toHaveAttribute("data-version", "2");
  await expect
    .poll(() => read(page))
    .toMatchObject({
      mutationSeen: true,
      invalidationSeen: true,
    });
  save(info.project.name + "-mutation-invalidation", {
    before,
    after: await inspect(page),
  });
});
test("mutation captures source key while user switches group and does not refresh wrong key", async ({
  page,
}, info) => {
  await open(page, 2);
  await load(page);
  await b(page, "预取另一分组").click();
  await pending(page);
  await b(page, "投递最早待处理成功").click();
  await b(page, "提交当前组数量+1").click();
  await pending(page);
  await f(page, "group").selectOption("B");
  await expect(result(page)).toHaveAttribute("data-count", "3");
  await b(page, "投递最早待处理成功").click();
  await pending(page, 0);
  await expect(result(page)).toHaveAttribute("data-count", "3");
  let s = await inspect(page);
  expect(s.source.A.count).toBe(9);
  expect(s.source.B.count).toBe(3);
  expect(s.queries.find((q) => q.key[2] === "A").invalidated).toBe(true);
  expect(s.queries.find((q) => q.key[2] === "B").invalidated).toBe(false);
  await f(page, "group").selectOption("A");
  await pending(page);
  await b(page, "投递最早待处理成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "9");
  save(info.project.name + "-mutation-captured-key", await inspect(page));
});
test("write failure cancel before commit and stale delivery leave source unchanged retry succeeds", async ({
  page,
}) => {
  await open(page, 2);
  await load(page);
  await b(page, "提交当前组数量+1").click();
  await pending(page);
  await b(page, "投递最早待处理失败").click();
  await expect(page.locator("[data-mutation-status]")).toHaveAttribute(
    "data-mutation-status",
    "error",
  );
  expect((await session(page)).source.A.count).toBe(8);
  await b(page, "提交当前组数量+1").click();
  await pending(page);
  await b(page, "取消未投递本地写入").click();
  await pending(page, 0);
  await b(page, "投递#3成功").click();
  expect((await inspect(page)).source.A.count).toBe(8);
  await b(page, "提交当前组数量+1").click();
  await pending(page);
  await b(page, "投递最早待处理成功").click();
  await pending(page);
  await b(page, "投递最早待处理成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "9");
});
for (const outcome of ["success", "failure", "late"])
  test(`last ${outcome} delivery real Tab immediate focus same enabled visible button`, async ({
    page,
  }, info) => {
    await open(page, 2);
    await b(page, "开启读取或手动重试").click();
    await pending(page);
    if (outcome === "late") await b(page, "取消当前查询").click();
    const button = b(
        page,
        outcome === "late"
          ? "投递已取消的迟到结果"
          : outcome === "failure"
            ? "投递最早待处理失败"
            : "投递最早待处理成功",
      ),
      k = createKeyboardNavigator(page, expect, [], {
        lesson: "tool10-result",
        profile: info.project.name,
      });
    await k.seek(button, "last result");
    const node = await button.elementHandle();
    await page.keyboard.press("Enter");
    expect(
      await node.evaluate(
        (e) => e === document.activeElement && e.isConnected && !e.disabled,
      ),
    ).toBe(true);
    await k.seek(button, "immediate after result");
  });
test("session reset cancels owned promises clears cache keeps real reset focus and does not leak client", async ({
  page,
}, info) => {
  await open(page, 2);
  await load(page);
  await b(page, "提交当前组数量+1").click();
  await pending(page);
  const old = await inspect(page),
    k = createKeyboardNavigator(page, expect, [], {
      lesson: "tool10-reset",
      profile: info.project.name,
    });
  await k.act(b(page, "重建演练会话（清空缓存）"), "session reset");
  await expect(b(page, "重建演练会话（清空缓存）")).toBeFocused();
  await expect(result(page)).toHaveAttribute("data-count", "none");
  await pending(page, 0);
  const after = await inspect(page);
  expect(after.source.A.count).toBe(8);
  expect(after.runtime.sessions).toBe(1);
  expect(after.runtime.created).toBe(old.runtime.created + 1);
  expect(after.records).toEqual([]);
  expect(after.queries.every((q) => !q.data)).toBe(true);
  await stage(page, 3).click();
  await stage(page, 2).click();
  expect((await inspect(page)).runtime.sessions).toBe(1);
  save(info.project.name + "-session-cleanup", { before: old, after });
});
test("idle focus online visibility changes create no background requests under explicit demo settings", async ({
  page,
}) => {
  await open(page, 1);
  await load(page);
  const s = await session(page);
  await page.evaluate(() => {
    dispatchEvent(new Event("focus"));
    dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(150);
  expect((await session(page)).records).toEqual(s.records);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await b(page, "失效当前key并刷新").click();
  await pending(page);
  await b(page, "投递最早待处理成功").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(result(page)).toHaveAttribute("data-count", "8");
});
test("actual QueryClient API Node fixture cancel destroy and captured late Promise never repopulate cache", async () => {
  const baseline = runtimeState(),
    s = createLocalSession();
  const promise = s.client
    .fetchQuery({
      queryKey: queryKey("A"),
      queryFn: ({ signal }) => s.api.read("A", signal),
    })
    .catch((e) => e);
  expect(s.api.snapshot().records).toHaveLength(1);
  await s.client.cancelQueries();
  expect(s.api.snapshot().records[0].status).toBe("canceled");
  s.api.deliver(1, true);
  await promise;
  expect(s.client.getQueryData(queryKey("A"))).toBeUndefined();
  const write = s.api.write("B").catch((e) => e);
  s.destroy();
  await write;
  expect(s.inspect().source.B.count).toBe(3);
  expect(s.api.deliver(2, true)).toContain("会话已结束");
  expect(s.client.getQueryCache().getAll()).toEqual([]);
  expect(runtimeState()).toMatchObject({
    sessions: baseline.sessions,
    requests: baseline.requests,
  });
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
  await f(page, "context").fill("用户新的字段约束");
  await expect(f(page, "agent-draft")).toHaveValue(x + "\n保留自己的部署约束");
  const check = page.getByRole("checkbox", {
    name: "我已核对query key、缓存策略、更新与取消验收。",
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
  await b(page, "重置T10工具专题进度").click();
  await b(page, "确认重置T10工具专题").click();
  await expect(f(page, "stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => window.release08());
  expect((await read(page)).draft).toBe("");
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});

test("late title RAF respects deliberately moved real Tab focus", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    window.titleFrames09 = [];
    window.originalRAF09 = requestAnimationFrame;
    window.requestAnimationFrame = (f) => {
      window.titleFrames09.push(f);
      return 99009;
    };
  });
  await stage(page, 1).click();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => {
    window.requestAnimationFrame = window.originalRAF09;
    for (const f of window.titleFrames09) f(performance.now());
  });
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    focus,
  );
});

test("malformed storage bounded keys enums text and stale review", async ({
  page,
}) => {
  await seed(page, {
    ...good(),
    step: 9,
    done: [0, 0, 9, "1"],
    group: "private",
    policy: "bad",
    scenariosSeen: ["shared", "bad", "shared"],
    context: "x".repeat(900),
    draft: "short",
    reviewed: true,
  });
  await open(page);
  expect(await read(page)).toMatchObject({
    step: 0,
    done: [0],
    group: "A",
    policy: "fresh",
    scenariosSeen: ["shared"],
    reviewed: false,
  });
  expect((await read(page)).context.length).toBe(700);
});
test("unavailable progress storage does not break real query cache or controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("fixture");
    };
  });
  await open(page, 1);
  await load(page);
  await expect(result(page)).toHaveAttribute("data-count", "8");
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toBeVisible();
});
for (let n = 0; n < 5; n++)
  test(`station${n + 1} axe desktop375 scoped actual cache and controls crops`, async ({
    page,
  }, info) => {
    await open(page, n);
    if (n === 1 || n === 2) await load(page);
    if (n === 3)
      await page
        .locator(".quiz-grid fieldset")
        .first()
        .getByRole("button")
        .nth(1)
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
      .locator(n < 3 ? ".tool10-lab" : n === 3 ? ".quiz-grid" : ".agent-editor")
      .screenshot({
        path: `${out}/${info.project.name}-station${n + 1}-body.png`,
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
    { length: 9 },
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
    "多个视图共享外部数据",
    "切换本地说明面板",
    "记录状态职责与选型条件",
  ])
    await act(b(p, n), n);
  await act(b(p, "完成并继续"), "station0");
  await load(p, act);
  await act(b(p, "关闭读取保留缓存"), "close");
  await act(b(p, "开启读取或手动重试"), "cache hit");
  await select(f(p, "policy"), "stale");
  await act(b(p, "关闭读取保留缓存"), "close stale");
  await act(b(p, "开启读取或手动重试"), "background");
  await pending(p);
  await act(b(p, "投递最早待处理成功"), "refreshed");
  await select(f(p, "group"), "B");
  await pending(p);
  await act(b(p, "投递最早待处理成功"), "B data");
  await select(f(p, "policy"), "fresh");
  await act(b(p, "读取实际Query缓存快照"), "inspect");
  await act(b(p, "完成并继续"), "station1");
  await load(p, act);
  await act(b(p, "失效当前key并刷新"), "invalidate fail");
  await pending(p);
  await act(b(p, "投递最早待处理失败"), "refresh error");
  await act(b(p, "开启读取或手动重试"), "retry");
  await pending(p);
  await act(b(p, "投递最早待处理成功"), "retry result");
  await act(b(p, "失效当前key并刷新"), "invalidate cancel");
  await pending(p);
  await act(b(p, "取消当前查询"), "cancel");
  await act(b(p, "投递已取消的迟到结果"), "late");
  await act(b(p, "提交当前组数量+1"), "mutate");
  await pending(p);
  await act(b(p, "投递最早待处理成功"), "write result");
  await pending(p);
  await act(b(p, "投递最早待处理成功"), "new version");
  await expect(result(p)).toHaveAttribute("data-count", "4");
  await act(b(p, "重建演练会话（清空缓存）"), "cleanup");
  await act(b(p, "完成并继续"), "station2");
  for (let i = 0; i < 3; i++) {
    const q = p.locator(".quiz-grid fieldset").nth(i);
    await act(
      q.getByRole("button").nth(1 - tool10Questions[i].correct),
      "wrong" + i,
    );
    await expect(q).toContainText("再想一想");
    await act(
      q.getByRole("button").nth(tool10Questions[i].correct),
      "retry" + i,
    );
  }
  await act(b(p, "完成并继续"), "station3");
  await act(b(p, "填入项目现状示例（替换本栏）"), "sample");
  await type(f(p, "context"), " 用户补充错误类别与幂等约束。");
  await act(b(p, "生成工具选型说明"), "generate");
  await type(f(p, "agent-draft"), "\n自己的失效范围。");
  await act(b(p, "复制工具选型说明"), "copy");
  await toggle(
    p.getByRole("checkbox", {
      name: "我已核对query key、缓存策略、更新与取消验收。",
      exact: true,
    }),
    "review",
  );
  await act(b(p, "完成T10工具专题"), "finish");
  expect((await read(p)).done).toEqual([0, 1, 2, 3, 4]);
}
async function reset(p, act, key) {
  const before = await read(p);
  await act(b(p, "重置T10工具专题进度"), "reset cancel");
  if (key) await p.keyboard.press("Escape");
  else await act(b(p, "保留T10工具专题进度"), "retain");
  expect((await read(p)).draft).toBe(before.draft);
  await expect(b(p, "重置T10工具专题进度")).toBeFocused();
  await act(b(p, "重置T10工具专题进度"), "reset");
  await act(b(p, "确认重置T10工具专题"), "confirm");
  await expect(f(p, "stage-heading")).toBeFocused();
  expect(await read(p)).toMatchObject({
    step: 0,
    done: [],
    draft: "",
    context: "",
  });
}
test("real Tab five stations genuine select edits retry clipboard refresh cancel confirm reset preserves43", async ({
  page,
}, info) => {
  const prior = await priors(page),
    trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool10-full",
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
  test(`zero keyboard touch full ${reducedMotion} actualQuery edits retry refresh reset preserves43`, async ({
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
      window.keys10 = 0;
      addEventListener("keydown", () => window.keys10++);
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
    expect(await p.evaluate(() => window.keys10)).toBe(0);
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

test("config group policy changes revoke review but preserve manually edited draft", async ({
  page,
}) => {
  const d = { ...good(), generated: true, reviewed: true, context: "已有接口" };
  d.draft = tool10Brief(d) + "人工修改";
  await seed(page, d);
  await open(page, 4);
  await stage(page, 1).click();
  await f(page, "group").selectOption("B");
  await f(page, "policy").selectOption("stale");
  await stage(page, 4).click();
  await expect(f(page, "agent-draft")).toHaveValue(d.draft);
  expect(await read(page)).toMatchObject({ draftStale: true, reviewed: false });
  await b(page, "重新生成工具选型草稿").click();
  expect(await f(page, "agent-draft").inputValue()).toContain("分组=B");
});
test("T09 exit opens T10 twelve coverage entries two previews while numbered remains32", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "综合与工具模块" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await expect(nav.getByRole("button")).toHaveCount(12);
  await expect(nav.locator(".coverage-preview")).toHaveCount(2);
  await nav.getByRole("button", { name: /T09/ }).click();
  await b(page, "继续T10 · TanStack Query").click();
  await expect(f(page, "stage-heading")).toBeVisible();
  await expect(page).toHaveTitle("TanStack Query · 前端观察室");
  await expect(page.locator(".site-footer")).toContainText(
    "真实TanStack Query",
  );
});
test("375 short viewport long inert brief and actual Tab focus axe without overflow", async ({
  page,
}, info) => {
  await seed(page, { ...good(), step: 4 });
  await page.setViewportSize({ width: 375, height: 480 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await b(page, "填入项目现状示例（替换本栏）").click();
  await b(page, "生成工具选型说明").click();
  await f(page, "agent-draft").fill(
    (await f(page, "agent-draft").inputValue()) +
      "<img src=x onerror=bad()>" +
      "并发与取消验收".repeat(80),
  );
  const k = createKeyboardNavigator(page, expect, [], {
    lesson: "tool10-short",
    profile: info.project.name,
  });
  await k.seek(f(page, "agent-draft"), "visible editable brief");
  await axes(page);
  expect(await page.locator(".tool-ten img").count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".agent-editor")
    .screenshot({ path: `${out}/${info.project.name}-short.png` });
});

test("initial uncached read after mutation response cannot settle stale fresh data", async ({
  page,
}, info) => {
  await open(page, 2);
  await b(page, "开启读取或手动重试").click();
  await pending(page);
  await b(page, "提交当前组数量+1").click();
  await pending(page, 2);
  await b(page, "投递#2成功").click();
  await expect.poll(async () => (await session(page)).source.A.version).toBe(2);
  await b(page, "投递#1成功").click();
  const observed = await inspect(page);
  save(info.project.name + "-initial-read-mutation-observed", observed);
  expect(observed.source.A).toEqual({ group: "A", count: 9, version: 2 });
  expect(observed.records.find((r) => r.id === 1)).toMatchObject({
    status: "canceled",
    lateIgnored: true,
  });
  expect(observed.records.find((r) => r.id === 3)).toMatchObject({
    kind: "read",
    group: "A",
    status: "pending",
    snapshot: { count: 9, version: 2 },
  });
  await b(page, "投递#3成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "9");
  await expect(result(page)).toHaveAttribute("data-version", "2");
  await expect(result(page)).toHaveAttribute("data-fetch", "idle");
  await expect(result(page)).toHaveAttribute("data-stale", "false");
  const final = await inspect(page);
  expect(final.queries.find((q) => q.key[2] === "A")).toMatchObject({
    status: "success",
    fetchStatus: "idle",
    invalidated: false,
    data: { group: "A", count: 9, version: 2 },
  });
  save(info.project.name + "-initial-read-mutation-final", final);
});

test("first uncached mutation captured A only cancels A while switched B remains pending", async ({
  page,
}, info) => {
  await open(page, 2);
  await b(page, "开启读取或手动重试").click();
  await pending(page);
  await b(page, "提交当前组数量+1").click();
  await pending(page, 2);
  await f(page, "group").selectOption("B");
  await expect(page.locator('[data-request-id="1"]')).toHaveAttribute(
    "data-request-status",
    "canceled",
  );
  await pending(page, 2);
  await b(page, "投递#2成功").click();
  await expect
    .poll(
      async () =>
        (await session(page)).queries.find((q) => q.key[2] === "A").invalidated,
    )
    .toBe(true);
  await expect(page.locator('[data-request-id="3"]')).toHaveAttribute(
    "data-request-status",
    "pending",
  );
  await b(page, "投递#1成功").click();
  await b(page, "投递#3成功").click();
  await expect(result(page)).toHaveAttribute("data-group", "B");
  await expect(result(page)).toHaveAttribute("data-count", "3");
  let s = await inspect(page);
  expect(s.source.A).toMatchObject({ count: 9, version: 2 });
  expect(s.queries.find((q) => q.key[2] === "B")).toMatchObject({
    data: { group: "B", count: 3, version: 1 },
    invalidated: false,
  });
  expect(s.queries.find((q) => q.key[2] === "A")).toMatchObject({
    data: null,
    invalidated: true,
  });
  await f(page, "group").selectOption("A");
  await pending(page);
  await b(page, "投递#4成功").click();
  await expect(result(page)).toHaveAttribute("data-count", "9");
  await expect(result(page)).toHaveAttribute("data-version", "2");
  save(info.project.name + "-initial-write-switched-key", await inspect(page));
});
test("actual QueryClient cancellation barrier targets captured exact key before invalidation Node fixture", async () => {
  const s = createLocalSession(),
    pa = s.client
      .fetchQuery({
        queryKey: queryKey("A"),
        queryFn: ({ signal }) => s.api.read("A", signal),
      })
      .catch((e) => e),
    pb = s.client
      .fetchQuery({
        queryKey: queryKey("B"),
        queryFn: ({ signal }) => s.api.read("B", signal),
      })
      .catch((e) => e),
    write = s.api.write("A");
  s.api.deliver(3, true);
  const value = await write,
    originalCancel = s.client.cancelQueries.bind(s.client),
    originalInvalidate = s.client.invalidateQueries.bind(s.client),
    canceled = [],
    invalidated = [];
  let release,
    marked = 0;
  s.client.cancelQueries = (filters) => {
    canceled.push(filters);
    const actual = originalCancel(filters);
    return new Promise((resolve) => (release = () => actual.then(resolve)));
  };
  s.client.invalidateQueries = (filters) => {
    invalidated.push(filters);
    return originalInvalidate(filters);
  };
  const applying = applyMutationResult(
    s,
    value,
    { group: "A" },
    () => marked++,
  );
  expect(canceled).toEqual([{ queryKey: queryKey("A"), exact: true }]);
  expect(invalidated).toEqual([]);
  expect(s.api.snapshot().records.find((r) => r.id === 1).status).toBe(
    "canceled",
  );
  expect(s.api.snapshot().records.find((r) => r.id === 2).status).toBe(
    "pending",
  );
  release();
  await applying;
  expect(invalidated).toEqual([{ queryKey: queryKey("A"), exact: true }]);
  expect(marked).toBe(1);
  expect(s.client.getQueryState(queryKey("A")).isInvalidated).toBe(true);
  expect(s.client.getQueryState(queryKey("B")).fetchStatus).toBe("fetching");
  expect(s.client.getQueryState(queryKey("B")).isInvalidated).toBe(false);
  s.client.cancelQueries = originalCancel;
  s.destroy();
  await Promise.all([pa, pb]);
});
test("destroy during awaited mutation cancellation and later success cannot revive old or newer client Node fixture", async () => {
  const baseline = runtimeState(),
    s = createLocalSession(),
    readPromise = s.client
      .fetchQuery({
        queryKey: queryKey("A"),
        queryFn: ({ signal }) => s.api.read("A", signal),
      })
      .catch((e) => e),
    write = s.api.write("A");
  s.api.deliver(2, true);
  const value = await write,
    original = s.client.cancelQueries.bind(s.client);
  let release,
    cancelCalls = 0,
    invalidations = 0,
    marks = 0;
  s.client.cancelQueries = (filters) => {
    cancelCalls++;
    const actual = original(filters);
    return new Promise((resolve) => (release = () => actual.then(resolve)));
  };
  s.client.invalidateQueries = () => {
    invalidations++;
    return Promise.resolve();
  };
  const applying = applyMutationResult(s, value, { group: "A" }, () => marks++);
  s.client.cancelQueries = original;
  s.destroy();
  const current = createLocalSession();
  current.client.setQueryData(queryKey("B"), {
    group: "B",
    count: 3,
    version: 1,
  });
  release();
  await applying;
  await readPromise;
  await applyMutationResult(s, value, { group: "B" }, () => marks++);
  expect(cancelCalls).toBe(1);
  expect(invalidations).toBe(0);
  expect(marks).toBe(0);
  expect(s.client.getQueryCache().getAll()).toEqual([]);
  expect(s.api.deliver(1, true)).toContain("会话已结束");
  expect(current.client.getQueryData(queryKey("B"))).toEqual({
    group: "B",
    count: 3,
    version: 1,
  });
  expect(current.client.getQueryCache().getAll()).toHaveLength(1);
  current.destroy();
  expect(runtimeState()).toMatchObject({
    sessions: baseline.sessions,
    requests: baseline.requests,
  });
});
