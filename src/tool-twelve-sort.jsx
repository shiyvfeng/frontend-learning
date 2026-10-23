import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CARD_IDS,
  createSortSession,
  metrics,
  runtimeState,
} from "./tool-twelve-model";
export default function SortLab({ data, patch }) {
  const [s] = useState(createSortSession),
    [source, setSource] = useState("A"),
    [target, setTarget] = useState("C"),
    [snapshot, setSnapshot] = useState(null),
    [message, setMessage] = useState(""),
    root = useRef(null),
    board = useRef(null),
    unbind = useRef(() => {}),
    focusRevision = useRef(0),
    restore = useRef(null),
    latest = useRef({ data, patch });
  latest.current = { data, patch };
  const mark = useRef((...keys) => {
    if (!s.alive) return;
    const { data, patch } = latest.current,
      x = Object.fromEntries(
        keys.filter((k) => !data[k]).map((k) => [k, true]),
      );
    if (Object.keys(x).length) patch(x);
  }).current;
  useSyncExternalStore(s.subscribe, s.getRevision, s.getRevision);
  const view = s.inspect(),
    tx = view.transaction;
  const cancel = (reason, token = s.inspect().transaction?.token) => {
    const current = s.inspect().transaction;
    if (!current || current.token !== token) return;
    unbind.current();
    s.cancel(reason, token);
    setMessage(`已取消：${reason}；真实顺序保持。`);
    mark("canceledSeen");
  };
  const commit = (token) => {
    const t = s.inspect().transaction;
    if (!t || t.token !== token) return;
    const handle = board.current?.querySelector(`[data-sort-handle="${t.id}"]`);
    if (document.activeElement === handle)
      restore.current = { element: handle, revision: focusRevision.current };
    unbind.current();
    const changed = s.commit(token);
    setMessage(
      changed
        ? `已提交${t.id}到${t.target}原序位，其他项顺移；ID不变。`
        : "原位置提交，顺序未变。",
    );
    if (!changed) restore.current = null;
    if (changed) {
      mark("movedSeen");
      if (t.mode !== "pointer") mark("alternativeSeen");
    }
  };
  useLayoutEffect(() => {
    const r = restore.current;
    restore.current = null;
    if (!r || !r.element.isConnected) return;
    const a = document.activeElement;
    if (
      a !== r.element &&
      (a !== document.body || focusRevision.current !== r.revision)
    )
      return;
    if (a !== r.element) r.element.focus({ preventScroll: true });
    const b = r.element.getBoundingClientRect();
    if (b.top < 0 || b.bottom > innerHeight)
      r.element.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [view.order.join("|")]);
  useEffect(() => {
    s.start();
    const focus = (e) => {
      focusRevision.current++;
      const t = s.inspect().transaction;
      if (!t) return;
      const handle = board.current?.querySelector(
        `[data-sort-handle="${t.id}"]`,
      );
      if (
        t.mode === "buttons"
          ? !root.current?.contains(e.target)
          : e.target !== handle
      )
        cancel("焦点已移到其他操作", t.token);
    };
    document.addEventListener("focusin", focus);
    metrics.listeners++;
    return () => {
      restore.current = null;
      unbind.current();
      document.removeEventListener("focusin", focus);
      metrics.listeners--;
      s.destroy();
    };
  }, [s]);
  const bind = (token, handle, startEvent) => {
    unbind.current();
    const t = s.inspect().transaction;
    if (!t || t.token !== token) return;
    let activated = t.mode !== "pointer";
    const valid = () => s.alive && s.inspect().transaction?.token === token,
      off = [];
    const add = (el, name, fn, options) => {
      el.addEventListener(name, fn, options);
      metrics.listeners++;
      off.push(() => {
        el.removeEventListener(name, fn, options);
        metrics.listeners--;
      });
    };
    const hit = (e) => {
      const node = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest("[data-sort-id]");
      return node && board.current?.contains(node) ? node.dataset.sortId : null;
    };
    if (t.mode === "pointer") {
      add(
        window,
        "pointermove",
        (e) => {
          if (!valid() || e.pointerId !== t.pointerId) return;
          if (!handle.hasPointerCapture(t.pointerId)) {
            cancel("指针捕获已失效", token);
            return;
          }
          if (!e.buttons) {
            cancel("主指针已结束", token);
            return;
          }
          if (
            Math.hypot(
              e.clientX - startEvent.clientX,
              e.clientY - startEvent.clientY,
            ) >= 6
          )
            activated = true;
          if (activated) {
            const id = hit(e);
            if (id) s.preview(id, token);
          }
        },
        true,
      );
      add(
        window,
        "pointerup",
        (e) => {
          if (!valid() || e.pointerId !== t.pointerId) return;
          const id = hit(e);
          if (!id) {
            cancel("在允许列表之外放下", token);
            return;
          }
          if (activated) s.preview(id, token);
          commit(token);
        },
        true,
      );
      add(
        window,
        "pointercancel",
        (e) => {
          if (valid() && e.pointerId === t.pointerId)
            cancel("pointercancel", token);
        },
        true,
      );
      add(handle, "lostpointercapture", () => {
        if (valid() && !handle.hasPointerCapture(t.pointerId))
          cancel("指针捕获丢失", token);
      });
    }
    add(
      window,
      "keydown",
      (e) => {
        if (!valid()) return;
        if (e.key === "Escape") {
          e.preventDefault();
          cancel("Escape", token);
        } else if (e.key === "Tab" && t.mode !== "buttons")
          cancel("Tab离开把手", token);
      },
      true,
    );
    add(window, "blur", () => {
      if (valid()) cancel("窗口失焦", token);
    });
    add(window, "resize", () => {
      if (valid() && t.mode === "pointer")
        cancel("尺寸变化，重新确认目标", token);
    });
    const geometry = board.current?.getBoundingClientRect();
    add(
      window,
      "scroll",
      () => {
        const now = board.current?.getBoundingClientRect();
        if (
          valid() &&
          t.mode === "pointer" &&
          now &&
          geometry &&
          (Math.abs(now.top - geometry.top) > 0.5 ||
            Math.abs(now.left - geometry.left) > 0.5)
        )
          cancel("滚动改变位置，重新开始", token);
      },
      true,
    );
    add(document, "visibilitychange", () => {
      if (valid() && document.hidden) cancel("页面隐藏", token);
    });
    let closed = false;
    unbind.current = () => {
      if (closed) return;
      closed = true;
      for (const f of off) f();
      if (t.mode === "pointer" && handle?.hasPointerCapture(t.pointerId))
        try {
          handle.releasePointerCapture(t.pointerId);
        } catch {}
      unbind.current = () => {};
    };
    if (t.mode === "pointer")
      try {
        handle.setPointerCapture(t.pointerId);
      } catch {
        cancel("无法取得指针捕获", token);
      }
  };
  const start = (id, mode, e) => {
    if (s.inspect().transaction) {
      setMessage("已有移动预览；先提交或取消，不叠加事务。");
      return;
    }
    const token = s.begin(id, mode, e?.pointerId ?? null);
    if (!token) return;
    bind(token, e?.currentTarget ?? null, e);
    setMessage(`预览${id}，尚未改变真实顺序。`);
    if (mode === "buttons") s.preview(target, token);
  };
  const key = (e, id) => {
    let t = s.inspect().transaction;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!t) start(id, "keyboard", e);
      else if (t.mode === "keyboard" && t.id === id) commit(t.token);
      return;
    }
    if (
      t?.mode === "keyboard" &&
      t.id === id &&
      ["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === "Home" || e.key === "End")
        s.preview(view.order[e.key === "Home" ? 0 : 5], t.token);
      else s.previewDelta(e.key === "ArrowUp" ? -1 : 1, t.token);
    }
  };
  const changeSource = (id) => {
    cancel("改变源对象");
    setSource(id);
  };
  const readSnapshot = () => {
    const nodes = [...board.current.querySelectorAll("[data-sort-id]")].map(
        (e) => ({
          id: e.dataset.sortId,
          top: e.getBoundingClientRect().top,
          height: e.getBoundingClientRect().height,
        }),
      ),
      actual = s.inspect(),
      v = { ...actual, dom: nodes, runtime: runtimeState() };
    setSnapshot(v);
    if (nodes.map((n) => n.id).join("|") === actual.order.join("|"))
      mark("sortInspected");
  };
  return (
    <div
      ref={root}
      className="tool12-sort"
      data-sort-view={JSON.stringify(view)}
      data-sort-order={view.order.join(",")}
      data-sort-phase={tx?.mode || "idle"}
    >
      <div className="tool12-runtime">
        <strong>原创原生排序实验 · 非dnd-kit runtime</strong>
        <p>
          只有6张卡，完整挂载。源插入目标原序位，其余项顺移。预览不改变实际顺序；未实现虚拟行拖拽、跨区碰撞或自动滚动。这些需求会增加维护成本，可作为评估dnd-kit的理由。
        </p>
      </div>
      <div className="tool12-controls">
        <label htmlFor="tool12-source">移动源对象</label>
        <select
          id="tool12-source"
          value={source}
          onChange={(e) => changeSource(e.target.value)}
        >
          {CARD_IDS.map((id) => (
            <option key={id} value={id}>
              对象{id}
            </option>
          ))}
        </select>
        <label htmlFor="tool12-target">目标原序位的对象</label>
        <select
          id="tool12-target"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            const t = s.inspect().transaction;
            if (t?.mode === "buttons") s.preview(e.target.value, t.token);
            else cancel("替代操作更换目标");
          }}
        >
          {view.order.map((id, i) => (
            <option key={id} value={id}>
              第{i + 1}位 · 对象{id}
            </option>
          ))}
        </select>
      </div>
      <div className="tool12-buttons">
        <button onClick={() => start(source, "buttons")}>
          开始按钮移动预览
        </button>
        <button
          onClick={() => {
            const t = s.inspect().transaction;
            if (t) commit(t.token);
            else setMessage("没有待提交的移动；不会伪造成功。");
          }}
        >
          提交当前移动
        </button>
        <button
          onClick={() => {
            if (s.inspect().transaction) cancel("用户明确取消");
            else setMessage("没有进行中的事务，顺序未变。");
          }}
        >
          取消当前移动
        </button>
        <button
          onClick={() => {
            cancel("替代移动前取消旧事务");
            const t = s.begin(source, "buttons");
            if (t) {
              s.preview(target, t);
              commit(t);
            }
          }}
        >
          按所选位置移动
        </button>
        <button
          onClick={() => {
            cancel("撤销操作");
            s.undo();
          }}
        >
          撤销上次排序
        </button>
        <button
          onClick={() => {
            cancel("恢复顺序");
            s.reset();
          }}
        >
          恢复初始卡片顺序
        </button>
      </div>
      <p className="tool12-feedback" role="status">
        {message ||
          "把手可拖动，或按Space/Enter开始、方向键改目标、Enter提交；Escape取消，Tab取消并离开。正文保留页面触摸滚动。"}
      </p>
      <p>
        当前真实顺序 {view.order.join(" → ")}；
        {tx
          ? `预览 ${tx.id} → ${tx.target}（${tx.mode}，代次${tx.token}），尚未提交`
          : "没有活动事务"}
        。
      </p>
      <ol ref={board} className="tool12-board" aria-label="独立六卡排序列表">
        {view.order.map((id, i) => (
          <li
            key={id}
            data-sort-id={id}
            className={`${tx?.id === id ? "source" : ""} ${tx?.target === id ? "target" : ""}`}
          >
            <button
              className="tool12-handle"
              data-sort-handle={id}
              aria-label={`移动对象${id}把手`}
              onPointerDown={(e) => {
                if (e.button === 0 && e.isPrimary) start(id, "pointer", e);
              }}
              onKeyDown={(e) => key(e, id)}
            >
              ⠿
            </button>
            <div>
              <strong>对象{id}</strong>
              <span>
                稳定业务ID：card-{id} · 当前第{i + 1}位
                {tx?.target === id ? " · 预览目标" : ""}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="tool12-panel">
        <h3>dnd-kit候选承担哪些机制？</h3>
        <p>
          当前官方新React路线以DragDropProvider、输入传感器和sortable机制组织拖放。旧@dnd-kit/core的DndContext不是本页实际运行的API。选库前核对已安装版本、激活距离/触摸手势、碰撞、取消与无障碍合同；库不会替项目保存业务顺序。
        </p>
        <button onClick={readSnapshot}>读取排序模型与DOM快照</button>
      </div>
      <ol className="tool12-events">
        {view.events.map((e) => (
          <li key={e.seq}>
            #{e.seq} {e.kind} · {e.id || ""} {e.target ? `→${e.target}` : ""}{" "}
            {e.reason || ""} {e.order ? `顺序 ${e.order.join("→")}` : ""}
          </li>
        ))}
      </ol>
      {snapshot && (
        <pre
          className="tool12-snapshot"
          data-sort-snapshot={JSON.stringify(snapshot)}
        >
          点击时真实快照{JSON.stringify(snapshot, null, 2)}
        </pre>
      )}
    </div>
  );
}
