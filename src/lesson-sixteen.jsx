import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  MACHINE_STORAGE,
  machineSteps,
  machineQuestions,
  machineSources,
  machineInitial,
  readMachineProgress,
} from "./lesson-sixteen-content";
import "./lesson-sixteen.css";
import {
  stateNames,
  eventNames,
  rules,
  initialTask,
  assess,
  transition,
} from "./lesson-sixteen-machine";
const add = (a, v) => [...new Set([...a, v])];
function StateGraph({ model, all }) {
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width:700px)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(max-width:700px)"),
      change = () => setCompact(m.matches);
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  const positions = compact
    ? {
        draft: [100, 70],
        review: [300, 70],
        running: [300, 280],
        error: [100, 280],
        success: [300, 510],
        cancelled: [100, 510],
      }
    : {
        draft: [100, 85],
        review: [420, 85],
        running: [740, 85],
        error: [420, 300],
        success: [740, 300],
        cancelled: [100, 300],
      };
  const width = compact ? 130 : 160,
    height = 66;
  return (
    <svg
      role="img"
      aria-labelledby="machine-graph-title machine-graph-desc"
      viewBox={compact ? "0 0 400 650" : "0 0 840 400"}
      data-testid="state-graph"
      data-current={model.phase}
    >
      <title id="machine-graph-title">
        本地任务状态图 · 当前{stateNames[model.phase]}
      </title>
      <desc id="machine-graph-desc">
        当前业务阶段只有一个。
        {all ? "显示完整转换" : "显示当前出边及上一次转换"}
        ；文字状态、原生事件按钮和完整事件表都在图外。
      </desc>
      <defs>
        <marker
          id="machine-arrow"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10Z" fill="context-stroke" />
        </marker>
      </defs>
      {rules
        .filter(
          (r) => all || r.from === model.phase || r.key === model.lastEdge,
        )
        .map((r) => {
          const [x, y] = positions[r.from],
            [tx, ty] = positions[r.to],
            dx = tx - x,
            dy = ty - y;
          const fraction = Math.min(
            (width / 2 + 9) / Math.abs(dx || 0.0001),
            (height / 2 + 9) / Math.abs(dy || 0.0001),
          );
          const sx = x + dx * fraction,
            sy = y + dy * fraction,
            ex = tx - dx * fraction,
            ey = ty - dy * fraction;
          const length = Math.hypot(dx, dy),
            bend = ["EDIT", "RETRY", "RESET"].includes(r.event)
              ? 55
              : r.event === "CANCEL"
                ? 25
                : 0,
            cx = (sx + ex) / 2 - (dy / length) * bend,
            cy = (sy + ey) / 2 + (dx / length) * bend;
          const status =
              r.from !== model.phase
                ? "inactive"
                : assess(model, { type: r.event, attempt: model.active }).ok
                  ? "allowed"
                  : "blocked",
            lx = (sx + ex) / 4 + cx / 2,
            ly = (sy + ey) / 4 + cy / 2;
          const routed = compact
            ? {
                "cancelled-RESET": {
                  d: "M100 477 L210 450 L210 135 L100 110 L100 103",
                  x: 210,
                  y: 180,
                },
                "success-RESET": {
                  d: "M300 477 L390 450 L390 20 L100 20 L100 37",
                  x: 350,
                  y: 175,
                },
                "review-CANCEL": {
                  d: "M235 70 L200 145 L200 440 L100 477",
                  x: 200,
                  y: 175,
                },
              }[r.key]
            : null;
          const path = routed?.d ?? `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`;
          const labelX = routed?.x ?? lx,
            labelY = routed?.y ?? (compact && Math.abs(dy) < 1 ? y - 35 : ly);
          return (
            <g
              key={r.key}
              data-edge={r.key}
              data-status={status}
              className={`machine-edge ${status} ${model.lastEdge === r.key ? "last" : ""}`}
            >
              <path d={path} markerEnd="url(#machine-arrow)" />
              <rect
                x={labelX - 40}
                y={labelY - 12}
                width="80"
                height="24"
                rx="4"
              />
              <text x={labelX} y={labelY + 5} textAnchor="middle">
                {r.event}
              </text>
            </g>
          );
        })}
      {Object.entries(stateNames).map(([id, name]) => {
        const [x, y] = positions[id],
          active = id === model.phase;
        return (
          <g
            key={id}
            data-state={id}
            data-active={String(active)}
            className={`machine-node ${active ? "active" : ""}`}
          >
            <rect
              x={x - width / 2}
              y={y - height / 2}
              width={width}
              height={height}
              rx="12"
            />
            <text x={x} y={y - 3} textAnchor="middle">
              {active ? "● 当前 · " : ""}
              {name}
            </text>
            <text
              className="machine-node-id"
              x={x}
              y={y + 20}
              textAnchor="middle"
            >
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
function MachineLab({ data, patch }) {
  const [model, setModel] = useState(initialTask),
    [message, setMessage] = useState(
      "本地手动模拟；尚无运行尝试，不连接网络或机器人。",
    ),
    [history, setHistory] = useState([]),
    [showAll, setShowAll] = useState(false),
    [inspection, setInspection] = useState("");
  const ref = useRef(model),
    root = useRef(null),
    inspector = useRef(null),
    first = useRef(null),
    last = useRef(null);
  const commit = (next) => {
    ref.current = next;
    setModel(next);
  };
  const send = (event, base = ref.current) => {
    const before = base,
      result = transition(base, event),
      d = result.decision;
    commit(result.model);
    setHistory((old) =>
      [
        ...old,
        {
          from: before.phase,
          event: event.type,
          to: result.model.phase,
          ok: d.ok,
          reason: d.reason,
          attempt: event.attempt ?? null,
        },
      ].slice(-8),
    );
    setMessage(`${d.ok ? "✓ 已接受" : "! 已阻止"} ${event.type}：${d.reason}`);
    if (!d.ok) {
      if (d.code === "title") patch({ titleGuard: true });
      if (d.code === "consent") patch({ consentGuard: true });
      if (d.code === "state") patch({ illegalSeen: true });
      if (before.phase === "running" && event.type === "START")
        patch({ duplicateSeen: true });
      if (
        d.code === "stale" &&
        event.source === "queue" &&
        before.cancelledAttempts.includes(event.attempt)
      )
        patch({ lateIgnored: true });
      return;
    }
    if (result.model.phase === "success")
      patch((old) => ({
        successSeen: true,
        retrySuccess: old.retrySuccess || before.lastStartWasRetry,
        recovered: old.recovered || before.cancellations > 0,
      }));
    if (
      event.type === "CANCEL" &&
      before.phase === "running" &&
      before.active > 0
    )
      patch({ cancelled: true });
  };
  const update = (key, value) => {
    const m = ref.current;
    if (m.phase === "running" && ["title", "consent"].includes(key)) {
      setMessage("执行中保留开始时的任务说明与确认；先完成或取消，再修改。");
      return;
    }
    const next = { ...m, context: { ...m.context, [key]: value } };
    commit(next);
    if (next.phase === "running" && next.context.pinned && next.context.details)
      patch({ orthogonal: true });
  };
  const deliver = (newest) => {
    const m = ref.current;
    if (!m.queue.length) return;
    const q = m.queue[newest ? m.queue.length - 1 : 0];
    if (
      m.queue.length === 1 &&
      [first.current, last.current].includes(document.activeElement)
    )
      inspector.current.focus();
    const base = { ...m, queue: m.queue.filter((x) => x !== q) };
    send({ ...q, source: "queue" }, base);
  };
  const inspect = () => {
    const m = ref.current,
      svg = root.current.querySelector('[data-testid="state-graph"]'),
      node = root.current.querySelector('[data-testid="machine-state"]'),
      active = svg.querySelectorAll('[data-active="true"]'),
      same =
        svg.dataset.current === m.phase &&
        node.dataset.phase === m.phase &&
        active.length === 1 &&
        active[0].dataset.state === m.phase;
    const statuses = Object.keys(eventNames).map((type) => ({
      type,
      ...assess(m, { type, attempt: m.active }),
    }));
    setInspection(
      `实际 phase=${m.phase}；图=${svg.dataset.current}；当前节点数=${active.length}；一致=${same ? "是" : "否"}。可用事件：${
        statuses
          .filter((x) => x.ok)
          .map((x) => x.type)
          .join("、") || "暂无，先检查守卫条件"
      }。`,
    );
    if (same) patch({ inspected: true });
    if (m.phase === "running" && m.context.pinned && m.context.details)
      patch({ orthogonal: true });
    setMessage(
      `已读取当前状态与允许事件：${stateNames[m.phase]}。图仅辅助，所有事件仍可用原生按钮尝试。`,
    );
  };
  const clear = () => {
    if ([first.current, last.current].includes(document.activeElement))
      inspector.current.focus();
    commit({ ...initialTask(), sequence: ref.current.sequence });
    setHistory([]);
    setInspection("");
    setMessage("已新建空白本地实验，旧队列全部丢弃；学习进度保留。");
  };
  const guardName = {
    title: "标题非空",
    ready: "标题 + 确认 + 队列容量",
    attempt: "当前尝试编号",
    null: "无附加守卫",
  };
  return (
    <div className="machine-lab" ref={root}>
      <div className="panel-heading">
        <span>本地任务 · 普通转换表 + React</span>
        <span className="micro">无 XState / Rive / 网络 / 机器人</span>
      </div>
      <div className="machine-controls">
        <label>
          任务标题
          <input
            value={model.context.title}
            readOnly={model.phase === "running"}
            maxLength={100}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <button onClick={() => update("title", "资料整理任务")}>
          填入示例标题
        </button>
        <button onClick={() => update("title", "")}>清空任务标题</button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={model.context.consent}
            onChange={(e) => update("consent", e.target.checked)}
          />
          已核对任务说明
        </label>
        <Choices
          label="下一次本地结果"
          values={[
            ["DONE", "成功事件 DONE"],
            ["FAIL", "失败事件 FAIL"],
          ]}
          value={model.context.expected}
          onChange={(v) => update("expected", v)}
        />
        <button ref={inspector} onClick={inspect}>
          读取当前状态与可用事件
        </button>
        <button
          ref={first}
          disabled={!model.queue.length}
          onClick={() => deliver(false)}
        >
          投递最早模拟结果（{model.queue.length}）
        </button>
        <button
          ref={last}
          disabled={!model.queue.length}
          onClick={() => deliver(true)}
        >
          投递最新模拟结果（{model.queue.length}）
        </button>
        <button onClick={clear}>新建空白本地实验</button>
      </div>
      <div
        className="machine-current"
        data-testid="machine-state"
        data-phase={model.phase}
        data-attempt={model.active}
      >
        <strong>
          当前业务状态：{stateNames[model.phase]} · {model.phase}
        </strong>
        <span>
          当前尝试：{model.active ? `#${model.active}` : "无"}；已分配{" "}
          {model.sequence} 次；待投递 {model.queue.length} 个
        </span>
      </div>
      <p className="machine-notice">
        教学事件按钮故意保持可尝试。允许、守卫不满足或状态不匹配都会解释；不是允许随便跳节点。下一次结果在开始/重试时固定，之后改选只影响未来尝试。
      </p>
      <div className="machine-events" aria-label="可尝试的状态机事件">
        {Object.entries(eventNames).map(([type, label]) => {
          const d = assess(model, { type, attempt: model.active });
          return (
            <button
              key={type}
              data-event={type}
              data-allowed={String(d.ok)}
              onClick={() => send({ type, attempt: ref.current.active })}
            >
              <strong>
                {type} · {label}
              </strong>
              <span>
                {d.ok
                  ? "✓ 当前允许"
                  : `○ ${d.code === "state" ? "当前不允许" : "守卫未满足"}`}
              </span>
            </button>
          );
        })}
      </div>
      <p role="status" data-testid="machine-feedback">
        {message}
      </p>
      <p data-testid="machine-inspection">
        {inspection || "可随时读取图与实际状态的一致性。"}
      </p>
      <div className="machine-columns">
        <section className="machine-panel">
          <h3>状态图 · 与转换表同源</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            显示全部转换（默认只画当前出边与上次转换）
          </label>
          <StateGraph model={model} all={showAll} />
          <p>
            ●
            当前节点唯一；紫色为当前允许，橙色为守卫阻止，灰色为其他状态出边。上次已接受转换使用加粗线；无必需动效。
          </p>
        </section>
        <section className="machine-panel">
          <h3>正交数据 · 可并存，不替代 phase</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={model.context.pinned}
              onChange={(e) => update("pinned", e.target.checked)}
            />
            标记重要任务
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={model.context.details}
              onChange={(e) => update("details", e.target.checked)}
            />
            展开任务详情
          </label>
          <div
            data-testid="orthogonal-data"
            data-pinned={String(model.context.pinned)}
            data-details={String(model.context.details)}
          >
            <p>
              {model.context.pinned ? "★ 已标记重要" : "☆ 普通任务"}；
              {model.context.details ? "详情展开" : "详情收起"}；phase 仍为{" "}
              {model.phase}。
            </p>
            {model.context.details && (
              <p>
                标题：{model.context.title || "（尚未填写）"}。确认值：
                {model.context.consent ? "已确认" : "未确认"}
                。两个标记可同时为真，互斥业务阶段仍只激活一个。
              </p>
            )}
          </div>
          <Note>
            复杂的是转换约束、层级、并发和取消边界，不只是状态个数。简单开关可以只用
            State；需要更复杂约束时再评估 XState。Rive
            的状态机组织动画表现，不代替业务守卫或真实权限。本课未接入两者。
          </Note>
        </section>
      </div>
      <details className="machine-rules" open>
        <summary>完整允许转换表 · 未列出的组合一律禁止</summary>
        <p className="micro">
          窄屏可横向滚动表格；上方按钮与文字状态可直接完成全部任务。
        </p>
        <div
          className="machine-table-wrap"
          role="region"
          aria-label="完整转换表，可横向滚动"
          tabIndex={0}
        >
          <table>
            <caption>
              6 个互斥业务状态 · 8 种事件 · {rules.length} 条允许规则
            </caption>
            <thead>
              <tr>
                <th>原状态</th>
                <th>事件</th>
                <th>守卫</th>
                <th>目标</th>
                <th>当前判断</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const current = r.from === model.phase,
                  d = current
                    ? assess(model, { type: r.event, attempt: model.active })
                    : null;
                return (
                  <tr
                    key={r.key}
                    data-rule={r.key}
                    data-current-from={String(current)}
                    data-allowed={String(!!d?.ok)}
                  >
                    <td>
                      {stateNames[r.from]}
                      <br />
                      <code>{r.from}</code>
                    </td>
                    <td>{r.event}</td>
                    <td>{guardName[r.guard]}</td>
                    <td>
                      {stateNames[r.to]}
                      <br />
                      <code>{r.to}</code>
                    </td>
                    <td>
                      {!current
                        ? "非当前状态"
                        : d.ok
                          ? "✓ 允许"
                          : `! ${d.reason}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
      <details className="machine-log">
        <summary>最近事件记录（最多8条）</summary>
        <ol>
          {history.map((h, i) => (
            <li key={i}>
              <strong>
                {h.ok ? "✓ 接受" : "! 阻止"} {h.from} + {h.event} → {h.to}
              </strong>
              <p>{h.reason}</p>
            </li>
          ))}
        </ol>
        {!history.length && <p>尚无事件。</p>}
      </details>
      <Note>
        {data.step === 0
          ? "填入标题 → REVIEW → 勾选确认 → START → 投递结果或点击 DONE，再读取状态。也可以随时尝试其他事件，不必按固定路径播放。"
          : data.step === 1
            ? "先空标题 REVIEW；填示例并 REVIEW 后，不勾确认尝试 START；再确认 START，重复 START，点击 FAIL，然后 RETRY 与 DONE。每次阻止都保留状态和说明。"
            : "先到 running，同时打开两个独立标记；CANCEL 后 RESET、REVIEW、重新确认并 START，先投递旧结果，核对仍在新 running，再投递当前结果。旧成功与旧失败都无权污染新尝试。"}
        <br />
        执行中标题/确认保持开始时的值，需完成或取消后编辑；两个独立标记仍可改。RESET
        只回草稿、清除确认，保留标题与独立标记及可隔离的旧队列；新建空白实验才全部清空。换站、离课、刷新或重置清空会话，学习进度单独保存。图不承载必需操作。
      </Note>
    </div>
  );
}
function MachineWorkbench({ data, patch }) {
  return data.step < 3 ? (
    <MachineLab key={data.step} data={data} patch={patch} />
  ) : null;
}

function MachineReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十六节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课使用普通 JavaScript 转换表与 React，不调用
          XState、Rive、网络、机器人或自动任务计时器。图、事件表与实际转换共用同一份规则和守卫判断。业务
          phase 是单一互斥值，标题、确认和重要/详情标记是独立数据；这里没有实现
          XState 的并行状态节点。Stately 官方资料当前含 v6 alpha
          示例，本课只核对状态、事件、守卫等概念，不承诺其版本 API。Rive
          的视觉动画状态机与业务流程、权限及真实任务确认属于不同层；本课没有导入
          Rive 动画。图是辅助，全部操作有原生按钮与文字表，不依赖拖拽、hover
          或动画。后续章节开放状态以课程目录为准。
        </p>
        <div className="source-links">
          {machineSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonSixteen({ onStorageStatus }) {
  const [data, setData] = useState(readMachineProgress),
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
      localStorage.setItem(MACHINE_STORAGE, JSON.stringify(data));
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
  const [instanceEpoch, setInstanceEpoch] = useState(0);
  const tasks = [
    [
      [data.successSeen, "通过合法事件到达成功状态"],
      [data.inspected, "核对实际状态、状态图和当前事件表"],
    ],
    [
      [data.titleGuard, "空标题核对被守卫阻止"],
      [data.consentGuard, "未确认时执行被守卫阻止"],
      [data.illegalSeen, "尝试当前状态不允许的事件并读原因"],
      [data.duplicateSeen, "执行中重复开始，不创建第二个尝试"],
      [data.retrySuccess, "失败后重试并成功"],
    ],
    [
      [data.orthogonal, "执行中同时展开详情和标记重要，phase保持不变"],
      [data.cancelled, "取消当前执行尝试"],
      [data.lateIgnored, "投递被取消尝试的迟到事件，确认被忽略"],
      [data.recovered, "重新准备新任务并成功"],
    ],
    machineQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成状态机合同简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查状态、事件、守卫、允许/禁止转换与恢复验收",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = machineSteps[data.step];
  const go = (next) => {
    patch({ step: next });
    generation.current++;
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
      setNotice("第十六节已完成。" + nextLessonHint(15));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请在现有项目实现可解释的本地任务状态机。使用普通转换表或按约束复杂度选择 XState，不因状态数量多就强制引库；不要假称已经接入未使用的库、网络或机器人。

互斥状态：draft 草稿、review 待确认、running 执行中、error 失败、success 成功、cancelled 已取消。phase 只有一个枚举值，禁止加载与失败等互斥阶段同时存在。标题、确认勾选、重要标记与详情展开是独立数据；两个标记可同时为真，不据此扩张业务 phase。需要真正多区域并行时另定义各区域及跨区域事件政策。

事件与允许转换：draft + REVIEW → review；review + EDIT → draft；review + START → running；running + DONE → success；running + FAIL → error；error + RETRY → running；review/running/error + CANCEL → cancelled；success/cancelled + RESET → draft。其余组合禁止，并解释当前状态、事件及原因；不能靠任意赋值状态或播放固定路径伪装状态机。

守卫：REVIEW 要求标题非空；START/RETRY 要求标题非空且已确认，并满足本地结果队列容量。DONE/FAIL 只接受当前运行尝试的编号。守卫判断无副作用；失败保持 phase 与业务数据，告诉用户如何解除条件。每次开始或重试分配新编号，重复 START 在 running 被拒绝，不重复创建任务。

错误、取消与迟到结果：FAIL 保留标题及标记，允许重试；CANCEL 使当前尝试失效，旧结果可在教学队列手动投递，但不得覆盖取消或后续新尝试。RESET 回草稿并清除确认勾选，保留标题、重要标记与详情；旧队列仍隔离，容量满时可先处理旧结果。显式清空本地任务、换站、离课、刷新或重置学习进度则丢弃整个实验会话，不伪称服务器撤销。

图与操作：图、完整事件表、允许/禁止原因和实际转换读取同一份规则；当前图只有一个业务状态高亮，允许、守卫阻止、非当前出边有文字和符号区分。图可切换显示全部转换，但全部门槛使用原生按钮、文字状态与表格完成，不依赖拖图、hover 或识图。视觉动画状态机（例如 Rive）只负责表现层，不能代替业务守卫和真实权限校验；简单开关可以只用 State，复杂层级、并发、取消和跨实体约束再评估工具。

焦点与反馈：非法事件按钮在教学区保持可尝试并给出原因；生产界面可禁用但需可访问解释。结果按钮将被禁用前，仅当它当前持有焦点时转到可见的状态查询入口；外部已有焦点保持不动。状态反馈简短、离散，不自动逐帧播报，无必需动画，支持减少动态和纯触屏/键盘。输入提供示例并能真实编辑。

验收：遍历允许与禁止的状态/事件组合、标题与确认守卫失败、重复事件、错误重试、取消后旧成功和旧失败到达、旧结果与新运行尝试并存、两个正交标记并存。每步核对图、表与实际 phase，只出现一个当前业务状态；立即核对可见可操作焦点，不靠下一次 Tab 或重置补救。桌面及375px、axe、全键盘与零键盘触屏完成错题重试、编辑复制、复制失败回退、刷新及取消/确认重置，保留01–15进度。第17课仍未实现。`,
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
      localStorage.removeItem(MACHINE_STORAGE);
    } catch {}
    setData(machineInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十六节的进度、参数与草稿；前十五节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-sixteen">
      <div className="lesson-overline">
        <span className="pill">第十六节 · State Machine</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            State Machine<span className="title-period">.</span>
          </h1>
          <p>不是随便跳状态，而是先定义允许发生什么。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>16</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 读懂事件与状态
        </span>
        <span>
          <Icon type="check" size={16} /> 验证守卫与边界
        </span>
        <span>
          <Icon type="check" size={16} /> 表达允许与禁止
        </span>
      </div>
      <nav className="stepper" aria-label="第十六节学习步骤">
        {machineSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="machine-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            MACHINE LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="machine-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        <MachineWorkbench key={instanceEpoch} data={data} patch={patch} />
        {data.step === 3 && (
          <div className="quiz-grid">
            {machineQuestions.map((q, i) => {
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
              <h3>你的状态机合同简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成状态机草稿" : "生成状态机指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的状态机指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制状态机指令
                </button>
              </div>
              <label className="sr-only" htmlFor="machine-agent-draft">
                可编辑的 状态机 Agent 指令
              </label>
              <textarea
                id="machine-agent-draft"
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
                placeholder="生成后，补充 状态、事件、守卫和转换合同。"
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
                我已检查 状态、事件、守卫、允许/禁止转换与恢复验收。
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
                  ? "完成第十六节"
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
          重置第十六节进度
        </button>
      </div>
      <MachineReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="machine-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="machine-reset-title">重新开始第十六节？</h2>
        <p>仅清除第十六节的进度、实验参数和草稿；前十五节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十六节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十六节
          </button>
        </div>
      </dialog>
    </div>
  );
}
