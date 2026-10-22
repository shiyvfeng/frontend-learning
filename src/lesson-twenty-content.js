export const LAYOUT_MOTION_STORAGE = "frontend-observatory.lesson20.v1";
export const layoutMotionScope =
  "本例先更新真实DOM顺序与卡片高度，再用位置型FLIP平移到最终位置；只动画位置，不缩放宽高。展开/收起的尺寸与文字换行即时完成，邻卡位置可以连续过渡；插画保持固定尺寸。不是 transition: all，也不是进入退出、物理spring或跨视图共享元素。";
export const layoutCards = [
  {
    id: "A",
    title: "阅读清单",
    detail:
      "展开后呈现说明与约束，卡片实际高度增加，后续卡片的正常布局位置随之改变。",
    color: "#715bc1",
  },
  {
    id: "B",
    title: "方案对照",
    detail:
      "排序保留同一张卡片与本地备注。DOM顺序就是最终阅读顺序，动画只是暂时的平移表现。",
    color: "#327b85",
  },
  {
    id: "C",
    title: "验收记录",
    detail:
      "最后核对真实顺序、内容、焦点与窄屏。减少动态直接到最终布局，所有操作仍然可用。",
    color: "#a16439",
  },
];
export const layoutMotionSteps = [
  {
    short: "布局",
    time: "4 分钟",
    title: "先改变真实布局，再让画面接上",
    desc: "倒序、按优先级排序或把某张卡片移到最前。实际DOM与阅读顺序立即更新，平移只负责过渡。",
  },
  {
    short: "内容",
    time: "4 分钟",
    title: "位置可以动，文字和插画不拉伸",
    desc: "展开与收起真实改变卡片高度；邻卡平移过渡，尺寸即时布局。不要用整卡缩放或 transition: all 代替内容策略。",
  },
  {
    short: "打断",
    time: "4 分钟",
    title: "连续改目标，保留同一内容与焦点",
    desc: "快速排序、长内容与减少动态；从当前视觉位置再测量，不闪回旧位置。窗口变窄时放弃旧测量、采用新布局。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "分清布局结果与动画表现",
    desc: "选错可重试并阅读理由。本课是同一列表内的位置过渡，不是第21课的跨视图共享元素。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "写清哪些位置动、哪些尺寸不动",
    desc: "生成可编辑简报，明确文本/图像策略、打断、焦点、滚动与何时不动画。",
  },
];
export const layoutMotionQuestions = [
  {
    q: "卡片看起来在移动，是否就证明真实列表已排序？",
    options: [
      "不是，还要核对DOM/阅读顺序与最终布局位置",
      "是，只要用translate移动就等于真实重排",
    ],
    correct: 0,
    why: "FLIP先提交真实布局，再用反向平移接上旧画面。只有视觉位移而DOM顺序没变，会让阅读、键盘顺序和产品状态不一致。",
  },
  {
    q: "展开卡片时，如何避免本例文字和图片被拉伸？",
    options: [
      "给所有属性写 transition: all，并缩放整张卡",
      "位置平移；尺寸和换行即时布局，插画固定大小，不缩放内容",
    ],
    correct: 1,
    why: "本例有意只动画位置，展开的高度立即生效，邻卡平滑移位。需要尺寸过渡时再设计壳层/内容隔离或库的尺度修正策略，不能把万能all当方案。",
  },
  {
    q: "中途再次排序或开启减少动态时，应该怎样处理？",
    options: [
      "从当前画面测量再接目标；减少动态取消过渡，保留最终DOM、内容和焦点",
      "先回放旧起点；动画结束后再恢复所有内容",
    ],
    correct: 0,
    why: "稳定ID保留本地备注与同一控件，旧回调只能清理自己的动画，不能改回旧排序。减少动态或容器宽度变化直接采用最终布局，不强抢外部焦点。",
  },
];
export const layoutMotionSources = [
  [
    "Paul Lewis：FLIP Your Animations（原始方法）",
    "https://aerotwist.com/blog/flip-your-animations/",
  ],
  [
    "React：useLayoutEffect",
    "https://react.dev/reference/react/useLayoutEffect",
  ],
  [
    "MDN：getBoundingClientRect",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect",
  ],
  [
    "MDN：Element.animate",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/animate",
  ],
  [
    "MDN：Animation.cancel",
    "https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel",
  ],
  [
    "Motion：Layout animations（概念对照，本课未安装）",
    "https://motion.dev/docs/react-layout-animations",
  ],
];
export const layoutMotionInitial = () => ({
  step: 0,
  done: [],
  reordered: false,
  inspected: false,
  modeCompared: false,
  expandedSeen: false,
  collapsedSeen: false,
  noStretchReviewed: false,
  multiChanged: false,
  reducedChecked: false,
  longSeen: false,
  animate: true,
  duration: 300,
  noMotion: false,
  longContent: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readLayoutMotionProgress() {
  const b = layoutMotionInitial();
  try {
    const x = JSON.parse(localStorage.getItem(LAYOUT_MOTION_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([300, 1200].includes(x.duration)) b.duration = x.duration;
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = layoutMotionQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
