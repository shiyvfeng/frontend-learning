import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  MASK_STORAGE,
  maskSteps,
  maskQuestions,
  clipValue,
  maskValue,
  maskEffect,
  maskSources,
  maskInitial,
  readMaskProgress,
} from "./lesson-ten-content";
import "./lesson-ten.css";
const add = (a, v) => [...new Set([...a, v])];
const modeOptions = [
  ["none", "完整素材"],
  ["clip", "clip-path · 几何"],
  ["mask", "mask · 透明"],
];
function Artwork() {
  return (
    <svg
      className="mask-artwork"
      viewBox="0 0 600 360"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect width="600" height="360" fill="#263d5c" />
      <circle cx="420" cy="98" r="60" fill="#f1bd79" />
      <path d="M0 245 165 64 340 276 485 151 600 263V360H0Z" fill="#9c8abb" />
      <path d="M0 265 140 170 305 310 445 232 600 310V360H0Z" fill="#69b7ae" />
      <path
        d="M0 321Q70 300 140 321T280 321T420 321T560 321T700 321"
        fill="none"
        stroke="#d4efde"
        strokeWidth="9"
      />
      <path
        d="M0 346Q70 325 140 346T280 346T420 346T560 346T700 346"
        fill="none"
        stroke="#345d73"
        strokeWidth="7"
      />
    </svg>
  );
}
function BoundaryLab({ data, patch }) {
  const material = useRef(null),
    original = useRef(null),
    [report, setReport] = useState("尚未检查；节点和尺寸可直接测量。");
  useEffect(() => {
    original.current = material.current?.querySelector("svg");
  }, []);
  const effect = maskEffect(
    data.mode,
    data.shape,
    data.extent,
    data.direction,
    data.tone,
  );
  const inspect = () => {
    const el = material.current,
      r = el.getBoundingClientRect();
    setReport(
      `素材仍在 DOM：${el.isConnected ? "是" : "否"}；原 SVG 节点未替换：${original.current === el.querySelector("svg") ? "是" : "否"}；参考盒 ${Math.round(r.width)} × ${Math.round(r.height)}px。视觉隐藏没有删除这个节点。`,
    );
    patch({ inspected: true });
  };
  return (
    <>
      <div className="mask-lab">
        <div className="panel-heading">
          <span>同一原创 SVG · 只改变绘制边界</span>
          <span className="code-tag">静态 CSS</span>
        </div>
        <p className="mask-warning">
          教学故意裁切：仅改变下方素材的绘制，外部说明和操作不参与裁切。
        </p>
        <div className="mask-canvas">
          <div className="mask-frame">
            <div
              ref={material}
              className="mask-material"
              role="img"
              aria-label="完整素材：太阳、山丘与波纹；当前仅改变视觉显示"
              data-intentional-visual="material"
              data-testid="boundary-material"
              style={effect.style}
            >
              <Artwork />
            </div>
          </div>
        </div>
        <div className="mask-reading" data-testid="boundary-reading">
          {!effect.supported
            ? "所选效果不受支持：已完整显示素材，不把回退当作裁切成功。"
            : data.mode === "none"
              ? "完整显示：保留原始矩形素材。"
              : data.mode === "clip"
                ? "几何 clip-path：轮廓内绘制，轮廓外不绘制；边缘可能有抗锯齿。"
                : "渐变 mask：按 alpha 改变显示程度，不透明区保留，transparent 区隐藏；本实验黑白不透明区等效。"}
          <code>
            {data.mode === "clip"
              ? clipValue(data.shape, data.extent)
              : data.mode === "mask"
                ? maskValue(data.direction, data.extent, data.tone)
                : "clip-path: none; mask-image: none"}
          </code>
          完整素材说明始终保留：深蓝天空、右上太阳、两层山丘与底部波纹。
        </div>
        <div className="mask-controls">
          <Choices
            label="视觉处理方式"
            value={data.mode}
            values={modeOptions}
            onChange={(v) =>
              patch((old) => ({ mode: v, modesSeen: add(old.modesSeen, v) }))
            }
          />
          <Choices
            label="显示范围参数"
            value={data.extent}
            values={[
              [35, "35%"],
              [60, "60%"],
              [85, "85%"],
            ]}
            onChange={(v) =>
              patch({
                extent: v,
                rangeChanged:
                  data.rangeChanged || (data.mode !== "none" && v !== 60),
              })
            }
          />
          <Choices
            label="几何轮廓"
            value={data.shape}
            values={[
              ["inset", "inset · 直边"],
              ["circle", "circle · 圆形"],
              ["polygon", "polygon · 斜边"],
            ]}
            onChange={(v) => patch({ shape: v })}
          />
          <Choices
            label="渐隐方向"
            value={data.direction}
            values={[
              ["right", "向右"],
              ["down", "向下"],
              ["radial", "从中心向外"],
            ]}
            onChange={(v) => patch({ direction: v })}
          />
          <Choices
            label="alpha 遮罩颜色"
            value={data.tone}
            values={[
              ["black", "黑色不透明"],
              ["white", "白色不透明"],
            ]}
            onChange={(v) => patch({ tone: v })}
          />
          <button className="mask-action" onClick={inspect}>
            检查素材节点与占位
          </button>
        </div>
        <div className="mask-reading" role="status" data-testid="dom-report">
          {report}
        </div>
      </div>
      <Note title="绘制少了，不等于内容被删除">
        clip-path 按几何轮廓裁切，mask 按遮罩值调节绘制；两者都不会因此删除
        DOM，布局参考盒也不是可见像素的包围框。不同形状和渐变的百分比有不同含义，不表示相同面积。几何控件只作用于
        clip，方向与遮罩颜色只作用于 mask；本课不自动播放动画。
      </Note>
    </>
  );
}
function HitLab({ data, patch }) {
  const group = useRef(null),
    board = useRef(null),
    focusProbe = useRef(null),
    busy = useRef(false),
    [result, setResult] = useState(null),
    [pointer, setPointer] = useState("可选：点击画布观察指针实际落在哪层。");
  const effect = maskEffect(data.hitMode, "inset", 50, "right", "black");
  const measure = (e) => {
    if (busy.current) return;
    busy.current = true;
    const trigger = e.currentTarget;
    group.current.scrollIntoView({ block: "start", behavior: "auto" });
    const r = board.current.getBoundingClientRect(),
      layer = (x) =>
        document
          .elementFromPoint(r.left + r.width * x, r.top + r.height * 0.5)
          ?.closest("[data-hit-layer]")?.dataset.hitLayer || "其他";
    const a = layer(0.25),
      b = layer(0.88);
    focusProbe.current.focus({ preventScroll: true });
    const focused = document.activeElement === focusProbe.current;
    trigger.focus({ preventScroll: true });
    const returned = document.activeElement === trigger,
      expectedB =
        data.hitMode === "clip" && effect.supported ? "underlay" : "material",
      valid = a === "material" && b === expectedB && focused && returned;
    setResult({
      mode: data.hitMode,
      supported: effect.supported,
      a,
      b,
      focused,
      returned,
    });
    if (valid)
      patch((old) => ({
        clipMeasured: old.clipMeasured || data.hitMode === "clip",
        maskMeasured: old.maskMeasured || data.hitMode === "mask",
        focusVerified: true,
      }));
    busy.current = false;
  };
  return (
    <>
      <div className="mask-lab">
        <div className="panel-heading">
          <span>真实命中 + 同步焦点探针</span>
          <span className="code-tag">浏览器测量</span>
        </div>
        <p className="mask-warning">
          教学故意隐藏：素材层和无操作探针会被处理；所有主要按钮在画布外。探针不进入正常
          Tab 顺序。
        </p>
        <div className="mask-controls">
          <Choices
            label="命中实验样式"
            value={data.hitMode}
            values={modeOptions}
            onChange={(v) => {
              patch({ hitMode: v });
              setResult(null);
            }}
          />
        </div>
        <div className="mask-probe-group" ref={group}>
          <div className="mask-probe-toolbar">
            <button className="mask-action" onClick={measure}>
              测量命中与焦点
            </button>
            <span>两个固定取样点，不需要精细点按</span>
          </div>
          <div
            ref={board}
            className="mask-hit-board"
            data-testid="hit-board"
            onPointerDown={(e) => {
              const target = e.target.closest("[data-hit-layer]");
              setPointer(
                `这次指针命中：${target?.dataset.hitLayer === "material" ? "素材层" : target?.dataset.hitLayer === "underlay" ? "底层" : "画布边界"}。`,
              );
            }}
          >
            <div
              className="mask-hit-underlay"
              data-hit-layer="underlay"
              aria-hidden="true"
            />
            <div
              className="mask-hit-material"
              data-hit-layer="material"
              data-intentional-visual="material"
              data-testid="hit-material"
              style={effect.style}
            >
              <Artwork />
              <div
                className="mask-focus-probe"
                tabIndex={-1}
                role="group"
                aria-label="教学焦点探针，无操作，不在正常 Tab 顺序"
                ref={focusProbe}
                data-testid="focus-probe"
              />
            </div>
            <span className="mask-pin pin-a" aria-hidden="true">
              A
            </span>
            <span className="mask-pin pin-b" aria-hidden="true">
              B
            </span>
          </div>
          <p className="mask-point-caption">
            A：宽度 25% · B：宽度 88%；两点均在半高处。clip 只保留左侧 50%；mask
            到右侧 50% 已完全透明。
          </p>
          <div className="mask-reading" role="status" data-testid="hit-result">
            {result ? (
              <>
                <strong>
                  {!result.supported && result.mode !== "none"
                    ? "当前是完整显示回退；未应用所选效果。"
                    : result.mode === "clip"
                      ? "clip 几何命中结果"
                      : result.mode === "mask"
                        ? "mask 透明区命中结果"
                        : "完整素材命中结果"}
                </strong>
                <br />A 命中：
                {result.a === "material"
                  ? "素材层"
                  : result.a === "underlay"
                    ? "底层"
                    : "其他"}
                ；B 命中：
                {result.b === "material"
                  ? "素材层"
                  : result.b === "underlay"
                    ? "底层"
                    : "其他"}
                。<br />
                探针可程序性聚焦：{result.focused ? "是" : "否"}
                ；焦点已返回可见测量按钮：{result.returned ? "是" : "否"}。
              </>
            ) : (
              "本次尚未测量。请分别选择 clip 和 mask，再按测量按钮。"
            )}
          </div>
          <p className="mask-pointer-reading">{pointer}</p>
        </div>
      </div>
      <Note title="透明、命中与焦点要分别验收">
        标准规定 clip 排除轮廓外的命中，mask-image 不改变 CSS
        盒的几何或命中测试。这里用 elementFromPoint 读取实际结果；CSS
        视觉效果也没有自动禁止程序性焦点。测量只在同一个同步事件内短暂聚焦无操作探针，立即返回可见按钮，不让学员停在不可见控件上。这不是对全部辅助技术行为的证明；真实主要操作仍须放在可见层并检查
        Tab 顺序。
      </Note>
    </>
  );
}
function SafeLab({ data, patch }) {
  const effect = maskEffect(
    data.safeMode,
    "inset",
    data.safeExtent,
    data.safeDirection,
    data.tone,
    data.forceFallback,
  );
  return (
    <>
      <div className="mask-lab">
        <div className="panel-heading">
          <span>安全卡片 · 效果只在素材层</span>
          <span className="code-tag">渐进增强</span>
        </div>
        <p className="mask-warning">
          教学故意裁切仅处理素材；正文和主要操作不在效果层内。
        </p>
        <div className="mask-safe-card">
          <div className="mask-frame safe-image">
            <div
              className="mask-material"
              role="img"
              aria-label="被视觉处理的原创风景；完整素材可在下方展开"
              data-intentional-visual="material"
              data-testid="safe-material"
              style={effect.style}
            >
              <Artwork />
            </div>
          </div>
          <div className="mask-safe-copy">
            <span className="mask-label">◇ 完整信息保持可读</span>
            <h3>主要操作不放进裁切范围</h3>
            <p>
              这段正文、状态与按钮位于素材层外。看不见的像素不代表内容不存在；需要完整素材时，可使用下方展开入口。
            </p>
            <span className="mask-state" role="status">
              {data.marked
                ? "✓ 已查看 · 文字状态保留"
                : "○ 待查看 · 文字状态保留"}
            </span>
            <button
              className="mask-action"
              aria-pressed={data.marked}
              onClick={() =>
                patch((old) => ({ marked: !old.marked, actionUsed: true }))
              }
            >
              切换查看状态
            </button>
          </div>
        </div>
        <div className="mask-reading" data-testid="fallback-reading">
          {effect.supported
            ? "所选声明获得支持，效果仅处理上方素材。"
            : "无支持回退：完整显示素材，正文、按钮与完整访问入口都保留。"}{" "}
          本例检查标准属性及 WebKit 的 mask-image 前缀，不把前缀支持等同于所有
          mask-mode 能力。
        </div>
        <div className="mask-controls">
          <Choices
            label="安全卡片效果"
            value={data.safeMode}
            values={[
              ["clip", "clip · 直边"],
              ["mask", "mask · 渐隐"],
            ]}
            onChange={(v) => patch({ safeMode: v })}
          />
          <Choices
            label="安全卡片范围"
            value={data.safeExtent}
            values={[
              [35, "35%"],
              [60, "60%"],
              [85, "85%"],
            ]}
            onChange={(v) => patch({ safeExtent: v })}
          />
          <Choices
            label="安全卡片渐隐方向"
            value={data.safeDirection}
            values={[
              ["right", "向右"],
              ["down", "向下"],
            ]}
            onChange={(v) => patch({ safeDirection: v })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.forceFallback}
              onChange={(e) =>
                patch({ forceFallback: e.target.checked, fallbackTested: true })
              }
            />
            模拟所选效果不受支持
          </label>
        </div>
        <details
          className="mask-full-details"
          onToggle={(e) => {
            if (e.currentTarget.open) patch({ fullSeen: true });
          }}
        >
          <summary>查看完整素材与说明</summary>
          <div className="mask-full-art" data-testid="full-art">
            <Artwork />
          </div>
          <p>
            完整素材由深蓝天空、右上太阳、两层山丘与底部波纹组成。这份说明和所有主要操作都不参与视觉裁切。
          </p>
        </details>
      </div>
      <Note title="alpha，不是所有遮罩的唯一模式">
        本实验用 CSS 渐变的 alpha：不透明黑色和白色都保留素材。luminance
        还取决于亮度与 alpha；SVG &lt;mask&gt;
        的默认来源模式需另外核对。本课不演示
        luminance，也不把旧前缀支持当作它的兼容保证。重要信息与交互采用稳定可读的基础结构，再按能力增强。
      </Note>
    </>
  );
}
function MaskReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本节对同一原创 SVG 使用真实 clip-path 与 CSS 渐变
          mask，静态比较绘制、DOM、布局及命中。依 CSS Masking
          标准，几何裁切影响命中，mask-image 不改变 CSS
          盒的几何与命中；具体浏览器仍需实测。CSS 渐变按 alpha，来源为 SVG
          &lt;mask&gt; 时不要机械套用这条默认规则。本例有声明能力检查、WebKit
          mask-image
          前缀与完整显示回退；教学中的故意隐藏均已标记，主要操作在效果层外。路线总核对日期仍为
          2026-10-20，不宣称永远最新。
        </p>
        <div className="source-links">
          {maskSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTen({ onStorageStatus }) {
  const [data, setData] = useState(readMaskProgress),
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
      localStorage.setItem(MASK_STORAGE, JSON.stringify(data));
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
        ["none", "clip", "mask"].every((v) => data.modesSeen.includes(v)),
        "比较完整 / 几何裁切 / 透明遮罩",
      ],
      [data.rangeChanged, "改变实际显示范围"],
      [data.inspected, "检查素材节点与布局尺寸"],
    ],
    [
      [data.clipMeasured, "测量 clip 的命中（不支持时检查回退）"],
      [data.maskMeasured, "测量 mask 的命中（不支持时检查回退）"],
      [data.focusVerified, "检查探针焦点并返回可见按钮"],
    ],
    [
      [data.fallbackTested, "检查无支持回退"],
      [data.fullSeen, "展开完整素材与说明"],
      [data.actionUsed, "操作效果层外的可见按钮"],
    ],
    maskQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成可编辑的裁切指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查轮廓、渐隐、命中、焦点与回退",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = maskSteps[data.step];
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
      setNotice("第十节已完成。" + nextLessonHint(9));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const card = data.brief === "card",
      mode = card ? data.safeMode : data.mode === "none" ? "clip" : data.mode,
      extent = card ? data.safeExtent : data.extent,
      direction = card ? data.safeDirection : data.direction,
      shape = card ? "inset" : data.shape;
    const effect =
      mode === "clip"
        ? `clip-path: ${clipValue(shape, extent)}`
        : `mask-image: ${maskValue(direction, extent, data.tone)}；CSS 渐变按 alpha 工作`;
    const draft = `请在现有项目中${card ? "实现裁切装饰素材与可操作卡片的安全组合" : "为同一份素材实现可调的裁切或渐隐"}。先说明需要的显示边界与布局约束，不从截图断言真实技术。

视觉合同：可从 ${effect} 起步。百分比相对于素材的本地参考盒；明确轮廓、保留范围与渐隐方向，不把不同算法的同一个数值当作相同可见面积。clip-path 用几何边界保留区域；mask 用遮罩透明度控制绘制，本方案不混用 luminance 的黑白规则。模糊、遮罩或裁切不能用于悄悄隐藏重要信息来修补布局。

结构与语义：把效果限制在装饰素材层。视觉隐藏不等于删除 DOM、语义或焦点目标；重要说明、状态与按钮保留在清楚可见的层。为完整素材提供说明和可操作的展开途径，不把重要文字放进渐隐区域。检查原有布局占位和父层叠范围，不靠绝对坐标拼普通内容。

交互合同：clip-path 会限制轮廓外的命中；mask-image 的透明区不自动退出 CSS 盒的命中测试。明确哪些区域应接收点击、哪些应穿透，并使用 elementFromPoint 和真实触屏/鼠标操作验证。不要把 pointer-events 或透明像素当作全部键盘方案。主要控件始终可见、可 Tab 到达且焦点清楚；关闭、展开和状态切换都提供触屏路径，不设置必须按 Esc 才能完成的门槛。

兼容回退：对所用 clip-path 形状、mask-image 的具体声明用 CSS.supports / @supports 检查；需要旧 WebKit 前缀时同时检查与设置 -webkit-mask-image。前缀支持不等于完整 mask-mode 功能。本例 CSS 渐变使用 alpha，不宣称演示了 SVG <mask> 或 luminance。若不支持，完整显示素材或采用清楚的简单边界，保留全部正文与操作，不伪装成效果已成功。

验收：
1. 在桌面与 375px 手机切换几何裁切 / 渐变遮罩，改变轮廓、方向与范围，检查真实像素结果。
2. 核对裁切前后 DOM、名称和布局占位；对重要内容检查完整访问途径，不把视觉隐藏误当成语义删除。
3. 测量可见与透明 / 轮廓外的点，验证命中策略；完整走键盘与纯触屏操作，检查焦点不落入不可见主要控件。
4. 强制无支持回退，检查完整素材、文字、边界与主要按钮；检查长内容与局部裁切，课程或页面本体不横向溢出。
${data.includeEdges ? "5. 当前使用静态方案。若后来增加动态，提供暂停、prefers-reduced-motion 与静态替代；按目标设备实测绘制成本，不虚构性能结论。" : "5. 保持静态、可读与可操作的基础方案，并核对目标浏览器。"}

请先说明裁切轮廓或渐隐方向、素材参考盒、交互命中、焦点和回退，再实现并逐条自测。`;
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
      localStorage.removeItem(MASK_STORAGE);
    } catch {}
    setData(maskInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十节的进度、参数与草稿；前九节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-ten">
      <div className="lesson-overline">
        <span className="pill">第十节 · Mask / Clip Path</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Mask / Clip Path<span className="title-period">.</span>
          </h1>
          <p>可见的边界，不是内容存在的边界。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>10</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 分清几何与透明
        </span>
        <span>
          <Icon type="check" size={16} /> 验证命中与焦点
        </span>
        <span>
          <Icon type="check" size={16} /> 保留完整访问
        </span>
      </div>
      <nav className="stepper" aria-label="第十节学习步骤">
        {maskSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="mask-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            MASK LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="mask-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <BoundaryLab data={data} patch={patch} />}
        {data.step === 1 && <HitLab data={data} patch={patch} />}
        {data.step === 2 && <SafeLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {maskQuestions.map((q, i) => {
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
              <h3>你的裁切简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="art">素材的裁切与渐隐</option>
                  <option value="card">可操作卡片的安全组合</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入动态偏好与性能边界
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成裁切草稿" : "生成裁切指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的裁切指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制裁切指令
                </button>
              </div>
              <label className="sr-only" htmlFor="mask-agent-draft">
                可编辑的 裁切 Agent 指令
              </label>
              <textarea
                id="mask-agent-draft"
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
                placeholder="生成后，补充裁切轮廓、渐隐方向、命中与回退要求。"
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
                我已检查轮廓、渐隐、命中、焦点和回退。
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
                  ? "完成第十节"
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
          重置第十节进度
        </button>
      </div>
      <MaskReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="mask-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="mask-reset-title">重新开始第十节？</h2>
        <p>仅清除第十节的进度、实验参数和草稿；前九节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十节
          </button>
        </div>
      </dialog>
    </div>
  );
}
