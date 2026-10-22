import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  LIST_STORAGE,
  listSteps,
  listQuestions,
  listSources,
  listScope,
  listBrief,
  listInitial,
  readListProgress,
} from "./lesson-thirty-content";
import ListWorkbench from "./lesson-thirty-lab";
import "./lesson-thirty.css";
const add = (a, v) => [...new Set([...a, v])];
function ListReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第三十节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          {listScope}{" "}
          官方资料于2026-10-22核对。窗口/缓冲、测量与锚定见来源；本例只实现固定行高，不套用文档中的库API。
        </p>
        <div className="source-links">
          {listSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonThirty({ onStorageStatus }) {
  const [data, setData] = useState(readListProgress),
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
      localStorage.setItem(LIST_STORAGE, JSON.stringify(data));
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
      !headingRef.current?.closest(".lesson-thirty")?.contains(active) ||
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
      [data.virtualSeen, "观察真实虚拟窗口"],
      [data.normalSeen, "同一200条普通列表对照"],
      [data.bufferSeen, "在虚拟模式改变缓冲行数"],
      [data.scrolledSeen, "改变真实滚动位置"],
    ],
    [
      [data.locatedSeen, "查找或跳转记录"],
      [data.endSeen, "验证大量集合的末尾"],
      [data.filteredSeen, "筛选并核对锚点/索引"],
      [data.emptySeen && data.restoredSeen, "体验空结果并恢复"],
    ],
    [
      [data.pagedSeen, "使用非虚拟分页替代"],
      [data.readSeen, "通过稳定入口或分页读取记录"],
      [data.modelSeen, "展开并测量动态高度示意"],
    ],
    listQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成列表集成简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查规模、行高、缓冲与键盘",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = listSteps[data.step];
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
      setNotice("第三十节已完成。" + nextLessonHint(29));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: listBrief(data),
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
      localStorage.removeItem(LIST_STORAGE);
    } catch {}
    setData(listInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第三十节的进度、参数与草稿；前二十九节进度已保留。");
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
    <div className="lesson-two lesson-thirty">
      <div className="lesson-overline">
        <span className="pill">第三十节 · 长列表与虚拟化</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            长列表与虚拟化<span className="title-period">.</span>
          </h1>
          <p>数据都在，节点只留一窗；滚动、定位和焦点要一起设计。</p>
          <p className="list30-hero-boundary">
            <strong>固定行高真实窗口化 · 本地样例</strong> ·
            3000条模型；普通对照限200条，分页另作语义访问替代
          </p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>30</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 区分数据与DOM
        </span>
        <span>
          <Icon type="check" size={16} /> 核对窗口与缓冲
        </span>
        <span>
          <Icon type="check" size={16} /> 稳定焦点与替代
        </span>
      </div>
      <nav className="stepper" aria-label="第三十节学习步骤">
        {listSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="list30-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            WINDOW LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="list30-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <ListWorkbench key={instanceEpoch} data={data} patch={patch} />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {listQuestions.map((q, i) => {
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
              <h3>你的列表集成简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成列表集成草稿" : "生成列表集成指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的列表集成指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制列表集成指令
                </button>
              </div>
              <label className="sr-only" htmlFor="list30-agent-draft">
                可编辑的 列表集成 Agent 指令
              </label>
              <textarea
                id="list30-agent-draft"
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
                placeholder="生成后，补充 数据规模、行高、滚动保持与可访问路径。"
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
                我已检查 规模、行高、缓冲与键盘。
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
                  ? "完成第三十节"
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
          重置第三十节进度
        </button>
      </div>
      <ListReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="list30-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="list30-reset-title">重新开始第三十节？</h2>
        <p>仅清除第三十节的进度、实验参数和草稿；前二十九节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第三十节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第三十节
          </button>
        </div>
      </dialog>
    </div>
  );
}
