import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createFlowSession,
  publicEvents,
  stateLabels,
} from "./tool-eleven-runtime";
import { recommendation } from "./tool-eleven-content";
const add = (a, v) => [...new Set([...a, v])];
const eventNames = {
  SUBMIT: "提交申请",
  CANCEL: "取消当前申请",
  RETRY: "重试申请",
  EDIT: "返回编辑",
  FINISH: "完成流程",
  TOGGLE_MARK: "切换关注标记",
  FAKE_COMPLETE: "尝试非法完成事件",
};
function SessionLab({ data, patch, sessionRef }) {
  const [s] = useState(() =>
      createFlowSession({
        minLength: data.minLength,
        cancelMode: data.cancelMode,
      }),
    ),
    [message, setMessage] = useState(""),
    [snapshot, setSnapshot] = useState(null),
    latest = useRef({ data, patch });
  latest.current = { data, patch };
  const mark = useRef((...keys) => {
    if (!s.alive) return;
    const { data, patch } = latest.current,
      flags = Object.fromEntries(
        keys.filter((k) => !data[k]).map((k) => [k, true]),
      );
    if (Object.keys(flags).length) patch(flags);
  }).current;
  useEffect(() => {
    sessionRef.current = s;
    s.start();
    return () => {
      s.destroy();
      if (sessionRef.current === s) sessionRef.current = null;
    };
  }, [s, sessionRef]);
  useSyncExternalStore(s.subscribe, s.getRevision, s.getRevision);
  const view = s.inspect(),
    snap = view.snapshot,
    c = snap.context;
  useEffect(() => {
    if (!s.alive) return;
    if (snap.value === "failure") mark("failureSeen");
    if (snap.value === "reserved" && s.hadRetry) mark("retrySeen");
    if (snap.status === "done" && snap.value === "completed")
      mark("completedSeen");
  }, [s, snap.value, snap.status, c.result, mark]);
  const send = (event) => {
    const before = s.inspect(),
      r = s.send(event);
    setMessage(r.message);
    if (r.guardBlocked) mark("guardSeen");
    if (!r.allowed && before.snapshot.status === "active" && !r.guardBlocked)
      mark("illegalSeen");
    if (event.type === "RETRY" && r.allowed) s.hadRetry = true;
    if (
      event.type === "CANCEL" &&
      r.allowed &&
      before.snapshot.value === "pending"
    )
      mark("canceledSeen");
    if (
      event.type === "TOGGLE_MARK" &&
      r.allowed &&
      before.snapshot.value === "pending" &&
      s.inspect().service.calls === before.service.calls
    )
      mark("contextSeen");
  };
  const deliver = (id, outcome) => {
    const before = s.inspect(),
      old = before.service.records.find((r) => r.id === id),
      r = s.api.deliver(id, outcome);
    setMessage(r.message);
    if (r.late)
      queueMicrotask(() => {
        if (!s.alive) return;
        const after = s.inspect();
        if (
          after.snapshot.value === before.snapshot.value &&
          after.snapshot.context.attempt === before.snapshot.context.attempt
        ) {
          mark("lateSeen");
          if (old?.status === "detached") mark("ignoreSeen");
        }
      });
  };
  const next = (outcome) => {
    const r = view.service.records.find((r) => r.status === "pending");
    if (r) deliver(r.id, outcome);
    else setMessage("没有当前待处理结果；不会伪造完成。");
  };
  return (
    <div
      className="tool11-lab"
      data-started={String(view.started)}
      data-view={JSON.stringify(view)}
      data-phase={snap.value}
      data-actor-status={snap.status}
    >
      <div className="tool11-runtime">
        <strong>真实XState 5.33.3 · machine / actor / invoke</strong>
        <p>
          预约申请是本地模拟。React仅订阅，不手写setPhase冒充状态机；未运行真实预约接口、Rive或Stately
          Studio。Promise actor通过输入/输出工作，不接收这里的普通事件。
        </p>
      </div>
      <section className="tool11-result" aria-labelledby="tool11-flow-title">
        <h3 id="tool11-flow-title">
          {stateLabels[snap.value]} · {snap.value}
        </h3>
        <p>
          真实actor.status：<strong>{snap.status}</strong>；试次 {c.attempt}
          ；关注标记 {c.marked ? "已标记" : "未标记"}
        </p>
        {snap.status === "stopped" && (
          <p>
            actor已停止，阶段只是停止前的快照，不代表流程仍在继续或已经成功。重建才能再次运行。
          </p>
        )}
        {snap.status === "done" && (
          <p>
            真实top-level final已完成，后续事件不再运行；需要新流程时重建actor。
          </p>
        )}
        {c.error && (
          <p className="tool11-error" role="status">
            {c.error}
          </p>
        )}
        {c.result && (
          <p className="tool11-receipt">
            本地演示回执 {c.result.receipt} · 试次{c.result.attempt} ·{" "}
            {c.result.title}（不是实际预约凭证）
          </p>
        )}
        <p>
          提交标题快照：{c.sentTitle || "尚未提交"}
          。关注标记仅是context数据，不改变请求标题，也不重启invoke。
        </p>
      </section>
      <div className="tool11-controls">
        <label htmlFor="tool11-title">
          演练标题（仅draft可编辑，勿填私人信息）
        </label>
        <input
          id="tool11-title"
          value={c.title}
          maxLength={80}
          readOnly={!snap.canEdit}
          onChange={(e) => send({ type: "SET_TITLE", value: e.target.value })}
        />
        <button
          onClick={() => send({ type: "SET_TITLE", value: "社团投影仪预约" })}
        >
          填入申请标题示例
        </button>
        <button
          aria-pressed={c.confirmed}
          onClick={() => send({ type: "TOGGLE_CONFIRM" })}
        >
          切换业务确认
        </button>
        <p>
          当前guard：标题至少{c.minLength}字且业务确认开启；确认状态{" "}
          {c.confirmed ? "已确认" : "未确认"}
          。输入只在draft编辑，其他阶段请取消或返回编辑。
        </p>
      </div>
      <div className="tool11-buttons">
        {publicEvents.map((type) => (
          <button
            key={type}
            aria-pressed={type === "TOGGLE_MARK" ? c.marked : undefined}
            onClick={() => send({ type })}
          >
            {eventNames[type]}
          </button>
        ))}
        <button
          onClick={() => {
            s.stop();
            setMessage(
              "已实际actor.stop并解除订阅；不等于业务成功或服务器撤回。",
            );
            if (s.inspect().snapshot.status === "stopped") mark("stoppedSeen");
          }}
        >
          停止本例actor
        </button>
      </div>
      <p className="tool11-feedback" role="status">
        {message ||
          "按钮始终可聚焦；非法事件会真实发给active actor并被机器忽略，非active入口则先阻止发送。"}
      </p>
      <div className="tool11-panel">
        <h3>由实际machine配置投影的只读状态图</h3>
        <p>
          卡片显示当前快照；连接关系来自下表。图仅辅助，不是已验证业务正确性的证明，也不是固定播放路径。
        </p>
        <ol className="tool11-graph">
          {view.states.map((state) => (
            <li
              key={state}
              data-state-node={state}
              data-current={String(state === snap.value)}
              className={state === snap.value ? "current" : ""}
            >
              <strong>{stateLabels[state]}</strong>
              <span>{state}</span>
              <small>
                {state === snap.value
                  ? snap.status === "stopped"
                    ? "停止前值"
                    : `当前 · ${snap.status}`
                  : "可探索节点"}
              </small>
              <ul>
                {view.transitions
                  .filter((t) => t.from === state && t.target !== state)
                  .map((t) => (
                    <li key={t.event}>
                      {t.event} → {stateLabels[t.target]}
                      {t.guard ? ` · ${t.guard}` : ""}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
        <table className="tool11-transitions">
          <caption>
            真实machine配置的转换表 · 全局TOGGLE_MARK仅assign context
          </caption>
          <thead>
            <tr>
              <th scope="col">来源/事件</th>
              <th scope="col">去向/guard</th>
            </tr>
          </thead>
          <tbody>
            {view.transitions.map((t) => (
              <tr key={t.from + t.event}>
                <td>
                  {t.from} / {t.event}
                  <br />
                  {t.source}
                </td>
                <td>
                  {t.target} / {t.guard ?? "无guard"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="tool11-can">
          <caption>当前可执行 = actor active 且真实snapshot.can(event)</caption>
          <thead>
            <tr>
              <th scope="col">公开事件</th>
              <th scope="col">can / 当前可执行</th>
            </tr>
          </thead>
          <tbody>
            {publicEvents.map((type) => (
              <tr key={type} data-event-can={type}>
                <th scope="row">{type}</th>
                <td>
                  {String(snap.rawCan[type])} /{" "}
                  {snap.can[type] ? "允许" : "不允许"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          can是候选转换判断，不是权限或运行保证；final/stop后仍要检查actor.status。guard保持纯同步，异步工作在invoke中运行。
        </p>
      </div>
      <div className="tool11-panel">
        <h3>本地Promise接口 · 手动结算</h3>
        <p>
          配合取消会拒绝Promise；忽略取消模式保留detached工作，停止的Promise
          actor仍隔离旧输出。所有模式只模拟本地接口，不承诺撤销真实已提交业务。最多8个未结算工作、24条记录；序号不是网络时间。
        </p>
        <div className="tool11-buttons">
          <button onClick={() => next("success")}>投递当前结果成功</button>
          <button onClick={() => next("error")}>投递当前结果失败</button>
          <button onClick={() => next("mismatch")}>投递当前结果试次错误</button>
          <button
            onClick={() => {
              const r = view.service.records.find((r) =>
                ["detached", "canceled"].includes(r.status),
              );
              if (r) deliver(r.id, "success");
              else setMessage("没有已取消旧结果，请先取消一次。");
            }}
          >
            投递最早旧结果
          </button>
        </div>
        <p>
          真实接口调用 {view.service.calls} 次；未结算副作用{" "}
          {view.service.pending}；当前invoke子actor{" "}
          {Object.keys(snap.children).join("、") || "无"}
        </p>
        <ol className="tool11-records">
          {view.service.records.map((r) => (
            <li
              key={r.id}
              data-request-id={r.id}
              data-request-status={r.status}
            >
              #{r.id} · 试次{r.attempt} · {r.title} · 接口{r.status} / Promise
              actor {r.childStatus}
              {r.wasDetached ? " · 非配合接口旧输出已结算" : ""}
              {r.lateDelivered ? " · 已投递已取消旧结果" : ""}
              {r.error ? ` · ${r.error}` : ""}
              <div className="tool11-buttons">
                <button onClick={() => deliver(r.id, "success")}>
                  投递#{r.id}成功
                </button>
                <button onClick={() => deliver(r.id, "error")}>
                  投递#{r.id}失败
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="tool11-panel">
        <h3>实际事件日志</h3>
        <p>
          公开按钮记录真实actor.send前后快照；xstate.done/error行来自runtime
          inspection的invoke完成事件，不是手动发成功标签。最多40条历史。
        </p>
        <ol className="tool11-events">
          {view.events.map((e) => (
            <li key={e.id}>
              #{e.id} {e.event} · {e.origin} · {e.before ?? "—"} →{" "}
              {e.after ?? "—"}
              {typeof e.allowed === "boolean"
                ? ` · ${e.allowed ? "允许/已处理" : "未执行"}`
                : ""}
              {e.reason ? ` · ${e.reason}` : ""}
            </li>
          ))}
        </ol>
        <button
          onClick={() => {
            setSnapshot(s.inspect());
            mark("inspectedSeen");
          }}
        >
          读取真实machine与actor快照
        </button>
        {snapshot && (
          <pre
            className="tool11-snapshot"
            data-machine-snapshot={JSON.stringify(snapshot)}
          >
            点击时快照（非实时监控）{JSON.stringify(snapshot, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
export default function Tool11Workbench({ data, patch }) {
  const [ui, setUI] = useState(false),
    [epoch, setEpoch] = useState(0),
    sessionRef = useRef(null);
  const change = (x) => {
    sessionRef.current?.destroy();
    patch({
      ...x,
      reviewed: false,
      draftStale: data.generated || data.draftStale,
    });
  };
  if (data.step === 0)
    return (
      <div className="tool11-lab">
        <div className="tool11-runtime">
          <strong>业务调度工具，不是动画库或自动业务证明</strong>
          <p>
            第16节用普通转换表讲原理；本节真实运行XState，观察actor、invoke与生命周期的工具价值。简单流程无需强制迁库，Rive视觉状态机是另一层职责。
          </p>
        </div>
        <div className="tool11-panel">
          <h3>按维护约束选择</h3>
          <div className="tool11-buttons">
            {[
              ["simple", "简单开关需求"],
              ["workflow", "受约束异步流程"],
            ].map(([v, label]) => (
              <button
                key={v}
                aria-pressed={data.scenario === v}
                onClick={() =>
                  patch({
                    scenario: v,
                    scenariosSeen: add(data.scenariosSeen, v),
                    reviewed: false,
                    draftStale: data.generated || data.draftStale,
                  })
                }
              >
                {label}
              </button>
            ))}
            <button
              aria-expanded={ui}
              onClick={() => {
                setUI((v) => !v);
                patch({ uiSeen: true });
              }}
            >
              切换本地说明面板
            </button>
          </div>
          {ui && (
            <p>
              面板展开只用React state；不必装XState。后两站才运行真正machine
              actor。
            </p>
          )}
          <p className="tool11-recommendation">{recommendation(data)}</p>
          <button onClick={() => patch({ comparedSeen: true })}>
            记录复杂性与选型条件
          </button>
        </div>
        <div className="tool11-panel">
          <h3>工具交接多出来的责任</h3>
          <ul>
            <li>
              把允许/禁止事件、guard和context写成可执行合同，而非贴一张图。
            </li>
            <li>明确副作用输入/输出、取消合作程度、actor与订阅的所有者。</li>
            <li>用真实事件与快照测试业务例外，不以状态数量或库名评分。</li>
            <li>
              官方文档当前含v6
              alpha；本例固定已安装稳定版5.33.3核心，React原生订阅，未使用@xstate/react。
            </li>
          </ul>
        </div>
      </div>
    );
  return (
    <>
      <div className="tool11-controls tool11-config">
        <label htmlFor="tool11-minLength">
          guard标题最短字数（改规则会重建actor）
        </label>
        <select
          id="tool11-minLength"
          value={data.minLength}
          onChange={(e) => change({ minLength: Number(e.target.value) })}
        >
          <option value="2">2字 · 演练规则</option>
          <option value="6">6字 · 演练规则</option>
        </select>
        <label htmlFor="tool11-cancelMode">
          接口取消合同（更换会重建actor）
        </label>
        <select
          id="tool11-cancelMode"
          value={data.cancelMode}
          onChange={(e) => change({ cancelMode: e.target.value })}
        >
          <option value="cooperate">配合AbortSignal</option>
          <option value="ignore">模拟接口忽略取消</option>
        </select>
      </div>
      <button
        className="tool11-session-reset"
        onClick={() => {
          const old = sessionRef.current;
          old?.destroy();
          setEpoch((v) => v + 1);
          if (old && !old.alive) patch({ cleanupSeen: true });
        }}
      >
        重建演练actor
      </button>
      <SessionLab
        key={`${epoch}-${data.minLength}-${data.cancelMode}`}
        data={data}
        patch={patch}
        sessionRef={sessionRef}
      />
    </>
  );
}
