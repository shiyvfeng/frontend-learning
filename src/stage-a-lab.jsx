import React, { useEffect, useRef, useState } from "react";
import { aMappings, aOptions } from "./stage-a-content";

export function MappingLab({ data, patch }) {
  const [checked, setChecked] = useState(data.mappingChecked);
  return (
    <div className="mapa-pairing">
      <p className="mapa-boundary">
        <strong>本地学习演练 · 非 Figma 编辑器</strong>
        。无需账户或上传；选择框与按钮是配对操作，不要求拖放。
      </p>
      {aMappings.map((m, i) => {
        const ok = m.accepts.includes(data.mappings[i]);
        return (
          <fieldset key={m.name} className="mapa-pair">
            <legend>{m.name}</legend>
            <label htmlFor={`mapa-pair-${i}`}>为 {m.name} 选择开发落点</label>
            <select
              id={`mapa-pair-${i}`}
              value={data.mappings[i]}
              onChange={(e) => {
                setChecked(false);
                patch({
                  mappings: data.mappings.map((v, j) =>
                    j === i ? e.target.value : v,
                  ),
                  mappingChecked: false,
                });
              }}
            >
              {aOptions.map(([id, text]) => (
                <option key={id} value={id}>
                  {text}
                </option>
              ))}
            </select>
            {checked && (
              <div className="mapa-rule">
                <strong>
                  {ok
                    ? "合理映射 · 注意适用条件"
                    : "这个落点不满足本题职责，请重选"}
                </strong>
                <p>{m.why}</p>
              </div>
            )}
          </fieldset>
        );
      })}
      <button
        className="primary"
        onClick={() => {
          setChecked(true);
          patch({
            mappingChecked: aMappings.every((m, i) =>
              m.accepts.includes(data.mappings[i]),
            ),
          });
        }}
      >
        检查六组映射
      </button>
      <p role="status">
        {checked
          ? "已按预设职责检查；可重试，不是AI评审。合理选项不只有一种，下面说明成立条件。"
          : "检查会解释每一组的适用条件，不按库名称评分。"}
      </p>
    </div>
  );
}

function CourseCard({
  title,
  variant,
  phase = "idle",
  onStart,
  secondary = false,
  saved,
  onSave,
}) {
  const labels = {
    idle: "报名示例课程",
    pending: "正在等待教学结果",
    error: "重试示例报名",
    success: "再次体验报名",
  };
  return (
    <article
      className={`mapa-card ${variant}`}
      data-card={secondary ? "B" : "A"}
      data-phase={phase}
    >
      <div className="mapa-card-icon" aria-hidden="true">
        {secondary ? "◇" : "◈"}
      </div>
      <h4>{title}</h4>
      <p>
        {secondary
          ? "同一CourseCard实现，实例B保留自己的收藏。"
          : "虚构教学课程；报名仅改变本地状态，不占真实名额。"}
      </p>
      {secondary ? (
        <button aria-pressed={saved} onClick={onSave}>
          {saved ? "取消收藏课程B" : "收藏课程B"}
        </button>
      ) : (
        <button aria-busy={phase === "pending"} onClick={onStart}>
          {labels[phase]}
        </button>
      )}
      <p className="mapa-state" data-feedback={phase}>
        {secondary
          ? saved
            ? "B：已收藏，仅本次实验"
            : "B：未收藏"
          : `A：${{ idle: "尚未报名", pending: "等待手动投递", error: "教学失败，可重试", success: "教学成功，不是真实报名" }[phase]}`}
      </p>
    </article>
  );
}

export default function DesignWorkbench({ data, patch }) {
  const box = useRef(null),
    token = useRef(0),
    active = useRef(null),
    queueRef = useRef([]),
    mounted = useRef(true);
  const [size, setSize] = useState(0),
    [phase, setPhase] = useState("idle"),
    [queue, setQueue] = useState([]),
    [result, setResult] = useState("success"),
    [saved, setSaved] = useState(false),
    [feedback, setFeedback] = useState(
      "所有报名结果均由你手动投递，不请求服务器。",
    );
  const replaceQueue = (q) => {
    queueRef.current = q;
    setQueue(q);
  };
  const cancel = (reason = "已取消；旧结果不能改写新状态。") => {
    active.current = null;
    setPhase("idle");
    setFeedback(reason);
    patch({ cancelSeen: true });
  };
  useEffect(() => {
    mounted.current = true;
    const measure = () => {
      if (mounted.current && box.current)
        setSize(Math.round(box.current.getBoundingClientRect().width));
    };
    const ro =
      typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (box.current) ro?.observe(box.current);
    measure();
    window.addEventListener("resize", measure);
    const hide = () => {
      if (document.hidden && active.current !== null)
        cancel("页面隐藏，已取消本地等待；再次投递只会检查到旧结果。");
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      token.current++;
      active.current = null;
      queueRef.current = [];
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const start = () => {
    if (active.current !== null) {
      setFeedback("当前等待尚未结束，重复开始已阻止。");
      return;
    }
    if (queueRef.current.length >= 4) {
      setFeedback("教学队列最多4封，请先投递旧结果。没有创建新任务。");
      return;
    }
    if (phase === "error") patch({ retrySeen: true });
    const id = ++token.current;
    active.current = id;
    replaceQueue([...queueRef.current, { id, result }]);
    setPhase("pending");
    setFeedback(
      `尝试${id}等待${result === "success" ? "成功" : "失败"}教学结果；选项后续变化不改这封信。`,
    );
  };
  const deliver = () => {
    const [envelope, ...rest] = queueRef.current;
    if (!envelope) {
      setFeedback("队列为空，没有结果可投递。");
      return;
    }
    replaceQueue(rest);
    if (envelope.id !== active.current) {
      patch({ staleSeen: true });
      setFeedback(`忽略旧尝试${envelope.id}；当前状态保持。`);
      return;
    }
    active.current = null;
    setPhase(envelope.result === "success" ? "success" : "error");
    patch(
      envelope.result === "success"
        ? { successSeen: true }
        : { failureSeen: true },
    );
    setFeedback(
      envelope.result === "success"
        ? "当前尝试成功；这只是教学反馈。B收藏保持。"
        : "当前尝试失败，可以重试；B收藏保持。",
    );
  };
  return (
    <div
      className="mapa-workbench"
      data-phase={phase}
      data-queue={JSON.stringify(queue)}
      data-width={size}
    >
      <p className="mapa-boundary">
        <strong>本地模拟设计属性面板 + 真实网页预览</strong>
        。未操作Figma、未导出官方代码；布局由CSS实现，状态由React实现。
      </p>
      <div className="mapa-config">
        <fieldset>
          <legend>预览宽度目标（非设备模拟器）</legend>
          <button
            aria-pressed={data.width === "narrow"}
            onClick={() => patch({ width: "narrow", narrowSeen: true })}
          >
            窄容器 320px
          </button>
          <button
            aria-pressed={data.width === "wide"}
            onClick={() => patch({ width: "wide", wideSeen: true })}
          >
            宽容器 最多768px
          </button>
          <p>
            实际可用 {size}
            px；达到520px才双列，否则单列。375px页面上的宽目标仍受父容器约束。
          </p>
        </fieldset>
        <fieldset>
          <legend>语义变量与布局选择</legend>
          <button
            aria-pressed={data.spacing === 12}
            onClick={() => patch({ spacing: 12, tokenSeen: true })}
          >
            space.card = 12px
          </button>
          <button
            aria-pressed={data.spacing === 24}
            onClick={() => patch({ spacing: 24, tokenSeen: true })}
          >
            space.card = 24px
          </button>
          <button
            aria-pressed={data.theme === "light"}
            onClick={() => patch({ theme: "light", themeSeen: true })}
          >
            surface/text 浅色mode
          </button>
          <button
            aria-pressed={data.theme === "dark"}
            onClick={() => patch({ theme: "dark", themeSeen: true })}
          >
            surface/text 深色mode
          </button>
          <button
            aria-pressed={data.layout === "grid"}
            onClick={() => patch({ layout: "grid", layoutSeen: true })}
          >
            Grid 轨道方案
          </button>
          <button
            aria-pressed={data.layout === "flex"}
            onClick={() => patch({ layout: "flex", layoutSeen: true })}
          >
            Flex 换行方案
          </button>
        </fieldset>
        {data.step === 2 && (
          <fieldset>
            <legend>外观参数与动效合同</legend>
            <button
              aria-pressed={data.variant === "solid"}
              onClick={() => patch({ variant: "solid", variantSeen: true })}
            >
              卡片按钮 solid
            </button>
            <button
              aria-pressed={data.variant === "outline"}
              onClick={() => patch({ variant: "outline", variantSeen: true })}
            >
              卡片按钮 outline
            </button>
            <button
              aria-pressed={data.motion === "none"}
              onClick={() => patch({ motion: "none", motionSeen: true })}
            >
              不加动效
            </button>
            <button
              aria-pressed={data.motion === "feedback"}
              onClick={() => patch({ motion: "feedback", motionSeen: true })}
            >
              反馈底色过渡120ms
            </button>
            <p>
              外观参数和业务状态分开。过渡仅修饰反馈底色；减少动态时即时切换，静态也可完成。
            </p>
          </fieldset>
        )}
      </div>
      <div
        className={`mapa-preview ${data.theme}`}
        style={{
          maxWidth: data.width === "narrow" ? 320 : 768,
          "--mapa-space": `${data.spacing}px`,
        }}
        ref={box}
        data-motion={data.motion}
      >
        <header>
          <span className="mapa-brand">ECHO / 回声工作坊</span>
          <h3>{data.caption}</h3>
          <p>原创虚构界面 · 为想法留一个实践位置</p>
        </header>
        <div className={`mapa-cards ${data.layout}`}>
          <CourseCard
            title="把一张设计稿变成可验证的界面"
            variant={data.variant}
            phase={phase}
            onStart={start}
          />
          <CourseCard
            title="用内容约束组织组件与布局"
            variant={data.variant}
            secondary
            saved={saved}
            onSave={() => {
              setSaved((v) => !v);
              patch({ secondSeen: true });
            }}
          />
        </div>
        <footer>2个共享组件实例 · 内容阅读顺序不随方案改变</footer>
      </div>
      <div className="mapa-model">
        <strong>意图拆解，而非图层翻译</strong>
        <p>
          结构：品牌、课程列表、CourseCard；布局：{data.layout}
          、可用宽度与space.card；状态：A报名 / B收藏独立；动效：
          {data.motion === "feedback" ? "反馈底色120ms" : "无额外过渡"}
          。所有主题值显式映射到CSS变量，不自动读取设计文件。
        </p>
      </div>
      <fieldset className="mapa-events">
        <legend>本地原型 → 行为合同实验</legend>
        <label htmlFor="mapa-result">下次尝试的教学结果</label>
        <select
          id="mapa-result"
          value={result}
          onChange={(e) => setResult(e.target.value)}
        >
          <option value="success">成功</option>
          <option value="error">失败</option>
        </select>
        <button data-empty={!queue.length} onClick={deliver}>
          投递最早教学结果 ({queue.length})
        </button>
        <button
          data-idle={phase !== "pending"}
          onClick={() => {
            if (active.current === null) {
              setFeedback("没有等待中的尝试可取消。");
              return;
            }
            cancel();
          }}
        >
          取消本次报名等待
        </button>
        <p>
          尝试在等待中再次点击报名；取消后先启动新尝试，再投递旧结果。按钮保留焦点，空队列/无等待操作会给原因，不产生成功反馈。离开实验/刷新清空队列与运行状态。
        </p>
        <div role="status">{feedback}</div>
      </fieldset>
    </div>
  );
}
