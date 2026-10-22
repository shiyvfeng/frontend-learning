export const THREE_STORAGE = "frontend-observatory.lesson26.v1";
export const threeScope =
  "真实导入Three.js 0.186.1，使用WebGLRenderer(WebGL 2)渲染自制立方体与地面。Scene组织对象，PerspectiveCamera决定视角，Mesh把geometry与material组合，MeshStandardMaterial描述表面，灯光影响这种材质的明暗。不是视频、CSS 3D或建模软件，也不加载外链模型。";
export const threeSteps = [
  {
    short: "场景",
    time: "4 分钟",
    title: "把三维画面拆成五个角色",
    desc: "旋转或缩放真实网格，核对场景、相机、网格、材质与灯光的职责。无须写代码或记矩阵。",
  },
  {
    short: "视角",
    time: "4 分钟",
    title: "同一对象，改变看法与照明",
    desc: "切换相机和光照，试一次相机重置。全部有按钮替代，不接管拖拽、滚轮或触摸滚动。",
  },
  {
    short: "预算",
    time: "4 分钟",
    title: "让3D有成本上限和失败出口",
    desc: "切换低分辨率，体验明确的文字/图形回退。模块加载失败、WebGL 2不可用和上下文丢失都不冒充成功。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "什么时候值得用Three.js",
    desc: "辨认职责与成本，不把普通二维卡片强制做成3D；选错可重试并阅读理由。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "写一份可验收的三维简报",
    desc: "描述对象、视角、材质、交互、加载失败与性能预算。生成后可编辑复制，不要求手写场景代码。",
  },
];
export const threeQuestions = [
  {
    q: "Three.js里的scene、camera、mesh分别负责什么？",
    options: [
      "它们都只是同一个CSS卡片的别名",
      "scene组织场景，camera决定视角，mesh组合几何与材质；画面由renderer实际绘制",
    ],
    correct: 1,
    why: "这些是运行时真实三维对象。材质决定表面如何表现，灯光影响会响应光照的材质；不是把整块Canvas用CSS旋转。",
  },
  {
    q: "同一个物体，怎样改变看起来的角度？",
    options: [
      "改变相机的位置/朝向，或者改变对象本身的变换；要明确哪一个在变并提供重置",
      "只改描述文字就等于相机已经移动",
    ],
    correct: 0,
    why: "本例相机预设改变PerspectiveCamera，旋转按钮改变Mesh。两者都能改变实际像素，但职责不同。resize还需同步aspect与投影矩阵。",
  },
  {
    q: "普通信息卡片是否都该使用Three.js？",
    options: [
      "都应该，3D总更快也不需要清理资源",
      "先比较CSS/SVG/Canvas；确有空间展示价值再用3D，写清加载、性能、回退和清理",
    ],
    correct: 1,
    why: "3D引入模块、WebGL支持、几何/材质/renderer生命周期等成本。软件渲染不证明硬件性能；不能把回退称作真实3D成功，也不能省略文本和替代操作。",
  },
];
export const threeSources = [
  [
    "Three.js：WebGLRenderer与WebGL 2",
    "https://threejs.org/docs/pages/WebGLRenderer.html",
  ],
  [
    "Three.js：PerspectiveCamera",
    "https://threejs.org/docs/pages/PerspectiveCamera.html",
  ],
  [
    "Three.js：MeshStandardMaterial",
    "https://threejs.org/docs/pages/MeshStandardMaterial.html",
  ],
  ["Three.js：资源清理", "https://threejs.org/manual/pages/cleanup.html"],
  ["Three.js：Scene", "https://threejs.org/docs/pages/Scene.html"],
];
export const threeInitial = () => ({
  step: 0,
  done: [],
  turn: 0,
  size: 1,
  view: "side",
  light: 3,
  metal: false,
  low: false,
  fallback: false,
  caption: "同一立方体，不同视角与光照",
  objectChanged: false,
  rolesReviewed: false,
  viewChanged: false,
  lightChanged: false,
  cameraReset: false,
  budgetChanged: false,
  fallbackReviewed: false,
  inspected: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readThreeProgress() {
  const b = threeInitial();
  try {
    const x = JSON.parse(localStorage.getItem(THREE_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((n) => [0, 1, 2, 3, 4].includes(n)))];
    for (const [k, min, max] of [
      ["turn", 0, Math.PI * 2],
      ["size", 0.7, 1.3],
      ["light", 0.5, 4],
    ])
      if (typeof x[k] === "number" && Number.isFinite(x[k]))
        b[k] = Math.min(max, Math.max(min, x[k]));
    if (["front", "side", "top"].includes(x.view)) b.view = x.view;
    if (typeof x.caption === "string") b.caption = x.caption.slice(0, 80);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = threeQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export function threeSize(width, height, dpr, low = false, limit = 1024) {
  const density = Math.min(
      Math.max(Number.isFinite(dpr) ? dpr : 1, 0.5),
      low ? 0.75 : 1.5,
    ),
    scale = Math.min(
      density,
      Math.max(1, Math.min(1024, limit)) / Math.max(1, width, height),
    );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}
export const cameraPositions = {
  front: [0, 1.3, 5.7],
  side: [4.2, 2.5, 4.2],
  top: [0.01, 5.8, 0.01],
};
