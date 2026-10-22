import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";

import {
  B_STORAGE,
  bSteps,
  bFields,
  auditB,
  filledB,
  bScope,
  bSources,
  bBrief,
  bInitial,
  readBProgress,
} from "./stage-b-content";
import {
  ComparisonLab,
  EffectLab,
  TechnologyLab,
  QualityLab,
} from "./stage-b-lab";
import "./stage-b.css";
const add = (a, v) => [...new Set([...a, v])];
function BReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>综合阶段B核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          官方资料于2026-10-22核对，参考目标、上下文、约束、完成条件与示例的写法；不绑定某模型、API或推荐库。本地页面没有AI调用、语义评分、外部发送、代码执行或自动部署。
          {bScope}
        </p>
        <div className="source-links">
          {bSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function StageB({ onStorageStatus, onNavigate }) {
  const [data, setData] = useState(readBProgress),
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
      localStorage.setItem(B_STORAGE, JSON.stringify(data));
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
      !headingRef.current?.closest(".stage-b")?.contains(active) ||
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
  const coverage = auditB(data);
  const sourceComplete = coverage.every((row) => row.filled);
  const draftCurrent = data.draftVersion === data.revision;
  const tasks = [
    [
      [filledB(data.original), "保留或编辑原始需求"],
      [data.vagueSeen && data.goodSeen, "比较同一效果的两份人工示例"],
      [data.comparisonReviewed, "核对原文与拟议方案的边界"],
    ],
    [
      ...bFields
        .filter((f) => f.group === 1)
        .map((f) => [filledB(data.fields[f.id]), `填写${f.label}`]),
      [data.effectReviewed, "人工核对状态与恢复是否矛盾"],
    ],
    [
      [
        coverage.find((r) => r.id === "technology").filled,
        "选择技术倾向（允许暂不限定）",
      ],
      [filledB(data.techReason), "写明适用条件与取舍"],
      [data.technologyReviewed, "人工核对候选条件"],
    ],
    [
      ...bFields
        .filter((f) => f.group === 3)
        .map((f) => [filledB(data.fields[f.id]), `填写${f.label}`]),
      [data.qualityReviewed, "人工核对可观察的验收步骤"],
    ],
    [
      [data.generated, "生成本地Agent草稿"],
      [sourceComplete, "当前所有栏目有内容（不代表语义正确）"],
      [
        data.reviewed && data.draft.trim().length >= 80 && draftCurrent,
        "核对原文、当前输入与编辑草稿",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = bSteps[data.step];
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
        "综合阶段B练习已完成；这不代表需求正确或实现通过。可以继续T01 React / Next.js；T01已开放，T02–T12仍为预告，课程没有全部结束。",
      );
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: bBrief(data),
      generated: true,
      reviewed: false,
      draftVersion: data.revision,
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
      localStorage.removeItem(B_STORAGE);
    } catch {}
    setData(bInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置综合阶段B的进度、参数与草稿；01–32与综合A进度已保留。");
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
    <div className="lesson-two stage-b">
      <div className="lesson-overline">
        <span className="pill">综合阶段B · Agent指令能力</span>
        <span>约 19 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Agent 指令能力<span className="title-period">.</span>
          </h1>
          <p>把模糊诉求补成可讨论、可实现、可验证的说明；先分清草稿与承诺。</p>
          <p className="writeb-hero-boundary">
            <strong>本地写作练习 · 非 AI 评分器</strong> · 人工参考 /
            栏目检查；无外部发送或执行
          </p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            STAGE
            <br />
            <b>B</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 保留原始诉求
        </span>
        <span>
          <Icon type="check" size={16} /> 补全行为约束
        </span>
        <span>
          <Icon type="check" size={16} /> 说明待执行验收
        </span>
      </div>
      <nav className="stepper" aria-label="综合阶段B学习步骤">
        {bSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="writeb-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            BRIEF LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="writeb-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && (
          <ComparisonLab key={instanceEpoch} data={data} patch={patch} />
        )}
        {data.step === 1 && <EffectLab data={data} patch={patch} />}
        {data.step === 2 && <TechnologyLab data={data} patch={patch} />}
        {data.step === 3 && <QualityLab data={data} patch={patch} />}
        {data.step === 4 && (
          <>
            <div className="agent-grid">
              <div className="agent-options">
                <span className="agent-icon">
                  <Icon type="spark" size={26} />
                </span>
                <h3>你的Agent指令草稿</h3>
                <p>
                  仅将栏目整合成文字；不理解语义、不发送外部Agent，也不会执行或部署。
                </p>
                <button className="primary" onClick={generate}>
                  {data.generated
                    ? "重新生成（覆盖编辑草稿）"
                    : "生成Agent指令草稿"}
                  <Icon type="arrow" size={17} />
                </button>
                <p className="micro">
                  缺项明确保留“待确认”，不会从示例偷偷补全。草稿与原文只存在当前浏览器，不跨设备同步。
                </p>
                <h3>用户原文 · 原样保留</h3>
                <div
                  className="writeb-original-mirror"
                  tabIndex={0}
                  role="region"
                  aria-label="保留的用户原文"
                >
                  {data.original || "原文尚空，生成时仍保留待确认边界。"}
                </div>
              </div>
              <div className="agent-editor">
                <div className="panel-heading">
                  <span>给Coding Agent的拟议说明</span>
                  <button
                    className="text-button"
                    disabled={!data.draft.trim()}
                    onClick={copy}
                  >
                    <Icon type="copy" size={16} />
                    复制Agent草稿
                  </button>
                </div>
                <label className="sr-only" htmlFor="writeb-agent-draft">
                  可编辑的Agent指令草稿
                </label>
                <textarea
                  id="writeb-agent-draft"
                  ref={draftRef}
                  value={data.draft}
                  maxLength={12000}
                  onFocus={(e) =>
                    e.currentTarget.scrollIntoView({
                      block: "center",
                      behavior: "auto",
                    })
                  }
                  onChange={(e) => {
                    patch({ draft: e.target.value, reviewed: false });
                    setCopyMessage("");
                  }}
                  placeholder="生成后，核对原文与假设，再编辑当前草稿。"
                />
                <div className="copy-feedback" role="status">
                  {copyMessage ||
                    "复制需要你主动操作；复制不代表发送、执行或验收通过。"}
                </div>
                <div className="writeb-draft-state" role="status">
                  {!data.generated
                    ? "尚未生成草稿。"
                    : !draftCurrent
                      ? "栏目或原文已变化，编辑草稿未自动覆盖。请重新生成，或人工核对后保留编辑。"
                      : "草稿已按生成或人工确认标记为当前栏目版本；这不是语义正确性判定。"}
                </div>
                <button
                  onClick={() => {
                    if (!data.generated) {
                      setNotice("请先生成草稿；此按钮只更新你的人工核对标记。");
                      return;
                    }
                    patch({ draftVersion: data.revision, reviewed: false });
                    setNotice(
                      "已按你的确认更新来源标记，编辑草稿正文未改；请再检查原文、假设和验收。",
                    );
                  }}
                >
                  保留编辑，确认已核对当前输入
                </button>
                <label className="checkbox-label review">
                  <input
                    type="checkbox"
                    disabled={
                      !data.generated ||
                      data.draft.trim().length < 80 ||
                      !draftCurrent ||
                      !sourceComplete
                    }
                    checked={data.reviewed}
                    onChange={(e) => patch({ reviewed: e.target.checked })}
                  />
                  我已人工核对原文、假设、当前草稿和待执行验收
                </label>
              </div>
            </div>
            <p className="writeb-boundary">
              {bScope} 草稿至少80字符仅为避免空白提交，不代表内容合格。
            </p>
          </>
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
          <div className="stage-bctions">
            {data.step > 0 && (
              <button className="text-button" onClick={() => go(data.step - 1)}>
                ← 上一步
              </button>
            )}
            <button className="primary next-button" onClick={finish}>
              {data.step < 4
                ? "完成并继续"
                : [0, 1, 2, 3].every((n) => data.done.includes(n))
                  ? "完成综合阶段B"
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
          重置综合阶段B进度
        </button>
      </div>
      {onNavigate && (
        <button className="primary" onClick={() => onNavigate("T01")}>
          继续T01 · React / Next.js
        </button>
      )}
      <p className="writeb-boundary">
        T01已开放；T02–T12工具模块仍为预告，不是全课程结束。
      </p>
      {onNavigate && (
        <button onClick={() => onNavigate("A")}>返回综合A复习</button>
      )}
      <BReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="writeb-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="writeb-reset-title">重新开始综合阶段B？</h2>
        <p>
          仅清除综合阶段B的原文、栏目、草稿与学习记录；01–32与综合A进度保留。
        </p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留综合阶段B进度</button>
          <button className="primary" onClick={reset}>
            确认重置综合阶段B
          </button>
        </div>
      </dialog>
    </div>
  );
}
