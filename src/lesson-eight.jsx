import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  GLASS_STORAGE,
  glassSteps,
  glassQuestions,
  glassSources,
  glassInitial,
  readGlassProgress,
} from "./lesson-eight-content";
import "./lesson-eight.css";
const add = (a, v) => [...new Set([...a, v])];
function useGlassEnvironment() {
  const [reduced, setReduced] = useState(
    () =>
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
      true,
  );
  const [supported] = useState(() =>
    Boolean(
      globalThis.CSS?.supports?.("backdrop-filter", "blur(1px)") ||
      globalThis.CSS?.supports?.("-webkit-backdrop-filter", "blur(1px)"),
    ),
  );
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduced(mq.matches);
    change();
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  return { reduced, supported };
}
function GlassScene({
  data,
  mode = "backdrop",
  blur = data.blur,
  fallback = false,
  wide = false,
}) {
  const { reduced, supported } = useGlassEnvironment();
  const unsupported = mode === "backdrop" && (!supported || fallback);
  const alpha = unsupported || data.opaque ? 1 : data.alpha;
  const back = mode === "backdrop" && !unsupported ? `blur(${blur}px)` : "none";
  return (
    <div
      className="glass-scene"
      data-testid="glass-scene"
      data-mode={mode}
      data-fallback={unsupported}
    >
      <div className="glass-backdrop-clip" aria-hidden="true">
        <div
          className="glass-backdrop-position"
          style={{ transform: `translateX(-${data.position}px)` }}
        >
          <svg
            data-testid="glass-background"
            className="glass-background"
            viewBox="0 0 1000 320"
            preserveAspectRatio="none"
            style={{
              animationPlayState:
                reduced || data.paused || data.empty ? "paused" : "running",
              visibility: data.empty ? "hidden" : "visible",
            }}
          >
            <rect width="1000" height="320" fill="#e8e0f0" />
            {Array.from({ length: 25 }, (_, i) => (
              <rect
                key={i}
                x={i * 40}
                width="20"
                height="320"
                fill={i % 2 ? "#9bc5c1" : "#82659f"}
              />
            ))}
            <circle cx="190" cy="100" r="62" fill="#edb46d" />
            <rect
              x="340"
              y="45"
              width="150"
              height="230"
              rx="30"
              fill="#5d839c"
            />
            <circle cx="620" cy="245" r="95" fill="#b7a0ce" />
          </svg>
        </div>
      </div>
      <div
        className="glass-pane"
        data-testid="glass-pane"
        style={{
          width: wide ? "90%" : "70%",
          backgroundColor: `rgba(255,255,255,${alpha})`,
          filter: mode === "self" ? `blur(${blur}px)` : "none",
          backdropFilter: back,
          WebkitBackdropFilter: back,
        }}
      >
        <div className="glass-window" aria-hidden="true">
          <span className="glass-ink" data-testid="glass-ink" />
        </div>
        <div className="glass-readable">
          <span className="glass-state">◇ 信息面板 · 有边界与文字提示</span>
          <h3>眼前的信息，要清楚</h3>
          <p>背景可以柔化，内容和状态仍需可读。</p>
        </div>
      </div>
    </div>
  );
}
function MotionControls({ data, patch }) {
  const { reduced } = useGlassEnvironment();
  return (
    <div className="glass-motion">
      <button
        className="text-button"
        disabled={reduced || data.empty}
        onClick={() => patch({ paused: !data.paused })}
      >
        {reduced
          ? "系统偏好：已停止背景运动"
          : data.empty
            ? "图案已移除：背景静止"
            : data.paused
              ? "播放背景"
              : "暂停背景"}
      </button>
      <span data-testid="glass-motion-status">
        {reduced
          ? "减少动态已启用；手动移动仍可用"
          : data.empty
            ? "图案已移除，背景静止；手动位置仍可操作"
            : data.paused
              ? "背景已暂停；可手动比较"
              : "背景缓慢往返 · 24 秒单程"}
      </span>
    </div>
  );
}
function TargetLab({ data, patch }) {
  const env = useGlassEnvironment();
  return (
    <>
      <div className="glass-lab">
        <div className="panel-heading">
          <span>原创场景 · 只改变滤镜作用对象</span>
          <span className="code-tag">原生 CSS</span>
        </div>
        <GlassScene data={data} mode={data.mode} />
        <div className="glass-reading" data-testid="glass-target-reading">
          {data.mode === "self"
            ? data.blur === 0
              ? "作用自身，但当前 blur 为 0：自身内容保持原样。改为 6px 或 12px 再比较文字与标记。"
              : "作用自身：面板、文字与标记一起模糊。这是故意的不可读对比，重要控件均在外面。"
            : data.mode === "backdrop"
              ? env.supported
                ? data.opaque
                  ? "面板为不透明白底：背后的滤镜结果被盖住，不会显示毛玻璃。"
                  : data.empty
                    ? "背后只剩均匀底色：没有可见图案细节，不生成毛玻璃纹理。"
                    : data.blur === 0
                      ? "作用背后，但当前 blur 为 0：图案不模糊，面板文字保持清楚。"
                      : "作用背后：图案被柔化，面板文字与黑色标记保持清楚。"
                : "本浏览器不支持：已使用不透明回退；请结合说明理解背景滤镜。"
              : data.opaque
                ? "没有滤镜且面板已盖实：白底挡住背后的图案。"
                : data.empty
                  ? "没有滤镜，背后只剩均匀底色；没有图案细节。"
                  : "没有滤镜：透过面板的图案保留原有边缘。"}
          <br />
          面板原文：眼前的信息，要清楚。背景可以柔化，内容和状态仍需可读。
        </div>
        <div className="glass-controls">
          <Choices
            label="滤镜作用对象"
            value={data.mode}
            values={[
              ["none", "无滤镜"],
              ["self", "filter · 自身"],
              ["backdrop", "backdrop · 背后"],
            ]}
            onChange={(v) =>
              patch((old) => ({ mode: v, modesSeen: add(old.modesSeen, v) }))
            }
          />
          <Choices
            label="实验模糊强度"
            value={data.blur}
            values={[
              [0, "0px"],
              [6, "6px"],
              [12, "12px"],
            ]}
            onChange={(v) =>
              patch({ blur: v, blurChanged: v !== 12 || data.blurChanged })
            }
          />
        </div>
        <MotionControls data={data} patch={patch} />
      </div>
      <Note title="先问：模糊谁？">
        filter: blur() 会处理元素自身及后代；backdrop-filter
        处理背后的图像，不会自动模糊面板文字。前者可用于装饰素材，但不应把重要内容一起弄模糊。黑色标记和外部原文可帮助对照；一张截图无法证明实际用了哪种技术。
      </Note>
    </>
  );
}
function TransparencyLab({ data, patch }) {
  const { supported } = useGlassEnvironment();
  return (
    <>
      <div className="glass-lab">
        <div className="panel-heading">
          <span>同一场景 · 背景条件实验</span>
          <span className="code-tag">backdrop-filter</span>
        </div>
        <GlassScene data={data} />
        <div className="glass-reading" data-testid="glass-condition-reading">
          {!supported
            ? "本浏览器不支持背板滤镜：使用不透明回退；alpha 控制保留，但回退优先保证可读。"
            : data.opaque
              ? "面板已盖实：alpha = 1，背板结果被白底挡住。"
              : data.empty
                ? "背后只剩均匀底色：没有可见图案细节，不添加假毛玻璃。"
                : `背景色 alpha = ${data.alpha}；改变的是白色背景，不是整个面板的 opacity。`}{" "}
          文字区域另有稳定底色与边框，避免图案影响阅读。
        </div>
        <div className="glass-controls">
          <Choices
            label="白色背景 alpha"
            value={data.alpha}
            values={[
              [0.2, "0.20 · 更透"],
              [0.55, "0.55 · 适中"],
              [0.85, "0.85 · 更实"],
            ]}
            onChange={(v) =>
              patch({ alpha: v, alphaChanged: v !== 0.55 || data.alphaChanged })
            }
          />
          <Choices
            label="手动背景位置"
            value={data.position}
            values={[
              [0, "位置 A"],
              [48, "位置 B"],
              [96, "位置 C"],
            ]}
            onChange={(v) =>
              patch({ position: v, moved: v !== 0 || data.moved, paused: true })
            }
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.opaque}
              onChange={(e) =>
                patch({ opaque: e.target.checked, opaqueTested: true })
              }
            />
            面板改成不透明白底
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.empty}
              onChange={(e) =>
                patch({ empty: e.target.checked, emptyTested: true })
              }
            />
            移除背后图案
          </label>
        </div>
        <MotionControls data={data} patch={patch} />
      </div>
      <Note title="模糊不是凭空生成纹理">
        背景得有可见内容，面板得让结果透出。不透明面板会盖住背板结果；均匀背景即使被模糊，通常也看不出差异。blur
        为 0 时也没有模糊。祖先的 filter、opacity 等可能影响 backdrop root
        和取样边界，复杂页面仍需检查真实结构。
      </Note>
    </>
  );
}
function FallbackLab({ data, patch }) {
  const { supported } = useGlassEnvironment();
  return (
    <>
      <div className="glass-lab">
        <div className="panel-heading">
          <span>有边界的表面 · 清楚的回退</span>
          <span className="code-tag">能力检查</span>
        </div>
        <GlassScene
          data={{ ...data, opaque: false, empty: false, alpha: 0.55 }}
          blur={data.costBlur}
          fallback={data.forceFallback}
          wide={data.area === "wide"}
        />
        <div className="glass-reading" data-testid="glass-support-reading">
          {!supported || data.forceFallback
            ? "不透明回退：无 backdrop 模糊，正文、边界和文字状态仍保留。"
            : `浏览器支持背景滤镜：当前为${data.area === "wide" ? "较大" : "局部"}范围、${data.costBlur}px 模糊。`}{" "}
          参数变化不等于性能跑分；需要目标设备实测。
        </div>
        <div className="glass-controls">
          <Choices
            label="背板作用范围"
            value={data.area}
            values={[
              ["small", "局部 · 70%"],
              ["wide", "较大 · 90%"],
            ]}
            onChange={(v) =>
              patch({ area: v, areaChanged: v === "wide" || data.areaChanged })
            }
          />
          <Choices
            label="成本实验半径"
            value={data.costBlur}
            values={[
              [6, "6px"],
              [12, "12px"],
              [24, "24px"],
            ]}
            onChange={(v) =>
              patch({
                costBlur: v,
                budgetChanged: v !== 12 || data.budgetChanged,
              })
            }
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.forceFallback}
              onChange={(e) =>
                patch({ forceFallback: e.target.checked, fallbackTested: true })
              }
            />
            模拟不支持 backdrop-filter
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.readabilityReviewed}
              onChange={(e) => patch({ readabilityReviewed: e.target.checked })}
            />
            我已确认文字底色、边框与文字状态仍清楚
          </label>
        </div>
        <MotionControls data={{ ...data, empty: false }} patch={patch} />
      </div>
      <Note title="范围、强度、背景变化，都有代价">
        大面积模糊和动态背景可能增加绘制与合成成本；此处改变真实参数，不报告虚构
        FPS。先保留清楚的不透明基础样式，再按能力增强。MDN 将 backdrop-filter
        标为 Baseline 2024，旧浏览器仍可能不支持；本例检查标准与 WebKit
        前缀，并提供可操作的回退模拟。状态有文字和符号，焦点在实验之外清晰可见，不依赖模糊。
      </Note>
    </>
  );
}
function GlassReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第八节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          2026-10-21 核对。本节区分自身滤镜与背板滤镜；背景色 alpha
          不等于整个元素
          opacity。回退为不透明表面，不伪造实时毛玻璃。背景缓慢移动可暂停；减少动态偏好优先，手动位置操作不要求动画。对比度、实际
          backdrop root 边界、兼容性与设备性能都需按项目复核。路线总核对日期仍为
          2026-10-20，并非永远最新。
        </p>
        <ul>
          {glassSources.map(([title, url]) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {title} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
export default function LessonEight({ onStorageStatus }) {
  const [data, setData] = useState(readGlassProgress),
    [notice, setNotice] = useState(""),
    [copyMessage, setCopyMessage] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const headingRef = useRef(null),
    draftRef = useRef(null),
    dialogRef = useRef(null),
    resetRef = useRef(null),
    generation = useRef(0),
    copyBusy = useRef(false);
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(GLASS_STORAGE, JSON.stringify(data));
      onStorageStatus("进度仅保存在当前浏览器");
    } catch {
      onStorageStatus("浏览器存储不可用；本次进度仅在页面内保留");
    }
  }, [data, onStorageStatus]);
  useEffect(() => {
    headingRef.current?.focus();
    return () => {
      generation.current++;
    };
  }, []);
  useEffect(() => {
    if (resetOpen) {
      dialogRef.current?.showModal();
      dialogRef.current?.querySelector("button")?.focus();
    } else if (dialogRef.current?.open) {
      dialogRef.current.close();
      resetRef.current?.focus();
    }
  }, [resetOpen]);
  const tasks = [
    [
      [
        ["none", "self", "backdrop"].every((v) => data.modesSeen.includes(v)),
        "比较三种作用方式",
      ],
      [data.blurChanged, "改变模糊强度"],
    ],
    [
      [data.alphaChanged, "改变背景色 alpha"],
      [data.opaqueTested, "盖实面板，观察透出效果消失"],
      [data.emptyTested, "移除背后图案"],
      [data.moved, "手动移动背景，无需播放动画"],
    ],
    [
      [data.fallbackTested, "检查无支持时的不透明回退"],
      [data.areaChanged && data.budgetChanged, "比较实际范围与模糊强度"],
      [data.readabilityReviewed, "确认文字、边界与非模糊提示"],
    ],
    glassQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成可编辑的毛玻璃指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查背景、可读性、回退与验收",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = glassSteps[data.step];
  const go = (next) => {
    patch({ step: next });
    setNotice("");
    setCopyMessage("");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const finish = () => {
    if (!ready[data.step]) {
      setNotice(
        "先完成这一站的小任务，再继续。可以反复操作，进度不会重复计数。",
      );
      return;
    }
    patch((old) => ({ done: add(old.done, old.step) }));
    if (data.step < 4) go(data.step + 1);
    else if ([0, 1, 2, 3].every((n) => data.done.includes(n)))
      setNotice("第八节已完成。" + nextLessonHint(7));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const scenario =
      data.brief === "panel"
        ? "实现信息面板的局部毛玻璃"
        : "实现滚动内容上方的半透明导航栏";
    const draft = `请在现有项目中${scenario}，先说明真实背景来自哪里、面板怎样分层。截图只能提供外观线索，不能确定实际技术。

作用对象：需要背景模糊且文字清晰时，评估 backdrop-filter，而不是给整个面板加 filter: blur()。使用背景色 alpha，不把整个面板 opacity 降低而连文字一起变淡。核对祖先的 filter、opacity、backdrop root 与层叠上下文，确保实际取样范围正确。

透明条件：可从 blur(${data.blur}px) 和白色背景 alpha ${data.alpha} 开始，按内容调整。背景完全不透明时不声称可见毛玻璃；背后无细节时不添加假纹理冒充实时模糊。明确边框、留白、文字底色和文字/图标状态，不把模糊作为唯一分层或状态信号。

可读性与回退：重要文字使用稳定可读的底色，按实际背景和不同 alpha 核对对比度。通过 CSS.supports / @supports 检查目标浏览器；不支持 backdrop-filter 或效果被禁用时使用清楚的不透明背景、边界与同样可用的内容和操作，不依赖昂贵 polyfill。

性能与动态：默认采用局部、小范围的适度模糊，不把全屏、大半径和持续移动背景当作免费。用目标设备的性能工具实测滚动与动画开销，再决定范围、半径与是否静态化；不虚构 FPS。若有装饰运动，必须有可见暂停入口并尊重 prefers-reduced-motion；提供静态或手动替代，不强迫播放。

验收：
1. 在 375px 和桌面切换无滤镜 / filter / backdrop-filter，核对真实绘制与文字清晰度，不只检查 CSS 字符串。
2. 移动背景、改变 alpha、盖实面板、移除图案；确认可见结果符合背景与透明条件。
3. 在不支持与强制回退分支中，正文和操作仍完整可读，边界与状态提示保留。
4. 纯触屏和键盘可完成操作、暂停与关闭；焦点可见，没有必须按 Esc 才能完成的门槛。
${data.includeEdges ? "5. 检查减少动态偏好的初始状态及实时切换、低性能设备、长内容和窄屏；检查局部裁切、滚动中的合成成本，必要时取消装饰效果。" : "5. 检查目标设备的滚动性能与长内容，不让效果遮住信息。"}

请先给出背景来源、可读性、回退与性能取舍，再实现并逐条验证。`;
    patch({ draft, generated: true, reviewed: false });
    setCopyMessage("");
  };
  const copy = async () => {
    if (copyBusy.current) return;
    copyBusy.current = true;
    const id = generation.current;
    try {
      if (!navigator.clipboard?.writeText) throw Error("unavailable");
      await navigator.clipboard.writeText(data.draft);
      if (id === generation.current)
        setCopyMessage("已复制，可以粘贴给 Coding Agent。");
    } catch {
      if (id === generation.current) {
        setCopyMessage(
          "自动复制不可用：已选中全文，请按 Ctrl+C / ⌘C；手机可长按复制。",
        );
        draftRef.current?.focus();
        draftRef.current?.select();
      }
    } finally {
      copyBusy.current = false;
    }
  };
  const reset = () => {
    generation.current++;
    try {
      localStorage.removeItem(GLASS_STORAGE);
    } catch {}
    setData(glassInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第八节的进度、参数与草稿；前七节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-eight">
      <div className="lesson-overline">
        <span className="pill">第八节 · 毛玻璃</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            毛玻璃<span className="title-period">.</span>
          </h1>
          <p>让背后的内容柔化，让眼前的信息清楚。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>08</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 分清模糊对象
        </span>
        <span>
          <Icon type="check" size={16} /> 验证透明条件
        </span>
        <span>
          <Icon type="check" size={16} /> 检查可读与回退
        </span>
      </div>
      <nav className="stepper" aria-label="第八节学习步骤">
        {glassSteps.map((s, i) => (
          <button
            key={s.short}
            aria-current={data.step === i ? "step" : undefined}
            className={`${data.step === i ? "active" : ""} ${data.done.includes(i) ? "completed" : ""}`}
            onClick={() => go(i)}
          >
            <span className="step-circle">
              {data.done.includes(i) ? <Icon type="check" size={14} /> : i + 1}
            </span>
            <span>
              {s.short}
              <small>{s.time}</small>
            </span>
          </button>
        ))}
      </nav>
      <section className="lesson-stage" aria-labelledby="glass-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            GLASS LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="glass-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <TargetLab data={data} patch={patch} />}
        {data.step === 1 && <TransparencyLab data={data} patch={patch} />}
        {data.step === 2 && <FallbackLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {glassQuestions.map((q, i) => {
              const answer = data.answers[i],
                correct = answer === q.correct;
              return (
                <fieldset
                  key={q.q}
                  className={`quiz-card ${answer !== null ? (correct ? "correct" : "incorrect") : ""}`}
                >
                  <legend>
                    <span>0{i + 1}</span>
                    {q.q}
                  </legend>
                  <div className="quiz-options">
                    {q.options.map((option, j) => (
                      <button
                        key={option}
                        aria-pressed={answer === j}
                        onClick={() =>
                          patch((old) => ({
                            answers: old.answers.map((v, k) =>
                              k === i ? j : v,
                            ),
                          }))
                        }
                      >
                        <span className="answer-letter">
                          {j === 0 ? "A" : "B"}
                        </span>
                        {option}
                        {answer === j && (
                          <span className="answer-mark">
                            {correct ? "✓" : "↺"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {answer !== null && (
                    <div className="quiz-feedback" role="status">
                      <strong>
                        {correct ? "判断正确" : "再想一想，可以重新选择"}
                      </strong>
                      <p>{q.why}</p>
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        )}
        {data.step === 4 && (
          <div className="agent-grid">
            <div className="agent-options">
              <span className="agent-icon">
                <Icon type="spark" size={26} />
              </span>
              <h3>你的毛玻璃简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="panel">信息面板</option>
                  <option value="bar">滚动导航栏</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入动态偏好与设备性能验收
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成毛玻璃草稿" : "生成毛玻璃指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的毛玻璃指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制毛玻璃指令
                </button>
              </div>
              <label className="sr-only" htmlFor="glass-agent-draft">
                可编辑的 毛玻璃 Agent 指令
              </label>
              <textarea
                id="glass-agent-draft"
                onFocus={(event) =>
                  event.currentTarget.scrollIntoView({
                    block: "center",
                    behavior: "auto",
                  })
                }
                ref={draftRef}
                value={data.draft}
                maxLength={8000}
                onChange={(e) => {
                  patch({ draft: e.target.value, reviewed: false });
                  setCopyMessage("");
                }}
                placeholder="生成后，补充真实背景、可读性与回退要求。"
              />
              <div className="copy-feedback" role="status">
                {copyMessage || "你可以修改全文。复制后，由你决定在哪里使用。"}
              </div>
              <label className="checkbox-label review">
                <input
                  type="checkbox"
                  disabled={!data.generated || data.draft.trim().length < 80}
                  checked={data.reviewed}
                  onChange={(e) => patch({ reviewed: e.target.checked })}
                />
                我已检查背景、可读性、回退和验收方式。
              </label>
            </div>
          </div>
        )}
        <div className="task-footer">
          <div>
            <strong>这一站的小任务</strong>
            <ul>
              {tasks[data.step].map(([ok, text]) => (
                <li key={text} className={ok ? "done" : ""}>
                  <span aria-label={ok ? "已完成" : "未完成"}>
                    {ok ? "✓" : "○"}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="stage-actions">
            {data.step > 0 && (
              <button className="text-button" onClick={() => go(data.step - 1)}>
                ← 上一步
              </button>
            )}
            <button className="primary next-button" onClick={finish}>
              {data.step < 4
                ? "完成并继续"
                : [0, 1, 2, 3].every((n) => data.done.includes(n))
                  ? "完成第八节"
                  : "保存本站成果"}
              <Icon type="arrow" size={18} />
            </button>
          </div>
        </div>
        <div className="notice" role="status">
          {notice}
        </div>
      </section>
      <div className="lesson-bottom">
        <span>
          {data.done.length} / 5 站已完成
          <span className="progress-track">
            <span style={{ width: `${data.done.length * 20}%` }} />
          </span>
        </span>
        <button
          className="text-button reset-button"
          ref={resetRef}
          onClick={() => setResetOpen(true)}
        >
          重置第八节进度
        </button>
      </div>
      <GlassReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="glass-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="glass-reset-title">重新开始第八节？</h2>
        <p>仅清除第八节的进度、实验参数和草稿；前七节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第八节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第八节
          </button>
        </div>
      </dialog>
    </div>
  );
}
