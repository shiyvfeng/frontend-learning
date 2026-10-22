import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { tool06Needs } from "./tool-six-content";
function Art({ scroll = false }) {
  return (
    <div
      className="tool06-art"
      data-scroll-art={scroll ? "" : undefined}
      data-time-art={!scroll ? "" : undefined}
      aria-label={scroll ? "滚动阶段图示" : "时间编排图示"}
    >
      <div className="tool06-lane" aria-hidden="true">
        <span data-dot className="tool06-dot" />
      </div>
      <div data-bar className="tool06-bar" aria-hidden="true" />
      <div className="tool06-art-bottom">
        <span data-badge className="tool06-badge" aria-hidden="true">
          ＋
        </span>
        <span className="tool06-progress" data-progress-text aria-live="off">
          0%
        </span>
      </div>
    </div>
  );
}
function staticPaint(root, f) {
  if (!root) return;
  const distance = Math.max(36, Math.min(260, root.clientWidth - 80));
  root.querySelector("[data-dot]").style.transform =
    `translateX(${Math.min(1, f * 2.4) * distance}px)`;
  root.querySelector("[data-bar]").style.transform =
    `scaleX(${0.1 + 0.9 * Math.max(0, Math.min(1, (f * 2.4 - 0.8) / 0.8))})`;
  root.querySelector("[data-badge]").style.transform =
    `rotate(${Math.max(0, Math.min(1, (f * 2.4 - 1.6) / 0.8)) * 180}deg)`;
  root.querySelector("[data-progress-text]").textContent =
    `${Math.round(f * 100)}%`;
  root.dataset.progress = String(f);
  root.dataset.time = String(f * 2.4);
  root.dataset.paused = "true";
  root.dataset.runtime = "static";
}
export default function Tool06Workbench({ data, patch }) {
  const root = useRef(null),
    viewport = useRef(null),
    time = useRef(null),
    engine = useRef(null),
    alive = useRef(true),
    generation = useRef(0),
    recorded = useRef(new Set()),
    latest = useRef(data),
    patchRef = useRef(patch),
    fraction = useRef(0);
  latest.current = data;
  patchRef.current = patch;
  const [api, setApi] = useState(null),
    [error, setError] = useState(false),
    [notice, setNotice] = useState(
      "默认暂停。图示无交互控件，阶段文字一直可读。",
    ),
    [inspection, setInspection] = useState(null),
    [epoch, setEpoch] = useState(0),
    [reduce, setReduce] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [short, setShort] = useState(() => innerHeight < 620 || innerWidth < 360),
    [hidden, setHidden] = useState(document.hidden);
  const mark = (flags) => {
    const fresh = {};
    for (const [k, v] of Object.entries(flags))
      if (v && !recorded.current.has(k)) {
        recorded.current.add(k);
        fresh[k] = true;
      }
    if (Object.keys(fresh).length && alive.current) patchRef.current(fresh);
  };
  const dynamic =
    !!api && !error && !reduce && !hidden && data.mode === "normal";
  useEffect(() => {
    alive.current = true;
    const id = ++generation.current;
    import("./tool-six-runtime").then(
      (mod) => {
        if (alive.current && generation.current === id) setApi(mod);
      },
      () => {
        if (alive.current && generation.current === id) setError(true);
      },
    );
    const mq = matchMedia("(prefers-reduced-motion: reduce)"),
      media = () => setReduce(mq.matches),
      resize = () => setShort(innerHeight < 620 || innerWidth < 360),
      visibility = () => setHidden(document.hidden);
    mq.addEventListener("change", media);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive.current = false;
      generation.current++;
      mq.removeEventListener("change", media);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useLayoutEffect(() => {
    let owned = true;
    fraction.current = 0;
    const art =
      data.step === 0
        ? time.current
        : root.current.querySelector("[data-scroll-art]");
    staticPaint(art, 0);
    if (!dynamic) {
      api?.shutdown();
      root.current.dataset.runtime = "static";
      root.current.dataset.triggerCount = "0";
      root.current.dataset.scrollProgress = "0.00000";
      root.current.dataset.pin = "false";
      return;
    }
    const instance =
      data.step === 0
        ? api.createTimeScene(time.current, (text) => {
            if (owned && alive.current) setNotice(text);
          })
        : api.createScrollScene(
            root.current,
            viewport.current,
            {
              distance: Number(data.distance),
              pin: data.pin && !short,
              scrub: data.scrub,
            },
            (flags) => {
              if (owned && alive.current) mark(flags);
            },
          );
    engine.current = instance;
    if (data.step === 0) instance.speed(Number(latest.current.speed));
    return () => {
      owned = false;
      instance.dispose();
      if (engine.current === instance) engine.current = null;
    };
  }, [
    api,
    dynamic,
    data.step,
    data.pin,
    data.scrub,
    data.distance,
    short,
    epoch,
  ]);
  useEffect(() => {
    if (data.step === 0) engine.current?.speed(Number(data.speed));
  }, [data.speed, data.step]);
  const seek = (f) => {
    if (engine.current) engine.current.seek(f);
    else {
      staticPaint(
        data.step === 0
          ? time.current
          : root.current.querySelector("[data-scroll-art]"),
        f,
      );
      if (f > fraction.current) mark({ forwardSeen: true });
      if (f < fraction.current) mark({ backSeen: true });
      fraction.current = f;
    }
    setNotice(
      engine.current
        ? data.step === 0
          ? "已暂停并跳到时间线阶段。"
          : "辅助按钮已实际定位局部滚动框；不是触摸/键盘滚动手势。"
        : "静态阶段示意已改变；这不是实际GSAP播放或ScrollTrigger绑定。",
    );
  };
  const command = (kind) => {
    mark({
      [kind === "play"
        ? "playedSeen"
        : kind === "pause"
          ? "pausedSeen"
          : "reversedSeen"]: true,
    });
    if (engine.current) {
      engine.current[kind]();
      setNotice(
        kind === "play"
          ? "时间线播放中，可立即暂停或反向。"
          : kind === "pause"
            ? "已暂停当前时间线；没有自动恢复。"
            : "从当前时间反向，不重新从终点开始。",
      );
    } else {
      seek(kind === "play" ? 1 : kind === "reverse" ? 0 : fraction.current);
      setNotice(
        "当前采用静态/加载回退：按钮只改变或保留阶段示意，不冒称GSAP运行。",
      );
    }
  };
  const reset = () => {
    setEpoch((n) => n + 1);
    setInspection(null);
    mark({ resetSeen: true });
    setNotice("场景已暂停并回起点，旧实例及其占位会先清理；学习成果仍保留。");
  };
  const inspect = () => {
    const sample = engine.current?.inspect() || {
      kind: "static",
      progress: fraction.current,
      triggerCount: 0,
      pin: false,
      reason: error
        ? "module-error"
        : reduce
          ? "system-reduce"
          : hidden
            ? "hidden"
            : data.mode === "static"
              ? "manual-static"
              : "loading",
    };
    setInspection(sample);
    mark({
      measuredSeen: true,
      ...(engine.current ? { runtimeSeen: true } : {}),
    });
    setNotice("已读取当前实例快照；不是每帧播报或生产验收。");
  };
  const change = (flags) => {
    patch({
      ...flags,
      draftStale: data.generated || data.draftStale,
      reviewed: false,
    });
    setNotice("参数改变：旧场景先清理，再从起点建立；不自动续播。");
  };
  return (
    <div
      className="tool06-lab"
      ref={root}
      data-policy={dynamic ? "active" : "static"}
      data-kind={data.step === 0 ? "time" : "scroll"}
    >
      <div className="tool06-panel">
        <h3>按需求选择，不按库名排名</h3>
        <div className="tool06-buttons">
          {tool06Needs.map((n) => (
            <button
              key={n.id}
              aria-pressed={data.need === n.id}
              onClick={() =>
                patch((old) => ({
                  need: n.id,
                  needsSeen: [...new Set([...old.needsSeen, n.id])],
                  draftStale: old.generated || old.draftStale,
                  reviewed: false,
                }))
              }
            >
              {n.label}
            </button>
          ))}
        </div>
        <p>{tool06Needs.find((n) => n.id === data.need)?.why}</p>
      </div>
      <div className="tool06-runtime">
        <strong>
          {dynamic
            ? data.step === 0
              ? "真实GSAP3.15.0 · 时间线"
              : "真实ScrollTrigger3.15.0 · 局部滚动绑定"
            : error
              ? "GSAP模块加载失败 · 明确静态回退"
              : reduce
                ? "系统减少动态 · 静态阶段"
                : hidden
                  ? "页面隐藏 · 动画已停止"
                  : data.mode === "static"
                    ? "用户静态阶段"
                    : "模块准备中 · 静态阶段"}
        </strong>
        <p>
          两类时间线互相独立；静态示意不能算实际动画验证。改变策略/滚动参数会回起点，恢复正常不会自动补播。
        </p>
        {error && (
          <div className="tool06-buttons">
            <button
              onClick={() => {
                mark({ fallbackAcknowledged: true });
                setNotice("已确认本次未验证真实GSAP；可在恢复后补测。");
              }}
            >
              确认静态回退边界并继续
            </button>
            <button onClick={() => location.reload()}>
              重载页面重试GSAP模块
            </button>
          </div>
        )}
      </div>
      <div className="tool06-controls">
        <label htmlFor="tool06-mode">动态策略</label>
        <select
          id="tool06-mode"
          value={data.mode}
          onChange={(e) => change({ mode: e.target.value })}
        >
          <option value="normal">正常（尊重系统减少动态）</option>
          <option value="static">静态阶段示意</option>
        </select>
        {data.step === 0 ? (
          <>
            <label htmlFor="tool06-speed">仅时间播放速度</label>
            <select
              id="tool06-speed"
              value={data.speed}
              onChange={(e) => patch({ speed: e.target.value })}
            >
              <option value="1">1倍</option>
              <option value="0.5">0.5倍观察</option>
            </select>
          </>
        ) : (
          <>
            <label htmlFor="tool06-distance">滚动区间距离</label>
            <select
              id="tool06-distance"
              value={data.distance}
              onChange={(e) => change({ distance: e.target.value })}
            >
              <option value="480">480px</option>
              <option value="720">720px</option>
            </select>
            <label htmlFor="tool06-scrub">scrub追随方式</label>
            <select
              id="tool06-scrub"
              value={data.scrub}
              onChange={(e) => {
                mark({ scrubSeen: true });
                change({ scrub: e.target.value });
              }}
            >
              <option value="direct">true · 直接绑定</option>
              <option value="catchup">0.35秒 · 缓冲追随</option>
            </select>
            <label className="checkbox-label" htmlFor="tool06-pin">
              <input
                id="tool06-pin"
                type="checkbox"
                checked={data.pin}
                onChange={(e) => {
                  mark({ pinSeen: true });
                  change({ pin: e.target.checked });
                }}
              />
              区间内固定图示（pin）
            </label>
          </>
        )}
      </div>
      {data.step === 0 ? (
        <>
          <div className="tool06-buttons">
            <button onClick={() => command("play")}>播放时间线</button>
            <button onClick={() => command("pause")}>暂停时间线</button>
            <button onClick={() => command("reverse")}>反向时间线</button>
          </div>
          <div ref={time} data-time-root>
            <Art />
          </div>
          <div className="tool06-buttons">
            {[0, 0.5, 1].map((f) => (
              <button key={f} onClick={() => seek(f)}>
                时间线跳到{f * 100}%
              </button>
            ))}
          </div>
          <p>
            总长2.4秒：移动0–1秒；绘制0.8–1.6秒（与移动重叠0.2秒）；翻转1.6–2.4秒。跳阶段会暂停，不必等完整动画。
          </p>
        </>
      ) : (
        <>
          <p className="tool06-boundary">
            只在下方边框内滚动。Tab聚焦后可用原生PageDown/End/Home，Tab仍能离开；框外页面正常滚动。
            {short
              ? "短视口/极窄屏已取消pin，scrub仍可用。"
              : data.pin && dynamic
                ? "只固定无交互图示，预留实际占位。"
                : "当前不固定图示。"}{" "}
            本例不捕获滚轮或触摸，不使用滚动平滑/锁页。
          </p>
          <div
            ref={viewport}
            className="tool06-viewport"
            role="region"
            aria-label="T06局部原生滚动实验框"
            tabIndex={0}
            onFocus={(e) => {
              if (e.target !== e.currentTarget) return;
              const r = e.currentTarget.getBoundingClientRect();
              if (r.top < 80 || r.bottom > innerHeight - 12)
                e.currentTarget.scrollIntoView({
                  block: "center",
                  behavior: "instant",
                });
            }}
          >
            <div className="tool06-scroll-intro">
              区间前 · 到图示顶部对齐框顶部时开始
            </div>
            <div data-scroll-track>
              <Art scroll />
            </div>
            <div className="tool06-scroll-outro">
              <p>区间后 · 普通内容继续阅读，控件在框外。</p>
              <p>静态模式不绑定滚动，完整阶段说明始终在实验框之后。</p>
            </div>
          </div>
          <div className="tool06-buttons">
            {[0, 0.5, 1].map((f) => (
              <button key={f} onClick={() => seek(f)}>
                {dynamic ? "辅助定位滚动" : "静态示意跳到"}
                {f * 100}%
              </button>
            ))}
          </div>
          <p>
            scrub:true让区间直接对应阶段；0.35秒让图示追随滚动目标。初始化/刷新时可能直接对齐当前阶段，已建立绑定后再缓冲追随。它不是480/720px的距离，也不是整个时间线总长。进入视口后播放一次（第22课）是另一种机制。
          </p>
        </>
      )}
      <ol className="tool06-phases">
        <li>移动：定位教学圆点，正文不移动。</li>
        <li>绘制：横条进展，与移动有少量重叠。</li>
        <li>翻转：旋转装饰符号，数值和含义有文字。</li>
      </ol>
      <div className="tool06-buttons">
        <button onClick={inspect}>读取真实实例与区间快照</button>
        <button onClick={reset}>恢复场景起点</button>
      </div>
      {inspection && (
        <pre
          className="tool06-snapshot"
          data-snapshot={JSON.stringify(inspection)}
        >
          {JSON.stringify(inspection, null, 2)}
        </pre>
      )}
      <p className="tool06-feedback" role="status">
        {notice}
      </p>
      <p className="tool06-boundary">
        固定原创教学图示；不是动画创作器、资产或代码导出服务。没有真实服务器或性能跑分。GSAP启用时有库自身的监听和帧调度，本课不额外每帧重建React；静态、隐藏、离站时清理本例并关闭独占插件服务。
      </p>
    </div>
  );
}
