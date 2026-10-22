export const A_STORAGE = "frontend-observatory.stageA.v1";
export const aSteps = [
  {
    short: "建立映射",
    title: "从设计意图找到开发职责",
    time: "4 分钟",
    desc: "为六个设计概念选择合理的开发落点；同一概念可能有多种映射，关键是适用条件。",
  },
  {
    short: "布局与 Token",
    title: "让设计约束成为真实布局",
    time: "4 分钟",
    desc: "在同一个虚构工作坊界面切换预览宽度、间距和主题，再比较两种合理的布局实现。",
  },
  {
    short: "状态与交互",
    title: "原型意图还需要生产行为合同",
    time: "4 分钟",
    desc: "改变组件外观，实际操作报名、错误、重试和取消。把结构、布局、状态与动效合在一起看。",
  },
  {
    short: "判断理由",
    title: "交接时先问行为，再问图层",
    time: "3 分钟",
    desc: "不用记库名。判断这份设计交接是否足以让 Agent 实现和验收。",
  },
  {
    short: "交接说明",
    title: "把设计意图写成可验证的交接",
    time: "4 分钟",
    desc: "从你的实验选择生成草稿，真实编辑并检查验收边界。",
  },
];
export const aOptions = [
  ["", "请选择开发落点"],
  ["semantic", "语义区域与内容结构"],
  ["boundary", "布局边界或局部容器"],
  ["flex", "Flex 一维内容排列"],
  ["grid", "Grid 行列轨道规则"],
  ["component", "可复用组件及实例"],
  ["props", "明确的组件参数"],
  ["state", "事件驱动的运行状态"],
  ["tokens", "有语义的 Token 与上下文值"],
  ["events", "触发、反馈与恢复合同"],
  ["layers", "逐图层复制成 div"],
];
export const aMappings = [
  {
    name: "Frame",
    accepts: ["semantic", "boundary"],
    why: "内容职责清楚时用 section、header 等语义区域；只作排布边界时可以是容器。设计分组不必逐层生成 DOM，也不必每个 Frame 都是 React 组件。",
  },
  {
    name: "Auto Layout",
    accepts: ["flex", "grid"],
    why: "沿一轴排布可用 Flex；需要行列对齐可用 Grid。Figma 现有横向、纵向和网格 Auto Layout；仍需明确内容尺寸、换行、最小宽度与响应式条件，不能机械复制数值。",
  },
  {
    name: "Component",
    accepts: ["component"],
    why: "共享职责和样式形成组件，实例接收内容与配置；实例可有自己的状态。可复用边界按产品职责决定，不等于图层数量。",
  },
  {
    name: "Variant",
    accepts: ["props", "state"],
    why: "外观规格如 solid/outline 可用参数；由报名结果切换的 pending/error 则需要状态和事件。两者常组合，设计变体本身不会自动产生业务逻辑。",
  },
  {
    name: "Variables",
    accepts: ["tokens", "state"],
    why: "变量和 mode 可表达语义 Token 与主题/上下文值；前端可映射 CSS 自定义属性或其他平台配置。需要约定命名、单位、别名和转换；变量也可存原型状态，不是每个变量都应成为Token。变量不等于自动完整同步的 Token 系统。",
  },
  {
    name: "Prototype",
    accepts: ["events", "state"],
    why: "原型表达触发、动作和过渡，也可用变量探索状态；生产实现还需数据、权限、错误、取消和无障碍合同。点击连线或 Smart Animate 不是完整生产代码。",
  },
];
export const aQuestions = [
  {
    q: "设计中六层 Frame，开发必须生成六层 div 吗？",
    options: [
      "必须，图层和 DOM 一一对应",
      "先确定语义与布局职责，可合并或重组",
    ],
    correct: 1,
    why: "保留内容关系、阅读顺序和布局约束；设计组织层级不是 DOM 或组件数量合同。",
  },
  {
    q: "工作坊卡片既能 Flex 换行，也能 Grid 排列，交接应怎么选？",
    options: [
      "按行列对齐、内容伸缩和窄屏约束验收，保留合理方案",
      "必须记住某个组件库名称",
    ],
    correct: 0,
    why: "实现不唯一；需要对齐轨道时偏向 Grid，按内容自由换行时可用 Flex。两种都要检查长内容和真实可用宽度。",
  },
  {
    q: "原型点击能切到成功变体，是否足够上线报名？",
    options: [
      "足够，动画引擎会理解业务",
      "还要定义请求、重复点击、错误/取消、迟到结果及焦点",
    ],
    correct: 1,
    why: "原型有助于沟通交互，但生产状态与后端、安全、语义和恢复需要另行实现。本演练无网络，反馈只是本地规则检查。",
  },
];
export const aSources = [
  [
    "Figma · Frames",
    "https://help.figma.com/hc/en-us/articles/360041539473-Frames-in-Figma-Design",
  ],
  [
    "Figma · Auto layout（包含网格）",
    "https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma",
  ],
  [
    "Figma · Components",
    "https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma",
  ],
  [
    "Figma · Variants",
    "https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants",
  ],
  [
    "Figma · Variables 与 modes",
    "https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma",
  ],
  [
    "Figma · Prototype",
    "https://help.figma.com/hc/en-us/articles/360040314193-Guide-to-prototyping-in-Figma",
  ],
];
export const aInitial = () => ({
  step: 0,
  done: [],
  mappings: Array(6).fill(""),
  mappingChecked: false,
  width: "wide",
  spacing: 12,
  theme: "light",
  layout: "grid",
  variant: "solid",
  motion: "none",
  caption: "回声工作坊",
  narrowSeen: false,
  wideSeen: false,
  tokenSeen: false,
  themeSeen: false,
  layoutSeen: false,
  variantSeen: false,
  failureSeen: false,
  retrySeen: false,
  cancelSeen: false,
  staleSeen: false,
  successSeen: false,
  secondSeen: false,
  motionSeen: false,
  answers: [null, null, null],
  generated: false,
  reviewed: false,
  draft: "",
});
export function readAProgress() {
  const d = aInitial();
  try {
    const s = JSON.parse(localStorage.getItem(A_STORAGE));
    if (!s || typeof s !== "object") return d;
    const r = { ...d };
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean") r[k] = s[k] === true;
    for (const [k, values] of Object.entries({
      width: ["wide", "narrow"],
      theme: ["light", "dark"],
      layout: ["grid", "flex"],
      variant: ["solid", "outline"],
      motion: ["none", "feedback"],
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
    r.mappings = d.mappings.map((_, i) =>
      aOptions.some(([id]) => id === s.mappings?.[i]) ? s.mappings[i] : "",
    );
    r.mappingChecked =
      s.mappingChecked === true &&
      aMappings.every((m, i) => m.accepts.includes(r.mappings[i]));
    r.answers = d.answers.map((_, i) =>
      [0, 1].includes(s.answers?.[i]) ? s.answers[i] : null,
    );
    r.spacing = [12, 24].includes(s.spacing) ? s.spacing : 12;
    r.caption =
      typeof s.caption === "string" && s.caption.trim()
        ? s.caption.slice(0, 80)
        : d.caption;
    r.draft = typeof s.draft === "string" ? s.draft.slice(0, 8000) : "";
    r.reviewed = r.reviewed && r.generated && r.draft.trim().length >= 80;
    return r;
  } catch {
    return d;
  }
}
export function aBrief(d) {
  return `请实现虚构界面「${d.caption}」的设计交接。此草稿来自本地学习演练，不是Figma文件、官方导出代码或AI评审；没有读取/写入真实Figma。\n意图与结构：工作坊浏览页包含品牌/说明、课程列表、两张CourseCard和报名反馈。按语义、阅读顺序、复用职责拆分，不把Frame图层机械变DOM；卡片共享实现，实例状态独立。\n设计到开发的条件映射：${aMappings.map((m, i) => `${m.name}→${aOptions.find(([id]) => id === d.mappings[i])?.[1] || "待确认"}（${m.why}）`).join("；")}\n布局与响应式：目前选择${d.layout === "grid" ? "Grid轨道" : "Flex换行"}，另一种方案可按内容约束验收；预览区域实际可用宽度达到520px才双列，否则单列。这个断点属于本样例内容，不是通用手机阈值。窄屏与长标题不裁掉正文/操作，不把设计画板宽度当设备保证。\nToken合同：space.card=${d.spacing}px，映射卡片padding和列表gap；color.surface/text/accent使用语义别名，当前${d.theme === "dark" ? "深色" : "浅色"}mode。明确单位、别名/主题值及平台转换；变量不会自动与代码双向同步。圆角和边界按既有项目规范，不能只交一组裸颜色。\n组件与Variant：CourseCard包含标题、说明、独立报名与收藏；外观${d.variant}是参数，idle/pending/error/success是运行状态。B收藏不因A错误/重试/取消丢失。预览外观变体不等于收到业务成功。\n交互合同：用户启动才进入pending；重复开始被守卫，提供明确反馈；手动教学结果成功/失败可重试，取消作废attempt，迟到结果不得覆盖新状态。生产实现需另补真实接口、权限、幂等和数据保存，不能沿用本地手动结果当服务器。\n动效：${d.motion === "feedback" ? "仅反馈底色120ms过渡" : "无额外动效"}，不强制Smart Animate或某动画库；prefers-reduced-motion实时关闭非必要过渡，仍保留完整静态反馈。\n无障碍与验收：所有操作原生按钮/选择框，Tab焦点可见、可离开；开始/重试/结果后焦点留在可操作入口，不抢无关控件。375px与桌面核对真实列数、gap、长内容、light/dark对比、两个实例独立状态；覆盖错误、重试、取消、迟到/重复输入、刷新/重置及复制失败。本地规则只检查预设条件，不评价设计优劣。\n存储边界：只在本浏览器保存学习选择、已完成站点和草稿；报名队列和实例运行状态离开实验后清空，无账号、上传、网络请求或协作同步。综合阶段B已开放，T01已开放，T02–T12仍为预告，本阶段不是第33课。`;
}
