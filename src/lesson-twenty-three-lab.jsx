import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  localPointer,
  pointerValues,
  pointerScope,
} from "./lesson-twenty-three-content";
const positions = [
  ["左上", 0.15, 0.15],
  ["右上", 0.85, 0.15],
  ["中央", 0.5, 0.5],
  ["左下", 0.15, 0.85],
  ["右下", 0.85, 0.85],
];
const query = "(prefers-reduced-motion: reduce)";
export default function PointerWorkbench({ data, patch }) {
  const bounds = useRef(null),
    readout = useRef(null),
    alive = useRef(true),
    frame = useRef(0),
    generation = useRef(0),
    pending = useRef(null),
    lastClient = useRef(null),
    point = useRef({ x: 0.5, y: 0.5, source: "复位" }),
    options = useRef(data),
    patchRef = useRef(patch),
    recorded = useRef(new Set());
  const [systemReduce, setSystemReduce] = useState(
      () => matchMedia(query).matches,
    ),
    [notice, setNotice] = useState(
      "本地只读卡片；鼠标/笔可跟随，触屏保持页面滚动。",
    ),
    [inspection, setInspection] = useState("");
  const supported = typeof PointerEvent === "function",
    dynamic = !systemReduce && !data.noMotion && !data.forceStatic;
  options.current = { ...data, dynamic };
  patchRef.current = patch;
  const mark = (flags) => {
    const fresh = {};
    for (const [k, v] of Object.entries(flags))
      if (v && !recorded.current.has(k)) {
        recorded.current.add(k);
        fresh[k] = true;
      }
    if (Object.keys(fresh).length) patchRef.current(fresh);
  };
  const apply = (x, y, source) => {
    if (!alive.current || !bounds.current) return;
    const opt = options.current,
      v = pointerValues(x, y, opt.amplitude);
    point.current = { x: v.x, y: v.y, source };
    const el = bounds.current;
    el.style.setProperty("--px", `${v.x * 100}%`);
    el.style.setProperty("--py", `${v.y * 100}%`);
    el.style.setProperty("--rx", `${opt.dynamic && opt.tilt ? v.rx : 0}deg`);
    el.style.setProperty("--ry", `${opt.dynamic && opt.tilt ? v.ry : 0}deg`);
    el.dataset.x = v.x.toFixed(4);
    el.dataset.y = v.y.toFixed(4);
    el.dataset.rx = String(opt.dynamic && opt.tilt ? v.rx : 0);
    el.dataset.ry = String(opt.dynamic && opt.tilt ? v.ry : 0);
    el.dataset.source = source;
    if (readout.current)
      readout.current.textContent = `局部坐标 ${(v.x * 100).toFixed(0)}% / ${(v.y * 100).toFixed(0)}%；${source}；倾斜 ${opt.dynamic && opt.tilt ? v.rx.toFixed(1) : "0.0"}° / ${opt.dynamic && opt.tilt ? v.ry.toFixed(1) : "0.0"}°。`;
  };
  const cancel = () => {
    generation.current++;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    pending.current = null;
  };
  const reset = (reason, record = false) => {
    cancel();
    lastClient.current = null;
    apply(0.5, 0.5, reason);
    if (record) mark({ centered: true, cleanupReviewed: true });
  };
  const schedule = (client) => {
    pending.current = client;
    if (frame.current) return;
    const token = generation.current;
    frame.current = requestAnimationFrame(() => {
      if (!alive.current || generation.current !== token) return;
      frame.current = 0;
      const latest = pending.current;
      pending.current = null;
      if (!latest || !bounds.current) return;
      const opt = options.current;
      if (
        !opt.follow ||
        !opt.dynamic ||
        matchMedia(query).matches ||
        document.hidden
      )
        return;
      const local = localPointer(
        latest.x,
        latest.y,
        bounds.current.getBoundingClientRect(),
      );
      if (!local.inside) {
        reset("指针已离开边界");
        return;
      }
      apply(local.x, local.y, "真实指针");
    });
  };
  const pointer = (e) => {
    if (
      !supported ||
      e.pointerType === "touch" ||
      e.isPrimary === false ||
      !options.current.follow ||
      !options.current.dynamic ||
      matchMedia(query).matches ||
      document.hidden
    )
      return;
    lastClient.current = { x: e.clientX, y: e.clientY };
    schedule(lastClient.current);
  };
  useLayoutEffect(() => {
    alive.current = true;
    apply(0.5, 0.5, "复位");
    const geometry = () => {
      if (
        lastClient.current &&
        options.current.dynamic &&
        options.current.follow
      )
        schedule(lastClient.current);
    };
    const blur = () => {
      reset("窗口失焦复位");
    };
    const visibility = () => {
      if (document.hidden) reset("页面隐藏复位");
    };
    const mq = matchMedia(query),
      reduce = () => {
        if (mq.matches) reset("系统减少动态复位");
        setSystemReduce(mq.matches);
      };
    window.addEventListener("scroll", geometry, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", geometry);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    mq.addEventListener("change", reduce);
    const ro =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(geometry)
        : null;
    ro?.observe(bounds.current);
    return () => {
      alive.current = false;
      cancel();
      ro?.disconnect();
      window.removeEventListener("scroll", geometry, true);
      window.removeEventListener("resize", geometry);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      mq.removeEventListener("change", reduce);
    };
  }, []);
  useLayoutEffect(() => {
    reset("模式变化复位");
  }, [dynamic, data.follow, data.noMotion, data.forceStatic, systemReduce]);
  useLayoutEffect(() => {
    apply(point.current.x, point.current.y, point.current.source);
  }, [data.amplitude, data.tilt, data.light, dynamic, data.follow]);

  const select = (x, y, name) => {
    cancel();
    lastClient.current = null;
    apply(x, y, `分区按钮：${name}`);
    mark({ alternativeSeen: name !== "中央", centered: name === "中央" });
    setNotice(
      `已选择${name}，实际CSS坐标已改变。${dynamic ? "" : "静态采样保留，倾斜已暂停。"}`,
    );
  };
  const inspect = () => {
    const rect = bounds.current.getBoundingClientRect();
    setInspection(
      `边界相对视口 left ${rect.left.toFixed(0)} / top ${rect.top.toFixed(0)}，宽 ${rect.width.toFixed(0)} × 高 ${rect.height.toFixed(0)}；当前 ${(point.current.x * 100).toFixed(0)}% / ${(point.current.y * 100).toFixed(0)}%。每次提交重新测未变形外壳，不缓存旧页面坐标；当前无持续rAF。`,
    );
    mark({ inspected: true });
  };
  return (
    <div
      className="pointer23-lab"
      data-dynamic={dynamic}
      data-light={data.light}
      data-tilt={data.tilt}
    >
      <div className="pointer23-controls">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.follow}
            onChange={(e) => patch({ follow: e.target.checked })}
          />
          启用鼠标 / 笔局部跟随
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.light}
            onChange={(e) =>
              patch({ light: e.target.checked, lightChanged: true })
            }
          />
          显示聚光装饰
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.tilt}
            onChange={(e) => patch({ tilt: e.target.checked })}
          />
          启用CSS平面倾斜
        </label>
        <div className="pointer23-buttons">
          {[2, 5, 8].map((n) => (
            <button
              key={n}
              aria-pressed={data.amplitude === n}
              onClick={() =>
                patch({
                  amplitude: n,
                  tiltChanged: data.tiltChanged || data.amplitude !== n,
                })
              }
            >
              {n === 2 ? "轻微" : n === 5 ? "适中" : "上限"}
              {n}°
            </button>
          ))}
        </div>
        <label className="pointer23-caption">
          卡片文案
          <input
            value={data.caption}
            maxLength={80}
            onChange={(e) =>
              patch({ caption: e.target.value, captionChanged: true })
            }
          />
        </label>
        <button
          onClick={() =>
            patch({
              caption: "聚光衬托内容，轻微倾斜回应输入",
              captionChanged: true,
            })
          }
        >
          填入文案示例
        </button>
      </div>
      <p className="pointer23-guide">
        效果只在下方边界内。鼠标/笔移动可体验真实跟随；触摸不跟随、不捕获指针、不阻止页面滑动。键盘
        /
        触屏使用下面分区按钮，改变同样的局部坐标。减少动态时只保留静态聚光采样与文字反馈，不倾斜。
      </p>
      <div className="pointer23-frame">
        <div
          role="group"
          className="pointer23-bounds"
          ref={bounds}
          onPointerMove={pointer}
          onPointerLeave={() => reset("离开边界复位")}
          onPointerCancel={() => reset("pointercancel复位")}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") reset("触摸保持原生滚动");
          }}
          aria-label="局部指针效果边界"
        >
          <div className="pointer23-card">
            <div className="pointer23-glow" aria-hidden="true" />
            <div className="pointer23-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="pointer23-copy">
              <span className="eyebrow">LOCAL POINTER / CSS</span>
              <h3>{data.caption || "文案为空，效果仍保持可读"}</h3>
              <p>
                内容始终可读；只有只读平面与背景装饰响应。常规CSS倾斜，不代表完整3D场景或图形扭曲。
              </p>
            </div>
          </div>
        </div>
      </div>
      <p ref={readout} className="pointer23-readout" aria-live="off">
        局部坐标 50% / 50%；复位；倾斜 0° / 0°。
      </p>
      <div className="pointer23-controls">
        <h3>键盘 / 触屏分区替代</h3>
        <div className="pointer23-positions">
          {positions.map(([name, x, y]) => (
            <button key={name} onClick={() => select(x, y, name)}>
              采样{name}
            </button>
          ))}
        </div>
        <div className="pointer23-buttons">
          <button
            onClick={() => {
              reset("手动复位", true);
              setNotice(
                "已复位到中央并取消待处理更新。按钮走同一清理路径，不假称硬件事件。",
              );
            }}
          >
            复位并检查清理
          </button>
          <button onClick={inspect}>读取局部坐标与边界</button>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.noMotion}
            onChange={(e) =>
              patch({ noMotion: e.target.checked, reducedChecked: true })
            }
          />
          减少动态：静态采样
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.forceStatic}
            onChange={(e) =>
              patch({ forceStatic: e.target.checked, fallbackReviewed: true })
            }
          />
          模拟能力不足：保留静态替代
        </label>
        <p className="pointer23-inspection">
          {inspection ||
            "坐标相对于未变形边界，滚动/resize后用当前矩形重算；分区按钮使用归一化坐标，不伪称真实指针位置。"}
        </p>
      </div>
      <div className="pointer23-explain">
        <p>{pointerScope}</p>
        <p>
          强度限制为最多±8°，聚光位置夹在0–100%。读数不逐帧live播报，装饰层pointer-events:none且无Tab目标；控件在变形区外。指针离开、取消、窗口失焦、页面隐藏或减少动态时立即复位并使旧回调失效；空闲不循环。
        </p>
        <p>
          当前：{dynamic ? "允许轻量跟随 / 倾斜" : "静态采样，跟随与倾斜暂停"}
          ；系统减少动态{systemReduce ? "开启" : "关闭"}；
          {supported
            ? "Pointer Events可用"
            : "Pointer Events不可用，请用分区按钮"}
          。未使用spring、着色器、图形扭曲或3D场景库。
        </p>
      </div>
      <div className="pointer23-status" role="status">
        {notice}
      </div>
    </div>
  );
}
