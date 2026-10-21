import React, { useEffect, useRef, useState, useId } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import { Choices, Note } from "./lesson-two";
import {
  VECTOR_STORAGE,
  vectorSteps,
  vectorQuestions,
  vectorSources,
  vectorInitial,
  readVectorProgress,
  months,
  pathD,
} from "./lesson-eleven-content";
import "./lesson-eleven.css";
const add = (a, v) => [...new Set([...a, v])];
const pinD =
  "M50 88 C40 74 24 55 24 40 A26 26 0 1 1 76 40 C76 55 60 74 50 88 Z";
function Pin({
  size = 128,
  box = 100,
  stroke = 4,
  fill = "soft",
  color = "violet",
  nonScaling = false,
  decorative = false,
  svgRef,
  testId,
  title = "路线目的地",
  desc = "原创位置标记，由一条封闭路径和一个内圆组成。",
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      ref={svgRef}
      data-testid={testId}
      data-vector-demo="pin"
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      focusable="false"
      aria-labelledby={decorative ? undefined : `${id}-title`}
      aria-describedby={decorative ? undefined : `${id}-desc`}
    >
      {!decorative && (
        <>
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{desc}</desc>
        </>
      )}
      <g
        stroke={color === "teal" ? "#176d68" : "#5b4bce"}
        strokeWidth={stroke}
        strokeLinejoin="round"
        fill={
          fill === "none" ? "none" : color === "teal" ? "#d8eeea" : "#e9e4fb"
        }
      >
        <path
          d={pinD}
          vectorEffect={nonScaling ? "non-scaling-stroke" : undefined}
        />
        <circle
          cx="50"
          cy="40"
          r="9"
          fill="none"
          vectorEffect={nonScaling ? "non-scaling-stroke" : undefined}
        />
      </g>
    </svg>
  );
}
function ScaleLab({ data, patch }) {
  const ref = useRef(null),
    [report, setReport] = useState(null);
  const inspect = () => {
    try {
      const svg = ref.current,
        r = svg.getBoundingClientRect(),
        bbox = svg.querySelector("path").getBBox(),
        matrix = svg.getScreenCTM();
      setReport({
        namespace: svg.namespaceURI,
        size: r.width,
        scale: matrix.a,
        bbox: bbox.width,
        tree: [...svg.children].map((n) => n.localName).join(" → "),
        children: [...svg.querySelector("g").children]
          .map((n) => n.localName)
          .join(" + "),
      });
      patch({ inspected: true });
    } catch {
      setReport({ error: true });
      patch({ inspected: true });
    }
  };
  return (
    <>
      <div className="vector-lab">
        <div className="panel-heading">
          <span>原创路线图标 · 真实 SVG</span>
          <span className="micro">无位图素材</span>
        </div>
        <div className="vector-display">
          <div className="vector-square">
            <Pin
              size={data.size}
              box={data.box}
              stroke={data.strokeWidth}
              fill={data.fill}
              color={data.color}
              nonScaling={data.nonScaling}
              svgRef={ref}
              testId="scale-svg"
            />
          </div>
          <div className="vector-formula">
            <span>显示尺寸</span>
            <strong>
              {data.size} × {data.size}
              <small> CSS px</small>
            </strong>
            <span>本地坐标</span>
            <code>
              viewBox="0 0 {data.box} {data.box}"
            </code>
            <p>轮廓是坐标与指令，不是放大一张截图。</p>
          </div>
        </div>
        <div className="vector-controls">
          <Choices
            label="SVG 显示尺寸"
            values={[
              [80, "80px"],
              [160, "160px"],
              [240, "240px"],
            ]}
            value={data.size}
            onChange={(v) =>
              patch((o) => ({ size: v, sizesSeen: add(o.sizesSeen, v) }))
            }
          />
          <Choices
            label="viewBox 坐标范围"
            values={[
              [100, "100 × 100"],
              [160, "160 × 160"],
            ]}
            value={data.box}
            onChange={(v) =>
              patch((o) => ({
                box: v,
                boxChanged: o.boxChanged || v !== o.box,
              }))
            }
          />
          <Choices
            label="图标描边宽度"
            values={[
              [2, "2 单位"],
              [4, "4 单位"],
              [8, "8 单位"],
            ]}
            value={data.strokeWidth}
            onChange={(v) =>
              patch((o) => ({
                strokeWidth: v,
                strokeChanged: o.strokeChanged || v !== o.strokeWidth,
              }))
            }
          />
          <Choices
            label="图标填充"
            values={[
              ["soft", "浅色 fill"],
              ["none", "fill=none"],
            ]}
            value={data.fill}
            onChange={(v) =>
              patch((o) => ({
                fill: v,
                fillChanged: o.fillChanged || v !== o.fill,
              }))
            }
          />
          <Choices
            label="图标颜色"
            values={[
              ["violet", "紫色"],
              ["teal", "青色"],
            ]}
            value={data.color}
            onChange={(v) => patch({ color: v })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.nonScaling}
              onChange={(e) => patch({ nonScaling: e.target.checked })}
            />
            non-scaling-stroke：描边保持屏幕线宽
          </label>
          <button className="vector-action" onClick={inspect}>
            读取内联 SVG 结构与尺寸
          </button>
        </div>
        <div
          className="vector-reading"
          role="status"
          data-testid="scale-report"
        >
          {report ? (
            report.error ? (
              "测量 API 不可用，请在目标浏览器重试；图形和参数仍可操作。"
            ) : (
              <>
                实际根节点：svg（{report.namespace}）；直接子节点：{report.tree}
                ；g 内：{report.children}。<br />
                读取时显示宽度 {report.size.toFixed(1)}px；每本地单位映射{" "}
                {report.scale.toFixed(2)} CSS px；路径包围盒宽{" "}
                {report.bbox.toFixed(1)} 本地单位。参数改变后可重新读取。
              </>
            )
          ) : (
            "点击读取浏览器中的真实 SVG 层级与尺寸。测量用于解释结构，不是性能跑分。"
          )}
        </div>
      </div>
      <Note title="坐标范围 ≠ 显示尺寸">
        viewBox 的四个数是 min-x、min-y、宽、高。这里等比例映射：同样
        160px，坐标范围从 100 增至 160，轮廓占比变小，也不会自动重新居中。fill
        管内部，stroke 管轮廓；默认线宽也随映射缩放。non-scaling-stroke
        让本例线宽保持屏幕尺寸。矢量最终仍会栅格化到屏幕像素，小图标要检查细线和端点。
      </Note>
    </>
  );
}
function PathLab({ data, patch }) {
  const ref = useRef(null),
    id = useId().replaceAll(":", ""),
    [report, setReport] = useState(null),
    d = pathD(data.bend);
  const inspect = () => {
    try {
      const path = ref.current,
        b = path.getBBox();
      setReport({
        length: path.getTotalLength(),
        width: b.width,
        height: b.height,
      });
      patch({ pathInspected: true });
    } catch {
      setReport({ error: true });
      patch({ pathInspected: true });
    }
  };
  return (
    <>
      <div className="vector-lab">
        <div className="panel-heading">
          <span>二次曲线 · 一个控制点</span>
          <span className="micro">手动静态进度</span>
        </div>
        <div className="vector-path-wrap">
          <svg
            data-testid="path-svg"
            data-vector-demo="path"
            viewBox="0 0 300 180"
            role="img"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-desc`}
          >
            <title id={`${id}-title`}>可调二次曲线</title>
            <desc id={`${id}-desc`}>
              起点 24,138，控制点 150,{data.bend}，终点 276,60。彩色描边显示{" "}
              {data.progress}%；灰线是完整路径参考。
            </desc>
            <g fill="none">
              <path
                d={`M24 138 L150 ${data.bend} L276 60`}
                stroke="#aaa4b5"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <path d={d} stroke="#d4cfde" strokeWidth="2" />
              <path
                ref={ref}
                data-testid="progress-path"
                d={d}
                stroke="#5b4bce"
                strokeWidth={data.pathStroke}
                strokeLinecap={data.cap}
                pathLength="100"
                strokeDasharray="100 100"
                strokeDashoffset={100 - data.progress}
                visibility={data.progress === 0 ? "hidden" : "visible"}
              />
            </g>
            <circle cx="150" cy={data.bend} r="4" fill="#a45823" />
            <g fill="#51415f" fontSize="12">
              <text x="24" y="164">
                起点
              </text>
              <text x="250" y="38">
                终点
              </text>
            </g>
          </svg>
        </div>
        <div className="vector-reading">
          <code>{d}</code>
          <p>
            Q 后的 150,{data.bend}{" "}
            是控制点，不是曲线必经点。橙色点与虚线显示控制关系；操作都在图外。
          </p>
        </div>
        <div className="vector-controls">
          <Choices
            label="曲线控制点 Y"
            values={[
              [24, "24 · 上抬"],
              [90, "90 · 中间"],
              [156, "156 · 下压"],
            ]}
            value={data.bend}
            onChange={(v) =>
              patch((o) => ({
                bend: v,
                bendChanged: o.bendChanged || v !== o.bend,
              }))
            }
          />
          <Choices
            label="路径线宽"
            values={[
              [3, "3 单位"],
              [6, "6 单位"],
              [10, "10 单位"],
            ]}
            value={data.pathStroke}
            onChange={(v) =>
              patch((o) => ({
                pathStroke: v,
                pathStrokeChanged: o.pathStrokeChanged || v !== o.pathStroke,
              }))
            }
          />
          <Choices
            label="描边端点"
            values={[
              ["butt", "butt · 平头"],
              ["round", "round · 圆头"],
            ]}
            value={data.cap}
            onChange={(v) => patch({ cap: v })}
          />
          <Choices
            label="手动描边进度"
            values={[
              [0, "0%"],
              [50, "50%"],
              [100, "100%"],
            ]}
            value={data.progress}
            onChange={(v) =>
              patch((o) => ({
                progress: v,
                progressSeen: add(o.progressSeen, v),
              }))
            }
          />
          <button className="vector-action" onClick={inspect}>
            读取真实路径几何
          </button>
        </div>
        <div className="vector-reading" role="status" data-testid="path-report">
          {report
            ? report.error
              ? "测量 API 不可用；保留静态图形与全部控制，可换目标浏览器重试。"
              : `读取时 getTotalLength = ${report.length.toFixed(1)} 本地单位；几何包围盒 ${report.width.toFixed(1)} × ${report.height.toFixed(1)}。改变路径后可重新读取。`
            : "真实长度由浏览器根据当前曲线计算。"}
        </div>
      </div>
      <Note title="100 是描边标尺，不是实测长度">
        pathLength=100 为 dasharray / dashoffset 等距离计算建立统一标尺。本例 50
        表示半程；getTotalLength 仍返回曲线本地单位的真实计算值。0%
        隐藏彩色描边，灰色参考线仍在。没有自动动画；若以后播放，需暂停、减少动态偏好和静态替代。
      </Note>
    </>
  );
}
function SemanticLab({ data, patch }) {
  const id = useId().replaceAll(":", ""),
    selected = months.find((m) => m.id === data.month);
  return (
    <>
      <div className="vector-lab">
        <div className="vector-controls">
          <Choices
            label="SVG 使用语义"
            values={[
              ["decorative", "装饰图标"],
              ["meaningful", "信息图形"],
              ["chart", "交互图表"],
            ]}
            value={data.semantics}
            onChange={(v) =>
              patch((o) => ({
                semantics: v,
                semanticsSeen: add(o.semanticsSeen, v),
              }))
            }
          />
        </div>
        <div className="vector-semantic">
          {data.semantics === "decorative" && (
            <p>
              按钮文字已表达操作；图标仅装饰，用 aria-hidden=true 避免重复朗读。
            </p>
          )}
          {data.semantics === "meaningful" && (
            <figure>
              <Pin
                title="示例路线目的地：海岸"
                desc="位置标记表示这张示例路线卡的目的地。收藏操作在图外的文本按钮中。"
                testId="meaningful-svg"
              />
              <figcaption>
                目的地：海岸。图形有独立名称与说明，操作留给下方按钮。
              </figcaption>
            </figure>
          )}
          {data.semantics === "chart" && (
            <>
              <p>
                虚构演示数据：每月学习时长。图形是信息载体，选择操作用图外 HTML
                按钮。
              </p>
              <svg
                data-vector-demo="chart"
                data-testid="chart-svg"
                viewBox="0 0 300 180"
                role="img"
                aria-labelledby={`${id}-title`}
                aria-describedby={`${id}-desc`}
              >
                <title id={`${id}-title`}>示例月份学习时长</title>
                <desc id={`${id}-desc`}>
                  一月 12 小时，二月 20 小时，三月 16 小时。当前选择{" "}
                  {selected.label} {selected.value}{" "}
                  小时。完整数据见下方表格，通过图外按钮选择。
                </desc>
                <path d="M24 130 H280" fill="none" stroke="#9c94a9" />
                {months.map((m, i) => (
                  <g key={m.id}>
                    <rect
                      x={40 + i * 80}
                      y={130 - m.value * 4}
                      width="42"
                      height={m.value * 4}
                      fill={m.id === data.month ? "#5b4bce" : "#b9aed9"}
                      stroke={m.id === data.month ? "#35235c" : "#77698c"}
                      strokeWidth={m.id === data.month ? 3 : 1}
                    />
                    <text
                      x={61 + i * 80}
                      y="154"
                      textAnchor="middle"
                      fontSize="12"
                      fill="#51415f"
                    >
                      {m.label}
                    </text>
                    {m.id === data.month && (
                      <text
                        x={61 + i * 80}
                        y={118 - m.value * 4}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#35235c"
                      >
                        已选
                      </text>
                    )}
                  </g>
                ))}
              </svg>
              <Choices
                label="选择月份"
                values={months.map((m) => [m.id, m.label])}
                value={data.month}
                onChange={(v) => patch({ month: v, chartUsed: true })}
              />
              <p role="status" data-testid="chart-selection">
                已选：{selected.label} · {selected.value} 小时
              </p>
              <table>
                <caption>全部示例数据（不是实际学习记录）</caption>
                <thead>
                  <tr>
                    <th scope="col">月份</th>
                    <th scope="col">小时</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.id}>
                      <th scope="row">{m.label}</th>
                      <td>{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <button
            className="vector-action vector-save"
            aria-pressed={data.saved}
            onClick={() => patch((o) => ({ saved: !o.saved, savedUsed: true }))}
          >
            <Pin
              size={24}
              stroke={6}
              fill="none"
              decorative
              testId="decorative-svg"
            />
            收藏路线卡
          </button>
          <p role="status">
            {data.saved ? "✓ 已收藏，可再次点击取消。" : "○ 尚未收藏。"}
          </p>
          <code className="vector-code">
            {data.semantics === "decorative"
              ? "button → svg[aria-hidden=true] + 可见文本"
              : data.semantics === "meaningful"
                ? "svg[role=img] → title + desc + 图形；操作在外"
                : "svg[role=img] + 全部数据表 + 图外按钮 + 选择反馈"}
          </code>
        </div>
      </div>
      <Note title="先问用途，再选渲染方式">
        HTML DOM 适合正文、表单和语义操作；SVG
        适合可缩放图标、结构化图形和图表。Canvas
        可用于大量频繁重绘的像素、粒子或图形，但命中和文本替代需另做。SVG
        不保证任何规模都更快：路径复杂度、滤镜、更新频率和设备都要实测。图表的
        title 也不能代替数据表和键盘操作。
      </Note>
    </>
  );
}
function VectorReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第十一节核对说明与官方来源</span>
        <span className="micro">2026-10-21 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课用真实内联 SVG 的 path、circle、rect 和文本，不放大位图。viewBox
          与显示尺寸分开；基础矢量、vector-effect
          和几何测量仍需核对目标浏览器，测量异常时保留图形与操作并明确提示。装饰与信息图形分别设置语义，复杂图表另有完整数据与图外按钮；辅助技术组合仍需人工测试。手动描边没有自动动画。结构与几何测量不构成跨渲染技术性能基准。总路线保持
          2026-10-20 核对，不宣称永远最新。
        </p>
        <div className="source-links">
          {vectorSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonEleven({ onStorageStatus }) {
  const [data, setData] = useState(readVectorProgress),
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
      localStorage.setItem(VECTOR_STORAGE, JSON.stringify(data));
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
        [80, 240].every((v) => data.sizesSeen.includes(v)),
        "比较 80px 与 240px 显示尺寸",
      ],
      [data.boxChanged, "改变 viewBox 坐标范围"],
      [data.fillChanged && data.strokeChanged, "改变填充与描边"],
      [data.inspected, "读取 SVG 结构与尺寸（或检查测量回退）"],
    ],
    [
      [data.bendChanged && data.pathStrokeChanged, "改变曲线控制点与线宽"],
      [
        [0, 50, 100].every((v) => data.progressSeen.includes(v)),
        "比较 0 / 50 / 100 描边进度",
      ],
      [data.pathInspected, "读取路径几何（或检查测量回退）"],
    ],
    [
      [
        ["decorative", "meaningful", "chart"].every((v) =>
          data.semanticsSeen.includes(v),
        ),
        "比较装饰 / 信息 / 图表三种语义",
      ],
      [data.chartUsed, "通过图外控件选择月份"],
      [data.savedUsed, "操作有文本名称的收藏按钮"],
    ],
    vectorQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成可编辑的矢量指令"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查坐标、描边、语义、操作与性能",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = vectorSteps[data.step];
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
      setNotice("第十一节已完成。" + nextLessonHint(10));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    const scenario = {
      button: "带文本名称的装饰图标按钮",
      figure: "有意义的独立路线图标",
      path: "手动描边路径实验",
      chart: "可访问的月份柱状图",
    }[data.brief];
    const visual =
      data.brief === "button"
        ? "24×24 CSS px，viewBox=0 0 100 100，stroke-width=6，fill=none"
        : data.brief === "figure"
          ? `${data.size}×${data.size} CSS px，viewBox=0 0 ${data.box} ${data.box}，stroke-width=${data.strokeWidth}，fill=${data.fill === "none" ? "none" : "浅色填充"}，${data.nonScaling ? "vector-effect=non-scaling-stroke" : "描边随坐标映射缩放"}`
          : data.brief === "path"
            ? `viewBox=0 0 300 180，路径 ${pathD(data.bend)}，stroke-width=${data.pathStroke}，stroke-linecap=${data.cap}，手动进度 ${data.progress}/100`
            : `viewBox=0 0 300 180，虚构示例数据：一月 12、二月 20、三月 16 小时；当前选择 ${months.find((m) => m.id === data.month).label}`;
    const semantics =
      data.brief === "button"
        ? "按钮保留可见文本“收藏路线卡”和 aria-pressed 状态；重复的小 SVG 用 aria-hidden=true、focusable=false。只有图标的按钮必须另有明确操作名称。"
        : data.brief === "chart"
          ? "SVG 有 role=img、唯一 title/desc 及关联标签，描述数据与当前选择；同时保留全部数据的 HTML 表格、图外月份按钮和文字反馈。图表的名称不能替代完整数据或交互。"
          : "有意义的 SVG 使用 role=img、唯一 title/desc 与 aria-labelledby/aria-describedby；保留旁边的可读说明。图形不充当只有鼠标能点的操作入口。";
    patch({
      draft: `请在现有项目实现${scenario}。优先使用真正的内联 SVG 矢量路径，不把放大位图伪装成矢量；也不从截图断言原站技术。

坐标与视觉：${visual}。viewBox 是本地坐标范围，CSS width/height 是显示尺寸；明确宽高比与留白，检查描边端点不被视口裁切。fill 决定内部填充，stroke 决定轮廓；若需要固定屏幕线宽，逐形状使用 non-scaling-stroke 并在目标浏览器验证。小尺寸仍需检查像素栅格与可读性。

语义与操作：${semantics} 主要操作使用普通 HTML 按钮，全部可键盘和纯触屏到达，焦点可见，状态有文字或形状提示，不能只靠颜色。图形缩放不隐藏重要说明。

路径方案：二次曲线 Q 的控制点改变真实路径。需要描边进度时，可用 pathLength=100 规范化 dasharray/dashoffset，0 时明确隐藏彩色描边；getTotalLength 仍读取浏览器计算的本地单位长度，不能把它谎称为 100。保持手动静态控制；若以后自动播放，提供暂停、减少动态偏好与静态替代。

技术取舍：正文、表单用 HTML DOM，结构化可缩放图形可选 SVG。大量频繁重绘可评估 Canvas，但命中和可访问文本要另做。不要声称 SVG 在任何规模都更快，也不要把 DOM 节点数当作跨技术性能跑分。

验收：
1. 桌面与 375px 实测 SVG 显示尺寸、viewBox 映射、路径和描边，检查真实渲染与局部裁切，不仅检查 CSS 字符串。
2. 核对装饰隐藏与信息标签，图表所有数据均能在文本中访问；完整走键盘与零键盘触屏，检查状态与焦点。
3. 调整参数、重复操作、刷新及取消/确认重置，保留其他模块进度。
${data.includeEdges ? "4. 在目标浏览器核对基础 SVG、vector-effect 与测量 API；测量失败时保留可操作图形和说明，不虚构数值。按实际路径复杂度、滤镜、更新频率和目标设备测量成本，保持足够简单的方案。" : "4. 采用基础静态 SVG，核对目标浏览器、文本替代和实际设备表现。"}

请先说明矢量坐标、缩放规则、必要标签或装饰语义及性能边界，再实现并逐条自测。`,
      generated: true,
      reviewed: false,
    });
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
      localStorage.removeItem(VECTOR_STORAGE);
    } catch {}
    setData(vectorInitial());
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第十一节的进度、参数与草稿；前十节进度已保留。");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  return (
    <div className="lesson-two lesson-eleven">
      <div className="lesson-overline">
        <span className="pill">第十一节 · SVG</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            SVG<span className="title-period">.</span>
          </h1>
          <p>从一个图标，看懂坐标、路径与语义。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>11</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 分清坐标与尺寸
        </span>
        <span>
          <Icon type="check" size={16} /> 操作路径与描边
        </span>
        <span>
          <Icon type="check" size={16} /> 选择合适的语义
        </span>
      </div>
      <nav className="stepper" aria-label="第十一节学习步骤">
        {vectorSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="vector-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            VECTOR LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="vector-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step === 0 && <ScaleLab data={data} patch={patch} />}
        {data.step === 1 && <PathLab data={data} patch={patch} />}
        {data.step === 2 && <SemanticLab data={data} patch={patch} />}
        {data.step === 3 && (
          <div className="quiz-grid">
            {vectorQuestions.map((q, i) => {
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
              <h3>你的矢量简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <label>
                实现场景
                <select
                  value={data.brief}
                  onChange={(e) => patch({ brief: e.target.value })}
                >
                  <option value="button">装饰图标按钮</option>
                  <option value="figure">独立信息图标 · 采用第一站参数</option>
                  <option value="path">手动描边路径</option>
                  <option value="chart">可访问月份图表</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={data.includeEdges}
                  onChange={(e) => patch({ includeEdges: e.target.checked })}
                />
                加入兼容与性能边界
              </label>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成矢量草稿" : "生成矢量指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的矢量指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制矢量指令
                </button>
              </div>
              <label className="sr-only" htmlFor="vector-agent-draft">
                可编辑的 矢量 Agent 指令
              </label>
              <textarea
                id="vector-agent-draft"
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
                placeholder="生成后，补充矢量尺寸、描边、语义、交互替代与性能约束。"
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
                我已检查坐标、描边、语义、操作与性能。
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
                  ? "完成第十一节"
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
          重置第十一节进度
        </button>
      </div>
      <VectorReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="vector-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="vector-reset-title">重新开始第十一节？</h2>
        <p>仅清除第十一节的进度、实验参数和草稿；前十节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>保留第十一节进度</button>
          <button className="primary" onClick={reset}>
            确认重置第十一节
          </button>
        </div>
      </dialog>
    </div>
  );
}
