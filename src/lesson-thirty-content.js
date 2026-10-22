export const LIST_STORAGE = "frontend-observatory.lesson30.v1";
export const ROW_HEIGHT = 64,
  PAGE_SIZE = 25;
export const listData = Array.from({ length: 3000 }, (_, i) => ({
  id: i + 1,
  title: `教学条目 #${String(i + 1).padStart(4, "0")}`,
  category: ["接口检查", "版式核对", "交互验证"][i % 3],
  checked: (i + 1) % 3 === 0,
}));
export const listScope =
  "3000条均为本地生成的虚构教学记录，已在内存中，无后端取数或跨设备同步。本课手写固定64px行高窗口化，未接入TanStack Virtual/react-window；动态行高只做独立测量示意，不用于此虚拟列表。分页是完整语义访问替代，不是虚拟化。";
export const listSteps = [
  {
    short: "窗口",
    time: "4 分钟",
    title: "数据很多，DOM只留下当前窗口",
    desc: "在同一200条集合比较普通与虚拟列表，改变缓冲行数并真实滚动；本地模型仍有3000条。",
  },
  {
    short: "定位",
    time: "4 分钟",
    title: "编号、筛选索引与滚动锚点要分清",
    desc: "查找或跳转，验证末尾，筛选时尽量保留首个可见记录的ID与行内偏移；锚点不在新结果就回开头。",
  },
  {
    short: "访问",
    time: "4 分钟",
    title: "焦点不能跟着被卸载的行消失",
    desc: "用非虚拟分页/查找读取全部记录，再展开独立的动态行高测量示意；不假称列表支持动态高度。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "窗口化解决什么，还留下什么",
    desc: "区分数据加载和DOM渲染、分页和窗口、固定高度与动态测量；不背绝对条数阈值。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "写清规模、尺寸、锚点和键盘路径",
    desc: "生成可编辑简报，描述缓冲策略、定位、可访问替代与实测验收。",
  },
];
export const listQuestions = [
  {
    q: "窗口只渲染十几行，是否说明浏览器只加载了十几条数据？",
    options: [
      "是，虚拟化会自动等同服务端分页/按需加载",
      "不是；本例3000条已在内存，窗口只减少DOM，数据加载策略需另行设计",
    ],
    correct: 1,
    why: "窗口随滚动更换实际DOM；分页切换整页。本例非虚拟分页用于语义访问，数据同样已在本地，不冒充网络按需取数。",
  },
  {
    q: "行高会变化时，还能一直按索引×64定位，并让焦点停在随时卸载的行按钮吗？",
    options: [
      "不能；需估计/测量高度与累计偏移、稳定ID和滚动锚定，另设计焦点保留或稳定入口",
      "能，只加大缓冲就能自动解决测量与键盘问题",
    ],
    correct: 0,
    why: "本例只支持固定64px。独立三行模型展示高度变化如何影响后续偏移，没有接入虚拟列表。虚拟行只读且不进Tab序列，稳定视口/外部按钮与非虚拟分页提供访问路径。",
  },
  {
    q: "超过一个固定条数就必须虚拟化，且一定比普通列表快吗？",
    options: [
      "是，条数阈值和DOM数量就是跨设备性能结论",
      "不是；按行复杂度、目标设备、布局/绘制/内存、滚动与可访问性实测，同量对照并权衡",
    ],
    correct: 1,
    why: "普通与虚拟模式应比较同一数据集合。本例普通列表限制200条免卡顿；虚拟3000条不是与普通200条的公平跑分，也不证明真实设备性能。",
  },
];
export const listSources = [
  [
    "MDN：scrollTop边界与亚像素",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop",
  ],
  [
    "MDN：ResizeObserver测量与清理",
    "https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver",
  ],
  [
    "MDN：原生焦点控制",
    "https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus",
  ],
  [
    "TanStack Virtual官方：窗口、缓冲、测量与锚定",
    "https://tanstack.com/virtual/latest/docs/api/virtualizer",
  ],
  [
    "web.dev：窗口化概念与同量对照",
    "https://web.dev/articles/virtualize-long-lists-react-window",
  ],
];
export const listInitial = () => ({
  step: 0,
  done: [],
  mode: "virtual",
  pool: "large",
  filter: "all",
  height: 320,
  overscan: 2,
  jumpText: "1500",
  caption: "3000条虚构记录的DOM窗口",
  selected: 0,
  virtualSeen: false,
  normalSeen: false,
  bufferSeen: false,
  scrolledSeen: false,
  locatedSeen: false,
  endSeen: false,
  filteredSeen: false,
  emptySeen: false,
  restoredSeen: false,
  pagedSeen: false,
  readSeen: false,
  modelSeen: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readListProgress() {
  const b = listInitial();
  try {
    const x = JSON.parse(localStorage.getItem(LIST_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((n) => [0, 1, 2, 3, 4].includes(n)))];
    for (const [k, vs] of [
      ["mode", ["virtual", "normal", "pages"]],
      ["pool", ["large", "compare"]],
      ["filter", ["all", "checked", "pending", "empty"]],
      ["height", [240, 320, 400]],
      ["overscan", [0, 2, 6]],
    ])
      if (vs.includes(x[k])) b[k] = x[k];
    if (b.mode === "normal") b.pool = "compare";
    if (Number.isInteger(x.selected) && x.selected >= 0 && x.selected <= 3000)
      b.selected = x.selected;
    for (const [k, max] of [
      ["caption", 100],
      ["jumpText", 20],
      ["draft", 8000],
    ])
      if (typeof x[k] === "string") b[k] = x[k].slice(0, max);
    if (Array.isArray(x.answers))
      b.answers = listQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export function filteredItems(pool, filter, mode = "virtual") {
  const base =
    pool === "compare" || mode === "normal" ? listData.slice(0, 200) : listData;
  if (filter === "empty") return [];
  return filter === "all"
    ? base
    : base.filter((x) => (filter === "checked" ? x.checked : !x.checked));
}
export function windowRange(count, scrollTop, height, buffer = 2) {
  count = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  height = Math.max(0, Number.isFinite(height) ? height : 0);
  const max = Math.max(0, count * ROW_HEIGHT - height),
    top = Math.min(
      max,
      Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0),
    );
  if (!count || !height)
    return {
      top,
      max,
      first: 0,
      last: 0,
      start: 0,
      end: 0,
      before: 0,
      after: 0,
    };
  const first = Math.min(count - 1, Math.floor(top / ROW_HEIGHT)),
    last = Math.min(count, Math.ceil((top + height) / ROW_HEIGHT)),
    n = Math.max(0, Math.floor(Number.isFinite(buffer) ? buffer : 0)),
    start = Math.max(0, first - n),
    end = Math.min(count, last + n);
  return {
    top,
    max,
    first,
    last,
    start,
    end,
    before: first - start,
    after: end - last,
  };
}
export function anchorPosition(items, id, intra = 0) {
  const i = items.findIndex((x) => x.id === id);
  return {
    index: i < 0 ? 0 : i,
    found: i >= 0,
    offset: i < 0 ? 0 : Math.max(0, Math.min(ROW_HEIGHT - 0.001, intra)),
  };
}
export function parseRecord(text) {
  if (!/^\d{1,4}$/.test(text.trim())) return null;
  const n = Number(text);
  return n >= 1 && n <= 3000 ? n : null;
}
export function listBrief(data) {
  return `请实现长列表与虚拟化。标题：${data.caption}。

实际机制与边界：${listScope} 源数据只有一次本地生成，禁止宣称后端/网络分页、跨设备同步或已接入某个虚拟库。T12后续专讲工具，本课不提前实现31或无限画布。

规模与公平对照：源模型3000条，普通全DOM只允许前200条；虚拟200条和普通200条才是同量对照。筛选后分别报告候选集/结果数量，本地模型仍3000。DOM指标区分行容器与滚动容器内元素总数，不把子元素或文字节点混为一谈，不把DOM更少直接当作性能跑分。按行复杂度、布局/绘制、内存、滚动与目标设备实测选型，不设万能条数阈值。

行高与窗口：真实行固定64px（含边框/内边距），内容控制在两行；完整语义可在详情/分页读取，不无声裁掉必需内容。根据实际scrollTop/clientHeight推导可见首尾，再各加${data.overscan}行缓冲并钳制0至结果末尾。支撑层保留总滚动高度，虚拟行按筛选后索引定位，用稳定记录ID作key。空结果不制造假行，不依赖分页冒充窗口化。

定位与保持：编号是源记录ID，筛选索引是当前结果位置，二者不能混淆。查找验证1–3000整数，不在当前结果就明确反馈，不自动改筛选/请求服务器。滚动/按钮跳转都改变真实容器位置；末尾、亚像素和越界钳制、resize后最大偏移变化均核对。筛选/模式变化尽量保留首个可见ID及行内偏移；ID不在新集合就回结果开头并解释。分页替代每页25条，页内整体DOM存在，不是窗口化。

动态行高：本例窗口不支持动态行高。独立三行模型真实测量自然高度与累计偏移，只说明固定索引×64何时失效；展开说明不改变虚拟行。正式动态方案需估算、ResizeObserver/库测量缓存、稳定ID、累计偏移、跳转修正与锚定，验证内容变高、字体/宽度变化与后台恢复，不把一个演示读数当完整动态虚拟器。

焦点与可访问性：虚拟行是只读可视化，不加入Tab序列，画面从辅助树隐藏；稳定滚动区和外部原生按钮/查找输入读取详情，非虚拟分页提供完整逐项语义访问。滚动更换行不卸载焦点容器；Tab能离开，不劫持滚轮/触摸或全局Home/End。分页行可用原生按钮，换页/模式/筛选由稳定外部入口操作，不能让卸载节点留下body焦点或误指另一条。若正式行内有可编辑控件，必须另设计聚焦项保留/合理恢复和编辑状态存储，不能直接套本例。

会话、减少动态与清理：本课没有强制动画；实时reduce可完整学习，统计不逐帧live播报。原生scroll用单个待处理rAF合并测量，空闲/隐藏不持续循环；卸载取消rAF、断开observer并移除监听，旧回调不能写新实例。滚动偏移/分页位置只在前三站本次会话保留，离开到判断站或刷新回开头；学习标记、配置和选中记录仅存当前浏览器，重置只清本课。

验收：真实鼠标滚轮/触摸/键盘原生滚动，窗口可见/缓冲范围、实际DOM行数和每行位置逐项一致；同量200对照、3000末尾、跳转编号、筛选索引/锚点、空结果恢复、快速切换、容器resize、动态模型边界和清理。真实Tab和正常/系统reduce零键盘触屏完成错题重试、示例/真实编辑、复制回退、刷新、取消/确认重置，保留01–29进度。不要将浏览器模拟手机说成真实设备，也不宣称已经做后端或硬件性能测试。`;
}
