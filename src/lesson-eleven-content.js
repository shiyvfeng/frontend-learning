export const VECTOR_STORAGE = "frontend-observatory.lesson11.v1";
export const vectorSteps = [
  {
    short: "坐标与缩放",
    title: "一份轮廓，三种显示尺寸",
    time: "4 分钟",
    desc: "改变真正的内联 SVG。把坐标范围与显示尺寸分开，再观察填充、描边和不随缩放的线宽。",
  },
  {
    short: "路径与描边",
    title: "改一个控制点，曲线就变了",
    time: "4 分钟",
    desc: "手动改变路径、线宽和描边进度。灰线保留完整路径作参考，紫色线显示当前进度；没有自动播放。",
  },
  {
    short: "用途与语义",
    title: "图标、信息图、图表，职责不同",
    time: "4 分钟",
    desc: "同样是 SVG，装饰可以隐藏语义，信息需要名称，图表还需要完整数据与可操作的文本控件。",
  },
  {
    short: "做出判断",
    title: "清楚的不只是轮廓",
    time: "3 分钟",
    desc: "三个可重试判断，核对坐标、语义与技术取舍。选择后会显示理由。",
  },
  {
    short: "交给 Agent",
    title: "把矢量与语义一起写进指令",
    time: "3 分钟",
    desc: "生成并编辑一份 SVG 简报，写清缩放、描边、交互替代和性能验收。",
  },
];
export const vectorQuestions = [
  {
    q: "同一条路径坐标不变，显示尺寸仍为 160px；viewBox 从 0 0 100 100 改为 0 0 160 160，会怎样？",
    options: [
      "相当于提高位图分辨率，轮廓占比不变",
      "坐标范围更大，同一轮廓占显示区域的比例变小",
    ],
    correct: 1,
    why: "viewBox 是映射到 SVG 显示区域的本地坐标范围，不是位图像素数。在本例等比例映射下，100 个单位改为 160 个单位，同一条路径显示为原来的 100/160；增加坐标范围也不会替你把轮廓重新居中。",
  },
  {
    q: "文字已经写明“收藏路线卡”的按钮，旁边的小 SVG 只作装饰，应该怎样处理？",
    options: [
      "按钮保留明确文本名称，小 SVG 用 aria-hidden；有意义的独立图形另配名称与说明",
      "把按钮文字也隐藏，让所有用户只靠图形猜操作",
    ],
    correct: 0,
    why: "可访问名称应表达操作目的。重复装饰可以 aria-hidden；承载信息的图形使用 title/desc 或其他标签与文本替代。图表通常还需要数据表和外部键盘、触屏控件，仅给一个 title 并不能替代复杂交互。",
  },
  {
    q: "SVG 有 DOM 节点，所以不论图形数量和更新频率，都一定比 Canvas 更快吗？",
    options: [
      "一定；只数节点就能做跨技术性能结论",
      "不能；要结合复杂度、更新、交互语义与目标设备实测",
    ],
    correct: 1,
    why: "HTML DOM 适合文本和表单；SVG 适合需要结构、缩放和形状操作的图形；Canvas 可用于大量频繁重绘的像素或图形，但命中与可访问替代要另做。路径复杂度、滤镜、更新频率和设备都影响成本。DOM 节点数不是跨技术的真实性能基准。",
  },
];
export const vectorSources = [
  [
    "MDN：SVG 的 viewBox",
    "https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox",
  ],
  [
    "MDN：fill 与 stroke",
    "https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Fills_and_strokes",
  ],
  [
    "MDN：不随缩放的描边",
    "https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/vector-effect",
  ],
  [
    "MDN：pathLength",
    "https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/pathLength",
  ],
  [
    "MDN：读取真实路径长度",
    "https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/getTotalLength",
  ],
  [
    "WAI：功能图像的操作名称",
    "https://www.w3.org/WAI/tutorials/images/functional/",
  ],
  [
    "WAI：复杂图像的文本替代",
    "https://www.w3.org/WAI/tutorials/images/complex/",
  ],
  [
    "MDN：Canvas API",
    "https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API",
  ],
];
export const vectorInitial = () => ({
  step: 0,
  done: [],
  size: 160,
  sizesSeen: [160],
  box: 100,
  boxChanged: false,
  strokeWidth: 4,
  strokeChanged: false,
  fill: "soft",
  fillChanged: false,
  color: "violet",
  nonScaling: false,
  inspected: false,
  bend: 90,
  bendChanged: false,
  pathStroke: 6,
  pathStrokeChanged: false,
  cap: "round",
  progress: 100,
  progressSeen: [100],
  pathInspected: false,
  semantics: "decorative",
  semanticsSeen: ["decorative"],
  month: "jan",
  chartUsed: false,
  saved: false,
  savedUsed: false,
  answers: [null, null, null],
  brief: "figure",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readVectorProgress() {
  const b = vectorInitial();
  try {
    const x = JSON.parse(localStorage.getItem(VECTOR_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, values] of Object.entries({
      step: [0, 1, 2, 3, 4],
      size: [80, 160, 240],
      box: [100, 160],
      strokeWidth: [2, 4, 8],
      fill: ["soft", "none"],
      color: ["violet", "teal"],
      bend: [24, 90, 156],
      pathStroke: [3, 6, 10],
      cap: ["butt", "round"],
      progress: [0, 50, 100],
      semantics: ["decorative", "meaningful", "chart"],
      month: ["jan", "feb", "mar"],
      brief: ["button", "figure", "path", "chart"],
    }))
      if (values.includes(x[k])) b[k] = x[k];
    for (const [k, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      sizesSeen: [80, 160, 240],
      progressSeen: [0, 50, 100],
      semanticsSeen: ["decorative", "meaningful", "chart"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => values.includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean" && typeof x[k] === "boolean") b[k] = x[k];
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = vectorQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export const months = [
  { id: "jan", label: "一月", value: 12 },
  { id: "feb", label: "二月", value: 20 },
  { id: "mar", label: "三月", value: 16 },
];
export const pathD = (bend) => `M24 138 Q150 ${bend} 276 60`;
