export const SIZING_STORAGE = "frontend-observatory.lesson5.v1";
export const sizingSteps = [
  {
    short: "尺寸合同",
    title: "写了宽度，为什么还是装不下？",
    time: "4 分钟",
    desc: "调窄容器，比较 min / max 与盒模型。用真实测量区分声明宽度、边框盒宽度和可用空间。",
  },
  {
    short: "长文本",
    title: "撑开、滚动、裁切，还是省略？",
    time: "4 分钟",
    desc: "给同一行放入超长标题，允许 Flex 项收缩，再选择溢出策略。省略后仍要能查看全文。",
  },
  {
    short: "滚动归属",
    title: "谁来滚动，要先说清楚",
    time: "4 分钟",
    desc: "不断增加消息，对比整个实验页滚动与消息区内部滚动。检查中间项目能否缩进剩余高度。",
  },
  {
    short: "做出判断",
    title: "看起来装下了，不等于问题解决了",
    time: "3 分钟",
    desc: "三道可重试判断题：尺寸下限、盒模型与内容可达性。用约束解释你的选择。",
  },
  {
    short: "交给 Agent",
    title: "把“别溢出”变成可验收的要求",
    time: "3 分钟",
    desc: "明确哪个区域滚动、哪里能省略、全文如何访问，以及窄屏和键盘如何验收。",
  },
];
export const sizingQuestions = [
  {
    q: "给 Flex / Grid 项加 min-width: 0，就一定能解决所有长内容溢出吗？",
    options: [
      "一定能；它也会自动换行和省略",
      "不能；它允许项目缩小，内容还需要合适的换行、滚动或省略策略",
    ],
    correct: 1,
    why: "某些 Flex / Grid 项的自动最小尺寸会受内容影响。min-width: 0 可以解除相关宽度下限，但不会替你换行或显示省略号；min-height: 0 对受限高度中的收缩也有类似用途。它们不是所有元素都必须添加的万能补丁。",
  },
  {
    q: "一个 border-box 元素声明 width: 240px，这 240px 通常包含什么？",
    options: [
      "内容、padding 与 border；不包含 margin",
      "内容、padding、border、margin，以及所有溢出内容",
    ],
    correct: 0,
    why: "border-box 通常把 padding 与 border 算在声明宽度内；margin 在盒子之外。内容可能仍然溢出，尺寸也仍受 min / max 等约束；padding 与 border 本身还构成尺寸下限。改 box-sizing 不能自动修复长文本或滚动归属。",
  },
  {
    q: "重要消息在手机上被截断了。哪份修改要求更完整？",
    options: [
      "直接 overflow: hidden，只要页面不横向滚动就算通过",
      "先明确尺寸与滚动区域；若省略内容，提供触屏和键盘都能用的全文入口",
    ],
    correct: 1,
    why: "隐藏不是内容可达性的修复。可以选择整页滚动、局部滚动、换行，或有全文入口的省略，取决于产品约束。验收要覆盖重要内容、操作和焦点，而不是只看截图是否整齐。",
  },
];
export const longSizingTitle =
  "项目交付清单 / FrontendObservatory_DesignReview_ImplementationConstraints_Accessibility_Performance_Compatibility_FinalVersion";
export const shortSizingTitle = "项目交付清单";
export const sizingSources = [
  [
    "MDN：min-width 与自动最小尺寸",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/min-width",
  ],
  [
    "MDN：min-height",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/min-height",
  ],
  [
    "MDN：max-width 与尺寸约束",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/max-width",
  ],
  [
    "MDN：box-sizing 的边界",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-sizing",
  ],
  [
    "MDN：overflow 与滚动容器",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow",
  ],
  [
    "MDN：text-overflow 的配合条件",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-overflow",
  ],
  [
    "MDN：Flex 项的自动最小尺寸",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Controlling_flex_item_ratios",
  ],
];
export const sizingInitial = () => ({
  step: 0,
  done: [],
  sizeWidth: 420,
  preferred: 240,
  minWidth: 0,
  maxWidth: "none",
  box: "border-box",
  padding: 16,
  sizeNarrowed: false,
  minTested: false,
  maxTested: false,
  boxesSeen: ["border-box"],
  textWidth: 420,
  longText: false,
  minZero: false,
  policy: "visible",
  textNarrowed: false,
  longTested: false,
  minZeroTested: false,
  policiesSeen: ["visible"],
  fullOpen: false,
  fullRead: false,
  scrollMode: "page",
  heightZero: false,
  count: 2,
  added: false,
  heightTested: false,
  endsSeen: [],
  answers: [null, null, null],
  brief: "chat",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readSizingProgress() {
  const b = sizingInitial();
  try {
    const x = JSON.parse(localStorage.getItem(SIZING_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries({
      step: [0, 1, 2, 3, 4],
      sizeWidth: [240, 420],
      preferred: [180, 240, 280],
      minWidth: [0, 320],
      maxWidth: ["none", "100%"],
      box: ["border-box", "content-box"],
      padding: [16, 32],
      textWidth: [240, 420],
      policy: ["visible", "scroll", "clip", "ellipsis", "wrap"],
      scrollMode: ["page", "internal"],
      brief: ["chat", "catalog"],
    }))
      if (v.includes(x[k])) b[k] = x[k];
    for (const [k, v] of Object.entries({
      done: [0, 1, 2, 3, 4],
      boxesSeen: ["border-box", "content-box"],
      policiesSeen: ["visible", "scroll", "clip", "ellipsis", "wrap"],
      endsSeen: ["page", "internal"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((i) => v.includes(i)))];
    for (const k of [
      "sizeNarrowed",
      "minTested",
      "maxTested",
      "textNarrowed",
      "longText",
      "longTested",
      "minZero",
      "minZeroTested",
      "fullOpen",
      "fullRead",
      "heightZero",
      "added",
      "heightTested",
      "generated",
      "reviewed",
    ])
      b[k] = x[k] === true;
    if (typeof x.includeEdges === "boolean") b.includeEdges = x.includeEdges;
    if (Number.isInteger(x.count) && x.count >= 2 && x.count <= 10)
      b.count = x.count;
    if (Array.isArray(x.answers))
      b.answers = sizingQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
  } catch {}
  return b;
}
