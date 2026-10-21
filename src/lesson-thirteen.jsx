import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  PROPS_STORAGE,
  propsSteps,
  propsQuestions,
  propsSources,
  propsInitial,
  readPropsProgress,
  sizes,
  variants,
  routeItems,
} from "./lesson-thirteen-content";
import "./lesson-thirteen.css";
const add = (a, v) => [...new Set([...a, v])];
// Each instance owns its local memory. All props are read-only inputs.
function RouteChoice({
  id,
  title,
  desc,
  size = "md",
  variant = "solid",
  disabled = false,
  loading = false,
  onActivate,
}) {
  const [memory, setMemory] = useState({ saved: false, count: 0 }),
    blocked = disabled || loading;
  const activate = () => {
    if (blocked) return;
    setMemory((o) => ({ saved: !o.saved, count: o.count + 1 }));
    onActivate?.(id);
  };
  return (
    <article
      className="props-instance"
      data-testid={`instance-${id}`}
      data-instance={id}
      data-count={memory.count}
      data-saved={String(memory.saved)}
      data-size={size}
      data-variant={variant}
      data-disabled={String(disabled)}
      data-loading={String(loading)}
    >
      <div className="props-card-heading">
        <span className="props-id">{id}</span>
        <div>
          <h3>{title}</h3>
          <span>共用 RouteChoice 实现</span>
        </div>
      </div>
      <p>{desc}</p>
      <code className="props-code">
        size="{size}" · variant="{variant}"<br />
        disabled={String(disabled)} · loading={String(loading)}
      </code>
      <button
        type="button"
        data-testid={`action-${id}`}
        className={`props-demo-action size-${size} variant-${variant}`}
        disabled={blocked}
        aria-pressed={memory.saved}
        aria-busy={loading || undefined}
        onClick={activate}
      >
        <span aria-hidden="true">{memory.saved ? "✓" : "○"}</span>收藏{title}
        {loading && <span> · 加载演示中</span>}
      </button>
      <div className="props-memory">
        <strong>{memory.saved ? "✓ 本地已收藏" : "○ 本地未收藏"}</strong>
        <span>内部 State · 有效触发 {memory.count} 次</span>
      </div>
    </article>
  );
}
function PropWorkbench({ data, patch, loadingTarget, setLoadingTarget }) {
  const root = useRef(null),
    baseline = useRef(new Map()),
    events = useRef(0),
    [report, setReport] = useState(null),
    [probe, setProbe] = useState(null),
    [announcement, setAnnouncement] =
      useState("这是本地交互实验，不发送请求。"),
    [log, setLog] = useState([]);
  const scope = data.step === 0 ? "shared" : data.scope,
    items = data.reversed ? [...routeItems].reverse() : routeItems;
  useLayoutEffect(() => {
    for (const node of root.current.querySelectorAll("[data-instance]"))
      baseline.current.set(node.dataset.instance, node);
  }, []);
  const activated = (id) => {
    const sequence = ++events.current;
    setAnnouncement(`收到 ${id} 的 onActivate：只切换该实例的本地收藏。`);
    setLog((o) => [...o, `${id} · 有效激活事件 #${sequence}`].slice(-6));
    patch((o) => ({
      used: add(o.used, id),
      restored:
        o.restored ||
        !!(
          id === "A" &&
          o.disabledVerified &&
          o.loadingVerified &&
          o.overlapVerified &&
          o.cancelled &&
          !o.disabled &&
          loadingTarget === "none"
        ),
    }));
  };
  const inspect = () => {
    const rows = [...root.current.querySelectorAll("[data-instance]")].map(
      (node) => {
        const button = node.querySelector("button"),
          r = button.getBoundingClientRect();
        return {
          id: node.dataset.instance,
          size: node.dataset.size,
          variant: node.dataset.variant,
          count: Number(node.dataset.count),
          saved: node.dataset.saved,
          disabled: button.disabled,
          loading: node.dataset.loading,
          sameNode: baseline.current.get(node.dataset.instance) === node,
          height: r.height,
          width: r.width,
        };
      },
    );
    setReport(rows);
    const a = rows.find((r) => r.id === "A"),
      b = rows.find((r) => r.id === "B"),
      independent =
        a.count > 0 &&
        b.count > 0 &&
        (a.count !== b.count || a.saved !== b.saved);
    patch((o) => ({
      inspected: true,
      identityVerified:
        o.identityVerified || !!(o.reordered && rows.every((r) => r.sameNode)),
      independentVerified: o.independentVerified || independent,
    }));
    setAnnouncement(
      "已读取三个实例的真实 Props、内部记忆与尺寸。参数变化后可重新读取。",
    );
  };
  const verifyBlocked = () => {
    const node = root.current.querySelector('[data-instance="A"]'),
      button = node.querySelector("button");
    if (!button.disabled) {
      setProbe(null);
      setAnnouncement(
        "先打开父级 disabled 或让 A 进入 loading，再检查不可操作行为。",
      );
      return;
    }
    const countBefore = Number(node.dataset.count),
      eventsBefore = events.current;
    button.click();
    button.click();
    const after = Number(node.dataset.count),
      afterEvents = events.current,
      ok = countBefore === after && eventsBefore === afterEvents;
    setProbe({
      disabledProp: data.disabled,
      loadingProp: loadingTarget !== "none",
      nativeDisabled: button.disabled,
      countBefore,
      countAfter: after,
      eventsBefore,
      eventsAfter: afterEvents,
      ok,
    });
    if (ok)
      patch((o) => ({
        disabledVerified:
          o.disabledVerified || (data.disabled && loadingTarget === "none"),
        loadingVerified:
          o.loadingVerified || (!data.disabled && loadingTarget !== "none"),
        overlapVerified:
          o.overlapVerified || (data.disabled && loadingTarget !== "none"),
      }));
    setAnnouncement(
      ok
        ? "两次调用 A 的原生 click() 都没有触发操作或回调。"
        : "检查结果与合同不符，请重试并核对实现。",
    );
  };
  const defaults = () => {
    patch({
      sharedSize: "md",
      sharedVariant: "solid",
      bSize: "sm",
      bVariant: "quiet",
      scope: "shared",
      disabled: false,
    });
    setLoadingTarget("none");
    setAnnouncement("已恢复默认父级参数；三张卡的内部记忆保持原样。");
  };
  const chooseSize = (v) =>
    patch((o) =>
      scope === "B"
        ? { bSize: v, bConfigured: o.bConfigured || v !== o.bSize }
        : { sharedSize: v, sizeChanged: o.sizeChanged || v !== o.sharedSize },
    );
  const chooseVariant = (v) =>
    patch((o) =>
      scope === "B"
        ? { bVariant: v, bConfigured: o.bConfigured || v !== o.bVariant }
        : {
            sharedVariant: v,
            variantChanged: o.variantChanged || v !== o.sharedVariant,
          },
    );
  return (
    <div ref={root} hidden={data.step >= 3}>
      <div className="props-lab">
        <div className="panel-heading">
          <span>父级配置 → 三个 RouteChoice 实例</span>
          <span className="micro">稳定 key：A / B / C</span>
        </div>
        <div className="props-controls">
          {data.step > 0 && (
            <Choices
              label="参数作用范围"
              values={[
                ["shared", "全部实例"],
                ["B", "仅 B 覆盖"],
              ]}
              value={scope}
              onChange={(v) =>
                patch((o) => ({ scope: v, scopeSeen: add(o.scopeSeen, v) }))
              }
            />
          )}
          <Choices
            label="size 参数"
            values={sizes}
            value={scope === "B" ? data.bSize : data.sharedSize}
            onChange={chooseSize}
          />
          <Choices
            label="variant 参数"
            values={variants}
            value={scope === "B" ? data.bVariant : data.sharedVariant}
            onChange={chooseVariant}
          />
          <div className="props-control-actions">
            <button className="props-action" onClick={defaults}>
              恢复默认父级参数
            </button>
            {data.step > 0 && (
              <button
                className="props-action"
                onClick={() => {
                  patch((o) => ({ reversed: !o.reversed, reordered: true }));
                  setAnnouncement(
                    "顺序已反转，使用稳定 ID 作为 key，收藏与计数应跟随原实例。",
                  );
                }}
              >
                反转 A/B/C 顺序
              </button>
            )}
          </div>
        </div>
        <p className="props-caption">
          {data.step === 0
            ? "第一站统一传入参数。"
            : "可单独覆盖 B 的外观；它仍是同一组件。"}
          当前顺序 {items.map((x) => x.id).join(" → ")}。按钮最小高度 44px，sm
          也不缩小触摸目标。
        </p>
        <div className="props-instance-grid">
          {items.map((item) => (
            <RouteChoice
              key={item.id}
              {...item}
              size={
                item.id === "B" && scope === "B" ? data.bSize : data.sharedSize
              }
              variant={
                item.id === "B" && scope === "B"
                  ? data.bVariant
                  : data.sharedVariant
              }
              disabled={data.disabled}
              loading={loadingTarget === "all" || loadingTarget === item.id}
              onActivate={activated}
            />
          ))}
        </div>
        {data.step === 1 && (
          <div className="props-reading">
            <strong>先制造不同记忆，再改变外观</strong>
            <p>
              试着点击 A 两次、B 一次，让 A/B 的计数或收藏不同；为 B
              改一个覆盖参数。反转顺序后读取：记忆应跟着
              A/B，而不是跟着屏幕位置。之前已点击过也没关系，让 A/B 不同即可。
            </p>
          </div>
        )}
        {data.step === 2 && (
          <div className="props-behavior">
            <h3>父级传入 disabled / loading</h3>
            <p>
              本课约定：两者任一为 true 都不接收激活；同时为 true
              时保留加载文字与
              aria-busy。这是明确的产品合同，不是所有组件库的唯一规定。
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={data.disabled}
                onChange={(e) => {
                  patch({ disabled: e.target.checked });
                  setAnnouncement("父级 disabled 已更新，内部收藏与计数保持。");
                }}
              />
              父级 disabled
            </label>
            <Choices
              label="父级 loading"
              values={[
                ["none", "不加载"],
                ["A", "仅 A 加载"],
                ["all", "全部加载"],
              ]}
              value={loadingTarget}
              onChange={(v) => {
                setLoadingTarget(v);
                setAnnouncement(
                  v === "none"
                    ? "加载演示已结束，无真实请求。"
                    : `父级传入 ${v === "A" ? "仅 A" : "全部实例"} loading=true；没有真实请求或自动计时。`,
                );
              }}
            />
            <div className="props-control-actions">
              <button className="props-action" onClick={verifyBlocked}>
                检查 A 的不可操作行为
              </button>
              <button
                className="props-action"
                onClick={() => {
                  if (loadingTarget !== "none") {
                    setLoadingTarget("none");
                    patch({ cancelled: true });
                    setAnnouncement(
                      "已取消本地加载演示。解除 disabled 后可继续操作；既有本地收藏不会撤销。",
                    );
                  } else setAnnouncement("当前没有加载演示，无需取消。");
                }}
              >
                取消加载演示
              </button>
            </div>
            <p className="micro">
              检查按钮会读取 A 的原生 disabled，并连续调用两次
              click()，比较实际计数与 onActivate 事件。不会伪造请求。分别验证
              disabled、loading、叠加后，取消加载并解除 disabled，再点击 A。
            </p>
            {probe && (
              <div className="props-reading" data-testid="blocked-report">
                读取时：disabled prop={String(probe.disabledProp)}；loading
                prop={String(probe.loadingProp)}；原生 button.disabled=
                {String(probe.nativeDisabled)}。<br />
                有效触发 {probe.countBefore} → {probe.countAfter}；onActivate
                事件 {probe.eventsBefore} → {probe.eventsAfter}；
                {probe.ok ? "✓ 没有执行" : "检查未通过"}。
              </div>
            )}
            <details className="props-mapping">
              <summary>设计变体 → 代码接口（近似映射）</summary>
              <p>
                Figma variant 组织元件集中的设计变体与属性组合，不等于 React
                props 或 State。比如设计里的 Size=Small / Style=Primary /
                State=Disabled，可按本项目 API 近似映射到 size=sm /
                variant=solid /
                disabled=true；事件、键盘、焦点和加载取消仍需代码实现。本课没有读取任何用户
                Figma 文件。
              </p>
            </details>
          </div>
        )}
        <div className="props-inspector">
          <button className="props-action" onClick={inspect}>
            读取三个实例的 Props 与记忆
          </button>
          {report && (
            <ul className="props-report" data-testid="instance-report">
              {report.map((r) => (
                <li key={r.id}>
                  <strong>实例 {r.id}</strong> · size={r.size} / variant=
                  {r.variant}；原生 disabled={String(r.disabled)} / loading=
                  {r.loading}；内部收藏={r.saved} / 有效触发={r.count}；与初始
                  DOM 相同={r.sameNode ? "是" : "否"}；按钮实测{" "}
                  {r.width.toFixed(1)} × {r.height.toFixed(1)}px。
                </li>
              ))}
            </ul>
          )}
          <p className="micro">
            读取时快照，改参数后可重新读取。稳定类型、树的位置与 key 影响 React
            身份；这里把真实节点检查与记忆行为一起核对，不把节点数当性能基准。
          </p>
        </div>
        <div
          className="props-reading"
          role="status"
          data-testid="props-announcement"
        >
          {announcement}
        </div>
        <details className="props-event-log">
          <summary>查看最近激活事件（最多 6 条）</summary>
          <ol>
            {log.length ? (
              log.map((x, i) => <li key={`${i}-${x}`}>{x}</li>)
            ) : (
              <li>还没有有效激活事件。</li>
            )}
          </ol>
        </details>
      </div>
      <Note
        title={
          data.step === 0
            ? "Props 是只读输入，不是共享可变记忆"
            : data.step === 1
              ? "共享实现，实例记忆仍各自独立"
              : "视觉变体与交互合同一起验收"
        }
      >
        {data.step === 0
          ? "Props 的来源可以是常量、计算结果、父级 State 或函数。父级重新渲染时可以传入新值，子组件不直接改它；本地收藏是各 RouteChoice 的内部 State。默认 size=md、variant=solid、disabled=false、loading=false。"
          : data.step === 1
            ? "不要把 size、variant 或数组下标当作会变化的身份；这里用稳定业务 ID 作 key。参数和顺序改变都不应无故重建实例。需要收藏同步时，应明确把状态提升到父级，而不是误以为复用代码就共享 State。"
            : "loading 只由本地父级开关控制，没有网络、计时器或稍后的自动结果。取消只解除占用，不撤销已经发生的本地收藏。对话框、导航和收藏职责不同，不因都圆角就塞进万能组件。"}
        <br />
        学习进度和配置另存当前浏览器；收藏与计数是当前实验实例记忆，刷新、离开本课或确认重置会还原。进入练习会停止加载演示，实例记忆仍保留，返回可继续观察。
      </Note>
    </div>
  );
}
function PropsReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十三节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课依 React 官方文档区分只读 Props 与组件
          State，以三个真实实例检查统一参数、独立覆盖、内部记忆和稳定 key。Figma
          variant 是设计元件集的变体组织，与代码接口只按意图近似映射；未访问用户
          Figma 文件。本地 loading 无真实请求或计时器；原生 disabled
          与逻辑守卫共同阻止激活，文字与 aria-busy 表达占用，反馈在 busy
          区域外。默认值与组合政策属于本例合同，不宣称所有库相同。总路线仍为
          2026-10-20 核对，不宣称永远最新。
        </p>
        <div className="source-links">
          {propsSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonThirteen({ onStorageStatus }) {
  const [data, setData] = useState(readPropsProgress),
    [notice, setNotice] = useState(""),
    [copyMessage, setCopyMessage] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const headingRef = useRef(null),
    draftRef = useRef(null),
    dialogRef = useRef(null),
    resetRef = useRef(null),
    generation = useRef(0),
    copyBusy = useRef(false);
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(PROPS_STORAGE, JSON.stringify(data));
      onStorageStatus("进度仅保存在当前浏览器");
    } catch {
      onStorageStatus("浏览器存储不可用；本次进度仅在页面内保留");
    }
  }, [data, onStorageStatus]);
  useEffect(() => {
    headingRef.current?.focus();
    return () => {
      generation.current++;
    };
  }, []);
  useEffect(() => {
    if (resetOpen) {
      dialogRef.current?.showModal();
      dialogRef.current?.querySelector("button")?.focus();
    } else if (dialogRef.current?.open) {
      dialogRef.current.close();
      resetRef.current?.focus();
    }
  }, [resetOpen]);
  const [loadingTarget, setLoadingTarget] = useState("none"),
    [instanceEpoch, setInstanceEpoch] = useState(0);
  const tasks = [
    [
      [data.sizeChanged, "改变统一 size 参数"],
      [data.variantChanged, "改变统一 variant 参数"],
      [data.inspected, "读取真实实例的 Props 与记忆"],
    ],
    [
      [
        data.bConfigured && data.scopeSeen.includes("B"),
        "为 B 设置独立覆盖参数",
      ],
      [data.reordered && data.identityVerified, "反转顺序并读取稳定的实例身份"],
      [data.independentVerified, "让 A/B 记忆不同并读取三个实例"],
    ],
    [
      [data.disabledVerified, "验证单独 disabled 不执行"],
      [data.loadingVerified, "验证单独 loading 阻止重复激活"],
      [data.overlapVerified, "验证 disabled + loading 的组合合同"],
      [data.cancelled && data.restored, "取消加载，恢复 A 的有效操作"],
    ],
    propsQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成可编辑的组件指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查 API、默认值、组合、状态归属与反馈",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = propsSteps[data.step];
  const go = (next) => {
    patch({ step: next });
    if (next !== 2) setLoadingTarget("none");
    setNotice("");
    setCopyMessage("");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const finish = () => {
    if (!ready[data.step]) {
      setNotice(
        "先完成这一站的小任务，再继续。可以反复操作，进度不会重复计数。",
      );
      return;
    }
    patch((old) => ({ done: add(old.done, old.step) }));
    if (data.step < 4) go(data.step + 1);
    else if ([0, 1, 2, 3].every((n) => data.done.includes(n)))
      setNotice("第十三节已完成。" + nextLessonHint(12));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const favorite = data.brief === "favorite";
    patch({
      draft: `请在现有项目实现${favorite ? "职责明确的路线收藏组件 RouteChoice" : "职责明确的基础操作按钮 ActionButton"}。不要为每个视觉版本复制整页，也不要做包办对话框、导航和收藏业务的万能巨组件。

API 与默认值：size 只取 sm / md / lg，默认 md；variant 只取 solid / outline / quiet，默认 solid；disabled=false、loading=false。提供明确可读的名称和 onActivate 回调；${favorite ? "每个实例有稳定业务 id 和 title，内部记住本地收藏与有效触发次数。" : "按钮负责激活操作；收藏结果等业务状态由调用方持有，不让基础按钮暗藏多个业务职责。"}尺寸变化不牺牲触摸目标，本例 sm / md / lg 至少 44 / 52 / 60px。

当前参数参考：共同 size=${data.sharedSize}、variant=${data.sharedVariant}；${data.scope === "B" ? `B 单独覆盖 size=${data.bSize}、variant=${data.bVariant}` : "全部实例沿用共同参数"}；disabled=${data.disabled}。这些是父级传来的只读输入，来源可以是常量、计算结果、父级 State 或函数；子组件需要改变上层配置时，通过回调请求父级更新，不直接改 props，也不把 props 称作可任意写的共享 State。

组合与事件合同：本任务约定 disabled 或 loading 任一为 true 就不接受激活；使用原生 button disabled 并在处理逻辑保留守卫，不只是换颜色。两者同时为 true 时仍显示加载文字与 aria-busy，且 onActivate 不执行。busy 只标记按钮，简短状态反馈留在其外面，避免整个反馈区域被忙碌状态压住。解除限制后恢复可见焦点与可操作性；取消加载的外部控件始终能通过键盘和触屏到达。其他产品可以有不同政策，但必须先明确。

实例与记忆：至少渲染 A/B/C 三个实例，共用实现。统一参数、只覆盖 B、改变顺序都不能意外清空各自记忆；使用稳定业务 key，不把 size、variant 或数组下标当作会变化的身份。需要多个实例真正同步时，明确把相应状态提升到父级，经输入与回调连接，不维护冲突的双份来源。刷新、离开本课和显式重置会清除本地实验实例记忆；浏览器另存学习进度与配置。

设计映射：Figma variant 组织元件集中的设计组合，可按意图近似映射为 size、variant 或 disabled；它不等于 React props 或 State，也不自动实现键盘、焦点、点击守卫或加载取消。不凭截图断言原站真实组件或技术。

加载演示：使用手动父级 loading 开关，无真实请求、计时器、音频或 AI。取消只结束本地占用，不撤销已经发生的本地收藏或谎称服务器成功。若以后加入异步任务，必须可取消、清理资源、核对请求归属，迟到结果不能污染后续状态。

验收：
1. 桌面和 375px 调整尺寸及外观，测量真实按钮与反馈，不依赖截图替换；多实例有不同记忆，改参数与顺序后身份、计数跟随原 id。
2. 分别检查 disabled、loading、两者叠加，重复尝试激活仍无回调、无计数变化；取消 loading 并解除 disabled 后，A 才恢复一次有效事件。
3. 核对名称、aria-pressed（仅适用切换操作）、aria-busy、文字状态、键盘可见焦点和纯触屏完成路径，不靠颜色表达唯一状态；主要内容不被裁切。
4. 走完练习重试、草稿编辑、复制失败回退、刷新及取消/确认重置，保留其他模块进度。
${data.includeEdges ? "5. 保持静态、足够简单的基础实现，若以后加动效要支持减少动态和静态替代；检查默认值与非法组合处理，不为复用牺牲职责清晰度。" : "5. 保持静态、可读与职责清楚的基础实现，按目标浏览器验收。"}

请先定义合理 API、默认值、组合约束、内部/父级状态归属与交互反馈，再实现并逐条自测。`,
      generated: true,
      reviewed: false,
    });
    setCopyMessage("");
  };
  const copy = async () => {
    if (copyBusy.current) return;
    copyBusy.current = true;
    const id = generation.current;
    try {
      if (!navigator.clipboard?.writeText) throw Error("unavailable");
      await navigator.clipboard.writeText(data.draft);
      if (id === generation.current)
        setCopyMessage("已复制，可以粘贴给 Coding Agent。");
    } catch {
      if (id === generation.current) {
        setCopyMessage(
          "自动复制不可用：已选中全文，请按 Ctrl+C / ⌘C；手机可长按复制。",
        );
        draftRef.current?.focus();
        draftRef.current?.select();
      }
    } finally {
      copyBusy.current = false;
    }
  };
  const reset = () => {
    generation.current++;
    try {
      localStorage.removeItem(PROPS_STORAGE);
    } catch {}
    setData(propsInitial());
    setLoadingTarget("none");
    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十三节的进度、参数与草稿；前十二节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-thirteen">
      <div className="lesson-overline">
        <span className="pill">第十三节 · Props 与 Variant</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Props 与 Variant<span className="title-period">.</span>
          </h1>
          <p>同一份实现，多组输入，各自的记忆。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>13</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 分清输入与记忆
        </span>
        <span>
          <Icon type="check" size={16} /> 验证多实例复用
        </span>
        <span>
          <Icon type="check" size={16} /> 定义合理的 API
        </span>
      </div>
      <nav className="stepper" aria-label="第十三节学习步骤">
        {propsSteps.map((s, i) => (
          <button
            key={s.short}
            aria-current={data.step === i ? "step" : undefined}
            className={`${data.step === i ? "active" : ""} ${data.done.includes(i) ? "completed" : ""}`}
            onClick={() => go(i)}
          >
            <span className="step-circle">
              {data.done.includes(i) ? <Icon type="check" size={14} /> : i + 1}
            </span>
            <span>
              {s.short}
              <small>{s.time}</small>
            </span>
          </button>
        ))}
      </nav>
      <section className="lesson-stage" aria-labelledby="props-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            PROPS LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="props-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        <PropWorkbench
          key={instanceEpoch}
          data={data}
          patch={patch}
          loadingTarget={loadingTarget}
          setLoadingTarget={setLoadingTarget}
        />
        {data.step === 3 && (
          <div className="quiz-grid">
            {propsQuestions.map((q, i) => {
              const answer = data.answers[i],
                correct = answer === q.correct;
              return (
                <fieldset
                  key={q.q}
                  className={`quiz-card ${answer !== null ? (correct ? "correct" : "incorrect") : ""}`}
                >
                  <legend>
                    <span>0{i + 1}</span>
                    {q.q}
                  </legend>
                  <div className="quiz-options">
                    {q.options.map((option, j) => (
                      <button
                        key={option}
                        aria-pressed={answer === j}
                        onClick={() =>
                          patch((old) => ({
                            answers: old.answers.map((v, k) =>
                              k === i ? j : v,
                            ),
                          }))
                        }
                      >
                        <span className="answer-letter">
                          {j === 0 ? "A" : "B"}
                        </span>
                        {option}
                        {answer === j && (
                          <span className="answer-mark">
                            {correct ? "✓" : "↺"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {answer !== null && (
                    <div className="quiz-feedback" role="status">
                      <strong>
                        {correct ? "判断正确" : "再想一想，可以重新选择"}
                      </strong>
                      <p>{q.why}</p>
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        )}
        {data.step === 4 && (
          <div className="agent-grid">
            <div className="agent-options">
              <span className="agent-icon">
                <Icon type="spark" size={26} />
              </span>
              <h3>你的组件简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="favorite">路线收藏组件</option>
                  <option value="button">基础操作按钮</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入兼容与性能边界
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成组件草稿" : "生成组件指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的组件指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制组件指令
                </button>
              </div>
              <label className="sr-only" htmlFor="props-agent-draft">
                可编辑的 组件 Agent 指令
              </label>
              <textarea
                id="props-agent-draft"
                onFocus={(event) =>
                  event.currentTarget.scrollIntoView({
                    block: "center",
                    behavior: "auto",
                  })
                }
                ref={draftRef}
                value={data.draft}
                maxLength={8000}
                onChange={(e) => {
                  patch({ draft: e.target.value, reviewed: false });
                  setCopyMessage("");
                }}
                placeholder="生成后，补充 API、默认值、组合约束、状态归属与反馈。"
              />
              <div className="copy-feedback" role="status">
                {copyMessage || "你可以修改全文。复制后，由你决定在哪里使用。"}
              </div>
              <label className="checkbox-label review">
                <input
                  type="checkbox"
                  disabled={!data.generated || data.draft.trim().length < 80}
                  checked={data.reviewed}
                  onChange={(e) => patch({ reviewed: e.target.checked })}
                />
                我已检查 API、默认值、组合、状态归属与反馈。
              </label>
            </div>
          </div>
        )}
        <div className="task-footer">
          <div>
            <strong>这一站的小任务</strong>
            <ul>
              {tasks[data.step].map(([ok, text]) => (
                <li key={text} className={ok ? "done" : ""}>
                  <span aria-label={ok ? "已完成" : "未完成"}>
                    {ok ? "✓" : "○"}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="stage-actions">
            {data.step > 0 && (
              <button className="text-button" onClick={() => go(data.step - 1)}>
                ← 上一步
              </button>
            )}
            <button className="primary next-button" onClick={finish}>
              {data.step < 4
                ? "完成并继续"
                : [0, 1, 2, 3].every((n) => data.done.includes(n))
                  ? "完成第十三节"
                  : "保存本站成果"}
              <Icon type="arrow" size={18} />
            </button>
          </div>
        </div>
        <div className="notice" role="status">
          {notice}
        </div>
      </section>
      <div className="lesson-bottom">
        <span>
          {data.done.length} / 5 站已完成
          <span className="progress-track">
            <span style={{ width: `${data.done.length * 20}%` }} />
          </span>
        </span>
        <button
          className="text-button reset-button"
          ref={resetRef}
          onClick={() => setResetOpen(true)}
        >
          重置第十三节进度
        </button>
      </div>
      <PropsReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="props-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="props-reset-title">重新开始第十三节？</h2>
        <p>仅清除第十三节的进度、实验参数和草稿；前十二节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十三节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十三节
          </button>
        </div>
      </dialog>
    </div>
  );
}
