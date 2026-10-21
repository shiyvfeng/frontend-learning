export const CONDITIONAL_STORAGE = "frontend-observatory.lesson14.v1";
export const conditionalSteps = [
  {
    short: "分支",
    time: "4 分钟",
    title: "一个状态，一组实际内容",
    desc: "本地模拟上传：不用选文件，不联网。手动推进每个阶段，观察内容和按钮被替换。",
  },
  {
    short: "记忆",
    time: "4 分钟",
    title: "看不见，等于不存在吗？",
    desc: "为两张卡填入说明，再隐藏并恢复。比较真实组件内部输入值、节点身份与焦点。",
  },
  {
    short: "恢复",
    time: "4 分钟",
    title: "取消之后，旧结果还能回来吗？",
    desc: "模拟一个稍后才到的回调：取消任务，再投递旧结果。新任务只能接受自己的结果。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "把分支与恢复说清楚",
    desc: "选择后阅读理由，答错可以直接重新选择。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "让 Agent 实现完整的条件合同",
    desc: "指令要列出空、失败、取消、恢复与重试路径，而不只有成功截图。",
  },
];
export const conditionalQuestions = [
  {
    q: "条件不渲染与 HTML hidden 一样吗？",
    options: [
      "一样，内部输入都会保留",
      "不同：卸载会销毁内部 State；hidden 保留实例",
    ],
    correct: 1,
    why: "移出 React 树会卸载组件。hidden 仍保留组件和内部值，但不可见内容也不应进入 Tab 顺序。状态若由父级持有，卸载后仍可从父级恢复。",
  },
  {
    q: "输入框即将随分支消失，焦点应该怎样处理？",
    options: [
      "先移到可见的恢复入口，再隐藏或卸载",
      "保留在不可见输入中，让用户自己找",
    ],
    correct: 0,
    why: "隐藏中的字段不可操作。先恢复到明确、可见、未被遮挡的入口，避免丢失位置；恢复内容不代表自动把焦点抢回输入。",
  },
  {
    q: "取消后旧成功结果到达，应怎样处理？",
    options: [
      "显示成功，因为结果已经到了",
      "核对任务编号与阶段，忽略已失效结果",
    ],
    correct: 1,
    why: "取消使该任务失效；新任务必须有新编号。旧回调不能把空状态或新任务覆盖成旧成功。仅清除界面文字并不够。",
  },
];
export const conditionalSources = [
  ["React：条件渲染", "https://react.dev/learn/conditional-rendering"],
  [
    "React：保留与重置 State",
    "https://react.dev/learn/preserving-and-resetting-state",
  ],
  [
    "MDN：hidden",
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden",
  ],
  [
    "MDN：HTMLElement.focus",
    "https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus",
  ],
];
export const conditionalInitial = () => ({
  step: 0,
  done: [],
  seen: ["empty"],
  retried: false,
  cancelled: false,
  unmountVerified: false,
  hiddenVerified: false,
  staleVerified: false,
  recovered: false,
  parentVerified: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readConditionalProgress() {
  const b = conditionalInitial();
  try {
    const x = JSON.parse(localStorage.getItem(CONDITIONAL_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    for (const [k, vs] of Object.entries({
      done: [0, 1, 2, 3, 4],
      seen: ["empty", "uploading", "processing", "success", "failure"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => vs.includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = conditionalQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
