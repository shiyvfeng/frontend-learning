export const MASK_STORAGE = "frontend-observatory.lesson10.v1";
export const maskSteps = [
  {
    short: "边界与透明",
    title: "同一份素材，硬边界还是渐隐？",
    time: "4 分钟",
    desc: "切换完整素材、几何 clip-path 与渐变 mask。改变范围与形状，再检查原来的 SVG 节点和布局尺寸是否仍在。",
  },
  {
    short: "命中与焦点",
    title: "看不见的地方，还会命中吗？",
    time: "4 分钟",
    desc: "用浏览器真实命中测试比较两个点。再短暂检查无操作探针的程序性焦点，并立即返回可见的测量按钮。",
  },
  {
    short: "安全组合",
    title: "裁切装饰，不把主要操作藏起来",
    time: "4 分钟",
    desc: "把效果限制在素材层，正文和操作放在外面。展开完整素材，检查不支持时的回退，确认重要信息仍可访问。",
  },
  {
    short: "做出判断",
    title: "像素、命中与语义，是三件事",
    time: "3 分钟",
    desc: "三个可重试判断，连接视觉边界、透明区域和可访问内容。选择后会显示理由。",
  },
  {
    short: "交给 Agent",
    title: "把轮廓、渐隐与交互合同写清楚",
    time: "3 分钟",
    desc: "生成并编辑裁切或安全卡片指令，写明显示范围、命中、焦点、完整内容及兼容回退。",
  },
];
export const maskQuestions = [
  {
    q: "要让几何轮廓外既不绘制素材，也不按原矩形命中这层，优先验证哪种方案？",
    options: [
      "clip-path 的几何裁切，并用实际命中测试核对边界",
      "任何 mask 的透明部分都必然自动失去命中",
    ],
    correct: 0,
    why: "CSS Masking 标准区分两者：clip-path 会排除裁切区域外的命中；mask-image 不改变 CSS 盒的几何或命中测试。若要让不规则可见部分决定点击范围，需要明确交互方案并实测，不能只看透明像素。",
  },
  {
    q: "本实验使用 alpha 渐变遮罩。黑色不透明区与白色不透明区，哪个让素材显示？",
    options: [
      "只有白色；所有 mask 都按黑藏白显",
      "两个都显示；alpha 模式看透明度，luminance 还会考虑亮度",
    ],
    correct: 1,
    why: "本课 CSS 渐变按 alpha 工作：不透明区保留，transparent 区隐藏，黑白本身不决定结果。luminance 使用亮度与 alpha 的组合，SVG <mask> 的默认来源模式也需另查；不能把这套规则混成所有遮罩都“黑藏白显”。",
  },
  {
    q: "把重要按钮和说明放进会被裁切或渐隐的层，能当作删除了这些内容吗？",
    options: [
      "不能；DOM 与语义不会因此自动删除，焦点也可能仍能到达，应把主要操作移到可见层并保留完整内容途径",
      "能；看不见就等于从 DOM、辅助技术和键盘路径中彻底移除了",
    ],
    correct: 0,
    why: "视觉裁切不等于删除 DOM 或改变语义，也不能作为键盘焦点管理。本课命中实验的探针无操作、不在正常 Tab 顺序，只在同步测量中短暂聚焦并立即返回可见按钮；真实主要操作始终在效果层外。完整内容、可见焦点和触屏路径都要单独验收。",
  },
];
export function clipValue(shape, extent) {
  return shape === "circle"
    ? `circle(${extent / 2}% at 50% 50%)`
    : shape === "polygon"
      ? `polygon(0 0, ${extent}% 0, ${Math.min(100, extent + 15)}% 100%, 0 100%)`
      : `inset(0 ${100 - extent}% 0 0)`;
}
export function maskValue(direction, extent, tone = "black") {
  const color = tone === "white" ? "#fff" : "#000",
    solid = Math.max(0, extent - 25);
  return direction === "radial"
    ? `radial-gradient(circle at 50% 50%, ${color} 0%, ${color} ${solid}%, transparent ${extent}%)`
    : `linear-gradient(to ${direction === "down" ? "bottom" : "right"}, ${color} 0%, ${color} ${solid}%, transparent ${extent}%)`;
}
export function maskEffect(
  mode,
  shape,
  extent,
  direction,
  tone = "black",
  forced = false,
) {
  const clip = clipValue(shape, extent),
    image = maskValue(direction, extent, tone),
    supports = globalThis.CSS?.supports?.bind(globalThis.CSS),
    supported =
      mode === "none" ||
      (!forced &&
        Boolean(
          mode === "clip"
            ? supports?.("clip-path", clip)
            : supports?.("mask-image", image) ||
                supports?.("-webkit-mask-image", image),
        ));
  return {
    supported,
    style: {
      clipPath: mode === "clip" && supported ? clip : "none",
      maskImage: mode === "mask" && supported ? image : "none",
      WebkitMaskImage: mode === "mask" && supported ? image : "none",
      maskMode: "alpha",
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskSize: "100% 100%",
      WebkitMaskSize: "100% 100%",
    },
  };
}
export const maskSources = [
  ["CSSWG：裁切、遮罩与命中标准", "https://drafts.csswg.org/css-masking-1/"],
  [
    "MDN：clip-path",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/clip-path",
  ],
  [
    "MDN：mask-image 与来源模式",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-image",
  ],
  [
    "MDN：mask-mode 的 alpha / luminance",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-mode",
  ],
  [
    "WAI：焦点顺序",
    "https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html",
  ],
];
export const maskInitial = () => ({
  step: 0,
  done: [],
  mode: "none",
  modesSeen: ["none"],
  shape: "inset",
  extent: 60,
  rangeChanged: false,
  direction: "right",
  tone: "black",
  inspected: false,
  hitMode: "clip",
  clipMeasured: false,
  maskMeasured: false,
  focusVerified: false,
  safeMode: "mask",
  safeExtent: 60,
  safeDirection: "right",
  forceFallback: false,
  fallbackTested: false,
  fullSeen: false,
  marked: false,
  actionUsed: false,
  answers: [null, null, null],
  brief: "art",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readMaskProgress() {
  const b = maskInitial();
  try {
    const x = JSON.parse(localStorage.getItem(MASK_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, values] of Object.entries({
      step: [0, 1, 2, 3, 4],
      mode: ["none", "clip", "mask"],
      shape: ["inset", "circle", "polygon"],
      extent: [35, 60, 85],
      direction: ["right", "down", "radial"],
      tone: ["black", "white"],
      hitMode: ["none", "clip", "mask"],
      safeMode: ["clip", "mask"],
      safeExtent: [35, 60, 85],
      safeDirection: ["right", "down"],
      brief: ["art", "card"],
    }))
      if (values.includes(x[k])) b[k] = x[k];
    for (const [k, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      modesSeen: ["none", "clip", "mask"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => values.includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean" && typeof x[k] === "boolean") b[k] = x[k];
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = maskQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
