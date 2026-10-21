export const MICRO_STORAGE = "frontend-observatory.lesson17.v1";
export const microSteps = [
  {
    short: "触发",
    time: "4 分钟",
    title: "小反馈，从真实事件开始",
    desc: "实际悬停、聚焦、按下再松开。同一操作用鼠标、键盘或触屏都能确认结果；悬停不是完成门槛。",
  },
  {
    short: "机制",
    time: "4 分钟",
    title: "先问 CSS 够不够，再选回弹",
    desc: "改变真实属性与参数，比较固定时长插值和带速度的弹簧。动得明显不等于更合适。",
  },
  {
    short: "边界",
    time: "4 分钟",
    title: "取消、禁用与减少动态也有反馈",
    desc: "按住后移出，或键盘按住后 Esc / 失焦，检查没有误激活。减少动态保留文字、边界和焦点。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "表达状态，不给每个按钮加弹跳",
    desc: "选错可重试，阅读理由。视觉反馈与业务成功分别确认。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "交代触发、属性、强度与验收",
    desc: "生成可编辑简报，说明何时 CSS 已足够，以及取消和减少动态政策。",
  },
];
export const microQuestions = [
  {
    q: "按钮只需在两种颜色间柔和变化，必须引入弹簧库吗？",
    options: [
      "必须，所有反馈都应弹跳",
      "不必，CSS transition 的属性、时长与缓动通常已足够",
    ],
    correct: 1,
    why: "简单的离散属性变化先选 CSS。弹簧适合需要惯性、可打断跟随和回弹的反馈，要评估强度和实现成本，不按“高级感”选库。",
  },
  {
    q: "系统中途开启减少动态，应如何处理？",
    options: [
      "停止非必要位移，保留文字、状态和可见焦点",
      "只在页面打开时读一次，以后继续回弹",
    ],
    correct: 0,
    why: "偏好可实时改变。CSS 媒体查询和 JavaScript change 监听共同停止位移并清理帧循环；没有位移也能理解操作结果。",
  },
  {
    q: "按压反馈出现，就意味着操作成功吗？",
    options: [
      "是，按钮缩了一下就算成功",
      "不是，移出、取消或禁用不能误报激活，更不代表服务器成功",
    ],
    correct: 1,
    why: "按压是输入过程，激活是确认操作，业务完成还需真实结果。本课仅切换本地收藏，不联网。触屏和键盘有等价反馈，焦点轮廓始终保留。",
  },
];
export const microSources = [
  [
    "MDN：CSS transition",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/transition",
  ],
  [
    "MDN：prefers-reduced-motion",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion",
  ],
  [
    "MDN：pointercancel",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event",
  ],
  [
    "MDN：Pointer capture",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture",
  ],
  [
    "MDN：requestAnimationFrame",
    "https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame",
  ],
  [
    "Motion：Transitions（概念对照，本站未引入）",
    "https://motion.dev/docs/react-transitions",
  ],
];
export const microInitial = () => ({
  step: 0,
  done: [],
  cssUsed: false,
  springUsed: false,
  focusSeen: false,
  strengthChanged: false,
  durationChanged: false,
  springChanged: false,
  labelEdited: false,
  compared: false,
  reduceToggled: false,
  boundaryReviewed: false,
  strength: 3,
  duration: 160,
  preset: "calm",
  label: "收藏此方案",
  noMotion: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readMicroProgress() {
  const b = microInitial();
  try {
    const x = JSON.parse(localStorage.getItem(MICRO_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([0, 3, 7].includes(x.strength)) b.strength = x.strength;
    if ([80, 160, 320].includes(x.duration)) b.duration = x.duration;
    if (["calm", "bouncy"].includes(x.preset)) b.preset = x.preset;
    if (typeof x.label === "string") b.label = x.label.slice(0, 36);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = microQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
