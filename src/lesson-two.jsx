import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  LAYOUT_STORAGE,
  layoutInitial,
  readLayoutProgress,
  layoutSteps,
  layoutQuestions,
  layoutSources,
} from "./lesson-two-content";
import "./lesson-two.css";

const unique = (values, value) => [...new Set([...values, value])];
export function Choices({ label, values, value, onChange }) {
  return (
    <fieldset className="flex-choices">
      <legend>{label}</legend>
      <div>
        {values.map((option) => {
          const [v, text] = Array.isArray(option)
            ? option
            : [option, `${option}`];
          return (
            <button
              key={v}
              type="button"
              aria-pressed={value === v}
              onClick={() => onChange(v)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
function Direction({ data, patch }) {
  return (
    <Choices
      label="flex-direction · 主轴方向"
      values={[
        ["row", "row · 横向"],
        ["column", "column · 纵向"],
      ]}
      value={data.direction}
      onChange={(direction) =>
        patch((old) => ({
          direction,
          directionsSeen: unique(old.directionsSeen, direction),
        }))
      }
    />
  );
}
function AxisFrame({ direction, children }) {
  return (
    <div className={`flex-canvas axis-${direction}`}>
      <div className="axis-line main-axis" aria-hidden="true">
        <span>主轴 →</span>
      </div>
      <div className="axis-line cross-axis" aria-hidden="true">
        <span>交叉轴 →</span>
      </div>
      {children}
    </div>
  );
}
export function Note({ title, children }) {
  return (
    <div className="insight flex-note">
      <span className="insight-icon">
        <Icon />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
function DirectionLab({ data, patch }) {
  return (
    <>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              排列观察台
            </span>
            <span className="micro">真实 CSS Flexbox · 水平书写模式</span>
          </div>
          <AxisFrame direction={data.direction}>
            <div
              className={`direction-demo example-${data.example}`}
              data-testid="direction-demo"
              style={{
                display: "flex",
                flexDirection: data.direction,
                gap: data.gap,
              }}
            >
              {data.example === "buttons" ? (
                ["保存草稿", "预览效果", "发布页面"].map((text, i) => (
                  <span className={`demo-action action-${i}`} key={text}>
                    <small>0{i + 1}</small>
                    {text}
                  </span>
                ))
              ) : (
                <>
                  <span className="card-symbol">
                    <Icon type="spark" size={27} />
                  </span>
                  <strong>一页灵感</strong>
                  <p>把图标、标题、描述和行动入口，按内容顺序组成一张卡片。</p>
                  <span className="demo-action">查看灵感 ↗</span>
                </>
              )}
            </div>
          </AxisFrame>
          <div className="flex-live-reading" role="status">
            <b>
              {data.direction === "row"
                ? "主轴横向 → · 交叉轴纵向 ↓"
                : "主轴纵向 ↓ · 交叉轴横向 →"}
            </b>
            <span>相邻项目的 gap：{data.gap}px。内容顺序保持不变。</span>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">DIRECTION / GAP</div>
          <h3>给排列定一个方向</h3>
          <Direction data={data} patch={patch} />
          <Choices
            label="gap · 相邻项目间距"
            values={[8, 16, 24].map((x) => [x, `${x}px`])}
            value={data.gap}
            onChange={(gap) =>
              patch({ gap, gapChanged: data.gapChanged || gap !== data.gap })
            }
          />
          <Choices
            label="观察例子"
            values={[
              ["buttons", "横排按钮组"],
              ["card", "图标与内容卡片"],
            ]}
            value={data.example}
            onChange={(example) =>
              patch({ example, cardSeen: data.cardSeen || example === "card" })
            }
          />
          <p className="flex-help">
            试试卡片＋column：纵向也属于一维排列。gap
            控制项目之间的间隔，不会自动增加容器四周的留白。
          </p>
        </aside>
      </div>
      <Note title="先选方向，再谈“水平 / 垂直居中”">
        本节使用从左到右的水平书写模式。row 的主轴沿行方向，column
        的主轴沿块方向；方向切换后，两条轴的作用也切换。Flex
        可以换行，但每一行独立布局；本节先观察不换行的单条轴，Grid 留在第三节。
      </Note>
    </>
  );
}
function AlignmentLab({ data, patch }) {
  return (
    <>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              头像＋用户名＋设置
            </span>
            <span className="micro">外层两个项目 · 用户组内部再用 Flex</span>
          </div>
          <AxisFrame direction={data.direction}>
            <div
              className="alignment-demo"
              data-testid="alignment-demo"
              style={{
                display: "flex",
                flexDirection: data.direction,
                gap: data.gap,
                justifyContent: data.justify,
                alignItems: data.align,
              }}
            >
              <div className="profile-group">
                <span className="profile-avatar">白</span>
                <div>
                  <strong>留白工作室</strong>
                  <small>把想法变成页面</small>
                </div>
              </div>
              <span className="profile-settings">⚙ 设置</span>
            </div>
          </AxisFrame>
          <div className="flex-live-reading" role="status">
            <b>
              主轴：{data.justify} · 交叉轴：{data.align}
            </b>
            <span>
              {data.direction === "row"
                ? "此时 justify-content 影响左右，align-items 影响上下。"
                : "此时 justify-content 影响上下，align-items 影响左右。"}
            </span>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">JUSTIFY / ALIGN</div>
          <h3>两条轴，分别控制</h3>
          <Direction data={data} patch={patch} />
          <label>
            justify-content · 主轴空间分配
            <select
              value={data.justify}
              onChange={(e) =>
                patch({ justify: e.target.value, justifyChanged: true })
              }
            >
              <option value="flex-start">flex-start · 起点</option>
              <option value="center">center · 居中</option>
              <option value="space-between">space-between · 两端</option>
            </select>
          </label>
          <label>
            align-items · 交叉轴对齐
            <select
              value={data.align}
              onChange={(e) =>
                patch({ align: e.target.value, alignChanged: true })
              }
            >
              <option value="flex-start">flex-start · 起点</option>
              <option value="center">center · 居中</option>
              <option value="flex-end">flex-end · 终点</option>
              <option value="stretch">stretch · 拉伸</option>
            </select>
          </label>
          <button
            className="flex-preset"
            onClick={() =>
              patch({
                direction: "row",
                directionsSeen: unique(data.directionsSeen, "row"),
                justify: "space-between",
                align: "center",
                justifyChanged: true,
                alignChanged: true,
              })
            }
          >
            试试：用户名靠左，设置靠右 ↗
          </button>
          <p className="flex-help">
            为什么把头像和名字分成一组？否则 space-between
            会把它们也分开。容器需有可分配的空间；项目已经占满时，justify-content
            的差别可能不明显。
          </p>
        </aside>
      </div>
      <Note title="同一句“居中”，可能是两个需求">
        先说明主轴方向，再说沿哪条轴对齐。stretch 只在项目的相关交叉尺寸为 auto
        等条件下生效，不会覆盖所有显式尺寸。本例内部头像固定大小，外层项目仍可拉伸。
      </Note>
    </>
  );
}
function SpaceLab({ data, patch }) {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const [measured, setMeasured] = useState({
    width: 0,
    items: [],
    overflow: false,
  });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setMeasured({
        width: Math.round(el.clientWidth * 10) / 10,
        items: itemRefs.current.map(
          (n) => Math.round(n.getBoundingClientRect().width * 10) / 10,
        ),
        overflow: el.scrollWidth > el.clientWidth + 1,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    itemRefs.current.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [
    data.spaceMode,
    data.width,
    data.grow,
    data.shrink,
    data.longContent,
    data.minFix,
  ]);
  const isGrow = data.spaceMode === "grow";
  const basis = isGrow ? 80 : 160;
  const baseTotal = 3 * basis + 24;
  const free = Math.round((measured.width - baseTotal) * 10) / 10;
  return (
    <>
      <div className="space-toolbar">
        <Choices
          label="实验模式 · 固定 row，不换行"
          values={[
            ["grow", "grow · 分配多余空间"],
            ["shrink", "shrink · 分担不足空间"],
          ]}
          value={data.spaceMode}
          onChange={(spaceMode) =>
            patch((old) => ({
              spaceMode,
              spaceModesSeen: unique(old.spaceModesSeen, spaceMode),
            }))
          }
        />
        <Choices
          label="容器目标宽度"
          values={[280, 420, 560].map((x) => [x, `${x}px`])}
          value={data.width}
          onChange={(width) =>
            patch({
              width,
              widthChanged: data.widthChanged || width !== data.width,
            })
          }
        />
      </div>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              空间分配实验台
            </span>
            <span className="micro">A / B / C · 只调中间项目 B 的系数</span>
          </div>
          <div className="space-stage">
            <div
              className="space-scroller"
              role="region"
              aria-label="空间实验预览，可横向滚动查看故意制造的溢出"
              tabIndex={0}
            >
              <div
                className={`space-demo ${data.minFix ? "min-fixed" : ""}`}
                ref={containerRef}
                data-testid="space-demo"
                style={{ width: `min(100%, ${data.width}px)` }}
              >
                {["A", "B", "C"].map((letter, i) => (
                  <div
                    key={letter}
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    className={`space-item space-${letter}`}
                    style={{
                      flexBasis: basis,
                      flexGrow: isGrow ? (i === 1 ? data.grow : 1) : 0,
                      flexShrink: isGrow ? 1 : i === 1 ? data.shrink : 1,
                      minWidth:
                        i === 1 && data.longContent && !data.minFix
                          ? "auto"
                          : 0,
                    }}
                  >
                    <strong>{letter}</strong>
                    <span>
                      {i === 1 && data.longContent
                        ? "UnbreakableFrontendLayoutNeedsMinimumSizeCheck"
                        : letter === "A"
                          ? "导航"
                          : letter === "B"
                            ? "内容"
                            : "操作"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-measurements" role="status">
            <div>
              <small>浏览器实测容器</small>
              <b data-testid="container-measure">{measured.width}px</b>
            </div>
            {measured.items.map((w, i) => (
              <div key={i}>
                <small>{["A", "B", "C"][i]} 最终外框宽</small>
                <b data-testid={`item-measure-${i}`}>{w}px</b>
              </div>
            ))}
          </div>
          <div
            className={`overflow-feedback ${measured.overflow ? "has-overflow" : ""}`}
            role="status"
          >
            {measured.overflow
              ? "发现横向溢出：自动最小尺寸或不收缩的项目正在限制布局。打开“允许 B 继续变窄并换行”再观察。"
              : "当前预览无横向溢出。继续切换容器宽度，核对内容是否仍可读。"}
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">{isGrow ? "FLEX-GROW" : "FLEX-SHRINK"}</div>
          <h3>{isGrow ? "分的是多出来的空间" : "收缩也有底线"}</h3>
          <Choices
            label={isGrow ? "B 的 grow 系数" : "B 的 shrink 系数"}
            values={[0, 1, 2]}
            value={isGrow ? data.grow : data.shrink}
            onChange={(value) =>
              patch(
                isGrow
                  ? {
                      grow: value,
                      growChanged: data.growChanged || value !== data.grow,
                    }
                  : {
                      shrink: value,
                      shrinkChanged:
                        data.shrinkChanged || value !== data.shrink,
                    },
              )
            }
          />
          <div className="space-formula">
            <small>本例的共同条件</small>
            <p>三个项目的基础外框各 {basis}px，间隙共 24px。</p>
            <p>
              容器实测 {measured.width}px，基础总占用 {baseTotal}px，差额{" "}
              <b>{free}px</b>。
            </p>
            <p>
              {isGrow
                ? "正差额按 grow 比例分配；若容器太窄出现负差额，此模式的 shrink=1 仍会参与。"
                : "负差额按 shrink × 基础尺寸分担；如果选择 560px 而出现正差额，本模式 grow=0，空间会保留。"}
            </p>
          </div>
          {!isGrow && (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.longContent}
                  onChange={(e) =>
                    patch({
                      longContent: e.target.checked,
                      constraintSeen:
                        data.constraintSeen ||
                        (e.target.checked && !data.minFix),
                    })
                  }
                />
                给 B 换上不易断开的长内容
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.minFix}
                  onChange={(e) =>
                    patch({
                      minFix: e.target.checked,
                      constraintFixed:
                        data.constraintFixed ||
                        (e.target.checked &&
                          data.longContent &&
                          data.constraintSeen),
                    })
                  }
                />
                允许 B 继续变窄并换行
              </label>
            </>
          )}
          <p className="flex-help">
            目标宽度受当前可用空间限制，手机上请看实测值。所有数值来自真实布局；外框含内边距和边框。这里故意把溢出留在可滚动实验区，方便观察原因。
          </p>
        </aside>
      </div>
      <Note title="把系数、基础尺寸和约束一起交代">
        grow 不等于最终宽度比例；shrink
        也不是把最终宽度直接按系数平分。默认自动最小尺寸可能受内容限制。修复开关对
        B 使用 min-width: 0 与 overflow-wrap:
        anywhere，允许内容换行；它不是隐藏信息。
      </Note>
    </>
  );
}
function Mapping() {
  return (
    <details className="roadmap-details flex-mapping">
      <summary>
        <span>在 Figma 中怎么表达？</span>
        <span className="micro">Auto Layout 的近似映射 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          可以用 Auto Layout 的水平 /
          垂直方向、间距与对齐来沟通本节的排列关系。Fill container
          能表达“占用可用空间”的意图；Hug contents 能表达“随内容尺寸”的意图。
        </p>
        <p>
          这是帮助协作的概念映射，不是 CSS 的一一翻译。Auto Layout
          的尺寸规则、嵌套和最小 / 最大约束，需要在浏览器中结合
          flex-basis、grow、shrink、min/max 尺寸重新验证；不要把 Fill
          直接等同于某个唯一的 flex 数值。
        </p>
      </div>
    </details>
  );
}
function LayoutSources() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二节主题与官方参考</span>
        <span className="micro">2026-10-20 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本节按“方向 → gap → 主轴对齐 → 交叉轴对齐 → grow → shrink”学习 Flex
          一维排列。Grid 在第三节独立学习。原生 CSS
          足以完成这些排列；实际项目可以沿用框架中的布局组件，先看它的约束和生成结果，不凭截图断言技术栈。
        </p>
        <p>
          使用 DevTools 的 Flex
          布局检查器核对轴线、计算尺寸和溢出。兼容性应按目标浏览器核验；基础布局保持可读，避免不必要的布局脚本和依赖。本页不承诺资料永远最新。
        </p>
        <div className="source-links">
          {layoutSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwo({ onStorageStatus }) {
  const [data, setData] = useState(readLayoutProgress);
  const [notice, setNotice] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const headingRef = useRef(null);
  const draftRef = useRef(null);
  const dialogRef = useRef(null);
  const resetRef = useRef(null);
  const generation = useRef(0);
  const copyBusy = useRef(false);
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE, JSON.stringify(data));
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
      [data.directionsSeen.includes("column"), "切换 column，观察主轴转向"],
      [data.gapChanged, "改变 gap，观察相邻项目间距"],
      [data.cardSeen, "观察图标、标题、描述与入口组成的卡片"],
    ],
    [
      [data.justifyChanged, "改变 justify-content，观察主轴分配"],
      [data.alignChanged, "改变 align-items，观察交叉轴对齐"],
    ],
    [
      [data.growChanged, "改变 B 的 grow 系数"],
      [data.shrinkChanged, "切换 shrink，改变 B 的系数"],
      [data.widthChanged, "调窄容器并读实测宽度"],
      [
        data.constraintSeen && data.constraintFixed,
        "观察长内容限制，再允许 B 变窄换行",
      ],
    ],
    layoutQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成并编辑可执行的布局指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查方向、尺寸约束与验收标准",
      ],
    ],
  ];
  const ready = tasks.map((t) => t.every(([ok]) => ok));
  const step = layoutSteps[data.step];
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
    patch((old) => ({ done: unique(old.done, old.step) }));
    if (data.step < 4) go(data.step + 1);
    else if ([0, 1, 2, 3].every((n) => data.done.includes(n)))
      setNotice(
        "第二节已完成。你已能描述 Flex 的方向、对齐与空间分配；" +
          nextLessonHint(1),
      );
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const draft = `请在现有项目中实现${data.brief === "profile" ? "一个“头像＋用户名＋右侧设置按钮”的用户栏" : "一张“图标、标题、描述、按钮”的纵向内容卡片"}。沿用现有技术栈，优先使用原生 CSS Flexbox，不为基础排列引入新库。\n\n结构与规则：\n${data.brief === "profile" ? "外层 row，把头像和用户名组成一组，再与设置按钮并列；justify-content: space-between，align-items: center。用户组内部也是 row，间距 12px；外层最小间距 " + data.gap + "px。头像保持固定尺寸；用户名区域可伸缩，设置按钮不被挤到不可用。" : "外层 column，按图标、标题、描述、按钮的阅读顺序排列，gap 为 " + data.gap + "px；交叉轴起点对齐。若多张卡片等高且要求按钮靠底，请说明如何为描述分配剩余空间；不要改变 DOM 阅读顺序。"}\n\n尺寸行为：明确每个项目的 flex-basis、grow、shrink 与 min/max 约束。grow 分配正的剩余空间，不代表最终宽度比例；shrink 还受基础尺寸和最小尺寸限制。按需对可收缩文本区域使用 min-width: 0 并允许长内容换行，不隐藏重要内容。\n\n验收：\n1. 分别在 375px 手机和 1440px 桌面视口，以及 280px、420px 的父容器中检查。可用空间变化时内容保持可读，无页面横向溢出。\n2. 明确主轴与交叉轴。方向改变时重新核对 justify-content / align-items 的效果，不把它们固定叫成水平 / 垂直居中。\n3. 初始 gap 为 ${data.gap}px，核对项目间距与容器内边距；保留合理的 DOM 阅读顺序和键盘顺序。\n${data.includeEdges ? "4. 测试空标题、长用户名与不易断开的长单词、按钮文案变长；连续点击不产生重复副作用。交互按钮有可访问名称，键盘焦点清晰，触控区可操作。" : "4. 对所有操作提供可访问名称与可见键盘焦点，验证窄容器仍可操作。"}\n5. 在目标浏览器用 DevTools Flex 检查器记录计算尺寸与约束，说明兼容性、降级和测试结果；避免不必要的 JS 测量循环或布局依赖。\n\n设计协作：可参考 Figma Auto Layout 的方向、间距、对齐和尺寸意图；这是近似映射，不把 Fill / Hug 机械翻译成唯一 CSS 值。截图不能证明真实技术。\n\n请先说明结构与尺寸方案，再实现并按上述标准自测。`;
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
      localStorage.removeItem(LAYOUT_STORAGE);
    } catch {}
    setData(layoutInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二节的本地进度、参数和草稿。第一节的进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two">
      <div className="lesson-overline">
        <span className="pill">第二节 · Flex</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Flex——一维排列<span className="title-period">.</span>
          </h1>
          <p>不是挪动每个元素，而是给它们一套排列规则。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>02</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 看清主轴与交叉轴
        </span>
        <span>
          <Icon type="check" size={16} /> 判断空间怎样分配
        </span>
        <span>
          <Icon type="check" size={16} /> 说清尺寸与验收
        </span>
      </div>
      <nav className="stepper" aria-label="第二节学习步骤">
        {layoutSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="flex-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            FLEX LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="flex-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <DirectionLab data={data} patch={patch} />}
        {data.step === 1 && <AlignmentLab data={data} patch={patch} />}
        {data.step === 2 && <SpaceLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {layoutQuestions.map((q, i) => {
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
              <h3>你的排列简报</h3>
              <p>由本地规则生成，可自由编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现例子
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="profile">头像＋用户名＋右侧设置</option>
                  <option value="card">图标＋标题＋描述＋按钮卡片</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入长内容与连续点击验收
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成布局草稿" : "生成布局指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿只保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的布局指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制布局指令
                </button>
              </div>
              <label className="sr-only" htmlFor="flex-agent-draft">
                可编辑的 Flex Agent 指令
              </label>
              <textarea
                id="flex-agent-draft"
                ref={draftRef}
                value={data.draft}
                maxLength={8000}
                onChange={(e) => {
                  patch({ draft: e.target.value, reviewed: false });
                  setCopyMessage("");
                }}
                placeholder="先生成布局草稿，再补充你自己的行为和验收要求。"
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
                我已检查主轴、交叉轴、尺寸约束和验收方式。
              </label>
            </div>
          </div>
        )}
        <div className="task-footer">
          <div>
            <strong>这一站的小任务</strong>
            <ul>
              {tasks[data.step].map(([ok, text]) => (
                <li className={ok ? "done" : ""} key={text}>
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
                  ? "完成第二节"
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
          重置第二节进度
        </button>
      </div>
      <Mapping />
      <LayoutSources />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="flex-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="flex-reset-title">重新开始第二节？</h2>
        <p>仅清除第二节的进度、实验参数和指令草稿；第一节的进度会保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第二节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第二节
          </button>
        </div>
      </dialog>
    </div>
  );
}
