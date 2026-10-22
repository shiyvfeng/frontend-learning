import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Tool05PlainBoard } from "./tool-five-card";
import { tool05Needs, tool05Scope } from "./tool-five-content";
const initialModel = () => ({
  order: ["a", "b", "c"],
  visible: ["a", "b"],
  notes: { a: "", b: "", c: "" },
  marked: { a: false, b: false, c: false },
  expanded: { a: false, b: false, c: false },
  stack: [],
});
export default function Tool05Workbench({ data, patch }) {
  const [model, setModel] = useState(initialModel),
    [Library, setLibrary] = useState(null),
    [status, setStatus] = useState("loading"),
    [message, setMessage] = useState(
      "没有自动循环。下面CSS按钮与卡片列表分别展示简单反馈和生命周期。",
    ),
    [samples, setSamples] = useState(null),
    [logs, setLogs] = useState([]),
    [sceneEpoch, setSceneEpoch] = useState(0),
    [cssCount, setCssCount] = useState(0),
    [policy, setPolicy] = useState(() => ({
      reduce:
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
        false,
      hidden: document.hidden,
    }));
  const scene = useRef(null),
    restoreButton = useRef(null),
    focusWitness = useRef(null),
    alive = useRef(true),
    requestGeneration = useRef(0),
    cycle = useRef(0),
    latestModel = useRef(model),
    latestPolicy = useRef(policy);
  latestModel.current = model;
  latestPolicy.current = policy;
  const capture = () => {
    const e = document.activeElement;
    if (!scene.current?.contains(e) || !e.dataset.control) {
      focusWitness.current = null;
      return;
    }
    focusWitness.current = {
      node: e,
      control: e.dataset.control,
      start: e.selectionStart,
      end: e.selectionEnd,
    };
  };
  useEffect(() => {
    alive.current = true;
    const token = ++requestGeneration.current;
    import("./tool-five-motion")
      .then((module) => {
        if (!alive.current || requestGeneration.current !== token) return;
        capture();
        cycle.current++;
        setLibrary(() => module.default);
        setStatus("ready");
      })
      .catch(() => {
        if (alive.current && requestGeneration.current === token)
          setStatus("error");
      });
    return () => {
      alive.current = false;
      requestGeneration.current++;
      cycle.current++;
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => {
      const next = { reduce: !!media?.matches, hidden: document.hidden },
        old = latestPolicy.current;
      if (next.reduce === old.reduce && next.hidden === old.hidden) return;
      capture();
      cycle.current++;
      latestPolicy.current = next;
      setPolicy(next);
    };
    media?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      media?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const staticView =
    policy.reduce || policy.hidden || data.playback === "static" || !Library;
  const rendererKey = `${sceneEpoch}-${policy.reduce}-${policy.hidden}-${data.playback === "static"}-${!!Library}`;
  useLayoutEffect(() => {
    const w = focusWitness.current;
    focusWitness.current = null;
    if (!w || !alive.current) return;
    const a = document.activeElement;
    if (a !== document.body && a !== w.node) return;
    const e = scene.current?.querySelector(`[data-control="${w.control}"]`);
    if (!e?.isConnected || e.closest("[inert]")) return;
    e.focus();
    if (
      typeof w.start === "number" &&
      typeof e.setSelectionRange === "function"
    )
      e.setSelectionRange(w.start, w.end);
    e.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [rendererKey]);
  const edit = (change) =>
    patch((old) => ({
      ...change,
      reviewed: false,
      draftStale: old.generated || old.draftStale,
      ...(change.need
        ? { needsSeen: [...new Set([...old.needsSeen, change.need])] }
        : {}),
    }));
  const playback = (value) => {
    if ((data.playback === "static") !== (value === "static")) {
      capture();
      cycle.current++;
    }
    edit({ playback: value });
    setMessage(
      "预设仅影响后续动作；切到静态立即停止本场景Motion。返回正常不会自动补播旧动作。",
    );
  };
  const focusBeforeRemoval = (id) => {
    const row = scene.current?.querySelector(`[data-item="${id}"]`),
      a = document.activeElement;
    if (row?.contains(a)) {
      const target = restoreButton.current;
      target?.focus();
      target?.scrollIntoView({ block: "center", behavior: "auto" });
    }
  };
  const remove = (id) => {
    if (!latestModel.current.visible.includes(id)) {
      setMessage("这张卡片已移除，不重复提交；可撤回最近移除或恢复全部。");
      return;
    }
    focusBeforeRemoval(id);
    setModel((old) => ({
      ...old,
      visible: old.visible.filter((v) => v !== id),
      stack: [...old.stack.filter((v) => v !== id), id].slice(-3),
    }));
    patch({ removedSeen: true });
    setMessage(
      `已把${id.toUpperCase()}移出可见模型；正常Motion会暂留退出DOM，静态立即移除。持焦项才移到稳定恢复入口。`,
    );
  };
  const undo = () => {
    const id = latestModel.current.stack.at(-1);
    if (!id) {
      setMessage("没有可撤回的移除；未改变最终状态。");
      return;
    }
    setModel((old) => ({
      ...old,
      visible: [...new Set([...old.visible, id])],
      stack: old.stack.filter((v) => v !== id),
    }));
    patch({ undoSeen: true });
    setMessage(
      `已恢复${id.toUpperCase()}的稳定ID与会话备注；Motion可在退出中反向，旧完成信号不决定业务删除。`,
    );
  };
  const add = () => {
    if (latestModel.current.visible.includes("c")) {
      setMessage("C已存在，不重复创建；保持唯一ID。");
      return;
    }
    setModel((old) => ({
      ...old,
      visible: [...old.visible, "c"],
      stack: old.stack.filter((v) => v !== "c"),
    }));
    patch({ addedSeen: true });
    setMessage("C已加入真实可见模型；正常模式由Motion进入，静态也能完整操作。");
  };
  const expand = (id) => {
    if (!latestModel.current.visible.includes(id)) {
      setMessage("所选卡片已移除，先恢复再展开。");
      return;
    }
    setModel((old) => ({
      ...old,
      expanded: { ...old.expanded, [id]: !old.expanded[id] },
    }));
    patch({ expandedSeen: true });
    setMessage(
      "卡片高度立即采用最终CSS布局，邻卡位置过渡；可立即再次收起，不等待动画。",
    );
  };
  const handlers = {
    onNote: (id, text) =>
      setModel((old) => ({ ...old, notes: { ...old.notes, [id]: text } })),
    onExpand: expand,
    onMark: (id) =>
      setModel((old) => ({
        ...old,
        marked: { ...old.marked, [id]: !old.marked[id] },
      })),
    onRemove: remove,
  };
  const ids = model.order.filter((id) => model.visible.includes(id));
  const inspect = () => {
    const root = scene.current,
      list = root?.querySelector(".tool05-list"),
      listTop = list?.getBoundingClientRect().top || 0;
    const rows = [...root.querySelectorAll("[data-item]")].map((e) => {
      const c = getComputedStyle(e),
        r = e.getBoundingClientRect();
      return {
        id: e.dataset.item,
        present: e.dataset.present,
        phase: e.dataset.phase,
        inert: e.inert,
        ariaHidden: e.getAttribute("aria-hidden"),
        opacity: Number(c.opacity),
        transform: c.transform,
        visualTop: Math.round((r.top - listTop) * 100) / 100,
        layoutTop: e.offsetTop,
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });
    setSamples({ renderer: list.dataset.renderer, visible: [...ids], rows });
    if (Library) patch({ runtimeSeen: true });
    patch({ measuredSeen: true });
    setMessage(
      "已读取当前实际DOM与computed样式；这是此刻快照，不是逐帧播报。退出DOM可能比可见模型暂时多，静态没有过渡帧。",
    );
  };
  const token = cycle.current;
  const event = (id, detail, intent) => {
    if (!alive.current || token !== cycle.current) return;
    const present = latestModel.current.visible.includes(id);
    if ((intent === "exit" && present) || (intent !== "exit" && !present))
      return;
    setLogs((old) => [...old.slice(-5), `${id.toUpperCase()}：${detail}`]);
  };
  const resetScene = () => {
    capture();
    cycle.current++;
    setSceneEpoch((n) => n + 1);
    setModel(initialModel());
    setSamples(null);
    setLogs([]);
    setCssCount(0);
    patch({ resetSeen: true });
    setMessage(
      "已恢复场景初始两卡并清空会话备注/标记；学习进度和草稿保留，不发送业务请求。",
    );
  };
  return (
    <div className="tool05-workbench">
      <p className="tool05-boundary">{tool05Scope}</p>
      <section className="tool05-panel" aria-label="按需求选择工具">
        <h3>按需求选，而不是按库名统一</h3>
        <div className="tool05-actions">
          {tool05Needs.map((n) => (
            <button
              key={n.id}
              aria-pressed={data.need === n.id}
              onClick={() => edit({ need: n.id })}
            >
              {n.label}
            </button>
          ))}
        </div>
        <p>{tool05Needs.find((n) => n.id === data.need).why}</p>
        <p>
          候选切换只改选型说明；下方正常场景始终是实际Motion。减少动态/静态对照使用同模型React内容，不伪装动画。
        </p>
        <div
          className="tool05-css-demo"
          data-static={String(policy.reduce || data.playback === "static")}
        >
          <button
            onClick={() => {
              setCssCount((n) => n + 1);
              patch({ cssSeen: true });
            }}
          >
            CSS颜色反馈 · 本地次数{cssCount}
          </button>
          <p>
            颜色/边框用CSS
            :hover、:active、:focus-visible；点击计数是React业务，无Motion参与这个按钮。触屏和键盘都有反馈，不要求hover。
          </p>
        </div>
      </section>
      <div className="tool05-runtime">
        <strong>
          {status === "ready"
            ? "Motion14.6.0模块已加载"
            : status === "loading"
              ? "真实Motion模块加载中，先保留静态内容"
              : "Motion模块加载失败，当前为静态回退"}
        </strong>
        <p>
          {staticView
            ? "当前使用同模型静态React列表：不播放位移/退出，仍可完成所有操作。"
            : "当前真实Motion：AnimatePresence/popLayout + layout=position + spring位置过渡。"}{" "}
          系统reduce：{policy.reduce ? "开启" : "关闭"}；页面隐藏：
          {policy.hidden ? "是" : "否"}。
        </p>
        {status === "error" && (
          <>
            <button onClick={() => patch({ fallbackAcknowledged: true })}>
              确认静态回退边界并继续
            </button>
            <button onClick={() => location.reload()}>
              重载页面重试Motion模块
            </button>
            <p>
              回退不算实际验证了Motion；重载会清空卡片会话，学习选择和草稿保留。浏览器失败缓存可能需要重载；不发送业务请求。
            </p>
          </>
        )}
      </div>
      <fieldset className="tool05-controls">
        <legend>可反复打断的卡片场景</legend>
        <label htmlFor="tool05-playback">后续动作的动画预设</label>
        <select
          id="tool05-playback"
          value={data.playback}
          onChange={(e) => playback(e.target.value)}
        >
          <option value="standard">迅速稳定</option>
          <option value="slow">慢速观察（非生产时长建议）</option>
          <option value="static">静态对照（即时最终布局）</option>
        </select>
        <label htmlFor="tool05-selected">操作对象（稳定ID）</label>
        <select
          id="tool05-selected"
          value={data.selected}
          onChange={(e) => edit({ selected: e.target.value })}
        >
          {["a", "b", "c"].map((id) => (
            <option key={id} value={id}>
              {id.toUpperCase()}卡片
              {model.visible.includes(id) ? " · 当前可见" : " · 已不在可见集合"}
            </option>
          ))}
        </select>
        <div className="tool05-actions">
          <button onClick={add}>加入C卡片</button>
          <button
            onClick={() => {
              setModel((old) => ({ ...old, order: [...old.order].reverse() }));
              patch({ reorderedSeen: true });
              setMessage(
                "DOM顺序立即反转；正常模式位置从当前画面向新布局过渡。可立即再反转。",
              );
            }}
          >
            反转卡片顺序
          </button>
          <button onClick={() => expand(data.selected)}>
            切换选中卡片说明
          </button>
          <button onClick={() => remove(data.selected)}>移除选中卡片</button>
          <button ref={restoreButton} onClick={undo}>
            撤回最近移除
          </button>
          <button
            onClick={() => {
              setModel((old) => ({
                ...old,
                visible: ["a", "b", "c"],
                stack: [],
              }));
              setMessage(
                "已显示全部三个稳定ID，保留本会话顺序、备注和标记；不自动移动焦点。",
              );
            }}
          >
            显示全部三张卡片
          </button>
          <button onClick={inspect}>读取运行时、DOM与当前样式</button>
          <button onClick={resetScene}>恢复场景初始状态（清空会话备注）</button>
        </div>
        <p>
          业务可见ID：{ids.map((id) => id.toUpperCase()).join("、") || "空集合"}
          ；顺序数据：{model.order.map((id) => id.toUpperCase()).join("→")}
          。备注/标记只在会话；缩放/宽度变化受真实CSS约束，无拖动门槛。
        </p>
      </fieldset>
      <p className="tool05-boundary">
        位置由Motion过渡，尺寸采用最终CSS布局。本例不使用layoutId、不平滑展开高度、不把文字/标记做布局scale。退出节点先inert、aria-hidden和禁止指针；不让透明按钮留在Tab序列。
      </p>
      <section
        ref={scene}
        className="tool05-scene"
        aria-label="卡片运行时场景"
        data-static={String(staticView)}
      >
        {staticView ? (
          <Tool05PlainBoard
            key={rendererKey}
            ids={ids}
            notes={model.notes}
            expanded={model.expanded}
            marked={model.marked}
            handlers={handlers}
          />
        ) : (
          <Library
            key={rendererKey}
            ids={ids}
            notes={model.notes}
            expanded={model.expanded}
            marked={model.marked}
            handlers={handlers}
            slow={data.playback === "slow"}
            onEvent={event}
          />
        )}{" "}
        {!ids.length && (
          <p className="tool05-empty">
            可见模型为空；可以撤回或显示全部。正常退出DOM可能暂留但不可交互。
          </p>
        )}
      </section>
      {samples && (
        <div className="tool05-readout" data-samples={JSON.stringify(samples)}>
          <h3>刚刚读取的真实快照</h3>
          <p>
            renderer：{samples.renderer}；模型{" "}
            {samples.visible.join("/") || "空"}；DOM节点 {samples.rows.length}。
          </p>
          <ul>
            {samples.rows.map((r) => (
              <li key={r.id}>
                {r.id.toUpperCase()} · present {r.present} · {r.phase} · inert{" "}
                {String(r.inert)} · opacity {r.opacity.toFixed(2)} · transform{" "}
                {r.transform} · 布局top {r.layoutTop}px / 视觉top {r.visualTop}
                px
              </li>
            ))}
          </ul>
          <p>
            快照不逐帧更新，也不拿回调文字冒充像素或动画运行证据。phase只描述进入/退出信号；ready不代表布局spring已停止，仍需结合实际transform与目标布局。
          </p>
        </div>
      )}
      {!!logs.length && (
        <details className="tool05-log">
          <summary>最近生命周期信号（最多6条，非逐帧播报）</summary>
          <ul>
            {logs.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <p>
            这是库回调记录；最终DOM由当前React模型和Presence共同管理，不用旧信号再删除业务对象。
          </p>
        </details>
      )}
      <p className="tool05-feedback" role="status">
        {message}
      </p>
    </div>
  );
}
