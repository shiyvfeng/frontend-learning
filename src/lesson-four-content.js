export const POSITION_STORAGE = "frontend-observatory.lesson4.v1";
export const positionSteps = [
  {
    short: "流与参照",
    title: "元素挪开了，原来的位置还在吗？",
    time: "4 分钟",
    desc: "切换角标的 static、relative、absolute，再改变定位参照。观察正文位置和角标位置，区分文档流与定位偏移。",
  },
  {
    short: "滚动定位",
    title: "固定在哪里，又能跟到哪里？",
    time: "4 分钟",
    desc: "在独立实验框里滚动，比较普通流、sticky、fixed。再滚过区段末尾，看看吸顶栏何时离开。",
  },
  {
    short: "层与浮层",
    title: "数字很大，也未必在最上面",
    time: "4 分钟",
    desc: "把子元素的 z-index 调到 999，再提高它所属的层叠上下文。最后打开真实模态对话框，体验关闭与焦点返回。",
  },
  {
    short: "做出判断",
    title: "看的是位置，也要看交互责任",
    time: "3 分钟",
    desc: "三道可重试判断：普通布局、定位参照、浮层行为。先说清约束，再让 Agent 选择方案。",
  },
  {
    short: "交给 Agent",
    title: "把“浮在上面”说成完整需求",
    time: "3 分钟",
    desc: "选择角标、吸顶栏或模态对话框，生成并编辑包含参照、滚动边界和键盘验收的指令。",
  },
];
export const positionQuestions = [
  {
    q: "想把一个卡片列表排成整齐的行列，应该优先把每张卡片都 absolute 定位吗？",
    options: [
      "通常不应该；先考虑 Grid / Flex，定位留给需要脱离流的局部元素",
      "应该；只要坐标准确，内容变化也一定不会影响布局",
    ],
    correct: 0,
    why: "absolute 脱离正常文档流，后续内容不会为它自动让位。普通列表与内容排版通常先用 Grid / Flex；卡片角标、特定叠放等局部关系可考虑定位，并验证长内容与尺寸变化。",
  },
  {
    q: "子元素 z-index: 999，父层叠上下文是 1；旁边的同级层叠上下文是 2。子元素一定能盖住旁边吗？",
    options: ["一定能，999 比 2 大", "不能保证；子元素仍受父层叠上下文约束"],
    correct: 1,
    why: "层叠上下文作为整体参与父级排序。这个子元素的 999 只在自己的上下文里比较，不能越过父级的层级；应检查上下文和挂载结构。提高数字也不会自动提供浮层的键盘和焦点行为。",
  },
  {
    q: "一个视觉上居中的弹窗已经加了高 z-index，是否就完成了模态对话框？",
    options: [
      "完成了；看起来像弹窗就足够",
      "还没有；还要有语义、关闭方式、焦点与背景交互管理",
    ],
    correct: 1,
    why: "模态对话框需要可访问名称、合理的初始焦点、键盘路径、Esc / 关闭按钮和焦点返回。本课使用原生 dialog.showModal() 进入顶层并使背景不可交互；普通绝对定位框不自动具备这些行为。轻量提示或菜单也不应一律改成模态框。",
  },
];
export const positionSources = [
  [
    "MDN：position 与 sticky",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position",
  ],
  [
    "MDN：定位包含块",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Containing_block",
  ],
  [
    "MDN：层叠上下文",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context",
  ],
  [
    "MDN：dialog 元素",
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog",
  ],
  [
    "MDN：showModal 与顶层",
    "https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal",
  ],
];
export const positionInitial = () => ({
  step: 0,
  done: [],
  mode: "static",
  modesSeen: ["static"],
  offset: 8,
  offsetChanged: false,
  reference: "card",
  referenceChanged: false,
  scrollMode: "static",
  scrollChecks: [],
  childZ: 1,
  parentZ: 1,
  childRaised: false,
  parentRaised: false,
  dialogOpened: false,
  dialogButtonClosed: false,
  dialogEscapeClosed: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
  brief: "badge",
  includeEdges: true,
});
export function readPositionProgress() {
  const b = positionInitial();
  try {
    const x = JSON.parse(localStorage.getItem(POSITION_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, values] of Object.entries({
      step: [0, 1, 2, 3, 4],
      mode: ["static", "relative", "absolute"],
      offset: [8, 24],
      reference: ["card", "board"],
      scrollMode: ["static", "sticky", "fixed"],
      childZ: [1, 999],
      parentZ: [1, 3],
      brief: ["badge", "sticky", "dialog"],
    }))
      if (values.includes(x[k])) b[k] = x[k];
    for (const [k, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      modesSeen: ["static", "relative", "absolute"],
      scrollChecks: ["sticky", "fixed"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => values.includes(v)))];
    for (const k of [
      "offsetChanged",
      "referenceChanged",
      "childRaised",
      "parentRaised",
      "dialogOpened",
      "dialogButtonClosed",
      "dialogEscapeClosed",
      "generated",
      "reviewed",
    ])
      b[k] = x[k] === true;
    if (typeof x.includeEdges === "boolean") b.includeEdges = x.includeEdges;
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = positionQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
