import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  MICRO_STORAGE,
  microSteps,
  microQuestions,
  microSources,
  microInitial,
  readMicroProgress,
} from "./lesson-seventeen-content";
import MicroWorkbench from "./lesson-seventeen-lab";
import "./lesson-seventeen.css";
const add = (a, v) => [...new Set([...a, v])];
function MicroReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十七节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课原生 CSS transition 对比手写 requestAnimationFrame
          弹簧积分，没有安装
          Motion。弹簧参数是教学本地单位，不承诺与任何库数值完全等价；本课只介绍微交互机制，后续
          Spring
          专题仍为预告。真实事件驱动状态，无网络或自动业务成功。减少动态实时监听且保留静态反馈，焦点轮廓始终保留。来源说明
          API 与概念，不代表本示例由这些库实现。
        </p>
        <div className="source-links">
          {microSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonSeventeen({ onStorageStatus }) {
  const [data, setData] = useState(readMicroProgress),
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
      localStorage.setItem(MICRO_STORAGE, JSON.stringify(data));
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
      [data.cssUsed, "真实激活 CSS 示例"],
      [data.springUsed, "真实激活 spring 示例"],
      [data.focusSeen, "体验真实焦点及可见轮廓"],
    ],
    [
      [data.strengthChanged, "调整位移强度"],
      [data.durationChanged, "调整 CSS 时长"],
      [data.springChanged, "切换弹簧配方"],
      [data.labelEdited, "填入示例或编辑反馈文案"],
      [data.compared, "记录 CSS 与 spring 的机制边界"],
    ],
    [
      [data.reduceToggled, "切换暂停位移，保留状态反馈"],
      [data.boundaryReviewed, "核对取消、禁用与静态状态反馈"],
    ],
    microQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成微交互简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查触发、属性、强度、减少动态与验收",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = microSteps[data.step];
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
      setNotice("第十七节已完成。" + nextLessonHint(16));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请在现有项目实现清晰克制的微交互，先判断 CSS 是否已足够。简单颜色/透明度/两点位移先用 CSS transition 明确属性、时长和缓动；只有需要可打断跟随、速度连续和回弹时才评估 spring，不强制所有按钮弹跳。若引库写清实际依赖，不假称使用 Motion。

触发：真实鼠标 hover、键盘 focus、指针 press/tap 与空格/Enter。hover 不承载必需信息，触屏和键盘有等价激活及状态反馈；辅助预览如存在须明确标记，不能冒充真实事件。保留独立可见焦点轮廓，不把 outline 当装饰关闭。

变化属性：背景/边框区分状态，transform 表达轻微按压/松开；当前教学位移 ${data.strength}px、CSS ${data.duration}ms ease-out、spring ${data.preset}。实际产品按内容与风险调强度，避免布局跳动。手写 spring 应交代积分方法、刚度k/阻尼c/质量m、收敛阈值与帧清理；固定时长插值与物理回弹不是同一机制，稳定时间不冒称固定值。

激活与取消：按压过程不等于成功。移出、pointercancel、失去捕获、窗口失焦、Escape、keyup/blur 的路径均不能卡住按压。长按键重复和重复点击须有明确策略；这里每次有效激活仅切换本地收藏，未联网，不代表真实服务器成功。disabled 不可激活、没有假成功动效，原因旁置可访问文字。

减少动态：首次和运行途中响应 prefers-reduced-motion；停止非必要位移/回弹，清理 rAF，保留状态文字、符号、aria-pressed 与焦点。手动暂停不能覆盖系统减少动态要求。离课、换站、重置和卸载都取消残留动画及输入会话。live-region 只播离散结果，不逐帧朗读。

验收：真实 hover/focus/press、触屏tap、Space/Enter松开激活、长按重复、按住移出、pointercancel、Escape/blur、禁用零激活、中途切换减少动态及重复打断、卸载后无帧循环。桌面与375px、axe、完整键盘和零键盘触屏完成错题重试、编辑/复制成功与失败回退、刷新以及取消/确认重置。保留01–16进度，只实现第17课。`,
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
      localStorage.removeItem(MICRO_STORAGE);
    } catch {}
    setData(microInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十七节的进度、参数与草稿；前十六节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-seventeen">
      <div className="lesson-overline">
        <span className="pill">第十七节 · Micro Interaction</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Micro Interaction<span className="title-period">.</span>
          </h1>
          <p>小反馈，说清输入与结果。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>17</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 体验真实触发
        </span>
        <span>
          <Icon type="check" size={16} /> 比较插值与回弹
        </span>
        <span>
          <Icon type="check" size={16} /> 交代静态与取消
        </span>
      </div>
      <nav className="stepper" aria-label="第十七节学习步骤">
        {microSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="micro-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            MICRO LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="micro-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <MicroWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {microQuestions.map((q, i) => {
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
              <h3>你的微交互简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成微交互草稿" : "生成微交互指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的微交互指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制微交互指令
                </button>
              </div>
              <label className="sr-only" htmlFor="micro-agent-draft">
                可编辑的 微交互 Agent 指令
              </label>
              <textarea
                id="micro-agent-draft"
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
                placeholder="生成后，补充 触发、属性、强度与验收。"
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
                我已检查 触发、属性、强度、减少动态与验收。
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
                  ? "完成第十七节"
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
          重置第十七节进度
        </button>
      </div>
      <MicroReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="micro-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="micro-reset-title">重新开始第十七节？</h2>
        <p>仅清除第十七节的进度、实验参数和草稿；前十六节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十七节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十七节
          </button>
        </div>
      </dialog>
    </div>
  );
}
