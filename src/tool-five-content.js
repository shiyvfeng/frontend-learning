export const TOOL05_STORAGE = "frontend-observatory.tool05.v1";
export const tool05Scope =
  "真实Motion14.6.0，通过motion/react的motion.li、AnimatePresence/popLayout和layout=position运行；非CSS冒充Motion、未使用layoutId。简单按钮颜色/边框反馈仍由CSS负责，结构/可见ID/备注由React模型负责。本地静态资源按需加载，无业务网络/协作服务。静态/减少动态或模块失败时保留同模型React列表，明确不算验证了动画。";
export const tool05Steps = [
  {
    short: "按需选库",
    title: "简单颜色交给CSS，复杂生命周期再考虑Motion",
    time: "4分钟",
    desc: "比较需求条件，体验真实CSS反馈与加入C卡片。候选说明不把所有动画统一迁到库；下方正常模式真实运行Motion。",
  },
  {
    short: "布局与打断",
    title: "最终布局先改变，位置过渡可以继续被改变",
    time: "4分钟",
    desc: "反转DOM顺序、展开说明和快速反向，观察当前画面向新目标过渡。position-only避免文本被布局scale拉伸；本卡尺寸立即改变，不声称平滑尺寸动画。",
  },
  {
    short: "退出与恢复",
    title: "先失去交互，再离开DOM；撤回要尊重最新状态",
    time: "5分钟",
    desc: "移除、立即撤回与再次移除。AnimatePresence暂留退出节点，useIsPresent使其inert/aria-hidden；焦点仅在本次操作将其移走时回到稳定入口。",
  },
  {
    short: "判断理由",
    title: "按效果、生命周期与约束选择工具",
    time: "3分钟",
    desc: "三题有理由可重试，不背API。库管理视觉不等于替业务决定最终可见状态或无障碍策略。",
  },
  {
    short: "Agent简报",
    title: "写清为什么用Motion，以及哪些不用",
    time: "4分钟",
    desc: "编辑项目约定，交代CSS分工、稳定ID、退出/反向、布局尺寸、焦点与减少动态。生成本地草稿，不发送、不自动执行或验收。",
  },
];
export const tool05Needs = [
  {
    id: "css",
    label: "简单按钮颜色",
    why: "少量颜色/边框/透明度反馈，CSS transition和原生状态通常已足够；JS仍可处理业务。不要为名字引入整个库，也不要用transition:all代替属性和验收。",
  },
  {
    id: "list",
    label: "退出与动态布局",
    why: "已有React列表要进入/退出、排序与反向，Motion可统一视觉生命周期和布局测量。需要稳定key、退出失去交互、真实状态与焦点策略，并承担依赖/下载和回归成本。",
  },
  {
    id: "static",
    label: "静态阅读优先",
    why: "阅读、低性能/兼容与减少动态可选择静态内容或更轻方案。Motion不是自然感/性能/可访问性的自动保证；不要求把普通CSS或所有旧动效迁移。",
  },
];
export const tool05Questions = [
  {
    q: "按钮只需要颜色和边框反馈，是否必须换成Motion？",
    options: [
      "必须，所有交互统一由一个动画库承担",
      "不必，简单CSS通常足够，按现有项目和复杂度决定",
    ],
    correct: 1,
    why: "库会增加依赖和维护成本。简单:hover/:active/:focus-visible可用CSS；需要退出生命周期、动态布局和打断时再评估Motion，不按库名或数量评分。",
  },
  {
    q: "React已不再渲染A，但退出动画尚未结束，哪种处理更完整？",
    options: [
      "允许库暂留节点，但退出分支先inert/退出Tab与点击，持焦项移除时合理恢复；业务可见ID仍以最新模型为准",
      "继续让透明按钮接受Tab，等动画最后一帧再处理状态",
    ],
    correct: 0,
    why: "AnimatePresence管理视觉存在，业务数据和焦点仍需应用负责。快速撤回稳定key要让库反向，旧完成信号不能再删掉新对象或抢外部焦点，不能把透明当已卸载。",
  },
  {
    q: "本例layout=position展开卡片，应该怎样向Agent说明？",
    options: [
      "所有文字和尺寸都会自动平滑变化，不必测窄屏",
      "位置会过渡，本卡尺寸采用最终CSS布局；减少动态即时静态，检查打断、焦点和长内容",
    ],
    correct: 1,
    why: "position-only主要动画化位置，不承诺尺寸连续；文本不靠父级scale拉伸。用实际DOM/中途几何与最终状态验收，不只截图最后帧。弹簧预设也不是必须明显回弹。",
  },
];
export const tool05Sources = [
  ["Motion及所需子包MIT声明", "/licenses/motion-MIT.txt"],
  ["Motion · React组件", "https://motion.dev/docs/react-motion-component"],
  [
    "Motion · AnimatePresence与popLayout",
    "https://motion.dev/docs/react-animate-presence",
  ],
  ["Motion · React布局动画", "https://motion.dev/docs/react-layout-animations"],
  ["Motion · MotionConfig", "https://motion.dev/docs/react-motion-config"],
  ["Motion · 减少动态", "https://motion.dev/docs/react-use-reduced-motion"],
  ["Motion · Transition与spring", "https://motion.dev/docs/react-transitions"],
];
export const tool05Initial = () => ({
  step: 0,
  done: [],
  need: "css",
  needsSeen: ["css"],
  playback: "standard",
  selected: "a",
  runtimeSeen: false,
  fallbackAcknowledged: false,
  cssSeen: false,
  addedSeen: false,
  reorderedSeen: false,
  expandedSeen: false,
  measuredSeen: false,
  removedSeen: false,
  undoSeen: false,
  resetSeen: false,
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function readTool05Progress() {
  const d = tool05Initial();
  try {
    const s = JSON.parse(localStorage.getItem(TOOL05_STORAGE));
    if (!s || typeof s !== "object") return d;
    const r = { ...d };
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof s[k] === "boolean") r[k] = s[k];
    for (const [k, vs] of Object.entries({
      need: tool05Needs.map((n) => n.id),
      playback: ["standard", "slow", "static"],
      selected: ["a", "b", "c"],
    }))
      if (vs.includes(s[k])) r[k] = s[k];
    r.step = Number.isInteger(s.step) && s.step >= 0 && s.step < 5 ? s.step : 0;
    r.done = Array.isArray(s.done)
      ? [
          ...new Set(
            s.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
          ),
        ]
      : [];
    r.needsSeen = Array.isArray(s.needsSeen)
      ? [
          ...new Set(
            s.needsSeen.filter((v) => tool05Needs.some((n) => n.id === v)),
          ),
        ]
      : d.needsSeen;
    r.answers = d.answers.map((_, i) =>
      [0, 1].includes(s.answers?.[i]) ? s.answers[i] : null,
    );
    for (const [k, n] of Object.entries({ context: 700, draft: 10000 }))
      if (typeof s[k] === "string") r[k] = s[k].slice(0, n);
    r.reviewed =
      r.reviewed && r.generated && !r.draftStale && r.draft.trim().length >= 80;
    return r;
  } catch {
    return d;
  }
}
export function tool05Brief(d) {
  return `Motion与CSS分工草稿\n项目现状（用户核对）：${d.context || "【待确认现有动效、组件、依赖和浏览器约束】"}\n需求候选：${tool05Needs.find((n) => n.id === d.need)?.why || tool05Needs[0].why}\n实际机制：${tool05Scope}\n使用理由：动态React列表需要进入/退出生命周期、重排位置与反复打断时，Motion是候选；不要以统一风格为由把所有CSS反馈迁库。按钮颜色/边框与可见focus保留CSS/原生语义。列出依赖与下载预算，先复用既有约定。\n视觉合同：稳定ID/key匹配卡片，进入保持完全可读并轻移y，退出用opacity和轻微y；layout=position处理排序和邻卡位置，展开尺寸立即采用最终CSS布局，不声称卡片尺寸平滑或让文字/图像被布局scale拉伸。本例${d.playback === "slow" ? "慢速观察预设仅作用后续动作，不是生产时长建议" : d.playback === "static" ? "用户选择静态对照" : "迅速稳定预设"}；spring按效果选稳定程度，不要求所有按钮弹跳。\n生命周期与反向：React的可见ID是最终真相；AnimatePresence/popLayout暂留退出DOM，直接自定义子项需把ref转发到真实节点；useIsPresent标记退出分支inert/aria-hidden、原生控件disabled并禁用指针，不残留不可见Tab目标。快速撤回或改变目标允许再次操作，保持备注/标记、顺序和唯一节点；不让旧完成回调删除新实例。\n焦点与清理：移除持焦项才回到稳定恢复入口，用户已到外部不抢；排序不重建业务状态。减少动态/隐藏/手动静态会停止本场景Motion并显示同模型静态列表，恢复时不自动补播。专题重置/卸载/导航作废旧模块与动画观察回调，场景恢复只清会话与当前动画；必要的焦点/输入选择恢复只在原节点失效且焦点仍归本次操作时执行。无空闲持续rAF、无自动循环或强制等动画的通关门槛。\n失败与验收：模块加载失败保留完整可操作静态列表，可重载重试，回退不冒称实际验证Motion。${d.fallbackAcknowledged && !d.runtimeSeen ? "当前学习使用了模块失败回退，真实Motion尚待补测。" : "进度仅记录本浏览器曾观察的机制，不代表当前生产站或所有设备已验证。"}检查真实中间帧computed transform/opacity、DOM顺序与最终布局、退出DOM及不可交互、快速反向/重复/重置/卸载/迟到结果、外部新焦点、375px/短视口/长内容和系统reduce实时切换。真实Tab与触屏都能完成，报告实际设备/浏览器限制，不伪称AI评审或性能保证。\n本地草稿可编辑复制，尚未发送、执行或部署。进度/选择/草稿只在当前浏览器，卡片备注/标记/可见集合离站清空，无业务服务器或跨设备同步。T05是工具专题，T12仍为1个预告，课程未全部完成。`;
}
