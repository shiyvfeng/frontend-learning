import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  STATE_STORAGE,
  stateSteps,
  stateQuestions,
  stateSources,
  stateInitial,
  readStateProgress,
  phaseInfo,
  topics,
  actionInfo,
  allowedActions,
  sessionInitial,
  applySessionEvent,
} from "./lesson-twelve-content";
import "./lesson-twelve.css";
const add = (a, v) => [...new Set([...a, v])];
function Assistant({ phase, data, session, preview = false }) {
  const info = phaseInfo[phase];
  return (
    <div
      className="state-assistant"
      data-testid="assistant-view"
      data-phase={phase}
    >
      <div className="state-assistant-header">
        <span className="state-agent-icon" aria-hidden="true">
          ✧
        </span>
        <div>
          <strong>路线小助手</strong>
          <span>本地模拟 · 无麦克风 / AI / 网络</span>
        </div>
        <span className="state-label">
          {info.symbol} {info.label}
        </span>
      </div>
      <div className={`state-orbit phase-${phase}`} aria-hidden="true">
        <span>{info.symbol}</span>
      </div>
      <div className="state-content">
        <h3>
          {info.label} <code>{phase}</code>
        </h3>
        <p>{info.text}</p>
        {!preview && session.lastTopic && (
          <p data-testid="submitted-topic">
            已提交主题：{topics[session.lastTopic]}
            {session.active ? ` · 请求 #${session.active.id}` : ""}
          </p>
        )}
        {!preview && session.result && (
          <p className="state-result" data-testid="assistant-result">
            {session.result}
          </p>
        )}
        <div className="state-preferences">
          <span>
            {data.muted ? "✓ 静音偏好已开" : "○ 静音偏好未开"}（本站始终无声）
          </span>
          <span>{data.expanded ? "说明已展开" : "说明已收起"}</span>
        </div>
        {data.expanded && (
          <div
            id="state-assistant-details"
            className="state-details"
            data-testid="assistant-details"
          >
            {preview
              ? "预览器直接选择当前阶段，不代表真实流程可以任意跳转。"
              : "本模拟只在事件发生后更新界面；没有录音、AI 调用或自动定时。"}
            静音与展开可以同时开启，它们不改变 phase。
          </div>
        )}
      </div>
    </div>
  );
}
function PreviewLab({ data, patch }) {
  return (
    <>
      <div className="state-lab">
        <div className="panel-heading">
          <span>同一个助手 · 状态外观预览</span>
          <span className="micro">阶段直接选择，仅用于观察</span>
        </div>
        <div className="state-lab-grid">
          <Assistant phase={data.preview} data={data} preview />
          <div className="state-side">
            <Choices
              label="预览阶段"
              values={Object.entries(phaseInfo).map(([id, v]) => [
                id,
                `${id} · ${v.label}`,
              ])}
              value={data.preview}
              onChange={(v) =>
                patch((o) => ({
                  preview: v,
                  previewSeen: add(o.previewSeen, v),
                }))
              }
            />
            <div className="state-memory">
              <strong>旁边的独立计数：{data.neighbor}</strong>
              <p>
                先选一个非 idle 阶段，再更新计数；主阶段不会因此回到初始值。
              </p>
              <button
                className="state-action"
                disabled={data.preview === "idle" || data.neighbor >= 6}
                onClick={() =>
                  patch((o) => ({
                    neighbor: Math.min(6, o.neighbor + 1),
                    memoryChecked: true,
                  }))
                }
              >
                更新旁边计数（保持状态）
              </button>
              <p className="micro">最多 6 次；重置本课可以重新开始。</p>
            </div>
            <div
              className="state-reading"
              data-testid="preview-memory"
              role="status"
            >
              当前记忆：phase = {data.preview}；独立计数 = {data.neighbor}。
            </div>
          </div>
        </div>
      </div>
      <Note title="State 记住值；存储另有职责">
        事件改变 State，React
        重新绘制当前界面，其他状态值仍可保留。更新一个普通局部变量本身不会触发这样的重新绘制。State
        也不等于自动存盘：本网站另用当前浏览器存储学习进度，模拟会话在刷新或离开本课后回到待机。上方是直接预览；下一站才检查真实事件顺序。
      </Note>
    </>
  );
}
function Preferences({ data, patch }) {
  return (
    <div className="state-switches">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={data.muted}
          onChange={(e) =>
            patch({ muted: e.target.checked, muteChanged: true })
          }
        />
        静音偏好（仅教学，无实际声音）
      </label>
      <button
        className="state-action"
        aria-expanded={data.expanded}
        aria-controls={
          data.expanded
            ? "state-assistant-extra state-assistant-details"
            : "state-assistant-extra"
        }
        onClick={() =>
          patch((o) => ({ expanded: !o.expanded, expandChanged: true }))
        }
      >
        切换详细说明
      </button>
      <div id="state-assistant-extra" hidden={!data.expanded}>
        这是可与静音并存的展开信息；主流程阶段保持不变。
      </div>
    </div>
  );
}
function Controls({ data, patch, session, send, announcement }) {
  return (
    <div className="state-side">
      <Choices
        label="下次提交的主题"
        values={Object.entries(topics)}
        value={data.topic}
        onChange={(v) => patch({ topic: v })}
      />
      <p className="micro">
        提交时记录快照；改变下次主题，不会追改已发出的请求。重试沿用失败主题。
      </p>
      <div className="state-events" role="group" aria-label="模拟流程事件">
        {Object.entries(actionInfo).map(([event, label]) => (
          <button
            key={event}
            className="state-action"
            aria-disabled={!allowedActions[session.phase].includes(event)}
            onClick={() => send(event)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="micro">
        灰色操作仍可聚焦；点按会解释当前为何不可用，不推进流程。
      </p>
      <p className="state-reading" data-testid="allowed-actions">
        当前允许：
        {allowedActions[session.phase].map((e) => actionInfo[e]).join("、")}
      </p>
      <div
        className="state-announcement"
        role="status"
        data-testid="event-announcement"
      >
        {announcement}
      </div>
      <button className="text-button" onClick={() => send("clear")}>
        清空模拟会话
      </button>
    </div>
  );
}
function EventLab({ data, patch, session, send, announcement }) {
  return (
    <>
      <div className="state-lab">
        <div className="panel-heading">
          <span>事件驱动 · 同一个助手</span>
          <span className="micro">全部手动，无计时器</span>
        </div>
        <div className="state-lab-grid">
          <Assistant phase={session.phase} data={data} session={session} />
          <Controls
            data={data}
            patch={patch}
            session={session}
            send={send}
            announcement={announcement}
          />
        </div>
        <div className="state-reading">
          <strong>试一条成功路径</strong>
          <p>
            开始 → 提交 → 模拟成功 → 结束。再走：开始 → 提交 → 模拟失败 → 重试 →
            取消。
          </p>
          <p>
            phase
            决定当前文案与允许操作；相同按钮的重复点击不会开启第二份请求。取消使活动请求失效，旧信封留给下一站检查。
          </p>
        </div>
      </div>
      <Note title="事件、状态、UI 结果连成一条线">
        点击是事件；当前阶段与已提交主题是需要记住的信息；提示、按钮可用性和答复是由这些信息绘制的结果。这里不需要为每种状态复制整页，也不需要状态机库。后续第
        16 课再系统学习状态机；本课先把输入与反馈说清楚。
      </Note>
    </>
  );
}
function CancellationLab({ data, patch, session, send, announcement }) {
  return (
    <>
      <div className="state-lab">
        <div className="panel-heading">
          <span>独立开关与手动信封</span>
          <span className="micro">不发送真实请求</span>
        </div>
        <Preferences data={data} patch={patch} />
        <div className="state-lab-grid">
          <Assistant phase={session.phase} data={data} session={session} />
          <Controls
            data={data}
            patch={patch}
            session={session}
            send={send}
            announcement={announcement}
          />
        </div>
        <div className="state-mailbox">
          <h3>迟到结果实验</h3>
          <ol>
            <li>清空模拟会话。开始并提交 A，然后取消。</li>
            <li>换一个主题，开始并提交 B；保持 thinking。</li>
            <li>投递最旧结果：A 被忽略，B 仍在处理。</li>
            <li>再投递一次：当前 B 才进入展示答复。</li>
          </ol>
          <p data-testid="mailbox-count">
            待投递 {session.mailbox.length} / 4 份；活动请求：
            {session.active ? `#${session.active.id}` : "无"}。
          </p>
          <ul className="state-envelope-list">
            {session.mailbox.map((packet) => (
              <li key={packet.id}>
                #{packet.id} · {topics[packet.topic]} ·{" "}
                {packet.id === session.active?.id ? "当前请求" : "旧请求"}
              </li>
            ))}
          </ul>
          <button
            className="state-action"
            aria-disabled={!session.mailbox.length}
            onClick={() => send("deliver")}
          >
            投递最旧结果
          </button>
          <p className="micro">
            队列最多 4 份，超出移除最旧信封；事件记录最多 6
            条。这里只保留演示快照，不恢复真实任务。
          </p>
          <h3>最近事件</h3>
          <ol className="state-log" aria-label="最近模拟事件">
            {session.log.length ? (
              session.log.map((text, i) => <li key={`${i}-${text}`}>{text}</li>)
            ) : (
              <li>还没有流程事件。</li>
            )}
          </ol>
        </div>
      </div>
      <Note title="互斥阶段与独立信息，分别组织">
        phase 是一个互斥阶段；静音与展开可以同时为
        true，各用布尔值没有问题。取消后仍可能收到旧结果，接受前要核对它属于当前请求。这里用手动信封演示，不调用网络、不设置计时器；刷新、离开本课和重置会清空模拟会话，浏览器进度与偏好另存。反馈只在明确操作时简短更新，不持续播报整个助手。
      </Note>
    </>
  );
}
function StateReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十二节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课按 React
          官方学习文档区分组件记忆、渲染快照和浏览器存储；以互斥阶段避免矛盾，并保留合理的独立布尔值。所有录入、处理与答复都是本地手动模拟，不申请麦克风权限，不调用
          AI、网络或音频
          API。迟到结果由有上限的信封队列演示，只有当前编号可更新当前流程。反馈使用简短
          polite
          状态消息，没有自动动画；真实辅助技术组合仍需人工测试。仅学习状态与事件基础，不代替后续状态机课程。总路线保持
          2026-10-20 核对，不宣称永远最新。
        </p>
        <div className="source-links">
          {stateSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwelve({ onStorageStatus }) {
  const [data, setData] = useState(readStateProgress),
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
      localStorage.setItem(STATE_STORAGE, JSON.stringify(data));
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
  const [session, setSession] = useState(sessionInitial),
    sessionRef = useRef(sessionInitial());
  const [announcement, setAnnouncement] = useState(
    "本地模拟就绪，不访问麦克风、不播放声音、不调用 AI 或网络。",
  );
  const send = (event) => {
    const result = applySessionEvent(sessionRef.current, event, data.topic);
    sessionRef.current = result.session;
    setSession(result.session);
    setAnnouncement(result.message);
    if (
      result.flags.event ||
      result.flags.staleIgnored ||
      result.flags.accepted
    )
      patch((o) => ({
        eventsSeen: result.flags.event
          ? add(o.eventsSeen, result.flags.event)
          : o.eventsSeen,
        staleIgnored: o.staleIgnored || !!result.flags.staleIgnored,
        freshAfterStale:
          o.freshAfterStale || !!(result.flags.accepted && o.staleIgnored),
      }));
  };
  const tasks = [
    [
      [
        Object.keys(phaseInfo).every((v) => data.previewSeen.includes(v)),
        "预览五种互斥阶段",
      ],
      [data.memoryChecked, "在非待机预览中更新旁边计数，检查状态保留"],
    ],
    [
      [
        ["start", "submit", "success", "finish"].every((v) =>
          data.eventsSeen.includes(v),
        ),
        "走通开始、提交、成功与结束",
      ],
      [
        ["fail", "retry"].every((v) => data.eventsSeen.includes(v)),
        "模拟失败并重试",
      ],
      [data.eventsSeen.includes("cancel"), "取消当前流程"],
    ],
    [
      [data.muteChanged && data.expandChanged, "分别操作静音与展开开关"],
      [data.staleIgnored, "投递一份已取消的旧结果并观察忽略"],
      [data.freshAfterStale, "再接收当前请求的结果"],
    ],
    stateQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成可编辑的状态指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查状态、事件、允许操作、反馈与取消",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = stateSteps[data.step];
  const go = (next) => {
    patch({ step: next });
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
      setNotice("第十二节已完成。" + nextLessonHint(11));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const assistant = data.brief === "assistant";
    patch({
      draft: `请在现有项目实现${assistant ? "本地助手教学模拟" : "本地异步任务反馈面板"}。这是本地模拟，不访问麦克风、不播放声音、不实际调用 AI 或联网。采用单个公共界面，根据状态更新文案、图形与操作，不为每种状态复制整页。

状态合同：${assistant ? "phase 只取 idle / listening / thinking / speaking / error；这里 listening 是等待示例输入，speaking 是文字展示模拟答复。" : "phase 只取 idle / running / success / error；等待输入由普通表单承担。"}同一流程的阶段互斥，不能同时听和说或同时成功与失败。静音偏好 ${data.muted ? "开启" : "关闭"}、说明展开 ${data.expanded ? "开启" : "关闭"} 是可并存的独立信息，可各用布尔值；不能机械禁止所有布尔值。State 保留跨重渲染的记忆，浏览器存储是另一个明确实现的功能。

事件与允许操作：${assistant ? "idle 允许开始；listening 允许提交或取消；thinking 允许成功、失败或取消；speaking 允许结束或取消；error 允许重试或取消。" : "idle 允许提交；running 允许成功、失败或取消；success 允许结束；error 允许重试或取消。"}非法或重复事件不能创建第二份请求、重复计数或破坏当前阶段。若保留灰色按钮供教学聚焦，必须正确设置 aria-disabled 并在处理函数拦截、解释原因；不能只改样式。

内容反馈：示例主题“${topics[data.topic]}”，提交时记录其快照；重试使用失败的主题，下次输入不追改旧请求。状态、已提交主题、模拟答复或错误和下一步允许操作都用可读文本说明，不能仅靠颜色、声音或动画。每次明确事件只给一次简短 polite 反馈，不用持续刷新或重复播报整个面板。所有关键操作是可键盘与纯触屏到达的普通控件，焦点保持可见。

异常与取消：每份请求有独立编号，仅当前请求且仍处于处理中时才接受结果。取消使当前请求失效；即使旧成功稍后到达，也不能覆盖新请求、改掉状态或污染结果。重试重新分配编号；完成、失败与离开实验清理活动资源。本地用手动投递信封模拟迟到结果，不需要计时器或真实网络；队列和事件记录有上限。若以后采用定时器、真实请求或音频，提供可清理的取消机制并再次核对结果归属。

验收：
1. 走通正常流程、失败与重试、取消；在桌面和 375px 检查相同界面的真实文案、状态、允许操作与局部裁切。
2. 连续触发同一事件，确认只有有效阶段接受它；改变独立开关与旁边数据，确认不会意外改掉主阶段。
3. 提交 A→取消→提交 B→投递 A：B 仍处理中；再投递 B：仅展示 B 的内容；重复旧结果、离开实验或刷新后不恢复旧活动请求。
4. 纯键盘与零键盘触屏走完反馈、重试、刷新及取消/确认重置，保留其他模块进度；复制失败提供可访问的手动复制途径。
${data.includeEdges ? "5. 基础体验使用静态图形与文字，无声音；未来动效提供暂停、prefers-reduced-motion 与静态替代，live-region 保持克制。浏览器进度只保存学习记录和偏好，刷新模拟会话回到待机，不假装恢复未完成的 AI 请求。" : "5. 保持静态、可读与可操作的基础体验，明确本地模拟及浏览器存储边界。"}

请先列状态、事件、内容反馈、允许操作及异常取消路径，再实现并逐条自测。`,
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
      localStorage.removeItem(STATE_STORAGE);
    } catch {}
    setData(stateInitial());
    const fresh = sessionInitial();
    sessionRef.current = fresh;
    setSession(fresh);
    setAnnouncement("本课模拟已重置为 idle；旧信封已清空。");
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十二节的进度、参数与草稿；前十一节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-twelve">
      <div className="lesson-overline">
        <span className="pill">第十二节 · State</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            State<span className="title-period">.</span>
          </h1>
          <p>从一次点击，看懂事件、记忆与界面变化。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>12</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 看见状态记忆
        </span>
        <span>
          <Icon type="check" size={16} /> 连接事件与结果
        </span>
        <span>
          <Icon type="check" size={16} /> 处理取消与重试
        </span>
      </div>
      <nav className="stepper" aria-label="第十二节学习步骤">
        {stateSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="state-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            STATE LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="state-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <PreviewLab data={data} patch={patch} />}
        {data.step === 1 && (
          <EventLab
            data={data}
            patch={patch}
            session={session}
            send={send}
            announcement={announcement}
          />
        )}
        {data.step === 2 && (
          <CancellationLab
            data={data}
            patch={patch}
            session={session}
            send={send}
            announcement={announcement}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {stateQuestions.map((q, i) => {
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
              <h3>你的状态简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="assistant">本地助手教学模拟</option>
                  <option value="task">本地任务反馈面板</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入兼容与性能边界
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成状态草稿" : "生成状态指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的状态指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制状态指令
                </button>
              </div>
              <label className="sr-only" htmlFor="state-agent-draft">
                可编辑的 状态 Agent 指令
              </label>
              <textarea
                id="state-agent-draft"
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
                placeholder="生成后，补充状态事件前后、文字反馈、允许操作与取消路径。"
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
                我已检查状态、事件、允许操作、反馈与取消。
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
                  ? "完成第十二节"
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
          重置第十二节进度
        </button>
      </div>
      <StateReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="state-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="state-reset-title">重新开始第十二节？</h2>
        <p>仅清除第十二节的进度、实验参数和草稿；前十一节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十二节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十二节
          </button>
        </div>
      </dialog>
    </div>
  );
}
