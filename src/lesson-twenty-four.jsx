import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  CANVAS_STORAGE,
  canvasSteps,
  canvasQuestions,
  canvasSources,
  canvasScope,
  canvasInitial,
  readCanvasProgress,
} from "./lesson-twenty-four-content";
import CanvasWorkbench from "./lesson-twenty-four-lab";
import "./lesson-twenty-four.css";
const add = (a, v) => [...new Set([...a, v])];
function CanvasReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十四节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课实际使用Canvas
          2D绘制圆形、矩形、文字与选中轮廓，未使用DOM图形、静态图片、WebGL或3D。图形模型、反向几何命中、20步撤销与外部可访问列表由应用维护。CSS尺寸、DPR位图尺寸、逻辑场景与视图缩放分开，resize从原模型重绘。8对象只是教学限制，不是跨技术性能基准。官方资料于2026-10-22核对。
        </p>
        <div className="source-links">
          {canvasSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwentyFour({ onStorageStatus }) {
  const [data, setData] = useState(readCanvasProgress),
    [notice, setNotice] = useState(""),
    [copyMessage, setCopyMessage] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const headingRef = useRef(null),
    draftRef = useRef(null),
    dialogRef = useRef(null),
    resetRef = useRef(null),
    generation = useRef(0),
    copyBusy = useRef(false),
    navigationFrame = useRef(0);
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(CANVAS_STORAGE, JSON.stringify(data));
      onStorageStatus("进度仅保存在当前浏览器");
    } catch {
      onStorageStatus("浏览器存储不可用；本次进度仅在页面内保留");
    }
  }, [data, onStorageStatus]);
  useEffect(() => {
    const active = document.activeElement;
    if (
      !headingRef.current?.closest(".lesson-twenty-four")?.contains(active) ||
      active === headingRef.current
    )
      headingRef.current?.focus();
    return () => {
      generation.current++;
      if (navigationFrame.current)
        cancelAnimationFrame(navigationFrame.current);
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
  const [instanceEpoch, setInstanceEpoch] = useState(0);
  const tasks = [
    [
      [data.added, "添加一个场景对象"],
      [data.selectedSeen, "通过画布或列表选择"],
      [data.moved, "用外部按钮移动对象"],
    ],
    [
      [data.deleted, "删除所选对象"],
      [data.undone, "撤销数据修改并重绘"],
      [data.inspected, "读取Canvas尺寸与额外语义说明"],
    ],
    [
      [data.zoomChanged, "切换视图缩放"],
      [data.alphaChanged, "切换半透明填充"],
      [data.emptyRecovered, "清空后恢复场景数据"],
    ],
    canvasQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成Canvas绘图简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查对象、命中、DPR、撤销与替代操作",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = canvasSteps[data.step];
  const go = (next) => {
    const before = document.activeElement,
      focusId = ++generation.current;
    patch({ step: next });
    setNotice("");
    setCopyMessage("");
    if (navigationFrame.current) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      if (generation.current !== focusId) return;
      navigationFrame.current = 0;
      const active = document.activeElement;
      if (active === before || active === document.body)
        headingRef.current?.focus();
    });
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
      setNotice("第二十四节已完成。" + nextLessonHint(23));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请实现可访问、可撤销的Canvas 2D教学场景。场景标题：${data.caption}。用户只需识图与操作，不要求手写代码。

真实绘制：${canvasScope}

对象模型：使用独立600×360逻辑场景保存稳定ID、形状、中心、尺寸与颜色；添加/选择/移动/删除都更新模型再重绘。圆形与矩形由真实2D路径绘制，短ID用fillText。最多8个对象只是教学保护，不能据此宣称Canvas总比SVG快。画布内短按只选择，移动由外部方向按钮完成，不伪称实现拖拽。

像素密度与视图：Canvas CSS宽高来自实际容器；位图width/height为CSS尺寸×当前DPR后取整，并在每次绘制设置与真实取整位图一致的基变换。改变width/height会清空位图和上下文状态，要从同一模型重绘，不能误清场景。监听容器resize、窗口resize与DPR媒体变化，重新测量和设置变换。视图${Math.round(data.zoom * 100)}%是另外的居中逻辑缩放；倍率大于100%时边缘对象可暂时在窗口外，但列表完整，可回100%，数据不丢。

坐标与命中：从当前getBoundingClientRect把clientX/clientY变成CSS局部坐标，再反算居中偏移与视图scale到逻辑坐标，不重复乘DPR。按绘制顺序反向做圆/矩形几何命中，选最上层；空白点击不删对象。本例半透明只影响填充，ID与选中轮廓不透明，几何命中不代表透明点击穿透。空场景模型无对象、位图清透明、文字反馈与恢复入口完整，CSS棋盘底纹不冒充Canvas图形。

替代与语义：Canvas不会为每个图形自动生成DOM、按钮或键盘语义。画布外提供可访问对象列表、稳定选择按钮、坐标尺寸、移动/删除/撤销/恢复和文本反馈，键盘/触屏不依赖拖拽。控件不盖绘图区；删除和清空不让当前持焦控件突然失效，若程序操作移除持焦列表项，只在焦点仍由本次操作拥有时恢复可见入口，不抢外部新焦点。

撤销与边界：修改前保存模型快照，保留20步，不用位图截图代替可编辑对象。选择本身不占撤销历史；删除、移动、添加、清空和恢复可撤销，标题/视图/透明度偏好不在模型撤销内。对象中心按半尺寸限在逻辑场景内，重复越界操作反馈未移动；上限、空列表和无历史时给准确说明，按钮仍可访问，不能假成功。

输入和清理：仅主指针短按且移动不超过8 CSS px、时长不超过600ms才选择；长按、滑动、leave/cancel/blur/隐藏、尺寸变化取消本次按压。触摸保留原生页面滚动/缩放，不捕获指针、不preventDefault。数据、视图、尺寸与DPR变化最多合并一个待处理rAF，空闲无循环；隐藏取消待处理帧，恢复重绘，卸载断开observer、媒体和全局监听，旧代次回调不能改新会话。这里是必要离散重绘，没有装饰动画，减少动态下全部操作一致。

选型与回退：按对象数量、交互/语义、更新频率和目标设备实测选DOM/SVG/Canvas。需要逐对象DOM语义或简单矢量编辑时优先比较SVG/DOM；Canvas适用时也要承担命中、重绘、像素密度与历史成本。getContext不可用或上下文丢失时明确提示、保留模型和对象列表，重试绘制，不用DOM图形伪装成功，也不命中未绘制的隐藏对象。本课不接入WebGL或3D。

验收：真实2D像素与透明背景采样，DPR1/2及resize后位图尺寸匹配，缩放后点击同一对象仍正确；快速添加/移动/删除/撤销、超界、空状态、半透明、长按/取消、焦点与触摸页面滚动。桌面/375px与短视口、axe、真实Tab和正常/系统reduce零键盘触屏完成错题重试、示例与真实编辑、复制回退、刷新、取消/确认重置，保留01–23进度。只实现24，不开始25。`,
      generated: true,
      reviewed: false,
    });
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
    const before = document.activeElement,
      focusId = ++generation.current;
    try {
      localStorage.removeItem(CANVAS_STORAGE);
    } catch {}
    setData(canvasInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十四节的进度、参数与草稿；前二十三节进度已保留。");
    if (navigationFrame.current) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      if (generation.current !== focusId) return;
      navigationFrame.current = 0;
      const active = document.activeElement;
      if (
        active === before ||
        active === document.body ||
        active === resetRef.current
      )
        headingRef.current?.focus();
    });
  };
  return (
    <div className="lesson-two lesson-twenty-four">
      <div className="lesson-overline">
        <span className="pill">第二十四节 · Canvas</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Canvas<span className="title-period">.</span>
          </h1>
          <p>一块位图，多份可访问、可撤销的图形数据。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>24</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 辨认真实像素绘制
        </span>
        <span>
          <Icon type="check" size={16} /> 维护命中与历史
        </span>
        <span>
          <Icon type="check" size={16} /> 保留访问与恢复
        </span>
      </div>
      <nav className="stepper" aria-label="第二十四节学习步骤">
        {canvasSteps.map((s, i) => (
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
      <section
        className="lesson-stage"
        aria-labelledby="canvas-stage-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            CANVAS LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="canvas-stage-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <CanvasWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {canvasQuestions.map((q, i) => {
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
              <h3>你的Canvas绘图简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated
                  ? "重新生成Canvas绘图草稿"
                  : "生成Canvas绘图指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的Canvas绘图指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制Canvas绘图指令
                </button>
              </div>
              <label className="sr-only" htmlFor="canvas-stage-agent-draft">
                可编辑的 Canvas绘图 Agent 指令
              </label>
              <textarea
                id="canvas-stage-agent-draft"
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
                placeholder="生成后，补充 对象模型、像素密度与验收。"
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
                我已检查 对象、命中、DPR、撤销与替代操作。
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
                  ? "完成第二十四节"
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
          重置第二十四节进度
        </button>
      </div>
      <CanvasReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="canvas-stage-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="canvas-stage-reset-title">重新开始第二十四节？</h2>
        <p>仅清除第二十四节的进度、实验参数和草稿；前二十三节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留第二十四节进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置第二十四节
          </button>
        </div>
      </dialog>
    </div>
  );
}
