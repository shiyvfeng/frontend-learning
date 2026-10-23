import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import {
  applyMutationResult,
  createLocalSession,
  queryKey,
} from "./tool-ten-runtime";
import { recommendation } from "./tool-ten-content";
const add = (a, v) => [...new Set([...a, v])];
function Reader({ s, data, observing, mark }) {
  const q = useQuery({
    queryKey: queryKey(data.group),
    queryFn: ({ signal }) => s.api.read(data.group, signal),
    enabled: observing,
    staleTime: data.policy === "fresh" ? Infinity : 0,
  });
  s.reader = {
    group: data.group,
    status: q.status,
    fetchStatus: q.fetchStatus,
    isStale: q.isStale,
    data: q.data ?? null,
    error: q.error?.message ?? null,
  };
  s.refetch = () => q.refetch({ cancelRefetch: false });
  useEffect(() => {
    if (!s.alive) return;
    if (q.data) mark("firstSeen");
    if (q.data && q.isFetching) mark("backgroundSeen");
    if (q.isError) {
      s.hadError = true;
      if (q.data) mark("refreshErrorSeen");
    }
    if (q.data && q.isSuccess && !q.isFetching && s.hadError) mark("retrySeen");
    if (
      q.data &&
      s.expected?.[data.group] &&
      q.data.version >= s.expected[data.group]
    )
      mark("invalidationSeen");
  }, [q.data, q.isFetching, q.status, q.error, s, data.group, mark]);
  return (
    <section
      className="tool10-result"
      aria-labelledby="tool10-data-title"
      data-status={q.status}
      data-fetch={q.fetchStatus}
      data-group={data.group}
      data-count={q.data?.count ?? "none"}
      data-version={q.data?.version ?? "none"}
      data-stale={String(q.isStale)}
    >
      <h3 id="tool10-data-title">当前读取：{data.group}组</h3>
      <p className="tool10-value">
        {q.data
          ? `${q.data.count} 件 · 版本 ${q.data.version}`
          : q.isFetching
            ? "首次读取，尚无缓存数据。"
            : "尚无数据；可开启读取。"}
      </p>
      <p>
        真实Query状态：{q.status} / {q.fetchStatus}；
        {q.isStale ? "stale（可重新验证，非自动判无效）" : "fresh或未启用"}
      </p>
      <p role="status">
        {q.data && q.isFetching
          ? "后台刷新中，旧数据继续显示。"
          : q.error
            ? `${q.data ? "刷新失败，旧数据保留" : "读取失败，尚无数据"}：${q.error.message}，可手动重试。`
            : q.data
              ? "缓存副本可读；本例不是实时库存。"
              : "手动投递本地接口结果，不会自动等待假网络时长。"}
      </p>
    </section>
  );
}
function SessionLab({ data, patch, s }) {
  const [observing, setObserving] = useState(false),
    [message, setMessage] = useState(""),
    [snapshot, setSnapshot] = useState(null),
    [, setCacheRevision] = useState(0);
  const latest = useRef({ data, patch });
  latest.current = { data, patch };
  const mark = useRef((...keys) => {
    if (!s.alive) return;
    const { data, patch } = latest.current,
      flags = Object.fromEntries(
        keys.filter((k) => !data[k]).map((k) => [k, true]),
      );
    if (Object.keys(flags).length) patch(flags);
  }).current;
  useEffect(
    () =>
      s.client.getQueryCache().subscribe((e) => {
        if (s.alive && ["updated", "added", "removed"].includes(e.type))
          setCacheRevision((r) => r + 1);
      }),
    [s],
  );
  useSyncExternalStore(s.api.subscribe, s.api.revision, s.api.revision);
  const api = s.api.snapshot(),
    queries = s.client.getQueryCache().getAll(),
    records = api.records;
  const change = (x) =>
    patch({
      ...x,
      reviewed: false,
      draftStale: data.generated || data.draftStale,
    });
  const mutation = useMutation({
    mutationFn: ({ group }) => s.api.write(group),
    onSuccess: (value, v) =>
      applyMutationResult(s, value, v, () => mark("mutationSeen")),
    onSettled: () => {
      if (s.alive) s.busyWrite = false;
    },
  });
  const open = () => {
    const state = s.client.getQueryState(queryKey(data.group));
    if (!observing) {
      if (state?.data && !state.isInvalidated && data.policy === "fresh")
        mark("cacheHitSeen");
      setObserving(true);
    } else void s.refetch?.();
    setMessage("开启或手动重试；同key进行中复用请求。请在下方投递结果。");
  };
  const close = () => {
    void s.client.cancelQueries({
      queryKey: queryKey(data.group),
      exact: true,
    });
    setObserving(false);
    setMessage("读取已关闭，缓存保留；再次开启可观察新鲜命中或stale后台刷新。");
  };
  const deliver = (id, ok) => {
    const row = records.find((r) => r.id === id);
    setMessage(s.api.deliver(id, ok));
    if (row?.status === "canceled") mark("lateSeen");
  };
  const next = (ok) => {
    const r = records.find((r) => r.status === "pending");
    setMessage(r ? s.api.deliver(r.id, ok) : "没有待处理请求；数据未改变。");
  };
  const readAll = s.inspect();
  return (
    <div
      className="tool10-lab"
      data-requests={records.length}
      data-pending={records.filter((r) => r.status === "pending").length}
      data-session={JSON.stringify({
        runtime: s.runtimeState(),
        queries: readAll.queries,
        source: api.source,
        records,
      })}
    >
      <div className="tool10-runtime">
        <strong>真实TanStack Query React 5.104.5 · 本地手动接口</strong>
        <p>
          QueryClient/useQuery/useMutation真实运行；这里的源数据、延迟和成败完全在浏览器中模拟，不连接库存服务、不测速。每个请求保存开始时的读取快照。
        </p>
      </div>
      <div className="tool10-controls">
        <label htmlFor="tool10-group">查询参数 / 分组</label>
        <select
          id="tool10-group"
          value={data.group}
          onChange={(e) =>
            change({
              group: e.target.value,
              groupsSeen: add(data.groupsSeen, e.target.value),
            })
          }
        >
          <option value="A">A组 · 器材</option>
          <option value="B">B组 · 器材</option>
        </select>
        <label htmlFor="tool10-policy">新鲜策略（无计时门槛）</label>
        <select
          id="tool10-policy"
          value={data.policy}
          onChange={(e) => change({ policy: e.target.value })}
        >
          <option value="fresh">Infinity · 直到显式失效</option>
          <option value="stale">0 · 立即可重新验证</option>
        </select>
      </div>
      <p className="tool10-key">
        当前真实query key：{JSON.stringify(queryKey(data.group))}
      </p>
      <div className="tool10-buttons">
        <button onClick={open}>开启读取或手动重试</button>
        <button onClick={close}>关闭读取保留缓存</button>
        <button
          onClick={() => {
            void s.client.invalidateQueries({
              queryKey: queryKey(data.group),
              exact: true,
            });
            setMessage(
              "已实际invalidate当前key：标为stale，活动读取会后台刷新；非活动只失效不取数。",
            );
          }}
        >
          失效当前key并刷新
        </button>
        <button
          onClick={() => {
            const other = data.group === "A" ? "B" : "A";
            void s.client
              .fetchQuery({
                queryKey: queryKey(other),
                queryFn: ({ signal }) => s.api.read(other, signal),
                staleTime: Infinity,
              })
              .catch(() => {});
            setMessage(`预取${other}组；不同key可并发，结果只进入对应缓存。`);
          }}
        >
          预取另一分组
        </button>
      </div>
      <Reader s={s} data={data} observing={observing} mark={mark} />
      <div className="tool10-panel">
        <h3>手动接口控制台</h3>
        <p>
          先开启读取，再手动成功或失败。按钮不伪造Query状态，只结算真正queryFn返回的Promise。最多8个待处理/24条历史；序号是教学事件顺序，不是毫秒。
        </p>
        <div className="tool10-buttons">
          <button onClick={() => next(true)}>投递最早待处理成功</button>
          <button onClick={() => next(false)}>投递最早待处理失败</button>
          <button
            onClick={() => {
              const pending = records.some(
                (r) =>
                  r.kind === "read" &&
                  r.group === data.group &&
                  r.status === "pending",
              );
              void s.client.cancelQueries({
                queryKey: queryKey(data.group),
                exact: true,
              });
              if (pending) mark("canceledSeen");
              setMessage(
                "已调用cancelQueries；消费AbortSignal的本地Promise被拒绝，Query恢复先前状态。无待处理时不会伪造取消。",
              );
            }}
          >
            取消当前查询
          </button>
          <button
            onClick={() => {
              const r = records.find((r) => r.status === "canceled");
              if (r) deliver(r.id, true);
              else setMessage("没有已取消结果；先取消查询再测试迟到投递。");
            }}
          >
            投递已取消的迟到结果
          </button>
        </div>
        <p className="tool10-feedback" role="status">
          {message}
        </p>
        <ol className="tool10-records">
          {records.map((r) => (
            <li
              key={r.id}
              data-request-id={r.id}
              data-kind={r.kind}
              data-request-status={r.status}
            >
              <strong>
                #{r.id} · {r.kind === "read" ? "读" : "写"} {r.group}组
              </strong>{" "}
              · {r.status} · 读取快照{r.snapshot.count}件/v{r.snapshot.version}
              {r.result
                ? ` → 返回${r.result.count}件/v${r.result.version}`
                : ""}
              {r.lateIgnored ? " · 迟到隔离" : ""}
              <div className="tool10-buttons">
                <button onClick={() => deliver(r.id, true)}>
                  投递#{r.id}成功
                </button>
                <button onClick={() => deliver(r.id, false)}>
                  投递#{r.id}失败
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {data.step === 2 && (
        <div className="tool10-panel">
          <h3>真实useMutation → 定向invalidation</h3>
          <p>
            写入捕获点击时的分组，本地成功后该组数量+1/版本+1。先取消同组未完成的旧读取，再invalidate该key重读，包括首次尚无缓存时；别组不受影响。写入成功和读到新版本是两个阶段。
          </p>
          <div className="tool10-buttons">
            <button
              onClick={() => {
                if (s.busyWrite) {
                  setMessage("写入仍在进行，重复点击未创建新写入。");
                  return;
                }
                s.busyWrite = true;
                mutation.mutate({ group: data.group });
              }}
            >
              提交当前组数量+1
            </button>
            <button
              onClick={() =>
                setMessage(
                  s.api.cancelWrites()
                    ? "已取消尚未投递的本地写入；未更改源数据。"
                    : "没有待投递写入；不能撤销已经提交的修改。",
                )
              }
            >
              取消未投递本地写入
            </button>
          </div>
          <p data-mutation-status={mutation.status}>
            真实mutation：{mutation.status}
            {mutation.error ? ` · ${mutation.error.message}` : ""}
            ；这不是服务器订单状态。
          </p>
          <p>
            仅此本地模拟能在投递前撤销；真实网络取消不保证服务器未提交，不替代幂等/权限和补偿策略。
          </p>
        </div>
      )}
      <div className="tool10-panel">
        <h3>实际缓存与本地源</h3>
        <p>
          本地源：A {api.source.A.count}件/v{api.source.A.version}；B{" "}
          {api.source.B.count}件/v{api.source.B.version}
          。缓存副本可以暂时落后，不是数据库。
        </p>
        <table>
          <caption>直接读取QueryCache · {queries.length}个key</caption>
          <thead>
            <tr>
              <th scope="col">分组</th>
              <th scope="col">缓存副本</th>
              <th scope="col">真实状态</th>
            </tr>
          </thead>
          <tbody>
            {readAll.queries.map((q) => (
              <tr key={JSON.stringify(q.key)}>
                <th scope="row">{q.key[2]}</th>
                <td>
                  {q.data ? `${q.data.count}件/v${q.data.version}` : "无data"}
                </td>
                <td>
                  {q.status}/{q.fetchStatus}
                  {q.invalidated ? " · 已失效" : ""}
                </td>
              </tr>
            ))}
            {!queries.length && (
              <tr>
                <td colSpan="3">尚无缓存条目</td>
              </tr>
            )}
          </tbody>
        </table>
        <button
          onClick={() => {
            setSnapshot({ ...s.inspect(), reader: s.reader });
            mark("inspectedSeen");
          }}
        >
          读取实际Query缓存快照
        </button>
        {snapshot && (
          <pre
            className="tool10-snapshot"
            data-query-snapshot={JSON.stringify(snapshot)}
          >
            点击时快照，非实时监控：{JSON.stringify(snapshot, null, 2)}
          </pre>
        )}
      </div>
      <p className="tool10-boundary">
        演练配置：retry=false（手动重试）、不随焦点/重连自动刷新、gcTime=Infinity，离站显式清空。库默认通常staleTime=0、客户端重试3次、inactive缓存5分钟回收；生产按需求配置。Infinity可被失效，区别于static。无后台轮询或必等动画，reduce也可全部操作。
      </p>
    </div>
  );
}
export default function Tool10Workbench({ data, patch }) {
  const [ui, setUI] = useState(false),
    [epoch, setEpoch] = useState(0);
  if (data.step === 0)
    return (
      <div className="tool10-lab">
        <div className="tool10-runtime">
          <strong>本地UI状态 ≠ 服务端状态缓存</strong>
          <p>
            器材数量来自明确标注的本地模拟源，后两站用真实Query生命周期；这里的面板展开只用React
            state，不会产生请求。
          </p>
        </div>
        <div className="tool10-panel">
          <h3>先确定需要管理什么</h3>
          <div className="tool10-buttons">
            {[
              ["simple", "一次性简单读取"],
              ["shared", "多个视图共享外部数据"],
            ].map(([v, label]) => (
              <button
                key={v}
                aria-pressed={data.scenario === v}
                onClick={() =>
                  patch({
                    scenario: v,
                    scenariosSeen: add(data.scenariosSeen, v),
                    reviewed: false,
                    draftStale: data.generated || data.draftStale,
                  })
                }
              >
                {label}
              </button>
            ))}
            <button
              aria-expanded={ui}
              onClick={() => {
                setUI((v) => !v);
                patch({ uiSeen: true });
              }}
            >
              切换本地说明面板
            </button>
          </div>
          {ui && <p>这是本地展开状态，不是外部数据缓存，也不需要数据库。</p>}
          <p className="tool10-recommendation">{recommendation(data)}</p>
          <button onClick={() => patch({ comparedSeen: true })}>
            记录状态职责与选型条件
          </button>
        </div>
        <div className="tool10-panel">
          <h3>要交接的合同</h3>
          <ul>
            <li>query key给数据身份；queryFn返回Promise，结果进入缓存。</li>
            <li>stale与后台刷新是策略；不是已过期食品或正确性证明。</li>
            <li>mutation修改来源，应用决定失效范围；库不推导所有业务关系。</li>
            <li>
              缓存不等于永久存储；本章演练缓存离站清空，学习记录独立保存。
            </li>
          </ul>
        </div>
      </div>
    );
  return (
    <>
      <button
        className="tool10-session-reset"
        onClick={() => {
          setEpoch((v) => v + 1);
          patch({ cleanupSeen: true });
        }}
      >
        重建演练会话（清空缓存）
      </button>
      <SessionOwner key={epoch} data={data} patch={patch} />
    </>
  );
}
function SessionOwner(props) {
  // Query hooks run under the same owned client as the API and inspector.
  const [s] = useState(createLocalSession);
  useEffect(() => () => s.destroy(), [s]);
  return (
    <QueryClientProvider client={s.client}>
      <SessionLab {...props} s={s} />
    </QueryClientProvider>
  );
}
