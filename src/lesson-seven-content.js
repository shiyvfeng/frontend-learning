export const SURFACE_STORAGE = "frontend-observatory.lesson7.v1";
export const surfaceSteps = [
  {
    short: "表面与边界",
    title: "同一张卡片，层次从哪里来？",
    time: "4 分钟",
    desc: "改变圆角、边框、阴影和表面亮度。与固定参考对照，再去掉阴影，检查状态和键盘焦点是否仍然清楚。",
  },
  {
    short: "阴影的对象",
    title: "影子跟着盒子，还是跟着透明轮廓？",
    time: "4 分钟",
    desc: "同一份原创透明 SVG，同时用 box-shadow 与 drop-shadow。改变形状、模糊和底色，观察真实 CSS 绘制结果。",
  },
  {
    short: "视觉与排序",
    title: "看起来抬高，不等于盖在上面",
    time: "4 分钟",
    desc: "给 A 加上更明显的阴影，再测量重叠点。改变真正的 z-index，区分视觉 elevation 与绘制排序。",
  },
  {
    short: "做出判断",
    title: "别把“高级感”当作实现要求",
    time: "3 分钟",
    desc: "三个可重试判断：阴影作用对象、实际遮挡和状态提示。读理由，比背数值更重要。",
  },
  {
    short: "交给 Agent",
    title: "把表面层次写成可验收的约束",
    time: "3 分钟",
    desc: "生成并编辑包含表面、边界、可读性、状态和焦点的指令，不靠加大阴影表达设计质量。",
  },
];
export const surfaceQuestions = [
  {
    q: "一个有透明镂空的 SVG，需要影子跟随可见轮廓。哪条描述更准确？",
    options: [
      "优先比较 filter: drop-shadow()；它参考渲染出的 alpha，铺上不透明底色后轮廓也会变",
      "只要文件是 SVG，box-shadow 就一定沿透明镂空投影",
    ],
    correct: 0,
    why: "box-shadow 围绕元素的边框盒及圆角绘制，不按内部透明像素描边。drop-shadow 参考渲染结果的 alpha；SVG 若有不透明背景，投影也可能呈矩形。两者的模糊参数含义不同，不能只凭扩展名或相同数值判断效果。",
  },
  {
    q: "A 的阴影比 B 大很多，但 A 的 z-index 是 1，B 是 2，且都在本实验同一上下文中。A 会自动盖住 B 吗？",
    options: [
      "会；阴影越大，真实绘制顺序就越高",
      "不会；视觉高度的暗示与实际排序是两回事",
    ],
    correct: 1,
    why: "box-shadow 本身不会提高 z-index，也不会给普通布局自动增加占位。实际遮挡要看适用的绘制顺序与层叠上下文。filter 等属性还可能创建新的层叠上下文；需要检查结构，不能把视觉 elevation 当成全页面排序。",
  },
  {
    q: "卡片仅用更深的阴影表示“已读”，键盘焦点也只靠原有阴影。这样够清楚吗？",
    options: [
      "够；精致的阴影可以代替文字和焦点边界",
      "不够；状态应有文字、图标或语义，焦点要有独立可见的指示",
    ],
    correct: 1,
    why: "颜色和阴影不能承担唯一状态提示。本节状态同时有文字、符号与 aria-pressed；去掉阴影后仍能理解。焦点使用独立轮廓，不因表面样式变化而消失。自动检查也不能替代真实用户与辅助技术验证。",
  },
];
export const surfaceShadows = {
  none: "none",
  soft: "0 4px 12px rgba(48, 31, 77, 0.14)",
  deep: "0 16px 28px rgba(48, 31, 77, 0.28)",
};
export const surfaceColors = {
  white: "#ffffff",
  tint: "#eee8f7",
  deep: "#d8cce9",
};
export const surfaceSources = [
  [
    "MDN：border-radius",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-radius",
  ],
  [
    "MDN：box-shadow",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-shadow",
  ],
  [
    "MDN：drop-shadow 与 alpha",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/filter-function/drop-shadow",
  ],
  [
    "MDN：层叠上下文",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context",
  ],
  [
    "WAI：不只依赖颜色",
    "https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html",
  ],
  [
    "WAI：焦点可见",
    "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html",
  ],
];
export const surfaceInitial = () => ({
  step: 0,
  done: [],
  radius: 12,
  border: 1,
  shadow: "soft",
  brightness: "white",
  radiusChanged: false,
  borderChanged: false,
  brightnessChanged: false,
  shadowsSeen: ["soft"],
  marked: false,
  stateUsed: false,
  showReference: true,
  longCopy: false,
  shape: "ticket",
  blur: 8,
  offset: 4,
  spread: 0,
  opaque: false,
  shapeChanged: false,
  blurChanged: false,
  offsetChanged: false,
  opaqueTested: false,
  layerShadow: "none",
  layerZ: 1,
  measuredBack: false,
  measuredFront: false,
  answers: [null, null, null],
  brief: "card",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readSurfaceProgress() {
  const b = surfaceInitial();
  try {
    const x = JSON.parse(localStorage.getItem(SURFACE_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries({
      step: [0, 1, 2, 3, 4],
      radius: [0, 12, 28],
      border: [0, 1, 2],
      shadow: ["none", "soft", "deep"],
      brightness: ["white", "tint", "deep"],
      shape: ["ticket", "ring"],
      blur: [0, 8, 16],
      offset: [4, 14],
      spread: [0, 8],
      layerShadow: ["none", "deep"],
      layerZ: [1, 3],
      brief: ["card", "asset"],
    }))
      if (v.includes(x[k])) b[k] = x[k];
    for (const [k, v] of Object.entries({
      done: [0, 1, 2, 3, 4],
      shadowsSeen: ["none", "soft", "deep"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((a) => v.includes(a)))];
    for (const k of [
      "radiusChanged",
      "borderChanged",
      "brightnessChanged",
      "marked",
      "stateUsed",
      "showReference",
      "longCopy",
      "opaque",
      "shapeChanged",
      "blurChanged",
      "offsetChanged",
      "opaqueTested",
      "measuredBack",
      "measuredFront",
      "generated",
      "reviewed",
    ])
      if (typeof x[k] === "boolean") b[k] = x[k];
    if (typeof x.includeEdges === "boolean") b.includeEdges = x.includeEdges;
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = surfaceQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
