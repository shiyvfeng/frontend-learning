export const MOVE_STORAGE = "frontend-observatory.lesson31.v1";
export const cards31 = { a: "观察草图", b: "核对文案", c: "验证按钮" };
export const columns31 = { todo: "待安排", doing: "处理中" };
export const initialBoard31 = () => ({ todo: ["a", "b"], doing: ["c"] });
export function validBoard31(v) {
  return (
    v &&
    ["todo", "doing"].every((k) => Array.isArray(v[k])) &&
    [...v.todo, ...v.doing].length === 3 &&
    new Set([...v.todo, ...v.doing]).size === 3 &&
    [...v.todo, ...v.doing].every((id) => Object.hasOwn(cards31, id))
  );
}
export function locate31(board, id) {
  for (const column of Object.keys(columns31)) {
    const index = board[column].indexOf(id);
    if (index !== -1) return { column, index };
  }
  return null;
}
// Destination index is measured AFTER removing the source item.
export function moveCard31(board, id, target) {
  if (
    !validBoard31(board) ||
    !locate31(board, id) ||
    !target ||
    !Object.hasOwn(columns31, target.column) ||
    !Number.isInteger(target.index)
  )
    return board;
  const next = Object.fromEntries(
    Object.keys(columns31).map((k) => [k, board[k].filter((x) => x !== id)]),
  );
  const items = next[target.column];
  items.splice(Math.max(0, Math.min(items.length, target.index)), 0, id);
  return JSON.stringify(next) === JSON.stringify(board) ? board : next;
}
export function size31(width, height, available = 480) {
  const maxWidth = Math.max(
    1,
    Math.min(480, Number.isFinite(available) ? available : 480),
  );
  const minWidth = Math.min(180, maxWidth);
  return {
    width: Math.round(
      Math.max(
        minWidth,
        Math.min(maxWidth, Number.isFinite(width) ? width : 280),
      ),
    ),
    height: Math.round(
      Math.max(132, Math.min(300, Number.isFinite(height) ? height : 160)),
    ),
    minWidth,
    maxWidth,
  };
}
export const moveScope =
  "本地虚构三卡看板。实际使用原生Pointer Events、pointer capture与React数据更新，未使用dnd-kit、HTML文件拖入或后端。预览不提交；合法放下/确认才改变顺序或尺寸。已提交模型、参数、草稿与进度只存当前浏览器；活动预览和最多10步撤销仅在本次实验内，换站取消预览，刷新/离开后撤销清空。";
export const moveSteps = [
  {
    short: "放置",
    time: "4 分钟",
    title: "拿起、预览目标，再决定是否提交",
    desc: "真实拖动把卡片跨列放下；也可选中卡片，用预览、确认和取消按钮完成同一事务。",
  },
  {
    short: "排序",
    time: "4 分钟",
    title: "允许目标、顺序和撤销都属于交互",
    desc: "改变同列顺序，尝试禁止的归档区，再撤销一次真实提交。键盘与点击替代改同一份模型。",
  },
  {
    short: "尺寸",
    time: "4 分钟",
    title: "预览尺寸与已保存尺寸要分开",
    desc: "拖动尺寸把手或用按钮调整真实盒子，观察最小/最大值与窄屏夹值，再取消一次尺寸预览。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "拖动只是输入，不是完整规则",
    desc: "判断提交、取消、替代操作与持久化边界，不记库API。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "把目标、边界和恢复写给Agent",
    desc: "生成可编辑简报，给出输入、允许区域、排序、尺寸和无障碍验收。",
  },
];
export const moveQuestions = [
  {
    q: "看到卡片跟着指针移动，就代表排序已经保存了吗？",
    options: [
      "是，预览就是提交",
      "不是；需明确合法目标与提交时机，取消或无效放下应恢复原模型",
    ],
    correct: 1,
    why: "拖动预览、目标命中和模型提交是不同阶段。本例在合法放下/确认前不写入已提交模型；取消、失焦或无效目标均恢复。",
  },
  {
    q: "有键盘快捷键后，还需要不拖动的点击/触屏替代吗？",
    options: [
      "需要；选择目标、上移/下移和尺寸按钮可完成同一结果，键盘支持并不能替代单指点击路径",
      "不需要，只要鼠标能拖就够了",
    ],
    correct: 0,
    why: "WCAG拖动移动要求单指不拖动的替代；键盘访问另需设计。按钮应真实修改同一模型，且保留可见焦点和退出路径。",
  },
  {
    q: "尺寸、取消与保存的Agent指令应怎样写？",
    options: [
      "无限放大，自动云同步，库会自动理解业务规则",
      "列出最小/最大尺寸、窄屏限制、取消/撤销及本地保存边界，再按实际需求选择Pointer Events或dnd-kit等",
    ],
    correct: 1,
    why: "库能提供输入和碰撞等能力，但允许区域、排序、尺寸、焦点与持久化仍需产品规则。本例上限480×300px、下限180×132px，宽度还受容器限制；无跨设备同步。",
  },
];
export const moveSources = [
  [
    "MDN · Pointer Events与touch-action",
    "https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events",
  ],
  [
    "MDN · setPointerCapture",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture",
  ],
  [
    "WCAG 2.2 · 拖动移动的替代",
    "https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html",
  ],
  ["dnd-kit · 当前官方概览（候选，未接入）", "https://dndkit.com/"],
];
const flags31 = [
  "previewSeen",
  "moveSeen",
  "cancelSeen",
  "orderSeen",
  "invalidSeen",
  "undoSeen",
  "resizeSeen",
  "clampedSeen",
  "sizeCancelSeen",
];
export function moveInitial() {
  return {
    step: 0,
    done: [],
    board: initialBoard31(),
    selected: "a",
    width: 280,
    height: 160,
    caption: "本地看板演练",
    answers: [null, null, null],
    draft: "",
    generated: false,
    reviewed: false,
    ...Object.fromEntries(flags31.map((k) => [k, false])),
  };
}
export function readMoveProgress() {
  const base = moveInitial();
  try {
    const d = JSON.parse(localStorage.getItem(MOVE_STORAGE));
    if (!d || typeof d !== "object") return base;
    const size = size31(d.width, d.height);
    return {
      ...base,
      ...Object.fromEntries(flags31.map((k) => [k, d[k] === true])),
      step: Number.isInteger(d.step) && d.step >= 0 && d.step < 5 ? d.step : 0,
      done: Array.isArray(d.done)
        ? [
            ...new Set(
              d.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
            ),
          ]
        : [],
      board: validBoard31(d.board) ? d.board : base.board,
      selected: Object.hasOwn(cards31, d.selected) ? d.selected : "a",
      width: size.width,
      height: size.height,
      caption:
        typeof d.caption === "string" ? d.caption.slice(0, 80) : base.caption,
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
export function moveBrief(d) {
  return `请实现「${d.caption || "本地看板"}」的拖放与尺寸交互。\n实际机制：本演练使用原生Pointer Events、pointer capture和React模型，未接入dnd-kit。项目若采用dnd-kit等，先核对当前官方版本/传感器/碰撞与键盘能力，不假设库替我们决定业务规则。\n对象与允许目标：三张稳定ID卡片；待安排/处理中允许跨列及同列排序，只读归档禁止放置。明确插入到哪一项之前或列尾，拖动预览仅为装饰，不能有重复交互副本。\n提交与取消：按下/拿起→预览目标→合法放下/确认才提交。同一事务期间原顺序保留；无效目标、Escape、pointercancel、lost capture、窗口失焦、滚动/resize、换站/卸载均取消，不让迟到事件写回。快速第二次输入不覆盖未完成事务。提供明确反馈和最多10步本地撤销。\n尺寸约束：当前期望${d.width}×${d.height}px；边框盒宽180–480px、高132–300px，窄容器宽度优先夹到可用空间；不裁掉正文，超长内容可在卡片内滚动。尺寸预览与已提交值分开，取消恢复。按实际内容/视口定义约束，不能无限放大。\n等价操作与焦点：可点击选择卡片、目标列、上移/下移与尺寸按钮，改同一模型；把手支持Enter/Space拿起、方向键预览、Enter/Space提交、Escape或Tab取消，Tab可离开。重排/跨列若卸载持焦把手，只在焦点确因本操作失效时恢复到同一ID把手，不抢外部控件。仅把手touch-action:none，其余区域允许页面滚动。\n持久化与减少动态：只保存本浏览器已提交模型/尺寸、草稿和学习进度，无后端/跨设备同步；预览和撤销历史不跨刷新。减少动态仍有完整状态反馈，无动画通关门槛。pointermove至多每帧合并一次更新，无空闲循环，卸载取消帧、监听和capture。\n验收：桌面及375px，真实鼠标拖动、原生键盘、零键盘触屏替代与触摸拖动；验证合法/非法放下、空列、边界排序、最小最大尺寸、取消/撤销/重置、快速输入、焦点、滚动、resize、reduce实时切换及旧进度保留。`;
}
