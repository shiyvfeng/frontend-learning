export const TOOL06_STORAGE = "frontend-observatory.tool06.v1";
export const tool06Scope =
  "真实GSAP3.15.0：独立的paused timeline负责时间播放，另一个timeline由真实ScrollTrigger绑定局部原生滚动框。不是手写scrollY分支，也未接入ScrollSmoother/滚动劫持。静态/系统reduce/隐藏/模块失败时不创建滚动绑定或pin，阶段按钮只作明确的静态示意。";
export const tool06Steps = [
  {
    short: "时间编排",
    title: "时间线安排先后，不要求用户一直滚动",
    time: "4分钟",
    desc: "比较CSS、Motion和GSAP的条件；播放、暂停、反向同一条真实时间线，也可直接跳阶段。默认暂停，没有自动循环或必须等动画的门槛。",
  },
  {
    short: "滚动绑定",
    title: "同样的阶段，可以由滚动距离推进和退回",
    time: "4分钟",
    desc: "这是标有边框的局部滚动框，页面滚动与框内滚动不同。真实ScrollTrigger把区间进度交给第二条独立时间线；按钮是辅助定位，不冒充手势。",
  },
  {
    short: "pin与恢复",
    title: "固定的是观看区域，不是锁住阅读和操作",
    time: "5分钟",
    desc: "改变pin、scrub与区间距离后重建场景并回起点，观察实际区间与实例数。短视口自动不固定；控件在框外，静态模式可跳阶段。",
  },
  {
    short: "判断理由",
    title: "选择工具和约束，不背API或品牌排名",
    time: "3分钟",
    desc: "三题有解释可重试，区分时间、距离、追随缓冲和固定区域。",
  },
  {
    short: "Agent简报",
    title: "把阶段、区间和回退写成可验收的合同",
    time: "4分钟",
    desc: "编辑项目现状，明确为何使用GSAP、哪些留给CSS/Motion、pin/scrub目的和清理策略。本地规则生成草稿，不发送、不自动执行。",
  },
];
export const tool06Needs = [
  {
    id: "css",
    label: "少量按钮反馈",
    why: "颜色、边框或简单进出可先选CSS；不因名字迁库，仍需业务状态和可见焦点。",
  },
  {
    id: "motion",
    label: "React布局与存在",
    why: "React列表进入/退出、布局和目标变化可评估Motion；并非只能用Motion，也不保证自动无障碍。",
  },
  {
    id: "gsap",
    label: "多段时间与滚动编排",
    why: "多个目标、重叠阶段、标签、播放控制或滚动编排需要统一调度时可评估GSAP/ScrollTrigger；承担依赖、测量、生命周期和维护成本，不宣称更高级或必然更快。",
  },
];
export const tool06Questions = [
  {
    q: "时间线总长2.4秒，滚动区间480px，scrub:true，应该怎么理解？",
    options: [
      "必须先等2.4秒再滚动，480px是动画时长",
      "滚动区间决定进度，时间线时长定义内部阶段比例；scrub:true直接追随区间",
    ],
    correct: 1,
    why: "播放时间线按秒推进；scrub把滚动进度映射到同一套阶段比例，不等于固定等候时长。数值scrub增加追随缓冲，也不是扩大滚动距离。",
  },
  {
    q: "需要一边看图一边滚过几个阶段，pin应如何约束？",
    options: [
      "仅在合适区间固定无交互的图示，预留空间；短视口/reduce不固定，正文与控件始终可达",
      "固定整页并吞掉键盘和触摸，强制看完才继续",
    ],
    correct: 0,
    why: "pin管理视觉位置，不能锁死阅读。示例只固定局部框内的无交互图示，ScrollTrigger增加占位；销毁要还原占位和样式，不残留隐藏Tab目标。",
  },
  {
    q: "普通CSS反馈已经足够，是否应把全部动画迁到GSAP？",
    options: [
      "是，装得多就更专业，免费等于MIT且没有任何条件",
      "不必，按需求和团队选择；明确清理、减少动态、依赖预算，并核对当前许可",
    ],
    correct: 1,
    why: "CSS、Motion、GSAP有交集和不同便利点，没有绝对排名。GSAP包标注Standard No Charge许可，不是MIT；官方免费公告不替代实际产品用途的条款核对。",
  },
];
export const tool06Sources = [
  ["GSAP · Timeline", "https://gsap.com/docs/v3/GSAP/Timeline/"],
  ["GSAP · ScrollTrigger", "https://gsap.com/docs/v3/Plugins/ScrollTrigger/"],
  ["GSAP · context与清理", "https://gsap.com/docs/v3/GSAP/gsap.context()/"],
  [
    "GSAP · refresh",
    "https://gsap.com/docs/v3/Plugins/ScrollTrigger/refresh()/",
  ],
  ["GSAP · 免费公告（包括商业使用）", "https://gsap.com/blog/3-13/"],
  ["GSAP · 当前许可入口", "https://gsap.com/standard-license/"],
  ["本例包版本与版权说明", "/licenses/gsap-notice.txt"],
];
export const tool06Initial = () => ({
  step: 0,
  done: [],
  need: "css",
  needsSeen: ["css"],
  mode: "normal",
  speed: "1",
  scrub: "direct",
  pin: true,
  distance: "480",
  playedSeen: false,
  pausedSeen: false,
  reversedSeen: false,
  forwardSeen: false,
  backSeen: false,
  pinSeen: false,
  scrubSeen: false,
  resetSeen: false,
  measuredSeen: false,
  runtimeSeen: false,
  fallbackAcknowledged: false,
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function readTool06Progress() {
  const d = tool06Initial();
  try {
    const s = JSON.parse(localStorage.getItem(TOOL06_STORAGE));
    if (!s || typeof s !== "object") return d;
    const r = { ...d };
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof s[k] === "boolean") r[k] = s[k];
    for (const [k, values] of Object.entries({
      need: tool06Needs.map((n) => n.id),
      mode: ["normal", "static"],
      speed: ["1", "0.5"],
      scrub: ["direct", "catchup"],
      distance: ["480", "720"],
    }))
      if (values.includes(s[k])) r[k] = s[k];
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
            s.needsSeen.filter((v) => tool06Needs.some((n) => n.id === v)),
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
export function tool06Brief(d) {
  return `GSAP时间与滚动编排草稿\n项目现状（用户核对）：${d.context || "【待确认现有组件、动效和浏览器约束】"}\n选型条件：${tool06Needs.find((n) => n.id === d.need)?.why || tool06Needs[0].why} 简单颜色反馈保留CSS，React存在/布局可评估Motion；不强制统一迁库。\n实际机制：${tool06Scope}\n时间合同：移动0–1秒、绘制0.8–1.6秒、翻转1.6–2.4秒，包含0.2秒重叠。独立时间线默认暂停，播放/暂停/反向保持当前进度，允许静态跳0/50/100%；不依赖等待时长通关。倍速只改变时间播放，不改变滚动区间。\n滚动合同：明确本例是局部原生滚动框，trigger顶部对齐scroller顶部为start，end在其后${d.distance}px；第二条时间线由ScrollTrigger独占控制，不再同时调用play争用。scrub=${d.scrub === "direct" ? "true直接追随" : "0.35秒缓冲追随"}，不是滚动距离也不是整段总时长；初始化/刷新可直接对齐，已建立绑定后再缓冲追随。pin${d.pin ? "候选启用" : "关闭"}只固定无交互图示并保留占位，不固定阅读/控制区。关闭pin但绑定仍启用时，用普通布局保留足够滚动内容，保证终点实际可达；不使用normalizeScroll或截获外部页面/浏览器缩放。\n窄屏与回退：图示不超过局部框高度，控件在框外，文字阶段始终可读；短视口/极窄屏不pin。系统reduce/用户静态/隐藏/模块失败停止本场景timeline与ScrollTrigger，移除pin占位与普通布局的额外滚动间距，并保留完整内容、可操作静态阶段按钮；回到正常模式不自动补播。静态样例不冒称真实GSAP或真实滚动绑定。\n生命周期与清理：gsap.context归集并revert本例；重建前销毁旧实例、观察器、媒体/内部事件订阅、初始化延迟调用和待处理帧，刷新尺寸/区间。隐藏和离站关闭本专题独占的ScrollTrigger服务并停止ticker，缓存模块不等于继续动画。不要影响其他模块的控制权；扩大到多GSAP区域时集中管理共享服务。参数重建与重置回起点、按钮保持焦点，不让迟到模块或旧完成回调重建旧场景/抢外部焦点。\n验收：真实中间帧、暂停稳定、当前进度反向、原生滚动前后退和辅助定位；核对start/end/实际scroller与唯一实例、pin占位出现和移除、resize/快速切参/重置/卸载/恢复。真实Tab可进入和离开，触屏不依赖hover，375px/短视口/长内容/reduce实时切换可完成；报告实际浏览器和设备限制，无凭空跑分。\n许可：3.15.0标注Standard No Charge，不是MIT；官方公告包含免费商业使用，实际产品仍按当前生效条款/用途核对。本课是固定原创教学演示，不提供任意动画创作、资产或代码导出服务。官网许可正文在本次核对时跳离线页，不能据此承诺已核验全文。\n本地规则草稿可编辑复制，尚未发送、执行或部署；进度和选择仅在当前浏览器，无业务网络/跨设备同步。T06为工具专题，T07已开放，原46项入口已制作，各章学习进度独立。`;
}
