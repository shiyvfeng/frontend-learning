import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useId,
  useCallback,
} from "react";
import {
  ROW_HEIGHT,
  PAGE_SIZE,
  listData,
  listScope,
  filteredItems,
  windowRange,
  anchorPosition,
  parseRecord,
} from "./lesson-thirty-content";
const number = (n) => String(n).padStart(4, "0");
function HeightModel({ patch }) {
  const root = useRef(null),
    latest = useRef(patch),
    [expanded, setExpanded] = useState(false),
    [values, setValues] = useState([]),
    [fallback, setFallback] = useState(false);
  latest.current = patch;
  const read = useCallback(() => {
    const es = [...root.current.querySelectorAll("[data-model-row]")],
      top = root.current.getBoundingClientRect().top;
    const next = es.map((e, i) => ({
      height: Math.round(e.getBoundingClientRect().height * 10) / 10,
      offset: Math.round((e.getBoundingClientRect().top - top) * 10) / 10,
      assumed: i * ROW_HEIGHT,
    }));
    setValues((old) =>
      JSON.stringify(old) === JSON.stringify(next) ? old : next,
    );
    if (next[1]?.height > ROW_HEIGHT) latest.current({ modelSeen: true });
  }, []);
  useLayoutEffect(() => read(), [expanded, read]);
  useEffect(() => {
    let alive = true,
      ro;
    const measure = () => {
      if (alive) read();
    };
    try {
      if (typeof ResizeObserver !== "function") throw Error();
      ro = new ResizeObserver(measure);
      root.current
        .querySelectorAll("[data-model-row]")
        .forEach((e) => ro.observe(e));
    } catch {
      setFallback(true);
    }
    window.addEventListener("resize", measure);
    return () => {
      alive = false;
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [read]);
  return (
    <section
      className="list30-model"
      data-expanded={expanded}
      data-fallback={fallback}
    >
      <h3>动态行高测量示意 · 不接入虚拟列表</h3>
      <p>
        下方三行是真实自然高度测量；上方列表始终64px。变高后，后续定位不能继续只靠索引×64。
      </p>
      <div className="list30-buttons">
        <button onClick={() => setExpanded(true)}>增加第二行说明</button>
        <button onClick={() => setExpanded(false)}>恢复三行示意</button>
      </div>
      <div ref={root} className="list30-model-cards">
        {[0, 1, 2].map((i) => (
          <div key={i} data-model-row={i}>
            <strong>示意行{i + 1}</strong>
            <p>
              {i === 1 && expanded
                ? "这是一段增加的说明。内容换行会改变真实高度。虚拟列表若仍假定64px，后续条目的累计偏移就会出错。正式动态方案还要处理估算、测量缓存、宽度变化和滚动锚点，不能只读一次高度就宣称完成。"
                : "简短说明。"}
            </p>
            {i === 1 && expanded && (
              <p>
                新增一段自然内容：这里测量实际高度，不会把它接到上方固定行高列表。
              </p>
            )}
          </div>
        ))}
      </div>
      <ul className="list30-measurements">
        {values.map((v, i) => (
          <li
            key={i}
            data-model-measure={i}
            data-height={v.height}
            data-offset={v.offset}
          >
            第{i + 1}行：实测高{v.height}px；固定假设起点{v.assumed}px，实测起点
            {v.offset}px。
          </li>
        ))}
      </ul>
      <p>
        {fallback
          ? "ResizeObserver不可用，按钮与窗口resize仍用原生矩形读取；不是完整动态虚拟器。"
          : "使用ResizeObserver观察独立三行，卸载时断开；不是动态虚拟器。"}
      </p>
    </section>
  );
}
export default function ListWorkbench({ data, patch }) {
  const viewport = useRef(null),
    frame = useRef(0),
    alive = useRef(true),
    pending = useRef(null),
    instructions = useId(),
    latest = useRef(null),
    [page, setPage] = useState(0),
    [view, setView] = useState({ top: 0, height: 0 }),
    [counts, setCounts] = useState({ rows: 0, elements: 0 }),
    [reduced, setReduced] = useState(false),
    [observerFallback, setObserverFallback] = useState(false),
    [message, setMessage] = useState(
      "样例3000条已在本地内存，改变的是实际DOM窗口。滚动位置只在前三站本次会话保留。",
    );
  const items = useMemo(
      () => filteredItems(data.pool, data.filter, data.mode),
      [data.pool, data.filter, data.mode],
    ),
    pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
    safePage = Math.min(page, pages - 1),
    pageItems = useMemo(
      () => items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
      [items, safePage],
    ),
    base = data.mode === "pages" ? safePage * PAGE_SIZE : 0,
    contentCount = data.mode === "pages" ? pageItems.length : items.length,
    range = windowRange(contentCount, view.top, view.height, data.overscan),
    rendered =
      data.mode === "virtual"
        ? items.slice(range.start, range.end)
        : data.mode === "normal"
          ? items
          : pageItems;
  latest.current = {
    data,
    patch,
    items,
    page: safePage,
    pageItems,
    contentCount,
    base,
  };
  const measure = useCallback(() => {
    const e = viewport.current;
    if (!alive.current || !e) return;
    const l = latest.current,
      r = windowRange(
        l.contentCount,
        e.scrollTop,
        e.clientHeight,
        l.data.overscan,
      );
    setView((old) =>
      old.top === r.top && old.height === e.clientHeight
        ? old
        : { top: r.top, height: e.clientHeight },
    );
    const flags = {};
    if (l.data.mode === "virtual" && r.top > 1 && !l.data.scrolledSeen)
      flags.scrolledSeen = true;
    if (
      l.data.pool === "large" &&
      l.items.length > 0 &&
      l.base + l.contentCount === l.items.length &&
      r.last === l.contentCount &&
      r.top >= r.max - 1 &&
      !l.data.endSeen
    )
      flags.endSeen = true;
    if (Object.keys(flags).length) l.patch(flags);
  }, []);
  const schedule = useCallback(() => {
    if (!alive.current || document.hidden || frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      measure();
    });
  }, [measure]);
  useEffect(() => {
    alive.current = true;
    let ro;
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      media = () => setReduced(m.matches),
      visibility = () => {
        if (document.hidden) {
          if (frame.current) cancelAnimationFrame(frame.current);
          frame.current = 0;
        } else schedule();
      };
    media();
    m.addEventListener("change", media);
    try {
      if (typeof ResizeObserver !== "function") throw Error();
      ro = new ResizeObserver(schedule);
      ro.observe(viewport.current);
    } catch {
      setObserverFallback(true);
    }
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive.current = false;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      ro?.disconnect();
      m.removeEventListener("change", media);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [schedule]);
  useLayoutEffect(() => {
    const e = viewport.current,
      l = latest.current;
    if (!e) return;
    const p = pending.current;
    if (p) {
      let index = 0,
        intra = 0;
      if (p.kind === "anchor") {
        const a = anchorPosition(items, p.id, p.intra);
        index = a.index;
        intra = a.offset;
        setMessage(
          a.found
            ? `已保留首个可见记录#${number(p.id)}及行内偏移；筛选索引已重算。`
            : "原滚动锚点不在新结果中，已回到结果开头；没有误跳到同索引的另一条。",
        );
      } else {
        index = Math.max(0, Math.min(items.length - 1, p.index));
      }
      const desiredPage =
        data.mode === "pages" ? Math.floor(index / PAGE_SIZE) : safePage;
      if (data.mode === "pages" && safePage !== desiredPage) {
        setPage(desiredPage);
        return;
      }
      const local = data.mode === "pages" ? index % PAGE_SIZE : index;
      const max = Math.max(0, l.contentCount * ROW_HEIGHT - e.clientHeight);
      e.scrollTop = Math.max(0, Math.min(max, local * ROW_HEIGHT + intra));
      pending.current = null;
    }
    measure();
  }, [items, data.mode, safePage, data.height, measure]);
  useLayoutEffect(() => {
    const e = viewport.current;
    if (!e) return;
    const next = {
      rows: e.querySelectorAll("[data-list-row]").length,
      elements: e.querySelectorAll("*").length,
    };
    setCounts((old) =>
      old.rows === next.rows && old.elements === next.elements ? old : next,
    );
    const flags = {};
    if (
      data.mode === "virtual" &&
      next.rows > 0 &&
      next.rows < items.length &&
      !data.virtualSeen
    )
      flags.virtualSeen = true;
    if (
      data.mode === "normal" &&
      data.pool === "compare" &&
      next.rows === items.length &&
      items.length > 0 &&
      !data.normalSeen
    )
      flags.normalSeen = true;
    if (data.mode === "pages" && next.rows > 0 && !data.pagedSeen)
      flags.pagedSeen = true;
    if (Object.keys(flags).length) patch(flags);
  }, [
    range.start,
    range.end,
    items,
    pageItems,
    data.mode,
    data.pool,
    data.virtualSeen,
    data.normalSeen,
    data.pagedSeen,
    patch,
  ]);
  const capture = () => {
    const l = latest.current,
      e = viewport.current,
      r = windowRange(
        l.contentCount,
        e?.scrollTop || 0,
        e?.clientHeight || 0,
        0,
      ),
      item = l.items[l.base + r.first];
    pending.current = {
      kind: "anchor",
      id: item?.id || 0,
      intra: r.top % ROW_HEIGHT,
    };
  };
  const mode = (next, pool) => {
    if (next === data.mode && pool === data.pool) {
      setMessage("当前已是该模式，位置保持。");
      return;
    }
    capture();
    patch({ mode: next, pool });
  };
  const filter = (value) => {
    if (value === data.filter) {
      setMessage("当前已是该筛选，位置保持。");
      return;
    }
    capture();
    patch({
      filter: value,
      filteredSeen: true,
      ...(value === "empty" ? { emptySeen: true } : {}),
      ...(data.filter === "empty" && value !== "empty"
        ? { restoredSeen: true }
        : {}),
    });
  };
  const position = (index) => {
    if (!items.length) {
      setMessage("当前没有记录，可以恢复全部筛选。按钮和焦点保留。");
      return;
    }
    pending.current = { kind: "index", index };
    const targetPage =
      data.mode === "pages" ? Math.floor(index / PAGE_SIZE) : safePage;
    if (data.mode === "pages" && targetPage !== safePage) {
      setPage(targetPage);
    } else {
      const local = data.mode === "pages" ? index % PAGE_SIZE : index;
      viewport.current.scrollTop = Math.max(
        0,
        Math.min(
          viewport.current.scrollHeight - viewport.current.clientHeight,
          local * ROW_HEIGHT,
        ),
      );
      pending.current = null;
      measure();
    }
    patch({ locatedSeen: true });
  };
  const find = () => {
    const id = parseRecord(data.jumpText);
    if (id === null) {
      setMessage("编号无效：只接受1–3000整数，不会静默变成0或请求服务器。");
      return;
    }
    const i = items.findIndex((x) => x.id === id);
    if (i < 0) {
      setMessage(
        `记录#${number(id)}不在当前结果，保持筛选与位置；可切换全部再查找。`,
      );
      return;
    }
    position(i);
    patch({ selected: id, readSeen: true });
    setMessage(
      `已定位记录#${number(id)}，当前筛选索引${i + 1}；不会把源编号直接当过滤后索引。`,
    );
  };
  const inspectFirst = () => {
    const e = viewport.current,
      r = windowRange(contentCount, e.scrollTop, e.clientHeight, 0),
      item = items[base + r.first];
    if (!item) {
      setMessage("当前没有可读取记录；可恢复全部筛选。");
      return;
    }
    patch({ selected: item.id, readSeen: true });
    setMessage(`已读取首个可见记录#${number(item.id)}，焦点仍在稳定操作入口。`);
  };
  const selected = items.find((x) => x.id === data.selected),
    first = items[base + range.first],
    last = range.last ? items[base + range.last - 1] : null,
    modeLabel =
      data.mode === "virtual"
        ? "真实窗口化"
        : data.mode === "normal"
          ? "普通全DOM（同一200条）"
          : "非虚拟分页（每页25条）";
  const row = (item, index, visual = false) => {
    const inView = index >= base + range.first && index < base + range.last;
    const contents = (
      <>
        <strong>{item.title}</strong>
        <span>
          {item.category} · {item.checked ? "已核对" : "待核对"}
        </span>
      </>
    );
    return visual ? (
      <div
        key={item.id}
        data-list-row="true"
        data-id={item.id}
        data-index={index}
        data-zone={
          data.mode === "virtual" ? (inView ? "visible" : "buffer") : "normal"
        }
        className="list30-row"
        style={
          data.mode === "virtual"
            ? {
                position: "absolute",
                top: index * ROW_HEIGHT,
                height: ROW_HEIGHT,
              }
            : { height: ROW_HEIGHT }
        }
      >
        {contents}
        <small>
          {data.mode === "virtual" ? (inView ? "可见" : "缓冲") : "完整DOM"}
        </small>
      </div>
    ) : (
      <button
        key={item.id}
        data-list-row="true"
        data-id={item.id}
        data-index={index}
        className="list30-page-item"
        aria-label={`读取记录${number(item.id)}`}
        aria-pressed={data.selected === item.id}
        onClick={() => {
          patch({ selected: item.id, readSeen: true });
          setMessage(`已通过非虚拟分页读取记录#${number(item.id)}。`);
        }}
      >
        {contents}
      </button>
    );
  };
  return (
    <div
      className="list30-lab"
      data-mode={data.mode}
      data-pool={data.pool}
      data-filter={data.filter}
      data-reduced={reduced}
      data-rows={counts.rows}
      data-elements={counts.elements}
      data-first={base + range.first}
      data-end={base + range.last}
      data-render-start={data.mode === "virtual" ? range.start : base}
      data-render-end={
        data.mode === "virtual"
          ? range.end
          : data.mode === "normal"
            ? items.length
            : base + pageItems.length
      }
      data-top={view.top}
      data-height={view.height}
    >
      <div className="list30-boundary">
        <strong>真实DOM窗口化 · 固定行高简化版</strong>
        <p>{listScope}</p>
      </div>
      {data.step === 0 && (
        <div className="list30-controls">
          <label>
            演练标题
            <input
              maxLength="100"
              value={data.caption}
              onChange={(e) => patch({ caption: e.target.value })}
            />
          </label>
          <button
            onClick={() =>
              patch({ caption: "数据都在，DOM只留一窗（教学样例）" })
            }
          >
            填入标题示例
          </button>
        </div>
      )}
      <div className="list30-controls">
        <fieldset>
          <legend>模式与同量对照</legend>
          <div className="list30-buttons">
            {[
              ["virtual", "large", "虚拟3000条"],
              ["virtual", "compare", "虚拟200条（同样集合）"],
              ["normal", "compare", "普通200条（同样集合）"],
              ["pages", "large", "非虚拟分页3000条"],
            ].map(([m, p, n]) => (
              <button
                key={n}
                aria-pressed={data.mode === m && data.pool === p}
                onClick={() => mode(m, p)}
              >
                {n}
              </button>
            ))}
          </div>
          <p>
            普通对照限制200条；比较普通200与虚拟200才是同量对照。虚拟3000不是与普通200的公平性能跑分。
          </p>
        </fieldset>
        <fieldset>
          <legend>筛选（保留ID锚点，缺失就回开头）</legend>
          <div className="list30-buttons">
            {[
              ["all", "全部记录"],
              ["checked", "仅已核对"],
              ["pending", "仅待核对"],
              ["empty", "空结果（教学）"],
            ].map(([v, n]) => (
              <button
                key={v}
                aria-pressed={data.filter === v}
                onClick={() => filter(v)}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="list30-buttons" role="group" aria-label="缓冲行数">
          {[0, 2, 6].map((n) => (
            <button
              key={n}
              aria-pressed={data.overscan === n}
              onClick={() => {
                patch({
                  overscan: n,
                  bufferSeen:
                    (data.mode === "virtual" && n !== data.overscan) ||
                    data.bufferSeen,
                });
                setMessage(`每侧缓冲${n}行，只影响虚拟DOM数量，不改变数据量。`);
              }}
            >
              每侧缓冲{n}行
            </button>
          ))}
        </div>
        <div className="list30-buttons" role="group" aria-label="视口高度">
          {[240, 320, 400].map((n) => (
            <button
              key={n}
              aria-pressed={data.height === n}
              onClick={() => {
                patch({ height: n });
                setMessage(
                  "视口高度已调整，按真实clientHeight重算；短屏会限制高度。末尾可钳制到新最大偏移。",
                );
              }}
            >
              视口{n}px
            </button>
          ))}
        </div>
      </div>
      <h3 className="list30-title">{data.caption || "未命名教学列表"}</h3>
      <p id={instructions} className="list30-help">
        {modeLabel}
        。虚拟/普通行是只读画面，不进Tab序列；聚焦滚动区后可用原生方向键、PageDown、Home/End，Tab可离开。稳定按钮/查找和非虚拟分页提供完整条目与语义访问。
      </p>
      <div
        ref={viewport}
        className="list30-viewport"
        tabIndex={0}
        role="region"
        aria-label="教学列表滚动区"
        aria-describedby={instructions}
        style={{ height: data.height }}
        onFocus={(event) => {
          if (event.target === event.currentTarget)
            event.currentTarget.scrollIntoView({
              block: "center",
              behavior: "auto",
            });
        }}
        onScroll={schedule}
      >
        {!items.length ? (
          <p className="list30-empty">
            当前没有符合筛选的记录，可恢复“全部记录”；没有假行。
          </p>
        ) : data.mode === "pages" ? (
          <div className="list30-page">
            {pageItems.map((x, i) => row(x, base + i))}
          </div>
        ) : (
          <div
            className="list30-spacer"
            aria-hidden="true"
            style={
              data.mode === "virtual"
                ? { height: items.length * ROW_HEIGHT, position: "relative" }
                : undefined
            }
          >
            {rendered.map((x, i) =>
              row(x, data.mode === "virtual" ? range.start + i : i, true),
            )}
          </div>
        )}
      </div>
      <div className="list30-counts" aria-live="off">
        <p>
          本地源模型 {listData.length} 条；候选集{" "}
          {data.pool === "compare" ? 200 : 3000} 条；筛选结果{" "}
          <strong data-result-count={items.length}>{items.length}</strong> 条。
        </p>
        <p>
          可见索引 {items.length ? base + range.first + 1 : 0}–
          {items.length ? base + range.last : 0}；首/末可见编号{" "}
          {first ? `#${number(first.id)}` : "无"} /{" "}
          {last ? `#${number(last.id)}` : "无"}；实际scrollTop{" "}
          {Math.round(view.top * 100) / 100}px，clientHeight {view.height}px。
        </p>
        <p>
          每行64px；
          {data.mode === "virtual"
            ? `上缓冲${range.before}、下缓冲${range.after}行`
            : "当前不是窗口化缓冲"}
          ；实际行容器DOM{" "}
          <strong data-dom-count={counts.rows}>{counts.rows}</strong>
          ；滚动容器内元素总数 {counts.elements}
          （含支撑层/子元素，不含文字节点）。
        </p>
        <p>
          {data.mode === "pages"
            ? `当前第${safePage + 1}/${pages}页，整页最多25行DOM，不是虚拟化。`
            : "行容器数由真实DOM查询，数据模型数量不等于渲染数量。"}{" "}
          {reduced ? "减少动态：全部操作保持静态。" : "本课无强制动画。"}
        </p>
      </div>
      <div className="list30-controls">
        <div className="list30-buttons">
          <button
            onClick={() => {
              viewport.current?.focus();
            }}
          >
            聚焦滚动区
          </button>
          <button
            onClick={() => {
              viewport.current.scrollTop += viewport.current.clientHeight;
              measure();
            }}
          >
            向下滚动一屏
          </button>
          <button
            onClick={() => {
              position(0);
              setMessage("已回到当前结果开头，编号与筛选索引分别显示。");
            }}
          >
            回到结果开头
          </button>
          <button
            onClick={() => {
              position(items.length - 1);
              setMessage(
                items.length
                  ? "已跳到当前结果末尾，窗口按真实最大偏移钳制。"
                  : "当前没有记录，可恢复全部筛选。",
              );
            }}
          >
            跳到结果末尾
          </button>
          <button onClick={inspectFirst}>读取可见首条</button>
        </div>
        {data.mode === "pages" && (
          <div className="list30-buttons">
            <button
              onClick={() => {
                if (!items.length || safePage === 0) {
                  setMessage(
                    items.length
                      ? "已经在第一页，位置和焦点保留。"
                      : "当前没有记录，位置和焦点保留。",
                  );
                  return;
                }
                position((safePage - 1) * PAGE_SIZE);
                setMessage("已换到上一整页，非虚拟分页不是窗口化。");
              }}
            >
              上一页（非虚拟）
            </button>
            <button
              onClick={() => {
                if (!items.length || safePage === pages - 1) {
                  setMessage(
                    items.length
                      ? "已经在最后一页，位置和焦点保留。"
                      : "当前没有记录，位置和焦点保留。",
                  );
                  return;
                }
                position((safePage + 1) * PAGE_SIZE);
                setMessage("已换到下一整页，非虚拟分页不是窗口化。");
              }}
            >
              下一页（非虚拟）
            </button>
          </div>
        )}
        <label>
          查找源记录编号（1–3000）
          <input
            inputMode="numeric"
            maxLength="20"
            value={data.jumpText}
            onChange={(e) => patch({ jumpText: e.target.value })}
          />
        </label>
        <div className="list30-buttons">
          <button onClick={() => patch({ jumpText: "1500" })}>
            填入1500示例
          </button>
          <button onClick={find}>查找并定位编号</button>
        </div>
      </div>
      <section className="list30-detail">
        <h3>稳定位置的记录详情</h3>
        <p>
          {selected
            ? `${selected.title} · ${selected.category} · ${selected.checked ? "已核对" : "待核对"}。源编号不随筛选索引变化。`
            : data.selected
              ? "原选中记录不在当前结果，请恢复筛选或重新查找；不展示另一条冒充它。"
              : "尚未读取。可用稳定的“读取可见首条”、查找或非虚拟分页按钮。"}
        </p>
      </section>
      {data.step === 2 && <HeightModel patch={patch} />}
      <div className="list30-status" role="status">
        {message}
      </div>
      <div className="list30-explain">
        <p>
          窗口化每次只保留可见区及缓冲行，滚动时真实卸载/创建DOM；源模型3000条已经在内存，数据按需加载另设计。普通与虚拟200可同量对照，DOM更少不是跨设备性能结论。
        </p>
        <p>
          为了避免虚拟行卸载带走焦点，本例行画面只读、从辅助树隐藏，稳定焦点在滚动区或外部操作，分页则提供原生逐项访问。正式需要行内编辑或屏幕阅读器完整列表时，要另选保留焦点项/语义策略，不能直接复制本例。
        </p>
        <p>
          本例滚动位置与页码只在前三站本次会话保留；去判断站、离课或刷新回开头，配置和学习记录仍可保留。
          {observerFallback
            ? "ResizeObserver不可用，使用按钮布局测量与窗口resize回退。"
            : "容器ResizeObserver只合并一次待处理测量，空闲不持续循环。"}
          动态行高模型独立，不把它说成动态虚拟器。
        </p>
      </div>
    </div>
  );
}
