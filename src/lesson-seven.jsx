import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  SURFACE_STORAGE,
  surfaceSteps,
  surfaceQuestions,
  surfaceSources,
  surfaceInitial,
  readSurfaceProgress,
  surfaceShadows,
  surfaceColors,
} from "./lesson-seven-content";
import "./lesson-seven.css";
const add = (a, v) => [...new Set([...a, v])];
function SurfaceLab({ data, patch }) {
  return (
    <>
      <div className="surface-lab">
        <div className="panel-heading">
          <span>
            <i className="live-dot" />
            同一 UI 的表面实验
          </span>
          <span className="micro">控件改变真实 CSS，不替换截图</span>
        </div>
        <div className={`surface-stage ${data.showReference ? "" : "single"}`}>
          <div>
            <div className="surface-caption">实时卡片 · 状态可操作</div>
            <article
              className="surface-paper"
              data-testid="live-surface"
              style={{
                borderRadius: data.radius,
                border: `${data.border}px solid #9b88b4`,
                background: surfaceColors[data.brightness],
                boxShadow: surfaceShadows[data.shadow],
              }}
            >
              <span className="surface-state" role="status">
                {data.marked ? "✓ 已读 · 有文字标记" : "○ 待读 · 有文字标记"}
              </span>
              <h3>把资料整理清楚</h3>
              <p>
                {data.longCopy
                  ? "更长的内容仍然完整换行。边界、留白与表面可以共同表达分组，但重要文字与操作不应该被阴影或裁切掩盖。"
                  : "圆角、边框、表面亮度和阴影共同影响分组与深度的感觉。"}
              </p>
              <button
                aria-pressed={data.marked}
                onClick={() => patch({ marked: !data.marked, stateUsed: true })}
              >
                {data.marked ? "恢复待读" : "标记已读"}
              </button>
            </article>
          </div>
          {data.showReference && (
            <div>
              <div className="surface-caption">初始参考 · 只读对照</div>
              <article
                className="surface-paper"
                data-testid="reference-surface"
                style={{
                  borderRadius: 12,
                  border: "1px solid #9b88b4",
                  background: "#fff",
                  boxShadow: surfaceShadows.soft,
                }}
              >
                <span className="surface-state">○ 待读 · 有文字标记</span>
                <h3>把资料整理清楚</h3>
                <p>
                  {data.longCopy
                    ? "更长的内容仍然完整换行。边界、留白与表面可以共同表达分组，但重要文字与操作不应该被阴影或裁切掩盖。"
                    : "圆角、边框、表面亮度和阴影共同影响分组与深度的感觉。"}
                </p>
                <span className="micro">
                  12px 圆角 · 1px 边框 · 轻阴影 · 白色表面
                </span>
              </article>
            </div>
          )}
        </div>
        <div className="surface-reading" role="status">
          圆角 {data.radius}px · 边框 {data.border}px ·{" "}
          {data.shadow === "none"
            ? "无阴影"
            : data.shadow === "soft"
              ? "轻阴影"
              : "较强阴影"}{" "}
          ·{" "}
          {data.brightness === "white"
            ? "白色表面"
            : data.brightness === "tint"
              ? "浅色表面"
              : "更暗表面"}
          。去掉阴影后，状态文字与按钮焦点轮廓仍然保留。
        </div>
        <div className="surface-controls">
          <Choices
            label="卡片圆角"
            values={[
              [0, "0px"],
              [12, "12px"],
              [28, "28px"],
            ]}
            value={data.radius}
            onChange={(radius) =>
              patch({
                radius,
                radiusChanged: data.radiusChanged || radius !== 12,
              })
            }
          />
          <Choices
            label="卡片边框"
            values={[
              [0, "0px"],
              [1, "1px"],
              [2, "2px"],
            ]}
            value={data.border}
            onChange={(border) =>
              patch({
                border,
                borderChanged: data.borderChanged || border !== 1,
              })
            }
          />
          <Choices
            label="卡片阴影"
            values={[
              ["none", "无阴影"],
              ["soft", "轻阴影"],
              ["deep", "较强阴影"],
            ]}
            value={data.shadow}
            onChange={(shadow) =>
              patch({ shadow, shadowsSeen: add(data.shadowsSeen, shadow) })
            }
          />
          <Choices
            label="表面亮度"
            values={[
              ["white", "白色"],
              ["tint", "浅色"],
              ["deep", "更暗"],
            ]}
            value={data.brightness}
            onChange={(brightness) =>
              patch({
                brightness,
                brightnessChanged:
                  data.brightnessChanged || brightness !== "white",
              })
            }
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.showReference}
              onChange={(e) => patch({ showReference: e.target.checked })}
            />
            显示固定参考对照
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.longCopy}
              onChange={(e) => patch({ longCopy: e.target.checked })}
            />
            使用更长的完整说明
          </label>
        </div>
      </div>
      <Note title="层次不只靠影子，状态也不能只靠颜色">
        圆角帮助统一形状语言，边框与表面差异帮助识别区域，阴影可暗示视觉深度。先考虑内容、边界和可读性，再决定是否需要阴影；更大、更黑不等于设计质量更高。本例状态还有文字、符号与
        aria-pressed，焦点有独立 outline；去掉阴影也不会丢失操作提示。不要把
        border-radius 当作自动裁切所有后代内容的开关。
      </Note>
    </>
  );
}
function AlphaAsset({ data, method }) {
  const path =
    data.shape === "ring"
      ? "M100 18a52 52 0 1 0 0 104a52 52 0 1 0 0-104M100 48a22 22 0 1 1 0 44a22 22 0 1 1 0-44"
      : "M28 20H172V46C152 46 152 74 172 74V120H28V94C48 94 48 66 28 66ZM78 44H122V96H78Z";
  return (
    <svg
      className="alpha-asset"
      data-testid={"asset-" + method}
      width="190"
      height="133"
      viewBox="0 0 200 140"
      role="img"
      aria-label={
        (data.shape === "ring" ? "中间镂空的圆环" : "中间镂空的票券") +
        "，" +
        (data.opaque ? "铺白底" : "透明背景")
      }
      style={{
        background: "transparent",
        boxShadow:
          method === "box"
            ? `0 ${data.offset}px ${data.blur}px ${data.spread}px rgba(50, 32, 80, 0.55)`
            : "none",
        filter:
          method === "alpha"
            ? `drop-shadow(0 ${data.offset}px ${data.blur}px rgba(50, 32, 80, 0.55))`
            : "none",
      }}
    >
      {data.opaque && <rect width="200" height="140" fill="#ffffff" />}
      <path d={path} fill="#7964a6" fillRule="evenodd" />
    </svg>
  );
}
function ShadowLab({ data, patch }) {
  return (
    <>
      <div className="surface-lab">
        <div className="panel-heading">
          <span>
            <i className="live-dot" />
            同一素材，两种投影对象
          </span>
          <span className="micro">棋盘格代表透明 · 虚线标出元素盒</span>
        </div>
        <div className="shadow-object-grid">
          {[
            [
              "box",
              "box-shadow",
              "围绕元素的边框盒及圆角绘制；透明镂空不改变它的作用对象。",
            ],
            [
              "alpha",
              "filter: drop-shadow()",
              "跟随渲染结果的 alpha。透明镂空与背景都会影响轮廓。",
            ],
          ].map(([method, title, desc]) => (
            <section key={method} className="shadow-object-panel">
              <h3>{title}</h3>
              <div className="alpha-board">
                <div className="asset-guide">
                  <AlphaAsset data={data} method={method} />
                </div>
              </div>
              <p>{desc}</p>
            </section>
          ))}
        </div>
        <div className="surface-reading" role="status">
          {data.shape === "ring" ? "圆环" : "票券"} ·{" "}
          {data.opaque
            ? "白底已成为渲染结果的一部分，两边的投影都会参考矩形表面。"
            : "背景与镂空透明，右侧可沿可见轮廓投影。"}{" "}
          偏移 {data.offset}px，模糊参数 {data.blur}px；box-shadow 扩散{" "}
          {data.spread}px。
        </div>
        <div className="surface-controls">
          <Choices
            label="透明素材形状"
            values={[
              ["ticket", "票券"],
              ["ring", "圆环"],
            ]}
            value={data.shape}
            onChange={(shape) =>
              patch({
                shape,
                shapeChanged: data.shapeChanged || shape !== "ticket",
              })
            }
          />
          <Choices
            label="向下偏移"
            values={[
              [4, "4px"],
              [14, "14px"],
            ]}
            value={data.offset}
            onChange={(offset) =>
              patch({
                offset,
                offsetChanged: data.offsetChanged || offset !== 4,
              })
            }
          />
          <Choices
            label="模糊参数"
            values={[
              [0, "0px"],
              [8, "8px"],
              [16, "16px"],
            ]}
            value={data.blur}
            onChange={(blur) =>
              patch({ blur, blurChanged: data.blurChanged || blur !== 8 })
            }
          />
          <Choices
            label="box-shadow 扩散"
            values={[
              [0, "0px"],
              [8, "8px"],
            ]}
            value={data.spread}
            onChange={(spread) => patch({ spread })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.opaque}
              onChange={(e) =>
                patch({
                  opaque: e.target.checked,
                  opaqueTested: data.opaqueTested || e.target.checked,
                })
              }
            />
            给透明素材铺白底
          </label>
        </div>
      </div>
      <Note title="同一个模糊数字，不保证同样柔和">
        box-shadow 的模糊半径与 drop-shadow
        的高斯模糊标准差含义不同，不能机械互换数值。box-shadow 还支持 spread 与
        inset，drop-shadow() 不接受这些参数；本实验的扩散只改变左侧。filter 不为
        none
        还会建立层叠上下文，不能把它当成完全不影响层叠关系的装饰。简单卡片通常先考虑
        box-shadow，透明图形再评估 drop-shadow，并检查目标浏览器、裁切和性能。
      </Note>
    </>
  );
}
function ElevationLab({ data, patch }) {
  const ref = useRef(null),
    [probe, setProbe] = useState(null),
    [reading, setReading] = useState("尚未测量；选择规则后，点击下方按钮。");
  const measure = () => {
    const stage = ref.current;
    window.scrollTo({
      top: window.scrollY + stage.getBoundingClientRect().top - 70,
      behavior: "instant",
    });
    requestAnimationFrame(() => {
      if (!stage.isConnected) return;
      const a = stage
          .querySelector('[data-elevation="A"]')
          .getBoundingClientRect(),
        b = stage.querySelector('[data-elevation="B"]').getBoundingClientRect(),
        r = stage.getBoundingClientRect(),
        x = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2,
        y = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2;
      const layer = document.elementFromPoint(x, y)?.closest("[data-elevation]")
        ?.dataset.elevation;
      if (!layer) {
        setReading("当前重叠点不在可见区域，请把实验区带入视口后重试。");
        return;
      }
      setProbe({ left: x - r.left, top: y - r.top });
      setReading(
        `真实命中：${layer} 在重叠点上方。A 的 z-index=${data.layerZ}，B=2；A ${data.layerShadow === "none" ? "无阴影" : "有较强阴影"}。`,
      );
      patch((old) => ({
        measuredBack:
          old.measuredBack ||
          (layer === "B" && data.layerZ === 1 && data.layerShadow === "deep"),
        measuredFront:
          old.measuredFront || (layer === "A" && data.layerZ === 3),
      }));
    });
  };
  const change = (x) => {
    setReading("规则已变化，请重新测量重叠点。");
    patch(x);
  };
  return (
    <>
      <div className="surface-lab">
        <div className="panel-heading">
          <span>
            <i className="live-dot" />
            视觉 elevation 与真实遮挡
          </span>
          <span className="micro">本实验隔离在局部层叠上下文</span>
        </div>
        <p className="elevation-warning">
          这里故意交叠两个只读图形。全部操作都在画布外，遮挡不是把重要按钮藏起来；完整规则和测量结果在下方可读。
        </p>
        <div
          ref={ref}
          className="elevation-stage"
          data-testid="elevation-stage"
        >
          <div
            className="elevation-tile elevation-a"
            data-elevation="A"
            style={{
              zIndex: data.layerZ,
              boxShadow: surfaceShadows[data.layerShadow],
            }}
          >
            <strong>A · 有色表面</strong>
            <span>z-index: {data.layerZ}</span>
          </div>
          <div className="elevation-tile elevation-b" data-elevation="B">
            <strong>B · 白色表面</strong>
            <span>z-index: 2</span>
          </div>
          {probe && (
            <span
              className="elevation-probe"
              style={probe}
              aria-hidden="true"
            />
          )}
        </div>
        <div
          className="surface-reading"
          role="status"
          data-testid="elevation-result"
        >
          {reading}
        </div>
        <div className="surface-controls">
          <Choices
            label="A 的视觉阴影"
            values={[
              ["none", "无阴影"],
              ["deep", "较强阴影"],
            ]}
            value={data.layerShadow}
            onChange={(layerShadow) => change({ layerShadow })}
          />
          <Choices
            label="A 的真实 z-index"
            values={[
              [1, "1 · 低于 B"],
              [3, "3 · 高于 B"],
            ]}
            value={data.layerZ}
            onChange={(layerZ) => change({ layerZ })}
          />
          <button className="elevation-measure" onClick={measure}>
            测量真实重叠点
          </button>
        </div>
      </div>
      <Note title="影子是深度暗示，不是排序命令">
        同一实验上下文中，A 的 box-shadow 变大也不会自动越过 z-index: 2 的 B；把
        A 提到 3 才改变本例实际遮挡。box-shadow
        不改变普通流中的占位；墨迹范围与元素盒不同。真实界面还要检查父层叠上下文，不能在全页面只比较数字。视觉
        elevation 也不自动提供真正浮层的语义、焦点或背景交互管理。
      </Note>
    </>
  );
}
function SurfaceReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第七节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本节使用真实 CSS 圆角、边框、背景、box-shadow 与 filter:
          drop-shadow()。透明素材是原创
          SVG；不是换截图，也不声称根据截图可确定实际技术。比较阴影作用对象，避免把视觉
          elevation 与层叠顺序混为一谈。
        </p>
        <p>
          表面预设保留深色正文；状态使用文字、符号与语义，焦点另有独立轮廓。按目标浏览器检查
          filter
          的兼容性、层叠影响、裁切与绘制成本。阴影不应代替必要边界或重要信息；不把夸张投影当作“高级感”验收标准。
        </p>
        <div className="source-links">
          {surfaceSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonSeven({ onStorageStatus }) {
  const [data, setData] = useState(readSurfaceProgress),
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
      localStorage.setItem(SURFACE_STORAGE, JSON.stringify(data));
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
      [data.radiusChanged && data.borderChanged, "分别改变圆角与边框"],
      [data.brightnessChanged, "比较表面亮度"],
      [
        ["none", "deep"].every((v) => data.shadowsSeen.includes(v)),
        "比较无阴影与较强阴影",
      ],
      [data.stateUsed, "操作已读状态，观察文字与语义"],
    ],
    [
      [data.shapeChanged, "改变透明素材轮廓"],
      [data.blurChanged && data.offsetChanged, "改变模糊与向下偏移"],
      [data.opaqueTested, "铺上白底，观察 alpha 的变化"],
    ],
    [
      [data.measuredBack, "A 有较强阴影但 z=1 时测量重叠点"],
      [data.measuredFront, "把 A 提到 z=3 后重新测量"],
    ],
    surfaceQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成可编辑的表面层次指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查表面、边界、可读性、状态与焦点",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = surfaceSteps[data.step];
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
      setNotice("第七节已完成。" + nextLessonHint(6));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const scenario =
      data.brief === "card"
        ? `实现一个可读的资料卡片界面：从页面基底、卡片表面、内容与操作区区分层次。可参考 ${data.radius}px 圆角、${data.border}px 边框和${data.shadow === "none" ? "无阴影" : data.shadow === "soft" ? "轻阴影" : "较强阴影"}，但要按实际内容复核，不把数值当成质量标准。`
        : "为有透明轮廓与镂空的图形选择投影：比较元素边框盒的 box-shadow 与渲染 alpha 的 filter: drop-shadow()，确认素材是否带不透明背景，避免仅凭 SVG 扩展名决定。";
    const draft = `请在现有项目中${scenario}

表面合同：说明页面基底、普通卡片与需要强调的表面分别怎样区分；先考虑内容、留白、边界与表面亮度，再决定是否需要阴影。不用“加大阴影就高级”作为验收标准。圆角、边框、阴影参数保持一致的规则，检查长内容、窄容器和相邻表面的可读边界。

投影与真实排序：box-shadow 参考边框盒与圆角；drop-shadow() 参考渲染 alpha，白底、镂空与后代都会影响结果。模糊半径和标准差含义不同，不能机械互换；drop-shadow 不接受 spread / inset。filter 不为 none 可建立层叠上下文。视觉 elevation 只是深度暗示，不能代替 z-index、父层叠上下文或真实浮层的交互责任。

状态与焦点：不得仅以颜色或阴影表达已选、错误、已读等状态，同时提供清楚的文字、符号和适当语义。键盘焦点有独立且可见的指示；即使移除全部阴影，状态与操作仍应可理解。

验收：
1. 在 375px 手机和 1440px 桌面调节圆角、边框、表面亮度与阴影，正文完整可读、重要操作不被裁切，课程或页面不横向溢出。
2. 比较透明与不透明素材、无阴影与较强阴影；区分投影的对象、墨迹范围和布局占位，避免错误裁切。
3. 用原生命中测试或 DevTools 核对实际遮挡，不根据阴影大小推断绘制顺序。
4. 用完整键盘与纯触屏操作状态、反馈和入口；移除阴影、缩放和更长内容时，焦点与非颜色提示仍然保留。
${data.includeEdges ? "5. 检查目标浏览器、filter 对层叠上下文的影响、大面积模糊的绘制成本与强制颜色环境；不要为简单表面效果添加动画库。" : "5. 保留清晰边界与基础无阴影样式，并复核目标浏览器。"}

请先说明表面层次、边界与可读性约束，以及状态和焦点方案，再实现并逐条自测。截图只能提供外观线索，不能确定真实技术。`;
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
      localStorage.removeItem(SURFACE_STORAGE);
    } catch {}
    setData(surfaceInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第七节的进度、参数与草稿；前六节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-seven">
      <div className="lesson-overline">
        <span className="pill">第七节 · 圆角、阴影与层级</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            圆角、阴影与层级<span className="title-period">.</span>
          </h1>
          <p>用表面和边界组织信息，用真实规则判断遮挡。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>07</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 调节表面与边界
        </span>
        <span>
          <Icon type="check" size={16} /> 判断阴影作用对象
        </span>
        <span>
          <Icon type="check" size={16} /> 分开视觉与排序
        </span>
      </div>
      <nav className="stepper" aria-label="第七节学习步骤">
        {surfaceSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="surface-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            SURFACE LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="surface-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <SurfaceLab data={data} patch={patch} />}
        {data.step === 1 && <ShadowLab data={data} patch={patch} />}
        {data.step === 2 && <ElevationLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {surfaceQuestions.map((q, i) => {
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
              <h3>你的表面简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="card">界面表面与状态</option>
                  <option value="asset">透明素材投影</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入绘制成本与强制颜色验收
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成表面草稿" : "生成表面指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的表面指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制表面指令
                </button>
              </div>
              <label className="sr-only" htmlFor="surface-agent-draft">
                可编辑的 表面 Agent 指令
              </label>
              <textarea
                id="surface-agent-draft"
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
                placeholder="生成后，补充你需要的表面层次、边界与可读性要求。"
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
                我已检查表面、边界、状态、焦点和验收方式。
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
                  ? "完成第七节"
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
          重置第七节进度
        </button>
      </div>
      <SurfaceReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="surface-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="surface-reset-title">重新开始第七节？</h2>
        <p>仅清除第七节的进度、实验参数和草稿；前六节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第七节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第七节
          </button>
        </div>
      </dialog>
    </div>
  );
}
