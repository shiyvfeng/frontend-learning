import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  SIZING_STORAGE,
  sizingSteps,
  sizingQuestions,
  sizingSources,
  sizingInitial,
  readSizingProgress,
  longSizingTitle,
  shortSizingTitle,
} from "./lesson-five-content";
import "./lesson-five.css";
const add = (a, v) => [...new Set([...a, v])];
function useMeasure(ref, dependencies, read) {
  const [measurement, setMeasurement] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setMeasurement(read(el));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of el.querySelectorAll("[data-measure]"))
      observer.observe(child);
    return () => observer.disconnect();
  }, dependencies);
  return measurement;
}
function SizeLab({ data, patch }) {
  const ref = useRef(null);
  const m = useMeasure(
    ref,
    [
      data.sizeWidth,
      data.preferred,
      data.minWidth,
      data.maxWidth,
      data.box,
      data.padding,
    ],
    (el) => {
      const c = el.querySelector(".sizing-card");
      return {
        available: el.clientWidth,
        outer: Math.round(c.getBoundingClientRect().width),
        content: Math.round(c.clientWidth - 2 * data.padding),
      };
    },
  );
  return (
    <>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              尺寸约束观察台
            </span>
            <span className="micro">浏览器实测</span>
          </div>
          <div className="sizing-workbench">
            <p className="sizing-fault-label">
              教学故障区：尺寸超出时只撑开这个实验区的可滚动内容。可横向滚动查看，课程正文不随它变宽。
            </p>
            <div
              className="sizing-safe-scroll"
              role="region"
              aria-label="尺寸故障实验区，可横向滚动"
              tabIndex={0}
              data-intentional-overflow="sizing"
            >
              <div
                ref={ref}
                className="sizing-frame"
                style={{ width: data.sizeWidth }}
                data-testid="size-frame"
              >
                <article
                  className="sizing-card"
                  data-measure
                  data-testid="size-card"
                  style={{
                    width: data.preferred,
                    minWidth: data.minWidth,
                    maxWidth: data.maxWidth,
                    boxSizing: data.box,
                    padding: data.padding,
                  }}
                >
                  <h3>一份尺寸合同</h3>
                  <p>
                    正文在这里自然换行。声明宽度不等于总能放进父容器，还要核对最小值、最大值、padding
                    和 border。
                  </p>
                </article>
              </div>
            </div>
          </div>
          <div className="sizing-reading" role="status">
            <span>
              容器内容宽
              <b data-testid="size-available">{m?.available ?? "—"}px</b>
            </span>
            <span>
              卡片边框盒<b data-testid="size-outer">{m?.outer ?? "—"}px</b>
            </span>
            <span>
              卡片内容区<b>{m?.content ?? "—"}px</b>
            </span>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">SIZE / MIN / MAX / BOX</div>
          <h3>宽度是多条规则一起决定的</h3>
          <Choices
            label="尺寸容器"
            values={[
              [420, "420px · 较宽"],
              [240, "240px · 较窄"],
            ]}
            value={data.sizeWidth}
            onChange={(sizeWidth) =>
              patch({
                sizeWidth,
                sizeNarrowed: data.sizeNarrowed || sizeWidth === 240,
              })
            }
          />
          <Choices
            label="声明 width"
            values={[
              [180, "180px"],
              [240, "240px"],
              [280, "280px"],
            ]}
            value={data.preferred}
            onChange={(preferred) => patch({ preferred })}
          />
          <Choices
            label="min-width"
            values={[
              [0, "0"],
              [320, "320px"],
            ]}
            value={data.minWidth}
            onChange={(minWidth) =>
              patch({ minWidth, minTested: data.minTested || minWidth === 320 })
            }
          />
          <Choices
            label="max-width"
            values={[
              ["none", "none"],
              ["100%", "100%"],
            ]}
            value={data.maxWidth}
            onChange={(maxWidth) =>
              patch({
                maxWidth,
                maxTested: data.maxTested || maxWidth === "100%",
              })
            }
          />
          <Choices
            label="box-sizing"
            values={[
              ["border-box", "border-box"],
              ["content-box", "content-box"],
            ]}
            value={data.box}
            onChange={(box) =>
              patch({ box, boxesSeen: add(data.boxesSeen, box) })
            }
          />
          <Choices
            label="每侧 padding"
            values={[
              [16, "16px"],
              [32, "32px"],
            ]}
            value={data.padding}
            onChange={(padding) => patch({ padding })}
          />
        </aside>
      </div>
      <Note title="最小值也可能阻止收缩；border-box 有边界">
        当 min-width 大于 max-width 时，最小值优先；窄容器里即使写 max-width:
        100%，320px 的最小宽度仍可能装不下。border-box 通常把 padding 和 border
        算进声明宽度，不包含 margin，也不保证内容不溢出；padding 与 border
        本身不能被压成负数。content-box
        的声明宽度只指内容区。这里改的是约束，不是用脚本替代布局。
      </Note>
    </>
  );
}
function TextLab({ data, patch }) {
  const ref = useRef(null),
    title = data.longText ? longSizingTitle : shortSizingTitle;
  const m = useMeasure(
    ref,
    [data.textWidth, data.longText, data.minZero, data.policy],
    (el) => {
      const main = el.querySelector(".sizing-text-main"),
        text = el.querySelector(".sizing-text-title");
      return {
        row: el.clientWidth,
        main: Math.round(main.getBoundingClientRect().width),
        client: text.clientWidth,
        scroll: text.scrollWidth,
      };
    },
  );
  return (
    <>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              同一标题，五种处理
            </span>
            <span className="micro">真实 Flex 项与长文本</span>
          </div>
          <div className="sizing-workbench">
            <p className="sizing-fault-label">
              教学故障区：故意让长标题撑开或溢出。外层横向滚动是实验保护边界，不代表产品已经修好。
            </p>
            <div
              className="sizing-safe-scroll"
              role="region"
              aria-label="长文本故障实验区，可横向滚动"
              tabIndex={0}
              data-intentional-overflow="text"
            >
              <div
                ref={ref}
                className="sizing-frame sizing-text-row"
                style={{ width: data.textWidth }}
                data-testid="text-row"
              >
                <div className="sizing-avatar" aria-hidden="true">
                  文
                </div>
                <div
                  className="sizing-text-main"
                  data-measure
                  data-testid="text-main"
                  style={{ minWidth: data.minZero ? 0 : "auto" }}
                >
                  <p
                    className={`sizing-text-title policy-${data.policy}`}
                    data-measure
                    data-testid="overflow-title"
                    tabIndex={data.policy === "scroll" ? 0 : undefined}
                    role={data.policy === "scroll" ? "region" : undefined}
                    aria-label={
                      data.policy === "scroll"
                        ? "可横向滚动的完整标题"
                        : undefined
                    }
                    data-intentional-overflow={
                      ["clip", "ellipsis"].includes(data.policy)
                        ? "title"
                        : undefined
                    }
                  >
                    {title}
                  </p>
                  <p className="sizing-text-caption">
                    {data.minZero
                      ? "min-width: 0 · 允许收缩"
                      : "min-width: auto · 内容可能托住项目"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="sizing-reading" role="status">
            <span>
              整行内容宽<b>{m?.row ?? "—"}px</b>
            </span>
            <span>
              主项目边框盒
              <b data-testid="text-main-width">{m?.main ?? "—"}px</b>
            </span>
            <span>
              标题可见 / 内容宽
              <b data-testid="text-widths">
                {m?.client ?? "—"} / {m?.scroll ?? "—"}
              </b>
            </span>
          </div>
          <div className="sizing-full-access">
            <button
              aria-expanded={data.fullOpen}
              aria-controls="sizing-full-title"
              onClick={() =>
                patch({ fullOpen: !data.fullOpen, fullRead: true })
              }
            >
              {data.fullOpen ? "收起完整标题" : "查看完整标题"}
            </button>
            <p
              id="sizing-full-title"
              className="sizing-full-title"
              hidden={!data.fullOpen}
            >
              {title}
            </p>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">SHRINK / OVERFLOW / ACCESS</div>
          <h3>先让盒子缩，再决定内容怎么办</h3>
          <Choices
            label="文本容器"
            values={[
              [420, "420px · 较宽"],
              [240, "240px · 较窄"],
            ]}
            value={data.textWidth}
            onChange={(textWidth) =>
              patch({
                textWidth,
                textNarrowed: data.textNarrowed || textWidth === 240,
              })
            }
          />
          <Choices
            label="标题长度"
            values={[
              [false, "短标题"],
              [true, "超长标题"],
            ]}
            value={data.longText}
            onChange={(longText) =>
              patch({ longText, longTested: data.longTested || longText })
            }
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.minZero}
              onChange={(e) =>
                patch({
                  minZero: e.target.checked,
                  minZeroTested: data.minZeroTested || e.target.checked,
                })
              }
            />
            允许主项目收缩 · min-width: 0
          </label>
          <Choices
            label="标题溢出策略"
            values={[
              ["visible", "visible · 溢出可见"],
              ["scroll", "auto · 内部滚动"],
              ["clip", "clip · 裁切"],
              ["ellipsis", "ellipsis · 省略"],
              ["wrap", "wrap · 换行"],
            ]}
            value={data.policy}
            onChange={(policy) =>
              patch({ policy, policiesSeen: add(data.policiesSeen, policy) })
            }
          />
          <p className="flex-help">
            当前策略只作用于标题；按钮留在可见区域。裁切或省略不是丢掉信息，请使用「查看完整标题」。auto
            模式还可触摸横滑，或聚焦标题后用左右方向键滚动。
          </p>
        </aside>
      </div>
      <Note title="min-width: 0 不是换行命令">
        某些 Flex / Grid
        项的自动最小尺寸与内容有关。这里显式解除主项目的宽度下限，才能在头像旁缩小；内容仍需另选策略。ellipsis
        还要有受限宽度、单行与 overflow 配合；clip
        不提供滚动入口，本例另有全文入口。换行使用 overflow-wrap:
        anywhere，不会隐藏内容。不要把给全站加 overflow: hidden 当作修复。
      </Note>
    </>
  );
}
export function sizingDocument(data) {
  const internal = data.scrollMode === "internal";
  return `<!doctype html><html lang="zh-CN"><head><title>消息尺寸与滚动归属实验</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;height:100%;font:13px/1.6 system-ui;color:#49365f}body{overflow:auto}.shell{display:flex;flex-direction:column;${internal ? "height:100%" : "min-height:100%"}}header,footer{flex:none;padding:12px 16px;background:#eee8f7;border-bottom:1px solid #d7cbe6}header{height:46px}footer{height:48px;border-top:1px solid #d7cbe6}main{flex:1 1 auto;min-height:${internal && data.heightZero ? "0" : "auto"}}.messages{${internal ? "height:100%;overflow:auto" : "overflow:visible"};padding:12px;background:#faf9fd}.message{min-height:84px;padding:12px;margin:0 0 10px;background:white;border:1px solid #ddd3e9;border-radius:8px;overflow-wrap:anywhere}.message p{margin:5px 0 0;font-size:12px}.message:last-child{margin-bottom:0}:focus-visible{outline:3px solid #6050b8;outline-offset:-3px}</style></head><body data-scroll-mode="${data.scrollMode}" data-min-zero="${internal && data.heightZero}"><div class="shell"><header>留白消息 · ${internal ? "内部滚动实验" : "整页滚动实验"}</header><main data-slot><div class="messages" data-messages ${internal ? 'tabindex="0" role="region" aria-label="可滚动消息列表"' : ""}>${Array.from({ length: data.count }, (_, i) => `<article class="message" data-message><strong>消息 ${i + 1}${i === data.count - 1 ? " · 最后一条" : ""}</strong><p>${i % 2 ? "请保留重要信息和操作的访问路径，不要用裁切让它们消失。" : "这是原创教学消息。内容增加时，观察谁获得滚动条，以及标题与输入区留在哪里。"}</p></article>`).join("")}</div></main><footer>输入区 · 本实验只演示布局</footer></div></body></html>`;
}
function ScrollLab({ data, patch }) {
  const frame = useRef(null),
    [m, setM] = useState(null),
    [ready, setReady] = useState(false),
    [frameActive, setFrameActive] = useState(false),
    cleanup = useRef(() => {}),
    recordedEnds = useRef(new Set(data.endsSeen));
  const measure = () => {
    const doc = frame.current?.contentDocument,
      w = frame.current?.contentWindow;
    if (!doc?.querySelector("[data-messages]")) return;
    const list = doc.querySelector("[data-messages]"),
      slot = doc.querySelector("[data-slot]"),
      last = doc.querySelector(".message:last-child"),
      r = last.getBoundingClientRect(),
      lr = list.getBoundingClientRect();
    const lastVisible =
      r.bottom <= Math.min(w.innerHeight, lr.bottom) + 1 &&
      r.top >= Math.max(0, lr.top) - 1;
    const mode = doc.body.dataset.scrollMode;
    if (
      lastVisible &&
      doc.querySelectorAll("[data-message]").length >= 6 &&
      (mode === "page" || doc.body.dataset.minZero === "true") &&
      !recordedEnds.current.has(mode)
    ) {
      recordedEnds.current.add(mode);
      patch((old) => ({ endsSeen: add(old.endsSeen, mode) }));
    }
    setM({
      page: doc.documentElement.scrollHeight,
      view: w.innerHeight,
      inner: list.clientHeight,
      content: list.scrollHeight,
      slot: Math.round(slot.getBoundingClientRect().height),
      pageTop: Math.round(w.scrollY),
      innerTop: Math.round(list.scrollTop),
      lastVisible,
    });
  };
  const loaded = () => {
    cleanup.current();
    const doc = frame.current.contentDocument,
      w = frame.current.contentWindow;
    w.addEventListener("scroll", measure, true);
    w.addEventListener("resize", measure);
    const focusFrame = () => setFrameActive(true),
      blurFrame = () => setFrameActive(false);
    w.addEventListener("focus", focusFrame);
    w.addEventListener("blur", blurFrame);
    setFrameActive(document.activeElement === frame.current);
    const observer = new ResizeObserver(measure);
    observer.observe(doc.body);
    cleanup.current = () => {
      w.removeEventListener("scroll", measure, true);
      w.removeEventListener("resize", measure);
      w.removeEventListener("focus", focusFrame);
      w.removeEventListener("blur", blurFrame);
      observer.disconnect();
    };
    setReady(true);
    measure();
  };
  useEffect(() => () => cleanup.current(), []);
  const change = (x) => {
    if (sizingDocument({ ...data, ...x }) !== sizingDocument(data))
      setReady(false);
    patch(x);
  };
  const scroll = (end) => {
    const doc = frame.current?.contentDocument,
      w = frame.current?.contentWindow;
    if (!ready || !doc) return;
    const list = doc.querySelector("[data-messages]");
    if (data.scrollMode === "internal")
      list.scrollTo({ top: end ? list.scrollHeight : 0, behavior: "instant" });
    else
      w.scrollTo({
        top: end ? doc.documentElement.scrollHeight : 0,
        behavior: "instant",
      });
    measure();
  };
  return (
    <>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              消息区的剩余高度
            </span>
            <span className="micro">独立实验页 · 350px 视口</span>
          </div>
          <p className="sizing-lab-caption">
            有意演示撑高：内部模式未解除中间项下限时，可能把输入区推到实验页下方。课程自身不裁切；可在实验页滚动找回内容。
          </p>
          <iframe
            ref={frame}
            className={`sizing-scroll-frame ${frameActive ? "sizing-frame-active" : ""}`}
            title="消息尺寸与滚动归属实验"
            srcDoc={sizingDocument(data)}
            onLoad={loaded}
          />
          <div className="sizing-scroll-actions">
            <button disabled={!ready} onClick={() => scroll(false)}>
              回到消息开头
            </button>
            <button disabled={!ready} onClick={() => scroll(true)}>
              滚到消息末尾
            </button>
          </div>
          <div className="sizing-reading" role="status">
            <span>
              实验页高度 / 视口
              <b data-testid="page-heights">
                {m?.page ?? "—"} / {m?.view ?? "—"}
              </b>
            </span>
            <span>
              消息可见 / 内容高
              <b data-testid="message-heights">
                {m?.inner ?? "—"} / {m?.content ?? "—"}
              </b>
            </span>
            <span>
              页 / 消息滚动量
              <b data-testid="scroll-positions">
                {m?.pageTop ?? 0} / {m?.innerTop ?? 0}
              </b>
            </span>
          </div>
          <p className="sizing-lab-caption" role="status">
            {m?.lastVisible
              ? "最后一条消息当前可见。"
              : "最后一条消息可能在下方，使用滚动或末尾按钮访问。"}
            {data.scrollMode === "internal" && data.heightZero
              ? " 中间项已允许缩进剩余高度。"
              : ""}
          </p>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">AVAILABLE HEIGHT / SCROLL OWNER</div>
          <h3>高度需要一条完整的约束链</h3>
          <Choices
            label="滚动结构"
            values={[
              ["page", "整页滚动 · 实验页"],
              ["internal", "消息区内部滚动"],
            ]}
            value={data.scrollMode}
            onChange={(scrollMode) => change({ scrollMode })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.heightZero}
              onChange={(e) =>
                change({
                  heightZero: e.target.checked,
                  heightTested: data.heightTested || e.target.checked,
                })
              }
            />
            允许中间 Flex 项收缩 · min-height: 0
          </label>
          <div className="sizing-count">
            <button
              disabled={data.count <= 2}
              onClick={() => change({ count: Math.max(2, data.count - 2) })}
            >
              减少 2 条
            </button>
            <output aria-live="polite">{data.count} 条消息</output>
            <button
              disabled={data.count >= 10}
              onClick={() =>
                change({ count: Math.min(10, data.count + 2), added: true })
              }
            >
              新增 2 条
            </button>
          </div>
          <p className="flex-help">
            先加到至少 6 条，再比较两种结构。内部模式中，顶栏 46px、输入区 48px
            从 350px 中扣除，中间项可使用余下约 256px。消息列表在其中 overflow:
            auto；中间项的下限仍需允许收缩。
          </p>
          <p className="flex-help">
            整页模式让实验文档增长，顶栏也会滚走。内部模式适合保持输入区可见；整页模式同样可能是合理设计。请按产品需要决定。
          </p>
        </aside>
      </div>
      <Note title="min-height: 0 需要放在阻止收缩的那一层">
        本例外层高度确定，中间 Flex
        项包含一个滚动列表。自动最小高度可能被内容托住，导致内部滚动得不到受限高度；显式允许中间项缩小后，列表才能在剩余空间内滚动。直接给自身
        overflow: auto 的 Flex
        项，其自动最小尺寸也可能已为零，因此不能机械地每层都加 0。仅写 overflow:
        auto、不提供可用高度约束，也未必形成你预期的内部滚动。
      </Note>
    </>
  );
}

function SizingReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第五节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本节依据原生 CSS 的尺寸、盒模型、溢出与自动最小尺寸规则。min-width: 0
          / min-height: 0 只在相应收缩约束中使用，不是万能修复；border-box 不含
          margin，也不会自动处理内容。滚动结构依据产品约束选择。
        </p>
        <p>
          橙色标记区专门演示故障。实验外层保留滚动访问；裁切和省略另有全文入口。示例为原创教学结构，内部滚动发生在独立实验页，未给课程页面增加固定高度。按目标浏览器核对
          clip、自动最小尺寸与滚动键盘操作，不声称永远最新。
        </p>
        <div className="source-links">
          {sizingSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonFive({ onStorageStatus }) {
  const [data, setData] = useState(readSizingProgress),
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
      localStorage.setItem(SIZING_STORAGE, JSON.stringify(data));
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
      [data.sizeNarrowed, "调窄容器，观察可用尺寸"],
      [
        data.minTested && data.maxTested,
        "比较 min-width: 320px 与 max-width: 100%",
      ],
      [
        data.boxesSeen.includes("content-box"),
        "比较 content-box 与 border-box",
      ],
    ],
    [
      [data.longTested && data.textNarrowed, "在窄容器中放入超长标题"],
      [data.minZeroTested, "允许主 Flex 项缩小"],
      [
        ["scroll", "clip", "ellipsis"].every((v) =>
          data.policiesSeen.includes(v),
        ),
        "比较滚动、裁切与省略",
      ],
      [data.fullRead, "通过全文入口阅读标题"],
    ],
    [
      [data.added && data.count >= 6, "增加到至少 6 条消息"],
      [data.heightTested, "允许中间 Flex 项缩进剩余高度"],
      [
        ["page", "internal"].every((v) => data.endsSeen.includes(v)),
        "分别在整页与内部模式访问最后一条消息",
      ],
    ],
    sizingQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成一份可编辑的尺寸 / 溢出指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查尺寸、滚动归属与全文访问方式",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = sizingSteps[data.step];
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
      setNotice("第五节已完成。" + nextLessonHint(4));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const scenario =
      data.brief === "chat"
        ? "实现一个消息界面：外层占据明确的可用高度，顶栏和输入区保留各自空间，中间消息区域使用剩余高度并内部滚动。此为当前产品选择，不意味着所有聊天界面都必须采用同一种结构。"
        : "实现一个资料列表：列表随文档自然增长并整页滚动；卡片宽度受父容器约束，重要操作保持可见。标题若单行省略，必须另有可操作的全文入口。";
    const draft = `请在现有项目中${scenario}

尺寸合同：先确认包含块与可用宽高。说明 width / min-width / max-width 以及 height / min-height / max-height 的约束；最小值与最大值冲突时要解决冲突，不能靠遮住。border-box 计入 padding 与 border，不包含 margin，也不自动解决内容溢出。Flex / Grid 项如受自动最小尺寸阻止收缩，在正确的层级考虑 min-width: 0 / min-height: 0，避免全站无差别加补丁。

滚动与内容：明确哪个区域滚动，给内部滚动建立可用高度约束链；如果选择整页滚动，也说明输入区与顶栏的行为。普通正文优先可读换行；必须保留格式的长字符串可局部横向滚动。明确哪里可裁切或省略，哪些重要内容和操作绝不能隐藏。省略标题需要受限宽度、单行和 overflow 配合，并提供键盘与触屏都可操作的全文入口，不能只靠 hover 或 title 属性。

验收：
1. 在 1440px 桌面、375px 手机和窄父容器中测试短文本、无空格长字符串与不同消息数量；核对盒子实际尺寸和正文可读性。
2. 增加至少 6 条消息并访问最后一条，说明滚动条属于页面还是消息区域；顶栏、输入区与操作按约定可达，焦点不被隐藏。
3. 使用键盘 Tab / Shift+Tab、方向键和纯触屏完成操作；检查所有局部裁切，提供完整内容的访问方式，不把 overflow: hidden 当作修复。
${data.includeEdges ? "4. 重复增加 / 减少内容、切换规则；验证尺寸上下限、极窄容器、缩放、复制失败回退与滚动位置。" : "4. 保留清晰焦点、可访问名称和滚动区域的可操作入口。"}
5. 优先原生 CSS 约束，核对目标浏览器兼容性与性能；不用 JS 每帧重排或额外框架处理简单尺寸。截图只是外观线索，不能确定真实技术。

先说明尺寸、滚动归属、截断边界与全文入口，再实现并逐条自测。`;
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
      localStorage.removeItem(SIZING_STORAGE);
    } catch {}
    setData(sizingInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第五节的进度、参数与草稿；前四节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-five">
      <div className="lesson-overline">
        <span className="pill">第五节 · Sizing 与 Overflow</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Sizing与Overflow<span className="title-period">.</span>
          </h1>
          <p>先定可用空间，再决定内容如何增长、滚动和被访问。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>05</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 读懂尺寸上下限
        </span>
        <span>
          <Icon type="check" size={16} /> 判断滚动归属
        </span>
        <span>
          <Icon type="check" size={16} /> 保留完整内容
        </span>
      </div>
      <nav className="stepper" aria-label="第五节学习步骤">
        {sizingSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="sizing-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            SIZING LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="sizing-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <SizeLab data={data} patch={patch} />}
        {data.step === 1 && <TextLab data={data} patch={patch} />}
        {data.step === 2 && <ScrollLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {sizingQuestions.map((q, i) => {
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
              <h3>你的尺寸简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="chat">消息区内部滚动</option>
                  <option value="catalog">资料列表整页滚动</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入极窄容器与重复操作验收
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成尺寸草稿" : "生成尺寸指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的尺寸 / 溢出指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制尺寸指令
                </button>
              </div>
              <label className="sr-only" htmlFor="sizing-agent-draft">
                可编辑的 Sizing Agent 指令
              </label>
              <textarea
                id="sizing-agent-draft"
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
                placeholder="生成后，补充你需要的尺寸、滚动归属和全文入口。"
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
                我已检查尺寸约束、滚动归属、全文入口和验收方式。
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
                  ? "完成第五节"
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
          重置第五节进度
        </button>
      </div>
      <SizingReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="sizing-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="sizing-reset-title">重新开始第五节？</h2>
        <p>仅清除第五节的进度、实验参数和草稿；前四节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第五节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第五节
          </button>
        </div>
      </dialog>
    </div>
  );
}
