export const CHART_STORAGE = "frontend-observatory.lesson29.v1";
export const chartScope =
  "全部为虚构设备的教学样例，单位分钟/日，不含真实家庭、健康或财务数据。本课用React直接生成SVG条形/折线与HTML数据表，没有接入ECharts/D3，图表数据不从服务器取数，也没有AI解释。分布图仅讨论选型，本例不实现直方图。";
export const devices = [
  { id: "reader", name: "阅读屏" },
  { id: "drawing", name: "绘图板" },
  { id: "display", name: "展示屏" },
];
export const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export const sampleMatrix = () => ({
  reader: [40, 50, null, 0, 65, 80, 55],
  drawing: [60, 90, 100, 75, 60, 0, 30],
  display: [15, 25, 20, 35, 0, 45, 50],
});
export const chartSteps = [
  {
    short: "选图",
    time: "4 分钟",
    title: "比较与趋势，先说清问题",
    desc: "在同一天比较设备，再看一个设备的一周趋势。切换筛选并用数值入口选择一个观测值。",
  },
  {
    short: "数据",
    time: "4 分钟",
    title: "改一个值，核对图形与数据表",
    desc: "在0–240分钟的教学范围编辑单个设备/日期；输入无效会拒绝，其他记录保持。",
  },
  {
    short: "边界",
    time: "4 分钟",
    title: "没有记录、缺失与零是三种含义",
    desc: "体验空筛选、全缺失与全零投影样例；选择数值验证含义，再恢复正常样例。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "图形与工具都服从数据任务",
    desc: "比较、趋势、分布不是同一个问题；图表库与D3定制层级不同，普通折线不专属于任何库。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "给Agent字段、单位、交互与替代",
    desc: "生成可编辑简报，写清刻度、缺失规则、空状态、数值查看和验收。",
  },
];
export const chartQuestions = [
  {
    q: "同一天比较设备、一台设备的一周趋势、很多次用量的分布，分别优先考虑什么？",
    options: [
      "都用同一条折线，横轴顺序随意",
      "类别条形图、按时间排序折线、按区间统计频数的直方图；仍需按数据和任务核对",
    ],
    correct: 1,
    why: "条形比较类别大小，折线强调有意义的时间顺序；分布关心值落在哪些区间。直方图分箱需要区间和计数规则，本课只实际绘制比较/趋势，不把类别条形冒充已实现的分布图。",
  },
  {
    q: "某天没有记录，能当0分钟，并为了突出差异把条形从30分钟画起吗？",
    options: [
      "不能；缺失表示未知、0表示观测为零，条形长度应以0为基线，缺失折线要留断点",
      "能，只要颜色好看，缺失、零和空结果都等价",
    ],
    correct: 0,
    why: "缺失不补零也不默认插值；有记录但全缺失与没有符合筛选的记录不同。本例固定0–240分钟刻度，单位和范围可见；趋势线并非任何任务都必须从0起，但本例采用同一标尺便于对照。",
  },
  {
    q: "普通折线或贡献格一定要使用某个指定库吗？",
    options: [
      "是，图形外观决定唯一实现库",
      "不是；标准图表库可提供常见图型和交互，D3更像比例尺/形状/数据连接等定制工具箱，简单小图也可直接SVG",
    ],
    correct: 1,
    why: "按团队维护、图表数量、交互、数据规模和可访问性选层级，不按名字决定。ECharts/D3可另作候选；本课未导入它们，T09后续专讲工具，不把实际机制说错。",
  },
];
export const chartSources = [
  [
    "MDN：SVG viewBox与坐标",
    "https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox",
  ],
  [
    "W3C WAI：复杂图像的文字与数据替代",
    "https://www.w3.org/WAI/tutorials/images/complex/",
  ],
  [
    "ONS：比较图与零基线",
    "https://service-manual.ons.gov.uk/data-visualisation/chart-types/bar-charts",
  ],
  [
    "ONS：趋势与缺失断点",
    "https://service-manual.ons.gov.uk/data-visualisation/chart-types/line-chart",
  ],
  ["D3官方：定制工具箱的层级", "https://d3js.org/what-is-d3"],
  [
    "ECharts官方：数据到图形的映射",
    "https://echarts.apache.org/handbook/en/concepts/visual-map/",
  ],
];
export const chartInitial = () => ({
  step: 0,
  done: [],
  mode: "compare",
  filter: "all",
  day: 0,
  scenario: "normal",
  matrix: sampleMatrix(),
  caption: "虚构设备每日用量（教学样例）",
  editDevice: "reader",
  editDay: 0,
  editText: "90",
  selected: "",
  compareSeen: false,
  trendSeen: false,
  filterSeen: false,
  inspectedSeen: false,
  editedSeen: false,
  tableReviewed: false,
  emptySeen: false,
  missingSeen: false,
  zeroSeen: false,
  restoredSeen: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readChartProgress() {
  const b = chartInitial();
  try {
    const x = JSON.parse(localStorage.getItem(CHART_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((n) => [0, 1, 2, 3, 4].includes(n)))];
    for (const [k, vs] of [
      ["mode", ["compare", "trend"]],
      ["filter", ["all", ...devices.map((d) => d.id)]],
      ["scenario", ["normal", "empty", "missing", "zero"]],
      ["editDevice", devices.map((d) => d.id)],
    ])
      if (vs.includes(x[k])) b[k] = x[k];
    if (b.mode === "trend" && b.filter === "all") b.filter = "reader";
    for (const k of ["day", "editDay"])
      if (Number.isInteger(x[k]) && x[k] >= 0 && x[k] < 7) b[k] = x[k];
    for (const d of devices)
      if (Array.isArray(x.matrix?.[d.id]))
        b.matrix[d.id] = b.matrix[d.id].map((v, i) =>
          x.matrix[d.id][i] === null
            ? null
            : Number.isInteger(x.matrix[d.id][i]) &&
                x.matrix[d.id][i] >= 0 &&
                x.matrix[d.id][i] <= 240
              ? x.matrix[d.id][i]
              : v,
        );
    for (const [k, max] of [
      ["caption", 100],
      ["editText", 20],
      ["selected", 30],
      ["draft", 8000],
    ])
      if (typeof x[k] === "string") b[k] = x[k].slice(0, max);
    if (Array.isArray(x.answers))
      b.answers = chartQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export function chartRows(data) {
  if (data.scenario === "empty") return [];
  const filter =
    data.mode === "trend" && data.filter === "all" ? "reader" : data.filter;
  const ds = devices.filter((d) => filter === "all" || filter === d.id);
  return ds.flatMap((d) =>
    (data.mode === "trend" ? days.map((_, i) => i) : [data.day]).map((day) => ({
      key: `${d.id}:${day}`,
      device: d.id,
      name: d.name,
      day,
      label: data.mode === "trend" ? days[day] : d.name,
      value:
        data.scenario === "missing"
          ? null
          : data.scenario === "zero"
            ? 0
            : data.matrix[d.id][day],
    })),
  );
}
export const formatValue = (v) => (v === null ? "缺失（未知）" : `${v} 分钟`);
export const chartSummary = (rows) => ({
  records: rows.length,
  known: rows.filter((r) => r.value !== null).length,
  missing: rows.filter((r) => r.value === null).length,
  zeros: rows.filter((r) => r.value === 0).length,
});
export function chartGeometry(rows, mode) {
  if (mode === "compare")
    return rows.map((r, i) => ({
      ...r,
      x: 126,
      y: 48 + i * 62,
      width: r.value === null ? null : (r.value / 240) * 420,
      height: 28,
    }));
  return rows.map((r) => ({
    ...r,
    x: 66 + r.day * 78,
    y: r.value === null ? null : 240 - (r.value / 240) * 192,
  }));
}
export function trendPath(points) {
  let pen = false,
    d = "";
  for (const p of points) {
    if (p.value === null) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${p.x},${p.y} `;
    pen = true;
  }
  return d.trim();
}
export function parseMinutes(text) {
  if (!/^\d{1,3}$/.test(text.trim())) return null;
  const n = Number(text);
  return n <= 240 ? n : null;
}
export function chartBrief(data) {
  return `请实现可理解的数据可视化。标题：${data.caption}。

数据与实际机制：${chartScope} 本例最多21条，React状态映射SVG rect/path/circle与HTML表，viewBox负责坐标适配；没有服务端取数、AI解释或第三方库能力验证。不要声称接入了ECharts/D3，不提前实现30或T09。

字段与任务：device为虚构类别，day为周一至周日的固定连续顺序，minutes为0–240整数或null，单位分钟/日。类别比较显示同一天各设备，趋势显示一个设备连续七天；不混淆单位、不把类别顺序伪作时间趋势。分布另需按时长区间分箱并给频数/样本量，本例未绘制直方图。普通折线、贡献格或条形不唯一绑定任何库。

选型：少量固定小图可直接SVG/DOM；需要很多常见图表和一致交互可评估图表库；D3提供比例尺、形状与数据连接等定制工具，通常要自己组织图表结构和可访问性。按团队协作、数据规模、维护与交互要求比较ECharts/D3等候选，T09后续再讲API，不凭名字宣称某库必然更快或唯一可用。

轴与编码：本例固定0–240分钟标尺，条形从0基线编码长度；值0真实长度为0并显示零标记与文字，缺失不绘制条形。折线按日期连接相邻已知点，null处断开，不补零、不默认跨缺失插值。趋势并非一概必须0起，但本例统一标尺方便切换对照。色彩只辅助，保留类别/日期、单位、数值和选中标记；不要让缩放后的图中文字无法阅读。

筛选和编辑：比较可选全部或单一设备与日期，趋势选一个设备看七天；从全部比较切到趋势时明确选择阅读屏。所有选择同步图形、数值入口、详情和数据表；筛选隐藏原选中值时提示重新选择，不展示旧值作当前结果。编辑对象/日期明确，输入只接受0–240整数；空串/负数/非法字符拒绝，不默默变0。应用后展示编辑目标并保持其余记录；快速切换以最新状态为准，不丢编辑。标题和示例可真实编辑。

空与缺失：没有符合条件的记录显示空状态；有记录全缺失仍保留对应行与未知说明；0表示观测为零。教学投影开关明确标注，不冒充请求结果。恢复筛选不抹掉编辑值，恢复原始教学数据是单独操作。本课不汇总缺失数据为总计、不作无来源的因果结论。

数值访问与替代：鼠标可临时预览，原生数值按钮可用Tab/Enter或触屏固定选择，详情不遮挡控件、不只靠hover。离开图形恢复固定选择；Escape只关闭当前临时预览，不能撤掉外部焦点。数据表与文字统计提供同一份投影数据，缺失/零/空结果语义一致。必需门槛不依赖拖拽或动画；减少动态实时可完成，图形无强制过渡、无持续rAF。卸载清理media/键盘监听与旧代次导航回调，数据更新不强抢焦点。

验收：逐条比较表格值、SVG长度/点位置和详情，验证固定基线/刻度、折线断点、零与null、筛选空与全缺失、快速编辑/筛选、恢复、resize/375px和短视口。真实Tab与正常/系统reduce零键盘触屏完成错题重试、示例与编辑、复制回退、刷新、取消/确认重置，保留01–28进度。不得把模拟设备样例说成用户家庭/健康/财务数据，不声称联网或AI分析。`;
}
