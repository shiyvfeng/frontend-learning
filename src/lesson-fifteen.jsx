import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  FEEDBACK_STORAGE,
  feedbackSteps,
  feedbackQuestions,
  feedbackSources,
  feedbackInitial,
  readFeedbackProgress,
} from "./lesson-fifteen-content";
import "./lesson-fifteen.css";
const add = (a, v) => [...new Set([...a, v])];
function rescueFocus(nodes, fallback) {
  if (nodes.some((node) => node && node === document.activeElement))
    fallback?.focus();
}
function SingleRequestLab({ kind, patch }) {
  const loading = kind === "loading";
  const [mode, setMode] = useState(loading ? "spinner" : "wait"),
    [outcome, setOutcome] = useState("success"),
    [animate, setAnimate] = useState(false),
    [reduced, setReduced] = useState(false),
    [message, setMessage] = useState("本地手动延迟；没有服务器或网络请求。");
  const initial = {
    phase: "idle",
    confirmed: false,
    pending: null,
    mailbox: [],
    pct: 0,
  };
  const [state, setState] = useState(initial),
    model = useRef(initial),
    seq = useRef(0),
    startRef = useRef(null),
    deliverRef = useRef(null),
    cancelRef = useRef(null);
  const commit = (next) => {
    model.current = next;
    setState(next);
  };
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const begin = () => {
    const s = model.current;
    if (s.pending) {
      setMessage("当前尝试尚未结束：重复点击已忽略，没有创建第二个任务。");
      return;
    }
    const request = {
      id: ++seq.current,
      outcome,
      mode,
      target: !s.confirmed,
      retry: s.phase === "error",
    };
    commit({
      ...s,
      phase: "pending",
      pending: request,
      mailbox: [...s.mailbox, request],
      pct: 0,
    });
    if (loading) patch((o) => ({ loadingModes: add(o.loadingModes, mode) }));
    setMessage(
      `开始本地尝试 #${request.id}；${loading ? "正在等待模拟内容" : mode === "optimistic" ? "先显示预测，仍待确认" : "先保持原值，等待确认"}。手动投递才结束。`,
    );
  };
  const deliver = () => {
    const s = model.current,
      request = s.mailbox[0];
    if (!request) return;
    const accepted = s.pending?.id === request.id;
    rescueFocus(
      [
        ...(s.mailbox.length === 1 ? [deliverRef.current] : []),
        ...(accepted ? [cancelRef.current] : []),
      ],
      startRef.current,
    );
    const next = { ...s, mailbox: s.mailbox.slice(1) };
    if (!accepted) {
      commit(next);
      setMessage(`忽略失效尝试 #${request.id} 的旧结果，当前界面未被覆盖。`);
      return;
    }
    next.pending = null;
    next.phase = request.outcome === "success" ? "success" : "error";
    if (request.outcome === "success") next.confirmed = request.target;
    if (loading && request.outcome === "success") next.pct = 100;
    commit(next);
    if (loading)
      patch({
        [request.outcome === "success" ? "loadingSuccess" : "loadingFailure"]:
          true,
      });
    else if (request.mode === "wait" && request.outcome === "success")
      patch({ waitConfirmed: true });
    else if (request.mode === "optimistic" && request.outcome === "failure")
      patch({ optimisticRollback: true });
    else if (
      request.mode === "optimistic" &&
      request.outcome === "success" &&
      request.retry
    )
      patch({ favoriteRetried: true });
    setMessage(
      request.outcome === "success"
        ? `本地尝试 #${request.id} 已确认成功；这不是服务器保存记录。`
        : `本地尝试 #${request.id} 失败：演示服务拒绝了请求。${loading ? "可以重新开始重试。" : "仅撤销本次预测，保留上一次已确认值；可重试。"}`,
    );
  };
  const cancel = () => {
    const s = model.current;
    if (!s.pending) return;
    rescueFocus([cancelRef.current], startRef.current);
    commit({ ...s, pending: null, phase: "cancelled" });
    if (loading) patch({ loadingCancelled: true });
    setMessage(
      "本地尝试已取消；旧结果仍可投递，但已失效。没有撤销任何真实服务器操作。",
    );
  };
  const pending = state.pending,
    displaySaved =
      pending?.mode === "optimistic" ? pending.target : state.confirmed;
  return (
    <div className="feedback-lab">
      <div className="panel-heading">
        <span>{loading ? "本地加载实验" : "本地收藏实验"} · 手动延迟</span>
        <span className="micro">不联网 · 无真实服务器</span>
      </div>
      <div className="feedback-controls">
        <Choices
          label={loading ? "加载反馈方式" : "下一次更新时机"}
          values={
            loading
              ? [
                  ["spinner", "spinner · 忙碌图标"],
                  ["skeleton", "Skeleton · 布局占位"],
                ]
              : [
                  ["wait", "等待确认"],
                  ["optimistic", "乐观显示"],
                ]
          }
          value={mode}
          onChange={(v) => {
            setMode(v);
            if (loading && model.current.pending)
              patch((o) => ({
                loadingModes: add(o.loadingModes, v),
                knownProgress:
                  o.knownProgress || (v === "spinner" && model.current.pct > 0),
              }));
          }}
        />
        <Choices
          label={loading ? "加载模拟结果" : "收藏模拟结果"}
          values={[
            ["success", "成功"],
            ["failure", "失败"],
          ]}
          value={outcome}
          onChange={setOutcome}
        />
        <button ref={startRef} onClick={begin}>
          {loading ? "开始 / 重试模拟加载" : "请求切换收藏"}
        </button>
        <button
          ref={deliverRef}
          disabled={!state.mailbox.length}
          onClick={deliver}
        >
          投递{loading ? "加载" : "收藏"}结果（{state.mailbox.length}）
        </button>
        <button ref={cancelRef} disabled={!pending} onClick={cancel}>
          取消{loading ? "加载" : "收藏"}尝试
        </button>
        {loading && (
          <>
            <button
              onClick={() => {
                if (!model.current.pending) {
                  setMessage("先开始一次加载，再手动设定本例的已知进度。");
                  return;
                }
                commit({ ...model.current, pct: 50 });
                patch((o) => ({
                  knownProgress: o.knownProgress || mode === "spinner",
                }));
              }}
            >
              手动推进至 50%
            </button>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={animate}
                onChange={(e) => setAnimate(e.target.checked)}
              />
              播放装饰动画（关闭即暂停）
            </label>
          </>
        )}
      </div>
      {loading ? (
        <div
          data-testid="loading-surface"
          data-phase={state.phase}
          className={`feedback-panel ${animate && !reduced ? "motion" : ""}`}
          aria-busy={!!pending}
        >
          {pending ? (
            <>
              <h3>正在等待本地模拟结果</h3>
              {mode === "spinner" ? (
                <div className="feedback-wait">
                  <span className="feedback-spinner" aria-hidden="true" />
                  <p>忙碌图标：任务进行中，尚未有结果。</p>
                </div>
              ) : (
                <>
                  <p>Skeleton 只是预期布局占位，尚无真实内容。</p>
                  <div
                    className="feedback-cards"
                    aria-hidden="true"
                    data-testid="skeleton-placeholders"
                  >
                    {[0, 1, 2].map((n) => (
                      <div key={n} className="feedback-skeleton">
                        <i />
                        <i />
                        <i />
                      </div>
                    ))}
                  </div>
                </>
              )}
              {state.pct > 0 && (
                <label>
                  本地手动进度 · {state.pct}%
                  <progress
                    aria-label="本地手动进度"
                    max="100"
                    value={state.pct}
                  />
                </label>
              )}
            </>
          ) : state.phase === "success" ? (
            <>
              <h3>✓ 示例内容已加载</h3>
              <div className="feedback-cards">
                {["布局观察清单", "状态与反馈", "异常与恢复"].map((title) => (
                  <article key={title}>
                    <h4>{title}</h4>
                    <p>这是已投递的本地示例内容；没有读取真实项目。</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>
                {state.phase === "error"
                  ? "! 加载失败"
                  : state.phase === "cancelled"
                    ? "○ 已取消加载"
                    : "○ 尚未开始"}
              </h3>
              <p>
                {state.phase === "error"
                  ? "模拟服务未提供内容，使用上方开始 / 重试入口恢复。"
                  : "选择反馈方式，再开始本地手动等待。"}
              </p>
            </>
          )}
        </div>
      ) : (
        <div
          className="feedback-panel"
          data-testid="favorite-surface"
          data-phase={state.phase}
          data-confirmed={String(state.confirmed)}
          data-visible={String(displaySaved)}
        >
          <h3>路线收藏 · 可恢复的低风险操作</h3>
          <p className="feedback-favorite">
            {displaySaved ? "★ 界面显示已收藏" : "☆ 界面显示未收藏"}
          </p>
          <p>
            {pending
              ? `${pending.mode === "optimistic" ? "预测已显示" : "保持已确认值"} · 待确认 #${pending.id}`
              : state.phase === "error"
                ? "! 失败已回滚预测，可重试"
                : state.phase === "success"
                  ? "✓ 已收到本地成功结果"
                  : "暂无待确认尝试"}
          </p>
          <p>
            已确认值：{state.confirmed ? "已收藏" : "未收藏"}
            ；预测不能当作已保存。
          </p>
        </div>
      )}
      <p
        role="status"
        data-testid={loading ? "loading-feedback" : "favorite-feedback"}
      >
        {message}
      </p>
      <Note>
        {loading
          ? "Skeleton 适合结构较稳定的首次加载；结构未知时占位可能误导。已有内容通常可保留并显示局部忙碌，本实验每次模拟首次取数。spinner 只表示忙，可与已知进度并存；这里的50%来自手动示例，不是网络测量。动画默认暂停，所有门槛都能静态完成。"
          : "先用等待确认成功一次，再选乐观显示并模拟失败，观察预测回滚；保持乐观模式再次请求并成功。支付、权限、库存等高风险或不可逆操作需要验证确认，不因想显得快就一律乐观。"}
        <br />
        {loading && reduced ? "系统减少动态已启用：装饰动画强制暂停。" : ""}
        结果文字位于忙碌内容外；不逐帧播报。重复开始不创建新任务；换站、离课、刷新或重置清空会话与旧结果。
      </Note>
    </div>
  );
}
function OptimisticLedger({ patch }) {
  const [label, setLabel] = useState("路线 A"),
    [outcome, setOutcome] = useState("failure"),
    [state, setState] = useState({ items: [], queue: [] }),
    [message, setMessage] = useState(
      "本地模拟；每项记录自己的确认结果，不保存整表旧快照。",
    );
  const model = useRef(state),
    seq = useRef(0),
    ids = useRef(0),
    root = useRef(null),
    addRef = useRef(null),
    firstRef = useRef(null),
    lastRef = useRef(null);
  const commit = (next) => {
    model.current = next;
    setState(next);
  };
  const enqueue = (item, retry = false) => {
    const s = model.current,
      q = {
        id: ++seq.current,
        itemId: item.id,
        attempt: item.attempt,
        outcome,
        retry,
      };
    commit({
      items: retry
        ? s.items.map((x) => (x.id === item.id ? item : x))
        : [...s.items, item],
      queue: [...s.queue, q],
    });
    setMessage(
      `已乐观加入「${item.label}」，待确认 #${q.id}；目标结果${outcome === "success" ? "成功" : "失败"}。`,
    );
  };
  const addItem = () => {
    const text = label.trim(),
      s = model.current;
    if (!text) {
      setMessage("先填入示例或编辑条目名称。");
      return;
    }
    if (s.items.some((x) => x.label === text && x.phase === "pending")) {
      patch({ duplicateBlocked: true });
      setMessage("同名条目仍待确认，重复提交已忽略，没有重复项。");
      return;
    }
    if (s.items.length >= 8 || s.queue.length >= 16) {
      setMessage("实验最多保留8项、16个结果；先处理当前队列或清空本地实验。");
      return;
    }
    enqueue({ id: ++ids.current, label: text, attempt: 1, phase: "pending" });
  };
  const rescueItem = (id) => {
    const node = root.current?.querySelector(`[data-entry-id="${id}"]`);
    if (node?.contains(document.activeElement)) addRef.current?.focus();
  };
  const cancel = (id) => {
    const s = model.current,
      item = s.items.find((x) => x.id === id);
    if (item?.phase !== "pending") return;
    rescueItem(id);
    commit({
      ...s,
      items: s.items.map((x) =>
        x.id === id ? { ...x, phase: "cancelled" } : x,
      ),
    });
    setMessage(`已取消「${item.label}」的预测；旧结果保持可投递但已失效。`);
  };
  const retry = (id) => {
    const item = model.current.items.find((x) => x.id === id);
    if (!item || !["failed", "cancelled"].includes(item.phase)) return;
    if (model.current.queue.length >= 16) {
      setMessage(
        "结果队列已到16个上限；先投递旧结果，再重试。恢复区文字保留。",
      );
      return;
    }
    rescueItem(id);
    enqueue({ ...item, attempt: item.attempt + 1, phase: "pending" }, true);
  };
  const deliver = (newest) => {
    const s = model.current;
    if (!s.queue.length) return;
    const index = newest ? s.queue.length - 1 : 0,
      q = s.queue[index],
      item = s.items.find((x) => x.id === q.itemId),
      accepted = item?.phase === "pending" && item.attempt === q.attempt;
    if (s.queue.length === 1)
      rescueFocus([firstRef.current, lastRef.current], addRef.current);
    if (accepted) rescueItem(item.id);
    const queue = s.queue.filter((x) => x.id !== q.id);
    if (!accepted) {
      commit({ ...s, queue });
      patch({ cancelIgnored: true });
      setMessage(`忽略失效结果 #${q.id}；旧尝试不能覆盖取消或重试后的状态。`);
      return;
    }
    if (newest && s.queue.length > 1) patch({ outOfOrder: true });
    const items = s.items.map((x) =>
      x.id === item.id
        ? { ...x, phase: q.outcome === "success" ? "success" : "failed" }
        : x,
    );
    if (
      q.outcome === "failure" &&
      items.some((x) => x.id > item.id && x.phase === "success")
    )
      patch({ laterPreserved: true });
    if (q.retry && q.outcome === "success") patch({ itemRetried: true });
    commit({ items, queue });
    setMessage(
      q.outcome === "success"
        ? `「${item.label}」已确认成功；其他条目不变。`
        : `「${item.label}」模拟失败：只回滚这一项，文字留在恢复区，后续条目不被旧快照覆盖。`,
    );
  };
  const row = (item) => (
    <article
      key={item.id}
      data-entry-id={item.id}
      data-label={item.label}
      data-phase={item.phase}
      className="feedback-item"
    >
      <h4>{item.label}</h4>
      <p>
        {
          {
            pending: "◌ 待确认 · 预测条目",
            success: "✓ 本地已确认",
            failed: "! 失败已回滚 · 可恢复",
            cancelled: "○ 已取消预测 · 可重试",
          }[item.phase]
        }{" "}
        · 尝试 {item.attempt}
      </p>
      {item.phase === "pending" && (
        <button onClick={() => cancel(item.id)}>取消 {item.label}</button>
      )}
      {["failed", "cancelled"].includes(item.phase) && (
        <button onClick={() => retry(item.id)}>重试 {item.label}</button>
      )}
    </article>
  );
  return (
    <div ref={root} className="feedback-lab">
      <div className="panel-heading">
        <span>本地乐观条目 · 按项确认 / 回滚</span>
        <span className="micro">手动乱序投递</span>
      </div>
      <div className="feedback-controls">
        <label>
          条目名称
          <input
            value={label}
            maxLength={80}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <button onClick={() => setLabel("路线 A")}>填入示例 A</button>
        <button onClick={() => setLabel("路线 B")}>填入后续示例 B</button>
        <Choices
          label="新增或重试模拟结果"
          values={[
            ["success", "成功"],
            ["failure", "失败"],
          ]}
          value={outcome}
          onChange={setOutcome}
        />
        <button ref={addRef} onClick={addItem}>
          乐观添加条目
        </button>
        <button
          ref={firstRef}
          disabled={!state.queue.length}
          onClick={() => deliver(false)}
        >
          投递最早条目结果（{state.queue.length}）
        </button>
        <button
          ref={lastRef}
          disabled={!state.queue.length}
          onClick={() => deliver(true)}
        >
          投递最新条目结果（{state.queue.length}）
        </button>
        <button
          onClick={() => {
            const active = document.activeElement;
            if (
              root.current.querySelector("[data-entry-id]:focus-within") ||
              active === firstRef.current ||
              active === lastRef.current
            )
              addRef.current.focus();
            commit({ items: [], queue: [] });
            setMessage("本地实验已清空，旧队列已丢弃；学习任务记录保留。");
          }}
        >
          清空本地实验
        </button>
      </div>
      <div className="feedback-columns">
        <section className="feedback-panel" aria-label="界面中的条目">
          <h3>界面中的条目 · 预测有明确标记</h3>
          <div data-testid="visible-items">
            {state.items
              .filter((x) => ["pending", "success"].includes(x.phase))
              .map(row)}
          </div>
          {!state.items.some((x) =>
            ["pending", "success"].includes(x.phase),
          ) && <p>目前为空；失败和取消的文字仍在恢复区。</p>}
        </section>
        <section className="feedback-panel" aria-label="失败与取消恢复区">
          <h3>恢复区 · 保留输入与重试</h3>
          <div data-testid="recovery-items">
            {state.items
              .filter((x) => ["failed", "cancelled"].includes(x.phase))
              .map(row)}
          </div>
          {!state.items.some((x) =>
            ["failed", "cancelled"].includes(x.phase),
          ) && <p>暂无需要恢复的条目。</p>}
        </section>
      </div>
      <p role="status" data-testid="ledger-feedback">
        {message}
      </p>
      <Note>
        用失败结果添加 A，再重复提交一次；改成成功结果添加 B，先投递最新
        B，再投递最早 A，观察 B 留在界面。为 A
        选择成功后重试、取消、再重试；先投递旧结果，再投递新结果。每次尝试有独立编号，旧回调不能覆盖新状态。这里只操作本地教学记录，不代表真实发送或保存。换站、离课、刷新或重置清空本地会话。
      </Note>
    </div>
  );
}
function FeedbackWorkbench({ data, patch }) {
  return (
    <>
      {data.step === 0 && <SingleRequestLab kind="loading" patch={patch} />}{" "}
      {data.step === 1 && <SingleRequestLab kind="favorite" patch={patch} />}{" "}
      {data.step === 2 && <OptimisticLedger patch={patch} />}
    </>
  );
}

function FeedbackReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十五节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课以手动本地延迟比较忙碌图标、Skeleton
          占位与乐观更新，没有服务器、网络请求或自动任务计时器。Skeleton
          不是已加载数据，spinner
          表示忙碌而不决定时长是否可知。乐观列表用稳定临时
          ID、尝试编号和按项记录隔离结果；A 的失败不能删除后续 B。这里使用普通
          React State 展示原理，没有调用 useOptimistic
          或接入数据请求库。装饰动画默认暂停，可手动播放，系统减少动态优先；状态反馈仅随离散操作更新，放在
          aria-busy 区域外。后续章节开放状态以课程目录为准。
        </p>
        <div className="source-links">
          {feedbackSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonFifteen({ onStorageStatus }) {
  const [data, setData] = useState(readFeedbackProgress),
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
      localStorage.setItem(FEEDBACK_STORAGE, JSON.stringify(data));
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
        ["spinner", "skeleton"].every((v) => data.loadingModes.includes(v)),
        "比较 spinner 与 Skeleton 的真实占位",
      ],
      [data.loadingSuccess && data.loadingFailure, "投递成功与失败结果"],
      [data.knownProgress, "让 spinner 与已知进度并存"],
      [data.loadingCancelled, "取消本地等待"],
    ],
    [
      [data.waitConfirmed, "先等确认，再更新收藏"],
      [data.optimisticRollback, "先显示预测，再让失败回滚"],
      [data.favoriteRetried, "重试乐观收藏并成功"],
    ],
    [
      [
        data.laterPreserved && data.outOfOrder,
        "后加的 B 先成功，A 失败仅回滚 A",
      ],
      [data.duplicateBlocked, "重复添加待确认 A，验证没有重复项"],
      [data.cancelIgnored, "取消后投递旧尝试，确认被忽略"],
      [data.itemRetried, "重试失败或取消的条目并成功"],
    ],
    feedbackQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成加载与乐观更新简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查重复、错误、取消、回滚、重试与完成反馈",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = feedbackSteps[data.step];
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
      setNotice("第十五节已完成。" + nextLessonHint(14));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请在现有项目为低风险、可恢复的界面操作设计 Loading / Skeleton / Optimistic UI。先明确内容结构与风险，再选择反馈。本地教学模拟必须明确标注，不读私人文件、不联网、不假称服务器已保存。

加载反馈：spinner 表示正在处理，可与已知进度并存，不把它硬等同于未知时长；无法测量真实进度时不要编造百分比。结构稳定的首次内容加载可用 Skeleton，只表达布局占位，不把它命名为真实数据或让占位进入 Tab。已有内容可保留并标记局部忙碌，避免无故清空或闪烁；结构未知时不用误导性的骨架。完成后显示实际结果、空或明确错误，并提供重试和取消。

乐观策略：收藏、可恢复的草稿条目可以先显示预测并标记待确认。支付、权限、库存等高风险或不可逆操作先验证确认，不把所有操作都乐观。预测不等于已保存，成功结果才移除待确认；失败只回滚相关操作，或保留清楚的失败内容及恢复入口。

并发与回滚：每项用稳定临时 ID，每次尝试有新编号；按项确认与回滚，不用旧的整表快照覆盖新列表。A 待确认后再加入 B，B 先成功，A 随后失败时必须保留 B。忽略同一项待确认期间的重复点击；不同项可独立处理。取消使尝试失效，旧成功或失败到达不得污染重试后的新尝试；取消不宣称撤销服务器实际操作。

恢复与操作：保留失败条目的文字和重试入口，重试生成新尝试号；取消、错误、再次尝试与最终完成都有明确文字反馈。学习演示可手动投递最早/最新结果，不伪装网络速度；离课、换站、刷新和确认重置清理会话与待处理回调，学习进度另存独立键，保留其他课。

可访问性与动态：使用合适的 aria-busy 范围，简短 live-region 状态放在忙碌区域外，不逐帧或反复播报动画。非必要动画默认暂停，提供播放/暂停，尊重 prefers-reduced-motion；所有门槛有静态、触屏和键盘路径。当前操作按钮将隐藏或禁用前，仅当它持有的焦点会失效时转到可见可操作入口；不要抢已经在外部控件的焦点。输入提供示例填入并允许真实编辑。

验收：桌面与375px观察真实占位、待确认与实际数据；走通成功、失败、重复点击、取消、乱序、回滚及重试。每次结果投递后立即记录焦点，不以后续 Tab 或重置掩盖退焦。完整键盘和零键盘触屏走通错题重试、编辑复制简报、复制失败回退、刷新、取消/确认重置，并保留01–14课进度。根据项目需要选择简单 State、useOptimistic 或请求库；本课不提前实现第16课。`,
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
      localStorage.removeItem(FEEDBACK_STORAGE);
    } catch {}
    setData(feedbackInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十五节的进度、参数与草稿；前十四节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-fifteen">
      <div className="lesson-overline">
        <span className="pill">第十五节 · 加载与反馈</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            加载与乐观更新<span className="title-period">.</span>
          </h1>
          <p>等待有说明，预测能恢复，后续操作不丢失。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>15</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 选择合适反馈
        </span>
        <span>
          <Icon type="check" size={16} /> 区分预测与确认
        </span>
        <span>
          <Icon type="check" size={16} /> 保护后续操作
        </span>
      </div>
      <nav className="stepper" aria-label="第十五节学习步骤">
        {feedbackSteps.map((s, i) => (
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
        aria-labelledby="feedback-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            FEEDBACK LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="feedback-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        <FeedbackWorkbench key={instanceEpoch} data={data} patch={patch} />
        {data.step === 3 && (
          <div className="quiz-grid">
            {feedbackQuestions.map((q, i) => {
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
              <h3>你的反馈方案简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成反馈草稿" : "生成反馈指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的反馈指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制反馈指令
                </button>
              </div>
              <label className="sr-only" htmlFor="feedback-agent-draft">
                可编辑的 反馈 Agent 指令
              </label>
              <textarea
                id="feedback-agent-draft"
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
                placeholder="生成后，补充 任务风险、加载反馈、回滚与并发保护。"
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
                我已检查 重复、错误、取消、回滚、重试与完成反馈。
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
                  ? "完成第十五节"
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
          重置第十五节进度
        </button>
      </div>
      <FeedbackReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="feedback-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="feedback-reset-title">重新开始第十五节？</h2>
        <p>仅清除第十五节的进度、实验参数和草稿；前十四节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十五节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十五节
          </button>
        </div>
      </dialog>
    </div>
  );
}
