export const TOOL04_STORAGE = "frontend-observatory.tool04.v1";
export const tool04Scope =
  "真实本地React组件：Card是shadcn/ui官方源码固定快照的教学改编，已保留MIT来源；Button、业务卡片、CSS和维护清单包装为本站原创。复用已安装Radix Dialog1.3.1，不重复安装。未运行shadcn CLI，未将改编称官方生成；有限配置真正影响网页，源码只读，合并是本地候选预览，不写项目文件、不执行用户代码或下载上游更新。";
export const tool04Steps = [
  {
    short: "认清归属",
    title: "源码进入项目，职责也要进入项目",
    time: "4分钟",
    desc: "在来源、primitive、本地组件与业务实例间切换，再读取真实文件和当前DOM。不是把每个组件都归给Radix。",
  },
  {
    short: "约束定制",
    title: "共享token与组件变体，改变真实预览",
    time: "4分钟",
    desc: "两个业务实例复用本地Card和Button。改品牌色、密度和变体，再验证两份样式共享、计数独立与禁用守卫。",
  },
  {
    short: "维护演练",
    title: "上游变化要比较，本地修改不会自动合并",
    time: "5分钟",
    desc: "教学提案不是实际更新公告。比较整份替换与选择合并/延期评估，检查候选；配置变化后旧候选不可覆盖新选择。",
  },
  {
    short: "判断理由",
    title: "复用、定制和升级，都要交代理由",
    time: "3分钟",
    desc: "按责任和约束做三题解释重试，不考背代码、库名或命令。",
  },
  {
    short: "Agent简报",
    title: "把来源、改动范围与回归写进交接",
    time: "4分钟",
    desc: "补现有组件约定，生成可编辑维护简报。仅整合本地选择，不发给外部Agent，不声称已经生产验收。",
  },
];
export const tool04Layers = [
  {
    id: "source",
    label: "shadcn来源",
    why: "Card由官方固定快照改编为本项目JSX与局部CSS，MIT声明保留。shadcn/ui分发可维护的代码；不保证后续上游变化自动进入你的文件。",
  },
  {
    id: "primitive",
    label: "底层primitive",
    why: "本例只有维护清单模态复用已安装Radix Dialog1.3.1的行为；Card无需Dialog。某些shadcn组件可基于不同底座，不能把shadcn、Radix和所有原生元素画等号。",
  },
  {
    id: "local",
    label: "项目组件",
    why: "本地Card负责结构，原创LocalButton集中约束variant、size与原生语义，CSS token控制主题。更改源码会影响复用者，要记录来源、检查props/ref和回归。",
  },
  {
    id: "business",
    label: "业务实例",
    why: "两张虚构活动卡片传不同标题，各自保留本地计数。不要把报名接口、权限和业务状态硬塞进基础Card；本例计数不是实际报名或后端保存。",
  },
];
export const tool04Questions = [
  {
    q: "项目已有合适的按钮和组件约定，新增页面时应怎样要求Agent？",
    options: [
      "忽略既有约定，再复制一套同名组件",
      "先复用，确有缺口再有范围地调整token或variant并回归",
    ],
    correct: 1,
    why: "代码分发让项目能改，不代表每页重复复制。先查现有组件、来源和调用者，集中可维护变体，业务状态留在业务层；普通CSS或其他现有方案也可能足够。",
  },
  {
    q: "上游组件变了，本地改编与定制会怎样？",
    options: [
      "不会保证自动合并；比较差异、保护本地改动、测试后再采用或记录延期",
      "总会自动同步，而且绝不会覆盖自己的修改",
    ],
    correct: 0,
    why: "本例教学提案展示直接替换可能丢本地描边变体。真实项目需固定来源、看依赖与差异、人工合并并回归，CLI的预览/差异能力也不是自动理解业务；依赖本身仍有自己的升级路径。",
  },
  {
    q: "哪份维护指令更完整？",
    options: [
      "把所有样式重写，装完shadcn就算全部无障碍验收",
      "说明源码来源/许可、token与变体、primitive契约、受影响实例及回滚/回归",
    ],
    correct: 1,
    why: "可访问性、标签、焦点视觉、窄屏、业务与维护仍需项目负责。不能把shadcn来源、底层primitive、项目组件和业务逻辑混成一个包；本地规则通过也不代表生产验收完成。",
  },
];
export const tool04Sources = [
  ["shadcn/ui · Open Code与分发", "https://ui.shadcn.com/docs"],
  ["shadcn/ui · 主题token", "https://ui.shadcn.com/docs/theming"],
  ["shadcn/ui · CLI预览与差异", "https://ui.shadcn.com/docs/cli"],
  [
    "Card固定来源快照",
    "https://github.com/shadcn-ui/ui/blob/25af02b1b467fcd53b63e0c6d6d324c57c16ef18/apps/v4/registry/new-york-v4/ui/card.tsx",
  ],
  [
    "Radix · Dialog契约",
    "https://www.radix-ui.com/primitives/docs/components/dialog",
  ],
  ["保留的shadcn MIT声明", "/licenses/shadcn-ui-MIT.txt"],
];
export const tool04Initial = () => ({
  step: 0,
  done: [],
  layer: "source",
  layersSeen: ["source"],
  sourceFile: "card",
  sourceSeen: false,
  contractSeen: false,
  palette: "violet",
  density: "compact",
  radius: 12,
  variant: "outline",
  size: "normal",
  title: "周末创作工作坊",
  disabled: false,
  palettesSeen: ["violet"],
  variantsSeen: ["outline"],
  measuredSeen: false,
  firstSeen: false,
  secondSeen: false,
  disabledSeen: false,
  replacementSeen: false,
  staleSeen: false,
  maintainedSeen: false,
  maintenanceChoice: "selective",
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function readTool04Progress() {
  const d = tool04Initial();
  try {
    const s = JSON.parse(localStorage.getItem(TOOL04_STORAGE));
    if (!s || typeof s !== "object") return d;
    const r = { ...d };
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof s[k] === "boolean") r[k] = s[k];
    for (const [k, vs] of Object.entries({
      layer: tool04Layers.map((c) => c.id),
      sourceFile: ["card", "button", "css"],
      palette: ["violet", "forest"],
      density: ["compact", "roomy"],
      variant: ["solid", "outline"],
      size: ["normal", "large"],
      maintenanceChoice: ["replace", "selective", "defer"],
    }))
      if (vs.includes(s[k])) r[k] = s[k];
    r.radius = [8, 12, 18].includes(s.radius) ? s.radius : 12;
    r.step = Number.isInteger(s.step) && s.step >= 0 && s.step < 5 ? s.step : 0;
    r.done = Array.isArray(s.done)
      ? [
          ...new Set(
            s.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
          ),
        ]
      : [];
    for (const [k, vs] of Object.entries({
      layersSeen: tool04Layers.map((c) => c.id),
      palettesSeen: ["violet", "forest"],
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
export function tool04Brief(d) {
  return `本地组件维护交接草稿\n项目现状（用户核对）：${d.context || "【待确认已有组件、token和调用者】"}\n来源与责任：${tool04Scope}\n先复用现有组件，不因工具偏好再复制冲突组件；确有缺口才有范围修改。记录来源版本与许可、改编清单、依赖版本及调用者；组件源码在项目内不等于依赖全部消失，也不等于上游自动同步。\n视觉与配置：${d.palette === "forest" ? "森林绿" : "紫色"}品牌token、${d.density === "roomy" ? "宽松" : "紧凑"}密度、圆角${d.radius}px；${d.variant === "outline" ? "描边" : "实心"}变体，${d.size === "large" ? "较大" : "常规"}按钮。共享token作用于两个实例，业务计数各自保留；本例标题原文：${d.title}。优先集中有限variant，避免每页覆盖一串样式或transition:all万能指令。\n分层：shadcn来源用于分发/获取源码；本地Card结构和LocalButton配置由项目维护；本例清单复用Radix Dialog primitive，保留原生button、props/ref/事件、名称描述、模态键盘、关闭返回与减少动态。业务卡片提供自己的数据、状态和实际接口合同，不宣称基础组件理解业务。\n更新策略：当前选择${{ replace: "整份替换教学对照（有丢失本地变体风险，尚不可视为已维护）", selective: "比较差异后选择兼容改动，保留本地变体", defer: "保留本地，记录上游待评估与后续检查" }[d.maintenanceChoice]}。兼容教学候选仅给Card padding增加4px，基础密度token选择保留；这不是自动改写源文件。本页提案与合并仅模拟候选，不是实际上游变更公告或文件写入。真实项目先查看来源/依赖与差异，明确冲突、回归、回滚与采用/延期理由；不得默认覆盖。本地改动后旧候选/旧回调不可覆盖新选择，快速操作/导航卸载隔离。\n验收：实测token和variant的computed CSS、两实例状态、原生禁用守卫、长文字/375px/短视口、实际Tab可见焦点及触屏；检查Radix模态标签、Escape/返回与迟到回调不抢外部焦点。保留原T02样式隔离和旧课程进度。当前页面规则只测明确项目尺寸/变体/结构和计数，不理解语义或证明完整无障碍；生产回归与真实设备仍待执行，失败可撤回候选并恢复本地配置。\n草稿可编辑复制，尚未发送/执行/部署，不是AI评分。配置/草稿/学习进度只在当前浏览器，实例计数/候选离站清空，无后端、跨设备同步或自动上游合并。T04是工具专题，T09–T12仍为4个预告，课程尚未全部完成。`;
}
