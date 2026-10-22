import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  LAYOUT_MOTION_STORAGE,
  layoutMotionSteps,
  layoutMotionQuestions,
  layoutMotionSources,
  layoutMotionScope,
  layoutMotionInitial,
  readLayoutMotionProgress,
} from "./lesson-twenty-content";
import LayoutWorkbench from "./lesson-twenty-lab";
import "./lesson-twenty.css";
const add = (a, v) => [...new Set([...a, v])];
function LayoutReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课使用React真实DOM排序与展开、手写位置型FLIP和原生Element.animate，未安装Motion。先测当前视觉位置，提交最终布局后在绘制前测量，再只播放translate。宽高即时布局、内容不缩放，是本例明确的范围；不是所有布局动画都必须采用相同内容策略。与18进入退出、19物理spring不同，也不实现21跨视图共享元素。容器变化与减少动态直接最终布局，无持续rAF。官方Motion资料只用于核对位置/尺寸与内容失真概念，未调用其API。
        </p>
        <div className="source-links">
          {layoutMotionSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwenty({ onStorageStatus }) {
  const [data, setData] = useState(readLayoutMotionProgress),
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
      localStorage.setItem(LAYOUT_MOTION_STORAGE, JSON.stringify(data));
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
      [data.reordered, "改变真实DOM排序"],
      [data.inspected, "读取DOM与最终布局"],
      [data.modeCompared, "切换位置过渡，真实布局仍然生效"],
    ],
    [
      [data.expandedSeen, "展开卡片，真实高度改变"],
      [data.collapsedSeen, "收起卡片，邻卡重新布局"],
      [data.noStretchReviewed, "核对位置平移、即时尺寸和不拉伸内容"],
    ],
    [
      [data.multiChanged, "连续改变真实布局，核对最新目标"],
      [data.reducedChecked, "切换减少动态，直接保留最终布局"],
      [data.longSeen, "启用长内容压力，核对自然换行和页面滚动"],
    ],
    layoutMotionQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成布局动效简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查布局目标、内容、打断、焦点与不动画条件",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = layoutMotionSteps[data.step];
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
      setNotice("第二十节已完成。" + nextLessonHint(19));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请在现有项目实现真实布局变化的连续反馈。先提交真实DOM排序与展开状态，DOM/阅读/键盘顺序必须和最终布局一致，不能只把卡片视觉移位而实际顺序不变。本课是同一列表内持久卡片的位置过渡，不扩展跨视图共享元素，不假称安装了未使用的Motion。

动画范围：${layoutMotionScope}

实现与时序：使用稳定卡片ID和位置型FLIP。First读取操作前当前视觉矩形（包含未结束平移）；更新真实React顺序/展开高度，在useLayoutEffect绘制前测量Last；用translate(First-Last)反向抵消位移，再以当前教学时长${data.duration}ms ease-out播放到零。不对宽高做scale，不使用transition: all。动画结束只清理自己，不再修改模型或排序。

内容策略：展开/收起的高度和文字换行即时布局，周围卡片位置可以平滑过渡；本地备注和控件由稳定ID保留，插画固定尺寸与比例，重要文本不裁切。产品若确需宽高平滑过渡，要另设计壳层/内容隔离、尺寸插值或库的尺度修正；不能让文字图片跟着整卡缩放。窄屏操作换行，无横向页面溢出，长内容使用正常页面滚动。

打断与清理：连续排序/展开/长内容变化以最新真实布局为准。先测当前画面，再取消旧动画，再测新目标；每张卡片仅一个活跃位置过渡，旧完成/取消回调按代次与动画身份核验，不能清理新动画或闪回旧布局。恢复初始布局只改布局、不删本地备注；换站/刷新或重置实验会话另行说明。离课/卸载清理动画、observer和监听，不需要持续rAF。

焦点与滚动：保留同一个输入框/按钮及编辑值；若DOM移动使当前卡片持焦控件落到body，仅在无外部新焦点时恢复原节点，不能抢无关控件焦点。只有本卡片持焦控件的最终位置越界或被遮挡时调整滚动，测量需包含该滚动后的Last，焦点卡片在其他卡片重叠时保持可命中，固定操作区位于移动卡片前，不能让动画遮挡操作入口。原生按钮提供拖拽替代，所有完成门槛都能键盘/触屏操作。

何时不动画：系统prefers-reduced-motion实时开启、用户关闭过渡、页面隐藏、视口尺寸或容器宽度改变、能力不可用或动画创建失败时，直接保留新真实布局，取消旧测量和过渡。状态、内容、焦点和操作入口保留；手动立即完成有明确说明，时长设置只影响下一次操作。

验收：真实DOM顺序与offset布局位置先变、过渡视觉再接上；展开真实改变高度且邻卡连续移动；文字字号和插画比例不变，备注/节点身份与焦点保留。快速连击、同目标重复、中途反转从当前画面接续、旧完成/取消回调隔离、自然/手动结束、减少动态中途切换、宽度变化、重置/离开返回/卸载无残留动画。桌面/375px、axe、实际Tab与正常/减少动态零键盘触屏完成重试、编辑复制、刷新和取消/确认重置，保留01–19进度。只做第20课，不提前实现21共享元素。`,
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
      localStorage.removeItem(LAYOUT_MOTION_STORAGE);
    } catch {}
    setData(layoutMotionInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十节的进度、参数与草稿；前十九节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-twenty">
      <div className="lesson-overline">
        <span className="pill">第二十节 · Layout Animation</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Layout Animation<span className="title-period">.</span>
          </h1>
          <p>先确认最终布局，再决定画面怎样接过去。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>20</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 核对真实布局
        </span>
        <span>
          <Icon type="check" size={16} /> 保护文字与图像
        </span>
        <span>
          <Icon type="check" size={16} /> 表达过渡与打断
        </span>
      </div>
      <nav className="stepper" aria-label="第二十节学习步骤">
        {layoutMotionSteps.map((s, i) => (
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
        aria-labelledby="layout-motion-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            LAYOUT LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="layout-motion-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <LayoutWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {layoutMotionQuestions.map((q, i) => {
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
              <h3>你的布局动效简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成布局动效草稿" : "生成布局动效指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的布局动效指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制布局动效指令
                </button>
              </div>
              <label className="sr-only" htmlFor="layout-motion-agent-draft">
                可编辑的 布局动效 Agent 指令
              </label>
              <textarea
                id="layout-motion-agent-draft"
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
                placeholder="生成后，补充 布局目标、内容策略与验收。"
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
                我已检查 布局目标、内容、打断、焦点与不动画条件。
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
                  ? "完成第二十节"
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
          重置第二十节进度
        </button>
      </div>
      <LayoutReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="layout-motion-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="layout-motion-reset-title">重新开始第二十节？</h2>
        <p>仅清除第二十节的进度、实验参数和草稿；前十九节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第二十节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第二十节
          </button>
        </div>
      </dialog>
    </div>
  );
}
