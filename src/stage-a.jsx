import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";

import {
  A_STORAGE,
  aSteps,
  aQuestions,
  aSources,
  aBrief,
  aInitial,
  readAProgress,
} from "./stage-a-content";
import DesignWorkbench, { MappingLab } from "./stage-a-lab";
import "./stage-a.css";
const add = (a, v) => [...new Set([...a, v])];
function AReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>综合阶段A核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          官方资料于2026-10-22核对。设计概念以Figma文档为参考；本例是本地学习演练，没有操作真实Figma、创建文件、上传或导出代码。变量/mode可表达Token上下文，仍需约定命名与平台转换；原型帮助探索交互，不替代生产行为合同。
        </p>
        <div className="source-links">
          {aSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function StageA({ onStorageStatus, onNavigate }) {
  const [data, setData] = useState(readAProgress),
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
    focusRevision = useRef(0);
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(A_STORAGE, JSON.stringify(data));
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
      !headingRef.current?.closest(".stage-a")?.contains(active) ||
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
    [[data.mappingChecked, "检查六组合理映射并阅读条件"]],
    [
      [data.narrowSeen && data.wideSeen, "切换窄/宽预览，比较真实可用宽度"],
      [data.tokenSeen && data.themeSeen, "调整间距Token与主题mode"],
      [data.layoutSeen, "比较合理的布局方案"],
    ],
    [
      [data.variantSeen && data.motionSeen, "选择外观变体与动效合同"],
      [
        data.failureSeen && data.retrySeen && data.successSeen,
        "体验失败、重试和成功反馈",
      ],
      [data.cancelSeen && data.staleSeen, "取消后投递旧结果，验证隔离"],
      [data.secondSeen, "操作B实例收藏，核对独立性"],
    ],
    aQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成设计交接说明"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查Token、组件、状态与响应式验收",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = aSteps[data.step];
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
        "综合阶段A已完成。可以继续综合阶段B「Agent指令能力」。T01–T12已开放，原46项入口已制作，各章学习进度独立。",
      );
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: aBrief(data),
      generated: true,
      reviewed: false,
    });
    setCopyMessage("");
  };
  const copy = async () => {
    if (copyBusy.current === generation.current) return;
    copyBusy.current = generation.current;
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
      localStorage.removeItem(A_STORAGE);
    } catch {}
    setData(aInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置综合阶段A的进度、参数与草稿；01–32编号课进度已保留。");
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
    <div className="lesson-two stage-a">
      <div className="lesson-overline">
        <span className="pill">综合阶段A · 设计工具映射</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            设计到实现<span className="title-period">.</span>
          </h1>
          <p>把设计意图转为结构、布局、状态与动效的交接合同。</p>
          <p className="mapa-hero-boundary">
            <strong>本地设计交接演练 · 非 Figma 编辑器</strong> · 真实CSS /
            React预览；无文件、上传或外部服务
          </p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            STAGE
            <br />
            <b>A</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 识别条件映射
        </span>
        <span>
          <Icon type="check" size={16} /> 整合布局与状态
        </span>
        <span>
          <Icon type="check" size={16} /> 写出可验证交接
        </span>
      </div>
      <nav className="stepper" aria-label="综合阶段A学习步骤">
        {aSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="mapa-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            HANDOFF 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="mapa-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <MappingLab data={data} patch={patch} />}
        {(data.step === 1 || data.step === 2) && (
          <DesignWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {aQuestions.map((q, i) => {
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
              <h3>你的设计交接简报</h3>
              <div className="mapa-handoff">
                <label htmlFor="mapa-caption">交接项目名称</label>
                <input
                  id="mapa-caption"
                  type="text"
                  value={data.caption}
                  maxLength={80}
                  onChange={(e) =>
                    patch({ caption: e.target.value, reviewed: false })
                  }
                />
                <button
                  onClick={() =>
                    patch({
                      caption: "回声工作坊 · 让想法落地",
                      reviewed: false,
                    })
                  }
                >
                  填入项目示例
                </button>
              </div>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成设计交接草稿" : "生成设计交接说明"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的设计交接说明</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制设计交接说明
                </button>
              </div>
              <label className="sr-only" htmlFor="mapa-agent-draft">
                可编辑的设计交接说明
              </label>
              <textarea
                id="mapa-agent-draft"
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
                placeholder="生成后，补充 Token、组件、变体、响应式与验收。"
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
                我已检查 Token、组件变体、响应式和验收。
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
                  ? "完成综合阶段A"
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
          重置综合阶段A进度
        </button>
      </div>
      {onNavigate && (
        <button className="primary" onClick={() => onNavigate("B")}>
          继续综合阶段B · Agent指令能力
        </button>
      )}
      <AReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="mapa-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="mapa-reset-title">重新开始综合阶段A？</h2>
        <p>仅清除综合阶段A的独立进度、设计选择和草稿；01–32编号课进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留综合阶段A进度</button>
          <button className="primary" onClick={reset}>
            确认重置综合阶段A
          </button>
        </div>
      </dialog>
    </div>
  );
}
