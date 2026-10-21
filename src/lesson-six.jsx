import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  RESPONSIVE_STORAGE,
  responsiveSteps,
  responsiveQuestions,
  responsiveSources,
  responsiveInitial,
  readResponsiveProgress,
} from "./lesson-six-content";
import { mediaDocument, layoutDocument } from "./responsive-documents";
import "./lesson-six.css";
const add = (a, v) => [...new Set([...a, v])];
const supportsContainers = () =>
  typeof CSS !== "undefined" && CSS.supports("container-type", "inline-size");
function DemoFrame({ source, width, kind, onEvent }) {
  const ref = useRef(null),
    cleanup = useRef(() => {}),
    callback = useRef(onEvent),
    [info, setInfo] = useState(null),
    [active, setActive] = useState(false);
  callback.current = onEvent;
  const read = () => {
    const doc = ref.current?.contentDocument,
      w = ref.current?.contentWindow;
    if (!doc?.querySelector("main")) return;
    if (kind === "media") {
      const cols = w
        .getComputedStyle(doc.querySelector(".cards"))
        .gridTemplateColumns.split(" ").length;
      setInfo({
        width: w.innerWidth,
        wide: w.getComputedStyle(doc.querySelector(".side")).display !== "none",
        cols,
      });
    } else {
      const d = doc.querySelector("dialog");
      setInfo({
        width: w.innerWidth,
        wide: doc.body.dataset.layout === "wide",
        open: d.open,
        modal: d.matches(":modal"),
      });
    }
  };
  const load = () => {
    cleanup.current();
    const w = ref.current.contentWindow,
      doc = ref.current.contentDocument;
    if (!doc.querySelector("main")) return;
    let raf = 0;
    const update = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(read);
      },
      event = (e) => {
        callback.current?.(e.detail.kind);
        update();
      },
      focus = () => setActive(true),
      blur = () => setActive(false);
    w.addEventListener("resize", update);
    w.addEventListener("responsive-demo", event);
    w.addEventListener("focus", focus);
    w.addEventListener("blur", blur);
    const observer = new ResizeObserver(update);
    observer.observe(doc.body);
    cleanup.current = () => {
      w.removeEventListener("resize", update);
      w.removeEventListener("responsive-demo", event);
      w.removeEventListener("focus", focus);
      w.removeEventListener("blur", blur);
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
    read();
  };
  useEffect(() => () => cleanup.current(), []);
  return (
    <>
      <div
        className="responsive-safe-scroll"
        role="region"
        aria-label={
          kind === "media"
            ? "媒体查询示例外框，可横向滚动"
            : "导航示例外框，可横向滚动"
        }
        tabIndex={0}
        data-intentional-overflow="responsive-viewport"
      >
        <iframe
          ref={ref}
          className={`responsive-demo-frame ${kind === "layout" ? "drawer-demo-frame" : ""} ${active ? "responsive-frame-active" : ""}`}
          title={
            kind === "media"
              ? "独立视口媒体查询实验"
              : "独立视口侧栏与导航抽屉实验"
          }
          style={{ width }}
          srcDoc={source}
          onLoad={load}
        />
      </div>
      <div
        className="responsive-readout"
        role="status"
        data-testid={kind + "-readout"}
      >
        独立 iframe 视口：{info?.width ?? "—"}px ·{" "}
        {info?.wide ? "宽布局" : "窄布局"}
        {kind === "media"
          ? ` · ${info?.cols ?? "—"} 列卡片`
          : ` · ${info?.open ? (info.modal ? "原生模态抽屉已打开" : "普通展开导航已打开") : "抽屉已收起"}`}
      </div>
    </>
  );
}
function RulersLab({ data, patch }) {
  const ref = useRef(null),
    [card, setCard] = useState({ width: 0, horizontal: false }),
    [hostWidth, setHostWidth] = useState(innerWidth),
    supported = supportsContainers(),
    fallback = !supported || data.containerFallback;
  useLayoutEffect(() => {
    const el = ref.current;
    const update = () => {
      setCard({
        width: Math.round(el.getBoundingClientRect().width),
        horizontal:
          getComputedStyle(
            el.querySelector(".responsive-query-card"),
          ).gridTemplateColumns.split(" ").length > 1,
      });
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(el.firstElementChild);
    update();
    return () => ro.disconnect();
  }, [data.containerWidth, fallback]);
  useEffect(() => {
    const update = () => setHostWidth(innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return (
    <>
      <div className="responsive-lab">
        <div className="panel-heading">
          <span>
            <i className="live-dot" />
            视口查询 · @media
          </span>
          <span className="micro">当前课程窗口 {hostWidth}px</span>
        </div>
        <div className="responsive-surface">
          <p className="responsive-warning">
            下面是独立 iframe
            视口；宽示例超出外框时可横向滚动。它不是把当前手机窗口变成
            840px，课程正文仍按你的设备宽度排版。
          </p>
          <DemoFrame
            source={mediaDocument(data.breakpoint)}
            width={data.viewWidth}
            kind="media"
          />
        </div>
        <div className="responsive-controls">
          <Choices
            label="独立示例视口"
            values={[
              [320, "320px"],
              [560, "560px"],
              [840, "840px"],
            ]}
            value={data.viewWidth}
            onChange={(viewWidth) =>
              patch({
                viewWidth,
                viewportsSeen: add(data.viewportsSeen, viewWidth),
              })
            }
          />
          <Choices
            label="媒体查询断点"
            values={[
              [480, "480px"],
              [600, "600px"],
              [720, "720px"],
            ]}
            value={data.breakpoint}
            onChange={(breakpoint) =>
              patch({
                breakpoint,
                breakpointChanged: data.breakpointChanged || breakpoint !== 600,
              })
            }
          />
        </div>
      </div>
      <div className="responsive-lab" style={{ marginTop: 20 }}>
        <div className="panel-heading">
          <span>组件查询 · @container</span>
          <span className="micro">容器达到 340px 时横排</span>
        </div>
        <div className="responsive-surface">
          <div
            className="responsive-safe-scroll"
            role="region"
            aria-label="独立卡片容器外框，可横向滚动"
            tabIndex={0}
          >
            <div
              ref={ref}
              className={`responsive-card-container ${fallback ? "container-fallback" : ""}`}
              style={{ width: data.containerWidth }}
              data-testid="query-container"
            >
              <article
                className="responsive-query-card"
                data-testid="query-card"
              >
                <div className="responsive-card-art" aria-hidden="true">
                  ◈
                </div>
                <div>
                  <h4>相同组件，不同位置</h4>
                  <p>
                    在窄侧栏里纵排，在宽主区里横排。这里观察的是卡片所在容器，不是全局窗口。
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
        <div
          className="responsive-readout"
          role="status"
          data-testid="container-readout"
        >
          容器实测 {card.width}px · {card.horizontal ? "横向卡片" : "纵向卡片"}{" "}
          · {fallback ? "基础单列回退" : "原生容器查询"}。
          {!supported ? "当前浏览器未通过容器查询能力检查。" : ""}
        </div>
        <div className="responsive-controls">
          <Choices
            label="组件容器宽度"
            values={[
              [200, "200px"],
              [360, "360px"],
              [460, "460px"],
            ]}
            value={data.containerWidth}
            onChange={(containerWidth) =>
              patch({
                containerWidth,
                containersSeen: add(data.containersSeen, containerWidth),
              })
            }
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.containerFallback}
              onChange={(e) => patch({ containerFallback: e.target.checked })}
            />
            模拟不支持容器查询
          </label>
        </div>
      </div>
      <Note title="两把尺子分开选，断点按内容验证">
        媒体查询可以参考视口等环境条件；尺寸容器查询参考声明了 container-type
        的祖先容器。本例宽布局需要侧栏、两张可读卡片与间距，600px
        是可调整的实验起点；卡片横排则按自身内容空间选
        340px。它们都不是普适设备尺寸，更不是一律
        768px。容器查询不支持时，本例保留可读单列；项目可用 @supports
        和实际目标浏览器测试安排回退。
      </Note>
    </>
  );
}
function DrawerLab({ data, patch }) {
  const event = (kind) => {
    if (kind === "request-wide")
      patch((old) => ({
        layoutWidth: 820,
        layoutWidthsSeen: add(old.layoutWidthsSeen, 820),
      }));
    else if (kind === "opened") patch({ drawerOpened: true });
    else if (kind === "closed") patch({ drawerClosed: true });
    else if (kind === "auto-closed")
      patch({ drawerClosed: true, crossedOpen: true });
  };
  return (
    <>
      <div className="responsive-lab">
        <div className="panel-heading">
          <span>
            <i className="live-dot" />
            同一个导航，切换承载方式
          </span>
          <span className="micro">本例断点 640px</span>
        </div>
        <div className="responsive-surface">
          <p className="responsive-warning">
            独立 iframe
            视口。宽视口放不进外框时可横向滚动；抽屉的模态范围只在实验页内，不会锁住整个课程。
          </p>
          <DemoFrame
            source={layoutDocument}
            width={data.layoutWidth}
            kind="layout"
            onEvent={event}
          />
        </div>
        <div className="responsive-controls">
          <Choices
            label="导航示例视口"
            values={[
              [340, "340px · 窄视口"],
              [820, "820px · 宽视口"],
            ]}
            value={data.layoutWidth}
            onChange={(layoutWidth) =>
              patch({
                layoutWidth,
                layoutWidthsSeen: add(data.layoutWidthsSeen, layoutWidth),
              })
            }
          />
        </div>
        <p className="responsive-caption">
          窄视口点「打开导航」，再用「关闭导航」或 Esc
          退出。再打开一次，在抽屉里选「切到宽视口并收起」，键盘和触屏都能完成跨断点实验。
        </p>
      </div>
      <Note title="不是只把侧栏藏起来">
        本例导航节点在桌面侧栏与抽屉之间移动，内容阅读顺序不靠 CSS order
        颠倒。窄视口使用有名称的原生模态 dialog、初始焦点、Tab 循环、Esc /
        关闭按钮与焦点返回；切到宽视口时关闭模态并把相关焦点放到可见桌面导航，不残留遮罩。普通内容中的焦点不会因断点变化被强行抢走。640px
        按本例导航、卡片文字与间距选择，长文案和缩放后仍需复核。模态能力不可用时会显示普通展开导航，并明确背景仍可操作。
      </Note>
    </>
  );
}
function PriorityLab({ data, patch }) {
  const ref = useRef(null),
    primary = useRef(null),
    [message, setMessage] = useState(""),
    [layout, setLayout] = useState(""),
    fallback = !supportsContainers() || data.containerFallback;
  useLayoutEffect(() => {
    const el = ref.current,
      update = () => {
        const inline = el.querySelector(".priority-inline");
        setLayout(
          getComputedStyle(inline).display === "none"
            ? "次要操作在更多入口"
            : "次要操作直接显示",
        );
        const active = document.activeElement;
        if (el.contains(active) && !active.getClientRects().length)
          primary.current.focus({ preventScroll: true });
      };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [data.priorityWidth, fallback]);
  const action = (secondary) => {
    setMessage(
      secondary
        ? "完整说明：次要操作可以折叠，但必须保留触屏和键盘都能使用的入口。"
        : "草稿已在本实验中标记保存。",
    );
    patch(secondary ? { secondaryUsed: true } : { primaryUsed: true });
  };
  return (
    <>
      <div className="responsive-lab">
        <div className="panel-heading">
          <span>
            <i className="live-dot" />
            内容压力与操作优先级
          </span>
          <span className="micro">容器断点 440px · 示例操作区高至少 44px</span>
        </div>
        <div className="responsive-surface">
          <p className="responsive-warning">
            容器宽度独立于课程窗口；宽示例可在外框横向滚动。这里的 44px
            是本例触摸目标设计选择，不声称所有场景只有这一种尺寸。
          </p>
          <div
            className="responsive-safe-scroll"
            role="region"
            aria-label="操作优先级组件外框，可横向滚动"
            tabIndex={0}
          >
            <div
              ref={ref}
              className={`responsive-priority-container ${fallback ? "container-fallback" : ""}`}
              style={{ width: data.priorityWidth }}
              data-testid="priority-container"
            >
              <article className="responsive-priority">
                <h3>
                  {data.longCopy
                    ? "团队协作资料整理与跨设备阅读体验检查"
                    : "资料整理"}
                </h3>
                <p>
                  {data.longCopy
                    ? "更长的中文标题和说明仍然完整换行。主要操作保持可见，次要操作可以折叠，但要提供清楚的入口和足够的触摸空间。"
                    : "重要内容先读，主要操作先到达。调窄组件，检查次要操作怎么访问。"}
                </p>
                <div className="priority-actions">
                  <button
                    ref={primary}
                    className="priority-main"
                    onClick={() => action(false)}
                  >
                    保存草稿
                  </button>
                  <div className="priority-inline">
                    <button onClick={() => action(true)}>查看说明</button>
                    <button
                      onClick={() => {
                        setMessage(
                          "历史说明：本实验进度只保存在当前浏览器，可在本课底部重置。",
                        );
                        patch({ secondaryUsed: true });
                      }}
                    >
                      查看历史
                    </button>
                  </div>
                  <details className="priority-details">
                    <summary>更多操作</summary>
                    <div>
                      <button onClick={() => action(true)}>查看说明</button>
                      <button
                        onClick={() => {
                          setMessage(
                            "历史说明：本实验进度只保存在当前浏览器，可在本课底部重置。",
                          );
                          patch({ secondaryUsed: true });
                        }}
                      >
                        查看历史
                      </button>
                    </div>
                  </details>
                </div>
                <div className="priority-result" role="status">
                  {message || "这组按钮只操作教学示例，不会发送资料。"}
                </div>
              </article>
            </div>
          </div>
        </div>
        <div
          className="responsive-readout"
          role="status"
          data-testid="priority-readout"
        >
          {layout}。
          {fallback
            ? "容器查询回退：操作自然换行。"
            : "原生容器查询：不改变内容的逻辑顺序。"}
        </div>
        <div className="responsive-controls">
          <Choices
            label="操作组件宽度"
            values={[
              [240, "240px"],
              [520, "520px"],
            ]}
            value={data.priorityWidth}
            onChange={(priorityWidth) =>
              patch({
                priorityWidth,
                priorityWidthsSeen: add(data.priorityWidthsSeen, priorityWidth),
              })
            }
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.longCopy}
              onChange={(e) =>
                patch({
                  longCopy: e.target.checked,
                  longTested: data.longTested || e.target.checked,
                })
              }
            />
            换成长标题与完整说明
          </label>
        </div>
      </div>
      <Note title="改变布局，不降低重要内容的优先级">
        先确认哪些内容必须完整阅读、哪个操作必须可见，再选择折行或有入口的折叠。这里在
        440px
        容器内外切换次要操作的承载方式，主要操作始终保留。用真实长文案、缩放、触屏与键盘测试临界宽度；如果断点变化隐藏了当前焦点所在的控件，本例把焦点移回可见的主要操作。不依赖
        hover，不为了整齐把功能直接删掉。
      </Note>
    </>
  );
}
function ResponsiveReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第六节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本节使用真实 CSS media query 与 inline-size container query，iframe
          的宽度是独立示例视口；容器查询在课程文档内参考组件祖先。JS
          负责测量与导航交互，不把两类查询都绑定到全局窗口。
        </p>
        <p>
          按目标浏览器检查容器查询。本例能力检查失败时保留可读的单列与换行操作；不把回退称为已运行容器查询。模态抽屉有能力检查、明确关闭路径与跨断点清理。断点来自内容约束，不承诺某个尺寸永远适用。
        </p>
        <div className="source-links">
          {responsiveSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonSix({ onStorageStatus }) {
  const [data, setData] = useState(readResponsiveProgress),
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
      localStorage.setItem(RESPONSIVE_STORAGE, JSON.stringify(data));
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
      [
        [320, 840].every((n) => data.viewportsSeen.includes(n)),
        "比较独立示例的窄与宽视口",
      ],
      [data.breakpointChanged, "调整媒体查询断点"],
      [
        [200, 460].every((n) => data.containersSeen.includes(n)),
        "独立改变卡片容器宽度",
      ],
    ],
    [
      [
        data.layoutWidthsSeen.includes(340) &&
          data.layoutWidthsSeen.includes(820),
        "比较桌面侧栏与窄视口",
      ],
      [
        data.drawerOpened && data.drawerClosed,
        "打开抽屉，用关闭按钮或 Esc 退出",
      ],
      [data.crossedOpen, "在抽屉打开时切到宽视口"],
    ],
    [
      [
        [240, 520].every((n) => data.priorityWidthsSeen.includes(n)),
        "比较两种操作组件宽度",
      ],
      [data.longTested, "加入长标题与完整说明"],
      [data.primaryUsed && data.secondaryUsed, "分别使用主要操作与次要操作"],
    ],
    responsiveQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成可编辑的响应式指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查布局变化、容器、优先级和交互验收",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = responsiveSteps[data.step];
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
      setNotice("第六节已完成。" + nextLessonHint(5));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const scenario =
      data.brief === "workspace"
        ? "实现一个可响应的工作台：宽视口显示桌面侧栏和横排内容卡片；内容空间不足时改为单列，导航使用有可见关闭入口的抽屉。"
        : "实现一个可复用资料卡片：卡片放进侧栏或主区都按所在容器宽度调整横纵布局，不能只依赖全局窗口。";
    const draft = `请在现有项目中${scenario}

先确认内容约束：用真实导航文字、长标题、正文、最小可读宽度和间距选择断点，不把 768px 当作通用答案。说明每个临界宽度两侧怎样改变布局、哪些元素完整保留、哪些次要操作折叠到什么入口。

查询策略：页面级变化可用 media query；可复用组件按实际父容器空间使用 container-type: inline-size 与 container query。分别测试视口宽度和组件容器宽度，不能都仅绑定全局窗口。不支持容器查询时保留可读的单列 / 自然换行，并按目标浏览器复核；简单布局不额外引入响应式 JS 框架。

阅读与操作：HTML 保持逻辑阅读顺序，不靠 CSS order 颠倒重要内容。主要操作保持可见，次要操作可折叠但不能消失；长文案完整换行，提供触摸可操作的目标与间隔，不只支持 hover。

抽屉：若选择模态，说明可访问名称、初始焦点、Tab / Shift+Tab、Esc 与可见触屏关闭入口、关闭后的焦点返回；跨断点切回桌面必须清理模态、遮罩与焦点锁，并避免把焦点留在隐藏控件上。只在当前焦点即将不可见时合理恢复，不抢走无关内容焦点。若使用 iframe 演示，准确标明其独立视口与模态范围。

验收：
1. 分别调整实际页面视口、独立组件容器，验证不同查询各自响应；测试 375px 手机、1440px 桌面和临界宽度两侧。
2. 加长标题、导航与说明并缩放，核对阅读顺序、优先级、局部裁切及横向溢出；不能靠隐藏重要内容修好布局。
3. 用纯触屏和完整键盘完成所有操作；重复打开、关闭与跨断点至少 3 次，背景交互恢复、焦点可见且不丢失。
${data.includeEdges ? "4. 覆盖容器查询不支持、模态打开失败、内容长度改变、复制失败回退和快速往返切换。" : "4. 保留基础可用布局、清晰焦点和真实的兼容提示。"}
5. 核对依赖、性能和减少动态效果的偏好，截图只能提供外观线索，不能确定真实技术。

先给出布局变化、容器策略、内容优先级与焦点方案，再实现并逐条自测。`;
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
      localStorage.removeItem(RESPONSIVE_STORAGE);
    } catch {}
    setData(responsiveInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第六节的进度、参数与草稿；前五节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-six">
      <div className="lesson-overline">
        <span className="pill">第六节 · 响应式设计</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            响应式设计<span className="title-period">.</span>
          </h1>
          <p>让布局跟着可用空间改变，让阅读与操作始终可达。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>06</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 区分视口与容器
        </span>
        <span>
          <Icon type="check" size={16} /> 选择内容断点
        </span>
        <span>
          <Icon type="check" size={16} /> 保留操作与焦点
        </span>
      </div>
      <nav className="stepper" aria-label="第六节学习步骤">
        {responsiveSteps.map((s, i) => (
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
        aria-labelledby="responsive-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            RESPONSIVE LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="responsive-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <RulersLab data={data} patch={patch} />}
        {data.step === 1 && <DrawerLab data={data} patch={patch} />}
        {data.step === 2 && <PriorityLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {responsiveQuestions.map((q, i) => {
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
              <h3>你的响应式简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="workspace">侧栏与导航抽屉工作台</option>
                  <option value="card">复用资料卡片与操作区</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入兼容回退与反复跨断点验收
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成响应式草稿" : "生成响应式指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的响应式指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制响应式指令
                </button>
              </div>
              <label className="sr-only" htmlFor="responsive-agent-draft">
                可编辑的 响应式 Agent 指令
              </label>
              <textarea
                id="responsive-agent-draft"
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
                placeholder="生成后，补充你需要的布局变化、容器策略与交互要求。"
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
                我已检查布局变化、容器、优先级和交互验收方式。
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
                  ? "完成第六节"
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
          重置第六节进度
        </button>
      </div>
      <ResponsiveReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="responsive-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="responsive-reset-title">重新开始第六节？</h2>
        <p>仅清除第六节的进度、实验参数和草稿；前五节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第六节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第六节
          </button>
        </div>
      </dialog>
    </div>
  );
}
