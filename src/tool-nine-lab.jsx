import React, { useEffect, useRef, useState } from "react";
import {
  recommendation,
  routes,
  rowsFor,
  valueText,
} from "./tool-nine-content";
const add = (a, v) => [...new Set([...a, v])];
function ChartView({ rows, mode, selected, onSelect, api, released }) {
  const host = useRef(null),
    latest = useRef({ rows, mode, selected, onSelect });
  latest.current = { rows, mode, selected, onSelect };
  const [epoch, setEpoch] = useState(0),
    [status, setStatus] = useState("loading");
  useEffect(() => {
    if (released) {
      setStatus("released");
      return;
    }
    let alive = true,
      controller = null;
    setStatus("loading");
    import("./tool-nine-runtime")
      .then((m) => {
        if (!alive) return;
        controller = m.createChart(host.current, (id) =>
          latest.current.onSelect(id),
        );
        api.current = Object.assign(controller, {
          runtimeState: m.runtimeState,
        });
        controller.update(latest.current);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
      controller?.destroy();
      if (api.current === controller) api.current = null;
    };
  }, [epoch, released, api]);
  useEffect(() => {
    api.current?.update({ rows, mode, selected });
  }, [rows, mode, selected, api]);
  return (
    <div className="tool09-view" data-state={status}>
      <p className="tool09-status">
        {status === "ready"
          ? "真实D3 SVG已就绪；没有自动动画。"
          : status === "error"
            ? "D3模块加载失败：数据表与查看按钮仍可用。浏览器可能缓存失败，重试会重新载入本页，学习进度保留。"
            : status === "released"
              ? "已释放本例D3图形和监听；数据表仍可读。"
              : "正在准备本地D3模块；可先读数据表。"}
      </p>
      <div className="tool09-chart-host" ref={host} />
      <button
        onClick={() =>
          status === "error" ? window.location.reload() : setEpoch((n) => n + 1)
        }
      >
        重试D3模块
      </button>
    </div>
  );
}
export default function Tool09Workbench({ data, patch }) {
  const api = useRef(null),
    [selected, setSelected] = useState(null),
    [snapshot, setSnapshot] = useState(null),
    [released, setReleased] = useState(false),
    [message, setMessage] = useState("");
  const [tx, setTx] = useState({ active: null, queue: [], phase: "idle" }),
    txRef = useRef(tx),
    serial = useRef(0);
  txRef.current = tx;
  const updateTx = (next) => {
    txRef.current = next;
    setTx(next);
  };
  const rows = rowsFor(data.dataset, data.filter),
    row = rows.find((r) => r.id === selected);
  const change = (x, flags = {}) => {
    patch({
      ...x,
      ...flags,
      reviewed: false,
      draftStale: data.generated || data.draftStale,
    });
    setSnapshot(null);
  };
  const choose = (id) => {
    const r = rows.find((r) => r.id === id);
    if (!r) return;
    setSelected(id);
    patch({
      zeroSeen: data.zeroSeen || r.value === 0,
      missingSeen: data.missingSeen || r.value === null,
    });
  };
  useEffect(() => {
    if (!rows.some((r) => r.id === selected)) setSelected(null);
  }, [data.filter, selected]);
  const inspect = () => {
    const s = api.current?.snapshot() ?? {
      fallback: true,
      rows,
      reason: "D3未就绪或已释放；这里只读取同源文字数据，不冒充图形",
    };
    setSnapshot(s);
    patch({ inspectedSeen: true });
  };
  const begin = () => {
    const t = txRef.current;
    if (t.active !== null) {
      setMessage("已有当前尝试，请先投递或取消；重复点击未创建新请求。");
      return;
    }
    if (t.queue.length >= 8) {
      setMessage("最多保留8个教学信封，请先投递旧结果。");
      return;
    }
    const id = ++serial.current;
    updateTx({
      active: id,
      queue: [
        ...t.queue,
        {
          id,
          outcome: data.outcome,
          dataset: data.dataset === "A" ? "B" : "A",
        },
      ],
      phase: "pending",
    });
    setMessage(`本地尝试${id}已排队；未发送网络请求，结果需手动投递。`);
  };
  const cancel = () => {
    const t = txRef.current;
    if (t.active === null) {
      setMessage("当前无待应用尝试。");
      return;
    }
    updateTx({ ...t, active: null, phase: "canceled" });
    patch({ canceledSeen: true });
    setMessage("已取消应用；旧信封保留用于验证迟到结果。");
  };
  const deliver = () => {
    const t = txRef.current,
      item = t.queue[0];
    if (!item) {
      setMessage("没有待投递结果；当前数据保持。");
      return;
    }
    const q = t.queue.slice(1);
    if (item.id !== t.active) {
      updateTx({ ...t, queue: q });
      patch({ staleSeen: true });
      setMessage(`忽略旧尝试${item.id}；当前尝试与数据未被覆盖。`);
      return;
    }
    updateTx({
      active: null,
      queue: q,
      phase: item.outcome === "failure" ? "error" : "success",
    });
    if (item.outcome === "failure") {
      patch({ failureSeen: true });
      setMessage("模拟数据失败；保留上次已接受样例，请选择正常结果重试。");
    } else {
      change(
        { dataset: item.dataset },
        { changedSeen: true, retrySeen: data.retrySeen || data.failureSeen },
      );
      setMessage(
        `本地尝试${item.id}成功应用样例${item.dataset}；不是服务端保存。`,
      );
    }
  };
  if (data.step === 0)
    return (
      <div className="tool09-lab">
        <div className="tool09-runtime">
          <strong>真实实现与候选</strong>
          <p>
            D3模块真实驱动SVG；ECharts为配置层示意，未安装运行。常规折线/柱形并不唯一属于某库；不为本课把全站迁成图表框架。
          </p>
        </div>
        <div className="tool09-panel">
          <h3>同一份借用次数，谁负责什么？</h3>
          <div className="tool09-buttons">
            {routes.map(([v, label]) => (
              <button
                key={v}
                aria-pressed={data.route === v}
                onClick={() =>
                  change({ route: v, routesSeen: add(data.routesSeen, v) })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="tool09-buttons">
            {[
              ["standard", "常规比较趋势需求"],
              ["custom", "特殊图形交互需求"],
            ].map(([v, label]) => (
              <button
                key={v}
                aria-pressed={data.need === v}
                onClick={() =>
                  change({ need: v, needsSeen: add(data.needsSeen, v) })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="tool09-recommendation">{recommendation(data)}</p>
          <table>
            <caption>相同任务的职责对照（ECharts仅说明）</caption>
            <thead>
              <tr>
                <th scope="col">层级</th>
                <th scope="col">配置候选</th>
                <th scope="col">本例D3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">数据</th>
                <td>字段/series映射到option，更新策略由应用选择</td>
                <td>keyed join关联稳定日期ID与SVG节点</td>
              </tr>
              <tr>
                <th scope="row">几何</th>
                <td>图表库布局与绘制，也可扩展</td>
                <td>scaleBand/scaleLinear + line.defined</td>
              </tr>
              <tr>
                <th scope="row">产品</th>
                <td colSpan="2">
                  两者都仍需数据语义、DOM数据表/操作、加载失败和生命周期设计；不是性能绝对排名
                </td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => patch({ comparedSeen: true })}>
            记录配置层与定制层的选型条件
          </button>
        </div>
        <div className="tool09-panel">
          <h3>ECharts配置合同示意 · 不执行</h3>
          <pre
            className="tool09-code"
            tabIndex={0}
            role="region"
            aria-label="ECharts配置合同示意代码（不执行）"
          >
            {JSON.stringify(
              {
                xAxis: { type: "category", data: rows.map((r) => r.day) },
                yAxis: { type: "value", min: 0, max: 40, name: "次" },
                series: [
                  { id: "loans", type: "bar", data: rows.map((r) => r.value) },
                ],
              },
              null,
              2,
            )}
          </pre>
          <p>
            生产需按版本核对空值、series稳定标识和合并/替换策略；示意没有调用setOption、resize或dispose。本例实际使用D3，不能把这段展示当成已接入ECharts。
          </p>
        </div>
      </div>
    );
  return (
    <div
      className="tool09-lab"
      data-phase={tx.phase}
      data-queue={tx.queue.length}
    >
      <div className="tool09-runtime">
        <strong>真实D3 · 虚构器材借用次数（次）</strong>
        <p>
          最多6条样例，非真实业务。SVG是矢量，不需DPR位图放大；无动画，无持续循环。不把节点数量当跨库性能证明。
        </p>
      </div>
      <div className="tool09-controls">
        <label htmlFor="tool09-mode">阅读任务 / 图形</label>
        <select
          id="tool09-mode"
          value={data.mode}
          onChange={(e) =>
            change({
              mode: e.target.value,
              modesSeen: add(data.modesSeen, e.target.value),
            })
          }
        >
          <option value="bar">比较每天次数 · 柱形</option>
          <option value="line">观察日期趋势 · 折线</option>
        </select>
        <label htmlFor="tool09-filter">样例范围</label>
        <select
          id="tool09-filter"
          value={data.filter}
          onChange={(e) =>
            change({
              filter: e.target.value,
              filtersSeen: add(data.filtersSeen, e.target.value),
            })
          }
        >
          <option value="all">全部6天</option>
          <option value="recent">后3天</option>
          <option value="empty">空结果</option>
        </select>
        <span>已接受样例 {data.dataset}</span>
        <button
          onClick={() =>
            change(
              { dataset: data.dataset === "A" ? "B" : "A" },
              { changedSeen: true },
            )
          }
        >
          切换教学样例A/B
        </button>
      </div>
      <div className="tool09-panel">
        <h3>真实数据映射</h3>
        <p>
          纵轴固定0–40次，柱形从0开始；折线按日期排序，缺失断开。0有基线标记，缺失有文字；两者不同。可点图形或下面的原生按钮查看，空结果不画假0。
        </p>
        <ChartView
          rows={rows}
          mode={data.mode}
          selected={selected}
          onSelect={choose}
          api={api}
          released={released}
        />
        <p className="tool09-summary" role="status">
          {row
            ? `${row.day}：${valueText(row.value)}。${row.value === null ? "未记录，不能推断没有借用。" : row.value === 0 ? "有记录，测得没有借用。" : "样例测得次数。"}`
            : selected
              ? "所选记录已被筛掉，请重新选择。"
              : "尚未选择；数据表提供全部数值。"}
        </p>
        <table className="tool09-data">
          <caption>与图形同源的完整数值 · 当前{rows.length}条</caption>
          <thead>
            <tr>
              <th scope="col">日期</th>
              <th scope="col">次数 / 次</th>
              <th scope="col">选择</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-table-row={r.id}>
                <th scope="row">{r.day}</th>
                <td>{valueText(r.value)}</td>
                <td>
                  <button
                    aria-pressed={selected === r.id}
                    onClick={() => choose(r.id)}
                  >
                    查看{r.day}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan="3">没有匹配记录，不代表0次。</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="tool09-buttons">
          <button onClick={inspect}>读取图表与数据快照</button>
          <button
            onClick={() => {
              setReleased(true);
              setSnapshot(null);
              patch({ cleanupSeen: true });
            }}
          >
            释放本例D3资源
          </button>
          <button onClick={() => setReleased(false)}>恢复D3绘图</button>
        </div>
        {snapshot && (
          <pre
            className="tool09-snapshot"
            data-chart-snapshot={JSON.stringify(snapshot)}
          >
            点击时快照（不是实时监控）{JSON.stringify(snapshot, null, 2)}
          </pre>
        )}
      </div>
      {data.step === 2 && (
        <div className="tool09-panel">
          <h3>明确标注的本地手动数据流程</h3>
          <p>
            不请求服务器。每次开始保存目标样例及成败快照；重复开始被阻止，最多8个信封。失败保留旧图表，取消不删除旧信封以便投递验证，离站/刷新清空会话。
          </p>
          <div className="tool09-buttons">
            <button
              aria-pressed={data.outcome === "failure"}
              onClick={() => patch({ outcome: "failure" })}
            >
              下次样例模拟失败
            </button>
            <button
              aria-pressed={data.outcome === "success"}
              onClick={() => patch({ outcome: "success" })}
            >
              下次样例正常
            </button>
            <button onClick={begin}>开始或重试样例</button>
            <button onClick={cancel}>取消本次样例</button>
            <button onClick={deliver}>投递最早样例结果</button>
          </div>
          <p>
            阶段：{tx.phase}；当前尝试：{tx.active ?? "无"}；待投递：
            {tx.queue.length}
          </p>
          <p role="status">{message}</p>
        </div>
      )}
    </div>
  );
}
