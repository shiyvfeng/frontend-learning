import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  POINTER_STORAGE,
  pointerSteps,
  pointerQuestions,
  pointerSources,
  pointerScope,
  pointerInitial,
  readPointerProgress,
} from "./lesson-twenty-three-content";
import PointerWorkbench from "./lesson-twenty-three-lab";
import "./lesson-twenty-three.css";
const add = (a, v) => [...new Set([...a, v])];
function PointerReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十三节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课实际使用Pointer
          Events、当前getBoundingClientRect、CSS变量与radial-gradient/perspective/rotateX/rotateY，不使用图形库。只读CSS平面倾斜不等于完整3D场景或图形扭曲。每帧合并最新输入，不逐帧重建组件树；离开、取消、失焦、隐藏、减少动态与卸载清理。触摸保留原生滚动，键盘/触屏分区按钮更新同样参数。官方资料于2026-10-22核对。
        </p>
        <div className="source-links">
          {pointerSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwentyThree({ onStorageStatus }) {
  const [data, setData] = useState(readPointerProgress),
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
      localStorage.setItem(POINTER_STORAGE, JSON.stringify(data));
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
  const [instanceEpoch, setInstanceEpoch] = useState(0);
  const tasks = [
    [
      [data.alternativeSeen, "用分区按钮改变同样的坐标参数"],
      [data.centered, "复位到中央"],
      [data.inspected, "读取局部坐标与当前边界"],
    ],
    [
      [data.tiltChanged, "改变倾斜限幅"],
      [data.lightChanged, "切换聚光，内容仍完整"],
      [data.captionChanged, "填入或编辑卡片文案"],
    ],
    [
      [data.reducedChecked, "体验减少动态的静态采样"],
      [data.fallbackReviewed, "体验能力不足的静态替代"],
      [data.cleanupReviewed, "复位并清理待处理更新"],
    ],
    pointerQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成指针交互简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查跟随范围、幅度、成本、替代与减少动态",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = pointerSteps[data.step];
  const go = (next) => {
    patch({ step: next });
    generation.current++;
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
      setNotice("第二十三节已完成。" + nextLessonHint(22));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请实现局部Cursor / Pointer Driven Interaction。目标是轻量跟手反馈，不遮挡内容、不控制用户的阅读。卡片文案：${data.caption}。

实现范围：${pointerScope}

坐标与跟随范围：只跟随有边界的只读卡片，使用相同视口坐标系的clientX/clientY减去当前边界left/top，再除以实际宽高。测量未变形的外壳，不能用已倾斜元素的矩形反复反馈，也不能混用pageX或永久缓存旧矩形。归一化坐标夹在0–1；滚动/resize及容器尺寸变化时按当前边界重算，已离开边界则复位。分区按钮输入的是归一化采样点，不能假称真实指针位置。

视觉与限幅：radial-gradient只改变聚光位置；CSS perspective(800px)与rotateX/rotateY只倾斜一个平面。本次倾斜上限±${data.amplitude}°，产品合理范围最多±8°，不要夸张转动。文字放在稳定高对比底色，装饰不盖正文，给外壳留边距。不是像素/几何扭曲、材质灯光或完整3D场景，不得假称接入WebGL/Three.js或物理spring。

更新成本：被动几何监听，pointermove只保存最新坐标，每次最多一个待处理requestAnimationFrame。提交时读取当前矩形，写少量CSS变量与只读读数，不每帧setState重建大量React UI、不全页查询测量、不自转或持续追赶。空闲无持续rAF；不要给所有组件常驻will-change。装饰层pointer-events:none、aria-hidden且无Tab目标；操作按钮放在变形区域外，不给不可交互卡片伪装按钮语义。

输入替代：只让主鼠标/笔移动驱动连续跟随；触摸不捕获指针、不preventDefault、不阻止页面滚动或缩放。键盘/触屏分区按钮真实改变相同局部坐标和可见参数，提供中央复位、2°/5°/8°限幅、聚光/倾斜开关和可编辑文案；hover不是完成唯一门槛。窄屏/短视口控件换行、正常页面滚动，不裁切正文或用移动装饰挡住按钮。

退出与回退：pointerleave、pointercancel、窗口blur、页面隐藏、减少动态、暂停跟随或重置均取消待处理帧、清除客户端坐标并回中央；代次先失效，旧回调不能清掉新请求或改回旧样本。卸载断开scroll/resize/blur/visibility监听、ResizeObserver和偏好监听。无Pointer Events时使用同一组分区按钮；观察器不足仍在输入时读取当前矩形。

减少动态：实时prefers-reduced-motion和用户开关停止连续跟随与所有倾斜，内容完整。分区按钮仍可选择静态聚光采样，坐标文字真实更新；明确“静态采样，倾斜暂停”，不能假称旋转仍生效。不逐帧用live region播报指针坐标，不关闭焦点轮廓，不强抢外部焦点。

验收：真实指针移到不同角落，CSS聚光与矩阵变化且不超限；滚动和resize后与当前边界对齐，离开/取消/失焦/隐藏/重置/卸载回中央且旧回调隔离。快速输入合并，空闲无循环，装饰不截获输入；桌面/375px及短视口完整可读。实际Tab和正常/系统reduce零键盘触屏均完成分区采样、错题重试、示例与真实编辑、复制回退、刷新和取消/确认重置，保留01–22进度。只实现23，不开始24。`,
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
    generation.current++;
    try {
      localStorage.removeItem(POINTER_STORAGE);
    } catch {}
    setData(pointerInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十三节的进度、参数与草稿；前二十二节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-twenty-three">
      <div className="lesson-overline">
        <span className="pill">第二十三节 · Cursor / Pointer Driven</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Cursor / Pointer Driven<span className="title-period">.</span>
          </h1>
          <p>让反馈跟手，让内容和阅读保持稳定。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>23</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 认出局部坐标
        </span>
        <span>
          <Icon type="check" size={16} /> 克制幅度与成本
        </span>
        <span>
          <Icon type="check" size={16} /> 保留输入替代
        </span>
      </div>
      <nav className="stepper" aria-label="第二十三节学习步骤">
        {pointerSteps.map((s, i) => (
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
        aria-labelledby="pointer-interaction-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            POINTER LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2
            id="pointer-interaction-stage-heading"
            tabIndex={-1}
            ref={headingRef}
          >
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <PointerWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {pointerQuestions.map((q, i) => {
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
              <h3>你的指针交互简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成指针交互草稿" : "生成指针交互指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的指针交互指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制指针交互指令
                </button>
              </div>
              <label
                className="sr-only"
                htmlFor="pointer-interaction-agent-draft"
              >
                可编辑的 指针交互 Agent 指令
              </label>
              <textarea
                id="pointer-interaction-agent-draft"
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
                placeholder="生成后，补充 跟随范围、幅度与验收。"
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
                我已检查 跟随范围、幅度、成本、替代与减少动态。
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
                  ? "完成第二十三节"
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
          重置第二十三节进度
        </button>
      </div>
      <PointerReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="pointer-interaction-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="pointer-interaction-reset-title">重新开始第二十三节？</h2>
        <p>仅清除第二十三节的进度、实验参数和草稿；前二十二节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留第二十三节进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置第二十三节
          </button>
        </div>
      </dialog>
    </div>
  );
}
