export const TOOL03_STORAGE = "frontend-observatory.tool03.v1";
export const tool03Scope =
  "真实采用@radix-ui/react-dialog1.3.1（Primitives，非Radix Themes），外观为本站手写CSS。Base UI仅作未安装的候选说明；未运行Base UI Dialog，也未将手写div模拟称为库。选择框/按钮仍用原生元素。教学编辑只在本地会话，无业务请求、上传或外部Agent执行。";
export const tool03Steps = [
  {
    short: "选择职责",
    title: "行为底座、视觉样式和原生元素各有职责",
    time: "4分钟",
    desc: "比较候选条件，再打开真实Radix Dialog，读取名称、描述和焦点契约。不是看见圆角卡片就代表有完整对话框行为。",
  },
  {
    short: "定制外观",
    title: "改变主题与尺寸，保留同一套行为契约",
    time: "4分钟",
    desc: "真实Portal挂到body，离开演示的裁切祖先；它不是浏览器top layer，也不保证解决任何层叠问题。标签、焦点视觉与尺寸仍由实现者负责。",
  },
  {
    short: "恢复路径",
    title: "取消、校验错误与入口消失都要有出口",
    time: "4分钟",
    desc: "空标题留在面板内给出本例校验；取消不提交。移除trigger后返回稳定入口，旧关闭回调不能抢新面板或已移动的焦点。",
  },
  {
    short: "判断理由",
    title: "保留primitive的行为，不把无样式理解为无责任",
    time: "3分钟",
    desc: "带理由的三题可重试。不按库名评优劣，也不要求从div重新实现成熟交互。",
  },
  {
    short: "Agent简报",
    title: "先复用约定，再定制外观与验收",
    time: "4分钟",
    desc: "写清实际primitive、语义、焦点、Portal、关闭与恢复路径。生成可编辑本地草稿，不发送或宣称生产验证已完成。",
  },
];
export const tool03Choices = [
  {
    id: "existing",
    label: "先看现有组件",
    why: "若项目已有符合需求的Dialog，优先复用其行为和token；先验证缺口，不因新工具专题替换全站。",
  },
  {
    id: "radix",
    label: "Radix Primitives",
    why: "本例真实运行Dialog。适合沿用Radix组合方式的团队；外观自由，但需提供功能样式、标签、焦点视觉、业务状态和测试。",
  },
  {
    id: "base",
    label: "Base UI候选",
    why: "也提供无样式交互组件；若项目已用Base UI或其组合/API更符合约束，可以评估。API与组件支持逐项比较，不和Radix绝对排序，本例未安装或运行它。",
  },
  {
    id: "native",
    label: "原生元素候选",
    why: "原生button已有基本键盘行为；简单模态可评估dialog/showModal及目标浏览器。依然要提供名称、关闭/焦点策略和样式，不是所有场景都必须加库。",
  },
];
export const tool03Long =
  "这是一段虚构的教学说明，用于观察窄屏和短视口中的阅读与操作。主题可以调整，标题、描述、可见关闭按钮和焦点约束仍要保留。长内容不能盖住操作入口；需要时在面板内部正常滚动，不让背景页面意外接受操作。";
export const tool03Questions = [
  {
    q: "换成无样式primitive后，名称、对比度和可见焦点就都由库自动完成吗？",
    options: [
      "是，只要安装库就不用写标签和功能样式",
      "不是，库提供行为基础，实现者仍要交代文字、外观和业务契约",
    ],
    correct: 1,
    why: "本例实际使用Radix Dialog，而标题/描述文字、按钮语义、对比度、覆盖范围、滚动尺寸和校验由本站提供。原生元素可复用；不要把无样式理解为不需负责。",
  },
  {
    q: "Portal到body，是否就等于浏览器top layer并保证永不遮挡？",
    options: [
      "不是；它改变DOM位置，仍需看层叠、定位和原生top layer",
      "是，Portal会自动压过所有原生dialog和popover",
    ],
    correct: 0,
    why: "本例Portal确实离开裁切祖先，但不是原生showModal的top layer。z-index、定位上下文、容器选择与其他弹层都要一起验收，不能把Portal当万能层叠修复。",
  },
  {
    q: "给Agent定制对话框，哪种要求更完整？",
    options: [
      "从div重做全部行为，关闭后无须考虑触发器是否还在",
      "优先现有组件/primitive，保留模态键盘、关闭和焦点返回，缺失入口有回退",
    ],
    correct: 1,
    why: "成熟底座可以减少重复实现，但不能代替目标场景测试。列出Title/Description、Escape、Tab循环、按钮关闭、取消/错误、入口消失、卸载/快速重开与减少动态验收；按现有项目选择候选。",
  },
];
export const tool03Sources = [
  [
    "Radix · Dialog",
    "https://www.radix-ui.com/primitives/docs/components/dialog",
  ],
  [
    "Radix · 无样式与功能样式",
    "https://www.radix-ui.com/primitives/docs/guides/styling",
  ],
  [
    "Radix · asChild组合",
    "https://www.radix-ui.com/primitives/docs/guides/composition",
  ],
  [
    "Radix · 无障碍职责",
    "https://www.radix-ui.com/primitives/docs/overview/accessibility",
  ],
  ["Base UI · Dialog候选", "https://base-ui.com/react/components/dialog"],
  [
    "WAI-ARIA APG · Modal Dialog",
    "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/",
  ],
];
export const tool03Initial = () => ({
  step: 0,
  done: [],
  choice: "existing",
  theme: "light",
  size: "compact",
  long: false,
  choicesSeen: ["existing"],
  themesSeen: ["light"],
  sizesSeen: ["compact"],
  openedSeen: false,
  namedSeen: false,
  focusSeen: false,
  closedSeen: false,
  returnSeen: false,
  portalSeen: false,
  savedSeen: false,
  invalidSeen: false,
  cancelSeen: false,
  fallbackSeen: false,
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function readTool03Progress() {
  const d = tool03Initial();
  try {
    const s = JSON.parse(localStorage.getItem(TOOL03_STORAGE));
    if (!s || typeof s !== "object") return d;
    const r = { ...d };
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof s[k] === "boolean") r[k] = s[k];
    for (const [k, vs] of Object.entries({
      choice: tool03Choices.map((c) => c.id),
      theme: ["light", "ink"],
      size: ["compact", "wide"],
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
    for (const [k, vs] of Object.entries({
      choicesSeen: tool03Choices.map((c) => c.id),
      themesSeen: ["light", "ink"],
      sizesSeen: ["compact", "wide"],
    }))
      r[k] = Array.isArray(s[k])
        ? [...new Set(s[k].filter((v) => vs.includes(v)))]
        : d[k];
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
export function tool03Brief(d) {
  const c = tool03Choices.find((c) => c.id === d.choice) || tool03Choices[0];
  return `对话框primitive与外观合同草稿\n项目现状（用户核对）：${d.context || "【待确认：已有组件、样式和浏览器约束】"}\n选型候选：${c.label}。${c.why} 优先复用项目已验的组件/primitive和token；不为库名重造div或强制换栈。Radix与Base UI按API、组合方式、所需组件和团队维护条件评估，不绝对排序。\n实际教学机制：${tool03Scope}\n视觉目标：${d.theme === "ink" ? "深色" : "浅色"}主题、${d.size === "wide" ? "较宽" : "紧凑"}面板，宽度受真实viewport限制，375px/短视口/长内容仍可读可操作。功能样式（覆盖、定位、滚动）与视觉样式都需实现；不能让改外观破坏关闭按钮、标签或可见focus。\n行为合同：以真实Dialog.Root/Trigger/Portal/Content/Title/Description/Close组合。模态Tab/Shift+Tab留在面板内、Escape和可见按钮可关闭；用原生button作为trigger/关闭入口，转发primitive所需props/ref/事件。初始焦点合理、关闭返回正确trigger；若trigger消失，回到稳定实验入口/流程位置。应用标题描述有实际文字；不要把ARIA声明当成已经实现模态。\nPortal：当前挂到body以离开演示裁切祖先；Portal不是浏览器top layer，也不保证压过所有原生dialog/popover或解决全部层叠问题。确认挂载容器、z-index、定位与滚动策略，保留现有弹层约定，不盲目抬高数值。\n编辑与恢复：输入、空值校验和本地提交是本例业务逻辑，库不会替项目理解业务。取消/Escape/外点不提交，校验失败保留面板并给文字错误；关闭/快速重开、重置、换站/卸载使旧焦点回调失效，用户已主动移到外部时不得抢回。入口被移除时有可见恢复路径；保存不等于真实服务器成功。\n质量与验收：实测role/名称/描述关联、模态约束、真实Tab循环与Enter/Space、Escape、按钮/触屏关闭、取消与校验；正常/减少动态均可完成，无强制动画等待。验证外观主题对比度、焦点可见且无遮挡、窄屏与长内容内部滚动、Portal实际DOM位置、返回与缺失回退、迟到回调隔离和资源清理。报告真正运行的浏览器/输入与限制，不称库保证一切无障碍。\n草稿可编辑复制，尚未发送、执行或部署；本地规则整合，不是AI评审。学习进度/选择/草稿只在当前浏览器，模态开关与教学编辑会话离站清空，无跨设备同步。T03是工具专题，T04–T12仍为9个预告，课程尚未全部完成。`;
}
