export const RESPONSIVE_STORAGE = "frontend-observatory.lesson6.v1";
export const responsiveSteps = [
  {
    short: "两把尺子",
    title: "跟着视口，还是跟着容器？",
    time: "4 分钟",
    desc: "分别改变独立示例视口与卡片容器的宽度。观察原生 media query 和 container query，各自真正参考哪把尺子。",
  },
  {
    short: "布局与抽屉",
    title: "侧栏收起来，操作不能消失",
    time: "4 分钟",
    desc: "同一个导航从桌面侧栏进入窄屏抽屉。关闭、返回焦点，再在抽屉打开时跨过断点，检查背景是否恢复。",
  },
  {
    short: "内容与优先级",
    title: "断点来自内容，优先级也要说清",
    time: "4 分钟",
    desc: "加长文案、调窄组件。保留主要操作，把次要操作收进可访问的更多入口；阅读顺序和触摸目标仍然可用。",
  },
  {
    short: "做出判断",
    title: "不是把桌面截图缩小",
    time: "3 分钟",
    desc: "三道可重试判断，区分视口、组件容器、内容约束与抽屉交互责任。",
  },
  {
    short: "交给 Agent",
    title: "把不同宽度下的变化写清楚",
    time: "3 分钟",
    desc: "生成、编辑与复制响应式简报，描述布局变化、查询策略、内容优先级、触屏和键盘验收。",
  },
];
export const responsiveQuestions = [
  {
    q: "同一张卡片放在宽页面的窄侧栏与宽主区，应该只根据全局窗口宽度决定横排吗？",
    options: [
      "应该；窗口宽就说明所有卡片都有足够空间",
      "不一定；可用容器查询按卡片所在容器的实际宽度调整",
    ],
    correct: 1,
    why: "媒体查询适合视口等环境条件；尺寸容器查询参考被声明为查询容器的祖先。窗口很宽时，侧栏里的卡片仍可能很窄。两者可以配合，并为不支持容器查询的环境保留可读的基础布局。",
  },
  {
    q: "是否应该把所有产品的响应式断点统一设为 768px？",
    options: [
      "不应该；应根据文字、导航、内容最小尺寸和间距验证何时需要变化",
      "应该；768px 能保证所有设备、语言和内容都正确",
    ],
    correct: 0,
    why: "断点是布局约束的结果。长标题、字体和内容数量变化都会影响空间需要；用内容压力测试验证临界宽度，不把某个设备尺寸当成普适答案。本节不同实验使用不同断点。",
  },
  {
    q: "窄屏导航变成抽屉后，视觉上能打开就算完成了吗？",
    options: [
      "算完成；抽屉只是换一种位置",
      "还需要名称、触摸关闭入口、键盘路径、焦点返回与跨断点清理",
    ],
    correct: 1,
    why: "模态抽屉要管理初始焦点、Tab 路径、Esc 与可见关闭按钮。切到桌面布局时必须关闭模态、恢复背景操作，并避免焦点落在隐藏控件上。不能要求手机用户按实体键盘 Esc 才能继续。",
  },
];
export const responsiveSources = [
  [
    "MDN：媒体查询",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using",
  ],
  [
    "MDN：容器查询与基础回退",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries",
  ],
  [
    "MDN：matchMedia",
    "https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia",
  ],
  [
    "MDN：dialog 与模态",
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog",
  ],
  [
    "MDN：showModal 的 iframe 范围",
    "https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal",
  ],
  [
    "WAI：模态对话框键盘与焦点",
    "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/",
  ],
];
export const responsiveInitial = () => ({
  step: 0,
  done: [],
  viewWidth: 560,
  breakpoint: 600,
  containerWidth: 200,
  viewportsSeen: [560],
  containersSeen: [200],
  breakpointChanged: false,
  containerFallback: false,
  layoutWidth: 820,
  layoutWidthsSeen: [820],
  drawerOpened: false,
  drawerClosed: false,
  crossedOpen: false,
  priorityWidth: 520,
  priorityWidthsSeen: [520],
  longCopy: false,
  longTested: false,
  primaryUsed: false,
  secondaryUsed: false,
  answers: [null, null, null],
  brief: "workspace",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readResponsiveProgress() {
  const b = responsiveInitial();
  try {
    const x = JSON.parse(localStorage.getItem(RESPONSIVE_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries({
      step: [0, 1, 2, 3, 4],
      viewWidth: [320, 560, 840],
      breakpoint: [480, 600, 720],
      containerWidth: [200, 360, 460],
      layoutWidth: [340, 820],
      priorityWidth: [240, 520],
      brief: ["workspace", "card"],
    }))
      if (v.includes(x[k])) b[k] = x[k];
    for (const [k, v] of Object.entries({
      done: [0, 1, 2, 3, 4],
      viewportsSeen: [320, 560, 840],
      containersSeen: [200, 360, 460],
      layoutWidthsSeen: [340, 820],
      priorityWidthsSeen: [240, 520],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((a) => v.includes(a)))];
    for (const k of [
      "breakpointChanged",
      "containerFallback",
      "drawerOpened",
      "drawerClosed",
      "crossedOpen",
      "longCopy",
      "longTested",
      "primaryUsed",
      "secondaryUsed",
      "generated",
      "reviewed",
    ])
      b[k] = x[k] === true;
    if (typeof x.includeEdges === "boolean") b.includeEdges = x.includeEdges;
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = responsiveQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
