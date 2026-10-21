export const FEEDBACK_STORAGE = "frontend-observatory.lesson15.v1";
export const feedbackSteps = [
  {
    short: "等待",
    time: "4 分钟",
    title: "同一段等待，不同的反馈",
    desc: "在同一取数实验比较 spinner 与 Skeleton，手动结束本地延迟。没有网络或真实服务器。",
  },
  {
    short: "预测",
    time: "4 分钟",
    title: "先显示，还是等确认？",
    desc: "同一个低风险收藏操作，比较等待确认与乐观显示。失败后看实际回滚，再重试。",
  },
  {
    short: "恢复",
    time: "5 分钟",
    title: "A 失败，不能把后来的 B 一起删掉",
    desc: "按条目模拟乱序结果、重复操作、取消与重试；预测和确认分别可见。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "按风险和内容选择反馈",
    desc: "答案可以重试。阅读理由，避免把占位、预测和真实结果混为一谈。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "给 Agent 一份能失败也能恢复的简报",
    desc: "列出重复点击、错误、取消、回滚、重试和完成反馈，并说明数据归属与焦点。",
  },
];
export const feedbackQuestions = [
  {
    q: "spinner 一定表示未知时长，Skeleton 一定是真实内容吗？",
    options: [
      "是，两种效果已经说明了数据状态",
      "不是：忙碌图标可与已知进度并存，骨架只是占位",
    ],
    correct: 1,
    why: "反馈形式不自动决定是否知道完成时间。只有能测量的进度才显示百分比；Skeleton 表达预期布局，尚未加载的数据不能假称已存在。",
  },
  {
    q: "A 先提交，B 后提交并先成功；A 随后失败，怎么回滚？",
    options: ["只回滚 A，保留已经成功的 B", "恢复 A 提交前的整张旧列表"],
    correct: 0,
    why: "旧的整表快照可能删掉后续 B。按稳定条目 ID 与尝试编号处理，只影响相关操作；取消后旧结果也要核对归属。",
  },
  {
    q: "支付、权限与不可逆操作也应一律乐观成功吗？",
    options: [
      "应该，先显示成功总能显得更快",
      "不应该：按风险确认，预测不能代替真实结果",
    ],
    correct: 1,
    why: "乐观 UI 适合可恢复、失败能解释的操作。高风险或不可逆动作需要验证与确认；所有方案仍要设计错误、取消、重试与最终反馈。",
  },
];
export const feedbackSources = [
  ["React：useOptimistic", "https://react.dev/reference/react/useOptimistic"],
  [
    "TanStack Query：Optimistic Updates",
    "https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates",
  ],
  [
    "MDN：aria-busy",
    "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy",
  ],
  [
    "MDN：prefers-reduced-motion",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion",
  ],
  [
    "WAI：Alert 不应移动键盘焦点",
    "https://www.w3.org/WAI/ARIA/apg/patterns/alert/",
  ],
];
export const feedbackInitial = () => ({
  step: 0,
  done: [],
  loadingModes: [],
  loadingSuccess: false,
  loadingFailure: false,
  knownProgress: false,
  loadingCancelled: false,
  waitConfirmed: false,
  optimisticRollback: false,
  favoriteRetried: false,
  laterPreserved: false,
  outOfOrder: false,
  duplicateBlocked: false,
  cancelIgnored: false,
  itemRetried: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readFeedbackProgress() {
  const b = feedbackInitial();
  try {
    const x = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    for (const [k, vs] of Object.entries({
      done: [0, 1, 2, 3, 4],
      loadingModes: ["spinner", "skeleton"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => vs.includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = feedbackQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
