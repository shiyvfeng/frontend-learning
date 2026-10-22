import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyboardNavigator } from "./keyboard-navigation.js";
const key = "frontend-observatory.lesson14.v1",
  out = "/tmp/conditional-acceptance",
  axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const prior = Array.from(
  { length: 13 },
  (_, i) => `frontend-observatory.lesson${i + 1}.v1`,
);
const button = (p, n) => p.getByRole("button", { name: n, exact: true });
const stage = (p, n) =>
  p
    .getByRole("navigation", { name: "第十四节学习步骤" })
    .getByRole("button")
    .nth(n);
async function directory(p, n = 13, act = (l) => l.click()) {
  const nav = p.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await act(button(p, "☰ 课程"), "menu");
  await act(nav.getByRole("button").nth(n), "course");
  await expect(p.locator("#conditional-stage-heading")).toBeVisible();
  await p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
async function open(p) {
  await p.goto("/");
  await directory(p);
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
async function safe(p) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
const next = (p) => button(p, "完成并继续").click();
const result = (p, v) =>
  p
    .getByRole("group", { name: "下一次模拟结果", exact: true })
    .getByRole("button", { name: v, exact: true });
const deliver = (p) => p.getByRole("button", { name: /^投递最早结果/ });
async function run(p, outcome = "成功") {
  await result(p, outcome).click();
  await button(p, "开始模拟上传").click();
  await button(p, "模拟上传完成").click();
  await deliver(p).click();
}
const phase = (p, s) =>
  expect(p.getByTestId("upload-branch")).toHaveAttribute("data-phase", s);
const deny = () =>
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw Error("denied");
      },
    },
  });

test("fourteenth lazy module registered while thirty-second remains preview", async ({
  page,
}) => {
  const req = [];
  page.on("request", (r) => req.push(r.url()));
  await page.goto("/");
  await expect(page.locator("#stage-heading")).toBeVisible();
  expect(req.some((u) => /lesson-fourteen-.*\.js/.test(u))).toBe(false);
  await directory(page);
  expect(req.some((u) => /lesson-fourteen-.*\.js/.test(u))).toBe(true);
  await expect(page).toHaveTitle("条件渲染 · 前端观察室");
  await expect(page.locator(".available-dot")).toHaveCount(31);
});
test("all five mutually exclusive branches replace actual nodes with failure retry and upload cancel", async ({
  page,
}) => {
  await open(page);
  await phase(page, "empty");
  const old = await page.getByTestId("branch-empty").elementHandle();
  await run(page, "失败");
  await phase(page, "failure");
  expect(await old.evaluate((e) => e.isConnected)).toBe(false);
  await expect(page.locator('[data-testid^="branch-"]')).toHaveCount(1);
  await result(page, "成功").click();
  await button(page, "重试模拟任务").click();
  await phase(page, "uploading");
  await expect(button(page, "重试模拟任务")).toHaveCount(0);
  await button(page, "模拟上传完成").click();
  await expect(button(page, "开始模拟上传")).toBeFocused();
  await deliver(page).click();
  await phase(page, "success");
  await button(page, "重新开始并保留说明").click();
  await button(page, "开始模拟上传").click();
  await button(page, "取消模拟任务").click();
  await phase(page, "empty");
  await expect(button(page, "开始模拟上传")).toBeFocused();
  await next(page);
  await expect(stage(page, 1)).toHaveAttribute("aria-current", "step");
});
test("internal input DOM identity value and focus differ for unmount versus hidden and hidden has no Tab targets", async ({
  page,
}) => {
  await open(page);
  await stage(page, 1).click();
  for (const [kind, label] of [
    ["unmount", "卸载"],
    ["hidden", "保留"],
  ]) {
    const input = page.getByLabel(`${label}分支内部说明`),
      node = await input.elementHandle();
    await button(page, `填入${label}示例`).click();
    await input.fill("真实编辑的说明");
    await input.focus();
    await button(page, `从内部隐藏${label}分支`).click();
    await expect(button(page, `恢复${label}分支`)).toBeFocused();
    if (kind === "unmount")
      expect(await node.evaluate((e) => e.isConnected)).toBe(false);
    else {
      expect(await node.evaluate((e) => e.isConnected)).toBe(true);
      await expect(input).toBeHidden();
      await expect(input).toHaveValue("真实编辑的说明");
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Tab");
        expect(
          await page.evaluate(
            () => !!document.activeElement.closest("[hidden]"),
          ),
        ).toBe(false);
      }
    }
    await button(page, `恢复${label}分支`).click();
    await expect(input).toHaveValue(kind === "unmount" ? "" : "真实编辑的说明");
    await expect(button(page, `隐藏${label}分支`)).toBeFocused();
    expect(await input.evaluate((e, n) => e === n, node)).toBe(
      kind === "hidden",
    );
  }
  await axeCheck(page);
});
test("late success and failure cannot overwrite canceled or newer tasks", async ({
  page,
}) => {
  await open(page);
  await stage(page, 2).click();
  await button(page, "填入上传示例说明").click();
  await result(page, "失败").click();
  await button(page, "开始模拟上传").click();
  await button(page, "模拟上传完成").click();
  await button(page, "取消模拟任务").click();
  await result(page, "成功").click();
  await button(page, "开始模拟上传").click();
  await button(page, "模拟上传完成").click();
  await deliver(page).click();
  await phase(page, "processing");
  await expect(page.getByTestId("upload-report")).toContainText("已忽略失效");
  await deliver(page).click();
  await phase(page, "success");
  await button(page, "重新开始并保留说明").click();
  await expect(page.getByLabel("父级保存的说明")).toHaveValue("周五产品演示");
  await result(page, "成功").click();
  await button(page, "开始模拟上传").click();
  await button(page, "模拟上传完成").click();
  await button(page, "取消模拟任务").click();
  await deliver(page).click();
  await phase(page, "empty");
  await expect(page.getByTestId("upload-report")).toContainText("已忽略失效");
  await safe(page);
});
test("duplicate begin is guarded and leaving or refreshing removes pending work", async ({
  page,
}) => {
  await open(page);
  await button(page, "开始模拟上传").click();
  await button(page, "开始模拟上传").evaluate((e) => {
    e.click();
    e.click();
  });
  await expect(deliver(page)).toContainText("（1）");
  await stage(page, 1).click();
  await stage(page, 0).click();
  await phase(page, "empty");
  await expect(deliver(page)).toContainText("（0）");
  await button(page, "开始模拟上传").click();
  await page.reload();
  await directory(page);
  await phase(page, "empty");
  await expect(deliver(page)).toContainText("（0）");
});
test("every station axe and desktop/mobile local crops", async ({
  page,
}, info) => {
  await open(page);
  mkdirSync(out, { recursive: true });
  for (let i = 0; i < 5; i++) {
    await stage(page, i).click();
    if (i === 4) await button(page, "生成条件指令").click();
    await axeCheck(page);
    await safe(page);
    await page
      .locator(".lesson-stage")
      .screenshot({ path: `${out}/station-${i + 1}-${info.project.name}.png` });
  }
  await page.getByLabel("可编辑的 条件 Agent 指令").fill("可真实编辑的简报。");
  await expect(page.getByLabel("可编辑的 条件 Agent 指令")).toHaveValue(
    "可真实编辑的简报。",
  );
});
test("all upload branches axe and visible focus restore", async ({ page }) => {
  await open(page);
  for (const outcome of ["失败", "成功"]) {
    await result(page, outcome).click();
    await button(page, "开始模拟上传").click();
    await axeCheck(page);
    await button(page, "模拟上传完成").click();
    await axeCheck(page);
    await deliver(page).click();
    await axeCheck(page);
    await button(
      page,
      outcome === "失败" ? "返回空状态并保留说明" : "重新开始并保留说明",
    ).click();
    await expect(button(page, "开始模拟上传")).toBeFocused();
  }
  await page.emulateMedia({ forcedColors: "active" });
  await expect(button(page, "开始模拟上传")).not.toHaveCSS(
    "outline-style",
    "none",
  );
});
test("corrupt and unavailable local storage remain usable", async ({
  page,
}) => {
  await page.addInitScript(
    (k) =>
      localStorage.setItem(
        k,
        '{"step":99,"done":[0,99],"answers":[7,null,1],"seen":["oops"]}',
      ),
    key,
  );
  await open(page);
  await expect(stage(page, 0)).toHaveAttribute("aria-current", "step");
  await expect(page.locator(".lesson-fourteen .lesson-bottom")).toContainText(
    "1 / 5",
  );
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  });
  await page.reload();
  await directory(page);
  await button(page, "开始模拟上传").click();
  await phase(page, "uploading");
  await expect(
    page.getByText("浏览器存储不可用；本次进度仅在页面内保留", { exact: true }),
  ).toContainText("本次进度仅");
});
async function flow(p, act, toggle, edit) {
  const a = (n) => act(button(p, n), n),
    d = () => act(deliver(p), "deliver"),
    pick = (v) => act(result(p, v), "result " + v),
    advance = () => a("完成并继续");
  await directory(p, 13, act);
  await a("完成并继续");
  await expect(p.locator(".notice")).toContainText("先完成");
  await pick("失败");
  await a("开始模拟上传");
  await a("模拟上传完成");
  await d();
  await pick("成功");
  await a("重试模拟任务");
  await a("模拟上传完成");
  await d();
  await a("重新开始并保留说明");
  await a("开始模拟上传");
  await a("取消模拟任务");
  await advance();
  for (const label of ["卸载", "保留"]) {
    await a(`填入${label}示例`);
    await a(`从内部隐藏${label}分支`);
    await expect(button(p, `恢复${label}分支`)).toBeFocused();
    await a(`恢复${label}分支`);
    await expect(p.getByLabel(`${label}分支内部说明`)).toHaveValue(
      label === "卸载" ? "" : "周五产品演示",
    );
  }
  await advance();
  await a("填入上传示例说明");
  await a("开始模拟上传");
  await a("模拟上传完成");
  await a("取消模拟任务");
  await d();
  await expect(p.getByTestId("upload-report")).toContainText("已忽略失效");
  await a("开始模拟上传");
  await a("模拟上传完成");
  await d();
  await a("重新开始并保留说明");
  await advance();
  const cards = p.locator(".quiz-card");
  await act(cards.nth(0).getByRole("button").nth(0), "wrong");
  await expect(cards.nth(0).getByRole("status")).toContainText("再想一想");
  for (const [i, v] of [1, 0, 1].entries())
    await act(cards.nth(i).getByRole("button").nth(v), "answer " + i);
  await advance();
  await a("生成条件指令");
  const draft = p.getByLabel("可编辑的 条件 Agent 指令");
  await expect(draft).toHaveValue(/条件内容.*恢复合同.*重试与取消.*焦点/s);
  if (edit) await edit(draft);
  await a("复制条件指令");
  await expect(p.locator(".copy-feedback")).toContainText("自动复制不可用");
  await toggle(p.getByLabel("我已检查 全部分支、恢复、重试与取消。"), "review");
  await a("完成第十四节");
  await expect(p.locator(".lesson-fourteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  const done = await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)),
      key,
    ),
    keysBefore = await p.evaluate(() => window.lesson14Keys ?? null);
  await p.reload();
  await directory(p, 13, act);
  await expect(p.locator(".lesson-fourteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十四节进度");
  await a("保留第十四节进度");
  await expect(p.locator(".lesson-fourteen .lesson-bottom")).toContainText(
    "5 / 5",
  );
  await a("重置第十四节进度");
  await a("确认重置第十四节");
  await expect(p.locator(".lesson-fourteen .lesson-bottom")).toContainText(
    "0 / 5",
  );
  await expect(p.locator("#conditional-stage-heading")).toBeFocused();
  await phase(p, "empty");
  await axeCheck(p);
  await safe(p);
  return {
    done,
    keysBefore,
    keysAfter: await p.evaluate(() => window.lesson14Keys ?? null),
  };
}
async function seeded(p) {
  await p.addInitScript(
    ({ prior }) => {
      for (const [i, k] of prior.entries())
        if (localStorage.getItem(k) === null)
          localStorage.setItem(
            k,
            JSON.stringify({ step: i % 5, done: [0], marker: "prior " + i }),
          );
    },
    { prior },
  );
  await p.addInitScript(deny);
  await p.goto("/");
  return p.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), prior);
}
test("complete real keyboard-only flow retry edit refresh cancel confirm and thirteen prior stores", async ({
  page,
}, info) => {
  const trace = [],
    before = await seeded(page),
    { seek, act, toggle } = createKeyboardNavigator(page, expect, trace, {
      lesson: "lesson-fourteen",
      profile: info.project.name,
    });
  const r = await flow(page, act, toggle, async (field) => {
    await seek(field, "draft");
    await page.keyboard.press("Control+End");
    await page.keyboard.type("\nKeyboard review.");
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
test("zero-keyboard touch flow wrong retry refresh cancel confirm preserves prior progress", async ({
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
    window.lesson14Keys = [];
    for (const type of ["keydown", "keyup"])
      addEventListener(type, (e) => window.lesson14Keys.push(e.key));
  });
  const before = await seeded(p),
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

test("simulated upload never issues network or opens a private file input", async ({
  page,
}) => {
  await open(page);
  const requests = [];
  page.on("request", (r) =>
    requests.push({ method: r.method(), url: r.url() }),
  );
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await run(page, "失败");
  await result(page, "成功").click();
  await button(page, "重试模拟任务").click();
  await button(page, "模拟上传完成").click();
  await deliver(page).click();
  await button(page, "重新开始并保留说明").click();
  expect(requests).toEqual([]);
});

test("reset cancels an active task and removes its retained callback queue", async ({
  page,
}) => {
  await open(page);
  await button(page, "填入上传示例说明").click();
  await button(page, "开始模拟上传").click();
  await button(page, "模拟上传完成").click();
  await button(page, "取消模拟任务").click();
  await button(page, "开始模拟上传").click();
  await expect(deliver(page)).toContainText("（2）");
  await button(page, "重置第十四节进度").click();
  await page.keyboard.press("Escape");
  await expect(button(page, "重置第十四节进度")).toBeFocused();
  await phase(page, "uploading");
  await button(page, "重置第十四节进度").click();
  await button(page, "确认重置第十四节").click();
  await phase(page, "empty");
  await expect(deliver(page)).toContainText("（0）");
  await expect(deliver(page)).toBeDisabled();
  await expect(page.getByLabel("父级保存的说明")).toHaveValue("");
  await expect(page.locator("#conditional-stage-heading")).toBeFocused();
});

test("clipboard success copies edited text and a late result cannot repopulate a reset lesson", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copied = text;
        },
      },
    }),
  );
  await open(page);
  await stage(page, 4).click();
  await button(page, "生成条件指令").click();
  const draft = page.getByLabel("可编辑的 条件 Agent 指令");
  const text = (await draft.inputValue()) + "\n实际编辑追加。";
  await draft.fill(text);
  await button(page, "复制条件指令").click();
  await expect(page.locator(".copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => window.copied)).toBe(text);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((_, reject) => {
            window.rejectCopy = reject;
          }),
      },
    }),
  );
  await button(page, "复制条件指令").click();
  await button(page, "重置第十四节进度").click();
  await button(page, "确认重置第十四节").click();
  await page.evaluate(() => window.rejectCopy(Error("late denied")));
  await stage(page, 4).click();
  await expect(draft).toHaveValue("");
  await expect(page.locator(".copy-feedback")).not.toContainText(
    "自动复制不可用",
  );
});

test("genuine editing without example buttons completes both memory and parent recovery tasks", async ({
  page,
}) => {
  await open(page);
  await stage(page, 1).click();
  for (const label of ["卸载", "保留"]) {
    await page.getByLabel(`${label}分支内部说明`).fill("自行输入的说明");
    await button(page, `从内部隐藏${label}分支`).click();
    await button(page, `恢复${label}分支`).click();
  }
  await expect
    .poll(() =>
      page.evaluate((k) => {
        const d = JSON.parse(localStorage.getItem(k));
        return d.unmountVerified && d.hiddenVerified;
      }, key),
    )
    .toBe(true);
  await stage(page, 2).click();
  await page.getByLabel("父级保存的说明").fill("自行编辑的父级说明");
  await run(page, "成功");
  await button(page, "重新开始并保留说明").click();
  await expect(page.getByLabel("父级保存的说明")).toHaveValue(
    "自行编辑的父级说明",
  );
  await expect
    .poll(() =>
      page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k)).parentVerified,
        key,
      ),
    )
    .toBe(true);
});
