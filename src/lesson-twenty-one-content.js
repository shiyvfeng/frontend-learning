export const SHARED_STORAGE = "frontend-observatory.lesson21.v1";
export const sharedScope =
  "本例真实使用原生 document.startViewTransition：浏览器运行时捕获只读插画的新旧画面，以对象ID对应的 view-transition-name 配对位置和尺寸。缩略图与详情是不同DOM节点，感知上仍是同一对象；没有作者创建的截图或装饰克隆。根画面不配对，文字和操作直接更新，不要求全屏转场。";
export const sharedItems = [
  {
    id: "A",
    title: "山间晨光",
    color: "#7062ad",
    detail:
      "从清单中的山形缩略图进入同一对象的详情。插画保持比例，文字与控件独立排版。",
  },
  {
    id: "B",
    title: "海边手记",
    color: "#327d85",
    detail:
      "按对象B的稳定标识配对。返回时回到B的入口，而不是一律回到第一张卡片。",
  },
  {
    id: "C",
    title: "落日片段",
    color: "#a76c3b",
    detail:
      "共享元素是对象关系，不取决于是否铺满屏幕。换成另一个对象时不应强行复用同一配对名。",
  },
];
export const sharedSteps = [
  {
    short: "配对",
    time: "4 分钟",
    title: "从缩略图到详情，认出同一个对象",
    desc: "打开任意对象再返回，核对位置、尺寸与来源。详情在页内出现，不是模态弹窗；文字和操作无需一起缩放。",
  },
  {
    short: "身份",
    time: "4 分钟",
    title: "相同对象，不要求相同DOM节点",
    desc: "填写本地备注，切换对象再返回。比较Motion shared layout和原生View Transition候选，关注配对身份与生命周期。",
  },
  {
    short: "回退",
    time: "4 分钟",
    title: "快速改意图，仍回到正确入口",
    desc: "反复打开与返回，模拟来源暂时不存在，再用减少动态。无需等动画播完，静态模式同样可以完成。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "选择连续性的实现，而非套一个特效",
    desc: "判断配对、交叉淡化和焦点策略。选错可直接重试，并阅读理由。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "把配对、生命周期与回退写给Agent",
    desc: "生成本地草稿后真实编辑，说明对象关系、打断、焦点和减少动态，再复制使用。",
  },
];
export const sharedQuestions = [
  {
    q: "缩略图与详情必须复用同一个DOM节点吗？",
    options: [
      "必须，否则无法表示同一对象",
      "不必；以稳定对象ID配对，两处可以是不同DOM节点",
    ],
    correct: 1,
    why: "感知上的同一对象由内容与稳定配对标识建立。原生View Transition可把不同DOM节点的新旧运行时画面配对；同一时间每个配对名应唯一。",
  },
  {
    q: "共享过渡里出现crossfade，是否一定实现错误？",
    options: [
      "不一定；可在配对的几何过渡中淡化，换对象也可能合理使用淡化",
      "一定错误，所有共享过渡都必须全屏且禁止淡化",
    ],
    correct: 0,
    why: "原生机制可在对应的位置/尺寸过渡中交叉淡化。检查对象是否对应、内容是否清楚，不能只凭淡化判错，也不要求全屏。",
  },
  {
    q: "快速返回、来源缺失或减少动态时，哪份指令更完整？",
    options: [
      "等待旧动画结束，再无条件聚焦第一张卡",
      "最新意图优先；隔离旧回调，回到准确来源或可见回退入口，尊重外部焦点",
    ],
    correct: 1,
    why: "skipTransition仍可能执行更新回调，必须守卫代次。焦点由本次操作拥有时才恢复；来源不存在有回退，减少动态和能力不支持仍提交正确状态。",
  },
];
export const sharedSources = [
  [
    "MDN：startViewTransition",
    "https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition",
  ],
  [
    "MDN：skipTransition（仍会执行更新）",
    "https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition/skipTransition",
  ],
  [
    "MDN：ViewTransition 生命周期",
    "https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition",
  ],
  [
    "Chrome：同文档View Transitions",
    "https://developer.chrome.com/docs/web-platform/view-transitions/same-document",
  ],
  [
    "Motion：layoutId与shared layout（候选，未安装）",
    "https://motion.dev/docs/react-layout-animations",
  ],
  ["React：flushSync", "https://react.dev/reference/react-dom/flushSync"],
];
export const sharedInitial = () => ({
  step: 0,
  done: [],
  opened: false,
  returned: false,
  inspected: false,
  noteSeen: false,
  switched: false,
  compared: false,
  multiChanged: false,
  fallbackSeen: false,
  reducedChecked: false,
  animate: true,
  duration: 400,
  noMotion: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readSharedProgress() {
  const b = sharedInitial();
  try {
    const x = JSON.parse(localStorage.getItem(SHARED_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([400, 1200].includes(x.duration)) b.duration = x.duration;
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = sharedQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
