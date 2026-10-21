export const GLOW_STORAGE = "frontend-observatory.lesson9.v1";
export const glowSteps = [
  {
    short: "渐变的方向",
    title: "颜色沿直线、半径，还是角度变化？",
    time: "4 分钟",
    desc: "在同一画布切换 linear、radial、conic，调整颜色、方向和中心。背景是真实 CSS 生成的图像；文字底色保持稳定。",
  },
  {
    short: "叠出光晕",
    title: "一层渐变已经够用吗？",
    time: "4 分钟",
    desc: "并排比较简单渐变与额外光晕。在右侧开关真实 ::before 装饰，改变位置、强度与模糊；先看变化是否真的帮助表达。",
  },
  {
    short: "光与操作",
    title: "光可以强调，不能挡住操作",
    time: "4 分钟",
    desc: "手动移动聚光，比较零强度与较强光源。操作收藏按钮，读取真实命中结果；状态和焦点不靠发光表达。",
  },
  {
    short: "做出判断",
    title: "发光的外观，不能证明用了哪种工具",
    time: "3 分钟",
    desc: "三个可重试判断，连接渐变方向、实现复杂度和操作约束。选择后查看理由。",
  },
  {
    short: "交给 Agent",
    title: "把光源、层级与可读性写进简报",
    time: "3 分钟",
    desc: "生成并编辑静态装饰的实现要求，优先选择足够简单的方案。光源位置、强度与验收都要明确。",
  },
];
export const glowQuestions = [
  {
    q: "颜色围绕一个中心随角度变化，更接近哪种 CSS 渐变？",
    options: [
      "conic-gradient；radial-gradient 是从中心向外按半径变化",
      "radial-gradient 和 conic-gradient 完全相同，只是两个名字",
    ],
    correct: 0,
    why: "linear 沿直线方向过渡；radial 从中心向外辐射，可呈圆或椭圆；conic 围绕中心按角度过渡。渐变是 CSS 生成的图像，并不是新的 DOM 元素，也不自带可访问的数据语义。",
  },
  {
    q: "看到一片柔和光晕，就能判断项目用了 WebGL 或 Three.js 吗？",
    options: [
      "能；CSS 不能产生这种发光效果",
      "不能；CSS 渐变、伪元素和局部模糊也能做到，应先核对约束与源码",
    ],
    correct: 1,
    why: "外观不能证明实际技术。简单静态装饰通常可先试 CSS 渐变或额外装饰层；复杂逐像素着色或三维场景才值得按需求评估 WebGL 及相关工具。浏览器可能用 GPU 加速 CSS 的某些步骤，这也不等于应用使用了 WebGL 库。",
  },
  {
    q: "装饰层覆盖到按钮位置时，哪条验收更可靠？",
    options: [
      "把文字、边界、焦点放在清楚的内容层，装饰不拦截命中；状态同时有文字或语义",
      "只调高发光强度，亮起来就代表按钮可用或已选",
    ],
    correct: 0,
    why: "装饰层使用 pointer-events: none，且不放可聚焦内容；正文和操作位于独立清楚的内容层。仍需用真实点击和键盘验证，因为不拦截指针并不等于已处理所有键盘、层叠或可读性问题。重要状态不能只靠颜色、模糊或光晕。",
  },
];
export const glowPalettes = {
  violet: { label: "紫与青", a: "#8562d9", b: "#65c8c0", light: "#d6b4ff" },
  sunset: { label: "暖橙与紫", a: "#e79461", b: "#b96cc5", light: "#ffd29b" },
  sky: { label: "蓝与青", a: "#4887d0", b: "#8dd5cc", light: "#9fe6ff" },
};
export const glowPositions = {
  left: { label: "左上", x: 25, y: 25 },
  center: { label: "中央", x: 50, y: 35 },
  right: { label: "右上", x: 75, y: 25 },
};
export function gradientImage(type, palette, angle, position) {
  const { a, b } = glowPalettes[palette],
    { x, y } = glowPositions[position];
  return type === "radial"
    ? `radial-gradient(circle at ${x}% ${y}%, ${a} 0%, ${b} 80%)`
    : type === "conic"
      ? `conic-gradient(from ${angle}deg at ${x}% ${y}%, ${a} 0deg, ${b} 180deg, ${a} 360deg)`
      : `linear-gradient(${angle}deg, ${a} 0%, ${b} 100%)`;
}
export const glowSources = [
  [
    "MDN：linear-gradient",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/linear-gradient",
  ],
  [
    "MDN：radial-gradient",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/radial-gradient",
  ],
  [
    "MDN：conic-gradient",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/conic-gradient",
  ],
  [
    "MDN：::before 装饰盒",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::before",
  ],
  [
    "MDN：blur()",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/filter-function/blur",
  ],
  [
    "MDN：WebGL 的用途",
    "https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API",
  ],
  [
    "WAI：文字与背景对比度",
    "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html",
  ],
];
export const glowInitial = () => ({
  step: 0,
  done: [],
  type: "linear",
  typesSeen: ["linear"],
  palette: "violet",
  paletteChanged: false,
  angle: 90,
  angleChanged: false,
  position: "center",
  positionChanged: false,
  overlay: true,
  overlayOffSeen: false,
  overlayOnSeen: true,
  lightPosition: "center",
  lightMoved: false,
  strength: 0.55,
  strengthChanged: false,
  glowBlur: 12,
  glowBlurChanged: false,
  spotPosition: "center",
  spotMoved: false,
  spotStrength: 0.45,
  strengthsSeen: [0.45],
  spotSize: "compact",
  saved: false,
  stateUsed: false,
  hitVerified: false,
  longCopy: false,
  answers: [null, null, null],
  brief: "hero",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readGlowProgress() {
  const b = glowInitial();
  try {
    const x = JSON.parse(localStorage.getItem(GLOW_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, values] of Object.entries({
      step: [0, 1, 2, 3, 4],
      type: ["linear", "radial", "conic"],
      palette: ["violet", "sunset", "sky"],
      angle: [0, 90, 180],
      position: ["left", "center", "right"],
      lightPosition: ["left", "center", "right"],
      strength: [0, 0.55, 0.9],
      glowBlur: [0, 12, 24],
      spotPosition: ["left", "center", "right"],
      spotStrength: [0, 0.45, 0.8],
      spotSize: ["compact", "wide"],
      brief: ["hero", "card"],
    }))
      if (values.includes(x[k])) b[k] = x[k];
    for (const [k, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      typesSeen: ["linear", "radial", "conic"],
      strengthsSeen: [0, 0.45, 0.8],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => values.includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean" && typeof x[k] === "boolean") b[k] = x[k];
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = glowQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
