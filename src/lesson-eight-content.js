export const GLASS_STORAGE = "frontend-observatory.lesson8.v1";
export const glassSteps = [
  {
    short: "模糊谁",
    title: "同一场景，模糊的是谁？",
    time: "4 分钟",
    desc: "切换无滤镜、filter 与 backdrop-filter。面板内容与背后的图案保持相同，观察文字与背景的不同变化。",
  },
  {
    short: "透过面板",
    title: "没有透出的背景，就没有可见的毛玻璃",
    time: "4 分钟",
    desc: "移动真实背景，改变白色背景色的 alpha，再盖实面板或移除图案。手动移动也能完成实验，无需播放动画。",
  },
  {
    short: "可读与回退",
    title: "效果可以退，内容不能退",
    time: "4 分钟",
    desc: "改变实际模糊范围和强度，切到无支持回退。关注可读性与成本；这里展示参数，不伪造设备性能分数。",
  },
  {
    short: "做出判断",
    title: "把可见效果与实现条件连起来",
    time: "3 分钟",
    desc: "三个可重试判断：作用对象、透明条件与交付约束。选择后会显示理由。",
  },
  {
    short: "交给 Agent",
    title: "把毛玻璃写成可验收的约束",
    time: "3 分钟",
    desc: "生成并编辑包含真实背景、可读性、回退与减少动态偏好的指令。截图只能提供外观线索。",
  },
];
export const glassQuestions = [
  {
    q: "需要背景变模糊，而面板里的文字保持清楚，优先验证什么？",
    options: [
      "给整个面板加 filter: blur()，文字就会自动保持清楚",
      "比较 backdrop-filter 与半透明背景色；filter 会模糊面板自身及内容",
    ],
    correct: 1,
    why: "filter: blur() 处理元素自身渲染结果，包含文字与后代。backdrop-filter 处理背后的图像；用半透明背景色让结果透出，文字仍独立绘制。祖先形成的 backdrop root 等边界也会影响取样范围。",
  },
  {
    q: "面板背景完全不透明，或背后只有均匀纯色，还能保证看到明显的毛玻璃吗？",
    options: [
      "不能；不透明面板挡住结果，均匀背景也没有细节可供观察",
      "能；写上 blur(24px) 就一定会出现丰富的磨砂纹理",
    ],
    correct: 0,
    why: "声明存在不等于效果可见。背景色 alpha 为 1 会盖住背后的模糊结果；均匀背景没有可见细节，不应额外叠一张假模糊图来冒充实时背板。移动图案、切换透明与不透明才能验证条件。",
  },
  {
    q: "哪份交付要求能保护真实用户？",
    options: [
      "全屏加大模糊，只靠模糊区分状态，不支持时继续透明",
      "控制范围与强度，给文字稳定底色与边界，检查回退、性能和减少动态偏好",
    ],
    correct: 1,
    why: "大面积模糊与持续变化的背景可能增加绘制与合成负担，成本需在目标设备实测。回退应保持清楚的内容和操作；不只靠模糊表达层次或状态，运动可暂停，并尊重 prefers-reduced-motion。",
  },
];
export const glassSources = [
  [
    "MDN：backdrop-filter 与透明条件",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter",
  ],
  [
    "MDN：blur()",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/filter-function/blur",
  ],
  [
    "MDN：filter 的作用对象",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/filter",
  ],
  [
    "MDN：prefers-reduced-motion",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion",
  ],
  ["web.dev：背景模糊与性能", "https://web.dev/articles/backdrop-filter"],
  [
    "WAI：对比度与背景",
    "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html",
  ],
];
export const glassInitial = () => ({
  step: 0,
  done: [],
  mode: "none",
  modesSeen: ["none"],
  blur: 12,
  blurChanged: false,
  alpha: 0.55,
  alphaChanged: false,
  opaque: false,
  opaqueTested: false,
  empty: false,
  emptyTested: false,
  position: 0,
  moved: false,
  paused: false,
  forceFallback: false,
  fallbackTested: false,
  area: "small",
  areaChanged: false,
  costBlur: 12,
  budgetChanged: false,
  readabilityReviewed: false,
  answers: [null, null, null],
  brief: "panel",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readGlassProgress() {
  const b = glassInitial();
  try {
    const x = JSON.parse(localStorage.getItem(GLASS_STORAGE));
    if (!x || typeof x !== "object") return b;
    const enums = {
      step: [0, 1, 2, 3, 4],
      mode: ["none", "self", "backdrop"],
      blur: [0, 6, 12],
      alpha: [0.2, 0.55, 0.85],
      position: [0, 48, 96],
      area: ["small", "wide"],
      costBlur: [6, 12, 24],
      brief: ["panel", "bar"],
    };
    for (const [k, values] of Object.entries(enums))
      if (values.includes(x[k])) b[k] = x[k];
    for (const [k, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      modesSeen: ["none", "self", "backdrop"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => values.includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean" && typeof x[k] === "boolean") b[k] = x[k];
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = glassQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
