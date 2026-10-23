export const TOOL08_STORAGE = "frontend-observatory.tool08.v1";
export const tool08Scope =
  "真实预览固定使用已安装Three.js 0.186.1 / WebGLRenderer(WebGL 2)，绘制本站原创几何台灯和库存标记。React Three Fiber与Spline为路线和资产合同示意，没有安装R3F/Spline runtime、没有.splinecode或外链模型。选择候选不会切换真实预览引擎。库存只是本地手动样例，无服务器或第三方上传。";
export const tool08Steps = [
  {
    short: "抽象与选型",
    title: "同一产品场景，三条路线承担不同工作",
    time: "4分钟",
    desc: "为台灯配置预览选择路线：Three.js提供三维对象与渲染；R3F用React组织Three.js；Spline侧重设计资产和运行时工作流。不是三种必然互斥的效果。",
  },
  {
    short: "配置与数据",
    title: "产品状态改变，真实三维画面也要跟着变",
    time: "5分钟",
    desc: "改变灯罩颜色、支架高度、相机与库存标记；旁边同时列出三条路线的接入合同。实际运行的始终是Three.js，不把React面板冒称R3F或Spline。",
  },
  {
    short: "生命周期",
    title: "加载、失败、取消与资源释放要一起交接",
    time: "5分钟",
    desc: "真实模块先准备，手动应用模拟延迟；取消后的旧结果不能重建场景。隐藏/离站释放本例资源，减少动态下静态参数仍可完整学习。",
  },
  {
    short: "判断理由",
    title: "按React、资产和动态数据条件判断",
    time: "3分钟",
    desc: "三题可重试，关注团队维护与运行约束，不按库名评分。",
  },
  {
    short: "Agent简报",
    title: "交付场景、状态映射和运行预算",
    time: "4分钟",
    desc: "生成可编辑的本地草稿，明确实际路线与候选、资源来源、输入、加载回退和释放验收；不自动发送、执行或部署。",
  },
];
export const routes = [
  ["three", "Three.js程序化路线"],
  ["r3f", "React Three Fiber候选"],
  ["spline", "Spline资产候选"],
];
export function recommendation(d) {
  const route =
    d.route === "three"
      ? "Three.js路线可直接组织Scene、Mesh、Camera与资源生命周期，适合需要底层控制/程序化生成的团队；React项目也能这样集成。"
      : d.route === "r3f"
        ? "R3F是Three.js的React renderer，适合用组件/props组织可复用场景并连接React状态；不是独立建模工具或自动性能保证。"
        : "Spline侧重设计师编辑场景、事件/变量及导出资产的工作流；网页仍需要相应runtime，React包装不等于R3F。";
  return `${route} ${d.asset === "designer" ? "已有设计资产：先核对来源、导出格式、对象/变量标识、依赖资源与使用/自托管权限；不因有素材就保证兼容或免费导出。" : "当前可程序化构建简单几何，避免为凑资产引入外链模型；复杂艺术效果可与设计资产配合。"} ${d.app === "react" ? "已有React应用：可评估R3F组件复用，也可封装Three.js或Spline runtime；保留既有DOM表单。" : "非React页面：R3F需要React环境，先核对引入成本；直接Three.js或Spline runtime都可评估；不必只为3D迁移整个应用到React。"} ${d.input === "data" ? "需要动态业务数据：约定配置对象到颜色/尺寸/可见性的映射、更新频率和失效策略，不让引擎猜业务。" : "只需固定展示：先评估静态图或少量按需交互，不必持续渲染。"} 这是本地条件说明，不是AI评分或唯一答案。`;
}
export const tool08Questions = [
  {
    q: "Three.js与React Three Fiber是什么关系？",
    options: [
      "R3F取代Three.js，换名字就不需要三维资源管理",
      "R3F是Three.js的React renderer，用组件组织对象；共享/缓存和外部资源仍要约定所有权",
    ],
    correct: 1,
    why: "两者是抽象层级关系。R3F可参与React状态和生命周期，但不会自动使任意场景更快；按需渲染、共享资源、加载与清理仍需设计。",
  },
  {
    q: "设计师提供Spline资产，网页已有React配置表单，应该如何交接？",
    options: [
      "核对资产导出、对象/变量和事件以及runtime支持，约定与表单状态同步；React包装不代表改用了R3F",
      "Spline只能静态展示，不能连接任何动态数据",
    ],
    correct: 0,
    why: "Spline的Code API可连接变量、对象属性和事件。要依赖资产实际定义及导出/运行时支持；设计工具、资产与网页runtime是不同环节，本课只做合同示意。",
  },
  {
    q: "一个静止的产品预览是否必须一直运行60fps并声称性能优秀？",
    options: [
      "必须，库会自动处理全部性能和失败问题",
      "按需更新可以更合适；给DPR/尺寸/实例预算、文字回退和资源释放，并在目标设备实测",
    ],
    correct: 1,
    why: "本例无自动动画，用合并的一次rAF按需绘制。Three.js几何/材质/renderer需释放；减少动态可静态查看，软件WebGL结果不能作为硬件性能证明。",
  },
];
export const tool08Sources = [
  [
    "Three.js · WebGLRenderer",
    "https://threejs.org/docs/pages/WebGLRenderer.html",
  ],
  ["Three.js · 资源释放", "https://threejs.org/manual/pages/cleanup.html"],
  [
    "Three.js · 按需绘制",
    "https://threejs.org/manual/pages/rendering-on-demand.html",
  ],
  ["R3F · 抽象层级", "https://r3f.docs.pmnd.rs/getting-started/introduction"],
  [
    "R3F · 按需渲染与资源",
    "https://r3f.docs.pmnd.rs/advanced/scaling-performance",
  ],
  [
    "Spline · Code API与React包装",
    "https://docs.spline.design/exporting-your-scene/web/code-api-for-web",
  ],
];
export const tool08Initial = () => ({
  step: 0,
  done: [],
  route: "three",
  routesSeen: ["three"],
  asset: "geometry",
  app: "react",
  input: "static",
  inputsSeen: ["static"],
  comparedSeen: false,
  finish: "violet",
  height: "normal",
  view: "side",
  light: "3",
  stock: 3,
  low: false,
  fallback: false,
  variantSeen: false,
  dataSeen: false,
  viewSeen: false,
  inspectedSeen: false,
  loadedSeen: false,
  fallbackAcknowledged: false,
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
export function readTool08Progress() {
  const d = tool08Initial();
  try {
    const x = JSON.parse(localStorage.getItem(TOOL08_STORAGE));
    if (!x || typeof x !== "object") return d;
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof x[k] === "boolean") d[k] = x[k];
    for (const [k, vs] of Object.entries({
      route: routes.map((r) => r[0]),
      asset: ["geometry", "designer"],
      app: ["react", "plain"],
      input: ["static", "data"],
      finish: ["violet", "sage"],
      height: ["normal", "tall"],
      view: ["side", "front"],
      light: ["1", "3"],
      outcome: ["success", "failure"],
    }))
      if (vs.includes(x[k])) d[k] = x[k];
    d.step = [0, 1, 2, 3, 4].includes(x.step) ? x.step : 0;
    d.stock = [0, 3].includes(x.stock) ? x.stock : 3;
    d.done = Array.isArray(x.done)
      ? [
          ...new Set(
            x.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
          ),
        ]
      : [];
    for (const [k, vs] of Object.entries({
      routesSeen: routes.map((r) => r[0]),
      inputsSeen: ["static", "data"],
    }))
      if (Array.isArray(x[k]))
        d[k] = [...new Set(x[k].filter((v) => vs.includes(v)))];
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
export function tool08Brief(d) {
  return `三维产品预览集成草稿\n项目现状（用户核对）：${d.context || "【待确认现有React/资产/动态数据约束】"}\n选型条件：${recommendation(d)}\n演示边界：${tool08Scope}\n同一产品：自制几何台灯，灯罩${d.finish}、高度${d.height}、视角${d.view}、主光${d.light}。应用配置对象决定材质/对象变换，相机单独重置；本地库存${d.stock}只映射标记数量，不代表真实服务端库存。\n路线合同：Three.js显式更新对象；R3F候选先核对React/R3F/Three版本兼容，将相同配置作为组件props并按需invalidate，不能把普通React面板称作R3F。Spline候选核对场景来源/导出权限、对象标识和变量/事件，再与DOM表单同步；未安装runtime不声称已接入。可组合路线，不为品牌迁移全部应用。\n输入与数据：列字段、类型、范围、更新频率、业务失败和旧结果隔离；渲染完成不是业务保存成功。所有关键控件保留DOM标签和键盘/触屏替代，不接管页面滚动。\n加载与预算：按需懒加载，无外链模型；生产资产须列字节/纹理/几何预算。本例DPR≤2、位图≤640×480且服从设备上限，低分辨率选项=${d.low}，按需合并rAF，无持续循环；软件WebGL只用于功能验证。R3F资源缓存/外部对象也须约定所有权，Spline按实际导出和运行环境核对，不能承诺任意格式或计划均可用。\n失败与生命周期：模块/WebGL/着色器失败保留清楚的非3D文字回退和重试，取消/重置/离站后的旧模块、结果和回调不得重建旧场景。资源错误只释放画面，操作控件保持，焦点不落body也不抢外部新焦点。隐藏/离站取消待处理帧并dispose本例几何、材质、renderer、监听与观察器；可选上下文释放扩展不可用时由浏览器回收。页面恢复可见但上下文仍丢失时继续报告lost，不能停留在隐藏提示或冒称成功；上下文实际恢复仅重建当前仍有效实例。\n减少动态与验收：默认不自动旋转，reduce仍可静态调参、查看文字；375px/短视口、实际Tab和触屏均可完成。核对真实renderer/参数/像素变化、快速更新最后状态、resize/DPR、失败/恢复、资源释放与无持续后台帧。\n本地规则草稿可编辑复制，未发送、执行或部署；仅当前浏览器存储，不跨设备。T08为工具专题，T10–T12仍为3个预告。`;
}
