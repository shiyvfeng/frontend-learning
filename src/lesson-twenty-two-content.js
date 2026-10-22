export const SCROLL_STORAGE = "frontend-observatory.lesson22.v1";
export const scrollScope =
  "本例只驱动有边框的局部滚动框，课程页面本身照常滚动。主读数来自真实scrollTop、scrollHeight和clientHeight，JS被动监听scroll并最多合并一次待处理rAF，不持续循环；支持时第二条细线实际使用原生CSS scroll timeline，始终对照整个滚动距离。入场反馈由同一滚动框作为root的IntersectionObserver触发一次，不是逐像素进度。未安装GSAP，不拦截滚轮、触摸或键盘。";
export const scrollSteps = [
  {
    short: "进度",
    time: "4 分钟",
    title: "滚动到哪，进度就对应到哪",
    desc: "在明确标注的框内真实前滚与后滚。键盘聚焦滚动框后可用方向键、PageDown、Home/End；触屏在框内滑动，框外仍是课程页面。",
  },
  {
    short: "触发",
    time: "4 分钟",
    title: "入场播放一次，不等于绑定进度",
    desc: "把第二张内容卡滚进框内，再往回滚：入场记录保留，进度会倒退。切换20%–80%教学区间，比较timeline与scrub。",
  },
  {
    short: "边界",
    time: "4 分钟",
    title: "内容和屏幕变了，区间也要重算",
    desc: "增加长内容并读取新滚动距离。体验减少动态和静态回退；短视口或放大后解除sticky，所有正文仍在自然顺序里。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "描述滚动关系，而非指定万能库",
    desc: "判断触发/绑定、固定区域与回退策略。可以重试，解释始终可读。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "写清滚动区间、阶段和阅读退路",
    desc: "生成可编辑的Agent简报，说明固定范围、窄屏、减少动态与生命周期，再复制使用。",
  },
];
export const scrollQuestions = [
  {
    q: "看到元素进入视口后播放600ms，是否等于scrub？",
    options: [
      "是，任何滚动相关效果都逐帧绑定滚动",
      "不是；入场只触发时间播放，scrub把进度绑定滚动区间，反滚可回退",
    ],
    correct: 1,
    why: "IntersectionObserver适合观察交叉阈值，不是精确逐像素timeline。入场触发可有时间动画；进度绑定则由滚动位置决定，两者不应混称。",
  },
  {
    q: "sticky、pin、timeline与GSAP是什么关系？",
    options: [
      "sticky是CSS定位；pin是固定一段区间的行为；timeline/scrub描述编排与进度关系，原生CSS也是候选",
      "只要固定或滚动动画，就必须安装GSAP",
    ],
    correct: 0,
    why: "本例用CSS sticky、小范围JS测量及原生CSS scroll timeline。GSAP ScrollTrigger是可选工具，复杂编排、pin或平滑追随可按需要选，不把库名当效果定义。",
  },
  {
    q: "内容变长、短视口或减少动态时，应怎样验收？",
    options: [
      "冻结初始分母，锁住滚动直到动画完成",
      "重算scrollHeight-clientHeight和区间；缩小或解除固定，静态内容完整且键盘/触屏可继续",
    ],
    correct: 1,
    why: "无可滚动距离时不除以0；前后边界夹在0–100%。不劫持滚动、不把正文初始隐藏。减少动态停非必要位移，读数与完整内容仍可使用。",
  },
];
export const scrollSources = [
  [
    "MDN：CSS animation-timeline",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline",
  ],
  [
    "MDN：scroll() timeline",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/scroll",
  ],
  [
    "MDN：scrollHeight与边界",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight",
  ],
  [
    "MDN：IntersectionObserver",
    "https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API",
  ],
  [
    "MDN：ResizeObserver",
    "https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver",
  ],
  [
    "GSAP：ScrollTrigger（候选，未安装）",
    "https://gsap.com/docs/v3/Plugins/ScrollTrigger/",
  ],
];
export const scrollInitial = () => ({
  step: 0,
  done: [],
  forwardSeen: false,
  backSeen: false,
  inspected: false,
  entrySeen: false,
  rangeCompared: false,
  compared: false,
  heightChanged: false,
  reducedChecked: false,
  fallbackReviewed: false,
  range: "full",
  longContent: false,
  noMotion: false,
  forceStatic: false,
  caption: "让内容按自己的节奏被读到",
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readScrollProgress() {
  const b = scrollInitial();
  try {
    const x = JSON.parse(localStorage.getItem(SCROLL_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if (["full", "middle"].includes(x.range)) b.range = x.range;
    if (typeof x.caption === "string") b.caption = x.caption.slice(0, 80);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = scrollQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export function scrollMetrics(top, height, client, range = "full") {
  const max = Math.max(0, height - client),
    position = Math.max(0, Math.min(max, top)),
    start = range === "middle" ? max * 0.2 : 0,
    end = range === "middle" ? max * 0.8 : max,
    span = end - start;
  const progress =
      span > 0 ? Math.max(0, Math.min(1, (position - start) / span)) : 0,
    whole = max > 0 ? position / max : 0;
  return {
    max,
    position,
    start,
    end,
    progress,
    whole,
    phase:
      progress < 1 / 3 ? "01 认识" : progress < 2 / 3 ? "02 比较" : "03 验收",
  };
}
