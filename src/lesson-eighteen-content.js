export const PRESENCE_STORAGE = "frontend-observatory.lesson18.v1";
export const presenceAnimationScope =
  "本例的淡入淡出（opacity）和上下移动（transform）只作用于进入或离开的通知本身。通知真正删除后，其余通知会按正常布局重新排列，可能直接跳到新位置。本例尚未实现 Layout Animation；让其余项平滑换位的布局动画留到第20课。";
export const presenceSteps = [
  {
    short: "去留",
    time: "4 分钟",
    title: "先留在 DOM，才能演完离场",
    desc: "直接条件卸载立即移除。另一侧先进入 exiting，结束后才真正删除节点；不是把透明度设为零就一直藏着。",
  },
  {
    short: "阶段",
    time: "4 分钟",
    title: "可见、存在、可操作，是三件事",
    desc: "暂停或慢速观察 entering / present / exiting；读取 DOM 和阶段。离场内容保留画面，内部控件立即退出 Tab。",
  },
  {
    short: "打断",
    time: "4 分钟",
    title: "撤回离场，旧回调不能删掉新状态",
    desc: "快速添加、删除、撤回和取消。每个实例与每次过渡有独立编号；手动投递旧完成信号，核对它被隔离。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "动效结束，不等于生命周期自动结束",
    desc: "选择后读理由，可直接重试。分清 CSS、WAAPI 与 presence 管理的责任。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "把卸载、打断与焦点也写进简报",
    desc: "交代触发、属性、时序、节点移除、减少动态和验收，不只描述一个淡出效果。",
  },
];
export const presenceQuestions = [
  {
    q: "条件为 false 后已经卸载的节点，还能自己播放 exit 吗？",
    options: [
      "不能，需先保留节点，完成离场后再卸载",
      "能，只要写了 opacity transition 就一定会播",
    ],
    correct: 0,
    why: "节点不在 DOM 就没有可渲染的离场过程。需要明确的存在管理，或合适库的 presence 机制；不是动画属性自己决定何时卸载。",
  },
  {
    q: "离场中的通知还有输入框，该怎么处理焦点？",
    options: [
      "仍可 Tab 到它，淡出更好看",
      "先按当前焦点归属迁移，再使离场内容 inert；外部焦点不被抢走",
    ],
    correct: 1,
    why: "视觉还在不代表应可操作。移除当前持焦项时找下个可用入口；焦点在无关控件就保持。离场结束后真正移除，不能留下透明的 Tab 目标。",
  },
  {
    q: "动画中撤回后，旧的完成回调到达该怎么办？",
    options: [
      "核对实例和过渡编号/阶段，过期信号忽略；减少动态可即时完成",
      "一律删除同名通知，名称相同就是同一实例",
    ],
    correct: 0,
    why: "名称不是身份。实例 ID 与过渡代次隔离旧回调；取消、快速反转和卸载都要清理动画。CSS/WAAPI 负责动画，React 或 presence 逻辑负责保留和删除，本课未使用 Motion。",
  },
];
export const presenceSources = [
  [
    "MDN：Element.animate()",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/animate",
  ],
  [
    "MDN：Animation.cancel()",
    "https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel",
  ],
  [
    "MDN：Animation finish event",
    "https://developer.mozilla.org/en-US/docs/Web/API/Animation/finish_event",
  ],
  [
    "MDN：inert",
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert",
  ],
  [
    "MDN：prefers-reduced-motion",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion",
  ],
  [
    "Motion：AnimatePresence（概念对照，本站未使用）",
    "https://motion.dev/docs/react-animate-presence",
  ],
];
export const presenceInitial = () => ({
  step: 0,
  done: [],
  directRemoved: false,
  added: false,
  exitRemoved: false,
  phaseRead: false,
  speedChanged: false,
  labelEdited: false,
  compared: false,
  restored: false,
  cancelled: false,
  staleIgnored: false,
  staticPolicyRead: false,
  duration: 280,
  hold: false,
  noMotion: false,
  label: "方案已保存在本地",
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readPresenceProgress() {
  const b = presenceInitial();
  try {
    const x = JSON.parse(localStorage.getItem(PRESENCE_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([280, 1800].includes(x.duration)) b.duration = x.duration;
    if (typeof x.label === "string") b.label = x.label.slice(0, 60);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = presenceQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
