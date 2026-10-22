export const TOOL02_STORAGE = "frontend-observatory.tool02.v1";
export const tool02Steps = [
  {
    short: "视觉约束",
    title: "utility是表达样式的一种方式，不是设计结论",
    time: "4分钟",
    desc: "改变同一组件的密度和品牌色，读取真实编译后的规则与浏览器结果。不需要手写或背诵class。",
  },
  {
    short: "响应范围",
    title: "先问哪个空间变窄，再选择响应条件",
    time: "4分钟",
    desc: "本地iframe有自己的真实viewport；组件所在的命名container还可以单独变窄。两种条件分别读取实际宽度，不把父页面宽度或手动标签当触发证据。",
  },
  {
    short: "复用变体",
    title: "用共享token约束两个实例，变体和行为分别设计",
    time: "4分钟",
    desc: "切换实心/描边变体，编辑长标题并操作真实按钮。禁用是原生状态；Tailwind不会替你决定语义、对比度、焦点或业务逻辑。",
  },
  {
    short: "判断理由",
    title: "选utility，也要交代维护和验收",
    time: "3分钟",
    desc: "不以库名评分。三题可以重选并阅读解释，区分样式工具、设计系统和组件库。",
  },
  {
    short: "项目简报",
    title: "把视觉目标、token与组件约定交接给Agent",
    time: "4分钟",
    desc: "说明现有项目约定、复用边界与实际验收。生成的是可编辑本地草稿，不发送外部Agent，不要求全站迁移Tailwind。",
  },
];
export const tool02Palettes = [
  { id: "violet", label: "紫 · 清晰对比", brand: "#5b46b5", deep: "#40317e" },
  { id: "forest", label: "绿 · 清晰对比", brand: "#176b5a", deep: "#104c40" },
  { id: "amber", label: "棕 · 清晰对比", brand: "#98500c", deep: "#713908" },
];
export const tool02LongTitle =
  "一张会被放进窄栏、列表与详情的教学卡片：长标题也要完整换行，操作入口保持可用。";
export const tool02Scope =
  "真实Tailwind CSS4.3.3 CLI在构建时编译限定utilities，运行时只切换已编译的完整类名与预览内CSS变量；不是浏览器在线编译。编译CSS只放在本地iframe，不导入Preflight、不重置全站。iframe外课程UI及少量预览排版底座仍使用手写CSS。无第三方上传、业务请求或AI评分。";
export const tool02Sources = [
  [
    "Tailwind · utility工作方式",
    "https://tailwindcss.com/docs/styling-with-utility-classes",
  ],
  [
    "Tailwind · CLI构建",
    "https://tailwindcss.com/docs/installation/tailwind-cli",
  ],
  [
    "Tailwind · 显式源码检测",
    "https://tailwindcss.com/docs/detecting-classes-in-source-files",
  ],
  ["Tailwind · theme变量", "https://tailwindcss.com/docs/theme"],
  [
    "Tailwind · viewport与container",
    "https://tailwindcss.com/docs/responsive-design",
  ],
  [
    "Tailwind · hover/focus/disabled",
    "https://tailwindcss.com/docs/hover-focus-and-other-states",
  ],
  ["Tailwind · 不导入Preflight", "https://tailwindcss.com/docs/preflight"],
  ["Tailwind · 浏览器兼容", "https://tailwindcss.com/docs/compatibility"],
];
export const tool02Questions = [
  {
    q: "选了Tailwind，品牌、组件行为和无障碍就自动统一了吗？",
    options: [
      "是，装工具即可得到完整设计系统",
      "不是，还要约定token、组件变体、语义与验收",
    ],
    correct: 1,
    why: "Tailwind提供样式utilities和条件变体；设计系统还包含语义、规范与维护流程，组件库还提供可复用组件/行为。可以一起用，也可以用普通CSS实现同样约定。",
  },
  {
    q: "只缩小组件container，iframe viewport不变，media query一定跟着切换吗？",
    options: [
      "不会；要区分viewport条件与container条件",
      "会，任何独立宽度变化都是media query",
    ],
    correct: 0,
    why: "本例lab:是iframe viewport达到256px时生效；@lab/panel:看命名container的192px。都是自定义教学阈值，不是Tailwind默认sm/md；实际布局还受换行、字体和可用空间影响。",
  },
  {
    q: "维护两个密度与多个状态时，更合理的指令是什么？",
    options: [
      "越多class和任意值越专业，transition:all可以处理全部差异",
      "复用已有token，集中定义互斥变体并验收长内容/焦点/禁用",
    ],
    correct: 1,
    why: "完整类名映射便于构建检测与维护；不要依赖class字符串拼接、排列顺序来解决冲突，也不要把状态外观当业务实现。候选工具按现有约定和团队维护能力选择。",
  },
];
export const tool02Initial = () => ({
  step: 0,
  done: [],
  density: "compact",
  palette: "violet",
  unit: 4,
  query: "container",
  frameSize: "full",
  panel: 100,
  variant: "solid",
  disabled: false,
  title: "用统一语言整理空间",
  densitiesSeen: ["compact"],
  palettesSeen: ["violet"],
  variantsSeen: ["solid"],
  sampleSeen: false,
  viewportSeen: false,
  containerSeen: false,
  independentSeen: false,
  disabledSeen: false,
  firstSeen: false,
  secondSeen: false,
  longSeen: false,
  fallbackAccepted: false,
  answers: [null, null, null],
  context: "",
  generated: false,
  reviewed: false,
  draftStale: false,
  draft: "",
});
export function readTool02Progress() {
  const d = tool02Initial();
  try {
    const s = JSON.parse(localStorage.getItem(TOOL02_STORAGE));
    if (!s || typeof s !== "object") return d;
    const r = { ...d };
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof s[k] === "boolean") r[k] = s[k];
    for (const [k, vs] of Object.entries({
      density: ["compact", "roomy"],
      palette: tool02Palettes.map((p) => p.id),
      unit: [4, 6],
      query: ["viewport", "container"],
      frameSize: ["full", "narrow", "compact"],
      panel: [55, 100],
      variant: ["solid", "outline"],
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
      densitiesSeen: ["compact", "roomy"],
      palettesSeen: tool02Palettes.map((p) => p.id),
      variantsSeen: ["solid", "outline"],
    }))
      r[k] = Array.isArray(s[k])
        ? [...new Set(s[k].filter((v) => vs.includes(v)))]
        : d[k];
    r.answers = d.answers.map((_, i) =>
      [0, 1].includes(s.answers?.[i]) ? s.answers[i] : null,
    );
    for (const [k, n] of Object.entries({
      title: 160,
      context: 700,
      draft: 10000,
    }))
      if (typeof s[k] === "string") r[k] = s[k].slice(0, n);
    r.reviewed =
      r.reviewed && r.generated && !r.draftStale && r.draft.trim().length >= 80;
    return r;
  } catch {
    return d;
  }
}
export function tool02Classes(d) {
  return {
    card: [
      "flex",
      "flex-wrap",
      "flex-col",
      "items-start",
      "box-border",
      "min-w-0",
      "max-w-full",
      "rounded-card",
      "border",
      "border-solid",
      "border-line",
      "bg-paper",
      "text-ink",
      d.density === "compact" ? "p-4" : "p-6",
      d.density === "compact" ? "gap-3" : "gap-4",
      d.query === "viewport" ? "lab:flex-row" : "@lab/panel:flex-row",
    ].join(" "),
    button: [
      "box-border",
      "px-4",
      "py-2",
      "min-h-11",
      "text-base",
      "font-sans",
      "font-semibold",
      "rounded-lg",
      "border-2",
      "border-solid",
      "border-brand",
      ...(d.variant === "solid"
        ? ["bg-brand", "text-white"]
        : ["bg-paper", "text-brand"]),
      "enabled:hover:bg-brand-deep",
      "enabled:hover:text-white",
      "focus-visible:outline-2",
      "focus-visible:outline-solid",
      "focus-visible:outline-offset-2",
      "focus-visible:outline-ink",
      "disabled:bg-soft",
      "disabled:text-muted",
      "disabled:border-line",
      "disabled:cursor-not-allowed",
    ].join(" "),
  };
}
export function tool02Brief(d) {
  const p = tool02Palettes.find((p) => p.id === d.palette) || tool02Palettes[0],
    c = tool02Classes(d);
  return `Tailwind选型与组件约束草稿\n项目现状（由用户核对）：${d.context || "【待确认：现有样式与组件约定】"}\n先复用现有CSS、token和组件约定，不因工具偏好强制迁移全站。Tailwind是样式工具，不是自动生成的设计系统或带完整行为的组件库；普通CSS/CSS Modules等也可满足条件，说明团队维护取舍。\n视觉目标：两张同类卡片共享品牌色${p.brand}、间距单元${d.unit}px、圆角16px；密度${d.density === "compact" ? "紧凑" : "宽松"}，第一张${d.variant === "solid" ? "实心" : "描边"}变体。不要逐页复制魔法数；将互斥密度/强调度放进集中、完整类名映射，避免冲突utilities与运行时拼接导致未生成。\n本地教学类名参考（无需用户记忆）：卡片 ${c.card}；按钮 ${c.button}。采用工具后在构建期编译检测范围内的类名，不把运行时CSS变量调整误称在线Tailwind编译。\n响应范围：当前对照${d.query === "viewport" ? "iframe viewport的media条件" : "命名panel的container条件"}；示例自定义viewport阈值256px、container阈值192px，不是默认sm/md，也不是生产建议阈值。仅改变container宽度不会改变media；真正项目根据内容/字体/设备验收选断点，明确父页面、iframe与container的坐标/尺寸范围，提供窄屏、缩放、长标题与换行/最小尺寸策略。\n行为与质量：第一张目前${d.disabled ? "原生disabled，不应响应或假装成功" : "可操作"}，第二张独立；状态样式与业务规则分别实现。使用原生语义、可见focus-visible，键盘与触屏等价；验证normal/hover/focus/disabled对比度，不能仅靠颜色表示状态。减少动态无需等待动效即可阅读/完成，不用transition:all掩盖差异。\n作用范围与兼容：${tool02Scope} 实际项目先确认样式层叠/重置、目标浏览器、工具版本与现有组件库边界，再做增量方案，不承诺安装即一致、自动响应式或自动无障碍。\n待执行验收：对照同一组件utilities、真实编译CSS与computed值；共享token应同步影响两个实例，局部variant不应污染另一实例；viewport/container分别变宽变窄，快速切换、重置、刷新、离开/返回与卸载清理；检查按钮真实禁用、键盘能离开预览、375px/桌面与长内容。${d.fallbackAccepted ? "本次已阅读静态回退；不能把它当成真实编译样式/条件已验证，需在支持环境补测。" : "教学观察不是生产实现已验收；实现后报告实际测试和限制。"}\n草稿可编辑、复制后由用户决定用途；本地规则生成，无AI评审/自动发送/部署。进度仅当前浏览器，不跨设备同步。T02是工具专题，T05–T12仍为预告，课程尚未全部完成。`;
}
