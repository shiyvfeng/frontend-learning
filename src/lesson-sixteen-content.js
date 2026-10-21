export const MACHINE_STORAGE = "frontend-observatory.lesson16.v1";
export const machineSteps = [
  {
    short: "路线",
    time: "4 分钟",
    title: "状态之间，靠事件走",
    desc: "在同一本地流程中点击事件，观察实际状态、当前出边图和事件表同步变化。图只辅助，所有操作都在图外。",
  },
  {
    short: "约束",
    time: "5 分钟",
    title: "能触发，不代表允许转换",
    desc: "实际尝试空标题、未确认、非法事件和重复开始，再用错误与重试恢复。每次阻止都有文字原因。",
  },
  {
    short: "并存",
    time: "5 分钟",
    title: "互斥阶段与独立数据分开",
    desc: "重要标记与详情可以并存；业务 phase 仍只有一个。取消旧尝试后开始新任务，再投递旧事件。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "复杂的是约束，不只是状态个数",
    desc: "选择后阅读理由，可直接重试。不要把业务流程和视觉动画混为同一层。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "先交代允许和禁止，再让 Agent 实现",
    desc: "简报写清状态、事件、守卫、错误、取消和验收，而不是只画一条成功路线。",
  },
];
export const machineQuestions = [
  {
    q: "有很多状态，就必须使用 XState 吗？",
    options: [
      "必须，状态个数决定是否引库",
      "不一定，主要看转换约束、层级、并发与取消复杂度",
    ],
    correct: 1,
    why: "简单开关或少量清楚的规则可用普通 State/转换表。工具选择看约束和维护需求，不只看节点数量；本课没有调用 XState。",
  },
  {
    q: "“执行中”与“失败”能同时成为本例当前业务阶段吗？",
    options: [
      "不能；phase 互斥，但重要和详情等独立数据可以并存",
      "能，所有状态都用独立布尔值随便组合即可",
    ],
    correct: 0,
    why: "单一 phase 枚举避免互斥阶段同时存在。正交数据可独立组合；真正并行状态区域需单独建模，不能把互斥阶段和所有布尔字段混为一谈。",
  },
  {
    q: "Rive 视觉状态机能直接代替任务权限与业务守卫吗？",
    options: [
      "可以，只要视觉已经切成成功态",
      "不能，它主要组织动画表现，业务约束和真实确认另行负责",
    ],
    correct: 1,
    why: "视觉状态机描述动画如何切换。业务流程决定哪些事件允许、结果是否属于当前任务；界面成功画面不等于真实任务成功。本课未接入 Rive 或机器人。",
  },
];
export const machineSources = [
  ["Stately：Events and transitions", "https://stately.ai/docs/transitions"],
  ["Stately：Guards", "https://stately.ai/docs/guards"],
  ["Stately：Parallel states", "https://stately.ai/docs/parallel-states"],
  [
    "Rive：State Machine Overview",
    "https://rive.app/docs/editor/state-machine/state-machine",
  ],
];
export const machineInitial = () => ({
  step: 0,
  done: [],
  successSeen: false,
  inspected: false,
  titleGuard: false,
  consentGuard: false,
  illegalSeen: false,
  duplicateSeen: false,
  retrySuccess: false,
  orthogonal: false,
  cancelled: false,
  lateIgnored: false,
  recovered: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readMachineProgress() {
  const b = machineInitial();
  try {
    const x = JSON.parse(localStorage.getItem(MACHINE_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = machineQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
