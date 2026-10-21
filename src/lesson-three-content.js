export const GRID_STORAGE = "frontend-observatory.lesson3.v1";
export const gridSteps = [
  {
    short: "搭好行列",
    title: "从一条轴，走到行列关系",
    time: "4 分钟",
    desc: "改变列数和两类间隙，再让第一张卡片跨行、跨列。看共享轨道怎样组织同一批内容。",
  },
  {
    short: "分配轨道",
    title: "fr 分的，是可分配的空间",
    time: "4 分钟",
    desc: "比较等分、1:2 和固定侧栏＋弹性主区。调窄容器，读浏览器实测值，别把 fr 当作整个容器的百分比。",
  },
  {
    short: "自动适应",
    title: "让列数跟着可用空间变化",
    time: "4 分钟",
    desc: "把固定三列换成 repeat / minmax / auto-fit 规则，再改变容器和卡片数量。不写布局脚本，也能观察真实自适应。",
  },
  {
    short: "做出判断",
    title: "先说约束，再选 Flex 或 Grid",
    time: "3 分钟",
    desc: "三个场景，选择有理由的实现起点。截图只提供外观线索，行列关系和尺寸约束才是更有用的指令。",
  },
  {
    short: "交给 Agent",
    title: "把“卡片排得一样”说具体",
    time: "3 分钟",
    desc: "选择场景，生成并编辑一份包含轨道、边界情况和验收方式的简报，再交给 Coding Agent。",
  },
];
export const gridQuestions = [
  {
    q: "一组按钮沿一个主要方向排列，不要求和下一行共享列线。什么是合理的起点？",
    options: [
      "先考虑 Flex，并核对换行与空间分配",
      "必须用 Grid，因为所有横排都属于二维布局",
    ],
    correct: 0,
    why: "Flex 常适合沿一条主要轴组织内容；Grid 也能排列按钮。选择应依据关系和约束，不是看到横排就认定唯一工具。",
  },
  {
    q: "卡片跨多行，并且需要上下项目对齐到相同列轨道。哪条描述更清楚？",
    options: [
      "只要看起来差不多，逐行手动定位",
      "先考虑 Grid，明确共享列轨道、间隙与跨列规则",
    ],
    correct: 1,
    why: "Grid 让行和列共享轨道，适合这类二维约束。Flex 换行时各行独立分配空间，不能仅靠外观相似就保证相同列线。两者也可以嵌套：外层 Grid，卡片内部 Flex。",
  },
  {
    q: "截图里主区大约是侧栏的两倍宽，就能直接认定用了 1fr 2fr 吗？",
    options: [
      "能，fr 就是容器百分比，截图足够确定",
      "不能；应确认固定尺寸、间隙、内容限制与窄屏行为",
    ],
    correct: 1,
    why: "fr 是可分配空间的份额，还会受轨道最小尺寸等约束。固定侧栏配弹性主区、比例轨道等方案可能呈现近似外观；截图不能证明真实技术。先明确布局约束，再用多种宽度和长内容验收。",
  },
];
export const gridSources = [
  [
    "MDN：Grid 与行列轨道",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts",
  ],
  [
    "MDN：fr 的份额",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/flex_value",
  ],
  [
    "MDN：minmax()",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/minmax",
  ],
  [
    "MDN：repeat() 与 auto-fit",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/repeat",
  ],
  [
    "MDN：Grid 与其他布局方法",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Relationship_with_other_layout_methods",
  ],
];
export const gridInitial = () => ({
  step: 0,
  done: [],
  columns: 3,
  rowGap: 16,
  columnGap: 16,
  columnSpan: 1,
  rowSpan: 1,
  columnsChanged: false,
  gapsChanged: [],
  spansChanged: [],
  trackMode: "equal",
  trackModesSeen: ["equal"],
  trackWidth: 420,
  widthChanged: false,
  sidebar: 160,
  cardMode: "fixed",
  cardModesSeen: ["fixed"],
  cardWidth: 420,
  minCard: 160,
  count: 4,
  added: false,
  cardWidthChanged: false,
  minChanged: false,
  longContent: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
  brief: "gallery",
  includeEdges: true,
});
export function readGridProgress() {
  const b = gridInitial();
  try {
    const x = JSON.parse(localStorage.getItem(GRID_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [key, values] of Object.entries({
      step: [0, 1, 2, 3, 4],
      columns: [1, 2, 3],
      rowGap: [8, 16, 24],
      columnGap: [8, 16, 24],
      columnSpan: [1, 2],
      rowSpan: [1, 2],
      trackMode: ["equal", "ratio", "fixed"],
      trackWidth: [280, 420, 620],
      sidebar: [120, 160, 200],
      cardMode: ["fixed", "auto"],
      cardWidth: [280, 420, 620],
      minCard: [120, 160, 200],
      brief: ["gallery", "sidebar"],
    }))
      if (values.includes(x[key])) b[key] = x[key];
    b.columnSpan = Math.min(b.columnSpan, b.columns);
    for (const [key, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      gapsChanged: ["row", "column"],
      spansChanged: ["row", "column"],
      trackModesSeen: ["equal", "ratio", "fixed"],
      cardModesSeen: ["fixed", "auto"],
    }))
      if (Array.isArray(x[key]))
        b[key] = [...new Set(x[key].filter((n) => values.includes(n)))];
    for (const key of [
      "columnsChanged",
      "widthChanged",
      "added",
      "cardWidthChanged",
      "minChanged",
      "longContent",
      "generated",
      "reviewed",
    ])
      b[key] = x[key] === true;
    if (typeof x.includeEdges === "boolean") b.includeEdges = x.includeEdges;
    if (Number.isInteger(x.count) && x.count >= 4 && x.count <= 8)
      b.count = x.count;
    if (Array.isArray(x.answers))
      b.answers = gridQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
  } catch {}
  return b;
}
