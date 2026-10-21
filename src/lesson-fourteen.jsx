import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  CONDITIONAL_STORAGE,
  conditionalSteps,
  conditionalQuestions,
  conditionalSources,
  conditionalInitial,
  readConditionalProgress,
} from "./lesson-fourteen-content";
import "./lesson-fourteen.css";
const add = (a, v) => [...new Set([...a, v])];
function MemoryField({ kind, onHide, onValue }) {
  const [value, setValue] = useState("");
  return (
    <div data-testid={`${kind}-memory`} className="conditional-memory">
      <label>
        {kind === "unmount" ? "卸载分支内部说明" : "保留分支内部说明"}
        <input
          value={value}
          maxLength={120}
          onChange={(e) => {
            setValue(e.target.value);
            onValue(e.target.value);
          }}
        />
      </label>
      <button
        onClick={() => {
          setValue("周五产品演示");
          onValue("周五产品演示");
        }}
      >
        填入{kind === "unmount" ? "卸载" : "保留"}示例
      </button>
      <button onClick={onHide}>
        从内部隐藏{kind === "unmount" ? "卸载" : "保留"}分支
      </button>
    </div>
  );
}
function MemoryComparison({ patch }) {
  const [shown, setShown] = useState({ unmount: true, hidden: true }),
    [report, setReport] = useState("尚未比较。");
  const root = useRef(null),
    restore = useRef({}),
    values = useRef({ unmount: "", hidden: "" }),
    before = useRef({});
  const hide = (kind) => {
    const node = root.current.querySelector(`[data-testid="${kind}-memory"]`);
    before.current[kind] = { node, value: values.current[kind] };
    // Focus the visible recovery control before its sibling is removed/hidden.
    restore.current[kind].focus();
    setShown((o) => ({ ...o, [kind]: false }));
    setReport(
      `${kind === "unmount" ? "卸载" : "保留"}分支已隐藏；焦点先返回可见的恢复入口，隐藏内容不参与 Tab。`,
    );
  };
  const show = (kind) => {
    setShown((o) => ({ ...o, [kind]: true }));
    requestAnimationFrame(() => {
      const node = root.current?.querySelector(
        `[data-testid="${kind}-memory"]`,
      );
      if (!node) return;
      const value = node.querySelector("input").value,
        same = node === before.current[kind]?.node;
      setReport(
        `${kind === "unmount" ? "卸载" : "保留"}：${same ? "同一节点" : "新节点"}；恢复前「${before.current[kind]?.value || "空"}」→ 恢复后「${value || "空"}」。焦点仍在可见恢复入口。`,
      );
      if (
        before.current[kind]?.value.trim() &&
        ((kind === "hidden" && same && value === before.current[kind].value) ||
          (kind === "unmount" && !same && value === ""))
      )
        patch({
          [kind === "hidden" ? "hiddenVerified" : "unmountVerified"]: true,
        });
      values.current[kind] = value;
    });
  };
  return (
    <div ref={root} className="conditional-lab" data-testid="memory-comparison">
      <div className="conditional-columns">
        {["unmount", "hidden"].map((kind) => (
          <article key={kind} className="conditional-panel">
            <h3>
              {kind === "unmount"
                ? "条件不渲染 · 卸载"
                : "保留实例 · hidden 隐藏"}
            </h3>
            <code>
              {kind === "unmount"
                ? "show && <Editor />"
                : "<div hidden={!show}><Editor /></div>"}
            </code>
            <button
              ref={(e) => (restore.current[kind] = e)}
              onClick={() => (shown[kind] ? hide(kind) : show(kind))}
            >
              {shown[kind] ? "隐藏" : "恢复"}
              {kind === "unmount" ? "卸载" : "保留"}分支
            </button>
            {kind === "unmount" ? (
              shown[kind] && (
                <MemoryField
                  kind={kind}
                  onHide={() => hide(kind)}
                  onValue={(v) => (values.current[kind] = v)}
                />
              )
            ) : (
              <div hidden={!shown[kind]}>
                <MemoryField
                  kind={kind}
                  onHide={() => hide(kind)}
                  onValue={(v) => (values.current[kind] = v)}
                />
              </div>
            )}
          </article>
        ))}
      </div>
      <p role="status" data-testid="memory-report">
        {report}
      </p>
      <Note>
        先填示例，也可自己编辑。这里的输入由子组件内部 State
        持有。卸载销毁实例及其内部值；hidden 保留实例、内部值与
        DOM，但会退出显示与键盘顺序。hidden 是 HTML 属性，通常通过 display: none
        隐藏，内容同时退出可访问性树。opacity: 0
        只变透明，不能单独保证安全隐藏。聚焦节点被卸载后，原焦点目标不再存在；若不主动接回，焦点可能退到页面主体。两种方式都需要处理焦点，恢复显示也不会自动恢复之前的焦点。若产品需要保留草稿，应把值提升到稳定父级或明确保存。
      </Note>
    </div>
  );
}
function UploadBranches({ data, patch }) {
  const [phase, setPhase] = useState("empty"),
    [note, setNote] = useState(""),
    [outcome, setOutcome] = useState("success"),
    [queue, setQueue] = useState([]),
    [message, setMessage] = useState("本地手动模拟，没有任何文件或网络访问。");
  const active = useRef(0),
    phaseRef = useRef("empty"),
    nextId = useRef(0),
    entry = useRef(null),
    parentFilled = useRef(false),
    cancelledId = useRef(null),
    alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
      active.current++;
    },
    [],
  );
  // Changing stations cancels unfinished work and clears all pending callbacks.
  useEffect(() => {
    active.current = ++nextId.current;
    phaseRef.current = "empty";
    setPhase("empty");
    setQueue([]);
  }, [data.step]);
  const transition = (next) => {
    phaseRef.current = next;
    setPhase(next);
    patch((o) => ({ seen: add(o.seen, next) }));
  };
  const focusEntry = () => entry.current?.focus();
  const begin = () => {
    if (["uploading", "processing"].includes(phaseRef.current)) return;
    const id = ++nextId.current;
    active.current = id;
    transition("uploading");
    const result = outcome;
    const callback = () => {
      if (!alive.current) return;
      if (active.current !== id || phaseRef.current !== "processing") {
        setMessage(
          `已忽略失效任务 #${id} 的迟到${result === "success" ? "成功" : "失败"}结果；当前分支未改变。`,
        );
        if (cancelledId.current === id) patch({ staleVerified: true });
        return;
      }
      transition(result === "success" ? "success" : "failure");
      if (result === "success" && cancelledId.current !== null)
        patch({ recovered: true });
      setMessage(
        `接受当前任务 #${id} 的${result === "success" ? "成功" : "失败"}结果。`,
      );
    };
    setQueue((q) => [...q, { id, callback }]);
    setMessage(
      `开始本地任务 #${id}，目标结果：${result === "success" ? "成功" : "失败"}。`,
    );
  };
  const cancel = () => {
    focusEntry();
    cancelledId.current = active.current;
    active.current = ++nextId.current;
    transition("empty");
    patch({ cancelled: true });
    setMessage(
      "已取消；旧回调保留在教学投递队列，任务编号已经失效。说明由父级保存。",
    );
  };
  const restart = () => {
    focusEntry();
    active.current = ++nextId.current;
    transition("empty");
    if (parentFilled.current && note.trim()) patch({ parentVerified: true });
    setMessage("已回到空状态，父级说明保留，可编辑后重新开始。");
  };
  const deliver = () => {
    const item = queue[0];
    if (!item) return;
    setQueue((q) => q.slice(1));
    item.callback();
  };
  return (
    <div className="conditional-lab">
      <div className="panel-heading">
        <span>本地模拟上传 · 无文件、无网络</span>
        <span className="micro">手动投递回调</span>
      </div>
      <div className="conditional-controls">
        <label>
          父级保存的说明
          <input
            aria-label="父级保存的说明"
            value={note}
            maxLength={120}
            onChange={(e) => {
              setNote(e.target.value);
              parentFilled.current = true;
            }}
          />
        </label>
        <button
          onClick={() => {
            setNote("周五产品演示");
            parentFilled.current = true;
          }}
        >
          填入上传示例说明
        </button>
        <Choices
          label="下一次模拟结果"
          values={[
            ["success", "成功"],
            ["failure", "失败"],
          ]}
          value={outcome}
          onChange={setOutcome}
        />
        <button
          ref={entry}
          onClick={begin}
          aria-disabled={["uploading", "processing"].includes(phase)}
        >
          开始模拟上传
        </button>
        <button
          onClick={deliver}
          disabled={!queue.length || phase === "uploading"}
        >
          投递最早结果（{queue.length}）
        </button>
      </div>
      <div
        data-testid="upload-branch"
        data-phase={phase}
        className="conditional-panel"
        aria-label="当前条件内容"
      >
        {phase === "empty" && (
          <section key="empty" data-testid="branch-empty">
            <h3>○ 空状态</h3>
            <p>
              尚无模拟结果。使用上方入口开始，示例名固定为「产品演示.txt」。
            </p>
          </section>
        )}
        {phase === "uploading" && (
          <section key="uploading" data-testid="branch-uploading">
            <h3>↑ 上传中 · 本地模拟</h3>
            <p>产品演示.txt · 不读取真实文件。此时成功结果尚不存在。</p>
            <button
              onClick={() => {
                focusEntry();
                transition("processing");
              }}
            >
              模拟上传完成
            </button>
            <button onClick={cancel}>取消模拟任务</button>
          </section>
        )}
        {phase === "processing" && (
          <section key="processing" data-testid="branch-processing">
            <h3>◌ 处理中 · 本地模拟</h3>
            <p>上传分支已经卸载。手动投递结果或取消。</p>
            <button onClick={cancel}>取消模拟任务</button>
          </section>
        )}
        {phase === "success" && (
          <section key="success" data-testid="branch-success">
            <h3>✓ 处理成功 · 本地模拟</h3>
            <p>产品演示.txt 已完成演示。没有真实服务器记录。</p>
            <button onClick={restart}>重新开始并保留说明</button>
          </section>
        )}
        {phase === "failure" && (
          <section key="failure" data-testid="branch-failure">
            <h3>! 处理失败 · 本地模拟</h3>
            <p>演示失败：示例格式无法处理。改选成功后可重试，或返回空状态。</p>
            <button
              onClick={() => {
                focusEntry();
                patch({ retried: true });
                begin();
              }}
            >
              重试模拟任务
            </button>
            <button onClick={restart}>返回空状态并保留说明</button>
          </section>
        )}
      </div>
      <p role="status" data-testid="upload-report">
        {message}
      </p>
      <Note>
        {data.step === 0
          ? "条件分支由 React 决定：空状态、上传、处理、成功、失败分别是真实节点。通过重试、重新开始和取消观察全部路径。手动推进不是上传耗时或网络速度。"
          : "先填父级说明，开始并推进至处理，取消，再投递旧结果；然后开始新任务并成功，选择重新开始检查说明保留。可取消多次，队列按创建顺序投递；旧任务成功或失败都不能覆盖新任务。"}
        <br />
        上传、处理与子组件输入仅在当前实验会话保留；换站、离课、刷新或确认重置会终止任务。学习进度另存本课独立键。课程不实现第十五课的
        Skeleton 或乐观更新。
      </Note>
    </div>
  );
}
function ConditionalWorkbench({ data, patch }) {
  return (
    <>
      {(data.step === 0 || data.step === 2) && (
        <UploadBranches key={data.step} data={data} patch={patch} />
      )}{" "}
      {data.step === 1 && <MemoryComparison patch={patch} />}
    </>
  );
}

function ConditionalReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十四节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课演示 React 条件分支、组件卸载与本地 State 生命周期。HTML hidden
          仅移除显示并保留实例，卸载则销毁实例内部记忆；若状态提升到父级，卸载后可从父级恢复。焦点必须在隐藏或卸载前移至可见入口。全部上传是本地手动模拟，不选择或读取私人文件、不发送请求。迟到结果用真实回调和请求编号守卫隔离，非服务器能力或网络测速。第十五课仍为预告。
        </p>
        <div className="source-links">
          {conditionalSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonFourteen({ onStorageStatus }) {
  const [data, setData] = useState(readConditionalProgress),
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
      localStorage.setItem(CONDITIONAL_STORAGE, JSON.stringify(data));
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
      [
        ["empty", "uploading", "processing", "success", "failure"].every((v) =>
          data.seen.includes(v),
        ),
        "观察空、上传、处理、成功、失败的真实分支",
      ],
      [data.retried, "失败后重试"],
      [data.cancelled, "取消并返回空状态"],
    ],
    [
      [data.unmountVerified, "隐藏并恢复卸载分支，核对内部值清空"],
      [data.hiddenVerified, "隐藏并恢复保留分支，核对内部值保留"],
    ],
    [
      [data.staleVerified, "取消后投递迟到结果，确认被忽略"],
      [data.recovered, "开始新任务并成功恢复"],
      [data.parentVerified, "恢复父级保存的可编辑说明"],
    ],
    conditionalQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成条件渲染简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查全部分支、恢复、重试和取消路径",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = conditionalSteps[data.step];
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
      setNotice("第十四节已完成。" + nextLessonHint(13));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请在现有项目实现本地模拟上传面板，用 React 条件渲染驱动真实 UI，不用截图替换，不读取私人文件、不发网络请求。

条件内容：empty 显示示例入口；uploading 显示文件名、上传说明和取消；processing 替换上传内容为处理说明和取消；success 显示结果和重新开始；failure 显示具体失败、重试与返回空状态。一次只挂载当前分支。状态文字与操作不能只靠颜色。

恢复合同：表单说明由父级保存，返回空状态与失败重试保留；仅组件内部的临时输入在条件卸载后清空。HTML hidden 保留实例与内部值，但不保留隐藏中的焦点；恢复可见后由用户选择继续输入。不要把 opacity:0 当作安全隐藏，隐藏分支不可留下不可见的 Tab 目标。明确刷新时临时状态清空、学习进度与简报独立保存。

重试与取消：失败可重试并分配新任务编号；上传与处理均可取消，先使任务失效再恢复空状态。异步回调更新前核对任务编号与阶段，取消、重置、离开或新任务后，旧成功/失败不得覆盖当前结果。清理可清理的资源，取消不等于服务器撤销。

焦点：切换分支前检查当前焦点归属，隐藏或卸载后移到可见的恢复/开始入口，不让焦点落到 body 或不可见字段。取消和重试入口始终支持触屏与键盘。所有输入可真实编辑，并提供填入示例按钮。

验收：桌面和375px逐态观察真实 DOM，成功、失败、空、取消与重试全部走通；比较条件卸载与 hidden 的内部值与节点身份，核对可见焦点和 Tab 顺序；取消后手动投递旧结果，再开始新任务，旧结果无权污染。纯键盘和零键盘触屏完成错题重试、编辑简报、复制失败回退、刷新、取消/确认重置，保留01–13课进度。

本课不实现 Skeleton、乐观更新或状态机库；这些后续专题仍是预告。请先确认分支内容、数据归属、恢复与取消合同，再实现并逐条验证。`,
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
      localStorage.removeItem(CONDITIONAL_STORAGE);
    } catch {}
    setData(conditionalInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十四节的进度、参数与草稿；前十三节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-fourteen">
      <div className="lesson-overline">
        <span className="pill">第十四节 · 条件渲染</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            条件渲染<span className="title-period">.</span>
          </h1>
          <p>条件决定出现什么，也决定留下什么。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>14</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 看懂分支替换
        </span>
        <span>
          <Icon type="check" size={16} /> 比较隐藏与卸载
        </span>
        <span>
          <Icon type="check" size={16} /> 描述恢复与取消
        </span>
      </div>
      <nav className="stepper" aria-label="第十四节学习步骤">
        {conditionalSteps.map((s, i) => (
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
        aria-labelledby="conditional-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            CONDITIONAL LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="conditional-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        <ConditionalWorkbench key={instanceEpoch} data={data} patch={patch} />
        {data.step === 3 && (
          <div className="quiz-grid">
            {conditionalQuestions.map((q, i) => {
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
              <h3>你的条件分支简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成条件草稿" : "生成条件指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的条件指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制条件指令
                </button>
              </div>
              <label className="sr-only" htmlFor="conditional-agent-draft">
                可编辑的 条件 Agent 指令
              </label>
              <textarea
                id="conditional-agent-draft"
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
                placeholder="生成后，补充 分支内容、数据归属、恢复与焦点。"
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
                我已检查 全部分支、恢复、重试与取消。
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
                  ? "完成第十四节"
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
          重置第十四节进度
        </button>
      </div>
      <ConditionalReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="conditional-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="conditional-reset-title">重新开始第十四节？</h2>
        <p>仅清除第十四节的进度、实验参数和草稿；前十三节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十四节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十四节
          </button>
        </div>
      </dialog>
    </div>
  );
}
