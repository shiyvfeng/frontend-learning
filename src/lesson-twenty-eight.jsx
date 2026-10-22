import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  MOTION_STORAGE,
  motionSteps,
  motionQuestions,
  motionSources,
  motionScope,
  motionBrief,
  motionInitial,
  readMotionProgress,
} from "./lesson-twenty-eight-content";
import MotionWorkbench from "./lesson-twenty-eight-lab";
import "./lesson-twenty-eight.css";
const add = (a, v) => [...new Set([...a, v])];
function MotionReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十八节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          {motionScope}{" "}
          官方资料于2026-10-22核对。dotLottie状态机需对应资产和runtime支持；Rive旧Inputs属legacy，新项目核对Data
          Binding。计划功能与素材许可分别确认。
        </p>
        <div className="source-links">
          {motionSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwentyEight({ onStorageStatus }) {
  const [data, setData] = useState(readMotionProgress),
    [notice, setNotice] = useState(""),
    [copyMessage, setCopyMessage] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const headingRef = useRef(null),
    draftRef = useRef(null),
    dialogRef = useRef(null),
    resetRef = useRef(null),
    generation = useRef(0),
    copyBusy = useRef(false),
    navigationFrame = useRef(0),
    focusRevision = useRef(0);
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(MOTION_STORAGE, JSON.stringify(data));
      onStorageStatus("进度仅保存在当前浏览器");
    } catch {
      onStorageStatus("浏览器存储不可用；本次进度仅在页面内保留");
    }
  }, [data, onStorageStatus]);
  useEffect(() => {
    const trackFocus = () => focusRevision.current++;
    document.addEventListener("focusin", trackFocus);
    const active = document.activeElement;
    if (
      !headingRef.current?.closest(".lesson-twenty-eight")?.contains(active) ||
      active === headingRef.current
    )
      headingRef.current?.focus();
    return () => {
      generation.current++;
      document.removeEventListener("focusin", trackFocus);
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
      [data.loadedSeen, "加载真实Lottie资源"],
      [data.sampledSeen, "改变实际关键帧采样"],
      [data.speedSeen, "选择播放速度"],
      [data.boundaryReviewed, "记录双方实际与模拟边界"],
    ],
    [
      [data.boolSeen, "改变持续条件布尔值"],
      [data.numberSeen, "改变程度数值"],
      [data.triggerSeen, "触发一次事件"],
      [data.mappedSeen, "把业务状态显式映射到表现"],
    ],
    [
      [data.failureSeen, "体验资源失败"],
      [data.retrySeen, "失败后重试就绪"],
      [data.canceledSeen, "取消加载"],
      [data.staleSeen, "应用旧结果并核对隔离"],
    ],
    motionQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成动画集成简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查播放、输入、来源与回退",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = motionSteps[data.step];
  const go = (next) => {
    const before = document.activeElement,
      revision = focusRevision.current,
      focusId = ++generation.current;
    patch({ step: next });
    setNotice("");
    setCopyMessage("");
    if (navigationFrame.current) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      if (generation.current !== focusId || focusRevision.current !== revision)
        return;
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
      setNotice("第二十八节已完成。" + nextLessonHint(27));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: motionBrief(data),
      generated: true,
      reviewed: false,
    });
    setCopyMessage("");
  };
  const copy = async () => {
    if (copyBusy.current) return;
    copyBusy.current = true;
    const id = generation.current,
      revision = focusRevision.current,
      origin = document.activeElement;
    try {
      if (!navigator.clipboard?.writeText) throw Error("unavailable");
      await navigator.clipboard.writeText(data.draft);
      if (id === generation.current)
        setCopyMessage("已复制，可以粘贴给 Coding Agent。");
    } catch {
      if (id === generation.current) {
        if (
          focusRevision.current === revision &&
          (document.activeElement === origin ||
            document.activeElement === document.body)
        ) {
          setCopyMessage(
            "自动复制不可用：已选中全文，请按 Ctrl+C / ⌘C；手机可长按复制。",
          );
          draftRef.current?.focus();
          draftRef.current?.select();
        } else {
          setCopyMessage(
            "自动复制不可用：请返回指令框全选复制；当前焦点保持不变。",
          );
        }
      }
    } finally {
      copyBusy.current = false;
    }
  };
  const reset = () => {
    dialogRef.current?.close();
    resetRef.current?.focus();
    const before = document.activeElement,
      revision = focusRevision.current,
      focusId = ++generation.current;
    try {
      localStorage.removeItem(MOTION_STORAGE);
    } catch {}
    setData(motionInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十八节的进度、参数与草稿；前二十七节进度已保留。");
    if (navigationFrame.current) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      if (generation.current !== focusId || focusRevision.current !== revision)
        return;
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
    <div className="lesson-two lesson-twenty-eight">
      <div className="lesson-overline">
        <span className="pill">第二十八节 · Lottie 与 Rive</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Lottie 与 Rive<span className="title-period">.</span>
          </h1>
          <p>一个控制时间，一个映射输入；先辨认资产与运行时，再写清表现。</p>
          <p className="motion28-hero-boundary">
            <strong>真实Lottie播放 · Rive输入模拟</strong> · 自制JSON +
            lottie-web；没有.riv或Rive SDK
          </p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>28</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 区分播放与输入
        </span>
        <span>
          <Icon type="check" size={16} /> 显式映射业务状态
        </span>
        <span>
          <Icon type="check" size={16} /> 减少动态与回退
        </span>
      </div>
      <nav className="stepper" aria-label="第二十八节学习步骤">
        {motionSteps.map((s, i) => (
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
        aria-labelledby="motion28-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            ANIMATION LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="motion28-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <MotionWorkbench key={instanceEpoch} data={data} patch={patch} />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {motionQuestions.map((q, i) => {
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
              <h3>你的动画集成简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成动画集成草稿" : "生成动画集成指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的动画集成指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制动画集成指令
                </button>
              </div>
              <label className="sr-only" htmlFor="motion28-agent-draft">
                可编辑的 动画集成 Agent 指令
              </label>
              <textarea
                id="motion28-agent-draft"
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
                placeholder="生成后，补充 资产来源、播放控制、输入类型与加载回退。"
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
                我已检查 播放、输入、来源与回退。
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
                  ? "完成第二十八节"
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
          重置第二十八节进度
        </button>
      </div>
      <MotionReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="motion28-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="motion28-reset-title">重新开始第二十八节？</h2>
        <p>仅清除第二十八节的进度、实验参数和草稿；前二十七节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留第二十八节进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置第二十八节
          </button>
        </div>
      </dialog>
    </div>
  );
}
