import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  PRESENCE_STORAGE,
  presenceSteps,
  presenceQuestions,
  presenceSources,
  presenceInitial,
  readPresenceProgress,
} from "./lesson-eighteen-content";
import PresenceWorkbench from "./lesson-eighteen-lab";
import "./lesson-eighteen.css";
const add = (a, v) => [...new Set([...a, v])];
function PresenceReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十八节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课用 React 手写存在管理与原生 Element.animate，没有接入
          Motion。CSS或WAAPI负责动画，presence负责保留和卸载，二者不能互相替代。正常结束与手动完成都校验实例、代次与阶段；取消与卸载清理动画，不使用固定定时器假装完成。进入/离场inert，外部文字表可读；减少动态实时立即完成，无WAAPI或创建失败也有静态降级。暂停只是观察工具，不作为必须等待的学习条件。后续19以后仍为预告。
        </p>
        <div className="source-links">
          {presenceSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonEighteen({ onStorageStatus }) {
  const [data, setData] = useState(readPresenceProgress),
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
      localStorage.setItem(PRESENCE_STORAGE, JSON.stringify(data));
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
      [data.directRemoved, "直接卸载对照节点"],
      [data.added, "添加一个独立通知实例"],
      [data.exitRemoved, "完成离场并真正移除通知"],
    ],
    [
      [data.phaseRead, "读取 DOM 与动画阶段"],
      [data.speedChanged, "切换时长，比较时序"],
      [data.labelEdited, "填入示例或编辑通知内容"],
      [data.compared, "记录 CSS / WAAPI / presence 分工"],
    ],
    [
      [data.restored, "撤回离场或以新实例恢复已移除内容"],
      [
        data.cancelled || data.staticPolicyRead,
        "取消过渡；即时完成模式下核对静态策略",
      ],
      [data.staleIgnored, "投递过期离场完成信号，核对被隔离"],
    ],
    presenceQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成进入退出简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查时序、卸载、打断、焦点与减少动态",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = presenceSteps[data.step];
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
      setNotice("第十八节已完成。" + nextLessonHint(17));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请在现有项目实现进入/退出动效与清楚的存在管理，不只把通知 opacity 设为0后永久隐藏。仅本地演示，不把动画结束当成真实业务成功，不假称使用未安装的 Motion。

触发与属性：添加时先挂载 entering，opacity 0→1、translateY 12px→0；请求移除时先进入 exiting，opacity 1→0、translateY 0→-12px，结束后从数据中删除并真正卸载。当前教学时长 ${data.duration}ms ease-out。可见性、DOM存在、动画阶段、可操作性分别表达；直接条件 false 立即卸载，没有 DOM 可以播放离场。

技术选择：简单 CSS transition/animation 可以描述属性与时序，WAAPI 给 Animation 对象以暂停、完成、取消；React或库的presence机制负责节点保留、身份、打断与删除。按复杂度选择，不因淡出效果就强制引库。本课使用原生 Element.animate 和手写存在管理，能力不可用或创建失败时立即完成并说明降级。

时序与打断：entering → present → exiting → absent。用稳定实例ID和单调过渡代次核对完成信号，不用文本或数组索引当身份。快速添加/删除、重复请求、进入时删除、离场时撤回均有明确政策：撤回保留同一节点和备注，从当前画面重新进入并作废旧动画；取消过渡则立即保留为present。真正移除后重新添加产生新ID。旧完成回调不能删除新代次或新实例，离课/换站/重置/卸载清理动画与监听，不依赖固定延时猜测完成。

焦点与交互：开始移除当前持焦项前，先移到下个present通知的可用入口或添加按钮；焦点在无关外部控件时不抢走。进入/离场内容 inert，离场不可留下Tab目标或可点击的透明控件；用外部文字阶段表提供状态，完成后DOM真正移除。操作入口保持可用，空队列或重复操作给清楚原因，不能让当前按钮disabled后焦点掉到body。

减少动态与观察：首次与运行中实时响应 prefers-reduced-motion，立即结算进入/退出并取消动画，优先于暂停和慢速。保留文字、空态和可见焦点。不让教学门槛依赖等长动画；提供明确的暂停、慢速和立即完成按钮。live-region只播离散状态，不逐帧朗读。

验收：真实DOM与动画对象、自然结束与手动完成、快速反转/重复添加删除、进入中删除、撤回保留备注、取消、过期离场回调与新实例并存、能力失败回退、离场不可Tab/点击、删除当前持焦项即时焦点及外部不抢焦点、中途减少动态、卸载无残留动画。桌面/375px、axe、完整键盘与零键盘触屏完成错题重试、编辑复制及失败回退、刷新与取消/确认重置，保留01–17进度。只实现18，19仍为预告。`,
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
      localStorage.removeItem(PRESENCE_STORAGE);
    } catch {}
    setData(presenceInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十八节的进度、参数与草稿；前十七节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-eighteen">
      <div className="lesson-overline">
        <span className="pill">第十八节 · Enter / Exit Animation</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Enter / Exit Animation<span className="title-period">.</span>
          </h1>
          <p>进入有起点，离场有真正的结束。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>18</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 看懂节点去留
        </span>
        <span>
          <Icon type="check" size={16} /> 区分阶段与可操作
        </span>
        <span>
          <Icon type="check" size={16} /> 表达打断与卸载
        </span>
      </div>
      <nav className="stepper" aria-label="第十八节学习步骤">
        {presenceSteps.map((s, i) => (
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
        aria-labelledby="presence-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            PRESENCE LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="presence-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <PresenceWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {presenceQuestions.map((q, i) => {
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
              <h3>你的进入退出简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成进入退出草稿" : "生成进入退出指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的进入退出指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制进入退出指令
                </button>
              </div>
              <label className="sr-only" htmlFor="presence-agent-draft">
                可编辑的 进入退出 Agent 指令
              </label>
              <textarea
                id="presence-agent-draft"
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
                placeholder="生成后，补充 触发、时序、卸载与验收。"
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
                我已检查 时序、卸载、打断、焦点与减少动态。
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
                  ? "完成第十八节"
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
          重置第十八节进度
        </button>
      </div>
      <PresenceReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="presence-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="presence-reset-title">重新开始第十八节？</h2>
        <p>仅清除第十八节的进度、实验参数和草稿；前十七节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十八节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十八节
          </button>
        </div>
      </dialog>
    </div>
  );
}
