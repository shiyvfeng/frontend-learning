import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Note, Choices } from "./lesson-two";

export const springPresets = {
  calm: { stiffness: 280, damping: 30, mass: 1 },
  bouncy: { stiffness: 240, damping: 11, mass: 1 },
};
// A small local integrator, not Motion. Semi-implicit Euler with bounded substeps.
export function springStep(
  x,
  v,
  target,
  dt,
  { stiffness: k, damping: c, mass: m },
) {
  const n = Math.max(1, Math.ceil(dt / (1 / 120))),
    h = dt / n;
  for (let i = 0; i < n; i++) {
    v += ((-k * (x - target) - c * v) / m) * h;
    x += v * h;
  }
  return { x, v };
}
function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduce(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduce;
}
function useSpring(ref, target, preset, reduced, enabled) {
  const physics = useRef({ x: 0, v: 0 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    let frame = 0,
      last = 0,
      elapsed = 0;
    const write = () => {
      node.style.transform = `translateY(${physics.current.x}px)`;
      node.dataset.value = String(physics.current.x);
    };
    if (reduced) {
      physics.current = { x: 0, v: 0 };
      write();
      node.dataset.motion = "settled";
      return;
    }
    const tick = (now) => {
      const dt = last ? Math.min((now - last) / 1000, 0.032) : 1 / 60;
      last = now;
      elapsed += dt;
      physics.current = springStep(
        physics.current.x,
        physics.current.v,
        target,
        dt,
        springPresets[preset],
      );
      write();
      if (
        (Math.abs(physics.current.x - target) < 0.01 &&
          Math.abs(physics.current.v) < 0.03) ||
        elapsed > 2.5
      ) {
        physics.current = { x: target, v: 0 };
        write();
        node.dataset.motion = "settled";
        return;
      }
      node.dataset.motion = "running";
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      node.dataset.motion = "stopped";
    };
  }, [ref, target, preset, reduced, enabled]);
}
function FeedbackButton({ kind, data, reduced, report, disabled = false }) {
  const ref = useRef(null),
    held = useRef(null),
    blocked = useRef(false),
    keyHeld = useRef(null);
  const [press, setPress] = useState(false),
    [hover, setHover] = useState(false),
    [focus, setFocus] = useState(false),
    [selected, setSelected] = useState(false),
    [count, setCount] = useState(0),
    [message, setMessage] = useState("尚未激活");
  const cancel = (reason) => {
    const was = held.current || keyHeld.current;
    held.current = null;
    keyHeld.current = null;
    blocked.current = true;
    setPress(false);
    if (was) setMessage(`已取消按压：${reason}；未激活`);
  };
  useEffect(() => {
    const blur = () => cancel("窗口失焦"),
      visibility = () => {
        if (document.hidden) cancel("页面隐藏");
      };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (disabled) {
      cancel("操作不可用");
      setHover(false);
      setFocus(false);
    }
  }, [disabled]);
  const target =
    disabled || reduced
      ? 0
      : press
        ? data.strength
        : hover
          ? -data.strength
          : 0;
  useSpring(ref, target, data.preset, reduced, kind === "spring");
  const inside = (e) => {
    const r = ref.current.getBoundingClientRect();
    return (
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom
    );
  };
  const activate = () => {
    setSelected((v) => !v);
    setCount((v) => v + 1);
    setMessage("已激活：仅切换本地收藏；未联网");
    report(kind);
  };
  return (
    <article
      className="micro-demo"
      data-kind={kind}
      data-reduced={String(reduced)}
    >
      <h3>{kind === "css" ? "CSS transition" : "手写 spring"}</h3>
      <p>
        {kind === "css"
          ? `transform / 背景色 · ${data.duration}ms ease-out`
          : `rAF 积分 · k=${springPresets[data.preset].stiffness} / c=${springPresets[data.preset].damping} / m=1`}
      </p>
      <div className="micro-hit-area">
        <button
          ref={ref}
          className={`micro-target ${kind}`}
          data-testid={`micro-${kind}`}
          data-pressed={String(press)}
          data-hover={String(hover)}
          data-focused={String(focus)}
          data-count={count}
          data-target={target}
          disabled={disabled}
          aria-pressed={selected}
          aria-describedby={`micro-status-${kind}`}
          style={{
            "--micro-target": `${target}px`,
            "--micro-duration": `${data.duration}ms`,
          }}
          onFocus={() => {
            setFocus(true);
            report("focus");
          }}
          onBlur={() => {
            setFocus(false);
            cancel("焦点离开");
          }}
          onPointerEnter={(e) => {
            if (!disabled && e.pointerType !== "touch") setHover(true);
          }}
          onPointerLeave={() => {
            setHover(false);
            if (held.current) cancel("指针移出");
          }}
          onPointerDown={(e) => {
            if (disabled || !e.isPrimary || e.button !== 0) return;
            held.current = e.pointerId;
            blocked.current = false;
            setPress(true);
            setMessage("按压中：松开确认，移出取消");
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
          }}
          onPointerMove={(e) => {
            if (held.current === e.pointerId && !inside(e)) cancel("指针移出");
          }}
          onPointerUp={(e) => {
            if (held.current === e.pointerId) {
              if (!inside(e)) cancel("指针移出");
              else {
                held.current = null;
                setPress(false);
              }
            }
          }}
          onPointerCancel={() => cancel("pointercancel")}
          onLostPointerCapture={() => {
            if (held.current) cancel("失去指针捕获");
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              cancel("Escape");
              return;
            }
            if ([" ", "Enter"].includes(e.key)) {
              e.preventDefault();
              if (!e.repeat && !keyHeld.current) {
                keyHeld.current = e.key;
                blocked.current = false;
                setPress(true);
                setMessage("键盘按压中：松开确认，Esc 取消");
              }
            }
          }}
          onKeyUp={(e) => {
            if ([" ", "Enter"].includes(e.key)) {
              e.preventDefault();
              if (keyHeld.current === e.key) {
                keyHeld.current = null;
                setPress(false);
                if (!blocked.current) e.currentTarget.click();
              }
            }
          }}
          onClick={(e) => {
            if (disabled || (e.detail > 0 && blocked.current)) return;
            activate();
          }}
        >
          {selected ? "✓ 已收藏" : "＋ " + (data.label.trim() || "收藏此方案")}
        </button>
      </div>
      <p className="micro-signals">
        {hover ? "● 悬停" : "○ 无悬停"} · {focus ? "● 聚焦" : "○ 未聚焦"} ·{" "}
        {press ? "● 按压中" : "○ 已松开"}
      </p>
      <p id={`micro-status-${kind}`} className="micro-result" role="status">
        {message}。激活 {count} 次 · {selected ? "已收藏" : "未收藏"}
      </p>
    </article>
  );
}
export default function MicroWorkbench({ data, patch }) {
  const systemReduced = useReducedMotion(),
    reduced = systemReduced || data.noMotion;
  const report = (kind) => {
    if (kind === "focus") patch({ focusSeen: true });
    else patch({ [kind === "css" ? "cssUsed" : "springUsed"]: true });
  };
  return (
    <div
      className="micro-lab"
      data-testid="micro-lab"
      data-reduced={String(reduced)}
    >
      <div className="micro-lab-heading">
        <strong>本地收藏实验 · 不联网</strong>
        <span className="micro">CSS 与手写 rAF 弹簧 · 未使用 Motion</span>
      </div>
      <div className="micro-controls">
        <label>
          反馈文案
          <input
            maxLength={36}
            value={data.label}
            onChange={(e) =>
              patch({ label: e.target.value, labelEdited: true })
            }
          />
        </label>
        <button
          onClick={() => patch({ label: "收藏这个交互", labelEdited: true })}
        >
          填入示例文案
        </button>
        <Choices
          label="位移强度"
          values={[
            [0, "无位移 · 0px"],
            [3, "轻 · 3px"],
            [7, "明显 · 7px"],
          ]}
          value={data.strength}
          onChange={(v) => patch({ strength: v, strengthChanged: true })}
        />
        <Choices
          label="CSS 时长"
          values={[
            [80, "80ms"],
            [160, "160ms"],
            [320, "320ms"],
          ]}
          value={data.duration}
          onChange={(v) => patch({ duration: v, durationChanged: true })}
        />
        <Choices
          label="弹簧配方"
          values={[
            ["calm", "克制 · 阻尼30"],
            ["bouncy", "弹性 · 阻尼11"],
          ]}
          value={data.preset}
          onChange={(v) => patch({ preset: v, springChanged: true })}
        />
      </div>
      <div className="micro-comparison">
        <FeedbackButton
          kind="css"
          data={data}
          reduced={reduced}
          report={report}
        />
        <FeedbackButton
          kind="spring"
          data={data}
          reduced={reduced}
          report={report}
        />
      </div>
      <button
        onClick={() =>
          document.querySelector('[data-testid="micro-css"]')?.focus()
        }
      >
        将焦点移到 CSS 示例
      </button>
      <p className="micro">
        这个辅助入口只移动真实焦点，不模拟 hover、按压或激活；也可用
        Tab。轻点同样能聚焦和激活。焦点轮廓不随减少动态消失。
      </p>
      <div className="micro-policy">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.noMotion}
            onChange={(e) =>
              patch({ noMotion: e.target.checked, reduceToggled: true })
            }
          />
          暂停非必要位移
        </label>
        <p data-testid="micro-preference">
          系统减少动态：{systemReduced ? "开启" : "关闭"} · 当前位移：
          {reduced ? "已停止" : "允许"}
          。实时响应系统偏好；手动暂停不能覆盖系统要求。
        </p>
      </div>
      <div className="micro-explain">
        <h3>读懂机制，再判断是否值得动</h3>
        <p>
          触发：鼠标 hover、真实 focus、指针或空格/Enter
          按压。变化：背景/边框表达状态，hover 上移、press 下移 {data.strength}
          px；松开恢复。焦点使用独立轮廓，不把它当可关闭的装饰。
        </p>
        <p>
          CSS 按声明的时长与缓动插值，简单颜色、透明度和两点位移通常已够。此处
          spring 是普通 JavaScript 的质量—弹簧—阻尼积分，用
          requestAnimationFrame 更新 transform，保留打断时速度，未引入
          Motion。刚度 k 决定拉向目标的力，阻尼 c 消耗速度，质量 m
          影响加速度；弹性配方阻尼较低会回弹，稳定时间由参数与当前运动决定，不承诺固定毫秒数。此教学实现设2.5秒收敛保护，非生产物理引擎。
        </p>
        <button onClick={() => patch({ compared: true })}>
          记录比较：简单反馈优先 CSS
        </button>
        <h3>取消不等于成功</h3>
        <p>
          按住后移出再松开会取消；触屏滚动或系统
          pointercancel、失去捕获、窗口失焦、键盘 Esc / blur 都清理按压。Space /
          Enter 在松开时确认，长按重复 keydown
          不重复激活。每次激活只切换本地收藏，不表示网络成功。
        </p>
        <button disabled className="micro-unavailable">
          不可用的本地操作
        </button>
        <p>
          上面是真实 disabled 按钮，不参与
          Tab、没有按压动效，也不会激活或播报成功。解释放在旁边，避免靠点禁用按钮才能读到原因。
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.boundaryReviewed}
            onChange={(e) => patch({ boundaryReviewed: e.target.checked })}
          />
          我已核对取消、禁用与静态状态反馈
        </label>
      </div>
      <Note>
        前三站可自由比较同一实验。悬停不是手机的必需入口，颜色之外有文字、收藏符号与
        aria-pressed。减少动态中不做位移，仍可聚焦和完成收藏；换站、离课或重置清理按压与动画会话，参数和学习进度单独保留。没有自动循环、逐帧播报或辅助预览冒充真实事件。
      </Note>
    </div>
  );
}
