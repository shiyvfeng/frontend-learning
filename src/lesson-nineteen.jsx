import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  SPRING_STORAGE,
  springSteps,
  springQuestions,
  springSources,
  springInitial,
  readSpringProgress,
} from "./lesson-nineteen-content";
import SpringWorkbench from "./lesson-nineteen-lab";
import "./lesson-nineteen.css";
const add = (a, v) => [...new Set([...a, v])];
function SpringReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十九节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课时间插值和spring都在本地requestAnimationFrame运行，spring为手写物理数值积分，没有接入Motion或Android库。时间曲线是预设linear/cubic-out，spring则逐步计算位置和速度，可响应运行中目标变化。固定子步与时间戳保护避免依赖刷新率；质量固定，参数使用本课单位。没有循环演示或联网，减少动态直接呈现静态目标，后台/离课会清理。官方Android来源仅核对弹簧概念，不声称使用其API。Layout
          Animation留到20，开放状态以目录为准。
        </p>
        <div className="source-links">
          {springSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonNineteen({ onStorageStatus }) {
  const [data, setData] = useState(readSpringProgress),
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
      localStorage.setItem(SPRING_STORAGE, JSON.stringify(data));
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
      [data.moved, "发送不同目标，体验运动或静态结果"],
      [data.inspected, "读取两种机制的真实位置与速度"],
    ],
    [
      [data.kChanged, "调整刚度"],
      [data.cChanged, "调整阻尼"],
      [data.durationChanged, "调整时间动画时长"],
      [data.stableTested, "发送目标体验迅速稳定配方"],
      [data.bounceTested, "发送目标体验轻微回弹配方"],
      [data.labelEdited, "填入示例或编辑对象文案"],
    ],
    [
      [
        data.retargeted || data.staticTargetsChanged,
        "运行中改变目标；减少动态下核对即时目标变化",
      ],
      [data.reducedChecked, "切换手动减少动态，保留最新目标"],
      [data.backgroundChecked, "体验明确标注的后台恢复保护模拟"],
    ],
    springQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成弹簧效果简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查效果目标、打断、减少动态与清理",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = springSteps[data.step];
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
      setNotice("第十九节已完成。" + nextLessonHint(18));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请在现有项目实现合适的交互运动，不要求用户记公式，也不要给所有场景强制弹跳。效果目标：${data.intent === "stable" ? "迅速稳定，尽量无过冲，清楚抵达目标" : "轻微回弹，幅度克制，较快停止，不影响任务"}。简单固定变化先考虑 CSS duration/easing；确有可打断、速度连续或回弹需求再用 spring，不假称使用未安装的 Motion。

对比条件：首次从共同位置25、速度0出发，同一目标同时发给两种机制。时间插值按 duration/easing；当前教学设置 ${data.duration}ms、${data.easing}。物理 spring 使用当前位置、速度、目标、刚度与阻尼计算；当前教学 k=${data.stiffness}、c=${data.damping}、质量固定1，参数只作复现实验，不与任意库的默认值机械换算。设置应用于下一次目标，运动中改设置不暗中重置当前比较。不同起点/速度/位移不能直接当成参数差异，公平复试先归位。

打断与目标变化：运动中换目标保持各自当前位置，spring继续携带当前速度；时间插值从当前坐标重新计时，速度可能改变。连续多次目标以最新目标为准，只有一个运行器，不叠加帧循环；spring不必明显过冲，高阻尼也可平稳到达，过大阻尼可能拖沓，是否自然取决于任务。区分位置连续与速度连续，不用预制 easing 曲线冒充可响应速度的物理spring。

实现约束：本课是普通 JavaScript 的半隐式欧拉积分，用稳定1/240秒子步，单帧最多补算50ms；位置误差小于0.02且速度小于0.05自然停止，另设8秒安全终止，安全停止和手动结束要分别说明，不冒称自然收敛。duration是时间动画约束，spring稳定时间由参数及当前运动共同决定，不承诺固定毫秒数。目标用本地教学坐标表示，画布只裁切装饰，不影响数字读取、原生按钮和焦点。不调用真实网络或机器人。

减少动态与后台：实时响应 prefers-reduced-motion；停止非必要位移并直接呈现最新目标，保留状态文字、可见焦点及操作入口，不假称静态模式保留了动画速度。页面隐藏立即到位并取消rAF，返回等待新指令，不自动补算；帧间隔超过200ms直接到位保护。重置、换站、离课和卸载均取消帧、监听与旧回调，代次及帧ID核验使失效回调无法污染新运动。后台模拟按钮必须标记为本地教学模拟，不声称真的切换了系统后台。

验收：固定时长与物理spring真对比；调刚度/阻尼、迅速稳定与轻微回弹；运行中改目标验证位置及spring速度不瞬跳，重复点击不重复运行器，真实自然停止、长帧与安全终止、后台/返回、重置与离开返回后无持续循环或失效回调。正常和减少动态均可用原生按钮完成，不依赖拖拽；桌面/375px、axe、完整真实Tab和零键盘触屏完成错题重试、文案/简报编辑复制、刷新与取消/确认重置，保留01–18进度。只做第19课，后续课程开放状态以目录为准。`,
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
      localStorage.removeItem(SPRING_STORAGE);
    } catch {}
    setData(springInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十九节的进度、参数与草稿；前十八节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-nineteen">
      <div className="lesson-overline">
        <span className="pill">第十九节 · Spring</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Spring<span className="title-period">.</span>
          </h1>
          <p>效果目标决定选型，不是回弹越多越好。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>19</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 比较时间与物理
        </span>
        <span>
          <Icon type="check" size={16} /> 体验稳定与回弹
        </span>
        <span>
          <Icon type="check" size={16} /> 表达目标与打断
        </span>
      </div>
      <nav className="stepper" aria-label="第十九节学习步骤">
        {springSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="spring-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            SPRING LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="spring-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <SpringWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {springQuestions.map((q, i) => {
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
              <h3>你的弹簧简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成弹簧草稿" : "生成弹簧指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的弹簧指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制弹簧指令
                </button>
              </div>
              <label className="sr-only" htmlFor="spring-agent-draft">
                可编辑的 弹簧 Agent 指令
              </label>
              <textarea
                id="spring-agent-draft"
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
                placeholder="生成后，补充 效果目标、参数约束与验收。"
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
                我已检查 效果目标、打断、减少动态与清理。
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
                  ? "完成第十九节"
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
          重置第十九节进度
        </button>
      </div>
      <SpringReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="spring-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="spring-reset-title">重新开始第十九节？</h2>
        <p>仅清除第十九节的进度、实验参数和草稿；前十八节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十九节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十九节
          </button>
        </div>
      </dialog>
    </div>
  );
}
