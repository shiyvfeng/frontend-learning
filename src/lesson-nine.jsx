import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  GLOW_STORAGE,
  glowSteps,
  glowQuestions,
  glowPalettes,
  glowPositions,
  gradientImage,
  glowSources,
  glowInitial,
  readGlowProgress,
} from "./lesson-nine-content";
import "./lesson-nine.css";
const add = (a, v) => [...new Set([...a, v])];
const positionOptions = Object.entries(glowPositions).map(([k, v]) => [
  k,
  v.label,
]);
const paletteOptions = Object.entries(glowPalettes).map(([k, v]) => [
  k,
  v.label,
]);
function lightStyle(palette, position, strength, blur, size = "wide") {
  const { x, y } = glowPositions[position];
  return {
    "--light-x": x + "%",
    "--light-y": y + "%",
    "--light-color": glowPalettes[palette].light,
    "--light-strength": strength,
    "--light-blur": blur + "px",
    "--light-size": size === "compact" ? "110px" : "220px",
  };
}
function Poster({
  image,
  light = false,
  styles = {},
  testId = "gradient-poster",
  children,
}) {
  return (
    <div className="glow-poster" data-testid={testId}>
      <div
        aria-hidden="true"
        className={"glow-art " + (light ? "has-light" : "")}
        style={{ backgroundImage: image, ...styles }}
        data-testid={testId + "-art"}
      />
      <div className="glow-copy">
        {children || (
          <>
            <span className="glow-caption">OBSERVE / DESIGN / EXPLAIN</span>
            <h3>用光组织氛围，用内容传递信息</h3>
            <p>文字有独立底色，渐变不承担唯一的信息提示。</p>
          </>
        )}
      </div>
    </div>
  );
}
function GradientLab({ data, patch }) {
  const candidate = gradientImage(
      data.type,
      data.palette,
      data.angle,
      data.position,
    ),
    supported =
      globalThis.CSS?.supports?.("background-image", candidate) ?? false,
    image = supported
      ? candidate
      : gradientImage("linear", data.palette, data.angle, data.position);
  return (
    <>
      <div className="glow-lab">
        <div className="panel-heading">
          <span>一个画布 · 三种颜色变化方式</span>
          <span className="code-tag">CSS 生成图像</span>
        </div>
        <Poster image={image} />
        <div className="glow-reading" data-testid="gradient-reading">
          {!supported
            ? "当前浏览器不支持所选声明，已回退到简单 linear 渐变。"
            : data.type === "linear"
              ? "沿直线方向变化：角度控制方向；本实验的中心控件不改变 linear。"
              : data.type === "radial"
                ? "从中心向外按半径变化：中心控件生效；角度控件不改变本实验的 radial。"
                : "围绕中心按角度变化：中心与起始角度都参与绘制。"}
          <code>{image}</code>
        </div>
        <div className="glow-controls">
          <Choices
            label="渐变类型"
            value={data.type}
            values={[
              ["linear", "linear · 直线"],
              ["radial", "radial · 辐射"],
              ["conic", "conic · 环绕"],
            ]}
            onChange={(v) =>
              patch((old) => ({ type: v, typesSeen: add(old.typesSeen, v) }))
            }
          />
          <Choices
            label="渐变色组"
            value={data.palette}
            values={paletteOptions}
            onChange={(v) =>
              patch({
                palette: v,
                paletteChanged: v !== "violet" || data.paletteChanged,
              })
            }
          />
          <Choices
            label="方向 / 起始角度"
            value={data.angle}
            values={[
              [0, "0deg"],
              [90, "90deg"],
              [180, "180deg"],
            ]}
            onChange={(v) =>
              patch({
                angle: v,
                angleChanged:
                  data.angleChanged || (data.type !== "radial" && v !== 90),
              })
            }
          />
          <Choices
            label="径向 / 环绕中心"
            value={data.position}
            values={positionOptions}
            onChange={(v) =>
              patch({
                position: v,
                positionChanged:
                  data.positionChanged ||
                  (data.type !== "linear" && v !== "center"),
              })
            }
          />
        </div>
      </div>
      <Note title="先看颜色沿什么路径变化">
        linear 沿直线，radial 向外辐射，conic 围绕中心。它们都是 CSS 图像，不是
        DOM
        节点；这里用于装饰，不代替图表数据或可访问文字。本节所有效果保持静态，参数可以手动反复切换。
      </Note>
    </>
  );
}
function CompareLab({ data, patch }) {
  const base = "linear-gradient(140deg, #171d31, #343052)";
  return (
    <>
      <div className="glow-lab">
        <div className="panel-heading">
          <span>同一内容与底层 · 只给右侧加装饰盒</span>
          <span className="code-tag">::before</span>
        </div>
        <div className="glow-compare">
          <div>
            <h3>① 简单渐变</h3>
            <Poster image={base} testId="simple-poster" />
          </div>
          <div>
            <h3>② 渐变 + 可开关光晕</h3>
            <Poster
              image={base}
              light={data.overlay}
              styles={lightStyle(
                data.palette,
                data.lightPosition,
                data.strength,
                data.glowBlur,
              )}
              testId="layered-poster"
            />
          </div>
        </div>
        <div className="glow-reading" data-testid="overlay-reading">
          {!data.overlay
            ? "右侧额外光晕已关闭，应与左侧呈现相同的简单渐变。"
            : data.strength === 0
              ? "额外装饰盒仍存在，但强度为 0；当前没有可见光晕。"
              : `右侧额外光源：${glowPositions[data.lightPosition].label}，强度 ${data.strength}，装饰层 blur(${data.glowBlur}px)。`}
          {data.overlay && data.strength > 0 && data.glowBlur === 0
            ? " 即使不加 blur，radial-gradient 本身也能形成柔和过渡。"
            : ""}{" "}
          模糊只处理空内容装饰盒，不模糊正文。
        </div>
        <div className="glow-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.overlay}
              onChange={(e) =>
                patch({
                  overlay: e.target.checked,
                  overlayOffSeen: data.overlayOffSeen || !e.target.checked,
                  overlayOnSeen: data.overlayOnSeen || e.target.checked,
                })
              }
            />
            显示右侧额外光晕
          </label>
          <Choices
            label="额外光源位置"
            value={data.lightPosition}
            values={positionOptions}
            onChange={(v) =>
              patch({
                lightPosition: v,
                lightMoved: v !== "center" || data.lightMoved,
              })
            }
          />
          <Choices
            label="额外光源强度"
            value={data.strength}
            values={[
              [0, "0 · 关闭强度"],
              [0.55, "0.55 · 适中"],
              [0.9, "0.90 · 较强"],
            ]}
            onChange={(v) =>
              patch({
                strength: v,
                strengthChanged: v !== 0.55 || data.strengthChanged,
              })
            }
          />
          <Choices
            label="装饰层模糊"
            value={data.glowBlur}
            values={[
              [0, "0px"],
              [12, "12px"],
              [24, "24px"],
            ]}
            onChange={(v) =>
              patch({
                glowBlur: v,
                glowBlurChanged: v !== 12 || data.glowBlurChanged,
              })
            }
          />
        </div>
      </div>
      <Note title="伪元素是实现选择，不是发光的证据">
        本例的空 ::before 盒叠加
        radial-gradient，再对这一层模糊。也可以使用独立装饰元素或多背景；若简单渐变已经满足要求，就保留简单方案。装饰盒允许裁切以收住光晕，正文与焦点放在裁切层外。截图无法识别具体
        DOM、伪元素或 WebGL 实现。
      </Note>
    </>
  );
}
function SpotlightLab({ data, patch }) {
  const [result, setResult] = useState("本次尚未操作；请使用上方收藏按钮。");
  const activate = (e) => {
    const button = e.currentTarget,
      r = button.getBoundingClientRect(),
      hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      ),
      ok = hit === button || button.contains(hit);
    patch((old) => ({
      saved: !old.saved,
      stateUsed: true,
      hitVerified: old.hitVerified || ok,
    }));
    setResult(
      ok
        ? "真实命中：收藏按钮；装饰没有拦截这个操作点。"
        : "当前操作点未命中按钮，请检查可见范围后重试。",
    );
  };
  return (
    <>
      <div className="glow-lab">
        <div className="panel-heading">
          <span>静态聚光 · 装饰层不承担交互</span>
          <span className="code-tag">pointer-events: none</span>
        </div>
        <Poster
          image="linear-gradient(140deg, #171d31, #343052)"
          light
          styles={lightStyle(
            data.palette,
            data.spotPosition,
            data.spotStrength,
            12,
            data.spotSize,
          )}
          testId="spot-poster"
        >
          <span className="glow-caption">◇ 观察笔记</span>
          <h3>
            {data.longCopy
              ? "把一张发光的卡片，拆成清楚的光源与内容约束"
              : "光停在背后，操作留在眼前"}
          </h3>
          <p>
            {data.longCopy
              ? "这段完整说明用于检查窄屏与更长内容。背景负责氛围，正文有独立实底；按钮、文字状态与键盘焦点必须始终清楚，不把隐藏重要内容当成修好布局。"
              : "把光源关到零，收藏状态和操作仍然清楚。"}
          </p>
          <span className="glow-state" role="status">
            {data.saved ? "✓ 已收藏 · 有文字状态" : "○ 未收藏 · 有文字状态"}
          </span>
          <button
            className="glow-action"
            aria-pressed={data.saved}
            data-testid="spot-action"
            onClick={activate}
          >
            {data.saved ? "取消收藏" : "收藏卡片"}
          </button>
        </Poster>
        <div className="glow-reading" role="status" data-testid="spot-result">
          {result}{" "}
          {data.spotStrength === 0
            ? "当前聚光强度为 0，没有可见额外光源。"
            : "强度只影响装饰，重要内容与状态有独立表达。"}
        </div>
        <div className="glow-controls">
          <Choices
            label="聚光位置"
            value={data.spotPosition}
            values={positionOptions}
            onChange={(v) =>
              patch({
                spotPosition: v,
                spotMoved: v !== "center" || data.spotMoved,
              })
            }
          />
          <Choices
            label="聚光强度"
            value={data.spotStrength}
            values={[
              [0, "0 · 无聚光"],
              [0.45, "0.45 · 适中"],
              [0.8, "0.80 · 较强"],
            ]}
            onChange={(v) =>
              patch((old) => ({
                spotStrength: v,
                strengthsSeen: add(old.strengthsSeen, v),
              }))
            }
          />
          <Choices
            label="聚光范围"
            value={data.spotSize}
            values={[
              ["compact", "局部"],
              ["wide", "较宽"],
            ]}
            onChange={(v) => patch({ spotSize: v })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.longCopy}
              onChange={(e) => patch({ longCopy: e.target.checked })}
            />
            检查更长的完整内容
          </label>
        </div>
      </div>
      <Note title="不拦截点击，还要检查焦点与阅读">
        本例装饰容器与空伪元素都不接收指针，也没有可聚焦内容；正文、状态和按钮位于独立内容层。pointer-events:
        none 不会自动让任意元素退出 Tab
        顺序，因此不能替代完整键盘验收。这里不使用
        WebGL：若需求只是静态光晕，先比较 CSS
        方案；复杂着色或三维场景再按能力与成本评估。
      </Note>
    </>
  );
}
function GlowReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第九节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本节使用真实 CSS 渐变与空 ::before
          装饰盒，效果静态、无自动运动；文字不放在滤镜层中。区分直线、半径和角度方向，不把柔和过渡一律归因于额外
          blur。CSS 内部可能获得 GPU 加速，但这不能证明应用用了 WebGL
          或三维库。按目标浏览器检查具体语法及滤镜；大面积模糊与后续动画仍需实测成本。路线总核对日期保留为
          2026-10-20，不宣称永远最新。
        </p>
        <div className="source-links">
          {glowSources.map(([label, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {label} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonNine({ onStorageStatus }) {
  const [data, setData] = useState(readGlowProgress),
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
      localStorage.setItem(GLOW_STORAGE, JSON.stringify(data));
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
        ["linear", "radial", "conic"].every((v) => data.typesSeen.includes(v)),
        "比较三种真实渐变",
      ],
      [
        data.paletteChanged && data.angleChanged,
        "在线性 / 环绕渐变下调整颜色与方向",
      ],
      [data.positionChanged, "移动 radial / conic 的中心"],
    ],
    [
      [data.overlayOffSeen && data.overlayOnSeen, "关闭并重新打开右侧光晕"],
      [data.lightMoved, "移动额外光源"],
      [data.strengthChanged && data.glowBlurChanged, "分别比较强度与模糊"],
    ],
    [
      [data.spotMoved, "移动聚光位置"],
      [
        [0, 0.8].every((v) => data.strengthsSeen.includes(v)),
        "比较零强度与较强聚光",
      ],
      [data.stateUsed && data.hitVerified, "操作收藏并验证真实命中"],
    ],
    glowQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成可编辑的光源指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查光源、层级、可读性与验收",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = glowSteps[data.step];
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
      setNotice("第九节已完成。" + nextLessonHint(8));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const scenario =
      data.brief === "hero"
        ? "为介绍区实现静态渐变与局部光晕"
        : "为可操作的资料卡片实现静态聚光装饰";
    const draft = `请在现有项目中${scenario}。先说明布局与文字层级，优先采用足够简单的 CSS 实现，不根据截图认定真实技术。

光源合同：明确使用 linear / radial / conic 的哪一种、颜色停靠点与变化方向。当前参考色组为${glowPalettes[data.palette].label}，角度 ${data.angle}deg，中心 ${glowPositions[data.lightPosition].x}% ${glowPositions[data.lightPosition].y}%。linear 用角度描述方向；radial 按半径，conic 按围绕中心的角度变化，不能机械互换。

装饰与层级：先比较单层渐变是否已足够；需要额外光晕时，可用空内容 ::before 或无语义装饰元素叠加 radial-gradient，并局部 blur(${data.glowBlur}px)、强度 ${data.strength}。这些是参考起点，按内容调整。模糊只作用装饰，不处理整个文字和操作容器。装饰层不放可聚焦内容，使用 pointer-events: none，明确本地层叠范围、内容层与裁切边界，不裁掉重要文字和焦点。

可读性：给重要文字稳定底色、足够对比度和必要边界；状态同时提供文字、图标或适当语义。焦点有独立可见轮廓。强度为 0、关闭光晕、长文字与 375px 窄屏时，信息与操作仍完整。

工具边界：CSS 渐变是生成的图像，伪元素是附加绘制盒，不是 WebGL。看到发光不等于使用 GPU 图形库；浏览器内部可能加速 CSS，也不等于应用调用 WebGL。只有明确需要复杂逐像素着色、三维场景等能力时，再说明为什么值得采用 WebGL 相关方案，不为静态装饰引入大型库。

验收：
1. 在桌面和 375px 手机实际切换渐变类型、颜色、中心与方向，检查渲染变化，不只看 CSS 字符串。
2. 比较单层与叠加光晕，分别改变位置、强度和模糊；强度为 0 时装饰应消失，不伪造发光。
3. 用真实命中测试、触屏和完整键盘操作按钮，确认装饰不拦截点击、不遮住文本或焦点；不把 pointer-events 当作键盘与可访问性的全部方案。
4. 按目标浏览器检查兼容性；不支持所需渐变或滤镜时回退到可读的纯色 / 简单渐变。
${data.includeEdges ? "5. 当前采用静态方案。若后来增加动画，说明必要性、暂停入口、prefers-reduced-motion 与静态替代；实测大面积模糊与动画的成本，不虚构性能数字。" : "5. 保持静态可读方案，检查绘制范围和目标设备性能。"}

请先给出光源位置、层级、强度、可读性与简单实现的取舍，再实现并逐条自测。`;
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
      localStorage.removeItem(GLOW_STORAGE);
    } catch {}
    setData(glowInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第九节的进度、参数与草稿；前八节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-nine">
      <div className="lesson-overline">
        <span className="pill">第九节 · 渐变与光晕</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            渐变与光晕<span className="title-period">.</span>
          </h1>
          <p>光有方向，内容有自己的清楚位置。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>09</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 识别渐变方向
        </span>
        <span>
          <Icon type="check" size={16} /> 比较单层与光晕
        </span>
        <span>
          <Icon type="check" size={16} /> 让装饰让路
        </span>
      </div>
      <nav className="stepper" aria-label="第九节学习步骤">
        {glowSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="glow-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            GLOW LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="glow-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <GradientLab data={data} patch={patch} />}
        {data.step === 1 && <CompareLab data={data} patch={patch} />}
        {data.step === 2 && <SpotlightLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {glowQuestions.map((q, i) => {
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
              <h3>你的渐变光晕简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="hero">介绍区渐变与光晕</option>
                  <option value="card">可操作卡片聚光</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入动态偏好与性能边界
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成渐变光晕草稿" : "生成渐变光晕指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的渐变光晕指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制渐变光晕指令
                </button>
              </div>
              <label className="sr-only" htmlFor="glow-agent-draft">
                可编辑的 渐变光晕 Agent 指令
              </label>
              <textarea
                id="glow-agent-draft"
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
                placeholder="生成后，补充光源位置、强度与文字层级要求。"
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
                我已检查光源、层级、可读性和验收方式。
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
                  ? "完成第九节"
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
          重置第九节进度
        </button>
      </div>
      <GlowReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="glow-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="glow-reset-title">重新开始第九节？</h2>
        <p>仅清除第九节的进度、实验参数和草稿；前八节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第九节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第九节
          </button>
        </div>
      </dialog>
    </div>
  );
}
