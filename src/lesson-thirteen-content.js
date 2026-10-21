export const PROPS_STORAGE = "frontend-observatory.lesson13.v1";
export const propsSteps = [
  {
    short: "同一组件",
    title: "改的是参数，复用的是实现",
    time: "4 分钟",
    desc: "三张路线卡使用同一个组件。改变父级的 size 和 variant，观察真实按钮尺寸与外观一起变化，再读取每个实例收到的输入。",
  },
  {
    short: "各自记忆",
    title: "外观可以统一，收藏不必同步",
    time: "4 分钟",
    desc: "让 A 与 B 的收藏计数不同。单独覆盖 B 的参数，再反转顺序，检查记忆是否仍跟着原来的实例。",
  },
  {
    short: "组合与边界",
    title: "禁用、加载，不能只是换个颜色",
    time: "4 分钟",
    desc: "组合 disabled 与 loading，并检查真实按钮及激活事件。加载完全由父级开关控制；没有请求、计时器或自动完成。",
  },
  {
    short: "做出判断",
    title: "参数差异，还是不同职责？",
    time: "3 分钟",
    desc: "三个可重试判断，区分只读输入、独立记忆，以及何时该拆成不同组件。",
  },
  {
    short: "交给 Agent",
    title: "定义小而清楚的组件 API",
    time: "3 分钟",
    desc: "生成并编辑组件指令，说明默认值、组合约束、状态归属、事件和验收；不追求万能巨组件。",
  },
];
export const sizes = [
  ["sm", "sm · 44px"],
  ["md", "md · 52px"],
  ["lg", "lg · 60px"],
];
export const variants = [
  ["solid", "solid · 实底"],
  ["outline", "outline · 描边"],
  ["quiet", "quiet · 轻量"],
];
export const routeItems = [
  { id: "A", title: "海岸路线", desc: "沿着海岸整理想探索的页面。" },
  { id: "B", title: "山间路线", desc: "一步一步拆解布局与视觉约束。" },
  { id: "C", title: "城市路线", desc: "记录界面里的交互与状态细节。" },
];
export const propsQuestions = [
  {
    q: "三张卡片都负责收藏路线，只是按钮大小、实底或描边不同，优先怎样组织？",
    options: [
      "复制三份完整实现，以后分别修复点击与可访问性",
      "共用一个职责清楚的组件，用 size / variant 等输入表达差异",
    ],
    correct: 1,
    why: "职责相同的视觉差异适合参数化。组件共享实现，不代表实例自动共享内部记忆；本例每张卡都有独立收藏与计数。修改共同参数不应无故重建实例或清空它们的 State。",
  },
  {
    q: "子组件收到父级传来的 props，想修改父级配置，应该怎样做？",
    options: [
      "把 props 当作只读输入，通过约定的回调请求父级更新",
      "直接改 props 对象，把它当成所有实例可以随意写的共享 State",
    ],
    correct: 0,
    why: "Props 可以来自常量、计算结果、父级 State 或函数回调；它们会随父级重新渲染变化，但对子组件是只读输入。内部记忆由相应实例持有；需要同步时，应明确提升状态归属并通过输入与回调连接，不能偷偷维护互相冲突的副本。",
  },
  {
    q: "收藏按钮与需要确认、取消和焦点管理的删除对话框，看起来都圆角。应塞进一个万能 variant 吗？",
    options: [
      "应该；只要外观近似，就用一个巨大参数表包办所有职责",
      "不应仅按外观合并；拆清职责，再组合必要的基础控件",
    ],
    correct: 1,
    why: "按钮触发操作，对话框还管理确认、取消与焦点，职责不同。Figma variant 是元件集中的设计变体；它与代码 API 只能按意图近似映射，不会自动提供运行时事件、键盘行为或状态归属。合理的复用来自清楚的边界。",
  },
];
export const propsSources = [
  [
    "React：传递只读 Props 与默认值",
    "https://react.dev/learn/passing-props-to-a-component",
  ],
  [
    "React：实例身份与状态保留",
    "https://react.dev/learn/preserving-and-resetting-state",
  ],
  [
    "React：共享状态与归属",
    "https://react.dev/learn/sharing-state-between-components",
  ],
  [
    "Figma：创建与使用 Variants",
    "https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants",
  ],
  [
    "MDN：原生 disabled 行为",
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled",
  ],
  [
    "MDN：aria-busy",
    "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy",
  ],
];
export const propsInitial = () => ({
  step: 0,
  done: [],
  sharedSize: "md",
  sharedVariant: "solid",
  bSize: "sm",
  bVariant: "quiet",
  scope: "shared",
  scopeSeen: ["shared"],
  disabled: false,
  reversed: false,
  sizeChanged: false,
  variantChanged: false,
  bConfigured: false,
  reordered: false,
  inspected: false,
  independentVerified: false,
  identityVerified: false,
  used: [],
  disabledVerified: false,
  loadingVerified: false,
  overlapVerified: false,
  cancelled: false,
  restored: false,
  answers: [null, null, null],
  brief: "favorite",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readPropsProgress() {
  const b = propsInitial();
  try {
    const x = JSON.parse(localStorage.getItem(PROPS_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, values] of Object.entries({
      step: [0, 1, 2, 3, 4],
      sharedSize: ["sm", "md", "lg"],
      sharedVariant: ["solid", "outline", "quiet"],
      bSize: ["sm", "md", "lg"],
      bVariant: ["solid", "outline", "quiet"],
      scope: ["shared", "B"],
      brief: ["favorite", "button"],
    }))
      if (values.includes(x[k])) b[k] = x[k];
    for (const [k, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      scopeSeen: ["shared", "B"],
      used: ["A", "B", "C"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => values.includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean" && typeof x[k] === "boolean") b[k] = x[k];
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = propsQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
