// Numbered lessons follow the course sequence; coverage tags are separate.
export const courseRoute = [
  ["结构", "页面不是一张图", "DOM · 组件树 · 职责与复用", "React / DevTools"],
  [
    "Flex · 一维排列",
    "Flex——一维排列",
    "row / column · gap · 对齐 · grow / shrink",
    "原生 CSS Flexbox / DevTools",
  ],
  [
    "Grid · 二维布局",
    "Grid——二维布局",
    "行列轨道 · fr · repeat / minmax · 自适应卡片",
    "原生 CSS Grid / DevTools",
  ],
  [
    "Position 与浮层",
    "Position与浮层",
    "定位参照 · 层叠 · 浮层约束",
    "CSS Position / Anchor Positioning / Base UI",
  ],
  [
    "Sizing 与 Overflow",
    "Sizing与Overflow",
    "尺寸约束 · 最小尺寸 · 溢出与滚动",
    "原生 CSS / DevTools",
  ],
  ["响应式", "响应式", "媒体查询 · 容器查询 · 内容适配", "原生 CSS / DevTools"],
  [
    "圆角阴影层级",
    "圆角阴影层级",
    "边界 · 阴影 · 视觉层次",
    "CSS / 设计 Token",
  ],
  ["毛玻璃", "毛玻璃", "背景模糊 · 对比度 · 降级", "CSS backdrop-filter"],
  ["渐变光晕", "渐变光晕", "渐变 · 光晕 · 合成", "原生 CSS"],
  [
    "Mask / Clip Path",
    "Mask/Clip Path",
    "遮罩 · 裁切 · 可访问内容",
    "CSS mask / clip-path",
  ],
  ["SVG", "SVG", "矢量图形 · 路径 · 可访问性", "SVG / 设计工具"],
  ["State", "State", "事件 · 状态 · 数据流", "React"],
  [
    "Props 与 Variant",
    "Props与Variant",
    "输入参数 · 组件变体",
    "React / 设计组件",
  ],
  ["条件渲染", "条件渲染", "条件分支 · 空状态 · 保留状态", "React"],
  [
    "Loading 与反馈",
    "Loading/Skeleton/Optimistic UI",
    "加载 · 占位 · 乐观更新与失败回退",
    "React / TanStack Query",
  ],
  [
    "State Machine",
    "State Machine",
    "状态 · 事件 · 允许的转换",
    "XState / 状态图",
  ],
  [
    "Micro Interaction",
    "Micro Interaction",
    "局部反馈 · 动态效果偏好",
    "CSS / Motion",
  ],
  [
    "Enter / Exit",
    "Enter/Exit",
    "进入 · 离开 · 焦点与生命周期",
    "CSS / Motion",
  ],
  ["Spring", "Spring", "弹簧参数 · 手感 · 减少动态", "Motion"],
  ["Layout Animation", "Layout Animation", "布局变化 · FLIP · 性能", "Motion"],
  [
    "共享元素过渡",
    "Shared Element Transition",
    "跨视图关联 · 视觉连续性",
    "View Transitions / Motion",
  ],
  [
    "滚动动画",
    "Scroll Animation",
    "滚动进度 · 可见范围 · 编排",
    "CSS Scroll-driven Animations / 按需 GSAP",
  ],
  [
    "指针驱动",
    "Cursor/Pointer Driven",
    "指针 · 触控 · 键盘替代",
    "Pointer Events / CSS / Motion",
  ],
  ["Canvas", "Canvas", "像素画布 · 绘制循环 · 性能", "Canvas API"],
  ["WebGL / Shader", "WebGL/Shader", "GPU · 着色器 · 兼容与降级", "WebGL"],
  [
    "Three.js",
    "Three.js",
    "场景 · 相机 · 材质与交互",
    "Three.js / React Three Fiber",
  ],
  ["Spline", "Spline", "场景资产 · 嵌入 · 性能预算", "Spline"],
  [
    "Lottie 与 Rive",
    "Lottie与Rive",
    "动画资产 · 交互与状态机 · 运行时",
    "dotLottie / Rive",
  ],
  [
    "数据可视化",
    "数据可视化",
    "图表选择 · 数据语义 · 可访问性",
    "ECharts / D3",
  ],
  ["长列表虚拟化", "长列表虚拟化", "窗口化 · 焦点 · 滚动与测量", "虚拟化工具"],
  [
    "拖放与缩放",
    "Drag/Drop/Resize",
    "拖放 · 调整尺寸 · 键盘替代",
    "dnd-kit / Pointer Events",
  ],
  [
    "无限画布",
    "Infinite Canvas",
    "坐标系 · 平移缩放 · 场景组织",
    "Canvas / SVG / 按需 WebGL",
  ],
];
export const coverageTags = [
  ["A", "设计工具映射"],
  ["B", "Agent 指令能力"],
  ["T01", "React / Next.js"],
  ["T02", "Tailwind"],
  ["T03", "Radix / Base UI"],
  ["T04", "shadcn/ui"],
  ["T05", "Motion"],
  ["T06", "GSAP / ScrollTrigger"],
  ["T07", "Rive / Lottie"],
  ["T08", "Three.js / R3F / Spline"],
  ["T09", "ECharts / D3"],
  ["T10", "TanStack Query"],
  ["T11", "XState"],
  ["T12", "dnd-kit / Virtualization"],
];

// Register a lesson only once its view is implemented. All availability UI reads
// this release metadata; planned numbered lessons and coverage tags stay locked.
export const implementedCourseMetadata = {
  "01": { view: "structure" },
  "02": { view: "flex" },
  "03": { view: "grid" },
  "04": { view: "position" },
  "05": { view: "sizing" },
  "06": { view: "responsive" },
};
export const lessonCatalog = courseRoute.map((lesson, index) => {
  const id = String(index + 1).padStart(2, "0");
  const release = implementedCourseMetadata[id];
  return {
    id,
    index,
    label: lesson[0],
    title: lesson[1],
    available: Boolean(release),
    status: release ? "已制作" : "尚未制作",
    view: release?.view,
    technology: release
      ? (release.technology ?? "React + 原生 CSS · 无动画依赖")
      : null,
  };
});
export const coverageCatalog = coverageTags.map(([id, title]) => ({
  id,
  title,
  available: Boolean(implementedCourseMetadata[id]),
  status: implementedCourseMetadata[id] ? "已制作" : "尚未制作",
}));
export const availableLessons = lessonCatalog.filter(
  (lesson) => lesson.available,
);
const formatRanges = (numbers) => {
  const ranges = [];
  for (let i = 0; i < numbers.length; i++) {
    const start = numbers[i];
    let end = start;
    while (numbers[i + 1] === end + 1) end = numbers[++i];
    const label = (n) => String(n).padStart(2, "0");
    ranges.push(start === end ? label(start) : `${label(start)}–${label(end)}`);
  }
  return ranges.join("、");
};
export const availableLessonRange = formatRanges(
  availableLessons.map((lesson) => lesson.index + 1),
);
export const availabilityText = availableLessons.length
  ? `目前 ${availableLessonRange} 课可以学习。其余保留目录，按节逐步制作。`
  : "课程尚未制作，当前提供目录预览。";
export const availabilityFooter = `可学习课程 ${availableLessonRange || "暂无"} · ${availableLessons.length} / ${lessonCatalog.length}`;
export function nextLessonHint(index) {
  const next = lessonCatalog[index + 1];
  if (!next) return "已到课程目录末尾。";
  return next.available
    ? `可以从课程目录继续 ${next.id} ${next.title}。`
    : `下一课 ${next.id} ${next.title} 尚未制作。`;
}
