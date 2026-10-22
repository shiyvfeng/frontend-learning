export const SPRING_STORAGE = "frontend-observatory.lesson19.v1";
export const springSteps = [
  {
    short: "对比",
    time: "4 分钟",
    title: "同一目标，两种到达方式",
    desc: "时间动画按 duration / easing 插值；弹簧每一步根据目标、当前位置和速度推进。读取真实位置，不必记公式。",
  },
  {
    short: "调性",
    time: "4 分钟",
    title: "迅速稳定，也可以是 spring",
    desc: "调整刚度与阻尼，体验迅速稳定和轻微回弹。比较时先回到共同起点；参数不是“越大越高级”。",
  },
  {
    short: "打断",
    time: "4 分钟",
    title: "目标会变，运动如何接下去",
    desc: "运动中点另一个目标，核对位置和速度的连续性；减少动态下直接呈现最新目标。后台不追赶过期帧。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "选效果与约束，不迷信回弹",
    desc: "选择后读理由，可直接重试。spring 不必过冲，也不是所有界面都更自然。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "先描述迅速稳定还是轻微回弹",
    desc: "把效果目标、打断、最新目标、减少动态和生命周期约束写进可编辑简报。",
  },
];
export const springQuestions = [
  {
    q: "Spring 一定要明显越过目标再弹回来吗？",
    options: [
      "一定，没有过冲就不是 spring",
      "不一定，足够阻尼可以平稳到达；仍是同一物理模型",
    ],
    correct: 1,
    why: "是否过冲取决于刚度、阻尼、质量及当前速度。迅速稳定与轻微回弹都可以用 spring；简单固定反馈也可能用 CSS 时间动画更合适。",
  },
  {
    q: "运动中换目标，本例两种机制怎么处理？",
    options: [
      "各自保留当前位置；spring还保留速度，时间插值重新计时",
      "都必须先跳回起点，再播放预制曲线",
    ],
    correct: 0,
    why: "位置连续不代表速度连续。本例 spring 从当前速度继续受力；时间插值从当前坐标重新按 duration/easing 计时，速度可能改变。打断后两者起点可能不同，不能把所有差别都归因于参数。",
  },
  {
    q: "所有界面都应该加 spring，才更自然吗？",
    options: [
      "是，提交反馈和严肃任务都应持续弹跳",
      "不是，按信息、风险与减少动态需求选择，简单变化先考虑时间动画",
    ],
    correct: 1,
    why: "过多回弹会拖慢理解、干扰任务。先定义迅速稳定或克制回弹的效果，再选实现；减少动态保留清楚的静态结果与可见焦点，不强迫观看动画。",
  },
];
export const springSources = [
  [
    "MDN：requestAnimationFrame 与时间戳",
    "https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame",
  ],
  [
    "MDN：cancelAnimationFrame",
    "https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelAnimationFrame",
  ],
  [
    "MDN：Page Visibility API",
    "https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API",
  ],
  [
    "MDN：prefers-reduced-motion",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion",
  ],
  [
    "Android Developers：Spring physics（概念对照，未使用Android库）",
    "https://developer.android.com/develop/ui/views/animations/spring-animation",
  ],
];
export const springInitial = () => ({
  step: 0,
  done: [],
  moved: false,
  inspected: false,
  kChanged: false,
  cChanged: false,
  durationChanged: false,
  stableTested: false,
  bounceTested: false,
  retargeted: false,
  staticTargetsChanged: false,
  reducedChecked: false,
  backgroundChecked: false,
  labelEdited: false,
  stiffness: 280,
  damping: 20,
  duration: 800,
  easing: "cubic-out",
  noMotion: false,
  label: "方案卡片",
  intent: "bounce",
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readSpringProgress() {
  const b = springInitial();
  try {
    const x = JSON.parse(localStorage.getItem(SPRING_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    for (const [k, values] of Object.entries({
      stiffness: [120, 280, 480],
      damping: [12, 20, 44],
      duration: [300, 800, 1400],
      easing: ["linear", "cubic-out"],
      intent: ["stable", "bounce"],
    }))
      if (values.includes(x[k])) b[k] = x[k];
    if (typeof x.label === "string") b.label = x.label.slice(0, 36);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = springQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
