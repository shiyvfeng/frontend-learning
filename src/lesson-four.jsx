import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { Choices, Note } from "./lesson-two";
import {
  POSITION_STORAGE,
  positionSteps,
  positionQuestions,
  positionSources,
  positionInitial,
  readPositionProgress,
} from "./lesson-four-content";
import "./lesson-four.css";
import AnchoredPopover from "./anchored-popover";
const add = (values, value) => [...new Set([...values, value])];
function FlowLab({ data, patch }) {
  const boardRef = useRef(null),
    cardRef = useRef(null),
    badgeRef = useRef(null),
    bodyRef = useRef(null);
  const [m, setM] = useState({ body: 0, badge: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const card = cardRef.current.getBoundingClientRect(),
        board = boardRef.current.getBoundingClientRect();
      setM({
        body: Math.round(
          bodyRef.current.getBoundingClientRect().top - card.top,
        ),
        badge: Math.round(
          badgeRef.current.getBoundingClientRect().top - board.top,
        ),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(boardRef.current);
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [data.mode, data.offset, data.reference]);
  return (
    <>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              卡片角标实验
            </span>
            <span className="micro">
              真实布局 · 本例无 transform 等额外参照
            </span>
          </div>
          <div
            ref={boardRef}
            className={`position-board ref-${data.reference}`}
            data-testid="position-board"
          >
            <span className="board-caption">外层画布 · position: relative</span>
            <article
              ref={cardRef}
              className="position-card"
              data-testid="position-card"
              style={{
                position: data.reference === "card" ? "relative" : "static",
              }}
            >
              <span
                ref={badgeRef}
                className="position-badge"
                data-testid="position-badge"
                style={{
                  position: data.mode,
                  top: data.mode === "static" ? undefined : data.offset,
                  left: data.mode === "relative" ? data.offset : undefined,
                  right: data.mode === "absolute" ? data.offset : undefined,
                }}
              >
                精选角标
              </span>
              <div
                ref={bodyRef}
                className="position-card-body"
                data-testid="position-body"
              >
                <span className="eyebrow">COLLECTION / 04</span>
                <h3>留白的灵感</h3>
                <p>
                  正文保持自然排列。角标可以移动，但正文是否让位，要看它有没有脱离文档流。
                </p>
              </div>
            </article>
          </div>
          <div className="position-readings" role="status">
            <span>
              正文距卡片顶 <b data-testid="body-offset">{m.body}px</b>
            </span>
            <span>
              角标距画布顶 <b data-testid="badge-offset">{m.badge}px</b>
            </span>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">FLOW / OFFSET / REFERENCE</div>
          <h3>分清移动和脱离</h3>
          <Choices
            label="角标的 position"
            values={[
              ["static", "static · 正常流"],
              ["relative", "relative · 留住位置"],
              ["absolute", "absolute · 脱离流"],
            ]}
            value={data.mode}
            onChange={(mode) =>
              patch({ mode, modesSeen: add(data.modesSeen, mode) })
            }
          />
          <Choices
            label="偏移距离"
            values={[
              [8, "8px"],
              [24, "24px"],
            ]}
            value={data.offset}
            onChange={(offset) =>
              patch({
                offset,
                offsetChanged: data.offsetChanged || offset !== data.offset,
              })
            }
          />
          <Choices
            label="absolute 的定位参照"
            values={[
              ["card", "卡片 relative"],
              ["board", "卡片 static → 画布"],
            ]}
            value={data.reference}
            onChange={(reference) =>
              patch({
                reference,
                mode: "absolute",
                modesSeen: add(data.modesSeen, "absolute"),
                referenceChanged:
                  data.referenceChanged || reference !== data.reference,
              })
            }
          />
          <p className="flex-help">
            static 不响应 top / right / bottom / left。relative
            偏移后仍保留原来的占位；absolute 不再为正文占位。切换参照会启用
            absolute：卡片为 static 时，本例转而相对外层画布定位。
          </p>
        </aside>
      </div>
      <Note title="absolute 适合明确的局部关系，不是普通排版的万能拼图">
        定位包含块不一定是直接父元素，常见情况是最近的非 static 祖先；transform
        等属性也可能改变参照。普通卡片列表先考虑 Grid /
        Flex。先说“角标相对哪张卡片、距哪条边多远”，再验收内容变化后的效果。
      </Note>
    </>
  );
}
function scrollDocument(mode) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;color:#3d3a4d;font:13px/1.8 system-ui,sans-serif;background:#fafbfe}.intro{height:100px;padding:45px 15px 0;background:#f1eef8}.section{height:500px;background:linear-gradient(#f8f8fc,#e9eff4)}.bar{position:${mode};top:0;width:100%;height:44px;background:#5c548f;color:white;padding:10px 14px;z-index:1}.content{padding:20px 15px}.content p{margin:24px 0}.tail{height:500px;padding:22px 15px;background:#eaf1ed}.ruler{display:block;font-size:11px;color:#566c61}h2{font-size:15px;margin:0 0 12px}</style></head><body><div class="intro">上方介绍 · 100px<br/>这里还没进入吸顶栏所在区段</div><section class="section"><div class="bar" data-bar>${mode} · 同一个标题栏</div><div class="content"><h2>标题栏所在区段 · 500px</h2><p>继续滚动，观察标题栏距实验视口的距离。</p><p>sticky 受本区段边界限制。</p><p>fixed 在本例中相对 iframe 视口固定。</p></div></section><section class="tail"><h2>已经离开标题栏所在区段</h2><span class="ruler">区段边界在文档 y=600px</span><p>sticky 随原区段离开；fixed 仍停在实验视口顶部。</p></section></body></html>`;
}
function ScrollLab({ data, patch }) {
  const frameRef = useRef(null),
    binding = useRef(null);
  const [m, setM] = useState({ scroll: 0, top: 100 });
  const [frameReady, setFrameReady] = useState(false);
  const measure = () => {
    const win = frameRef.current?.contentWindow,
      bar = win?.document.querySelector("[data-bar]");
    if (bar)
      setM({
        scroll: Math.round(win.scrollY),
        top: Math.round(bar.getBoundingClientRect().top),
      });
  };
  const loaded = () => {
    binding.current?.win.removeEventListener(
      "scroll",
      binding.current.listener,
    );
    const win = frameRef.current.contentWindow;
    win.addEventListener("scroll", measure, { passive: true });
    binding.current = { win, listener: measure };
    setFrameReady(true);
    measure();
  };
  useEffect(
    () => () => {
      binding.current?.win.removeEventListener(
        "scroll",
        binding.current.listener,
      );
    },
    [],
  );
  const scroll = (top) => {
    frameRef.current.contentWindow.scrollTo({ top, behavior: "instant" });
    requestAnimationFrame(measure);
    if (top === 680 && data.scrollMode !== "static")
      patch({ scrollChecks: add(data.scrollChecks, data.scrollMode) });
  };
  return (
    <>
      <div className="position-toolbar">
        <Choices
          label="标题栏的定位方式"
          values={[
            ["static", "static · 随流滚走"],
            ["sticky", "sticky · 区段内吸顶"],
            ["fixed", "fixed · 实验视口固定"],
          ]}
          value={data.scrollMode}
          onChange={(scrollMode) => {
            if (scrollMode !== data.scrollMode) {
              setFrameReady(false);
              patch({ scrollMode });
            }
          }}
        />
        <fieldset className="flex-choices">
          <legend>滚动到实验文档的位置</legend>
          <div>
            {[0, 220, 680].map((top) => (
              <button
                key={top}
                disabled={!frameReady}
                onClick={() => scroll(top)}
              >
                {top}px{top === 680 ? " · 区段之后" : ""}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              独立滚动实验框
            </span>
            <span className="micro">不会把 fixed 元素放到课程页面上</span>
          </div>
          <iframe
            ref={frameRef}
            className="position-scroll-frame"
            title="定位方式滚动实验"
            srcDoc={scrollDocument(data.scrollMode)}
            onLoad={loaded}
          />
          <div className="position-readings" role="status">
            <span>
              实验滚动量 <b data-testid="scroll-y">{m.scroll}px</b>
            </span>
            <span>
              标题栏距实验视口顶 <b data-testid="scroll-top">{m.top}px</b>
            </span>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">FIXED / STICKY / SCROLL</div>
          <h3>吸顶不是永远固定</h3>
          <p className="position-explain">
            本例 sticky 设置 top: 0。先到 220px：它贴住实验视口顶部。再到
            680px：它已随区段离开。fixed 在这两个位置仍为 0px。
          </p>
          <p className="position-explain">
            这里 iframe
            的视口相当于小网页的视口；课程页面本身不被遮挡。你也可以在框内用滚轮或键盘滚动。
          </p>
          <p className="flex-help">
            sticky 仍参与正常流，需要有效的 inset（本例
            top）和可用滚动空间，并受包含块限制。它还会关联最近有滚动机制的祖先，检查祖先的
            overflow。fixed 通常参照视口，但 transform
            等祖先条件可能改变它的包含块。
          </p>
        </aside>
      </div>
      <Note title="描述滚动归属与边界，比只说“固定住”更明确">
        先问谁在滚动：整页、侧栏，还是局部面板。再说明从哪里开始吸附、距离哪条边、在哪个区段结束。不要用全局
        fixed 元素挡住内容、手机操作区或键盘焦点。
      </Note>
    </>
  );
}
function LayerLab({ data, patch }) {
  const dialogRef = useRef(null),
    returnRef = useRef(null);
  const [status, setStatus] = useState("");
  const restore = () => {
    if (returnRef.current?.isConnected) returnRef.current.focus();
  };
  const open = (e) => {
    returnRef.current = e.currentTarget;
    const dialog = dialogRef.current;
    if (dialog.open) return;
    if (typeof dialog.showModal !== "function") {
      setStatus(
        "当前浏览器不支持 dialog.showModal()，演示未打开；页面仍可继续操作。",
      );
      return;
    }
    try {
      dialog.showModal();
      dialog.querySelector("[data-demo-close]")?.focus();
      patch({ dialogOpened: true });
      setStatus("模态对话框已打开，可按 Esc 或使用关闭按钮。");
    } catch {
      setStatus("对话框暂时未能打开，请使用同一按钮重试。");
    }
  };
  const close = (reason) => {
    if (!dialogRef.current?.open) return;
    patch(
      reason === "escape"
        ? { dialogEscapeClosed: true }
        : { dialogButtonClosed: true },
    );
    dialogRef.current.close(reason);
    setStatus(
      reason === "escape"
        ? "已用 Esc 关闭，焦点回到打开按钮。"
        : "已用关闭按钮关闭，焦点回到打开按钮。",
    );
    restore();
  };
  useEffect(
    () => () => {
      if (dialogRef.current?.open) dialogRef.current.close();
    },
    [],
  );
  const trapTab = (event) => {
    if (event.key !== "Tab") return;
    const items = [
      ...dialogRef.current.querySelectorAll("button:not(:disabled), a[href]"),
    ].filter((el) => el.getClientRects().length);
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  return (
    <>
      <div className="flex-lab-grid">
        <div className="flex-demo-card">
          <div className="panel-heading">
            <span>
              <i className="live-dot" />
              层叠上下文观察台
            </span>
            <span className="micro">仅在实验画布内叠放</span>
          </div>
          <div className="stack-stage" data-testid="stack-stage">
            <div
              className="context-a"
              data-layer="A"
              style={{ zIndex: data.parentZ }}
            >
              <strong>父上下文 A · z={data.parentZ}</strong>
              <small>position: relative + 非 auto z-index</small>
              <div
                className="context-child"
                data-testid="context-child"
                data-layer="child"
                style={{ zIndex: data.childZ }}
              >
                A 的子元素
                <br />
                z-index: {data.childZ}
              </div>
            </div>
            <div className="context-b" data-layer="B">
              同级上下文 B<br />
              <strong>z-index: 2</strong>
            </div>
          </div>
          <div className="flex-live-reading" role="status">
            <b>
              {data.parentZ === 1
                ? "本例 B 盖在 A 的子元素上方"
                : "本例 A 整体提升，子元素能盖到 B 上方"}
            </b>
            <span>
              父级 A={data.parentZ}，同级 B=2；子元素 {data.childZ} 在 A
              内部比较。
            </span>
          </div>
        </div>
        <aside className="flex-controls">
          <div className="eyebrow">STACKING / TOP LAYER / FOCUS</div>
          <h3>先找上下文，再看数字</h3>
          <Choices
            label="A 内子元素的 z-index"
            values={[
              [1, "1"],
              [999, "999"],
            ]}
            value={data.childZ}
            onChange={(childZ) =>
              patch({ childZ, childRaised: data.childRaised || childZ === 999 })
            }
          />
          <Choices
            label="父上下文 A 的 z-index"
            values={[
              [1, "1 · 低于 B"],
              [3, "3 · 高于 B"],
            ]}
            value={data.parentZ}
            onChange={(parentZ) =>
              patch({
                parentZ,
                parentRaised: data.parentRaised || parentZ === 3,
              })
            }
          />
          <button className="primary" onClick={open}>
            打开原生模态对话框
            <Icon type="arrow" size={17} />
          </button>
          <p className="flex-help">
            图中只画出了叠放关系，不是交互浮层。真正的模态窗口还需要名称、焦点路径、背景不可交互、Esc
            / 关闭按钮和焦点返回。本演示没有页面级高 z-index 挡板。
          </p>
          <p className="position-demo-status" role="status">
            {status}
          </p>
        </aside>
      </div>
      <Note title="原生模态对话框进入顶层，不靠无穷大的 z-index">
        本例使用 dialog.showModal()；浏览器提供顶层和背景 inert
        等行为，我们设置名称、初始焦点、关闭与返回焦点。show() 或单独的 open
        属性不会自动变成同样的模态窗口。菜单、工具提示等其他浮层应按各自交互类型选择实现，不能一律改成模态框。
      </Note>
      <AnchoredPopover data={data} patch={patch} />
      <dialog
        ref={dialogRef}
        className="position-demo-dialog"
        onKeyDown={trapTab}
        aria-labelledby="position-dialog-title"
        aria-describedby="position-dialog-description"
        onCancel={(e) => {
          e.preventDefault();
          close("escape");
        }}
        onClose={restore}
      >
        <span className="eyebrow">NATIVE DIALOG / MODAL</span>
        <h2 id="position-dialog-title">这是一个真实模态对话框</h2>
        <p id="position-dialog-description">
          背景暂不可交互。按 Tab 在窗口内移动，按 Esc
          或使用关闭按钮，焦点会回到打开它的按钮。
        </p>
        <div className="position-dialog-actions">
          <button data-demo-close onClick={() => close("button")}>
            关闭并返回
          </button>
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog"
            target="_blank"
            rel="noreferrer"
          >
            查看官方说明 ↗
          </a>
        </div>
      </dialog>
    </>
  );
}
function PositionReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第四节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本节涵盖正常流、relative / absolute、定位包含块、fixed /
          sticky、层叠上下文、非模态锚点浮层与原生模态 dialog。Popover
          能力检查失败或打开异常时回退到 Portal +
          fixed，并保留关闭与焦点策略；不支持 showModal()
          时会提示未打开，不伪装成已具备模态行为。
        </p>
        <p>
          Portal 不是浏览器顶层，也不自动解决所有遮挡。请按目标浏览器核对原生
          popover、dialog 和 CSS
          定位支持，验证滚动祖先、长文本、窄屏、焦点与关闭。定位只处理一部分视觉关系；浮层语义和交互责任要单独验收。Anchor
          Positioning 等能力留待具体需求评估，本课不依赖它来运行。
        </p>
        <div className="source-links">
          {positionSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonFour({ onStorageStatus }) {
  const [data, setData] = useState(readPositionProgress),
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
      localStorage.setItem(POSITION_STORAGE, JSON.stringify(data));
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
        data.modesSeen.includes("relative") &&
          data.modesSeen.includes("absolute"),
        "分别观察 relative 与 absolute",
      ],
      [data.offsetChanged, "改变偏移，观察正文是否让位"],
      [data.referenceChanged, "在 absolute 下比较卡片与画布参照"],
    ],
    [
      [
        data.scrollChecks.includes("sticky"),
        "sticky 下滚到 680px，观察区段边界",
      ],
      [data.scrollChecks.includes("fixed"), "fixed 下滚到 680px，比较视口位置"],
    ],
    [
      [data.childRaised, "把子元素提高到 999"],
      [data.parentRaised, "把父上下文 A 提高到 3"],
      [
        data.anchorOpened && data.anchorClosed,
        "打开锚点说明，用按钮、外点或 Esc 收起",
      ],
      [
        data.dialogOpened &&
          (data.dialogEscapeClosed || data.dialogButtonClosed),
        "打开真实对话框，用关闭按钮或 Esc 退出",
      ],
    ],
    positionQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成一份可编辑的定位 / 浮层指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查参照、关闭、焦点与验收要求",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = positionSteps[data.step];
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
      setNotice("第四节已完成。请先验收本节；第五节尚未制作。");
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const scenario =
      data.brief === "badge"
        ? `实现卡片右上角角标：卡片提供 position: relative 参照，角标 absolute，距上边与右边各 ${data.offset}px。正文仍用正常流 / Flex / Grid，明确角标是否占位并避免遮挡标题。`
        : data.brief === "sticky"
          ? "实现局部滚动面板内的吸顶栏：明确哪一个祖先滚动，使用 sticky 并设置 top: 0；在所属区段结束时随区段离开。检查祖先 overflow、包含块边界和是否有足够滚动空间。"
          : "实现有可访问名称的原生模态 dialog，使用 showModal()；明确初始焦点、窗口内 Tab 路径、Esc 与可见关闭按钮，以及关闭后的焦点返回。重复打开不创建多个窗口，关闭后背景恢复可操作。";
    const draft = `请在现有项目中${scenario}\n\n先确认布局与交互约束：定位包含块不一定是直接父节点；transform 等祖先属性可能改变 absolute / fixed 的参照。relative 偏移保留原占位，absolute / fixed 脱离正常流。不要用大量绝对坐标拼普通内容布局。\n\n层级与浮层：检查祖先层叠上下文，不能只提高子元素的 z-index。Portal 只改变 DOM 挂载位置，不保证免于所有层叠与遮挡。非模态锚点浮层需明确锚点、上下避让 / 横向回推、滚动时更新或收起、Esc 与触屏关闭入口、外点策略和焦点返回；点其他控件时保留用户的后续操作。定位框不自动提供浮层语义与键盘行为；本需求若使用模态框，保留 dialog 的真实模态行为，不用一个高 z-index 的 div 冒充。对于其他类型的浮层先说明交互模式再选择实现。\n\n验收：\n1. 在 375px 手机、1440px 桌面及较窄父容器检查，正文和操作不被遮挡，无页面横向溢出；说明偏移参照与滚动归属。\n2. 切换内容长度、滚动到顶部 / 中部 / 区段末尾，核对 sticky 与 fixed 的实际差异，不把所有固定效果都当成视口 fixed。\n3. 若有浮层，用键盘打开、Tab / Shift+Tab、Esc（有键盘时）或触屏关闭按钮完成流程；验证焦点回到合理触发点、背景交互正确恢复，不形成无法退出的挡板。\n${data.includeEdges ? "4. 重复打开关闭至少 3 次；测试长标题和长描述，必要时窗口内容可滚动，关闭按钮始终可到达。异常打开要给真实提示并允许重试。" : "4. 保留清晰的键盘焦点、可访问名称和可到达的关闭入口。"}\n5. 用 DevTools 核对包含块、计算位置与层叠上下文，说明目标浏览器支持和不支持时的可用降级。不为简单定位额外引入动画库；尊重减少动态效果的偏好。\n\n请先说明参照、结构和焦点方案，再实现并按以上标准自测。截图只提供视觉线索，不能证明真实技术。`;
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
      localStorage.removeItem(POSITION_STORAGE);
    } catch {}
    setData(positionInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第四节的进度、参数与草稿；前三节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-four">
      <div className="lesson-overline">
        <span className="pill">第四节 · Position 与浮层</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Position与浮层<span className="title-period">.</span>
          </h1>
          <p>放在什么位置，和承担什么交互责任，是两件要说清的事。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>04</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 看懂流与定位参照
        </span>
        <span>
          <Icon type="check" size={16} /> 判断滚动与层级
        </span>
        <span>
          <Icon type="check" size={16} /> 验收关闭与焦点
        </span>
      </div>
      <nav className="stepper" aria-label="第四节学习步骤">
        {positionSteps.map((s, i) => (
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
        aria-labelledby="position-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            POSITION LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="position-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <FlowLab data={data} patch={patch} />}
        {data.step === 1 && <ScrollLab data={data} patch={patch} />}
        {data.step === 2 && <LayerLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {positionQuestions.map((q, i) => {
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
              <h3>你的定位简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="badge">卡片右上角角标</option>
                  <option value="sticky">局部面板内的吸顶栏</option>
                  <option value="dialog">原生模态对话框</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入长内容与重复开关验收
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成定位草稿" : "生成定位指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的定位 / 浮层指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制定位指令
                </button>
              </div>
              <label className="sr-only" htmlFor="position-agent-draft">
                可编辑的 Position Agent 指令
              </label>
              <textarea
                id="position-agent-draft"
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
                placeholder="生成后，补充你需要的参照、滚动和焦点要求。"
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
                我已检查定位参照、关闭路径、焦点和验收方式。
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
                  ? "完成第四节"
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
          重置第四节进度
        </button>
      </div>
      <PositionReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="position-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="position-reset-title">重新开始第四节？</h2>
        <p>仅清除第四节的进度、实验参数和草稿；前三节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第四节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第四节
          </button>
        </div>
      </dialog>
    </div>
  );
}
