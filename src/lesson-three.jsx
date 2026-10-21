import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  GRID_STORAGE,
  gridSteps,
  gridQuestions,
  gridInitial,
  readGridProgress,
  gridSources,
} from "./lesson-three-content";
import "./lesson-three.css";
const add = (values, value) => [...new Set([...values, value])];
function useGridMetrics(ref, signature) {
  const [metrics, setMetrics] = useState({
    width: 0,
    columns: [],
    rows: [],
    items: [],
  });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const css = getComputedStyle(el);
      const tracks = (value) =>
        value
          .split(" ")
          .map(parseFloat)
          .filter((n) => Number.isFinite(n) && n > 0.5)
          .map((n) => Math.round(n * 10) / 10);
      setMetrics({
        width: el.clientWidth,
        columns: tracks(css.gridTemplateColumns),
        rows: tracks(css.gridTemplateRows),
        items: [...el.children].map(
          (item) => Math.round(item.getBoundingClientRect().width * 10) / 10,
        ),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    [...el.children].forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [ref, signature]);
  return metrics;
}
function TrackLab({ data, patch }) {
  const ref = useRef(null);
  const m = useGridMetrics(
    ref,
    [
      data.columns,
      data.rowGap,
      data.columnGap,
      data.columnSpan,
      data.rowSpan,
    ].join("|"),
  );
  return (
    <>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              行列观察台 · 留白收藏夹
            </span>
            <span className="micro">同一批内容 · 真实 CSS Grid</span>
          </div>
          <div
            className="grid-playfield"
            tabIndex={0}
            role="region"
            aria-label="行列实验预览，可纵向滚动"
          >
            <div className="grid-axis-labels">
              <span>列 column · 沿横向分布 →</span>
              <span>行 row · 沿纵向分布 ↓</span>
            </div>
            <div
              ref={ref}
              data-testid="tracks-grid"
              className="tracks-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${data.columns}, minmax(0, 1fr))`,
                gridTemplateRows: "repeat(2, minmax(76px, auto))",
                gridAutoRows: "minmax(76px, auto)",
                rowGap: data.rowGap,
                columnGap: data.columnGap,
              }}
            >
              {[
                "灵感入口",
                "配色观察",
                "字形收集",
                "界面拆解",
                "交互记录",
                "验收清单",
              ].map((title, i) => (
                <article
                  className={`grid-tile tile-${i}`}
                  key={title}
                  style={
                    i === 0
                      ? {
                          gridColumn: `span ${data.columnSpan}`,
                          gridRow: `span ${data.rowSpan}`,
                        }
                      : {}
                  }
                >
                  <small>0{i + 1}</small>
                  <strong>{title}</strong>
                  {i === 0 && (
                    <span>
                      跨 {data.columnSpan} 列 × {data.rowSpan} 行
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
          <div className="flex-live-reading" role="status">
            <b data-testid="track-count">
              实测 {m.columns.length} 列 · {m.rows.length} 行
            </b>
            <span>
              row-gap {data.rowGap}px · column-gap {data.columnGap}
              px；第一张卡片跨 {data.columnSpan} 列、{data.rowSpan} 行。
            </span>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">ROWS / COLUMNS / GAP</div>
          <h3>用轨道组织内容</h3>
          <Choices
            label="列数 · grid-template-columns"
            values={[
              [1, "1 列"],
              [2, "2 列"],
              [3, "3 列"],
            ]}
            value={data.columns}
            onChange={(columns) =>
              patch({
                columns,
                columnSpan: Math.min(columns, data.columnSpan),
                columnsChanged: data.columnsChanged || columns !== data.columns,
              })
            }
          />
          <Choices
            label="row-gap · 行与行之间"
            values={[8, 16, 24].map((n) => [n, `${n}px`])}
            value={data.rowGap}
            onChange={(rowGap) =>
              patch({
                rowGap,
                gapsChanged:
                  rowGap !== data.rowGap
                    ? add(data.gapsChanged, "row")
                    : data.gapsChanged,
              })
            }
          />
          <Choices
            label="column-gap · 列与列之间"
            values={[8, 16, 24].map((n) => [n, `${n}px`])}
            value={data.columnGap}
            onChange={(columnGap) =>
              patch({
                columnGap,
                gapsChanged:
                  columnGap !== data.columnGap
                    ? add(data.gapsChanged, "column")
                    : data.gapsChanged,
              })
            }
          />
          <Choices
            label="第一张 · grid-column"
            values={[
              [1, "跨 1 列"],
              [2, "跨 2 列"],
            ]}
            value={data.columnSpan}
            onChange={(columnSpan) =>
              patch({
                columnSpan,
                columns: Math.max(data.columns, columnSpan),
                columnsChanged:
                  data.columnsChanged || columnSpan > data.columns,
                spansChanged:
                  columnSpan !== data.columnSpan
                    ? add(data.spansChanged, "column")
                    : data.spansChanged,
              })
            }
          />
          <Choices
            label="第一张 · grid-row"
            values={[
              [1, "跨 1 行"],
              [2, "跨 2 行"],
            ]}
            value={data.rowSpan}
            onChange={(rowSpan) =>
              patch({
                rowSpan,
                spansChanged:
                  rowSpan !== data.rowSpan
                    ? add(data.spansChanged, "row")
                    : data.spansChanged,
              })
            }
          />
          <p className="flex-help">
            本例先声明两行，放不下的项目会产生隐式行。为便于观察，选择跨 2
            列时会把容器至少设为 2 列；改为 1
            列时会收回跨列。视觉位置变化不会改变内容的 DOM 顺序。
          </p>
        </aside>
      </div>
      <Note title="row / column 在这里是行列轨道">
        Grid 同时约束行和列。grid-row、grid-column
        可以描述项目占据的轨道；它们与 Flex 的 flex-direction: row / column
        不是同一个控制。gap 留在轨道之间；跨多个轨道的区域也包含中间的 gap。
      </Note>
    </>
  );
}
function FractionLab({ data, patch }) {
  const ref = useRef(null);
  const template =
    data.trackMode === "fixed"
      ? `${data.sidebar}px minmax(0, 1fr)`
      : data.trackMode === "ratio"
        ? "1fr 2fr"
        : "1fr 1fr";
  const m = useGridMetrics(
    ref,
    [data.trackMode, data.trackWidth, data.sidebar].join("|"),
  );
  const free = Math.max(
    0,
    m.width - 16 - (data.trackMode === "fixed" ? data.sidebar : 0),
  );
  return (
    <>
      <div className="grid-toolbar">
        <Choices
          label="轨道方案"
          values={[
            ["equal", "1fr + 1fr"],
            ["ratio", "1fr + 2fr"],
            ["fixed", "固定侧栏 + 弹性主区"],
          ]}
          value={data.trackMode}
          onChange={(trackMode) =>
            patch({
              trackMode,
              trackModesSeen: add(data.trackModesSeen, trackMode),
            })
          }
        />
        <Choices
          label="轨道容器目标宽度"
          values={[280, 420, 620].map((n) => [n, `${n}px`])}
          value={data.trackWidth}
          onChange={(trackWidth) =>
            patch({
              trackWidth,
              widthChanged: data.widthChanged || trackWidth !== data.trackWidth,
            })
          }
        />
      </div>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              轨道分配实验台
            </span>
            <span className="micro">本例间隙固定 16px</span>
          </div>
          <div className="fraction-stage">
            <div
              className="fraction-grid"
              ref={ref}
              data-testid="fraction-grid"
              style={{
                display: "grid",
                gridTemplateColumns: template,
                gap: 16,
                width: `min(100%, ${data.trackWidth}px)`,
              }}
            >
              <section>
                <span className="track-tag">A</span>
                <strong>
                  {data.trackMode === "fixed" ? "侧栏" : "轨道一"}
                </strong>
                <p>
                  {data.trackMode === "fixed"
                    ? `固定 ${data.sidebar}px`
                    : "1fr"}
                </p>
              </section>
              <section>
                <span className="track-tag">B</span>
                <strong>
                  {data.trackMode === "fixed" ? "主内容" : "轨道二"}
                </strong>
                <p>{data.trackMode === "ratio" ? "2fr" : "1fr"}</p>
              </section>
            </div>
          </div>
          <div className="grid-metrics" role="status">
            <div>
              <small>实际容器</small>
              <b data-testid="fraction-width">{m.width}px</b>
            </div>
            {m.items.map((width, i) => (
              <div key={i}>
                <small>{i === 0 ? "A" : "B"} 实测外框</small>
                <b data-testid={`fraction-item-${i}`}>{width}px</b>
              </div>
            ))}
          </div>
          <div className="grid-rule-reading">
            <span className="eyebrow">当前候选规则</span>
            <code>{template}</code>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">FIXED / FLEXIBLE / FR</div>
          <h3>先扣除，再分配</h3>
          <Choices
            label="固定侧栏宽度"
            values={[120, 160, 200].map((n) => [n, `${n}px`])}
            value={data.sidebar}
            onChange={(sidebar) =>
              patch({
                sidebar,
                trackMode: "fixed",
                trackModesSeen: add(data.trackModesSeen, "fixed"),
              })
            }
          />
          <div className="space-formula">
            <small>本例的可分配空间</small>
            <p>
              实测 {m.width}px − 间隙 16px
              {data.trackMode === "fixed"
                ? ` − 固定轨道 ${data.sidebar}px`
                : ""}{" "}
              = <b>{free}px</b>。
            </p>
            <p>
              {data.trackMode === "fixed"
                ? "剩余空间交给唯一的弹性主区。侧栏宽度固定，并不会按相同比例缩小。"
                : data.trackMode === "ratio"
                  ? "本例没有额外的内容限制，这部分按 1:2 分配；两条轨道不各占整个容器的 1/3 与 2/3。"
                  : "本例没有额外的内容限制，两个 1fr 平分扣除间隙后的空间。"}
            </p>
          </div>
          <p className="flex-help">
            目标宽度受当前可用空间限制，手机上请看实测值。这里刻意保留两列，方便对比；产品在窄屏上常需另外切为上下排列。主区用
            minmax(0, 1fr)，文本允许换行。
          </p>
        </aside>
      </div>
      <Note title="1fr 不是“固定的一份像素”或百分比">
        fr
        表达可分配空间的份额。固定轨道、间隙和内容的最小尺寸等约束都会影响结果；裸写
        1fr 还隐含自动最小尺寸。描述“侧栏保持
        160px，主区用余下空间”，通常比只说“看起来大约一比二”更清楚。
      </Note>
    </>
  );
}
function AdaptiveLab({ data, patch }) {
  const ref = useRef(null);
  const template =
    data.cardMode === "auto"
      ? `repeat(auto-fit, minmax(min(100%, ${data.minCard}px), 1fr))`
      : "repeat(3, minmax(0, 1fr))";
  const m = useGridMetrics(
    ref,
    [
      data.cardMode,
      data.cardWidth,
      data.minCard,
      data.count,
      data.rowGap,
      data.columnGap,
      data.longContent,
    ].join("|"),
  );
  return (
    <>
      <div className="grid-toolbar">
        <Choices
          label="卡片排列规则"
          values={[
            ["fixed", "固定 3 列"],
            ["auto", "auto-fit · 自动列数"],
          ]}
          value={data.cardMode}
          onChange={(cardMode) =>
            patch({
              cardMode,
              cardModesSeen: add(data.cardModesSeen, cardMode),
            })
          }
        />
        <Choices
          label="卡片容器目标宽度"
          values={[280, 420, 620].map((n) => [n, `${n}px`])}
          value={data.cardWidth}
          onChange={(cardWidth) =>
            patch({
              cardWidth,
              cardWidthChanged:
                data.cardWidthChanged || cardWidth !== data.cardWidth,
            })
          }
        />
      </div>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              自适应收藏夹
            </span>
            <span className="micro">CSS 决定布局，JS 只读取测量结果</span>
          </div>
          <div className="adaptive-stage">
            <div
              ref={ref}
              data-testid="adaptive-grid"
              className="adaptive-grid"
              style={{
                display: "grid",
                gridTemplateColumns: template,
                width: `min(100%, ${data.cardWidth}px)`,
                rowGap: data.rowGap,
                columnGap: data.columnGap,
              }}
            >
              {Array.from({ length: data.count }, (_, i) => (
                <article className="adaptive-card" key={i}>
                  <span className={`card-art art-${i % 3}`} aria-hidden="true">
                    <Icon type={i % 2 ? "layers" : "spark"} size={24} />
                  </span>
                  <small>COLLECTION / 0{i + 1}</small>
                  <strong>
                    {i === 0 && data.longContent
                      ? "UnbreakableGridContentNeedsWrapping"
                      : "灵感收藏 " + (i + 1)}
                  </strong>
                  <p>
                    {i === 0 && data.longContent
                      ? "长内容保留完整，并允许换行。"
                      : "同一份规则，不同的内容。"}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <div className="flex-live-reading" role="status">
            <b data-testid="adaptive-count">
              实测 {m.columns.length} 列 · {m.rows.length} 行 · {data.count}{" "}
              张卡片
            </b>
            <span>
              容器实际 {m.width}px；活跃列宽{" "}
              {m.columns.map((n) => n + "px").join(" / ")}。
            </span>
          </div>
          <div className="grid-rule-reading">
            <span className="eyebrow">当前候选规则</span>
            <code>{template}</code>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">REPEAT / MINMAX / AUTO-FIT</div>
          <h3>给列一个尺寸范围</h3>
          <Choices
            label="卡片首选最小宽度"
            values={[120, 160, 200].map((n) => [n, `${n}px`])}
            value={data.minCard}
            onChange={(minCard) =>
              patch({
                minCard,
                minChanged: data.minChanged || minCard !== data.minCard,
              })
            }
          />
          <button
            className="primary"
            disabled={data.count >= 8}
            onClick={() =>
              patch((old) => ({
                count: Math.min(8, old.count + 1),
                added: true,
              }))
            }
          >
            ＋ 新增卡片{data.count >= 8 ? "（8 张上限）" : ""}
          </button>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.longContent}
              onChange={(e) => patch({ longContent: e.target.checked })}
            />
            试试第一张卡片的长内容
          </label>
          <p className="flex-help">
            repeat 简化重复轨道；minmax 给轨道上下限；auto-fit
            尽量放入能容纳的轨道，折叠空轨道。min(100%, 首选宽度)
            允许极窄容器先保持一列可读。改最小宽度在“自动列数”模式下才影响布局。
          </p>
          <p className="grid-small-note">
            所有卡片共享列轨道，最后一行不会像某些 Flex
            方案那样各自扩满。图片位是原创装饰示意，没有网络图片请求。
          </p>
        </aside>
      </div>
      <Note title="自适应是一条规则，不是一张缩小的截图">
        固定三列不会自动变成一列；自动列数取决于容器宽度、轨道最小尺寸、间隙及项目数量。普通
        minmax(160px, 1fr) 在小于 160px 的容器里仍可能溢出；min-width: 0
        与换行规则也需要配合。先描述这些边界，再让 Agent 选择实现。
      </Note>
    </>
  );
}
function GridReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第三节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本节只实现 Grid
          二维布局：列数、行列间隙、跨行跨列、固定与弹性轨道、fr、repeat /
          minmax
          和自适应卡片。布局关系与尺寸约束比截图外观更能指导技术选择。DevTools
          的 Grid 检查器可以叠加网格线并核对计算轨道。
        </p>
        <p>
          原生 Grid
          足够实现本例。实际项目可沿用现有框架；按目标浏览器检查兼容性，默认内容保持线性可读，不为简单排布引入布局脚本。自动布局不会自动解决
          DOM
          阅读顺序、键盘焦点或长文本问题。本次资料核对有日期，不承诺永远最新。
        </p>
        <div className="source-links">
          {gridSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonThree({ onStorageStatus }) {
  const [data, setData] = useState(readGridProgress),
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
      localStorage.setItem(GRID_STORAGE, JSON.stringify(data));
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
  const tasks = [
    [
      [data.columnsChanged, "改变列数，观察共享轨道"],
      [data.gapsChanged.length === 2, "分别改变 row-gap 与 column-gap"],
      [data.spansChanged.length === 2, "让第一张卡片跨行、跨列"],
    ],
    [
      [data.trackModesSeen.includes("ratio"), "观察 1fr + 2fr 的实测值"],
      [data.trackModesSeen.includes("fixed"), "观察固定侧栏与弹性主区"],
      [data.widthChanged, "改变容器宽度，再核对分配"],
    ],
    [
      [data.cardModesSeen.includes("auto"), "切换 auto-fit 自动列数"],
      [
        data.cardWidthChanged && data.minChanged,
        "分别改变容器宽度与首选最小宽度",
      ],
      [data.added, "新增卡片，观察最后一行"],
    ],
    gridQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成一份可编辑的 Grid 指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "核对布局约束、边界情况与验收标准",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = gridSteps[data.step];
  const go = (next) => {
    patch({ step: next });
    setNotice("");
    setCopyMessage("");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const finish = () => {
    if (!ready[data.step]) {
      setNotice(
        "先完成这一站的小任务，再继续。可以重试，重复操作不会重复计数。",
      );
      return;
    }
    patch((old) => ({ done: add(old.done, old.step) }));
    if (data.step < 4) go(data.step + 1);
    else if ([0, 1, 2, 3].every((n) => data.done.includes(n)))
      setNotice("第三节已完成。你已能描述行列与尺寸约束；" + nextLessonHint(2));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const draft = `请在现有项目中实现${data.brief === "gallery" ? "一个自适应卡片收藏夹" : "一个固定侧栏＋弹性主内容的工作区"}。沿用现有技术栈，优先使用原生 CSS Grid，不为简单布局引入新的 JS 布局库。\n\n布局约束：\n${data.brief === "gallery" ? `卡片共享行列轨道，DOM 按阅读顺序排列。行间隙 ${data.rowGap}px、列间隙 ${data.columnGap}px。首选最小宽度 ${data.minCard}px，随着父容器宽度改变自动调整列数。可评估 repeat(auto-fit, minmax(min(100%, ${data.minCard}px), 1fr))，说明空轨道、最后一行与窄容器的处理。` : `宽容器的侧栏保持 ${data.sidebar}px，主区使用剩余空间；候选为 ${data.sidebar}px minmax(0, 1fr)，列间隙 ${data.columnGap}px。父容器太窄时应切换为上下排列，并说明触发条件和降级。不要把侧栏按比例缩到不可读。`}\n\n尺寸原则：fr 是可分配空间的份额，需考虑固定轨道、间隙、最小尺寸与内容约束，不直接当作容器百分比。对可收缩的项目按需设置 min-width: 0，允许长文本换行；图片不超过容器宽度。不凭截图宣称原站的真实技术栈。\n\n验收：\n1. 检查 375px 手机与 1440px 桌面视口，以及 280px、420px、620px 父容器。核对实际可用宽度，内容完整可读，无页面横向溢出。\n2. 用 DevTools Grid 检查器核对列轨道、行列间隙和计算尺寸；固定侧栏保持声明宽度，弹性轨道只分配可用空间。\n3. 检查 1、4、8 张卡片与最后一行；若需要跨行跨列，明确 grid-row / grid-column，保留合理 DOM 阅读顺序和键盘顺序。\n${data.includeEdges ? "4. 测试不易断开的长单词、空描述、图片缺失、按钮文案变长；连续操作不产生重复副作用。" : "4. 保留可访问名称、合理的 DOM 顺序与清晰的键盘焦点，验证窄容器下可用。"}\n5. 键盘可到达全部操作，焦点可见；在目标浏览器说明兼容性与默认线性布局降级，不用隐藏重要内容来掩盖溢出。\n\n选择理由：若内容只需沿一条轴分配空间，也可以考虑 Flex；卡片内部的图标、标题、描述和按钮可使用 Flex。先说清外层共享轨道与内部排列约束，再决定组合。\n\n请先说明布局与尺寸方案，然后实现并按以上标准自测，提交测试结果。`;
    patch({ draft, generated: true, reviewed: false });
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
      localStorage.removeItem(GRID_STORAGE);
    } catch {}
    setData(gridInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第三节的进度、实验参数与草稿；前两节的进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-three">
      <div className="lesson-overline">
        <span className="pill">第三节 · Grid</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Grid——二维布局<span className="title-period">.</span>
          </h1>
          <p>把“排得一样”，变成共享轨道和清晰约束。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="tree" size={32} />
          <span>
            LESSON
            <br />
            <b>03</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 看懂行列与间隙
        </span>
        <span>
          <Icon type="check" size={16} /> 判断轨道怎样分配
        </span>
        <span>
          <Icon type="check" size={16} /> 说清自适应规则
        </span>
      </div>
      <nav className="stepper" aria-label="第三节学习步骤">
        {gridSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="grid-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            GRID LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="grid-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <TrackLab data={data} patch={patch} />}
        {data.step === 1 && <FractionLab data={data} patch={patch} />}
        {data.step === 2 && <AdaptiveLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {gridQuestions.map((q, i) => {
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
              <h3>你的网格简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="gallery">自适应卡片收藏夹</option>
                  <option value="sidebar">固定侧栏＋弹性主内容</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入长内容与异常资产验收
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成网格草稿" : "生成 Grid 指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿只保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的 Grid 指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制 Grid 指令
                </button>
              </div>
              <label className="sr-only" htmlFor="grid-agent-draft">
                可编辑的 Grid Agent 指令
              </label>
              <textarea
                id="grid-agent-draft"
                ref={draftRef}
                value={data.draft}
                maxLength={8000}
                onChange={(e) => {
                  patch({ draft: e.target.value, reviewed: false });
                  setCopyMessage("");
                }}
                placeholder="生成草稿后，补充你自己的布局约束和验收要求。"
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
                我已检查行列约束、尺寸边界和验收标准。
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
                  ? "完成第三节"
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
          重置第三节进度
        </button>
      </div>
      <GridReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="grid-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="grid-reset-title">重新开始第三节？</h2>
        <p>仅清除第三节的进度、实验参数和指令草稿，前两节进度会保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第三节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第三节
          </button>
        </div>
      </dialog>
    </div>
  );
}
