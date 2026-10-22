import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  SCROLL_STORAGE,
  scrollSteps,
  scrollQuestions,
  scrollSources,
  scrollScope,
  scrollInitial,
  readScrollProgress,
} from "./lesson-twenty-two-content";
import ScrollWorkbench from "./lesson-twenty-two-lab";
import "./lesson-twenty-two.css";
const add = (a, v) => [...new Set([...a, v])];
function ScrollReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十二节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课主实验使用原生scroll事件测量局部滚动区间，合并单次rAF读取；原生CSS
          scroll
          timeline作全程细线对照，IntersectionObserver观察入场后触发一次600ms只读反馈。未安装GSAP，不劫持滚动。CSS
          sticky只在明确的框内，短视口/有效宽度窄时解除。原生CSS与GSAP均是按需候选，不把工具名当作效果。官方资料于2026-10-22核对。
        </p>
        <div className="source-links">
          {scrollSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwentyTwo({ onStorageStatus }) {
  const [data, setData] = useState(readScrollProgress),
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
      localStorage.setItem(SCROLL_STORAGE, JSON.stringify(data));
      onStorageStatus("进度仅保存在当前浏览器");
    } catch {
      onStorageStatus("浏览器存储不可用；本次进度仅在页面内保留");
    }
  }, [data, onStorageStatus]);
  useEffect(() => {
    const trackFocus = () => focusRevision.current++;
    document.addEventListener("focusin", trackFocus);
    const active = document.activeElement;
    if (!headingRef.current?.closest(".lesson-twenty-two")?.contains(active))
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
      [data.forwardSeen, "真实向前滚动"],
      [data.backSeen, "真实向后滚动，进度回退"],
      [data.inspected, "读取真实区间与分母"],
    ],
    [
      [data.entrySeen, "体验入场触发或静态回退说明"],
      [data.rangeCompared, "切换全程与中段区间"],
      [data.compared, "比较触发、绑定与技术候选"],
    ],
    [
      [data.heightChanged, "改变内容高度，读取重算的滚动距离"],
      [data.reducedChecked, "切换减少动态，正文完整"],
      [data.fallbackReviewed, "体验能力不足的静态阅读"],
    ],
    scrollQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成滚动动画简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查区间、固定范围、阶段、窄屏与减少动态",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = scrollSteps[data.step];
  const focusHeading = () => {
    const before = document.activeElement,
      revision = focusRevision.current,
      id = generation.current;
    if (navigationFrame.current) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      if (generation.current !== id) return;
      navigationFrame.current = 0;
      // A later focus choice wins, even if the user moves away and back.
      if (focusRevision.current !== revision) return;
      const active = document.activeElement;
      if (active === before || active === document.body)
        headingRef.current?.focus();
    });
  };
  const go = (next) => {
    patch({ step: next });
    generation.current++;
    setNotice("");
    setCopyMessage("");
    focusHeading();
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
      setNotice("第二十二节已完成。" + nextLessonHint(21));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请实现可读、可逆、可回退的Scroll Animation。目标是用阅读进度帮助理解，不替用户决定滚动节奏。实验标题：${data.caption}。

真实机制：${scrollScope}

滚动区间：指定有边框的局部overflow:auto滚动框，页面外层正常滚动，不添加另一个嵌套实验滚动源。读取max=max(0,scrollHeight-clientHeight)，夹住scrollTop的越界值。${data.range === "middle" ? "教学区间为max的20%到80%" : "教学区间为0到max"}；按(当前位置-start)/(end-start)映射并夹在0–1，区间为空时为0不除以0。原生CSS细线始终绑定整个滚动距离，区间不同的两线不作同范围精度比较。resize、容器/内容高度和标题变化后重算，不能永久冻结初始分母；内容变长后同一像素位置的百分比可以改变。

阶段与绑定：0–1/3为认识，1/3–2/3为比较，2/3–1为验收。timeline是进度轴，scrub把动画进度跟滚动区间关联；本例直接映射，不带时间追随。向后滚动必须能回退进度与阶段，辅助按钮只能真正移动同一个滚动框，不可按钮切状态冒充滚动。仅移动/缩放只读装饰，正文和重要信息始终完整呈现，不逐帧live播报。

入场触发：IntersectionObserver的root是同一框，箭头标记至少一半进入时触发一次600ms箭头反馈，不等于逐像素scrub，也不是已读证明。离开或反滚不倒放这段时间动画。重新观察若目标已在框内可立即触发，需重新入场时先滚回起点。能力不支持保留静态说明，不把观察或动画播放作为必需门槛。

固定区域：小读数带使用CSS sticky，仅在滚动框内停留，控件全部放在框外。pin是固定一段区间的行为，并不必然指GSAP；本例不是调用ScrollTrigger pin。短视口不高于600 CSS px或有效宽度不大于360 CSS px时解除sticky；正常375px保留小读数带并留足阅读空间。缩放、长内容和短屏使用正常滚动，Tab可离开实验区，不锁住焦点或键盘，不拦截滚轮/触摸，不强制吸附或平滑滚动。

技术候选：简单进度条可优先评估原生CSS animation-timeline:scroll()/view()及animation-range；注意animation简写会重置timeline，后声明绑定。本例CSS对照实际用scroll(nearest block)，未把1s时间动画伪装成滚动。复杂编排、pin、scrub追随再比较GSAP ScrollTrigger的start/end、refresh与清理，未安装GSAP就不得声称使用其API。

回退与生命周期：系统prefers-reduced-motion实时开启、用户减少动态或模拟能力不足时，停止非必要位移与CSS装饰动画，保留完整正文、进度文字、阶段和原生滚动。IntersectionObserver/ResizeObserver不可用有明确静态/手动重测入口。被动scroll监听，每次输入最多一个待处理rAF，空闲不持续循环；隐藏取消待处理rAF和时间动画，恢复时重测不自动重播。重置、换站、离课、卸载取消动画/rAF并断开observer和监听，旧回调核验实例/代次，不能修改新会话。

验收：真实滚轮/键盘/触屏前后滚动、0/中段/末尾边界、0分母、快速输入、内容高度/resize/缩放、短屏和375px阅读空间；对比入场一次与可逆绑定。系统reduce中途切换、能力不足、隐藏恢复、卸载无残留，正文可读、控件不被sticky盖住。五站、错题重试、示例及真实编辑、复制回退、刷新和取消/确认重置可完成，保留01–21进度。只实现22，不开始23。`,
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
    // Close the modal before capturing focus ownership for the reset heading.
    dialogRef.current?.close();
    resetRef.current?.focus();
    try {
      localStorage.removeItem(SCROLL_STORAGE);
    } catch {}
    setData(scrollInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十二节的进度、参数与草稿；前二十一节进度已保留。");
    focusHeading();
  };
  return (
    <div className="lesson-two lesson-twenty-two">
      <div className="lesson-overline">
        <span className="pill">第二十二节 · Scroll Animation</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Scroll Animation<span className="title-period">.</span>
          </h1>
          <p>让进度跟随真实滚动，保留用户的阅读节奏。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>22</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 区分触发与绑定
        </span>
        <span>
          <Icon type="check" size={16} /> 核对区间与固定
        </span>
        <span>
          <Icon type="check" size={16} /> 保留静态阅读
        </span>
      </div>
      <nav className="stepper" aria-label="第二十二节学习步骤">
        {scrollSteps.map((s, i) => (
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
        aria-labelledby="scroll-animation-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            SCROLL LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2
            id="scroll-animation-stage-heading"
            tabIndex={-1}
            ref={headingRef}
          >
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <ScrollWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {scrollQuestions.map((q, i) => {
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
              <h3>你的滚动动画简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成滚动动画草稿" : "生成滚动动画指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的滚动动画指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制滚动动画指令
                </button>
              </div>
              <label className="sr-only" htmlFor="scroll-animation-agent-draft">
                可编辑的 滚动动画 Agent 指令
              </label>
              <textarea
                id="scroll-animation-agent-draft"
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
                placeholder="生成后，补充 滚动区间、固定范围与验收。"
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
                我已检查 区间、固定范围、阶段、窄屏与减少动态。
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
                  ? "完成第二十二节"
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
          重置第二十二节进度
        </button>
      </div>
      <ScrollReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="scroll-animation-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="scroll-animation-reset-title">重新开始第二十二节？</h2>
        <p>仅清除第二十二节的进度、实验参数和草稿；前二十一节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留第二十二节进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置第二十二节
          </button>
        </div>
      </dialog>
    </div>
  );
}
