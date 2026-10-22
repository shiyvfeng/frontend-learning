import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  NODE_W,
  NODE_H,
  nodes32,
  edges32,
  view32,
  validBox32,
  screenToWorld32,
  zoomAt32,
  pan32,
  moveNode32,
  fit32,
} from "./lesson-thirty-two-content";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  num = (n) => Number(n.toFixed(2));
export default function SpaceWorkbench({ data, patch }) {
  const viewport = useRef(null),
    svg = useRef(null),
    current = useRef(data),
    active = useRef(null),
    pointerFrame = useRef(0),
    latest = useRef(null),
    wheelFrame = useRef(0),
    wheelQueue = useRef(null),
    generation = useRef(0),
    alive = useRef(true),
    history = useRef([]),
    actions = useRef({}),
    pointerFocus = useRef(false),
    measureRef = useRef(() => {});
  current.current = data;
  const [preview, setPreview] = useState(null),
    [size, setSize] = useState({ width: 0, height: 0 }),
    [probe, setProbe] = useState(null),
    [historyCount, setHistoryCount] = useState(0),
    [message, setMessage] = useState(
      "背景拖动平移；节点模式可拖动节点。按钮与键盘提供同一结果。",
    ),
    [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const prefix = "space32-" + useId().replaceAll(":", "");
  const box = () => {
    const r = svg.current?.getBoundingClientRect();
    return r
      ? { left: r.left, top: r.top, width: r.width, height: r.height }
      : null;
  };
  const release = (s) => {
    if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = 0;
    latest.current = null;
    if (s?.pointerId !== undefined)
      try {
        if (s.origin.hasPointerCapture(s.pointerId))
          s.origin.releasePointerCapture(s.pointerId);
      } catch {}
  };
  const stop = (reason = "主动取消", learn = true) => {
    generation.current++;
    if (wheelFrame.current) cancelAnimationFrame(wheelFrame.current);
    wheelFrame.current = 0;
    wheelQueue.current = null;
    const s = active.current;
    active.current = null;
    release(s);
    setPreview(null);
    setProbe(null);
    if (!s) return false;
    if (learn) patch({ cancelSeen: true });
    setMessage(`${reason}：预览取消，已提交节点与视口保持不变。`);
    return true;
  };
  const show = (s) => {
    active.current = s;
    setPreview(s ? { ...s } : null);
  };
  const commitView = (next, flags, text) => {
    const d = current.current;
    if (!next) {
      setMessage("绘图区没有可用尺寸，请恢复或重新测量后操作。");
      return;
    }
    current.current = { ...d, view: next, ...flags };
    patch({ view: next, ...flags });
    setProbe(null);
    setMessage(text);
  };
  const commitNodes = (next, flags, text) => {
    const d = current.current;
    if (same(d.nodes, next)) {
      setMessage("节点已到边界或内容相同，没有新增提交；焦点保留。");
      return;
    }
    history.current = [...history.current.slice(-9), d.nodes];
    setHistoryCount(history.current.length);
    current.current = { ...d, nodes: next, ...flags };
    patch({ nodes: next, ...flags });
    setMessage(text);
  };
  const finish = () => {
    const s = active.current;
    if (!s) {
      setMessage("当前没有预览，先拖动或点击预览入口。");
      return;
    }
    active.current = null;
    release(s);
    setPreview(null);
    if (s.kind === "node")
      commitNodes(
        s.nodes,
        { movedSeen: true },
        s.clamped
          ? "节点位置已提交，已按世界边界夹值。"
          : "节点世界位置已提交；视口未改变，可撤销节点操作。",
      );
    else {
      const changed = !same(s.view, current.current.view);
      commitView(
        s.view,
        changed ? { panSeen: true } : {},
        changed
          ? "平移视口已提交，节点世界坐标未改写。"
          : "画面未移动或已到边界，没有新增导航。",
      );
    }
  };
  const select = (id) => {
    stop("切换选择");
    const d = current.current,
      n = d.nodes.find((n) => n.id === id);
    if (!n) return;
    current.current = { ...d, selected: id, labelDraft: n.label };
    patch({ selected: id, labelDraft: n.label, selectedSeen: true });
    setMessage(`已选择节点${id.toUpperCase()}，完整标签与坐标在列表中。`);
  };
  const sample = (s, x, y) => {
    const b = box();
    if (!validBox32(b)) return null;
    const moved = s.moved || Math.hypot(x - s.startX, y - s.startY) >= 4;
    if (s.kind === "pan")
      return {
        ...s,
        view: pan32(s.initialView, x - s.startX, y - s.startY),
        moved,
      };
    const world = screenToWorld32({ x, y }, s.initialView, b),
      n = s.initialNodes.find((n) => n.id === s.id),
      wx = n.x + world.x - s.startWorld.x,
      wy = n.y + world.y - s.startWorld.y;
    return {
      ...s,
      nodes: moveNode32(s.initialNodes, s.id, wx, wy),
      moved,
      clamped: wx < -400 || wx > 400 || wy < -400 || wy > 400,
    };
  };
  const recordProbe = (x, y, v) => {
    const b = box(),
      world = screenToWorld32({ x, y }, v, b);
    if (!world) return;
    setProbe({ screen: { x: x - b.left, y: y - b.top }, world });
    if (!current.current.coordinatesSeen) {
      current.current = { ...current.current, coordinatesSeen: true };
      patch({ coordinatesSeen: true });
    }
  };
  const pointerDown = (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    stop("新的指针操作");
    const b = box(),
      d = current.current;
    if (!validBox32(b)) {
      setMessage("绘图区尺寸为零，未开始交互。");
      return;
    }
    const id =
        d.mode === "node"
          ? e.target.closest?.("[data-node-id]")?.dataset.nodeId
          : null,
      n = d.nodes.find((n) => n.id === id),
      origin = e.currentTarget;
    pointerFocus.current = true;
    origin.focus({ preventScroll: true });
    pointerFocus.current = false;
    try {
      origin.setPointerCapture(e.pointerId);
    } catch {
      setMessage("捕获不可用，模型未改变；请使用外部平移、选择和移动按钮。");
      return;
    }
    if (n) {
      current.current = { ...d, selected: id, labelDraft: n.label };
      patch({ selected: id, labelDraft: n.label, selectedSeen: true });
    }
    show({
      kind: n ? "node" : "pan",
      mode: "pointer",
      id,
      pointerId: e.pointerId,
      origin,
      startX: e.clientX,
      startY: e.clientY,
      startWorld: screenToWorld32({ x: e.clientX, y: e.clientY }, d.view, b),
      initialView: d.view,
      initialNodes: d.nodes,
      view: d.view,
      nodes: d.nodes,
      moved: false,
    });
    recordProbe(e.clientX, e.clientY, d.view);
    setMessage(
      n
        ? "节点移动预览中；绘图区内放下提交，Escape/Tab或取消事件恢复。"
        : "视口平移预览中，节点数据未改；绘图区内放下提交，Escape/Tab可取消。",
    );
  };
  const pointerMove = (e) => {
    const s = active.current;
    if (!s || s.mode !== "pointer" || e.pointerId !== s.pointerId) return;
    latest.current = { x: e.clientX, y: e.clientY };
    if (pointerFrame.current) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0;
      if (!alive.current || active.current !== s || !latest.current) return;
      const p = latest.current;
      latest.current = null;
      const next = sample(s, p.x, p.y);
      if (!next) {
        stop("绘图区不可用");
        return;
      }
      show(next);
      recordProbe(p.x, p.y, next.view);
    });
  };
  const pointerUp = (e) => {
    const s = active.current;
    if (!s || s.mode !== "pointer" || e.pointerId !== s.pointerId) return;
    const endBox = box();
    if (
      !validBox32(endBox) ||
      e.clientX < endBox.left ||
      e.clientX >= endBox.left + endBox.width ||
      e.clientY < endBox.top ||
      e.clientY >= endBox.top + endBox.height
    ) {
      stop("绘图区外松手");
      return;
    }
    const next = sample(s, e.clientX, e.clientY);
    if (!next) {
      stop("绘图区不可用");
      return;
    }
    if (!next.moved) {
      active.current = null;
      release(s);
      setPreview(null);
      setMessage(
        s.kind === "node" ? "已选择节点，未提交移动。" : "仅取样，未提交平移。",
      );
      return;
    }
    show(next);
    finish();
  };
  const zoom = (factor, point = null, fromWheel = false) => {
    if (!fromWheel) stop("改用缩放");
    const b = box(),
      d = current.current;
    if (!validBox32(b)) {
      setMessage("绘图区没有可用尺寸，请恢复或重新测量。");
      return;
    }
    const anchorPoint = point || {
        x: b.left + b.width / 2,
        y: b.top + b.height / 2,
      },
      beforeAnchor = screenToWorld32(anchorPoint, d.view, b),
      next = zoomAt32(d.view, d.view.z * factor, anchorPoint, b),
      changed = next.z !== d.view.z,
      afterAnchor = screenToWorld32(anchorPoint, next, b),
      anchorLimited =
        Math.hypot(
          afterAnchor.x - beforeAnchor.x,
          afterAnchor.y - beforeAnchor.y,
        ) > 0.000001;
    commitView(
      next,
      changed ? { zoomSeen: true } : {},
      changed
        ? anchorLimited
          ? "视口中心已到边界，缩放锚点按限幅处理；可适应内容找回。"
          : fromWheel
            ? "滚轮缩放已提交，以指针为锚点；节点数据未改。"
            : "中心缩放已提交，节点世界坐标未改。"
        : "已到20%或250%缩放边界，焦点与模型保留。",
    );
  };
  const pan = (dx, dy) => {
    stop("改用平移");
    if (!validBox32(box())) {
      setMessage("绘图区没有可用尺寸，请恢复后操作。");
      return;
    }
    const d = current.current,
      next = pan32(d.view, dx, dy);
    commitView(
      next,
      !same(next, d.view) ? { panSeen: true } : {},
      same(next, d.view)
        ? "已到视口中心边界，未移动；可用适应内容找回。"
        : "已移动视口；节点世界坐标不变，视口中心受±2000限制。",
    );
  };
  const fit = () => {
    stop("适应内容");
    const next = fit32(current.current.nodes, box());
    commitView(
      next,
      next ? { fitSeen: true } : {},
      "已适应全部内容；极窄尺寸若受缩放下限约束，可定位选中节点。",
    );
  };
  const locate = () => {
    stop("定位节点");
    if (!validBox32(box())) {
      setMessage("绘图区没有可用尺寸，请恢复后定位。");
      return;
    }
    const d = current.current,
      n = d.nodes.find((n) => n.id === d.selected);
    commitView(
      view32({ ...d.view, cx: n.x, cy: n.y }),
      { recoveredSeen: true },
      "选中节点中心已回到绘图区中心，数据未丢失。",
    );
  };
  const move = (dx, dy) => {
    stop("改用节点按钮");
    const d = current.current,
      n = d.nodes.find((n) => n.id === d.selected);
    commitNodes(
      moveNode32(d.nodes, n.id, n.x + dx, n.y + dy),
      { movedSeen: true },
      "按钮提交了同一节点模型，坐标为世界单位，可撤销。",
    );
  };
  const key = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.ctrlKey || e.metaKey) return;
    if (e.key === "Tab") {
      stop("Tab离开");
      return;
    }
    if (e.key === "Escape") {
      stop("Escape");
      e.preventDefault();
      return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0,
        dy = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (current.current.mode === "pan") pan(dx * 40, dy * 40);
      else move(dx * 20, dy * 20);
    } else if (["+", "=", "-", "_"].includes(e.key)) {
      e.preventDefault();
      zoom(["+", "="].includes(e.key) ? 1.25 : 0.8);
    } else if (e.key === "Home") {
      e.preventDefault();
      fit();
    }
  };
  actions.current = { stop, zoom, fit };
  useEffect(() => {
    alive.current = true;
    const blur = () => actions.current.stop("窗口失焦"),
      hidden = () => {
        if (document.hidden) actions.current.stop("页面隐藏");
      },
      resize = () => actions.current.stop("视口尺寸变化"),
      scroll = () => {
        if (active.current?.mode === "pointer" || wheelQueue.current)
          actions.current.stop("页面滚动");
      },
      escape = (e) => {
        if (e.key === "Escape" && active.current)
          actions.current.stop("Escape");
      },
      outside = (e) => {
        const s = active.current;
        if (s?.mode === "pointer" && s.pointerId === e.pointerId)
          actions.current.stop("指针在捕获外结束或丢失");
      };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", scroll, true);
    document.addEventListener("keydown", escape);
    for (const t of ["pointerup", "pointercancel", "lostpointercapture"])
      window.addEventListener(t, outside);
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => {
        setReduced(m.matches);
        actions.current.stop("减少动态偏好变化");
      };
    m.addEventListener("change", change);
    return () => {
      alive.current = false;
      generation.current++;
      const s = active.current;
      active.current = null;
      release(s);
      if (wheelFrame.current) cancelAnimationFrame(wheelFrame.current);
      wheelFrame.current = 0;
      wheelQueue.current = null;
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scroll, true);
      document.removeEventListener("keydown", escape);
      for (const t of ["pointerup", "pointercancel", "lostpointercapture"])
        window.removeEventListener(t, outside);
      m.removeEventListener("change", change);
    };
  }, []);
  useLayoutEffect(() => {
    let connected = true,
      ro,
      previous = "";
    const measure = () => {
      if (!connected) return;
      const b = box(),
        next = { width: b?.width || 0, height: b?.height || 0 },
        signature = `${next.width}/${next.height}`;
      if (signature === previous) return;
      previous = signature;
      actions.current.stop("绘图区尺寸变化", false);
      setSize(next);
      const d = current.current;
      if (!d.initialized && validBox32(b)) {
        const initial = fit32(d.nodes, b);
        current.current = { ...d, view: initial, initialized: true };
        patch({ view: initial, initialized: true });
      }
    };
    measureRef.current = measure;
    measure();
    try {
      if (svg.current) {
        ro = new ResizeObserver(measure);
        ro.observe(svg.current);
      }
    } catch {}
    window.addEventListener("resize", measure);
    return () => {
      connected = false;
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [data.collapsed]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (e) => {
      if (
        !current.current.wheelZoom ||
        e.ctrlKey ||
        e.metaKey ||
        !e.deltaY ||
        !validBox32(box())
      )
        return;
      e.preventDefault();
      if (active.current) actions.current.stop("改用滚轮缩放");
      const delta =
        e.deltaY *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? box()?.height || 320 : 1);
      wheelQueue.current = {
        x: e.clientX,
        y: e.clientY,
        dy: (wheelQueue.current?.dy || 0) + delta,
      };
      if (wheelFrame.current) return;
      const epoch = generation.current;
      wheelFrame.current = requestAnimationFrame(() => {
        wheelFrame.current = 0;
        if (
          !alive.current ||
          epoch !== generation.current ||
          !wheelQueue.current
        )
          return;
        const q = wheelQueue.current;
        wheelQueue.current = null;
        actions.current.zoom(
          Math.exp(-Math.max(-300, Math.min(300, q.dy)) * 0.003),
          { x: q.x, y: q.y },
          true,
        );
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [data.collapsed]);
  useEffect(() => {
    actions.current.stop("换站");
  }, [data.step]);
  const shownView = preview?.kind === "pan" ? preview.view : data.view,
    shownNodes = preview?.kind === "node" ? preview.nodes : data.nodes,
    selected = data.nodes.find((n) => n.id === data.selected),
    vb =
      size.width > 0 && size.height > 0
        ? `${shownView.cx - size.width / (2 * shownView.z)} ${shownView.cy - size.height / (2 * shownView.z)} ${size.width / shownView.z} ${size.height / shownView.z}`
        : "0 0 1 1";
  return (
    <div
      className="space32-lab"
      data-view={JSON.stringify(data.view)}
      data-shown-view={JSON.stringify(shownView)}
      data-nodes={JSON.stringify(data.nodes)}
      data-shown-nodes={JSON.stringify(shownNodes)}
      data-size={JSON.stringify(size)}
      data-session={preview ? `${preview.mode}-${preview.kind}` : "idle"}
      data-pointer-id={preview?.pointerId ?? ""}
      data-reduced={String(reduced)}
      data-history={historyCount}
    >
      <div className="space32-explain">
        <strong>SVG世界与视口 · 有限教学场景</strong>
        <p>
          3节点、2条固定连线；不是HTML
          Canvas元素或长网页滚动。节点中心夹到−400…400，缩放20%–250%，视口中心限±2000；无后端或协作同步。
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
      <div className="space32-buttons">
        <button onClick={() => patch({ caption: "流程关系画布（教学）" })}>
          填入标题示例
        </button>
      </div>
      <div className="space32-buttons" role="group" aria-label="画布输入模式">
        {[
          ["node", "节点模式"],
          ["pan", "平移模式"],
        ].map(([mode, title]) => (
          <button
            key={mode}
            aria-pressed={data.mode === mode}
            onClick={() => {
              stop("切换输入模式");
              patch({ mode });
              setMessage(`${title}：背景拖动始终平移；节点模式可移动对象。`);
            }}
          >
            {title}
          </button>
        ))}
      </div>
      {!data.collapsed ? (
        <div
          ref={viewport}
          className="space32-viewport"
          role="region"
          tabIndex={0}
          aria-label="教学无限画布"
          aria-describedby="space32-keys"
          onFocus={(e) => {
            if (e.target === e.currentTarget && !pointerFocus.current)
              e.currentTarget.scrollIntoView({
                block: "center",
                behavior: "auto",
              });
          }}
          onKeyDown={key}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={(e) => {
            if (active.current?.pointerId === e.pointerId)
              stop("pointercancel");
          }}
          onLostPointerCapture={(e) => {
            if (active.current?.pointerId === e.pointerId)
              stop("lost pointer capture");
          }}
        >
          <svg
            ref={svg}
            viewBox={vb}
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <pattern
                id={prefix + "-grid"}
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 H 0 V 50"
                  fill="none"
                  stroke="#d4c9df"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </pattern>
              <marker
                id={prefix + "-arrow"}
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10z" fill="#77548e" />
              </marker>
              {shownNodes.map((n) => (
                <clipPath key={n.id} id={prefix + "-" + n.id}>
                  <rect x={n.x - 62} y={n.y - 31} width="124" height="62" />
                </clipPath>
              ))}
            </defs>
            <rect
              x={shownView.cx - size.width / (2 * shownView.z)}
              y={shownView.cy - size.height / (2 * shownView.z)}
              width={size.width / shownView.z || 1}
              height={size.height / shownView.z || 1}
              fill={`url(#${prefix}-grid)`}
            />
            <rect
              x="-470"
              y="-440"
              width="940"
              height="880"
              fill="none"
              stroke="#a58bb8"
              strokeDasharray="8 8"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            {edges32.map((edge) => {
              const a = shownNodes.find((n) => n.id === edge.from),
                b = shownNodes.find((n) => n.id === edge.to);
              return (
                <line
                  key={edge.id}
                  data-edge-id={edge.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#77548e"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  markerEnd={`url(#${prefix}-arrow)`}
                  pointerEvents="none"
                />
              );
            })}
            {shownNodes.map((n) => {
              const chars = Array.from(n.label);
              return (
                <g key={n.id} data-node-id={n.id} className="space32-node">
                  <rect
                    className="space32-node-body"
                    x={n.x - NODE_W / 2}
                    y={n.y - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx="9"
                    fill={n.id === data.selected ? "#e2d6ed" : "#fffdfa"}
                    stroke={n.id === data.selected ? "#63417e" : "#8e799f"}
                    strokeWidth={n.id === data.selected ? 3 : 1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={n.x}
                    y={n.y - 18}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill="#443054"
                  >
                    节点 {n.id.toUpperCase()}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 3}
                    textAnchor="middle"
                    fontSize="13"
                    fill="#30243b"
                    clipPath={`url(#${prefix}-${n.id})`}
                  >
                    <tspan x={n.x}>{chars.slice(0, 8).join("")}</tspan>
                    <tspan x={n.x} dy="18">
                      {chars.slice(8, 16).join("")}
                      {chars.length > 16 ? "…" : ""}
                    </tspan>
                  </text>
                </g>
              );
            })}
            <circle
              cx={shownView.cx}
              cy={shownView.cy}
              r={3 / shownView.z}
              fill="#9b416b"
              pointerEvents="none"
            />
          </svg>
        </div>
      ) : (
        <div className="space32-empty">
          绘图区已收起，实际尺寸按零处理；节点数据保留。恢复按钮仍可用，没有不可见画布Tab目标。
        </div>
      )}
      <p id="space32-keys">
        画布焦点内：节点模式方向键移动选中节点20世界单位；平移模式方向键移动画面40屏幕像素。+
        /
        −以中心缩放，Home适应内容，Escape取消，Tab退出。绘图区单指拖动专用；浏览器双指缩放保留。
      </p>
      <div className="space32-buttons">
        <button onClick={() => pan(-80, 0)}>画面向左80px</button>
        <button onClick={() => pan(80, 0)}>画面向右80px</button>
        <button onClick={() => pan(0, -80)}>画面向上80px</button>
        <button onClick={() => pan(0, 80)}>画面向下80px</button>
        <button onClick={() => zoom(1.25)}>放大（中心锚点）</button>
        <button onClick={() => zoom(0.8)}>缩小（中心锚点）</button>
        <button onClick={fit}>适应全部内容</button>
        <button
          onClick={() => {
            stop("复位视口");
            commitView(
              view32(),
              {},
              "视口复位到世界中心0/0、100%；节点不变，可再适应内容。",
            );
          }}
        >
          复位视口
        </button>
        <button
          onClick={() => {
            stop("中心取样");
            const b = box();
            if (!validBox32(b)) {
              setMessage("尺寸为零，无法取样，请恢复绘图区。");
              return;
            }
            recordProbe(
              b.left + b.width / 2,
              b.top + b.height / 2,
              current.current.view,
            );
            setMessage(
              "已按当前矩形取样画布中心；屏幕局部坐标与世界坐标是不同空间。",
            );
          }}
        >
          测量画布中心
        </button>
      </div>
      <div className="space32-readout" aria-live="off">
        <strong>视口与坐标（预览时尚未提交）</strong>
        <p>
          已提交中心 {num(data.view.cx)}, {num(data.view.cy)} · 缩放{" "}
          {num(data.view.z * 100)}%；当前显示中心 {num(shownView.cx)},{" "}
          {num(shownView.cy)} · {num(shownView.z * 100)}%
        </p>
        <p>
          绘图区 {num(size.width)}×{num(size.height)} CSS像素。
          {probe
            ? `取样局部屏幕(${num(probe.screen.x)}, ${num(probe.screen.y)}) → 世界(${num(probe.world.x)}, ${num(probe.world.y)})`
            : "点击绘图区或测量中心可重新取样；视口命令会清除旧取样。"}
        </p>
        <p>
          {preview
            ? `${preview.kind === "pan" ? "视口平移" : "节点移动"}预览中；已提交模型保持原值。`
            : "没有活动预览。节点位置与视口分别保存。"}
        </p>
      </div>
      <div className="space32-objects">
        <h3>可访问对象列表 · 完整标签</h3>
        <ul>
          {data.nodes.map((n) => (
            <li key={n.id}>
              <button
                aria-pressed={data.selected === n.id}
                onClick={() => select(n.id)}
              >
                选择节点{n.id.toUpperCase()}
              </button>
              <p>{n.label}</p>
              <small>
                中心世界坐标 {num(n.x)}, {num(n.y)}
              </small>
            </li>
          ))}
        </ul>
        <p>
          当前选中{data.selected.toUpperCase()}：{selected.label}
          。画布缩小时文字也变小；此处保留全文。两条固定关系：A → B、B → C。
        </p>
      </div>
      {data.step > 0 && (
        <div className="space32-edit">
          <h3>节点操作 · 同一世界模型</h3>
          <div className="space32-buttons">
            <button onClick={() => move(-20, 0)}>节点左移20</button>
            <button onClick={() => move(20, 0)}>节点右移20</button>
            <button onClick={() => move(0, -20)}>节点上移20</button>
            <button onClick={() => move(0, 20)}>节点下移20</button>
            <button
              onClick={() => {
                stop("开始按钮预览");
                const d = current.current,
                  n = d.nodes.find((n) => n.id === d.selected);
                show({
                  kind: "node",
                  mode: "click-preview",
                  id: n.id,
                  nodes: moveNode32(d.nodes, n.id, n.x + 40, n.y),
                  view: d.view,
                });
                setMessage(
                  "按钮预览未提交；可以滚动到确认/取消入口，或Escape取消。",
                );
              }}
            >
              预览节点右移40
            </button>
            <button onClick={finish}>确认当前预览</button>
            <button
              onClick={() => {
                if (!stop("主动取消"))
                  setMessage("没有活动预览，模型保持不变。");
              }}
            >
              取消当前预览
            </button>
            <button
              onClick={() => {
                stop("撤销节点操作");
                const old = history.current.pop();
                if (!old) {
                  setMessage("暂无节点提交可撤销，焦点保留。");
                  return;
                }
                setHistoryCount(history.current.length);
                const d = current.current,
                  n = old.find((n) => n.id === d.selected);
                current.current = { ...d, nodes: old, labelDraft: n.label };
                patch({ nodes: old, labelDraft: n.label, undoSeen: true });
                setMessage(
                  "已撤销节点提交，恢复当前标签输入；视口导航不进入节点撤销。",
                );
              }}
            >
              撤销节点提交
            </button>
          </div>
          <p>
            最多10步节点位置/标签撤销，离开实验或刷新清空；视口导航使用复位/适应内容。
          </p>
        </div>
      )}
      {data.step === 2 && (
        <div className="space32-boundaries">
          <h3>边界、找回与标签</h3>
          <div className="space32-buttons">
            <button
              onClick={() => {
                stop("边缘示例");
                const d = current.current;
                commitNodes(
                  moveNode32(d.nodes, d.selected, 400, 400),
                  { awaySeen: true, movedSeen: true },
                  "节点已到合法世界边缘，可能离开视口；数据仍在列表里。",
                );
              }}
            >
              把选中节点移到边缘
            </button>
            <button onClick={locate}>定位选中节点</button>
            <button
              onClick={() => {
                stop("收起/恢复绘图区");
                patch({ collapsed: !data.collapsed });
                setMessage(
                  data.collapsed
                    ? "绘图区恢复，视口世界中心与节点保持。"
                    : "绘图区已收起，节点与视口模型未清除。",
                );
              }}
            >
              {data.collapsed ? "恢复绘图区" : "收起绘图区（零尺寸）"}
            </button>
            <button
              onClick={() => {
                measureRef.current();
                setMessage(
                  validBox32(box())
                    ? "已重新读取绘图区矩形，节点数据未改变。"
                    : "绘图区尺寸为零，请先恢复绘图区。",
                );
              }}
            >
              重新测量绘图区
            </button>
          </div>
          <label>
            选中节点标签
            <input
              value={data.labelDraft}
              maxLength={80}
              onChange={(e) => patch({ labelDraft: e.target.value })}
            />
          </label>
          <div className="space32-buttons">
            <button
              onClick={() =>
                patch({
                  labelDraft:
                    "这是一个较长的教学节点标签，画布显示摘要，完整内容在对象列表与编辑器中仍可读取。",
                })
              }
            >
              填入长标签示例
            </button>
            <button
              onClick={() => {
                stop("应用节点文字");
                const d = current.current,
                  text = d.labelDraft.trim();
                if (!text) {
                  setMessage("标签不能为空，原节点文字保留。");
                  return;
                }
                commitNodes(
                  d.nodes.map((n) =>
                    n.id === d.selected ? { ...n, label: text } : n,
                  ),
                  { editedSeen: true },
                  "节点完整标签已提交；画布仅显示摘要，全文在列表里，可撤销。",
                );
              }}
            >
              应用节点文字
            </button>
          </div>
          <p>
            应用后才改节点标签；选择其他节点会把输入框换成该节点当前标签。窄容器按实际矩形重新测量，resize取消指针预览并保留世界中心；无ResizeObserver时仍可窗口resize或手动测量。
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.wheelZoom}
              onChange={(e) => {
                stop("切换滚轮策略");
                patch({ wheelZoom: e.target.checked });
              }}
            />
            普通滚轮缩放画布（仅绘图区，默认关闭）
          </label>
          <p>
            关闭时普通滚轮滚页面；开启后以指针为缩放锚点。Ctrl/Meta滚轮始终放行，不实现自定义捏合，浏览器双指缩放保留。
          </p>
        </div>
      )}
      <div className="space32-status" role="status" aria-live="polite">
        {message}
      </div>
      <p className="space32-help">
        普通滚轮当前：{data.wheelZoom ? "绘图区缩放" : "页面滚动"}
        ；Ctrl/Meta快捷键与滚轮放行。 无空闲动画循环，减少动态：
        {reduced ? "开启" : "关闭"}
        。预览与取样不持久化；已提交节点/视口、草稿和进度只存在当前浏览器。综合阶段A/B与T01–T12工具模块仍待制作。
      </p>
    </div>
  );
}
