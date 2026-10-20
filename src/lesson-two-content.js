export const LAYOUT_STORAGE = "frontend-observatory.lesson2.v1";
export const layoutSteps = [
  {
    short: "找到轴线",
    title: "先找到主轴，方向就清楚了",
    time: "3 分钟",
    desc: "从横排按钮组开始。切换 row / column，再改变 gap：同一组内容沿着不同方向排列，主轴也跟着转。",
  },
  {
    short: "控制对齐",
    title: "想对齐哪里，就看哪条轴",
    time: "4 分钟",
    desc: "用“头像＋用户名＋右侧设置”做实验。justify-content 管主轴上的空间分配，align-items 管交叉轴上的对齐。",
  },
  {
    short: "分配空间",
    title: "多出来的空间，和不够用的空间",
    time: "5 分钟",
    desc: "调窄容器，分别试 grow 和 shrink。读浏览器实测宽度，再打开长内容，看看默认最小尺寸如何影响收缩。",
  },
  {
    short: "做出判断",
    title: "给排列一个有理由的实现候选",
    time: "3 分钟",
    desc: "三个常见场景，选择合理的描述。答错可以重试；你要能说清方向、约束和验证方式，不必记代码。",
  },
  {
    short: "交给 Agent",
    title: "把“排整齐”说成可验收的规则",
    time: "3 分钟",
    desc: "选择需求，生成并编辑指令。把方向、间距、两条轴的对齐，以及空间变化时的行为一起交给 Coding Agent。",
  },
];
export const layoutQuestions = [
  {
    q: "容器改成 flex-direction: column 后，想让项目沿竖直方向分配空间，应先看哪个属性？",
    options: [
      "justify-content：它始终跟随主轴",
      "align-items：它永远负责竖直方向",
    ],
    correct: 0,
    why: "在本节水平书写模式中，column 的主轴是竖直方向；justify-content 仍控制主轴。align-items 控制交叉轴，此时是水平方向。方向、书写模式和剩余空间都会影响实际效果。",
  },
  {
    q: "两个项目都设置 flex-grow: 1，就一定会得到相同的最终宽度吗？",
    options: ["一定相同，因为系数都是 1", "不一定，还要看基础尺寸与尺寸约束"],
    correct: 1,
    why: "grow 按比例分配正的剩余空间，不直接规定最终宽度。基础尺寸不同，即使分到相同增量，最终尺寸也可能不同；min/max 约束也会参与。需要等宽时，应明确基础尺寸、约束和验收结果。",
  },
  {
    q: "长单词让项目无法继续变窄，哪条指令更容易定位与验收？",
    options: [
      "把 shrink 调到 999，并隐藏所有超出内容",
      "检查自动最小尺寸，按需设 min-width: 0 并允许内容换行",
    ],
    correct: 1,
    why: "shrink 按“收缩系数 × 基础尺寸”分担负空间，还受最小尺寸限制。增大系数不能保证突破默认最小尺寸；在允许缩小的项目上配合 min-width: 0 与换行规则，再测试长内容。重要信息不应因掩盖溢出而丢失。",
  },
];
export const layoutSources = [
  [
    "MDN：Flex 基础与两条轴",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts",
  ],
  [
    "MDN：对齐与间距",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Aligning_items",
  ],
  [
    "MDN：flex-grow",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/flex-grow",
  ],
  [
    "MDN：flex-shrink",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/flex-shrink",
  ],
  [
    "MDN：min-width",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/min-width",
  ],
  [
    "Figma：Auto Layout 属性",
    "https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma",
  ],
];
export function layoutInitial() {
  return {
    step: 0,
    done: [],
    direction: "row",
    gap: 16,
    example: "buttons",
    directionsSeen: ["row"],
    gapChanged: false,
    cardSeen: false,
    justify: "flex-start",
    align: "flex-start",
    justifyChanged: false,
    alignChanged: false,
    spaceMode: "grow",
    spaceModesSeen: ["grow"],
    width: 420,
    widthChanged: false,
    grow: 1,
    shrink: 1,
    longContent: false,
    minFix: false,
    growChanged: false,
    shrinkChanged: false,
    constraintSeen: false,
    constraintFixed: false,
    answers: [null, null, null],
    draft: "",
    generated: false,
    reviewed: false,
    brief: "profile",
    includeEdges: true,
  };
}
export function readLayoutProgress() {
  const b = layoutInitial();
  try {
    const x = JSON.parse(localStorage.getItem(LAYOUT_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, values] of Object.entries({
      step: [0, 1, 2, 3, 4],
      direction: ["row", "column"],
      gap: [8, 16, 24],
      example: ["buttons", "card"],
      justify: ["flex-start", "center", "space-between"],
      align: ["flex-start", "center", "flex-end", "stretch"],
      spaceMode: ["grow", "shrink"],
      width: [280, 420, 560],
      grow: [0, 1, 2],
      shrink: [0, 1, 2],
      brief: ["profile", "card"],
    }))
      if (values.includes(x[k])) b[k] = x[k];
    for (const [k, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      directionsSeen: ["row", "column"],
      spaceModesSeen: ["grow", "shrink"],
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => values.includes(v)))];
    for (const k of [
      "gapChanged",
      "cardSeen",
      "justifyChanged",
      "alignChanged",
      "widthChanged",
      "growChanged",
      "shrinkChanged",
      "constraintSeen",
      "constraintFixed",
      "longContent",
      "minFix",
      "generated",
      "reviewed",
    ])
      b[k] = x[k] === true;
    if (typeof x.includeEdges === "boolean") b.includeEdges = x.includeEdges;
    if (Array.isArray(x.answers))
      b.answers = layoutQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
  } catch {}
  return b;
}
