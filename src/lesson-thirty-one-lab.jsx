import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  cards31,
  columns31,
  initialBoard31,
  locate31,
  moveCard31,
  size31,
} from "./lesson-thirty-one-content";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const model = (d) => ({ board: d.board, width: d.width, height: d.height });
export default function MoveWorkbench({ data, patch }) {
  const root = useRef(null),
    sizeArea = useRef(null),
    handles = useRef({}),
    current = useRef(data),
    active = useRef(null),
    alive = useRef(true),
    frame = useRef(0),
    latestPoint = useRef(null),
    history = useRef([]),
    focusRevision = useRef(0),
    restoreFocus = useRef(null),
    actions = useRef({});
  current.current = data;
  const [preview, setPreview] = useState(null),
    [available, setAvailable] = useState(480),
    [historyCount, setHistoryCount] = useState(0),
    [message, setMessage] = useState(
      "先选择卡片；把手可拖动或用键盘，外部按钮可不拖动完成。",
    ),
    [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const bounds = size31(data.width, data.height, available);
  const show = (s) => {
    active.current = s;
    setPreview(s ? { ...s } : null);
  };
  const release = (s) => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    latestPoint.current = null;
    if (s?.pointerId !== undefined) {
      try {
        if (s.origin.hasPointerCapture(s.pointerId))
          s.origin.releasePointerCapture(s.pointerId);
      } catch {}
    }
  };
  const cancel = (reason = "主动取消", learn = true) => {
    const s = active.current;
    if (!s) return false;
    active.current = null;
    release(s);
    setPreview(null);
    if (learn)
      patch(
        s.kind === "resize" ? { sizeCancelSeen: true } : { cancelSeen: true },
      );
    setMessage(`${reason}：预览已取消，已提交顺序与尺寸未改变。`);
    return true;
  };
  const commitModel = (next, text, flags = {}) => {
    // Persist a valid preferred size; a narrower container only clamps rendering.
    const preferred = size31(next.width, next.height);
    next = { ...next, width: preferred.width, height: preferred.height };
    const old = model(current.current);
    if (same(old, next)) {
      setMessage("已到边界或结果相同；没有新增提交，焦点保留。");
      return;
    }
    history.current = [...history.current.slice(-9), old];
    setHistoryCount(history.current.length);
    const a = document.activeElement,
      card = a?.closest?.("[data-card-id]");
    if (card && root.current?.contains(card))
      restoreFocus.current = {
        id: card.dataset.cardId,
        origin: a,
        revision: focusRevision.current,
      };
    current.current = { ...current.current, ...next, ...flags };
    patch({ ...next, ...flags });
    setMessage(text);
  };
  const commit = () => {
    const s = active.current;
    if (!s) {
      setMessage("当前没有预览；先拿起或点击预览入口。");
      return;
    }
    active.current = null;
    release(s);
    setPreview(null);
    const d = current.current;
    if (s.kind === "move") {
      if (!s.target) {
        patch({ invalidSeen: true, cancelSeen: true });
        setMessage(
          "无效区域：已取消，原顺序保留。只允许待安排/处理中，归档区禁止。",
        );
        return;
      }
      const old = locate31(d.board, s.id),
        next = moveCard31(d.board, s.id, s.target);
      commitModel(
        { ...model(d), board: next },
        `已提交：${cards31[s.id]} → ${columns31[s.target.column]}第${s.target.index + 1}位。可撤销。`,
        old.column === s.target.column
          ? { orderSeen: true }
          : { moveSeen: true },
      );
    } else
      commitModel(
        { ...model(d), width: s.size.width, height: s.size.height },
        "尺寸已提交；卡片真实边框盒改变，可撤销。",
        { resizeSeen: true },
      );
  };
  const start = (s) => {
    if (active.current) {
      setMessage("已有预览；先确认或取消，不覆盖当前事务。");
      return false;
    }
    show(s);
    patch({ previewSeen: true, ...(s.id ? { selected: s.id } : {}) });
    setMessage(
      s.kind === "move"
        ? "已拿起：预览不改模型。方向键改目标，Enter/Space提交，Escape或Tab取消；也可点击确认/取消。"
        : "尺寸预览中，尚未保存。方向键调整，Enter/Space确认；Escape或Tab取消。",
    );
    return true;
  };
  const pointTarget = (x, y, id) => {
    const column = document
      .elementFromPoint(x, y)
      ?.closest?.("[data-drop-column]");
    if (!column || !root.current?.contains(column)) return null;
    const name = column.dataset.dropColumn;
    const others = [...column.querySelectorAll("[data-card-id]")].filter(
      (e) => e.dataset.cardId !== id,
    );
    const index = others.filter((e) => {
      const r = e.getBoundingClientRect();
      return y >= r.top + r.height / 2;
    }).length;
    return { column: name, index };
  };
  const sample = (s, x, y) => {
    if (s.kind === "move")
      return {
        ...s,
        x,
        y,
        target: pointTarget(x, y, s.id),
        moved: s.moved || Math.hypot(x - s.startX, y - s.startY) > 4,
      };
    const wantedW = s.startSize.width + x - s.startX,
      wantedH = s.startSize.height + y - s.startY;
    const size = size31(
      wantedW,
      wantedH,
      sizeArea.current?.clientWidth || available,
    );
    return {
      ...s,
      x,
      y,
      size,
      clamped:
        Math.abs(wantedW - size.width) > 0.51 ||
        Math.abs(wantedH - size.height) > 0.51,
    };
  };
  const pointerDown = (event, kind, id) => {
    if (!event.isPrimary || event.button !== 0 || active.current) return;
    const origin = event.currentTarget,
      startSize = size31(
        current.current.width,
        current.current.height,
        sizeArea.current?.clientWidth || available,
      );
    const s = {
      kind,
      mode: "pointer",
      origin,
      pointerId: event.pointerId,
      id,
      target: id ? locate31(current.current.board, id) : null,
      size: startSize,
      startSize,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    try {
      origin.setPointerCapture(event.pointerId);
    } catch {
      setMessage(
        "Pointer capture不可用；请使用选择目标和尺寸按钮，模型未改变。",
      );
      return;
    }
    start(s);
  };
  const pointerMove = (e) => {
    const s = active.current;
    if (!s || s.mode !== "pointer" || s.pointerId !== e.pointerId) return;
    latestPoint.current = { x: e.clientX, y: e.clientY };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (!alive.current || active.current !== s || !latestPoint.current)
        return;
      const p = latestPoint.current;
      latestPoint.current = null;
      show(sample(s, p.x, p.y));
    });
  };
  const pointerUp = (e) => {
    const s = active.current;
    if (!s || s.mode !== "pointer" || s.pointerId !== e.pointerId) return;
    const next = sample(s, e.clientX, e.clientY);
    show(next);
    if (next.kind === "move" && !next.moved) cancel("仅按下未拖动");
    else {
      if (next.clamped) patch({ clampedSeen: true });
      commit();
    }
  };
  const key = (e, kind, id) => {
    const s = active.current;
    if (["Enter", " "].includes(e.key)) {
      e.preventDefault();
      if (e.repeat) return;
      if (s) {
        if (s.origin === e.currentTarget) commit();
        else setMessage("先完成当前预览。");
      } else
        start({
          kind,
          mode: "keyboard",
          origin: e.currentTarget,
          id,
          target: id ? locate31(current.current.board, id) : null,
          size: size31(
            current.current.width,
            current.current.height,
            available,
          ),
        });
    } else if (s?.origin === e.currentTarget) {
      if (e.key === "Tab") {
        cancel("Tab离开");
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cancel("Escape");
        return;
      }
      if (
        ![
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      if (kind === "move") {
        let { column, index } = s.target || locate31(current.current.board, id);
        if (e.key === "ArrowLeft" || e.key === "ArrowRight")
          column = e.key === "ArrowLeft" ? "todo" : "doing";
        const count = current.current.board[column].filter(
          (x) => x !== id,
        ).length;
        index =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? count
              : e.key === "ArrowUp"
                ? index - 1
                : e.key === "ArrowDown"
                  ? index + 1
                  : count;
        show({
          ...s,
          target: { column, index: Math.max(0, Math.min(count, index)) },
        });
      } else {
        const w =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? 5000
              : s.size.width +
                (e.key === "ArrowRight" ? 16 : e.key === "ArrowLeft" ? -16 : 0);
        const h =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? 5000
              : s.size.height +
                (e.key === "ArrowDown" ? 16 : e.key === "ArrowUp" ? -16 : 0);
        const size = size31(w, h, available);
        show({ ...s, size });
        if (size.width !== w || size.height !== h) patch({ clampedSeen: true });
      }
    }
  };
  const directMove = (column, index) => {
    cancel("改用按钮操作");
    const d = current.current,
      old = locate31(d.board, d.selected);
    commitModel(
      {
        ...model(d),
        board: moveCard31(d.board, d.selected, { column, index }),
      },
      "按钮已提交同一看板模型，可撤销。",
      old.column === column ? { orderSeen: true } : { moveSeen: true },
    );
  };
  const directSize = (w, h) => {
    cancel("改用尺寸按钮");
    const d = current.current,
      size = size31(w, h, available);
    if (size.width !== w || size.height !== h) patch({ clampedSeen: true });
    commitModel(
      { ...model(d), width: size.width, height: size.height },
      "按钮已提交真实尺寸，可撤销。",
      { resizeSeen: true },
    );
  };
  actions.current = { cancel, commit };
  useLayoutEffect(() => {
    const f = restoreFocus.current;
    restoreFocus.current = null;
    if (
      f &&
      focusRevision.current === f.revision &&
      (document.activeElement === f.origin ||
        document.activeElement === document.body)
    )
      handles.current[f.id]?.focus({ preventScroll: true });
  }, [data.board]);
  useEffect(() => {
    alive.current = true;
    const onFocus = (e) => {
      focusRevision.current++;
      const s = active.current;
      if (
        s?.mode === "keyboard" &&
        e.target !== s.origin &&
        !e.target.matches?.("[data-preview-action]")
      )
        actions.current.cancel("焦点离开把手");
    };
    const onBlur = () => actions.current.cancel("窗口失焦"),
      onHidden = () => {
        if (document.hidden) actions.current.cancel("页面隐藏");
      },
      onResize = () => actions.current.cancel("视口变化"),
      onScroll = () => {
        if (active.current?.mode === "pointer")
          actions.current.cancel("页面滚动");
      },
      onKey = (e) => {
        if (e.key === "Escape" && active.current) {
          e.preventDefault();
          actions.current.cancel("Escape");
        }
      };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => {
        setReduced(m.matches);
        actions.current.cancel("减少动态偏好变化");
      };
    m.addEventListener("change", change);
    return () => {
      alive.current = false;
      const s = active.current;
      active.current = null;
      release(s);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      m.removeEventListener("change", change);
    };
  }, []);
  useLayoutEffect(() => {
    let connected = true,
      ro,
      previous = -1;
    const measure = () => {
      if (!connected) return;
      const n = sizeArea.current?.clientWidth || 1;
      if (n !== previous) {
        if (previous !== -1) actions.current.cancel("容器宽度变化");
        previous = n;
        setAvailable(n);
      }
    };
    measure();
    try {
      ro = new ResizeObserver(measure);
      ro.observe(sizeArea.current);
    } catch {}
    window.addEventListener("resize", measure);
    return () => {
      connected = false;
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [data.step]);
  useEffect(() => {
    actions.current.cancel("换站");
  }, [data.step]);
  const selected = locate31(data.board, data.selected),
    displayedSize = preview?.kind === "resize" ? preview.size : bounds;
  const handlers = (kind, id) => ({
    onPointerDown: (e) => pointerDown(e, kind, id),
    onPointerMove: pointerMove,
    onPointerUp: pointerUp,
    onPointerCancel: (e) => {
      if (active.current?.pointerId === e.pointerId) cancel("pointercancel");
    },
    onLostPointerCapture: (e) => {
      if (active.current?.pointerId === e.pointerId)
        cancel("lost pointer capture");
    },
    onKeyDown: (e) => key(e, kind, id),
  });
  return (
    <div
      ref={root}
      className="move31-lab"
      data-session={preview ? `${preview.mode}-${preview.kind}` : "idle"}
      data-board={JSON.stringify(data.board)}
      data-reduced={String(reduced)}
      data-history={historyCount}
      data-pointer-id={preview?.pointerId ?? ""}
    >
      <div className="move31-explain">
        <strong>真实模型提交 · 原生Pointer Events</strong>
        <p>
          只拖把手，不拖整张卡；其余区域仍可滚动。无自动滚屏，请用按钮选择远处目标。本例未使用dnd-kit；库是候选，业务规则仍需说明。无必需动画，减少动态：
          {reduced ? "开启" : "关闭"}。
        </p>
      </div>
      <label>
        演练标题
        <input
          value={data.caption}
          maxLength={80}
          onChange={(e) => patch({ caption: e.target.value })}
        />
      </label>
      <div className="move31-buttons">
        <button onClick={() => patch({ caption: "设计核对看板（教学）" })}>
          填入标题示例
        </button>
      </div>
      <div className="move31-board" role="group" aria-label="三卡教学看板">
        {Object.entries(columns31).map(([column, title]) => (
          <section
            key={column}
            className="move31-column"
            data-drop-column={column}
            data-target={preview?.target?.column === column ? "yes" : "no"}
            aria-label={title}
          >
            <h3>
              {title} · {data.board[column].length}
            </h3>
            <ol>
              {data.board[column].map((id, i) => (
                <li
                  key={id}
                  data-card-id={id}
                  className={data.selected === id ? "selected" : ""}
                >
                  <h4>{cards31[id]}</h4>
                  <p>已提交位置 {i + 1}</p>
                  <button
                    ref={(e) => {
                      handles.current[id] = e;
                    }}
                    className="move31-handle"
                    {...handlers("move", id)}
                    aria-describedby="move31-key-help"
                  >
                    移动{cards31[id]}把手
                  </button>
                </li>
              ))}
            </ol>
            {!data.board[column].length && (
              <p className="move31-empty">空列，可放到第1位</p>
            )}
          </section>
        ))}
      </div>
      <p id="move31-key-help">
        把手：Enter/Space拿起，←/→选列，↑/↓/Home/End选位置，再Enter/Space提交；Escape或Tab取消。按下不等于提交。
      </p>
      <div className="move31-forbidden" aria-label="只读归档区">
        只读归档区 · 禁止放置（不会提交）
      </div>
      <div className="move31-preview" aria-live="off">
        <strong>当前预览（未提交）</strong>
        <p>
          {preview?.kind === "move"
            ? `${cards31[preview.id]} → ${preview.target ? `${columns31[preview.target.column]}第${preview.target.index + 1}位` : "无效区域，放下将取消"}`
            : preview?.kind === "resize"
              ? `${preview.size.width}×${preview.size.height}px`
              : "无预览；看板与尺寸均为已提交值"}
        </p>
      </div>
      {preview?.mode === "pointer" && preview.kind === "move" && (
        <div
          className="move31-ghost"
          aria-hidden="true"
          inert
          style={{
            left: Math.max(8, Math.min(innerWidth - 150, preview.x + 12)),
            top: Math.max(8, Math.min(innerHeight - 50, preview.y + 12)),
          }}
        >
          预览 · {cards31[preview.id]}
        </div>
      )}
      <div className="move31-controls">
        <fieldset>
          <legend>选中卡片与点击替代</legend>
          <div className="move31-buttons">
            {Object.entries(cards31).map(([id, title]) => (
              <button
                key={id}
                aria-pressed={data.selected === id}
                onClick={() => {
                  cancel("切换选中卡片");
                  patch({ selected: id });
                }}
              >
                选择{title}
              </button>
            ))}
          </div>
          <p>
            当前：{cards31[data.selected]} · {columns31[selected.column]}第
            {selected.index + 1}位
          </p>
          <div className="move31-buttons">
            <button
              onClick={() => directMove(selected.column, selected.index - 1)}
            >
              选中卡片上移
            </button>
            <button
              onClick={() => directMove(selected.column, selected.index + 1)}
            >
              选中卡片下移
            </button>
            {Object.entries(columns31).map(([column, title]) => (
              <button
                key={column}
                onClick={() =>
                  directMove(
                    column,
                    data.board[column].filter((x) => x !== data.selected)
                      .length,
                  )
                }
              >
                移到{title}末尾
              </button>
            ))}
            <button
              onClick={(e) =>
                start({
                  kind: "move",
                  mode: "click-preview",
                  origin: e.currentTarget,
                  id: data.selected,
                  target: {
                    column: selected.column === "todo" ? "doing" : "todo",
                    index:
                      data.board[selected.column === "todo" ? "doing" : "todo"]
                        .length,
                  },
                })
              }
            >
              预览移动到另一列
            </button>
            <button
              onClick={() => {
                cancel("无效目标");
                patch({ invalidSeen: true });
                setMessage(
                  "无效目标：只读归档区禁止放置；模型未改变。不是成功反馈。",
                );
              }}
            >
              尝试放入只读归档区
            </button>
          </div>
        </fieldset>
        <div className="move31-buttons">
          <button data-preview-action="confirm" onClick={commit}>
            确认当前预览
          </button>
          <button
            data-preview-action="cancel"
            onClick={() => {
              if (!cancel("主动取消"))
                setMessage("没有活动预览；已提交模型保持不变。");
            }}
          >
            取消当前预览
          </button>
          <button
            onClick={() => {
              cancel("撤销前取消预览");
              const old = history.current.pop();
              if (!old) {
                setMessage("暂无可撤销提交，焦点保留。");
                return;
              }
              setHistoryCount(history.current.length);
              patch({ ...old, undoSeen: true });
              setMessage("已撤销上一次真实提交；撤销历史只在本次实验内。");
            }}
          >
            撤销上次提交
          </button>
          <button
            onClick={() => {
              cancel("恢复看板");
              commitModel(
                { ...model(current.current), board: initialBoard31() },
                "教学看板已恢复初始顺序，仍可撤销。",
              );
            }}
          >
            恢复教学看板
          </button>
        </div>
      </div>
      {data.step === 2 && (
        <div className="move31-size-section">
          <h3>调整真实卡片尺寸</h3>
          <p>
            边框盒宽180–480px、高132–300px；窄屏宽度优先不超容器，当前可用
            {available}px。提交期望{data.width}×{data.height}px，实际显示
            {displayedSize.width}×{displayedSize.height}
            px；容器变窄不会悄悄改写已保存期望宽度。
          </p>
          <div className="move31-size-area" ref={sizeArea}>
            <div
              className="move31-size-card"
              style={{
                width: displayedSize.width,
                height: displayedSize.height,
              }}
            >
              <div
                className="move31-size-copy"
                tabIndex={0}
                role="region"
                aria-label="尺寸卡片完整正文"
              >
                <strong>教学说明卡</strong>
                <p>
                  尺寸是真实布局，不是缩放图片。长内容在正文区滚动，尺寸把手独立保留；页面其他区域可正常滚动。
                </p>
              </div>
              <button
                className="move31-handle"
                {...handlers("resize")}
                aria-describedby="move31-size-help"
              >
                调整尺寸把手
              </button>
            </div>
          </div>
          <p id="move31-size-help">
            把手Enter拿起；←/→宽度、↑/↓高度每次16px，Home最小、End最大；再Enter确认，Escape/Tab取消。直接尺寸按钮无需拖动。
          </p>
          <div className="move31-buttons">
            <button onClick={() => directSize(bounds.width - 32, data.height)}>
              宽度减少32
            </button>
            <button onClick={() => directSize(bounds.width + 32, data.height)}>
              宽度增加32
            </button>
            <button onClick={() => directSize(data.width, data.height - 24)}>
              高度减少24
            </button>
            <button onClick={() => directSize(data.width, data.height + 24)}>
              高度增加24
            </button>
            <button onClick={() => directSize(0, 0)}>使用最小尺寸</button>
            <button onClick={() => directSize(5000, 5000)}>
              请求超出上限尺寸
            </button>
            <button
              onClick={(e) =>
                start({
                  kind: "resize",
                  mode: "click-preview",
                  origin: e.currentTarget,
                  size: size31(bounds.width + 32, data.height + 24, available),
                })
              }
            >
              预览放大尺寸
            </button>
            <button onClick={() => directSize(280, 160)}>恢复教学尺寸</button>
          </div>
        </div>
      )}
      {data.step !== 2 && (
        <div
          className="move31-size-area move31-measure-only"
          ref={sizeArea}
          aria-hidden="true"
        />
      )}
      <div className="move31-status" role="status" aria-live="polite">
        {message}
      </div>
      <p className="move31-boundary">
        仅保存已提交模型，本地撤销剩{historyCount}
        步（最多10）。刷新/离开后撤销清空，换站取消预览。未接入云同步；无空闲动画循环或自动滚屏。
      </p>
    </div>
  );
}
