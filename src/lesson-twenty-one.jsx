import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  SHARED_STORAGE,
  sharedSteps,
  sharedQuestions,
  sharedSources,
  sharedScope,
  sharedInitial,
  readSharedProgress,
} from "./lesson-twenty-one-content";
import SharedWorkbench from "./lesson-twenty-one-lab";
import "./lesson-twenty-one.css";
const add = (a, v) => [...new Set([...a, v])];
function SharedReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十一节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课使用React与原生document.startViewTransition，未安装Motion。浏览器运行时快照按唯一对象名配对，缩略图和详情可以是不同DOM节点。只读插画参与过渡，实时文字和按钮不克隆；详情在页内，非模态。跨对象换图可合理淡化；共享过渡不要求全屏。与18进入退出、19物理spring、20同列表布局变化区分，22以后按目录逐章开放。2026-10-22核对原生生命周期、跳过仍更新及Motion候选说明。
        </p>
        <div className="source-links">
          {sharedSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwentyOne({ onStorageStatus }) {
  const [data, setData] = useState(readSharedProgress),
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
      localStorage.setItem(SHARED_STORAGE, JSON.stringify(data));
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
      [data.opened, "打开同一对象详情"],
      [data.returned, "返回正确来源卡片"],
      [data.inspected, "读取配对与真实DOM"],
    ],
    [
      [data.noteSeen, "填入或编辑本地备注"],
      [data.switched, "切换不同对象的身份"],
      [data.compared, "比较Motion与原生候选"],
    ],
    [
      [data.multiChanged, "多次改变视图意图"],
      [data.fallbackSeen, "来源缺失时返回可见入口"],
      [data.reducedChecked, "切换减少动态，保留最新视图"],
    ],
    sharedQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成共享元素简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查配对、生命周期、打断、焦点与回退条件",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = sharedSteps[data.step];
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
      setNotice("第二十一节已完成。" + nextLessonHint(20));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请为缩略图打开页内详情再返回实现Shared Element Transition，让同一对象的位置与尺寸有清晰连续对应，不要求全屏转场。目标是认出同一对象、准确返回；不是让所有页面都做夸张变形。

实现范围：${sharedScope}

配对标识：按稳定对象ID分配唯一名称，例如lesson21-a。旧缩略图与新详情可用不同DOM节点；每次捕获同一个名称只能有一个元素。跨对象A→B使用不同标识，不要把不同身份强行配对；crossfade可辅助对应几何过渡，不能一概判错。只读插画参与，重要文本、输入和按钮独立布局；保持图像比例，不缩放文字。不要创建可操作的快照副本或重复id；若业务另用装饰克隆须aria-hidden、inert且无可操作内容。

技术候选：本例实际使用原生document.startViewTransition与view-transition-name，React在更新回调中flushSync提交DOM；浏览器生成运行时画面而非预制截图。Motion shared layout可用layoutId和组件生命周期配合，适合已有Motion的React项目，能选择布局/spring并处理同时存在时的crossfade，但本例未安装或调用Motion。按兼容性、打断手感与依赖成本选型，不把第20课同列表FLIP或第18课进入退出当作已实现跨视图配对。

生命周期：捕获旧视图→提交最新真实DOM→捕获新视图→位置/尺寸配对与可选淡化→清理。使用${data.duration}ms作为教学观察时长，生产按目标手感设置。配对丢失时可直接更新或合理淡化，不假称仍存在几何配对。原生根快照不参与，本例只是局部主体过渡。

打断与回退：快速打开、返回、换对象只接受最新请求代次。skipTransition只跳动画仍可能执行更新回调，旧更新/ready/finished必须核验代次与实例；不能改回旧对象、清理新实例或写入卸载组件。原生快照层不拦截实时按钮。原生打断可跳到最新视图，不承诺保留旧快照速度。API不支持、创建失败、页面隐藏、系统prefers-reduced-motion实时开启或用户关闭动画，直接提交最新状态，所有学习操作仍可完成，无持续rAF。离开/重置/卸载清理当前动画和监听。

返回与焦点：详情是页内非模态区域，不困住Tab；打开后聚焦可见详情标题，返回按对象ID找到新挂载的来源按钮。来源不存在时聚焦可见列表标题并提供恢复入口。只在本次操作仍拥有焦点、期间没有外部新焦点时恢复，不强抢已移走的焦点；必要时滚动确保入口可见。详情内部Escape和触屏返回按钮等价，外部Escape不劫持。备注按对象ID保留本次会话，换站/刷新/离课清空，学习进度另存。

验收：桌面与375px检查真实配对位置/尺寸、正确返回、不同DOM身份、无隐藏Tab目标/可操作副本；快速开关/换对象/回退、来源缺失、滚动、能力不支持、异常和迟到回调、减少动态中途切换、卸载清理。实际Tab与零键盘触屏均可完成错题重试、示例及真实编辑、复制回退、刷新、取消/确认重置，保留01–20进度。只实现21，不提前实现22。`,
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
      localStorage.removeItem(SHARED_STORAGE);
    } catch {}
    setData(sharedInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十一节的进度、参数与草稿；前二十节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-twenty-one">
      <div className="lesson-overline">
        <span className="pill">第二十一节 · Shared Element Transition</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Shared Element Transition<span className="title-period">.</span>
          </h1>
          <p>让用户认出跨视图的同一个对象。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>21</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 识别对象配对
        </span>
        <span>
          <Icon type="check" size={16} /> 区分节点与身份
        </span>
        <span>
          <Icon type="check" size={16} /> 表达生命周期与返回
        </span>
      </div>
      <nav className="stepper" aria-label="第二十一节学习步骤">
        {sharedSteps.map((s, i) => (
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
        aria-labelledby="shared-element-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            SHARED LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="shared-element-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <SharedWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {sharedQuestions.map((q, i) => {
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
              <h3>你的共享元素简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成共享元素草稿" : "生成共享元素指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的共享元素指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制共享元素指令
                </button>
              </div>
              <label className="sr-only" htmlFor="shared-element-agent-draft">
                可编辑的 共享元素 Agent 指令
              </label>
              <textarea
                id="shared-element-agent-draft"
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
                placeholder="生成后，补充 配对关系、生命周期与验收。"
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
                我已检查 配对、生命周期、打断、焦点与回退条件。
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
                  ? "完成第二十一节"
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
          重置第二十一节进度
        </button>
      </div>
      <SharedReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="shared-element-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="shared-element-reset-title">重新开始第二十一节？</h2>
        <p>仅清除第二十一节的进度、实验参数和草稿；前二十节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留第二十一节进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置第二十一节
          </button>
        </div>
      </dialog>
    </div>
  );
}
