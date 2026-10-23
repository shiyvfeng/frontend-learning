import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";

import {
  TOOL06_STORAGE,
  tool06Scope,
  tool06Steps,
  tool06Questions,
  tool06Sources,
  tool06Brief,
  tool06Initial,
  readTool06Progress,
} from "./tool-six-content";
import Tool06Workbench from "./tool-six-lab";
import "./tool-six.css";
const add = (a, v) => [...new Set([...a, v])];
function Tool06References() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>T06工具专题核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本章按GSAP官方Timeline、ScrollTrigger和context文档及已安装3.15.0源码/类型核对。教学图示与业务界面为本站原创，重置使用原生dialog。包标注Standard
          No
          Charge，不是MIT；官方公告包括免费商业使用，但许可正文当前跳离线页，本次不声称已核验全文，实际产品仍需核对生效条款。
          {tool06Scope}
        </p>
        <div className="source-links">
          {tool06Sources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function ToolSix({ onStorageStatus, onNavigate }) {
  const [data, setData] = useState(readTool06Progress),
    [notice, setNotice] = useState(""),
    [copyMessage, setCopyMessage] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const headingRef = useRef(null),
    draftRef = useRef(null),
    dialogRef = useRef(null),
    resetRef = useRef(null),
    generation = useRef(0),
    copyBusy = useRef(null),
    navigationFrame = useRef(0),
    focusRevision = useRef(0),
    latestData = useRef(data);
  latestData.current = data;
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(TOOL06_STORAGE, JSON.stringify(data));
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
      !headingRef.current?.closest(".tool-six")?.contains(active) ||
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
      [data.needsSeen.length >= 2, "比较两种需求的工具条件"],
      [
        data.playedSeen && data.pausedSeen && data.reversedSeen,
        "操作播放、暂停和反向（静态可用阶段示意）",
      ],
    ],
    [
      [data.forwardSeen, "向后推进滚动/静态阶段"],
      [data.backSeen, "向前返回滚动/静态阶段"],
      [data.measuredSeen, "读取当前真实实例或明确静态快照"],
    ],
    [
      [data.pinSeen, "切换pin并理解占位/短视口边界"],
      [data.scrubSeen, "改变scrub并区分距离/追随"],
      [data.resetSeen, "恢复场景起点"],
    ],
    tool06Questions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题${i + 1}的理由`,
    ]),
    [
      [data.context.trim().length > 0, "填写现有动效和页面约束"],
      [data.generated, "生成时间与滚动合同"],
      [
        data.reviewed && !data.draftStale && data.draft.trim().length >= 80,
        "人工核对阶段、区间、清理和回退",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = tool06Steps[data.step];
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
      setNotice(
        "T06工具专题已完成；不代表安装库就完成生产验收。可以继续T07「Rive / Lottie」，T12仍为1个预告。",
      );
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: tool06Brief(data),
      generated: true,
      reviewed: false,
      draftStale: false,
    });
    setCopyMessage("");
  };
  const copy = async () => {
    if (copyBusy.current === generation.current) {
      setCopyMessage(
        "上一次自动复制尚未结束；可选中当前草稿手动复制，不会自动发送。",
      );
      return;
    }
    copyBusy.current = generation.current;
    const id = generation.current,
      revision = focusRevision.current,
      origin = document.activeElement,
      copiedText = data.draft;
    try {
      if (!navigator.clipboard?.writeText) throw Error("unavailable");
      await navigator.clipboard.writeText(copiedText);
      if (id === generation.current)
        setCopyMessage(
          latestData.current.draft === copiedText
            ? "已复制点击时的草稿；尚未发送或执行。"
            : "已复制点击时的版本；之后的编辑仍保留，当前草稿未重新复制。",
        );
    } catch {
      if (id === generation.current) {
        if (latestData.current.draft !== copiedText) {
          setCopyMessage(
            "自动复制失败，草稿已修改；请核对当前文字后手动复制，当前焦点保持不变。",
          );
        } else if (
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
      if (copyBusy.current === id) copyBusy.current = null;
    }
  };
  const reset = () => {
    dialogRef.current?.close();
    resetRef.current?.focus();
    const before = document.activeElement,
      revision = focusRevision.current,
      focusId = ++generation.current;
    try {
      localStorage.removeItem(TOOL06_STORAGE);
    } catch {}
    setData(tool06Initial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice(
      "已重置T06工具专题的进度、参数与草稿；01–32、综合A/B及T01/T02/T03/T04/T05进度已保留。",
    );
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
    <div className="lesson-two tool-six">
      <div className="lesson-overline">
        <span className="pill">工具专题T06 · GSAP / ScrollTrigger</span>
        <span>约 20 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            GSAP<span className="title-period">.</span>
          </h1>
          <p>用时间编排多个阶段，或把阶段绑定到明确的滚动区间。</p>
          <p className="tool06-hero-boundary">
            <strong>真实GSAP3.15.0 · 独立时间线和ScrollTrigger</strong> ·
            播放、暂停、反向、scrub与pin；静态不冒称运行
          </p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            TOOL
            <br />
            <b>T06</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 比较CSS、Motion与GSAP
        </span>
        <span>
          <Icon type="check" size={16} /> 理解时间与滚动区间
        </span>
        <span>
          <Icon type="check" size={16} /> 清理固定占位与监听
        </span>
      </div>
      <nav className="stepper" aria-label="T06工具专题学习步骤">
        {tool06Steps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="tool06-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            TOOL LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="tool06-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <Tool06Workbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {tool06Questions.map((q, i) => {
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
              <h3>你的工具选型简报</h3>
              <div className="tool06-context-editor">
                <label htmlFor="tool06-context">现有动效、组件与约束</label>
                <textarea
                  id="tool06-context"
                  className="tool06-context"
                  value={data.context}
                  maxLength={700}
                  onFocus={(e) =>
                    e.currentTarget.scrollIntoView({
                      block: "center",
                      behavior: "auto",
                    })
                  }
                  onChange={(e) =>
                    patch({
                      context: e.target.value,
                      reviewed: false,
                      draftStale: data.generated || data.draftStale,
                    })
                  }
                />
                <button
                  onClick={() =>
                    patch({
                      context:
                        "现有React + Vite页面保留CSS反馈和既有组件。只有多段编排/滚动绑定确有需要才引入GSAP；明确阶段重叠、播放控制、局部区间、pin/scrub目的、短视口不固定、减少动态静态替代、重建和卸载清理及实际验收。",
                      reviewed: false,
                      draftStale: data.generated || data.draftStale,
                    })
                  }
                >
                  填入项目现状示例（替换本栏）
                </button>
              </div>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成工具选型草稿" : "生成工具选型说明"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的工具选型说明</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制工具选型说明
                </button>
              </div>
              <label className="sr-only" htmlFor="tool06-agent-draft">
                可编辑的工具选型说明
              </label>
              <textarea
                id="tool06-agent-draft"
                onFocus={(event) =>
                  event.currentTarget.scrollIntoView({
                    block: "center",
                    behavior: "auto",
                  })
                }
                ref={draftRef}
                value={data.draft}
                maxLength={10000}
                onChange={(e) => {
                  patch({ draft: e.target.value, reviewed: false });
                  setCopyMessage("");
                }}
                placeholder="生成后补充现有约定、时间阶段、滚动区间、pin/scrub目的、窄屏、清理与减少动态。"
              />
              <div className="copy-feedback" role="status">
                {copyMessage || "你可以修改全文。复制后，由你决定在哪里使用。"}
              </div>
              <p className="tool06-boundary" role="status">
                {data.draftStale
                  ? "实验参数或现状已变，编辑草稿未自动覆盖。请重新生成，或人工核对后保留。"
                  : "这是本地草稿，不会自动发送、安装工具或迁移项目。"}
              </p>
              <button
                onClick={() => {
                  if (!data.generated) {
                    setNotice("请先生成草稿。");
                    return;
                  }
                  patch({ draftStale: false, reviewed: false });
                  setNotice(
                    "已按你的确认保留编辑，正文未改；这不是自动语义检查。",
                  );
                }}
              >
                保留编辑并确认当前实验参数
              </button>
              <label className="checkbox-label review">
                <input
                  type="checkbox"
                  disabled={
                    !data.generated ||
                    data.draftStale ||
                    data.draft.trim().length < 80
                  }
                  checked={data.reviewed}
                  onChange={(e) => patch({ reviewed: e.target.checked })}
                />
                我已核对时间阶段、滚动区间、pin/scrub目的和回退验收。
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
                  ? "完成T06工具专题"
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
          重置T06工具专题进度
        </button>
      </div>
      <p className="tool06-boundary">
        下一专题 T07 · Rive / Lottie 已开放；T12共1工具模块仍为预告，课程尚未全部结束。
      </p>
      {onNavigate && (
        <button onClick={() => onNavigate("T05")}>返回T05复习</button>
      )}
      {onNavigate && <button onClick={()=>onNavigate("T07")}>继续T07 · Rive / Lottie</button>}
      <Tool06References />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="tool06-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="tool06-reset-title">重新开始T06工具专题？</h2>
        <p>
          仅清除T06工具专题的独立进度、实验选择和草稿；01–32、综合A/B及T01/T02/T03/T04/T05进度保留。
        </p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留T06工具专题进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置T06工具专题
          </button>
        </div>
      </dialog>
    </div>
  );
}
