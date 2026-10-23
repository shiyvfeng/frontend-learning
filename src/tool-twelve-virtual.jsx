import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useVirtualizer,
  observeElementRect,
  observeElementOffset,
} from "@tanstack/react-virtual";
import {
  ROWS,
  ROW_HEIGHT,
  filterRows,
  metrics,
  runtimeState,
} from "./tool-twelve-model";
const tracked = (name, observe) => (instance, cb) => {
  let active = true;
  metrics[name]++;
  let clean;
  try {
    clean = observe(instance, (...a) => {
      if (active) cb(...a);
    });
  } catch (e) {
    metrics[name]--;
    throw e;
  }
  return () => {
    if (!active) return;
    active = false;
    metrics[name]--;
    clean?.();
  };
};
const rect = tracked("rectObservers", observeElementRect),
  offset = tracked("offsetObservers", observeElementOffset);
export default function VirtualLab({ data, patch }) {
  const viewport = useRef(null),
    alive = useRef(true),
    resume = useRef({
      filter: data.filter,
      offset: 0,
      hidden: document.hidden,
    }),
    latest = useRef({ data, patch }),
    offscreen = useRef(new Map());
  latest.current = { data, patch };
  const [selected, setSelected] = useState(ROWS[0].id),
    [records, setRecords] = useState({}),
    [idInput, setIDInput] = useState("50"),
    [snapshot, setSnapshot] = useState(null),
    [message, setMessage] = useState(""),
    [visible, setVisible] = useState(() => !document.hidden);
  const selectedRow = ROWS.find((r) => r.id === selected),
    record = records[selected] || { marked: false, note: "" },
    rows = useMemo(() => filterRows(data.filter), [data.filter]),
    getKey = useCallback((i) => rows[i].id, [rows]);
  const v = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewport.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: getKey,
    overscan: data.overscan,
    observeElementRect: rect,
    observeElementOffset: offset,
    useFlushSync: false,
    enabled: visible,
    // Disabling Virtual clears its offset and measurements. Restore this
    // instance's position only while the same filtered dataset is active.
    initialOffset: () =>
      resume.current.filter === latest.current.data.filter
        ? resume.current.offset
        : 0,
  });
  const items = v.getVirtualItems(),
    mark = useRef((...keys) => {
      if (!alive.current) return;
      const { data, patch } = latest.current,
        x = Object.fromEntries(
          keys.filter((k) => !data[k]).map((k) => [k, true]),
        );
      if (Object.keys(x).length) patch(x);
    }).current;
  useEffect(() => {
    alive.current = true;
    metrics.virtualComponents++;
    const hidden = () => {
      if (!alive.current) return;
      if (document.hidden && !resume.current.hidden) {
        resume.current = {
          filter: latest.current.data.filter,
          offset: v.options.enabled
            ? (viewport.current?.scrollTop ?? 0)
            : resume.current.filter === latest.current.data.filter
              ? resume.current.offset
              : 0,
          hidden: true,
        };
      } else if (!document.hidden) resume.current.hidden = false;
      v.cancelScroll();
      setVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", hidden);
    metrics.listeners++;
    return () => {
      alive.current = false;
      v.cancelScroll();
      document.removeEventListener("visibilitychange", hidden);
      metrics.listeners--;
      metrics.virtualComponents--;
      offscreen.current.clear();
    };
  }, [v]);
  useLayoutEffect(() => {
    resume.current = {
      filter: data.filter,
      offset: 0,
      hidden: document.hidden,
    };
    v.cancelScroll();
    v.scrollToOffset(0, { behavior: "auto" });
  }, [data.filter, v]);
  useEffect(() => {
    if (data.filter === "empty" && items.length === 0) mark("emptySeen");
  }, [data.filter, items.length, mark]);
  const configure = (x) => {
    v.cancelScroll();
    patch({
      ...x,
      reviewed: false,
      draftStale: data.generated || data.draftStale,
    });
  };
  const updateRecord = (x) =>
    setRecords((old) => ({ ...old, [selected]: { ...record, ...x } }));
  const at = rows.findIndex((r) => r.id === selected);
  const locate = () => {
    v.cancelScroll();
    if (at < 0) {
      setMessage("选中ID不在当前筛选内，数据仍保留；恢复全部后可定位。");
      return;
    }
    v.scrollToIndex(at, { align: "start", behavior: "auto" });
    setMessage("已请求真实库定位；点击检查，以实际DOM和几何确认到达。");
  };
  const inspect = () => {
    const e = viewport.current,
      node = e?.querySelector(`[data-row-id="${selected}"]`),
      box = e?.getBoundingClientRect(),
      r = node?.getBoundingClientRect(),
      mounted = !!node,
      inside = !!(
        r &&
        box &&
        r.bottom > box.top &&
        r.top < box.bottom &&
        r.right > box.left &&
        r.left < box.right
      ),
      actualNodes = [...e.querySelectorAll("[data-row-id]")].map((n) => ({
        id: n.dataset.rowId,
        index: Number(n.dataset.index),
        top: n.getBoundingClientRect().top,
        height: n.getBoundingClientRect().height,
      })),
      virtual = v.getVirtualItems();
    const x = {
      implementation: "TanStack React Virtual3.14.22",
      logicalLoaded: ROWS.length,
      filteredCount: rows.length,
      rowHeight: ROW_HEIGHT,
      overscan: v.options.overscan,
      totalSize: v.getTotalSize(),
      scrollOffset: v.scrollOffset,
      scrollRect: v.scrollRect,
      range: v.range ? { ...v.range } : null,
      items: virtual.map((i) => ({
        index: i.index,
        key: i.key,
        start: i.start,
        end: i.end,
        size: i.size,
      })),
      dom: actualNodes,
      selected: {
        id: selected,
        filteredIndex: at,
        mounted,
        visible: inside,
        record: { ...record },
      },
      runtime: runtimeState(),
    };
    setSnapshot(x);
    const consistent =
      actualNodes.length === virtual.length &&
      virtual.every(
        (i, k) => rows[i.index]?.id === i.key && actualNodes[k]?.id === i.key,
      );
    if (rows.length > virtual.length && virtual.length > 0 && consistent)
      mark("windowSeen");
    if (data.filter === "odd" && consistent && virtual.length)
      mark("filterSeen");
    if (at >= 0 && !mounted && (record.marked || record.note)) {
      offscreen.current.set(selected, { ...record });
      mark("offscreenSeen");
    }
    const old = offscreen.current.get(selected);
    if (
      inside &&
      old &&
      old.marked === record.marked &&
      old.note === record.note
    )
      mark("preservedSeen");
    setMessage(
      mounted
        ? inside
          ? "实际检查：选中ID已挂载且在可见区。"
          : "实际检查：选中ID已离屏但仍挂载在缓冲区；离屏不等于卸载。"
        : "实际检查：当前没有选中ID的行DOM；外部项目模型与编辑区仍保留。",
    );
  };
  const view = {
    logicalLoaded: ROWS.length,
    count: rows.length,
    domCount: items.length,
    totalSize: v.getTotalSize(),
    rowHeight: ROW_HEIGHT,
    overscan: data.overscan,
    selected,
    record,
    items: items.map((i) => ({
      key: i.key,
      index: i.index,
      start: i.start,
      size: i.size,
    })),
    runtime: runtimeState(),
    visible,
  };
  return (
    <div className="tool12-virtual" data-virtual-view={JSON.stringify(view)}>
      <div className="tool12-runtime">
        <strong>真实TanStack React Virtual 3.14.22 · 固定72px行</strong>
        <p>
          已加载2000条虚构对象；库只决定挂载窗口，不是分页/后端加载。排序实验与这里独立，未组合拖拽虚拟行。动态行高未实现；长标题在行内省略，稳定编辑区可读全文。
        </p>
      </div>
      <div className="tool12-controls">
        <label htmlFor="tool12-filter">筛选（ID与项目编辑独立保存）</label>
        <select
          id="tool12-filter"
          value={data.filter}
          onChange={(e) => configure({ filter: e.target.value })}
        >
          <option value="all">全部2000条</option>
          <option value="odd">仅奇数ID · 1000条</option>
          <option value="empty">空结果</option>
        </select>
        <label htmlFor="tool12-overscan">上下缓冲行数</label>
        <select
          id="tool12-overscan"
          value={data.overscan}
          onChange={(e) => configure({ overscan: Number(e.target.value) })}
        >
          <option value="2">2行</option>
          <option value="6">6行</option>
        </select>
        <button
          aria-pressed={data.longLabel}
          onClick={() => configure({ longLabel: !data.longLabel })}
        >
          切换长标题样例
        </button>
      </div>
      <p className="tool12-counts">
        逻辑已加载 {ROWS.length}；当前筛选 {rows.length}；本次getVirtualItems{" "}
        {items.length} 行DOM；几何总高 {v.getTotalSize()}
        px。数字随真实窗口变化，不是性能测速。
      </p>
      {!visible && (
        <p>页面隐藏：本例观察器暂停，返回后重新观察，项目编辑不丢。</p>
      )}
      <div
        className="tool12-scroll"
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label="真实虚拟列表滚动区"
        onFocus={(e) => {
          if (
            e.target === e.currentTarget &&
            e.currentTarget.matches(":focus-visible")
          )
            e.currentTarget.scrollIntoView({
              block: "center",
              behavior: "auto",
            });
        }}
        onKeyDown={(e) => {
          if (e.key === "Home" || e.key === "End") {
            e.preventDefault();
            v.cancelScroll();
            v.scrollToIndex(
              e.key === "Home" ? 0 : Math.max(0, rows.length - 1),
              { align: e.key === "Home" ? "start" : "end", behavior: "auto" },
            );
          }
        }}
      >
        {rows.length === 0 ? (
          <p className="tool12-empty">
            没有匹配对象；空结果不等于删除2000条已加载数据。
          </p>
        ) : (
          <div
            role="list"
            aria-label="虚拟对象窗口"
            className="tool12-space"
            style={{ height: v.getTotalSize() }}
          >
            {items.map((i) => {
              const row = rows[i.index],
                saved = records[row.id] || { marked: false, note: "" };
              return (
                <div
                  role="listitem"
                  aria-posinset={i.index + 1}
                  aria-setsize={rows.length}
                  aria-current={row.id === selected ? "true" : undefined}
                  key={i.key}
                  data-row-id={row.id}
                  data-index={i.index}
                  data-start={i.start}
                  data-marked={String(saved.marked)}
                  className={`tool12-row ${row.id === selected ? "selected" : ""}`}
                  style={{
                    height: i.size,
                    transform: `translateY(${i.start}px)`,
                  }}
                >
                  <strong>
                    {data.longLabel
                      ? row.label +
                        " · 长标题需要保留全文替代，固定行并不会自动变成动态测量"
                      : row.label}
                  </strong>
                  <span>
                    {row.id} · {saved.marked ? "已标记" : "未标记"} ·{" "}
                    {saved.note || "暂无备注"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="micro">
        此区域只读，无逐行Tab目标；Tab能离开，Home/End定位首尾，PageDown/方向键可原生滚动。行卸载不会带走下方稳定编辑区的焦点。
      </p>
      <div className="tool12-buttons">
        <button
          onClick={() => {
            v.cancelScroll();
            v.scrollToOffset(0, { behavior: "auto" });
          }}
        >
          回到列表开头
        </button>
        <button
          onClick={() => {
            v.cancelScroll();
            if (rows.length)
              v.scrollToIndex(rows.length - 1, {
                align: "end",
                behavior: "auto",
              });
          }}
        >
          移到列表末尾
        </button>
        <button
          onClick={() => {
            v.cancelScroll();
            if (at >= 0)
              v.scrollToIndex(Math.min(rows.length - 1, at + 50), {
                align: "start",
                behavior: "auto",
              });
            else setMessage("请先恢复当前选中ID所在筛选。");
          }}
        >
          离开选中项窗口
        </button>
        <button onClick={locate}>定位选中项</button>
        <button onClick={inspect}>检查实际虚拟窗口与DOM</button>
      </div>
      <section className="tool12-panel" aria-labelledby="tool12-editor-title">
        <h3 id="tool12-editor-title">按ID保存的稳定编辑区</h3>
        <p>
          选中 {selected}；{selectedRow.label}
          {data.longLabel
            ? " · 长标题需要保留全文替代，固定行并不会自动变成动态测量"
            : ""}
          。
          {at < 0
            ? "当前筛选不含此ID，原数据仍在。"
            : `在筛选中排第${at + 1}位；不是业务ID。`}
        </p>
        <div className="tool12-controls">
          <label htmlFor="tool12-id">对象编号1–2000（选择不自动滚动）</label>
          <input
            id="tool12-id"
            inputMode="numeric"
            value={idInput}
            maxLength={6}
            onChange={(e) => setIDInput(e.target.value)}
          />
          <button onClick={() => setIDInput("50")}>填入编号示例50</button>
          <button
            onClick={() => {
              const n = Number(idInput);
              if (
                !/^\d+$/.test(idInput) ||
                !Number.isInteger(n) ||
                n < 1 ||
                n > 2000
              ) {
                setMessage("编号需为1–2000整数，未改变选中项。");
                return;
              }
              setSelected(ROWS[n - 1].id);
              setMessage("已按稳定ID选择；备注和标记来自该ID模型。");
            }}
          >
            按编号选择
          </button>
          <button
            onClick={() => {
              setSelected(ROWS[0].id);
              setIDInput("1");
            }}
          >
            选择第1号对象
          </button>
          <button
            onClick={() => {
              const n = Math.min(2000, selectedRow.number + 1);
              setSelected(ROWS[n - 1].id);
              setIDInput(String(n));
            }}
          >
            选择下一个ID
          </button>
        </div>
        <div className="tool12-buttons">
          <button
            aria-pressed={record.marked}
            onClick={() => updateRecord({ marked: !record.marked })}
          >
            切换选中对象标记
          </button>
          <button onClick={() => updateRecord({ note: "此对象需优先核对" })}>
            填入对象备注示例
          </button>
        </div>
        <label htmlFor="tool12-note">对象备注（真实编辑；离站清空）</label>
        <input
          id="tool12-note"
          value={record.note}
          maxLength={80}
          onChange={(e) => updateRecord({ note: e.target.value })}
        />
        <p>
          建议：选第1号→标记/备注→离开选中窗口并检查→定位回来再检查。还可切奇数/空筛选，确认身份与数据不因数组下标改变。
        </p>
      </section>
      <p className="tool12-feedback" role="status">
        {message || "所有数据都是本地教学样例；检查按钮读取真实库实例和DOM。"}
      </p>
      {snapshot && (
        <pre
          className="tool12-snapshot"
          data-virtual-snapshot={JSON.stringify(snapshot)}
        >
          点击时真实快照（非实时监控）{JSON.stringify(snapshot, null, 2)}
        </pre>
      )}
    </div>
  );
}
