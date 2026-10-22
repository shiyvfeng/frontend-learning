import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  sceneInitial,
  canvasView,
  canvasPoint,
  canvasHit,
  clampShape,
  canvasScope,
} from "./lesson-twenty-four-content";
export default function CanvasWorkbench({ data, patch }) {
  const [model, setModel] = useState(sceneInitial),
    [info, setInfo] = useState({
      cssWidth: 0,
      cssHeight: 0,
      width: 0,
      height: 0,
      dpr: 1,
      draws: 0,
    }),
    [capable, setCapable] = useState(true),
    [message, setMessage] = useState(
      "本地Canvas 2D实验；画布内只点击选择，移动用外部按钮，无拖拽。",
    ),
    [inspection, setInspection] = useState(""),
    [reduce, setReduce] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const canvas = useRef(null),
    wrapper = useRef(null),
    list = useRef(null),
    addButton = useRef(null),
    modelRef = useRef(model),
    history = useRef([]),
    serial = useRef(3),
    frame = useRef(0),
    generation = useRef(0),
    alive = useRef(true),
    press = useRef(null),
    opts = useRef(data),
    patchRef = useRef(patch),
    drawRef = useRef(() => {}),
    queueRef = useRef(() => {}),
    drawCount = useRef(0),
    focusSerial = useRef(0),
    focusPlan = useRef(null);
  opts.current = data;
  patchRef.current = patch;
  const cancelDraw = () => {
    generation.current++;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  };
  const update = (next, remember = true) => {
    press.current = null;
    const previous = modelRef.current,
      active = document.activeElement,
      id = active?.dataset?.canvasObject;
    if (id && !next.items.some((o) => o.id === id))
      focusPlan.current = { before: active, serial: focusSerial.current };
    if (remember) {
      history.current.push(structuredClone(previous));
      if (history.current.length > 20) history.current.shift();
    }
    modelRef.current = next;
    setModel(next);
    if (previous.items.length === 0 && next.items.length > 0)
      patchRef.current({ emptyRecovered: true });
  };
  useLayoutEffect(() => {
    const p = focusPlan.current;
    focusPlan.current = null;
    if (
      p &&
      focusSerial.current === p.serial &&
      !p.before.isConnected &&
      document.activeElement === document.body
    ) {
      addButton.current?.focus({ preventScroll: true });
      const r = addButton.current?.getBoundingClientRect();
      if (r && (r.top < 90 || r.bottom > innerHeight - 20))
        addButton.current.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
    }
  }, [model]);
  drawRef.current = () => {
    if (!alive.current || !canvas.current) return null;
    const el = canvas.current,
      r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    const dpr =
        Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
          ? devicePixelRatio
          : 1,
      w = Math.max(1, Math.round(r.width * dpr)),
      h = Math.max(1, Math.round(r.height * dpr));
    let ctx;
    try {
      ctx = el.getContext("2d");
    } catch {}
    if (!ctx || ctx.isContextLost?.()) {
      setCapable(false);
      return null;
    }
    setCapable(true);
    if (el.width !== w) el.width = w;
    if (el.height !== h) el.height = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const v = canvasView(r.width, r.height, opts.current.zoom),
      sx = w / r.width,
      sy = h / r.height;
    ctx.setTransform(sx * v.scale, 0, 0, sy * v.scale, sx * v.ox, sy * v.oy);
    for (const o of modelRef.current.items) {
      ctx.beginPath();
      if (o.kind === "circle") ctx.arc(o.x, o.y, o.w / 2, 0, Math.PI * 2);
      else ctx.rect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
      ctx.globalAlpha = opts.current.alpha ? 0.4 : 1;
      ctx.fillStyle = o.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(o.id, o.x, o.y);
      if (modelRef.current.selected === o.id) {
        ctx.beginPath();
        if (o.kind === "circle") ctx.arc(o.x, o.y, o.w / 2 + 6, 0, Math.PI * 2);
        else ctx.rect(o.x - o.w / 2 - 6, o.y - o.h / 2 - 6, o.w + 12, o.h + 12);
        ctx.strokeStyle = "#4d3d70";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    drawCount.current++;
    el.dataset.drawCount = String(drawCount.current);
    el.dataset.drawnObjects = String(modelRef.current.items.length);
    el.dataset.drawnSelected = modelRef.current.selected ?? "none";
    const next = {
      cssWidth: r.width,
      cssHeight: r.height,
      width: w,
      height: h,
      dpr,
      draws: drawCount.current,
    };
    setInfo(next);
    return next;
  };
  useLayoutEffect(() => {
    alive.current = true;
    const queue = () => {
      if (!alive.current || document.hidden || frame.current) return;
      const token = generation.current;
      frame.current = requestAnimationFrame(() => {
        if (!alive.current || generation.current !== token) return;
        frame.current = 0;
        drawRef.current();
      });
    };
    queueRef.current = queue;
    const geometry = () => {
      press.current = null;
      queue();
    };
    const ro =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(geometry)
        : null;
    ro?.observe(wrapper.current);
    window.addEventListener("resize", geometry);
    const scroll = () => {
      press.current = null;
    };
    window.addEventListener("scroll", scroll, { capture: true, passive: true });
    const visibility = () => {
      press.current = null;
      if (document.hidden) cancelDraw();
      else queue();
    };
    document.addEventListener("visibilitychange", visibility);
    const blur = () => {
      press.current = null;
    };
    window.addEventListener("blur", blur);
    const focus = () => {
      if (document.activeElement !== document.body) focusSerial.current++;
    };
    document.addEventListener("focusin", focus);
    const rm = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduce(rm.matches);
    rm.addEventListener("change", change);
    let density;
    const dprChange = () => {
      press.current = null;
      density?.removeEventListener("change", dprChange);
      density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      density.addEventListener("change", dprChange);
      queue();
    };
    dprChange();
    const lost = () => {
      cancelDraw();
      press.current = null;
      setCapable(false);
      setMessage("绘制上下文暂不可用，场景数据保留，可用列表操作并重试绘制。");
    };
    const restored = () => queue();
    canvas.current.addEventListener("contextlost", lost);
    canvas.current.addEventListener("contextrestored", restored);
    queue();
    return () => {
      alive.current = false;
      cancelDraw();
      press.current = null;
      ro?.disconnect();
      window.removeEventListener("resize", geometry);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("focusin", focus);
      rm.removeEventListener("change", change);
      density?.removeEventListener("change", dprChange);
      canvas.current?.removeEventListener("contextlost", lost);
      canvas.current?.removeEventListener("contextrestored", restored);
      queueRef.current = () => {};
    };
  }, []);
  useLayoutEffect(() => {
    press.current = null;
    queueRef.current();
  }, [model, data.zoom, data.alpha]);
  const add = (kind) => {
    const old = modelRef.current;
    if (old.items.length >= 8) {
      setMessage("教学上限8个对象；这是练习限额，不是性能结论。");
      return;
    }
    const n = ++serial.current,
      o = {
        id: `S${n}`,
        kind,
        x: 100 + (n % 4) * 120,
        y: 80 + (Math.floor(n / 4) % 2) * 180,
        w: kind === "circle" ? 64 : 90,
        h: kind === "circle" ? 64 : 64,
        color: ["#7062ad", "#327d85", "#a76c3b"][n % 3],
      };
    update({ items: [...old.items, o], selected: o.id });
    patch({ added: true });
    setMessage(
      `已添加${o.id}，当前${old.items.length + 1}个场景对象，已请求重绘。`,
    );
  };
  const select = (id) => {
    const old = modelRef.current;
    update({ ...old, selected: id }, false);
    if (id) patch({ selectedSeen: true });
    setMessage(
      id
        ? `已选择${id}；可用方向按钮移动。`
        : "未命中图形；没有删除对象，可用列表选择。",
    );
  };
  const move = (dx, dy) => {
    const old = modelRef.current,
      o = old.items.find((x) => x.id === old.selected);
    if (!o) {
      setMessage("没有所选对象，请添加或从列表选择。");
      return;
    }
    const next = clampShape(o, o.x + dx, o.y + dy);
    if (next.x === o.x && next.y === o.y) {
      setMessage("已到逻辑场景边界，图形保持完整，不继续越界。");
      return;
    }
    update({ ...old, items: old.items.map((x) => (x.id === o.id ? next : x)) });
    patch({ moved: true });
    setMessage(`已移动${o.id}到${next.x}, ${next.y}；可撤销。`);
  };
  const remove = () => {
    const old = modelRef.current,
      index = old.items.findIndex((o) => o.id === old.selected);
    if (index < 0) {
      setMessage("没有所选对象，未执行删除。");
      return;
    }
    const items = old.items.filter((o) => o.id !== old.selected);
    update({
      items,
      selected: items[Math.min(index, items.length - 1)]?.id ?? null,
    });
    patch({ deleted: true });
    setMessage(`已删除${old.selected}；可撤销，操作按钮仍保留。`);
  };
  const undo = () => {
    if (!history.current.length) {
      setMessage("没有可撤销操作；选择本身不计入撤销历史。");
      return;
    }
    update(history.current.pop(), false);
    patch({ undone: true });
    setMessage("已撤销最近一次数据修改；最多保留20步，不依赖位图截图。");
  };
  const clear = () => {
    if (!modelRef.current.items.length) {
      setMessage("画布已经为空；可添加、恢复初始或撤销。");
      return;
    }
    update({ items: [], selected: null });
    setMessage("画布为空：像素透明，对象列表为空。可添加、撤销或恢复初始。");
  };
  const inspect = () => {
    cancelDraw();
    const m = drawRef.current();
    patch({ inspected: true });
    setInspection(
      m
        ? `CSS ${m.cssWidth.toFixed(1)}×${m.cssHeight.toFixed(1)}；位图 ${m.width}×${m.height}；DPR ${m.dpr.toFixed(2)}；视图 ${Math.round(data.zoom * 100)}%；场景${modelRef.current.items.length}个对象，Canvas内部图形DOM节点0。改变位图尺寸会清空像素，但模型仍在，随后重绘。`
        : "Canvas 2D暂不可用；外部对象列表与操作仍保留，重试绘制不会丢场景。",
    );
  };
  const up = (e) => {
    const p = press.current;
    press.current = null;
    if (!capable) {
      setMessage("绘制不可用时请用外部列表选择，避免命中不可见图形。");
      return;
    }
    if (
      !p ||
      p.id !== e.pointerId ||
      p.moved ||
      performance.now() - p.time > 600
    ) {
      setMessage(
        "本次按压未执行选择：拖动、长按或取消保持场景，移动请用按钮。",
      );
      return;
    }
    const pos = canvasPoint(
      e.clientX,
      e.clientY,
      canvas.current.getBoundingClientRect(),
      opts.current.zoom,
    );
    select(canvasHit(modelRef.current.items, pos.x, pos.y));
  };
  return (
    <div
      className="canvas24-lab"
      data-count={model.items.length}
      data-selected={model.selected ?? "none"}
    >
      <div className="canvas24-controls">
        <div className="canvas24-buttons">
          <button ref={addButton} onClick={() => add("circle")}>
            添加圆形
          </button>
          <button onClick={() => add("rect")}>添加矩形</button>
          <button onClick={undo}>撤销一步</button>
          <button onClick={clear}>清空画布</button>
          <button
            onClick={() => {
              update(sceneInitial());
              setMessage("已恢复初始3个图形；这次恢复也可撤销。");
            }}
          >
            恢复初始图形
          </button>
        </div>
        <label className="canvas24-caption">
          场景标题
          <input
            value={data.caption}
            maxLength={80}
            onChange={(e) => patch({ caption: e.target.value })}
          />
        </label>
        <button
          onClick={() => patch({ caption: "一块位图，多份可撤销的图形数据" })}
        >
          填入标题示例
        </button>
      </div>
      <h3 className="canvas24-title">
        {data.caption || "未填写标题，场景仍可操作"}
      </h3>
      <p id="canvas24-help" className="canvas24-guide">
        画布内短按选择，移动用外部按钮；未实现拖拽。长按、滑动或取消不移动图形。缩放只改变视图，靠边对象可能在窗口外，列表仍完整，可回100%。棋盘格是CSS底纹，Canvas背景像素实际透明。
      </p>
      <div className="canvas24-wrapper" ref={wrapper}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Canvas二维场景，${model.items.length}个图形，所选${model.selected ?? "无"}`}
          aria-describedby="canvas24-help"
          onPointerDown={(e) => {
            if (e.isPrimary === false || e.button !== 0) return;
            press.current = {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              time: performance.now(),
              moved: false,
            };
          }}
          onPointerMove={(e) => {
            const p = press.current;
            if (
              p &&
              p.id === e.pointerId &&
              Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8
            )
              p.moved = true;
          }}
          onPointerUp={up}
          onPointerCancel={() => {
            press.current = null;
          }}
          onPointerLeave={() => {
            press.current = null;
          }}
        >
          本地Canvas图形；请使用下方对象列表和按钮获得完整操作与说明。
        </canvas>
      </div>
      {!capable && (
        <p className="canvas24-fallback">
          Canvas
          2D不可用，未用DOM图形冒充画布；列表仍可读可操作，点击读取可重试绘制。
        </p>
      )}
      <p className="canvas24-metrics">
        CSS {info.cssWidth.toFixed(1)}×{info.cssHeight.toFixed(1)} · 位图{" "}
        {info.width}×{info.height} · DPR {info.dpr.toFixed(2)} ·{" "}
        {Math.round(data.zoom * 100)}%视图。
        {model.items.length === 0
          ? "画布为空，可撤销或添加。"
          : "点击未命中可通过列表选择。"}
      </p>
      <div className="canvas24-controls">
        <div className="canvas24-buttons">
          {[0.75, 1, 1.25].map((z) => (
            <button
              key={z}
              aria-pressed={data.zoom === z}
              onClick={() =>
                patch({
                  zoom: z,
                  zoomChanged: data.zoomChanged || data.zoom !== z,
                })
              }
            >
              视图{Math.round(z * 100)}%
            </button>
          ))}
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.alpha}
            onChange={(e) =>
              patch({ alpha: e.target.checked, alphaChanged: true })
            }
          />
          半透明图形（40%不透明度）
        </label>
        <p className="micro">
          仅填充半透明，ID与选中轮廓保持清晰。本例按几何命中，半透明不代表点击穿透。DPR改变位图密度，视图倍率改变场景映射；命中不重复乘DPR。撤销只撤图形数据，不撤标题、视图和透明度偏好。
        </p>
        <div className="canvas24-buttons">
          <button onClick={() => move(-30, 0)}>所选向左30</button>
          <button onClick={() => move(30, 0)}>所选向右30</button>
          <button onClick={() => move(0, -30)}>所选向上30</button>
          <button onClick={() => move(0, 30)}>所选向下30</button>
          <button onClick={remove}>删除所选</button>
          <button onClick={inspect}>读取尺寸与重绘</button>
        </div>
      </div>
      <div className="canvas24-objects">
        <h3>画布外对象列表（应用额外提供）</h3>
        {model.items.length ? (
          <ul ref={list} aria-label="Canvas对象列表">
            {model.items.map((o) => (
              <li key={o.id}>
                <button
                  data-canvas-object={o.id}
                  aria-pressed={model.selected === o.id}
                  onClick={() => select(o.id)}
                >
                  选择{o.id} {o.kind === "circle" ? "圆形" : "矩形"}
                </button>
                <span>
                  {o.x}, {o.y} · {o.w}×{o.h}逻辑单位
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>没有对象。添加、撤销和恢复初始入口都在画布外保留。</p>
        )}
      </div>
      <p className="canvas24-inspection">
        {inspection ||
          "读取尺寸可强制重绘并核对DPR。数据不放在像素里；resize保留同一份场景，换站/刷新/离课则还原本次实验，学习记录另存。"}
      </p>
      <div className="canvas24-explain">
        <p>{canvasScope}</p>
        <p>
          本例没有动画：系统减少动态{reduce ? "开启" : "关闭"}
          也能完整操作。仅在数据、视图、尺寸或DPR变化后请求一次重绘，空闲无循环；隐藏取消待处理帧，恢复重绘，卸载清理监听/observer。背景为空不代表还有不可见对象，列表和命中都来自同一份场景数据。
        </p>
        <p>
          DOM/SVG可提供逐对象结构与语义；Canvas要自己维护模型、命中、历史与辅助操作。按对象数量、交互和重绘特点实测选型，不宣称Canvas总比SVG快；本课不使用WebGL或3D。
        </p>
      </div>
      <div role="status" className="canvas24-status">
        {message}
      </div>
    </div>
  );
}
