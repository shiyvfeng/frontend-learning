import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Choices, Note } from "./lesson-two";
import { layoutCards, layoutMotionScope } from "./lesson-twenty-content";
function useReduced() {
  const [r, set] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      f = () => set(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}
function Card({ card, expanded, long, onExpand, onFront, nodeRef }) {
  const [note, setNote] = useState(`卡片${card.id}的本地备注`);
  return (
    <li
      ref={nodeRef}
      className="layout-card"
      data-layout-card={card.id}
      data-expanded={String(expanded)}
    >
      <svg
        className="layout-illustration"
        width="52"
        height="52"
        viewBox="0 0 64 64"
        role="img"
        aria-label={`卡片${card.id}固定尺寸插画`}
      >
        <rect x="1" y="1" width="62" height="62" rx="14" fill={card.color} />
        <circle cx="32" cy="27" r="12" fill="white" />
        <path
          d="M14 50H50"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <div className="layout-card-body">
        <h3>
          卡片{card.id} · {card.title}
          {long
            ? "：在非常窄的容器里核对长标题、完整内容与滚动归属，不牺牲阅读顺序"
            : ""}
        </h3>
        <label>
          卡片{card.id}备注
          <input
            value={note}
            maxLength={80}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          className="layout-example"
          onClick={() => setNote(`正在评估方案${card.id}`)}
        >
          填入卡片{card.id}示例备注
        </button>
        <div
          id={`layout-details-${card.id}`}
          hidden={!expanded}
          className="layout-details"
        >
          <p>
            {card.detail}
            {long
              ? " 内容压力会真实增加高度并推动邻卡。插画不随壳层缩放，文字保持字号与自然换行；重要内容不裁切或省略。".repeat(
                  3,
                )
              : ""}
          </p>
        </div>
      </div>
      <div className="layout-card-actions">
        <button onClick={() => onFront(card.id)}>卡片{card.id}移到最前</button>
        <button
          aria-expanded={expanded}
          aria-controls={`layout-details-${card.id}`}
          onClick={() => onExpand(card.id)}
        >
          {expanded ? "收起" : "展开"}卡片{card.id}
        </button>
      </div>
    </li>
  );
}
const rectOf = (e) => {
  const r = e.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};
export default function LayoutWorkbench({ data, patch }) {
  const [model, setModel] = useState({
      order: ["A", "B", "C"],
      expanded: [],
      long: data.longContent,
      version: 0,
    }),
    [status, setStatus] = useState("真实DOM顺序 A → B → C，尚无过渡"),
    [readout, setReadout] = useState(
      "点击读取当前DOM与最终布局；下方测量为上次提交快照",
    ),
    [report, setReport] = useState([]),
    [fallback, setFallback] = useState(false);
  const state = useRef(model),
    nodes = useRef(new Map()),
    list = useRef(null),
    animations = useRef(new Map()),
    generation = useRef(0),
    alive = useRef(true),
    pending = useRef(null),
    focusVersion = useRef(0),
    changes = useRef(0),
    latest = useRef({ data, patch });
  const systemReduced = useReduced(),
    reduced = systemReduced || data.noMotion;
  latest.current = { data, patch, reduced };
  const stop = () => {
    generation.current++;
    for (const a of animations.current.values()) {
      a.onfinish = null;
      a.oncancel = null;
      a.cancel();
    }
    animations.current.clear();
  };
  const settle = (reason) => {
    stop();
    if (alive.current) setStatus(reason);
  };
  const change = (next, reason) => {
    const previous = state.current,
      first = new Map([...nodes.current].map(([id, e]) => [id, rectOf(e)])),
      active = document.activeElement;
    const focus = list.current?.contains(active)
      ? { node: active, version: focusVersion.current }
      : null;
    const interrupted = animations.current.size > 0;
    stop();
    const changed =
      JSON.stringify([previous.order, previous.expanded, previous.long]) !==
      JSON.stringify([next.order, next.expanded, next.long]);
    if (changed) changes.current++;
    pending.current = { first, focus, reason, interrupted };
    const target = { ...next, version: previous.version + 1 };
    state.current = target;
    setModel(target);
    latest.current.patch({
      ...(previous.order.join("") !== next.order.join("")
        ? { reordered: true }
        : {}),
      ...(changes.current >= 2 ? { multiChanged: true } : {}),
    });
  };
  useLayoutEffect(() => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    const saved = job.focus;
    if (saved?.node.isConnected) {
      if (
        document.activeElement === document.body &&
        focusVersion.current === saved.version
      )
        saved.node.focus({ preventScroll: true });
      if (document.activeElement === saved.node) {
        const r = saved.node.getBoundingClientRect(),
          h = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
        if (
          r.top < 0 ||
          r.bottom > innerHeight ||
          !h ||
          !(h === saved.node || saved.node.contains(h))
        )
          saved.node.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }
    const records = [],
      token = generation.current,
      d = latest.current.data,
      allowed = d.animate && !latest.current.reduced && !document.hidden;
    for (const id of model.order) {
      const node = nodes.current.get(id),
        first = job.first.get(id),
        last = rectOf(node),
        dx = first.left - last.left,
        dy = first.top - last.top;
      const skipForFocus =
        node.contains(document.activeElement) &&
        Math.abs(first.height - last.height) > 1;
      records.push({
        id,
        first,
        last,
        dx,
        dy,
        skipForFocus,
        finalOffsetTop: node.offsetTop,
      });
      if (
        skipForFocus ||
        !allowed ||
        (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)
      )
        continue;
      try {
        const a = node.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: "translate(0px, 0px)" },
          ],
          { duration: d.duration, easing: "ease-out", fill: "both" },
        );
        animations.current.set(id, a);
        const release = () => {
          if (
            !alive.current ||
            token !== generation.current ||
            animations.current.get(id) !== a
          )
            return;
          animations.current.delete(id);
          a.onfinish = null;
          a.oncancel = null;
          a.cancel();
          if (!animations.current.size)
            setStatus(
              `${job.reason}：位置过渡结束，真实DOM仍为 ${state.current.order.join(" → ")}。`,
            );
        };
        a.onfinish = release;
        a.oncancel = release;
      } catch {
        setFallback(true);
      }
    }
    setReport(records);
    setStatus(
      `${job.reason}：真实DOM已是 ${model.order.join(" → ")}；${animations.current.size ? `${job.interrupted ? "从当前画面重新测量；" : ""}${animations.current.size}张卡片正在平移到最终位置` : "直接采用最终布局，无需等待"}。`,
    );
  }, [model]);
  useLayoutEffect(() => {
    if (reduced || !data.animate)
      settle(
        reduced
          ? "减少动态：取消位置过渡，直接保留最终布局与焦点"
          : "即时模式：保留真实最终布局，不播放位置过渡",
      );
  }, [reduced, data.animate]);
  useEffect(() => {
    const focused = (e) => {
        if (e.target !== document.body) focusVersion.current++;
      },
      hidden = () => {
        if (document.hidden)
          settle("页面隐藏：取消位置过渡，保留最终布局，返回不自动续播");
      },
      resize = () => settle("视口尺寸变化：放弃旧测量，直接采用新布局");
    document.addEventListener("focusin", focused);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("resize", resize);
    let width = list.current.getBoundingClientRect().width;
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver((entries) => {
            const next = entries[0]?.contentRect.width;
            if (next && Math.abs(next - width) > 1) {
              width = next;
              settle("容器宽度变化：取消旧位置过渡，文本按新宽度立即布局");
            }
          })
        : null;
    observer?.observe(list.current);
    return () => {
      alive.current = false;
      stop();
      observer?.disconnect();
      document.removeEventListener("focusin", focused);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("resize", resize);
    };
  }, []);
  const expand = (id) => {
    const old = state.current,
      was = old.expanded.includes(id);
    change(
      {
        ...old,
        expanded: was
          ? old.expanded.filter((v) => v !== id)
          : [...old.expanded, id],
      },
      `${was ? "收起" : "展开"}卡片${id}，高度立即布局`,
    );
    patch(was ? { collapsedSeen: true } : { expandedSeen: true });
  };
  const front = (id) =>
    change(
      {
        ...state.current,
        order: [id, ...state.current.order.filter((v) => v !== id)],
      },
      `卡片${id}移到最前`,
    );
  const inspect = () => {
    const actual = [...list.current.querySelectorAll("[data-layout-card]")].map(
      (e) =>
        `${e.dataset.layoutCard}：最终offsetTop ${e.offsetTop}px，当前视觉top ${e.getBoundingClientRect().top.toFixed(1)}px，宽${e.offsetWidth}px、高${e.offsetHeight}px`,
    );
    setReadout(
      `当前DOM实际顺序 ${[...list.current.children].map((e) => e.dataset.layoutCard).join(" → ")}；${actual.join("；")}。当前活跃位置过渡 ${animations.current.size} 个。offsetTop不包含视觉平移，文字/插画没有scale。`,
    );
    patch({ inspected: true });
  };
  const reset = () => {
    change(
      { order: ["A", "B", "C"], expanded: [], long: false },
      "恢复初始真实布局",
    );
    patch({ longContent: false });
  };
  return (
    <div
      className="layout-lab"
      data-testid="layout-lab"
      data-reduced={String(reduced)}
    >
      <div className="layout-heading">
        <strong>真实布局 × 位置型FLIP</strong>
        <span className="micro">React + 原生WAAPI · 未使用Motion</span>
      </div>
      <div className="layout-controls">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.animate}
            onChange={(e) =>
              patch({ animate: e.target.checked, modeCompared: true })
            }
          />
          播放FLIP位置过渡
        </label>
        <Choices
          label="下一次位置过渡时长"
          values={[
            [300, "常速300ms"],
            [1200, "慢速1200ms"],
          ]}
          value={data.duration}
          onChange={(v) => patch({ duration: v })}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.noMotion}
            onChange={(e) =>
              patch({ noMotion: e.target.checked, reducedChecked: true })
            }
          />
          减少动态：直接最终布局
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={model.long}
            onChange={(e) => {
              change(
                { ...state.current, long: e.target.checked },
                "内容压力改变真实高度",
              );
              patch({
                longContent: e.target.checked,
                ...(e.target.checked ? { longSeen: true } : {}),
              });
            }}
          />
          启用长内容压力
        </label>
      </div>
      <p data-testid="layout-preference">
        系统减少动态：{systemReduced ? "开启" : "关闭"} · 当前：
        {reduced || !data.animate ? "直接最终布局" : "允许位置过渡"}
        。实时响应；时长设置只用于下次布局操作。
      </p>
      <div className="layout-actions">
        <button
          onClick={() =>
            change(
              { ...state.current, order: [...state.current.order].reverse() },
              "倒序排列",
            )
          }
        >
          倒序排列
        </button>
        <button
          onClick={() =>
            change({ ...state.current, order: ["B", "C", "A"] }, "按优先级排序")
          }
        >
          按优先级排序
        </button>
        <button onClick={reset}>恢复初始布局</button>
        <button
          onClick={() =>
            settle("手动结束过渡：立即保留最终布局，不改变排序或内容")
          }
        >
          立即完成位置过渡
        </button>
        <button onClick={inspect}>读取DOM与最终布局</button>
      </div>
      <p className="micro">
        无需拖拽。页面使用正常滚动；长内容自然换行，不截断。只在持焦卡片最终控件离开视口或被遮挡时调整滚动；外部已有焦点则不抢走。固定操作区位于移动卡片前，避免过渡遮挡按钮。焦点轮廓始终保留。
      </p>
      <ol
        className="layout-list"
        ref={list}
        aria-label="真实布局卡片列表"
        data-order={model.order.join("")}
      >
        {model.order.map((id) => (
          <Card
            key={id}
            card={layoutCards.find((c) => c.id === id)}
            expanded={model.expanded.includes(id)}
            long={model.long}
            onExpand={expand}
            onFront={front}
            nodeRef={(e) => {
              if (e) nodes.current.set(id, e);
              else nodes.current.delete(id);
            }}
          />
        ))}
      </ol>
      <p role="status" className="layout-status" data-testid="layout-status">
        {status}
      </p>
      {fallback && (
        <p className="layout-fallback" role="status">
          位置动画能力不可用或创建失败：真实布局已完成，使用静态结果。
        </p>
      )}
      <div className="layout-readout">
        <h3>最终布局与过渡视觉分开看</h3>
        <p role="status" data-testid="layout-readout">
          {readout}
        </p>
        <details>
          <summary>上次提交的 First / Last 测量快照</summary>
          <ul>
            {report.map((r) => (
              <li key={r.id} data-measure-card={r.id}>
                卡片{r.id}：First top {r.first.top.toFixed(1)} → Last top{" "}
                {r.last.top.toFixed(1)}；反向平移 ({r.dx.toFixed(1)},{" "}
                {r.dy.toFixed(1)})px
                {r.skipForFocus ? "（本卡尺寸改变且持焦，直接最终位置）" : ""}
                ；实际高度 {r.first.height.toFixed(0)} →{" "}
                {r.last.height.toFixed(0)}px，未做scale。
              </li>
            ))}
          </ul>
          <p className="micro">
            快照不是逐帧数值。First来自操作前的当前视觉位置，Last在真实DOM提交和必要的焦点可见性滚动后测量。动画结束只清理平移，不再修改DOM顺序。
          </p>
        </details>
      </div>
      <div className="layout-explain">
        <h3>位置动画与尺寸策略</h3>
        <p data-testid="layout-scope">{layoutMotionScope}</p>
        <p>
          FLIP：First先读当前视觉矩形；Last更新真实排序/展开并测最终位置；Invert以反向translate抵消位置差；Play播放到零。中途再变更时先测正在显示的位置，再取消旧动画并测新目标；稳定ID保留备注和同一控件，旧完成回调不能回放旧布局。这里不追求速度连续的spring，采用固定时长ease-out。
        </p>
        <p>
          展开卡片本身的高度立即改变，周围卡片位置可以平滑移动；文字即时换行，固定插画保持比例。如果产品确需宽高平滑过渡，再选择壳层/内容隔离、尺寸插值或库的尺度修正，不能把
          transition: all
          当万能。持焦卡片自身尺寸改变时，本卡直接采用最终位置，按需滚动保持操作入口可见，邻卡仍可过渡。本例没有跨页面或跨视图共享元素，也没有添加/删除卡片的进入退出。
        </p>
        <p>
          容器宽度/视口变化、页面隐藏、关闭动效或系统减少动态时，取消旧过渡，直接保留新布局。离课/换站/卸载清理动画和监听，无持续rAF。重排通常保留当前焦点；若DOM移动使本卡片焦点落到body，仅在没有外部新焦点时恢复原控件。实验排序、展开与备注在换站/刷新时重新开始，学习进度和参数独立保存。
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.noStretchReviewed}
            onChange={(e) => patch({ noStretchReviewed: e.target.checked })}
          />
          我已核对位置过渡、即时尺寸与不拉伸内容
        </label>
      </div>
      <Note>
        先倒序并读取，再对比动效开关。展开A观察真实高度与邻卡位移；编辑备注再重排核对保留。连续倒序/按优先级排序会以最新真实布局为准，可用立即完成按钮，不必等动画。减少动态下同样完成所有操作。共享元素另属21，开放状态以目录为准。
      </Note>
    </div>
  );
}
