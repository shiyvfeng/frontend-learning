import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";

import {
  TOOL12_STORAGE,
  tool12Scope,
  tool12Steps,
  tool12Questions,
  tool12Sources,
  tool12Brief,
  tool12Initial,
  readTool12Progress,
} from "./tool-twelve-content";
import Tool12Workbench from "./tool-twelve-lab";
import "./tool-twelve.css";
const add = (a, v) => [...new Set([...a, v])];
function Tool12References() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>T12工具专题核对说明与官方来源</span>
        <span className="micro">2026-10-23 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本章核对TanStack Virtual
          v3官方API和已安装React适配包3.14.22；真实固定行窗口。排序用原创Pointer
          Events事务。dnd-kit仅对照当前@dnd-kit/react0.5.1与旧@dnd-kit/core6.3.1的路线，不混用API，未安装运行dnd-kit。
          {tool12Scope}
        </p>
        <div className="source-links">
          {tool12Sources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function ToolTwelve({ onStorageStatus, onNavigate }) {
  const [data, setData] = useState(readTool12Progress),
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
      localStorage.setItem(TOOL12_STORAGE, JSON.stringify(data));
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
      !headingRef.current?.closest(".tool-twelve")?.contains(active) ||
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
      [data.needsSeen.length >= 3, "比较排序、浏览和远端加载三种需求"],
      [data.scopeSeen, "核对实际机制与三种职责"],
    ],
    [
      [data.movedSeen && data.alternativeSeen, "用同模型的替代操作真实改顺序"],
      [data.canceledSeen, "取消一次预览，确认顺序不变"],
      [data.sortInspected, "读取模型与真实DOM顺序"],
    ],
    [
      [data.windowSeen, "核对真实库窗口与逻辑总数"],
      [data.offscreenSeen && data.preservedSeen, "标记/备注的项目卸载后找回"],
      [data.filterSeen && data.emptySeen, "奇数筛选身份与空结果"],
    ],
    tool12Questions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题${i + 1}的理由`,
    ]),
    [
      [data.context.trim().length > 0, "填写规模、交互和现有维护约束"],
      [data.generated, "生成三种职责的交接草稿"],
      [
        data.reviewed && !data.draftStale && data.draft.trim().length >= 80,
        "人工核对ID、取消、窗口与加载验收",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = tool12Steps[data.step];
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
        "T12工具专题已完成。原32课、A/B与T01–T12共46项入口均已制作；其他章节仍按各自学习进度记录，没有自动全部通关。可以从目录回顾。",
      );
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: tool12Brief(data),
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
      localStorage.removeItem(TOOL12_STORAGE);
    } catch {}
    setData(tool12Initial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice(
      "已重置T12工具专题的进度、参数与草稿；01–32、综合A/B及T01/T02/T03/T04/T05/T06/T07/T08/T09/T10/T11进度已保留。",
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
    <div className="lesson-two tool-twelve">
      <div className="lesson-overline">
        <span className="pill">工具专题T12 · dnd-kit / Virtualization</span>
        <span>约 23 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            dnd-kit / Virtualization<span className="title-period">.</span>
          </h1>
          <p>把拖拽、虚拟窗口与数据加载的责任拆开，再决定工具与维护合同。</p>
          <p className="tool12-hero-boundary">
            <strong>真实TanStack React Virtual 3.14.22</strong> · 独立原生排序 ·
            dnd-kit为候选说明 · 全部数据为本地样例
          </p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            TOOL
            <br />
            <b>T12</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 拆分输入、窗口与数据
        </span>
        <span>
          <Icon type="check" size={16} /> 检查稳定ID与真实DOM
        </span>
        <span>
          <Icon type="check" size={16} /> 取消、离屏与生命周期
        </span>
      </div>
      <nav className="stepper" aria-label="T12工具专题学习步骤">
        {tool12Steps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="tool12-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            TOOL LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="tool12-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <Tool12Workbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {tool12Questions.map((q, i) => {
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
              <div className="tool12-context-editor">
                <label htmlFor="tool12-context">
                  对象规模、交互、加载与维护约束
                </label>
                <textarea
                  id="tool12-context"
                  className="tool12-context"
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
                        "现有React排程页有6张提案卡排序与2000条已加载对象浏览，两者独立；先复用已有组件。明确稳定业务ID、预览/提交/取消、触屏滚动及键盘替代；固定72px行、缓冲、离屏状态和稳定编辑区。动态测量与远端分页另补合同，不能把窗口化当成少加载数据；列窄屏、焦点、重置与清理验收。",
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
              <label className="sr-only" htmlFor="tool12-agent-draft">
                可编辑的工具选型说明
              </label>
              <textarea
                id="tool12-agent-draft"
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
                placeholder="生成后补充稳定ID、允许目标、预览/提交/取消、行高/缓冲、焦点、数据加载及清理验收。"
              />
              <div className="copy-feedback" role="status">
                {copyMessage || "你可以修改全文。复制后，由你决定在哪里使用。"}
              </div>
              <p className="tool12-boundary" role="status">
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
                我已核对稳定ID、拖拽取消、虚拟窗口与数据加载验收。
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
                  ? "完成T12工具专题"
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
          重置T12工具专题进度
        </button>
      </div>
      <p className="tool12-boundary">
        原32课、A/B和T01–T12共46项入口均已制作。可从侧栏目录回顾；各章进度独立，没有虚构下一章。
      </p>
      {onNavigate && (
        <button onClick={() => onNavigate("T11")}>返回T11复习</button>
      )}
      {onNavigate && (
        <div className="tool12-buttons">
          <button onClick={() => onNavigate("A")}>
            回顾综合A · 设计工具映射
          </button>
          <button onClick={() => onNavigate("B")}>
            回顾综合B · Agent指令能力
          </button>
        </div>
      )}
      <Tool12References />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="tool12-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="tool12-reset-title">重新开始T12工具专题？</h2>
        <p>
          仅清除T12工具专题的独立进度、实验选择和草稿；01–32、综合A/B及T01/T02/T03/T04/T05/T06/T07/T08/T09/T10/T11进度保留。
        </p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留T12工具专题进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置T12工具专题
          </button>
        </div>
      </dialog>
    </div>
  );
}
