export const B_STORAGE = "frontend-observatory.stageB.v1";
export const bSteps = [
  {
    short: "对照需求",
    title: "模糊诉求是起点，不是实现合同",
    time: "4 分钟",
    desc: "比较同一效果的两份人工示例，再保留或编辑你的原始需求。不会自动改写你的原文。",
  },
  {
    short: "拆解效果",
    title: "说出看见什么、何时变化、如何恢复",
    time: "4 分钟",
    desc: "把视觉目标、触发条件和状态变化分开写；本地提示只检查栏目是否填写。",
  },
  {
    short: "技术取舍",
    title: "给出倾向与条件，也可以先不限定技术",
    time: "3 分钟",
    desc: "技术名称不是质量分数。选择候选、说明理由，允许 Agent 提出符合约束的替代方案。",
  },
  {
    short: "质量验收",
    title: "把好看和顺滑变成可观察的要求",
    time: "4 分钟",
    desc: "补充响应式、无障碍、性能、失败回退和待执行的验收步骤；不要把计划写成已经通过。",
  },
  {
    short: "整合草稿",
    title: "核对原文和草稿，再决定如何交付",
    time: "4 分钟",
    desc: "生成、真实编辑与复制说明。没有 AI 评分、外部发送、代码执行或自动部署。",
  },
];
export const bFields = [
  {
    id: "visual",
    label: "视觉目标",
    prompt: "哪些元素、层级、变化属性和强度？不要只有高级感。",
    group: 1,
  },
  {
    id: "trigger",
    label: "触发与作用范围",
    prompt: "谁在何处触发？键盘、触屏如何操作？何时结束？",
    group: 1,
  },
  {
    id: "states",
    label: "状态与恢复路径",
    prompt: "开始前、等待、完成、错误、取消及重复输入分别怎样反馈？",
    group: 1,
  },
  {
    id: "responsive",
    label: "响应式与内容边界",
    prompt: "可用宽度、长内容、滚动和操作入口怎样保留？",
    group: 3,
  },
  {
    id: "accessibility",
    label: "无障碍与减少动态",
    prompt: "语义、键盘、焦点、非颜色反馈和 reduce 模式怎样验收？",
    group: 3,
  },
  {
    id: "performance",
    label: "性能与资源约束",
    prompt: "哪些更新有必要？限制依赖、循环、资源和后台工作，如何实测？",
    group: 3,
  },
  {
    id: "fallback",
    label: "失败与兼容回退",
    prompt: "不可用、超时、失败、取消与重试怎样恢复？不把回退假称原效果。",
    group: 3,
  },
  {
    id: "acceptance",
    label: "待执行的验收步骤",
    prompt: "写操作、期望结果和证据；这是验收计划，不是通过报告。",
    group: 3,
  },
];
export const bCases = [
  {
    id: "favorite",
    name: "收藏按钮反馈",
    vague: "做一个高级、顺滑的收藏按钮。",
    good: "给课程卡片增加收藏反馈：图标和文字明确区分未收藏/已收藏，变化克制，不遮正文；点击、触屏或键盘触发。等待确认时防重复提交，失败可重试，取消后的旧结果不覆盖新状态。先沿用项目能力，简单样式过渡可用CSS；如需要可打断的弹簧，再解释新增方案的条件。窄屏保留操作，Tab焦点可见，减少动态仍能识别状态。实现后按成功、失败、取消及连续操作验证，再报告真实结果。",
    missing: [
      "高级/顺滑没有说明变化的对象、属性与强度",
      "没有触发方式、状态和错误恢复",
      "没有窄屏、焦点、减少动态和可验证结果",
    ],
    examples: {
      visual:
        "课程卡片右侧收藏入口：图标与文字同时区分状态，边界清晰；只做轻量反馈，不遮标题或依赖明显弹跳。",
      trigger:
        "点击、触屏或原生按钮的Enter/Space触发，只影响当前课程；等待中再次操作应给出原因，Tab可离开。",
      states:
        "未收藏→等待→成功或失败；失败保留原值并可重试，取消作废本次尝试，旧结果不能覆盖新操作；其他卡片的收藏保留。",
      responsive:
        "在375px与桌面检查长标题和按钮可达性，不横向溢出；按实际内容调整布局，不把固定画板宽当所有设备保证。",
      accessibility:
        "按钮有可读名称和状态，Tab焦点可见；变化不只靠颜色，错误文字可读；实时减少动态时停掉非必要位移但保留状态反馈。",
      performance:
        "只更新受影响的卡片，简单反馈先用现有CSS能力；无空闲或后台动画循环，卸载取消回调；在目标设备实测，不预先宣称帧率。",
      fallback:
        "请求失败显示重试与取消；重复开始守卫，迟到结果按尝试标识隔离。动效不可用时保留静态图标/文字，不假称已同步服务器。",
      acceptance:
        "依次用键盘与触屏操作：等待中重复触发、失败后重试、取消后投递旧结果；核对焦点和其他卡片值不丢失。再检查375px、长标题与reduce，记录实际支持与限制。",
    },
  },
  {
    id: "chart",
    name: "筛选图表反馈",
    vague: "做个酷炫的数据面板，筛选要丝滑。",
    good: "用明确标注的教学样例展示设备使用量，提供比较/趋势与日期筛选；标明轴、单位与缺失，0不能冒充缺失。筛选后图形、文字和数据表更新一致；空结果可恢复，失败可重试。小规模可用SVG/DOM，复杂图表能力再评估图表库，不以库名决定质量。触屏和键盘可选择读数，窄屏保留文字替代，reduce不影响阅读。按数据/投影一致性和真实输入验收，未执行前不写通过。",
    missing: [
      "酷炫没有给字段、单位、图形任务和视觉层级",
      "丝滑没有说明筛选/加载/空数据/错误行为",
      "没有可访问读数、窄屏替代和数据一致性验收",
    ],
    examples: {
      visual:
        "教学样例设备使用量：比较用条形、趋势用折线；轴与分钟单位明确，突出选中值，缺失与0分开，不靠装饰误导刻度。",
      trigger:
        "点击、触屏或键盘切换比较/趋势及日期筛选；选择一个数据点读取准确值，作用于当前图表和对应表格。",
      states:
        "有数据、等待、空结果、失败分别反馈；空筛选可恢复，失败能重试或取消，旧筛选的迟到结果不覆盖最新选择，避免丢失后续编辑。",
      responsive:
        "375px保留标题、单位、筛选和文字/表格替代；按可用宽度简化布局，长标签可读，不强迫用户横向滚整页。",
      accessibility:
        "键盘和触屏可访问读数，不只hover或颜色；焦点可见，图外有表格/文字；减少动态时直接更新内容，不把动画当阅读门槛。",
      performance:
        "按数据规模和交互实测选SVG/DOM或图表库，不宣称一律更快；合并必要更新、清理监听，不持续重建整页或后台动画。",
      fallback:
        "空、缺失、全0和加载失败分别说明；保留最后可读内容并提供恢复/重试，取消隔离旧筛选结果；图形不可用时仍可读表格，明确回退。",
      acceptance:
        "修改样例/切换筛选，逐项核对图形读数与表格；测试空/缺失/0、失败重试和快速切换。以键盘和触屏在窄屏及reduce下读取数据，执行后再报告证据。",
    },
  },
];
export const bTech = [
  {
    id: "",
    label: "请选择技术倾向",
    condition: "可以不限定实现，但要说明约束。",
  },
  {
    id: "defer",
    label: "暂不限定，请先提出方案",
    condition:
      "不熟悉实现时，先给目标与约束，请Agent比较条件和验收；不凭名字猜真实技术。",
  },
  {
    id: "existing",
    label: "沿用项目现有能力",
    condition:
      "已有组件、状态或图表能力能满足约束时，复用可减少额外依赖；先检查现有实现。",
  },
  {
    id: "css",
    label: "CSS + 现有状态管理",
    condition:
      "适合简单样式反馈；CSS不自动完成请求、取消或数据状态，也不是所有图形场景的完整方案。",
  },
  {
    id: "motion",
    label: "按需 WAAPI / Motion 等动效方案",
    condition:
      "可打断编排、弹簧或布局连续性确有需求时再比较；普通按钮不必引入一套动画库，仍需状态与回退。",
  },
  {
    id: "svg",
    label: "原生 SVG / DOM + 状态",
    condition:
      "向量图形或可控的小规模图表可考虑；命中、语义、读数和规模成本需按任务验证，不能宣称总比库快。",
  },
  {
    id: "chartlib",
    label: "按需图表库",
    condition:
      "复杂坐标、图形与交互可复用成熟能力；主题、体积、可访问性和业务状态仍需评估，不是库越多越好。",
  },
  {
    id: "custom",
    label: "自定义或其他合理方案",
    condition:
      "写出候选与成立条件，可组合现有能力；本地规则不判断这个组合是否真的适用。",
  },
];
export const bScope =
  "本地规则仅检查独立栏目去除首尾空白后是否有字符、技术候选是否选择及自定义名称是否填写；不做关键词语义评分，不理解否定、矛盾、可行性、效果好坏或是否真正通过验收。已填不等于正确，人工示例不是唯一答案。练习完成不代表需求获批或实现完成。";
export const bSources = [
  [
    "OpenAI · 目标、上下文、约束与完成条件",
    "https://learn.chatgpt.com/guides/best-practices",
  ],
  [
    "OpenAI · 清晰指令、上下文与示例",
    "https://developers.openai.com/api/docs/guides/prompt-engineering",
  ],
];
export const bInitial = () => ({
  step: 0,
  done: [],
  caseId: "favorite",
  original: "",
  fields: Object.fromEntries(bFields.map((f) => [f.id, ""])),
  comparison: "vague",
  vagueSeen: false,
  goodSeen: false,
  comparisonReviewed: false,
  effectReviewed: false,
  technology: "",
  customTech: "",
  techReason: "",
  technologyReviewed: false,
  qualityReviewed: false,
  revision: 0,
  draftVersion: -1,
  generated: false,
  reviewed: false,
  draft: "",
});
export const caseB = (d) => bCases.find((c) => c.id === d.caseId) || bCases[0];
export const filledB = (text) =>
  typeof text === "string" && text.trim().length > 0;
export function auditB(d) {
  return [
    { id: "original", label: "用户原文", filled: filledB(d.original) },
    ...bFields.map((f) => ({
      id: f.id,
      label: f.label,
      filled: filledB(d.fields[f.id]),
    })),
    {
      id: "technology",
      label: "技术倾向",
      filled:
        bTech.some((t) => t.id && t.id === d.technology) &&
        (d.technology !== "custom" || filledB(d.customTech)),
    },
    { id: "techReason", label: "技术取舍理由", filled: filledB(d.techReason) },
  ];
}
export function updateBSource(d, change) {
  return { ...change, revision: d.revision + 1, reviewed: false };
}
export function readBProgress() {
  const d = bInitial();
  try {
    const s = JSON.parse(localStorage.getItem(B_STORAGE));
    if (!s || typeof s !== "object") return d;
    const r = { ...d };
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean") r[k] = s[k] === true;
    r.step = Number.isInteger(s.step) && s.step >= 0 && s.step < 5 ? s.step : 0;
    r.done = Array.isArray(s.done)
      ? [
          ...new Set(
            s.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
          ),
        ]
      : [];
    r.caseId = bCases.some((c) => c.id === s.caseId) ? s.caseId : d.caseId;
    r.comparison = ["vague", "good"].includes(s.comparison)
      ? s.comparison
      : d.comparison;
    for (const [k, max] of [
      ["original", 1200],
      ["customTech", 100],
      ["techReason", 500],
      ["draft", 12000],
    ])
      r[k] = typeof s[k] === "string" ? s[k].slice(0, max) : "";
    r.fields = Object.fromEntries(
      bFields.map((f) => [
        f.id,
        typeof s.fields?.[f.id] === "string"
          ? s.fields[f.id].slice(0, 500)
          : "",
      ]),
    );
    r.technology = bTech.some((t) => t.id === s.technology) ? s.technology : "";
    r.revision =
      Number.isSafeInteger(s.revision) && s.revision >= 0 ? s.revision : 0;
    r.draftVersion =
      Number.isSafeInteger(s.draftVersion) &&
      s.draftVersion >= 0 &&
      s.draftVersion <= r.revision
        ? s.draftVersion
        : -1;
    r.reviewed =
      r.reviewed &&
      r.generated &&
      r.draft.trim().length >= 80 &&
      r.draftVersion === r.revision;
    return r;
  } catch {
    return d;
  }
}
export function bBrief(d) {
  const c = caseB(d),
    field = (id) =>
      filledB(d.fields[id]) ? d.fields[id] : "【待确认：未填写】";
  const tech = bTech.find((t) => t.id === d.technology);
  return `需求拆解草稿 · ${c.name}\n请先核对原文与以下拟议说明是否一致；未知项先询问；栏目、人工参考或通用建议与原文冲突时，先澄清，不要擅自补成承诺。此文未发送、未执行、未评分、未部署。\n\n用户原始需求（逐字保留，尚需核对）：\n${d.original}${filledB(d.original) ? "" : "\n【待确认：原文尚空】"}\n\n拟议效果拆解（填写内容仍需人工判断）：\n1. 视觉目标：${field("visual")}\n2. 触发与作用范围：${field("trigger")}\n3. 状态与恢复：${field("states")}\n\n技术倾向：${d.technology === "custom" ? d.customTech || "【待确认：自定义候选未填写】" : tech?.id ? tech.label : "【待确认：尚未选择】"}\n取舍理由：${filledB(d.techReason) ? d.techReason : "【待确认：未填写】"}\n候选条件提醒（人工参考，不是适用性判定）：${tech?.condition || "先按目标和约束比较方案。"} 在原文与项目约束允许时可提出合理替代；有冲突先询问，不擅自替换。不要以库的数量、名称或截图推断唯一实现。\n\n质量约束：\n- 响应式与内容：${field("responsive")}\n- 无障碍与减少动态：${field("accessibility")}\n- 性能与资源：${field("performance")}\n- 失败与兼容回退：${field("fallback")}\n\n待执行验收（计划不是通过报告）：\n${field("acceptance")}\n若后续获授权实现，再报告实际操作、命令/退出码、浏览器或设备及限制；没有运行的检查标为未验证，不编造成功、评分或部署结果。\n\n交付边界：先检查项目约定与现有能力，说明方案和待确认项，再在授权范围实现；不要把本练习的复制视为自动发送或执行授权。${bScope}\n本课程只在当前浏览器保存练习、原文和草稿，不跨设备同步，无网络AI调用；综合B是未编号阶段，不是第34课，T01/T02/T03/T04/T05/T06/T07/T08已开放，T09–T12仍为预告。`;
}
