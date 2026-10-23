export const TOOL12_STORAGE = "frontend-observatory.tool12.v1";
export const tool12Scope =
  "真实TanStack React Virtual 3.14.22 / core 3.19.7（useVirtualizer）；独立6卡排序用原创Pointer Events与键盘/按钮事务，不是dnd-kit runtime。dnd-kit仅作官方候选对照，未安装运行；未把排序与虚拟行组合。全部2000条虚构样例预先在浏览器内，无后端分页、网络加载或协作保存。";
export const tool12Steps = [
  {
    short: "选型",
    time: "4分钟",
    title: "先分清三种职责，再决定引什么库",
    desc: "排序交互、虚拟挂载窗口、数据加载合同各管一件事。已有实现可以够用，引库也有适配、体积与维护成本。",
  },
  {
    short: "排序合同",
    time: "5分钟",
    title: "稳定ID、预览、提交和取消是一个合同",
    desc: "体验独立6卡的真实排序；把手支持指针或键盘，按钮替代操作改同一模型。核对原生方案与dnd-kit候选需承担的责任。",
  },
  {
    short: "虚拟集成",
    time: "7分钟",
    title: "真实库窗口改变，项目身份与编辑不丢",
    desc: "2000条已加载样例真实窗口化。滚动、定位、改变缓冲与筛选，检查离屏仍挂载和真正卸载的差别；稳定编辑区按ID保存项目状态。",
  },
  {
    short: "判断",
    time: "3分钟",
    title: "性能和交互不能靠库名代替验收",
    desc: "带解释判断可重试，选合理的职责与边界，不记固定条数阈值。",
  },
  {
    short: "交接",
    time: "4分钟",
    title: "写清交互、窗口和数据三份合同",
    desc: "本地生成可编辑复制草稿；列输入、ID、焦点、行高、缓冲、加载和失败约束，不发送外部Agent或自动评分。",
  },
];
export const tool12Initial = () => ({
  step: 0,
  done: [],
  need: "small",
  needsSeen: ["small"],
  scopeSeen: false,
  movedSeen: false,
  canceledSeen: false,
  alternativeSeen: false,
  sortInspected: false,
  windowSeen: false,
  offscreenSeen: false,
  preservedSeen: false,
  filterSeen: false,
  emptySeen: false,
  overscan: 2,
  filter: "all",
  longLabel: false,
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function recommendation(d) {
  return (
    {
      small:
        "只有少量固定排序，现有原生方案或项目组件可足够；复杂传感器、跨区碰撞与维护需求再评估dnd-kit，不按库名评分。",
      browse:
        "大量已加载对象主要耗在挂载/布局时，先测量，再评估TanStack Virtual等窗口库；固定高度更简单，动态内容另补测量与滚动锚定。",
      remote:
        "远端分批取数先约定分页游标、错误、重试和缓存；它与虚拟挂载是不同职责，可组合。翻页本身不保证旧DOM已卸载，虚拟化也不自动少加载数据。",
    }[d.need] || ""
  );
}
export const tool12Questions = [
  {
    q: "何时值得从已有实现引入工具？",
    options: [
      "依据输入设备、碰撞/滚动/焦点约束与实测成本；复杂需求评估库，简单现有方案可继续用",
      "超过固定条数就必须同时装dnd-kit和虚拟列表，库会自动保证业务正确",
    ],
    correct: 0,
    why: "拖拽、窗口和加载不是同一职责。库提供机制，项目仍负责ID、状态、无障碍、取消与实际性能验收；没有通用条数分界。",
  },
  {
    q: "筛选后第0行换了对象，选中/备注应跟谁？",
    options: [
      "跟数组下标，谁占第0位就继承上一对象备注",
      "跟稳定业务ID；虚拟行卸载后仍从外部数据模型取回，焦点和输入另有合同",
    ],
    correct: 1,
    why: "index会因筛选、排序和插入而变化。本例getItemKey用真实ID，编辑放稳定区域，行只读；并未宣称虚拟化自动保存行内组件状态。",
  },
  {
    q: "分页、虚拟化与离屏是什么关系？",
    options: [
      "分页控制数据/浏览范围，窗口化控制挂载范围；离屏节点仍可能在缓冲区，未必已卸载，必须实际检查",
      "虚拟化会自动减少已加载数据；只要看不见就证明DOM已卸载，翻页一定减少所有DOM",
    ],
    correct: 0,
    why: "本例2000条都在内存中；库只挂载当前窗口与缓冲。分页是否卸载旧节点取决于实现；动态行高需要测量，不能沿用固定72px的假设。",
  },
];
export const tool12Sources = [
  [
    "TanStack Virtual · React适配",
    "https://tanstack.com/virtual/latest/docs/framework/react/react-virtual",
  ],
  [
    "TanStack Virtual · Virtualizer API",
    "https://tanstack.com/virtual/latest/docs/api/virtualizer",
  ],
  [
    "TanStack Virtual · 固定尺寸示例",
    "https://tanstack.com/virtual/latest/docs/framework/react/examples/fixed",
  ],
  ["dnd-kit · 当前React quickstart", "https://dndkit.com/react/quickstart/"],
  ["dnd-kit · 输入传感器", "https://dndkit.com/extend/sensors/"],
  [
    "MDN · Pointer Events与捕获",
    "https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events",
  ],
];
export function readTool12Progress() {
  const d = tool12Initial();
  try {
    const x = JSON.parse(localStorage.getItem(TOOL12_STORAGE));
    if (!x || typeof x !== "object") return d;
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof x[k] === "boolean") d[k] = x[k];
    for (const [k, vs] of Object.entries({
      need: ["small", "browse", "remote"],
      overscan: [2, 6],
      filter: ["all", "odd", "empty"],
    }))
      if (vs.includes(x[k])) d[k] = x[k];
    d.needsSeen = Array.isArray(x.needsSeen)
      ? [
          ...new Set(
            x.needsSeen.filter((v) =>
              ["small", "browse", "remote"].includes(v),
            ),
          ),
        ]
      : ["small"];
    d.step = [0, 1, 2, 3, 4].includes(x.step) ? x.step : 0;
    d.done = Array.isArray(x.done)
      ? [
          ...new Set(
            x.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
          ),
        ]
      : [];
    d.answers = d.answers.map((_, i) =>
      [0, 1].includes(x.answers?.[i]) ? x.answers[i] : null,
    );
    for (const [k, n] of Object.entries({ context: 700, draft: 10000 }))
      if (typeof x[k] === "string") d[k] = x[k].slice(0, n);
    d.reviewed =
      d.reviewed && d.generated && !d.draftStale && d.draft.trim().length >= 80;
    return d;
  } catch {
    return d;
  }
}
export function tool12Brief(d) {
  return `拖拽、虚拟窗口与加载交接草稿\n现状（人工核对）：${d.context || "【待确认已有组件、对象规模与输入设备】"}\n选型：${recommendation(d)}\n实际教学机制：${tool12Scope} 当前官方dnd-kit新React路线为@dnd-kit/react（核对0.5.1）；旧@dnd-kit/core（6.3.1）是另一套API，不能把DragDropProvider事件和DndContext示例混拼；本例未运行任一dnd-kit版本。\n排序合同：6个稳定ID A–F，源插入目标原序位，其他项顺移；预览不提交，松手/明确确认才改变真实DOM顺序，取消不改变模型，撤销保留上次顺序。指针捕获仅把手，卡片正文保留页面滚动；键盘Space/Enter开始、方向键选目标、Escape取消、Enter提交，Tab取消并能离开；点击替代操作同模型。无自动滚动、跨区/嵌套碰撞或虚拟行拖拽支持，不凭此假称生产组合已验证。\n生命周期：事务有独立代次；重复开始不叠事务，取消、捕获丢失、外部放下、失焦、页面隐藏和卸载清监听/捕获；resize或滚动改变几何时取消指针事务，按钮/键盘按ID定位，旧完成/移动回调不得提交新事务。持焦节点重排失效时只恢复本操作拥有的焦点，不抢外部新焦点。\n虚拟合同：真实useVirtualizer，count按筛选结果，getItemKey为稳定业务ID，固定行高72 CSS px，overscan=${d.overscan}，已加载总数2000保持不变。getVirtualItems决定实际挂载行，getTotalSize保留滚动几何；缓冲内离屏不等于卸载。动态高度未实现，生产改用真实测量并验证估算/锚定/定位；不把固定模型冒称自动适应长文本。长标题行内省略，稳定编辑区显示全文。\n身份与焦点：每项标记/备注存在按ID索引的外部模型，筛选/离屏/卸载后保留；行只读无Tab目标，稳定编辑区按ID选择、编辑和定位，避免输入随虚拟节点消失。生产若要行内编辑、读屏连续浏览或拖动虚拟行，需另补焦点恢复、语义替代、不可见目标和自动滚动策略。样例非跨设备保存。\n加载合同：分页/游标、查询缓存和窗口渲染分开；翻页是否卸载旧节点要验，虚拟化不自动减少总数据或请求量。本课未运行远端分页/服务；生产明确加载/空/错误/重试/取消、稳定ID合并及晚到结果隔离，不能把模拟数据当真实服务器。\n质量与验收：核对实际顺序/几何、取消与重复、触屏滚动和拖拽区域、实际Tab、normal/reduce；窗口DOM数与逻辑数、buffer离屏/卸载、定位首尾、筛选身份/空结果、项目状态恢复、resize/短视口/375px、卸载观察器与迟到回调。记录实测性能，不用绝对条数或库名保证。无持续教学动画或等待门槛。\n草稿本地规则生成，可编辑复制，不是AI评分/自动发送/执行。学习/选择/草稿仅当前浏览器；排序与项目编辑模型离站清空。原32课、A/B与T01–T12共46项入口已制作；不代表学习者其余章节已自动完成，没有虚构下一章。`;
}
