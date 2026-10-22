export const CANVAS_STORAGE = "frontend-observatory.lesson24.v1";
export const canvasScope =
  "本例真实调用Canvas 2D的clearRect、arc、rect、fill与fillText绘制；不是DOM图形或静态图片。600×360逻辑场景独立保存，CSS显示尺寸、DPR位图尺寸与视图缩放分开处理。图形不会自动生成DOM或键盘语义，几何命中与画布外对象列表由应用额外实现。最多8个对象是教学限制，不是Canvas比SVG快的性能结论。";
export const canvasSteps = [
  {
    short: "绘制",
    time: "4 分钟",
    title: "一个Canvas，多份图形数据",
    desc: "添加图形，通过画布点击或外部列表选择，再用方向按钮移动。无需拖拽，触摸滑动保留页面滚动。",
  },
  {
    short: "命中",
    time: "4 分钟",
    title: "选择和撤销，都要自己设计",
    desc: "删除所选并撤销，核对对象恢复。列表提供可访问语义，Canvas中的每个图形不是浏览器自动生成的DOM节点。",
  },
  {
    short: "像素",
    time: "4 分钟",
    title: "显示大小、像素密度与缩放是三件事",
    desc: "缩放视图、切换半透明，再清空并恢复。读取当前CSS尺寸、位图尺寸和DPR；resize会重绘，不会清空场景数据。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "按交互与重绘特点选择渲染方式",
    desc: "不要把Canvas当作任何规模都更快的SVG替代。选错可重试，并阅读原因。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "给Agent一份可操作、可撤销的绘图简报",
    desc: "明确对象、命中、DPR、替代操作、重绘成本与验收，生成后可以编辑复制。",
  },
];
export const canvasQuestions = [
  {
    q: "Canvas里画了八个图形，就自动有八个可聚焦DOM节点吗？",
    options: [
      "会，每个图形自动有按钮语义和命中",
      "不会；像素画面之外，命中、对象列表和辅助语义要额外设计",
    ],
    correct: 1,
    why: "Canvas是绘图表面。应用维护图形模型，自己决定几何命中、选择、键盘替代及文本反馈。外部列表是本例主动编写的语义，不是Canvas自动提供。",
  },
  {
    q: "DPR和缩放后，怎样避免模糊或点击偏移？",
    options: [
      "按CSS尺寸×DPR设位图并重画；指针从当前CSS矩形反算视图变换，不能再重复乘DPR",
      "只把Canvas CSS拉大，命中一直用初次页面坐标",
    ],
    correct: 0,
    why: "改变canvas.width/height会清空位图和上下文状态，需从场景模型重绘。DPR控制像素密度，视图倍率是另一层；命中坐标必须与实际绘制映射一致。",
  },
  {
    q: "什么时候选择Canvas？",
    options: [
      "任何对象数量都一定比SVG快，可省略撤销和语义",
      "按对象数量、更新频率、交互/语义与目标设备实测选DOM、SVG或Canvas，写明撤销与替代",
    ],
    correct: 1,
    why: "本例8个对象只是教学限额，没有跑跨技术性能基准。逐对象语义和矢量编辑常可考虑SVG/DOM；Canvas适合时也要支付命中、重绘、像素密度与可访问性成本。",
  },
];
export const canvasSources = [
  [
    "MDN：Canvas 2D",
    "https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D",
  ],
  [
    "MDN：Canvas优化与高分屏",
    "https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas",
  ],
  [
    "MDN：devicePixelRatio",
    "https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio",
  ],
  [
    "MDN：setTransform",
    "https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setTransform",
  ],
  [
    "MDN：Canvas可访问性",
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#accessibility",
  ],
  [
    "MDN：getBoundingClientRect",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect",
  ],
];
export const canvasInitial = () => ({
  step: 0,
  done: [],
  added: false,
  selectedSeen: false,
  moved: false,
  deleted: false,
  undone: false,
  inspected: false,
  zoomChanged: false,
  alphaChanged: false,
  emptyRecovered: false,
  zoom: 1,
  alpha: false,
  caption: "用数据描述图形，用画布显示结果",
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readCanvasProgress() {
  const b = canvasInitial();
  try {
    const x = JSON.parse(localStorage.getItem(CANVAS_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([0.75, 1, 1.25].includes(x.zoom)) b.zoom = x.zoom;
    if (typeof x.caption === "string") b.caption = x.caption.slice(0, 80);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = canvasQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export const sceneInitial = () => ({
  items: [
    { id: "A", kind: "circle", x: 140, y: 110, w: 68, h: 68, color: "#7062ad" },
    { id: "B", kind: "rect", x: 320, y: 185, w: 100, h: 70, color: "#327d85" },
    { id: "C", kind: "circle", x: 460, y: 110, w: 60, h: 60, color: "#a76c3b" },
  ],
  selected: "A",
});
export function canvasView(width, height, zoom = 1) {
  const scale = Math.min(width / 600, height / 360) * zoom;
  return {
    scale,
    ox: (width - 600 * scale) / 2,
    oy: (height - 360 * scale) / 2,
  };
}
export function canvasPoint(clientX, clientY, rect, zoom = 1) {
  const v = canvasView(rect.width, rect.height, zoom);
  return v.scale > 0
    ? {
        x: (clientX - rect.left - v.ox) / v.scale,
        y: (clientY - rect.top - v.oy) / v.scale,
      }
    : { x: -1, y: -1 };
}
export function canvasHit(items, x, y) {
  return (
    [...items]
      .reverse()
      .find((o) =>
        o.kind === "circle"
          ? (x - o.x) ** 2 + (y - o.y) ** 2 <= (o.w / 2) ** 2
          : Math.abs(x - o.x) <= o.w / 2 && Math.abs(y - o.y) <= o.h / 2,
      )?.id ?? null
  );
}
export function clampShape(o, x, y) {
  return {
    ...o,
    x: Math.max(o.w / 2, Math.min(600 - o.w / 2, x)),
    y: Math.max(o.h / 2, Math.min(360 - o.h / 2, y)),
  };
}
