import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Choices, Note } from "./lesson-two";
import {
  initialMotion,
  retarget,
  advance,
  settle,
} from "./lesson-nineteen-engine";
function useReduced() {
  const [r, set] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => set(m.matches);
    change();
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  return r;
}
export default function SpringWorkbench({ data, patch }) {
  const engine = useRef(initialMotion()),
    frame = useRef(null),
    epoch = useRef(0),
    alive = useRef(true),
    timeDot = useRef(null),
    springDot = useRef(null),
    latest = useRef({ data, patch }),
    writeRef = useRef(null),
    visibility = useRef(document.hidden);
  const [status, setStatus] = useState("共同起点25；尚未运行"),
    [readout, setReadout] = useState("点击读取真实位置与速度；不会逐帧播报"),
    [command, setCommand] = useState(null),
    [target, setTarget] = useState(25);
  const systemReduced = useReduced(),
    reduced = systemReduced || data.noMotion;
  latest.current = { data, patch, reduced };
  const write = () => {
    const m = engine.current;
    for (const [k, ref] of [
      ["time", timeDot],
      ["spring", springDot],
    ]) {
      const node = ref.current;
      if (node) {
        node.style.left = `${m[k].x}%`;
        node.dataset.x = String(m[k].x);
        node.dataset.v = String(m[k].v);
        node.dataset.running = String(!m[k].done);
        node.dataset.target = String(m.target);
      }
    }
  };
  writeRef.current = write;
  const stop = () => {
    epoch.current++;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  const snap = (reason) => {
    stop();
    engine.current = settle(engine.current, reason);
    writeRef.current();
    setStatus(reason);
  };
  const schedule = () => {
    if (frame.current !== null || !alive.current || !engine.current.running)
      return;
    const token = epoch.current;
    const id = requestAnimationFrame((now) => {
      if (!alive.current || token !== epoch.current || frame.current !== id)
        return;
      frame.current = null;
      engine.current = advance(engine.current, now);
      writeRef.current();
      if (engine.current.running) schedule();
      else
        setStatus(
          engine.current.reason + "：两种机制均已停止，位置与速度可读取。",
        );
    });
    frame.current = id;
  };
  useLayoutEffect(() => {
    writeRef.current();
    if (reduced) snap("减少动态：立即呈现最新目标，清理帧循环");
  }, [reduced]);
  useEffect(() => {
    const change = () => {
      visibility.current = document.hidden;
      if (document.hidden)
        snap("真实页面隐藏：立即到位并停止，返回不补算后台时间");
      else setStatus("已返回前台：保持最新目标，等待新指令，不自动续播。");
    };
    document.addEventListener("visibilitychange", change);
    return () => {
      alive.current = false;
      stop();
      document.removeEventListener("visibilitychange", change);
    };
  }, []);
  const go = (value) => {
    const d = latest.current.data,
      previous = engine.current,
      instant = latest.current.reduced || visibility.current;
    engine.current = retarget(
      previous,
      value,
      performance.now(),
      {
        stiffness: d.stiffness,
        damping: d.damping,
        mass: 1,
        duration: d.duration,
        easing: d.easing,
      },
      instant,
    );
    setCommand(engine.current.lastCommand);
    setTarget(value);
    writeRef.current();
    const demonstrates =
      instant ||
      Math.abs(previous.spring.x - value) > 0.02 ||
      Math.abs(previous.spring.v) > 0.05;
    latest.current.patch({
      ...(value !== 25 ? { moved: true } : {}),
      ...(engine.current.lastCommand.kind === "interrupted" &&
      value !== previous.target
        ? { retargeted: true }
        : {}),
      ...(instant && value !== previous.target
        ? { staticTargetsChanged: true }
        : {}),
      ...(demonstrates && d.stiffness === 280 && d.damping === 44
        ? { stableTested: true }
        : {}),
      ...(demonstrates && d.stiffness === 280 && d.damping === 20
        ? { bounceTested: true }
        : {}),
    });
    if (instant) {
      stop();
      setStatus("静态到位：没有播放或假称保留动画速度；结果与焦点仍可确认。");
    } else {
      setStatus(
        !engine.current.running
          ? "已在目标，无需运动；可选择其他目标。"
          : engine.current.lastCommand.kind === "interrupted"
            ? "运行中目标已改变：各自坐标不跳回起点，spring保留当前速度。"
            : "两种机制已收到相同目标；可在运动中立即点另一个目标。",
      );
      schedule();
    }
  };
  const inspect = () => {
    const m = engine.current;
    setReadout(
      `读取快照：目标${m.target}；时间插值位置 ${m.time.x.toFixed(3)}、速度 ${m.time.v.toFixed(3)}；spring位置 ${m.spring.x.toFixed(3)}、速度 ${m.spring.v.toFixed(3)}。${m.running ? "仍在运动" : "已停止"}，原因：${m.reason}。速度单位是教学坐标/秒。当前运行参数 k=${m.parameters.stiffness}、c=${m.parameters.damping}、m=1，duration=${m.parameters.duration}ms、${m.parameters.easing}。`,
    );
    patch({ inspected: true });
  };
  const reset = () => {
    stop();
    engine.current = initialMotion();
    setTarget(25);
    setCommand(null);
    writeRef.current();
    setStatus("已归位到共同起点25：位置相同、速度都为0；设置和学习进度保留。");
  };
  return (
    <div
      className="spring-lab"
      data-testid="spring-lab"
      data-reduced={String(reduced)}
    >
      <div className="spring-heading">
        <strong>时间插值 × 真实弹簧</strong>
        <span className="micro">手写数值积分 + rAF · 无 Motion 依赖</span>
      </div>
      <div className="spring-controls">
        <label>
          实验对象文案
          <input
            maxLength={36}
            value={data.label}
            onChange={(e) =>
              patch({ label: e.target.value, labelEdited: true })
            }
          />
        </label>
        <button
          onClick={() => patch({ label: "正在选择的方案", labelEdited: true })}
        >
          填入示例文案
        </button>
        <Choices
          label="时间动画 duration"
          values={[
            [300, "300ms"],
            [800, "800ms"],
            [1400, "1400ms"],
          ]}
          value={data.duration}
          onChange={(v) => patch({ duration: v, durationChanged: true })}
        />
        <Choices
          label="时间动画 easing"
          values={[
            ["linear", "匀速 linear"],
            ["cubic-out", "减速 cubic-out"],
          ]}
          value={data.easing}
          onChange={(v) => patch({ easing: v })}
        />
        <Choices
          label="spring 刚度 k · 拉向目标的力度"
          values={[
            [120, "较软 · 120"],
            [280, "适中 · 280"],
            [480, "较硬 · 480"],
          ]}
          value={data.stiffness}
          onChange={(v) => patch({ stiffness: v, kChanged: true })}
        />
        <Choices
          label="spring 阻尼 c · 消耗速度"
          values={[
            [12, "较低 · 12"],
            [20, "适中 · 20"],
            [44, "较高 · 44"],
          ]}
          value={data.damping}
          onChange={(v) => patch({ damping: v, cChanged: true })}
        />
      </div>
      <p className="spring-constraint">
        质量 m
        固定为1，参数采用本课教学单位，不与库默认值直接换算。设置用于下一次目标指令；运动中只修改设置不会改变当前一轮。下方读取可区分当前运行参数与上方新设置。
      </p>
      <div className="spring-presets">
        <button
          onClick={() =>
            patch({ stiffness: 280, damping: 44, intent: "stable" })
          }
        >
          配方：迅速稳定
        </button>
        <button
          onClick={() =>
            patch({ stiffness: 280, damping: 20, intent: "bounce" })
          }
        >
          配方：轻微回弹
        </button>
        <button onClick={reset}>归位到共同起点25</button>
      </div>
      <div
        className="spring-targets"
        role="group"
        aria-label="同时发送给两种机制的目标"
      >
        {[
          [25, "左目标25"],
          [50, "中目标50"],
          [75, "右目标75"],
        ].map(([v, label]) => (
          <button key={v} aria-pressed={target === v} onClick={() => go(v)}>
            {label}
          </button>
        ))}
      </div>
      <div className="spring-comparison">
        {[
          ["time", "时间插值 · duration / easing", timeDot],
          ["spring", "物理 spring · 位置与速度", springDot],
        ].map(([id, label, ref]) => (
          <article key={id}>
            <h3>{label}</h3>
            <div
              className="spring-track"
              role="img"
              aria-label={`${label}，目标${target}；可用读取按钮获取当前数值。`}
            >
              <div aria-hidden="true">
                {[25, 50, 75].map((v) => (
                  <i
                    className="spring-marker"
                    key={v}
                    style={{ left: `${v}%` }}
                  >
                    <span>{v}</span>
                  </i>
                ))}
                <span
                  className={`spring-dot ${id}`}
                  ref={ref}
                  data-testid={`spring-${id}`}
                  style={{ left: "25%" }}
                >
                  ●
                </span>
              </div>
            </div>
            <p>
              {data.label.trim() || "方案卡片"} ·{" "}
              {id === "time"
                ? "按时间曲线插值，重新目标会重新计时"
                : "受目标距离、速度、刚度与阻尼共同影响"}
            </p>
          </article>
        ))}
      </div>
      <p className="micro">
        0–100是可见教学坐标，不是设备像素。快速切换可能越界，画布只裁切装饰，读取仍保留真实坐标；所有操作在画布外，无拖拽门槛。
      </p>
      <div className="spring-observe">
        <button onClick={inspect}>读取真实位置与速度</button>
        <button
          onClick={() => snap("手动立即到位：主动结束比较，不冒称自然收敛")}
        >
          立即到达当前目标
        </button>
        <p role="status" data-testid="spring-readout">
          {readout}
        </p>
      </div>
      <div
        className="spring-command"
        data-testid="spring-command"
        data-kind={command?.kind || "none"}
      >
        {command ? (
          <>
            <strong>
              上次目标指令 ·{" "}
              {command.kind === "interrupted"
                ? "运动中打断"
                : command.kind === "instant"
                  ? "即时呈现"
                  : "从静止启动"}
            </strong>
            <p>
              spring：指令前位置 {command.before.springX.toFixed(3)}、速度{" "}
              {command.before.springV.toFixed(3)} → 指令瞬间位置{" "}
              {command.after.springX.toFixed(3)}、速度{" "}
              {command.after.springV.toFixed(3)}。
              {command.kind === "instant"
                ? "静态模式直接呈现最新目标，不假称此时保留动画速度。"
                : "时间插值也保留自身坐标，但重新计时，速度可能改变。"}
              此记录是指令瞬间快照，不是当前逐帧读数。
            </p>
          </>
        ) : (
          "尚无目标指令。"
        )}
      </div>
      <div className="spring-policy">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.noMotion}
            onChange={(e) =>
              patch({ noMotion: e.target.checked, reducedChecked: true })
            }
          />
          减少动态：直接呈现最新目标
        </label>
        <p data-testid="spring-preference">
          系统减少动态：{systemReduced ? "开启" : "关闭"} · 当前：
          {reduced ? "静态结果，无位移动画" : "允许运动"}
          。实时响应，手动关闭不能覆盖系统要求。
        </p>
        <button
          onClick={() => {
            snap("本地模拟恢复保护：立即到位并清理帧循环，不改变系统后台状态");
            patch({ backgroundChecked: true });
          }}
        >
          体验后台恢复保护（本地模拟）
        </button>
      </div>
      <p role="status" className="spring-status" data-testid="spring-status">
        {status}
      </p>
      <div className="spring-explain">
        <h3>调效果，不要求记公式</h3>
        <p>
          刚度控制拉向目标的力度，阻尼消耗速度，质量影响加速度（本例固定）。三者共同决定是否过冲与多久稳定，不能只看一个数字。较高阻尼可以没有明显过冲，仍然是
          spring；过大阻尼也可能显得拖沓。“自然”取决于任务，不等于一律弹跳。
        </p>
        <p>
          时间动画使用本地 linear 或 cubic-out 曲线，按 duration
          到目标；简单固定变化通常已够。spring
          是半隐式欧拉积分，每个子步1/240秒，逐步计算受力、速度和位置，不是预制
          easing
          冒充物理。单帧最多补算50ms；帧间隔超过200ms直接到最新目标，避免恢复时追算。位置误差小于0.02且速度小于0.05时自然停止，另设8秒安全终止。自然稳定不承诺固定毫秒数，手动结束有单独说明。
        </p>
        <p>
          首次同起点、同目标才便于比较；运行中改目标后，两者各自保留当前坐标，spring还保留速度，不能把之后不同的起点误当成参数差异。需要公平重试时先归位；参数设置应用于下一个目标。后台隐藏立即结算并取消帧循环，返回不自动续播；重置、换站与离课取消旧回调，减少动态实时停止非必要位移，保留静态结果和可见焦点。不联网，不把运动结束当成业务成功。
        </p>
      </div>
      <Note>
        {data.step === 0
          ? "先点右目标，再读取；可直接结束，不必等动画。"
          : "先归位，试迅速稳定与右目标；再归位，试轻微回弹与右目标。运行中点左目标体验打断。减少动态时同样发送目标并读取静态结果，不假称此时保留了动画速度。"}{" "}
        目标按钮会一直可用，重复点击只更新同一个运行器，不叠加循环。后续Layout
        Animation另见20，本课不做其他项的平滑换位。
      </Note>
    </div>
  );
}
