export const TOOL09_STORAGE = "frontend-observatory.tool09.v1";
export const tool09Scope =
  "本地学习演练：真实D3模块生成SVG；ECharts仅为配置路线示意，未安装运行。所有借用次数为虚构教学样例，无服务端取数或AI分析。";
export const tool09Steps = [
  {
    short: "选型",
    time: "4分钟",
    title: "先说清报表任务，再选抽象层",
    desc: "常规图表配置与特殊数据映射都能做出图。差别在现有组件、交互需求及谁负责维护。",
  },
  {
    short: "映射",
    time: "5分钟",
    title: "让同一份数据成为几何与表格",
    desc: "比较每天次数和观察趋势；改变筛选与样例，核对真实D3绘图。0是测得没有，缺失是尚无记录。",
  },
  {
    short: "边界",
    time: "4分钟",
    title: "更新失败、取消与释放也属于图表",
    desc: "手动投递本地样例结果；旧结果不能覆盖新意图。图表不可用时，数据表仍可读取与选择。",
  },
  {
    short: "判断",
    time: "3分钟",
    title: "选工具不靠记住库名",
    desc: "可反复选择并阅读理由；没有跨设备跑分或自动语义评分。",
  },
  {
    short: "交接",
    time: "4分钟",
    title: "把阅读任务交给Agent",
    desc: "写清字段、单位、轴、交互、缺失及回退；本地生成草稿后允许真实编辑，不会发送给外部Agent。",
  },
];
export const routes = [
  ["d3", "D3定制候选"],
  ["echarts", "ECharts配置候选"],
];
export function recommendation(d) {
  const base =
    d.route === "echarts"
      ? "ECharts提供图表与交互配置，适合先评估常规报表；setOption更新、resize及dispose仍需集成。"
      : "D3提供数据绑定、比例尺和图形生成等模块，适合需要自行定义映射和交互的场景；坐标轴、标签和可访问性仍由项目设计。";
  return (
    base +
    (d.need === "custom"
      ? " 当前要求特殊图形，应先确认现有图表库扩展是否足够，再评估D3的开发和维护成本；不是特殊就必须D3。"
      : " 当前只是常规比较/趋势，优先复用项目已有图表组件，ECharts或其他库都可能合适，不为名字重写。") +
    " 两者并非绝对二选一，图形好看不证明数据与语义正确。"
  );
}
export const tool09Questions = [
  {
    q: "同一常规柱形报表，如何选择ECharts或D3？",
    options: [
      "先看现有组件、所需交互和维护成本；特殊映射可评估D3，也可检查现有库扩展",
      "D3永远更高级，常规报表也必须重写",
    ],
    correct: 0,
    why: "ECharts提供较高层配置，D3提供可组合工具。它们都可以做常见图形；选型依赖需求与团队，而不是把某种图形唯一绑定到库名。",
  },
  {
    q: "周二0次，周三缺失，折线应该怎样表达？",
    options: [
      "都当0并连接，图表更连续",
      "0保留在基线，缺失留断点并在数据表说明；不能用未测得冒充0",
    ],
    correct: 1,
    why: "缺失不是0。本例D3 line.defined在缺失处断开；柱形0有基线标记，缺失有文字，两者不靠颜色区分。",
  },
  {
    q: "图已画好，是否等于集成完成？",
    options: [
      "还要核对轴/单位、几何与数据表、键盘触屏选择、失败旧结果隔离及卸载清理",
      "库会自动理解业务和全部可访问需求",
    ],
    correct: 0,
    why: "D3不自动生成完整报表产品，ECharts的配置也不能替代字段语义、辅助内容和生命周期设计。验收要检查实际结果。",
  },
];
export const tool09Sources = [
  ["D3 · 数据绑定与join", "https://d3js.org/d3-selection/joining"],
  ["D3 · 线性比例尺", "https://d3js.org/d3-scale/linear"],
  ["D3 · 分类带宽比例尺", "https://d3js.org/d3-scale/band"],
  ["D3 · 折线与defined", "https://d3js.org/d3-shape/line"],
  [
    "ECharts · 动态数据与setOption",
    "https://echarts.apache.org/handbook/en/how-to/data/dynamic-data/",
  ],
  [
    "ECharts · 容器、resize和dispose",
    "https://echarts.apache.org/handbook/en/concepts/chart-size/",
  ],
];
export const tool09Initial = () => ({
  step: 0,
  done: [],
  route: "d3",
  routesSeen: ["d3"],
  need: "standard",
  needsSeen: ["standard"],
  comparedSeen: false,
  mode: "bar",
  modesSeen: ["bar"],
  filter: "all",
  filtersSeen: ["all"],
  dataset: "A",
  changedSeen: false,
  zeroSeen: false,
  missingSeen: false,
  inspectedSeen: false,
  failureSeen: false,
  retrySeen: false,
  canceledSeen: false,
  staleSeen: false,
  cleanupSeen: false,
  outcome: "success",
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function readTool09Progress() {
  const d = tool09Initial();
  try {
    const x = JSON.parse(localStorage.getItem(TOOL09_STORAGE));
    if (!x || typeof x !== "object") return d;
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof x[k] === "boolean") d[k] = x[k];
    const enums = {
      route: ["d3", "echarts"],
      need: ["standard", "custom"],
      mode: ["bar", "line"],
      filter: ["all", "recent", "empty"],
      dataset: ["A", "B"],
      outcome: ["success", "failure"],
    };
    for (const [k, vs] of Object.entries(enums))
      if (vs.includes(x[k])) d[k] = x[k];
    for (const [k, vs] of Object.entries({
      routesSeen: enums.route,
      needsSeen: enums.need,
      modesSeen: enums.mode,
      filtersSeen: enums.filter,
    }))
      if (Array.isArray(x[k]))
        d[k] = [...new Set(x[k].filter((v) => vs.includes(v)))];
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
export function rowsFor(dataset, filter) {
  const values =
    dataset === "B" ? [24, 0, null, 36, 12, 18] : [12, 0, null, 18, 24, 6];
  const rows = values.map((value, i) => ({
    id: `day${i + 1}`,
    day: ["周一", "周二", "周三", "周四", "周五", "周六"][i],
    value,
  }));
  return filter === "empty" ? [] : filter === "recent" ? rows.slice(3) : rows;
}
export const valueText = (v) => (v === null ? "缺失（未记录）" : `${v} 次`);
export function tool09Brief(d) {
  return `图表工具集成草稿\n项目现状（用户核对）：${d.context || "【待确认字段、阅读任务、现有图表组件】"}\n选型条件：${recommendation(d)}\n实际边界：${tool09Scope}\n数据合同：稳定日期ID、日期分类、非负借用次数（次）或null；本例6天、固定0–40次纵轴，比较用柱形，趋势用按日期排列的折线。0保留，缺失断开且明确文字，空结果不伪造为0。筛选=${d.filter}，样例=${d.dataset}，模式=${d.mode}。\n实现：本例真实d3-selection3.0.0的keyed join维护SVG，d3-scale4.0.2映射数据到坐标，d3-shape3.2.0的line.defined排除缺失。ECharts为配置候选示意，未安装运行；若选ECharts核对series稳定标识、setOption合并/替换策略、resize与dispose，不直接复制示意当生产代码。避免React与D3同时维护同一子树。\n交互：筛选、样例变更、点击图形及图外原生按钮查看数值，表格与图形同源；键盘不依赖hover。选择被筛掉清除详情但不强抢外部焦点，文字/形状不只颜色。轴、单位、基线诚实，长标签/375px和短视口可读；标签布局需按内容设计。\n数据更新：本地手动模拟，不是网络；记录尝试编号、取消与当前请求守卫。失败保留旧已接受数据并提示，重试可恢复；取消后旧结果不能覆盖新结果。模块加载失败保留数据表与重试。\n预算与生命周期：本例至多6项，SVG矢量非像素位图，不宣称D3总比Canvas/ECharts快；生产给对象数量、更新频率和目标设备测量。无持续动画，按需合并一次rAF；容器resize重算比例尺，隐藏暂停待处理帧、回来用最新模型，卸载取消帧/观察器/监听及D3事件并移除自有SVG。减少动态保持静态完整内容，不强制等动画。\n验收：实际几何与表格一一核对，包括0/缺失/空、柱形0基线、折线断点；真实键盘/触屏选择、快速切换/重复投递/旧结果、失败/重试、resize/离站清理与复制焦点。\n本地规则草稿可编辑复制，未发送执行或部署；仅当前浏览器保存，不跨设备。T09为工具专题，T10–T12仍为3个预告。`;
}
