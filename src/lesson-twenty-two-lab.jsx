import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { scrollMetrics, scrollScope } from "./lesson-twenty-two-content";
const reduceQuery = "(prefers-reduced-motion: reduce)",
  shortQuery = "(max-height: 600px), (max-width: 360px)";
export default function ScrollWorkbench({ data, patch }) {
  const viewport = useRef(null),
    content = useRef(null),
    target = useRef(null),
    entryArt = useRef(null),
    alive = useRef(true),
    frame = useRef(0),
    pendingScroll = useRef(false),
    last = useRef(null),
    recorded = useRef(new Set()),
    current = useRef(data),
    patchRef = useRef(patch),
    requestRef = useRef(() => {}),
    measureRef = useRef(() => {}),
    entry = useRef(null),
    observer = useRef(null),
    entrySeen = useRef(false),
    epoch = useRef(0);
  const [metrics, setMetrics] = useState(() => scrollMetrics(0, 0, 0)),
    [triggered, setTriggered] = useState(false),
    [inspection, setInspection] = useState(""),
    [systemReduce, setSystemReduce] = useState(
      () => matchMedia(reduceQuery).matches,
    ),
    [short, setShort] = useState(() => matchMedia(shortQuery).matches),
    [hidden, setHidden] = useState(document.hidden),
    [entryEpoch, setEntryEpoch] = useState(0);
  const nativeSupported =
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline", "scroll(nearest block)"),
    ioSupported = typeof IntersectionObserver === "function",
    resizeSupported = typeof ResizeObserver === "function";
  const dynamic =
    !data.noMotion && !systemReduce && !data.forceStatic && !hidden;
  current.current = { ...data, dynamic };
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
  measureRef.current = () => {
    if (!alive.current || !viewport.current || document.hidden) return;
    const el = viewport.current,
      m = scrollMetrics(
        el.scrollTop,
        el.scrollHeight,
        el.clientHeight,
        current.current.range,
      ),
      old = last.current;
    last.current = m;
    setMetrics(m);
    if (pendingScroll.current && old) {
      mark({
        forwardSeen: m.position > old.position + 1,
        backSeen: m.position < old.position - 1,
      });
    }
    pendingScroll.current = false;
    if (old && old.max > 0 && Math.abs(old.max - m.max) > 1)
      mark({ heightChanged: true });
  };
  const cancelEntry = () => {
    entry.current?.cancel();
    entry.current = null;
  };
  useLayoutEffect(() => {
    alive.current = true;
    const generation = ++epoch.current;
    const request = () => {
      if (!alive.current || document.hidden || frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (alive.current && epoch.current === generation) measureRef.current();
      });
    };
    requestRef.current = request;
    const scroll = () => {
      pendingScroll.current = true;
      request();
    };
    viewport.current.addEventListener("scroll", scroll, { passive: true });
    const ro = resizeSupported ? new ResizeObserver(request) : null;
    ro?.observe(viewport.current);
    ro?.observe(content.current);
    window.addEventListener("resize", request);
    const mq = matchMedia(reduceQuery),
      sq = matchMedia(shortQuery),
      reduce = () => setSystemReduce(mq.matches),
      size = () => setShort(sq.matches);
    mq.addEventListener("change", reduce);
    sq.addEventListener("change", size);
    const visibility = () => {
      setHidden(document.hidden);
      if (document.hidden) {
        if (frame.current) cancelAnimationFrame(frame.current);
        frame.current = 0;
        pendingScroll.current = false;
        cancelEntry();
      } else request();
    };
    document.addEventListener("visibilitychange", visibility);
    request();
    return () => {
      alive.current = false;
      epoch.current++;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      requestRef.current = () => {};
      viewport.current?.removeEventListener("scroll", scroll);
      ro?.disconnect();
      window.removeEventListener("resize", request);
      mq.removeEventListener("change", reduce);
      sq.removeEventListener("change", size);
      document.removeEventListener("visibilitychange", visibility);
      cancelEntry();
    };
  }, []);
  useLayoutEffect(() => {
    requestRef.current();
  }, [
    data.range,
    data.longContent,
    data.caption,
    data.noMotion,
    data.forceStatic,
    systemReduce,
    short,
  ]);
  useEffect(() => {
    if (!dynamic) cancelEntry();
  }, [dynamic]);
  useEffect(() => {
    if (!ioSupported || data.forceStatic) return;
    const own = epoch.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          !alive.current ||
          epoch.current !== own ||
          observer.current !== io ||
          entrySeen.current
        )
          return;
        if (
          !entries.some((x) => x.isIntersecting && x.intersectionRatio >= 0.5)
        )
          return;
        entrySeen.current = true;
        setTriggered(true);
        mark({ entrySeen: true });
        io.unobserve(target.current);
        if (
          current.current.dynamic &&
          typeof entryArt.current?.animate === "function"
        )
          try {
            const animation = entryArt.current.animate(
              [
                { transform: "translateY(0)" },
                { transform: "translateY(-8px)" },
                { transform: "translateY(0)" },
              ],
              { duration: 600, easing: "ease-out" },
            );
            entry.current = animation;
            const finish = () => {
              if (entry.current === animation) entry.current = null;
            };
            animation.finished.then(finish, finish);
          } catch {}
      },
      { root: viewport.current, threshold: [0.5] },
    );
    observer.current = io;
    io.observe(target.current);
    return () => {
      io.disconnect();
      if (observer.current === io) observer.current = null;
    };
  }, [entryEpoch, data.forceStatic]);
  const move = (fraction) => {
    const el = viewport.current;
    el.scrollTo({
      top: Math.max(0, el.scrollHeight - el.clientHeight) * fraction,
      behavior: "instant",
    });
    requestRef.current();
  };
  const inspect = () => {
    measureRef.current();
    const el = viewport.current,
      m = scrollMetrics(
        el.scrollTop,
        el.scrollHeight,
        el.clientHeight,
        current.current.range,
      );
    setInspection(
      `scrollTop ${m.position.toFixed(0)}px；scrollHeight ${el.scrollHeight}px − clientHeight ${el.clientHeight}px = ${m.max.toFixed(0)}px；当前区间 ${m.start.toFixed(0)}–${m.end.toFixed(0)}px。无滚动距离时进度为0，不除以0。`,
    );
    mark({ inspected: true });
  };
  return (
    <div
      className="scroll22-lab"
      data-dynamic={dynamic}
      data-native={nativeSupported}
      data-short={short}
      data-progress={metrics.progress.toFixed(4)}
      data-whole={metrics.whole.toFixed(4)}
      data-max={metrics.max}
    >
      <div className="scroll22-controls">
        <div className="scroll22-buttons">
          <button
            aria-pressed={data.range === "full"}
            onClick={() => patch({ range: "full", rangeCompared: true })}
          >
            全程0%–100%
          </button>
          <button
            aria-pressed={data.range === "middle"}
            onClick={() => patch({ range: "middle", rangeCompared: true })}
          >
            中段20%–80%
          </button>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.longContent}
            onChange={(e) => patch({ longContent: e.target.checked })}
          />
          增加长内容，重算滚动距离
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.noMotion}
            onChange={(e) =>
              patch({ noMotion: e.target.checked, reducedChecked: true })
            }
          />
          减少动态：保留静态内容
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.forceStatic}
            onChange={(e) =>
              patch({ forceStatic: e.target.checked, fallbackReviewed: true })
            }
          />
          模拟能力不足：静态阅读
        </label>
        <label className="scroll22-caption">
          实验标题
          <input
            value={data.caption}
            maxLength={80}
            onChange={(e) => patch({ caption: e.target.value })}
          />
        </label>
        <button
          onClick={() =>
            patch({ caption: "让阅读进度帮助理解，不替用户决定滚动节奏" })
          }
        >
          填入标题示例
        </button>
      </div>
      <div className="scroll22-guide">
        <strong>下面是局部滚动框，不是整页滚动动画</strong>
        <p id="scroll22-help">
          键盘Tab到框边界，使用方向键 / PageDown / Home /
          End；触屏在框内上下滑。Tab可直接离开，框外照常滚动课程。无滚动劫持、吸附或阅读锁。
        </p>
      </div>
      <div
        ref={viewport}
        className="scroll22-viewport"
        role="region"
        aria-label="本地滚动实验框"
        aria-describedby="scroll22-help"
        tabIndex={0}
        onFocus={(event) => {
          if (event.target !== event.currentTarget) return;
          const r = event.currentTarget.getBoundingClientRect();
          if (r.top < 90 || r.bottom > innerHeight - 12)
            event.currentTarget.scrollIntoView({
              block: "center",
              behavior: "instant",
            });
        }}
      >
        <div ref={content} className="scroll22-content">
          <div className="scroll22-pin" data-testid="scroll22-pin">
            <div className="scroll22-pin-label">
              <strong>
                {dynamic ? "绑定进度" : "静态线 · 文字进度"}{" "}
                {Math.round(metrics.progress * 100)}%
              </strong>
              <span>{metrics.phase}</span>
            </div>
            <div className="scroll22-track">
              <span
                className="scroll22-js-fill"
                style={{
                  transform: dynamic ? `scaleX(${metrics.progress})` : "none",
                }}
              />
            </div>
            <div className="scroll22-native-label">
              CSS全程对照：
              {nativeSupported && dynamic && metrics.max > 0
                ? "原生scroll timeline"
                : "静态线（未播放）"}
            </div>
            <div
              className="scroll22-native-track"
              data-scrollable={metrics.max > 0}
            >
              <span className="scroll22-native-fill" />
            </div>
          </div>
          <article className="scroll22-card">
            <span className="eyebrow">01 / 认识</span>
            <h3>{data.caption || "未填写标题，正文仍完整"}</h3>
            <p>
              滚动不是“播放下一页”的按钮。当前位置映射为0–100%进度，前滚会增加，后滚会减少。三个阶段始终保留在正常阅读顺序，不靠透明或离场把正文藏起来。
            </p>
            <p>
              主进度线绑定所选教学区间；CSS细线始终绑定整个可滚动距离。换成中段20%–80%后，两条线可以不同，并非同一范围的对错比较。
            </p>
          </article>
          <article className="scroll22-card scroll22-entry">
            <span className="eyebrow">02 / 比较</span>
            <div
              className="scroll22-entry-art"
              ref={(node) => {
                entryArt.current = node;
                target.current = node;
              }}
              aria-hidden="true"
            >
              ↗
            </div>
            <h3>进入框内触发一次</h3>
            <p className="scroll22-entry-state">
              {!ioSupported || data.forceStatic
                ? "观察能力关闭：静态内容完整提供。"
                : triggered
                  ? "已触发一次入场反馈；滚回去不会倒放这次时间播放。"
                  : "等待箭头标记至少一半进入滚动框；内容本来就可读。"}
            </p>
            <p>
              IntersectionObserver只观察交叉阈值，不代表用户已阅读，也不产生逐像素进度。此例触发后播放600ms只读箭头反馈，减少动态时只保留文字记录。滚动进度仍可前进或后退。
            </p>
            {data.longContent && (
              <div className="scroll22-extra">
                {Array.from({ length: 5 }, (_, i) => (
                  <p key={i}>
                    长内容 {i + 1}
                    ：产品说明可能增长、字号可能放大、屏幕可能变窄。应根据实际内容重新测量区间，让全部段落能正常阅读，不为保留动画而裁切正文或锁定页面。
                  </p>
                ))}
              </div>
            )}
          </article>
          <article className="scroll22-card">
            <span className="eyebrow">03 / 验收</span>
            <h3>固定的是小范围说明，不是阅读控制权</h3>
            <p>
              顶部读数带使用CSS
              sticky，仅在这个滚动框的边界内停留。pin描述“固定一段区间”的行为，具体可由CSS或库实现；sticky不等于使用了GSAP
              pin。
            </p>
            <p>
              timeline描述编排的进度轴；scrub是把动画进度跟滚动区间关联，不一定带时间追随。本例JS直接映射，没有延迟追随。原生CSS候选可用scroll()/view()，复杂编排再比较GSAP
              ScrollTrigger。
            </p>
            <p>
              减少动态或能力不足时，位移与细线动画停止，正文、阶段读数与正常滚动仍保留。短视口/有效宽度很窄时解除sticky，给阅读留空间。
            </p>
          </article>
        </div>
      </div>
      <p className="scroll22-mode">
        当前：{dynamic ? "滚动绑定装饰开启" : "静态阅读，非必要位移已停止"}
        ；系统减少动态{systemReduce ? "开启" : "关闭"}；读数带
        {short ? "已解除固定" : "仅在框内sticky"}。
        {resizeSupported
          ? "ResizeObserver自动重测内容与容器。"
          : "ResizeObserver不可用，可用下方读取按钮手动重测；窗口resize仍重测。"}
      </p>
      <div className="scroll22-controls">
        <div className="scroll22-buttons">
          <button onClick={() => move(0)}>辅助：滚到起点</button>
          <button onClick={() => move(0.5)}>辅助：滚到中段</button>
          <button onClick={() => move(1)}>辅助：滚到末尾</button>
          <button onClick={inspect}>读取真实滚动区间</button>
          <button
            onClick={() => {
              cancelEntry();
              entrySeen.current = false;
              setTriggered(false);
              setEntryEpoch((n) => n + 1);
            }}
          >
            重新观察入场
          </button>
        </div>
        <p className="micro">
          辅助按钮会真的移动同一个滚动框，不直接切换阶段。重新观察时，若目标已经在框内会立即触发；想体验再次入场，请先回到起点。
        </p>
        <p className="scroll22-inspection">
          {inspection ||
            "请真实前后滚动再读取；边界是scrollHeight − clientHeight，内容增长后百分比可能改变。"}
        </p>
      </div>
      <div className="scroll22-explain">
        <p>{scrollScope}</p>
        <p>
          sticky /
          pin是固定行为，timeline是进度轴，scrub是进度绑定。本例没有安装GSAP或平滑滚动库；原生CSS的animation-timeline必须放在animation简写后，避免被重置。只移动只读装饰，不改变正文可读性，不逐帧向live
          region播报进度。
        </p>
        <button
          onClick={() => {
            patch({ compared: true });
            if (!ioSupported || data.forceStatic)
              patch({ entrySeen: true, fallbackReviewed: true });
          }}
        >
          记录触发、绑定与候选比较
        </button>
      </div>
    </div>
  );
}
