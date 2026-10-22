export const SPACE_STORAGE = "frontend-observatory.lesson32.v1";
export const NODE_W = 140,
  NODE_H = 80,
  NODE_LIMIT = 400;
export const ZOOM_MIN = 0.2,
  ZOOM_MAX = 2.5;
const finite = (n, fallback) => (Number.isFinite(n) ? n : fallback);
export const bound32 = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const nodes32 = () => [
  { id: "a", x: -120, y: -40, label: "发现问题" },
  { id: "b", x: 0, y: 80, label: "制定方案" },
  { id: "c", x: 120, y: -50, label: "核对结果" },
];
export const edges32 = [
  { id: "ab", from: "a", to: "b" },
  { id: "bc", from: "b", to: "c" },
];
export function view32(v = {}) {
  if (!v || typeof v !== "object") v = {};
  return {
    cx: bound32(finite(v.cx, 0), -2000, 2000),
    cy: bound32(finite(v.cy, 0), -2000, 2000),
    z: bound32(finite(v.z, 1), ZOOM_MIN, ZOOM_MAX),
  };
}
export function validBox32(b) {
  return (
    b &&
    [b.left, b.top, b.width, b.height].every(Number.isFinite) &&
    b.width > 0 &&
    b.height > 0
  );
}
export function screenToWorld32(p, v, b) {
  if (!validBox32(b) || !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
    return null;
  const c = view32(v);
  return {
    x: c.cx + (p.x - b.left - b.width / 2) / c.z,
    y: c.cy + (p.y - b.top - b.height / 2) / c.z,
  };
}
export function worldToScreen32(p, v, b) {
  if (!validBox32(b) || !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
    return null;
  const c = view32(v);
  return {
    x: b.left + b.width / 2 + (p.x - c.cx) * c.z,
    y: b.top + b.height / 2 + (p.y - c.cy) * c.z,
  };
}
export function zoomAt32(v, zoom, p, b) {
  const current = view32(v),
    anchor = screenToWorld32(p, current, b);
  if (!anchor) return null;
  const z = bound32(finite(zoom, current.z), ZOOM_MIN, ZOOM_MAX);
  return view32({
    z,
    cx: anchor.x - (p.x - b.left - b.width / 2) / z,
    cy: anchor.y - (p.y - b.top - b.height / 2) / z,
  });
}
export function pan32(v, dx, dy) {
  const c = view32(v);
  return view32({
    ...c,
    cx: c.cx - finite(dx, 0) / c.z,
    cy: c.cy - finite(dy, 0) / c.z,
  });
}
export function moveNode32(nodes, id, x, y) {
  return nodes.map((n) =>
    n.id === id
      ? {
          ...n,
          x:
            Math.round(bound32(finite(x, n.x), -NODE_LIMIT, NODE_LIMIT) * 10) /
            10,
          y:
            Math.round(bound32(finite(y, n.y), -NODE_LIMIT, NODE_LIMIT) * 10) /
            10,
        }
      : n,
  );
}
export function fit32(nodes, b) {
  if (!validBox32(b)) return null;
  if (!nodes.length) return view32();
  const minX = Math.min(...nodes.map((n) => n.x)) - NODE_W / 2,
    maxX = Math.max(...nodes.map((n) => n.x)) + NODE_W / 2,
    minY = Math.min(...nodes.map((n) => n.y)) - NODE_H / 2,
    maxY = Math.max(...nodes.map((n) => n.y)) + NODE_H / 2;
  return view32({
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    z: Math.min(
      Math.max(1, b.width - 24) / (maxX - minX),
      Math.max(1, b.height - 24) / (maxY - minY),
      1.25,
    ),
  });
}
export function readNodes32(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    new Set(value.map((n) => n?.id)).size !== 3 ||
    !value.every(
      (n) =>
        n &&
        ["a", "b", "c"].includes(n.id) &&
        Number.isFinite(n.x) &&
        Number.isFinite(n.y) &&
        typeof n.label === "string",
    )
  )
    return nodes32();
  return value.map((n) => ({
    id: n.id,
    x: bound32(n.x, -400, 400),
    y: bound32(n.y, -400, 400),
    label: n.label.trim().slice(0, 80) || "教学节点",
  }));
}
export const spaceScope =
  "原生SVG viewBox与Pointer Events，未接入Canvas 2D、WebGL或大型画布库。三节点、两条固定连线，节点中心范围−400…400，视口中心限±2000，缩放20%–250%；无限画布指平移/缩放的交互模型，不是无限数据或无限坐标。仅本浏览器保存已提交节点/视口、草稿与进度，无后端或协作同步。预览、取样和最多10步节点撤销不跨刷新/离开实验；视口导航不进入节点撤销。";
export const spaceSteps = [
  {
    short: "视口",
    time: "4 分钟",
    title: "移动视口，不等于移动节点",
    desc: "背景拖动平移，按钮缩放或适应内容；取样屏幕与世界坐标，观察节点数据保持不变。",
  },
  {
    short: "节点",
    time: "4 分钟",
    title: "缩放后，命中与移动仍要准确",
    desc: "选择节点并改变其世界位置；拖动预览在放下后提交，按钮也改同一模型。试一次取消和节点撤销。",
  },
  {
    short: "找回",
    time: "4 分钟",
    title: "对象离开视口，数据并没有消失",
    desc: "把节点移到边缘，再定位或适应内容找回；编辑长标签，核对缩放、滚轮与零尺寸边界。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "画布不是更长的网页",
    desc: "判断视口与节点、坐标转换、浏览器手势及真实数据边界，不记公式。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "把坐标、导航和编辑规则写清",
    desc: "生成可编辑简报，说明节点/连线、输入、性能和键盘替代；综合与工具模块仍待制作。",
  },
];
export const spaceQuestions = [
  {
    q: "平移和缩放后，节点的世界坐标必须一起重写吗？",
    options: [
      "必须；把画面位置直接当作节点数据",
      "不必；视口决定怎么看，节点坐标描述对象在哪里，屏幕与世界坐标需要转换",
    ],
    correct: 1,
    why: "本例SVG viewBox只改变可见世界范围；平移/缩放不改节点数据。移动节点才提交世界坐标，不能把普通页面scrollTop当成完整画布坐标模型。",
  },
  {
    q: "画布能拖动，还应该提供哪些路径？",
    options: [
      "选择列表、平移/缩放/定位按钮、键盘移动和取消，并保留外部页面滚动与浏览器缩放",
      "禁止整个页面滚动，所有操作只允许鼠标拖动",
    ],
    correct: 0,
    why: "本例只在绘图区解释单指拖动，提供不拖动替代；普通滚轮默认滚页面，画布滚轮缩放需明确开启，Ctrl/Meta滚轮及双指浏览器缩放不被拦截。Tab可以离开画布。",
  },
  {
    q: "要让Agent做无限画布，怎样描述更可靠？",
    options: [
      "只说做成Figma，并默认支持无限节点和多人同步",
      "列节点/连线模型、视口与坐标、缩放锚点、选择编辑、恢复/取消、性能预算和无障碍边界",
    ],
    correct: 1,
    why: "无限画布是交互模型，不是无限容量承诺。本例只有3节点/2固定连线和有限范围，不提供连线编辑、后端、协作同步或大规模性能结论；综合阶段与工具模块尚未制作。",
  },
];
export const spaceSources = [
  [
    "MDN · SVG与viewport",
    "https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/svg",
  ],
  [
    "MDN · viewBox世界范围",
    "https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox",
  ],
  [
    "MDN · 浏览器矩形与滚动",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect",
  ],
  [
    "MDN · Pointer Events与touch-action",
    "https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events",
  ],
  [
    "W3C · 待处理捕获与释放",
    "https://www.w3.org/TR/pointerevents3/#process-pending-pointer-capture",
  ],
];
const flags = [
  "panSeen",
  "zoomSeen",
  "coordinatesSeen",
  "fitSeen",
  "selectedSeen",
  "movedSeen",
  "cancelSeen",
  "undoSeen",
  "awaySeen",
  "recoveredSeen",
  "editedSeen",
];
export function spaceInitial() {
  return {
    step: 0,
    done: [],
    nodes: nodes32(),
    view: view32(),
    initialized: false,
    selected: "a",
    mode: "node",
    wheelZoom: false,
    collapsed: false,
    caption: "本地流程画布",
    labelDraft: "发现问题",
    answers: [null, null, null],
    draft: "",
    generated: false,
    reviewed: false,
    ...Object.fromEntries(flags.map((k) => [k, false])),
  };
}
export function readSpaceProgress() {
  const base = spaceInitial();
  try {
    const d = JSON.parse(localStorage.getItem(SPACE_STORAGE));
    if (!d || typeof d !== "object") return base;
    return {
      ...base,
      ...Object.fromEntries(flags.map((k) => [k, d[k] === true])),
      step: Number.isInteger(d.step) && d.step >= 0 && d.step < 5 ? d.step : 0,
      done: Array.isArray(d.done)
        ? [
            ...new Set(
              d.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
            ),
          ]
        : [],
      nodes: readNodes32(d.nodes),
      view: view32(d.view && typeof d.view === "object" ? d.view : {}),
      initialized: d.initialized === true,
      selected: ["a", "b", "c"].includes(d.selected) ? d.selected : "a",
      mode: d.mode === "pan" ? "pan" : "node",
      wheelZoom: d.wheelZoom === true,
      collapsed: d.collapsed === true,
      caption:
        typeof d.caption === "string" ? d.caption.slice(0, 80) : base.caption,
      labelDraft:
        typeof d.labelDraft === "string"
          ? d.labelDraft.slice(0, 80)
          : base.labelDraft,
      answers: base.answers.map((_, i) =>
        [0, 1].includes(d.answers?.[i]) ? d.answers[i] : null,
      ),
      draft: typeof d.draft === "string" ? d.draft.slice(0, 8000) : "",
      generated: d.generated === true,
      reviewed: d.reviewed === true,
    };
  } catch {
    return base;
  }
}
export function spaceBrief(d) {
  return `请实现「${d.caption || "本地流程画布"}」的平移、缩放与节点编辑。\n实际机制与边界：本演练使用原生SVG viewBox与Pointer Events，只有3节点和2条固定连线，未使用Canvas 2D/WebGL或大型画布库。无限画布指交互模型，不承诺无限坐标或节点，也不代表整门课程结束；综合A已开放，B与T01–T12仍待制作。\n数据结构：节点用稳定ID、中心世界坐标x/y和标签；连线用from/to节点ID，随节点位置重新计算端点。本例不编辑连线。viewport单独保存cx/cy/zoom，与节点数据分离，不把屏幕像素当作世界坐标，也不把长网页滚动当成画布。\n导航与锚点：背景拖动平移，节点模式拖动节点；平移模式可从对象上拖动画面。按钮和键盘也能平移/缩放。按钮以画布中心、可选普通滚轮以指针位置作为缩放锚点；20%–250%，视口中心限±2000；中心受限时锚点让位于边界并提示。屏幕/世界转换基于当前绘图区矩形和缩放，滚动/resize后重新测量；resize保留世界中心，不自动改节点。提供复位视口、适应全部内容和定位选中节点，受限时有明确反馈。\n选择与编辑：可点击节点或外部列表选择；按钮/方向键移动中心世界坐标，本例夹到−400…400。标签可真实编辑，应用后才提交；画布内只显示摘要，列表/编辑器保留全文。节点位置/标签最多10步会话撤销；视口导航用复位/适应，不混进节点撤销。\n事务与输入：按下→预览→放下/确认才改已提交模型。Escape、Tab离开、pointercancel、捕获丢失、绘图区外松手/提前撤回后的外部结束、窗口失焦/隐藏、resize、换站与卸载取消；活动指针遇页面滚动也取消。交错的新命令先取消旧预览和待处理滚轮，迟到回调不得写回新状态。\n滚动与无障碍：绘图区外保留页面滚动；普通滚轮默认滚页面，需明确开启才缩放画布，Ctrl/Meta滚轮始终放行，不实现自定义双指捏合，保留浏览器双指缩放。绘图区单指手势专用，控件不受影响。稳定focusable region与外部原生按钮/对象列表提供替代，无不可见节点Tab目标，Tab可退出，不因平移/缩放抢焦点。\n性能与持久化：输入至多每帧合并一次，无空闲动画循环，卸载取消RAF/监听/ResizeObserver/capture；减少动态仍能完整静态操作。只保存本浏览器已提交节点/视口、草稿和学习进度，无后端/多人协作或跨设备同步。预览、测量、撤销历史不跨刷新/离开。大规模需按实测决定可见性剔除、空间索引与绘制技术，不凭名字或小样例宣称性能。\n验收：桌面和375px，真实平移/缩放后命中与拖动准确，缩放锚点、边界/零尺寸、找回对象、长标签、快速交错输入、取消/重置/离开、真实Tab及正常/reduce触屏路径、旧进度均检查；不要求拖拽才能完成。`;
}
