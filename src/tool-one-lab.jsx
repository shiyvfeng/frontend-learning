import React, { useEffect, useRef, useState } from "react";
import {
  tool01Models,
  tool01Cases,
  tool01Data,
  tool01Hosts,
  tool01Check,
  tool01Preparation,
  tool01Phases,
  tool01Scope,
} from "./tool-one-content";
const idle = () => ({ id: 0, status: "idle", index: 0, snapshot: null });
const simKeys = [
  "model",
  "scenario",
  "dataSource",
  "host",
  "interactive",
  "contentSide",
  "controlSide",
];
export default function Tool01Workbench({ data, patch }) {
  const [run, setRun] = useState(idle),
    [queue, setQueue] = useState([]),
    [outcome, setOutcome] = useState("success"),
    [feedback, setFeedback] = useState(
      "先选择模型并核对约束；所有阶段与结果均在本地手动推进。",
    ),
    [preview, setPreview] = useState(""),
    [counter, setCounter] = useState(0);
  const runRef = useRef(run),
    queueRef = useRef([]),
    nextId = useRef(0),
    resultRef = useRef("success"),
    mounted = useRef(true);
  const saveRun = (r) => {
      runRef.current = r;
      setRun(r);
    },
    saveQueue = (q) => {
      queueRef.current = q;
      setQueue(q);
    };
  const cancel = (
    message = "已取消本次模拟；保留前次可读描述，旧结果不能改写新尝试。",
  ) => {
    if (!["running", "waiting"].includes(runRef.current.status)) {
      setFeedback("当前没有进行中的模拟；不会产生新的成功结果。");
      return;
    }
    saveRun({ ...runRef.current, status: "cancelled" });
    patch({ cancelSeen: true });
    setFeedback(message);
  };
  useEffect(() => {
    mounted.current = true;
    const hide = () => {
      if (
        document.hidden &&
        ["running", "waiting"].includes(runRef.current.status)
      )
        cancel("页面隐藏，当前模拟已取消；返回后可检查旧结果或重新开始。");
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      runRef.current = idle();
      queueRef.current = [];
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const edit = (change) => {
    const active = ["running", "waiting"].includes(runRef.current.status);
    saveRun(idle());
    patch((old) => ({
      ...change,
      modelsSeen: change.model
        ? [...new Set([...old.modelsSeen, old.model, change.model])]
        : old.modelsSeen,
      reviewed: false,
      draftStale: old.generated || old.draftStale,
      ...(active ? { cancelSeen: true } : {}),
    }));
    setFeedback(
      active
        ? "需求/模型已变，进行中的模拟已取消；队列保留供验证迟到隔离。"
        : "实验参数已变；保留学习记录和草稿，不会自动运行服务器或迁移项目。",
    );
  };
  const check = () => {
    const c = tool01Check(data);
    patch({
      ...(c.valid ? { validSeen: true } : {}),
      ...(c.issues.some((i) => i.id !== "boundary")
        ? { constraintSeen: true }
        : {}),
      ...(c.issues.some((i) => i.id === "boundary")
        ? { boundaryErrorSeen: true }
        : {}),
    });
    setFeedback(
      c.valid
        ? "当前显式教学约束未冲突；不是已验证的生产方案，更不代表性能/SEO达标。"
        : c.issues.map((i) => i.text).join(" "),
    );
    return c.valid;
  };
  const titleFor = (s) =>
    s.dataSource === "request"
      ? "示例访客的个性化课程（虚构）"
      : s.dataSource === "api"
        ? "公开占位 / 后续API样例"
        : "公开教学课程";
  const enter = (base, index) => {
    if (!mounted.current) return;
    const phases = tool01Phases(base.snapshot),
      p = phases[index];
    if (!p) return;
    const next = {
      ...base,
      index,
      status: p.id === "ready" ? "ready" : p.wait ? "waiting" : "running",
    };
    saveRun(next);
    if (p.preview) {
      setPreview(titleFor(base.snapshot));
      if (base.snapshot.model !== "vite")
        patch({ htmlBeforeHydrationSeen: true });
    }
    if (p.wait) {
      const e = {
        id: base.id,
        index,
        outcome: resultRef.current,
        phase: p.title,
      };
      saveQueue([...queueRef.current, e]);
      setFeedback(
        `尝试${base.id}：${p.title}；封存${e.outcome === "success" ? "成功" : "失败"}教学结果，等待手动投递。`,
      );
    } else if (p.id === "ready") {
      if (base.snapshot.dataSource === "api")
        setPreview("API教学课程（本地结果已接受，未联网）");
      patch(
        base.snapshot.model === "vite"
          ? { csrComplete: true }
          : {
              nextComplete: true,
              ...(base.snapshot.model === "request" &&
              base.snapshot.dataSource === "request"
                ? { requestComplete: true }
                : {}),
            },
      );
      setFeedback(
        "模型阶段完成。它不是实际Next运行或生产验收；有交互需求时可体验下方真实React按钮。",
      );
    } else setFeedback(`逻辑阶段：${p.title}。${p.note}`);
  };
  const start = (retry = false) => {
    if (["running", "waiting"].includes(runRef.current.status)) {
      setFeedback(
        "当前模拟尚未结束，重复开始已阻止；可继续阶段、投递结果或取消。",
      );
      return;
    }
    if (retry && runRef.current.status !== "error") {
      setFeedback("当前不是失败状态；参数变化后请按新场景重新开始。");
      return;
    }
    if (!check()) return;
    if (queueRef.current.length >= 4) {
      setFeedback("教学队列最多4封，请先投递或清理旧结果；没有开始新尝试。");
      return;
    }
    if (retry) patch({ retrySeen: true });
    const snapshot = Object.fromEntries(simKeys.map((k) => [k, data[k]]));
    enter({ id: ++nextId.current, snapshot }, 0);
  };
  const advance = () => {
    const r = runRef.current;
    if (r.status === "waiting") {
      setFeedback(
        "当前等待封存的教学结果；请投递、取消或改变场景，不会自动联网完成。",
      );
      return;
    }
    if (r.status !== "running") {
      setFeedback(
        r.status === "ready"
          ? "模型已经完成；可体验React按钮，或开始另一次对照。"
          : "先开始模拟，失败可重试，取消后可重新开始。",
      );
      return;
    }
    enter(r, r.index + 1);
  };
  const deliver = () => {
    const [e, ...rest] = queueRef.current;
    if (!e) {
      setFeedback("教学队列为空，没有结果可投递。");
      return;
    }
    saveQueue(rest);
    const r = runRef.current;
    if (r.status !== "waiting" || r.id !== e.id || r.index !== e.index) {
      patch({ lateSeen: true });
      setFeedback(`忽略旧尝试${e.id}的结果；当前模型与真实React计数保持。`);
      return;
    }
    if (e.outcome === "error") {
      saveRun({ ...r, status: "error" });
      patch({ failureSeen: true });
      setFeedback(
        "教学依赖失败；保留前次可读描述并标明回退，可重试或重新选择。不代表本次成功，也未请求真实服务。",
      );
      return;
    }
    enter(r, r.index + 1);
  };
  const clean = () => {
    const r = runRef.current;
    const remaining = queueRef.current.filter(
      (e) => r.status === "waiting" && r.id === e.id && r.index === e.index,
    );
    const n = queueRef.current.length - remaining.length;
    saveQueue(remaining);
    setFeedback(`已清理${n}封旧结果，当前等待中的结果保留。`);
  };
  const current = run.snapshot || data,
    phases = tool01Phases(current),
    p = run.snapshot ? phases[run.index] : null,
    validation = tool01Check(data),
    next = data.model !== "vite";
  const actualClick = () => {
    if (runRef.current.status !== "ready") {
      setFeedback(
        "真实React按钮已收到操作，但教学阶段未就绪，未修改计数。可继续、重试或保留静态回退。",
      );
      return;
    }
    if (!current.interactive) {
      setFeedback(
        "当前模型没有用户交互需求；可切换为交互需求再体验，不会伪造一次业务成功。",
      );
      return;
    }
    setCounter((v) => v + 1);
    patch({ realSeen: true });
    setFeedback(
      "真实React本地计数已增加；它不证明Next已经水合或连接了服务器。",
    );
  };
  return (
    <div
      className="tool01-workbench"
      data-run={JSON.stringify(run)}
      data-queue={JSON.stringify(queue)}
      data-counter={counter}
    >
      <p className="tool01-boundary">
        <strong>真实React UI + 本地流程模拟 · 未运行Next服务器</strong>。
        {tool01Scope}
      </p>
      <div className="tool01-config">
        <fieldset>
          <legend>需求与部署条件</legend>
          <label htmlFor="tool01-scenario">教学场景</label>
          <select
            id="tool01-scenario"
            value={data.scenario}
            onChange={(e) => {
              const c = tool01Cases.find((c) => c.id === e.target.value);
              edit({
                scenario: c.id,
                dataSource: c.dataSource,
                interactive: c.interactive,
              });
            }}
          >
            {tool01Cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <p>
            切换场景应用其数据/交互需求，保留模型和部署选择；当前模拟会取消。
            {tool01Cases.find((c) => c.id === data.scenario)?.note}
          </p>
          <label htmlFor="tool01-data">数据时机</label>
          <select
            id="tool01-data"
            value={data.dataSource}
            onChange={(e) => edit({ dataSource: e.target.value })}
          >
            {tool01Data.map(([id, text]) => (
              <option key={id} value={id}>
                {text}
              </option>
            ))}
          </select>
          <label htmlFor="tool01-host">可用部署能力</label>
          <select
            id="tool01-host"
            value={data.host}
            onChange={(e) => edit({ host: e.target.value })}
          >
            {tool01Hosts.map(([id, text]) => (
              <option key={id} value={id}>
                {text}
              </option>
            ))}
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.interactive}
              onChange={(e) => edit({ interactive: e.target.checked })}
            />
            需要客户端事件与本地状态
          </label>
        </fieldset>
        <fieldset>
          <legend>代表性实现模型（不是全部架构）</legend>
          <p>
            React是UI库；Next基于React组合路由/渲染/服务能力。框架和独立服务也有其他合理方案，不要求迁移本站。
          </p>
          {tool01Models.map((m) => (
            <div className="tool01-choice" key={m.id}>
              <button
                aria-pressed={data.model === m.id}
                onClick={() => edit({ model: m.id })}
              >
                {m.label}
              </button>
              <p>{m.why}</p>
            </div>
          ))}
        </fieldset>
        {next && (
          <fieldset className="tool01-boundaries">
            <legend>Next模型中的自有模块边界</legend>
            <p>
              数据职责固定放在边界外的构建/服务器或业务服务；只传公开教学数据。以下模拟导入子树，不把传入的Server
              children一概变成Client。
            </p>
            <label htmlFor="tool01-content">正文模块</label>
            <select
              id="tool01-content"
              value={data.contentSide}
              onChange={(e) => edit({ contentSide: e.target.value })}
            >
              <option value="server">保留Server Component职责</option>
              <option value="client">加入Client依赖子树（较广边界）</option>
            </select>
            <label htmlFor="tool01-control">控件模块</label>
            <select
              id="tool01-control"
              value={data.controlSide}
              onChange={(e) => edit({ controlSide: e.target.value })}
            >
              <option value="client">Client边界：可处理事件/状态</option>
              <option value="server">Server职责：本身不处理用户事件</option>
            </select>
          </fieldset>
        )}
      </div>
      <div className="tool01-check">
        <button className="primary" onClick={check}>
          核对需求、部署与边界
        </button>
        <p>
          {validation.valid
            ? "当前显式约束未冲突；仍需实际项目与平台验证。"
            : validation.issues.map((i) => i.text).join(" ")}
        </p>
      </div>
      <div className="tool01-preparation">
        <h3>部署前准备 · 不在本次首访中执行</h3>
        <p>{tool01Preparation(current)}</p>
      </div>
      <div className="tool01-player">
        <h3>逻辑阶段图与文字表 · 非真实网络面板</h3>
        <p>
          可顺序推进或取消；真实框架可流式/并行、预取和缓存。阶段序号不是耗时。
        </p>
        <ol className="tool01-timeline">
          {phases.map((item, i) => (
            <li
              key={item.id}
              data-phase-id={item.id}
              aria-current={
                run.snapshot && i === run.index ? "step" : undefined
              }
            >
              <span className="tool01-lane">
                {
                  {
                    browser: "浏览器",
                    server: "服务器职责",
                    host: "主机 → 浏览器",
                  }[item.lane]
                }
              </span>
              <strong>
                {i + 1}. {item.title}
              </strong>
              <p>{item.note}</p>
              {run.snapshot && i === run.index && (
                <span className="tool01-now">当前：{run.status}</span>
              )}
            </li>
          ))}
        </ol>
        <div className="tool01-actions">
          <button onClick={() => start(false)}>开始模拟首访</button>
          <button onClick={advance}>继续下个模拟阶段</button>
          <button onClick={() => cancel()}>取消当前模拟</button>
          <button onClick={() => start(true)}>重试失败模拟</button>
        </div>
        <label htmlFor="tool01-result">下一次进入等待阶段时封存的结果</label>
        <select
          id="tool01-result"
          value={outcome}
          onChange={(e) => {
            resultRef.current = e.target.value;
            setOutcome(e.target.value);
          }}
        >
          <option value="success">教学成功</option>
          <option value="error">教学失败</option>
        </select>
        <p>
          进入等待时封存结果，之后修改只影响下一封；队列最多4封。当前阶段：
          {p?.title || "尚未开始"}。
        </p>
        <div className="tool01-actions">
          <button onClick={deliver}>投递最早模拟结果 ({queue.length})</button>
          <button onClick={clean}>清理旧模拟结果</button>
        </div>
        <ol className="tool01-queue" aria-label="封存模拟结果队列">
          {queue.map((e, i) => (
            <li key={`${e.id}-${e.index}`}>
              第{i + 1}封 · 尝试{e.id} · {e.phase} ·{" "}
              {e.outcome === "success" ? "教学成功" : "教学失败"}
            </li>
          ))}
        </ol>
        <div className="tool01-feedback" role="status">
          {feedback}
        </div>
      </div>
      <section className="tool01-output" aria-label="教学输出与真实React控件">
        <h3>教学输出描述（不是实际HTML/RSC报文）</h3>
        <p>{preview || "主体输出尚未到达；这段文字本身由本站React渲染。"}</p>
        {preview && run.status !== "ready" && (
          <p>保留的可读预览 / 回退 · 不是本次已成功</p>
        )}
        <p>
          模拟状态：{run.status}；本会话真实React计数：
          <strong data-real-count>{counter}</strong>
          。计数与服务器传输结果分开，离开实验站清空。
        </p>
        <button onClick={actualClick}>体验真实React控件</button>
        <p>
          在模型就绪且需要交互时才增加本地计数；按钮一直可操作并解释被守卫原因，不依赖hover或动画。
        </p>
      </section>
    </div>
  );
}
