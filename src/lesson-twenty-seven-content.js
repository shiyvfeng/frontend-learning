export const SPLINE_STORAGE = "frontend-observatory.lesson27.v1";
export const splineScope =
  "本课是可视化工作流模拟：纯React/HTML/CSS与本地状态控制器，没有导入Spline runtime、Spline资产或Three.js，不上传文件、不联网加载3D。二维卡片只示意对象、变量与流程，不是真实Spline编辑器或3D画面。加载成功也仅指本地演练就绪。";
export const splineSteps = [
  {
    short: "交付",
    time: "4 分钟",
    title: "设计工具、交付资产、网页运行时是三层",
    desc: "声明演练假定的资产来源，生成本地交付记录并手动投递一次加载结果。不是实际导出或上传。",
  },
  {
    short: "绑定",
    time: "4 分钟",
    title: "把网页事件绑定到对象与变量",
    desc: "配置并保存规则，真实点击或聚焦DOM入口，观察二维示意变量变化；模拟目标缺失，恢复后再验证。",
  },
  {
    short: "回退",
    time: "4 分钟",
    title: "加载失败、重试与取消都要有路",
    desc: "手动决定模拟结果，验证失败重试、取消和旧结果隔离。没有真实网络、计时等待或账号要求。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "按协作方式选择工具",
    desc: "设计师维护场景与程序化数据场景是不同侧重，Spline与Three.js并非互斥；选错可重试。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "给Agent完整的场景集成简报",
    desc: "写清来源、导出/运行时选择、对象与变量、输入事件、失败回退、许可和性能验收。",
  },
];
export const splineQuestions = [
  {
    q: "本课的二维对象卡片变色，代表正在运行Spline吗？",
    options: [
      "是，任何变化都能叫Spline运行时",
      "不是；这是明确标注的React工作流模拟，真实项目要提供合法资产并实际接入选定运行时",
    ],
    correct: 1,
    why: "设计工具、导出资产和网页运行时是不同层。本课没有Spline资产、SDK、编辑器或上传服务；本地就绪不能算真实Spline加载成功。",
  },
  {
    q: "设计师频繁调整空间场景，而业务有大量程序化对象时怎样选？",
    options: [
      "设计师主导可评估Spline资产工作流，程序化数据可优先评估Three.js；也可按交付能力组合，两者并非互斥",
      "两者互斥，所有普通二维卡片也必须先做3D",
    ],
    correct: 0,
    why: "重点是资产维护、协作、事件/变量接入和成本。Spline有代码集成路径，Three.js能程序化组织场景；是否组合要核对导出能力与运行时，不是唯工具名选型。",
  },
  {
    q: "官方文档列出导出选项，就能承诺任意格式都免费并保留全部交互吗？",
    options: [
      "能，计划和资产许可不影响交付",
      "不能；按账号当前计划、实际导出面板、资产授权与生效条款核对，并验证事件/变量和回退",
    ],
    correct: 1,
    why: "计划功能权限与素材使用许可是两件事。静态图片不自带场景对象事件；真实交付需核对选择的运行时和资产更新后的绑定，不笼统承诺免费、所有格式或交互完全等价。",
  },
];
export const splineSources = [
  [
    "Spline官方：代码导出与集成选项",
    "https://docs.spline.design/exporting-your-scene/web/exporting-as-code",
  ],
  [
    "Spline官方：网页Code API",
    "https://docs.spline.design/exporting-your-scene/web/code-api-for-web",
  ],
  [
    "Spline官方：变量与事件/动作",
    "https://docs.spline.design/interaction-states-events-and-actions/variables-and-data/variables",
  ],
  [
    "Spline官方：Viewer导出",
    "https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer",
  ],
  ["Spline官方：当前计划与权限", "https://spline.design/pricing"],
  ["Spline官方：条款与生效日期", "https://spline.design/terms"],
];
export const splineInitial = () => ({
  step: 0,
  done: [],
  source: "designer",
  rights: false,
  delivery: "runtime",
  outcome: "success",
  target: "stage",
  variable: "theme",
  event: "activate",
  missing: false,
  typeFault: false,
  bound: false,
  caption: "网页按钮如何连接场景对象",
  exported: false,
  loadedSeen: false,
  boundaryReviewed: false,
  eventSeen: false,
  guardSeen: false,
  recoveredSeen: false,
  failureSeen: false,
  retrySeen: false,
  canceledSeen: false,
  staleSeen: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readSplineProgress() {
  const b = splineInitial();
  try {
    const x = JSON.parse(localStorage.getItem(SPLINE_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((n) => [0, 1, 2, 3, 4].includes(n)))];
    for (const [k, values] of [
      ["source", ["designer", "code"]],
      ["delivery", ["runtime", "image"]],
      ["outcome", ["success", "failure"]],
      ["target", ["stage", "tag"]],
      ["variable", ["theme", "accent"]],
      ["event", ["activate", "focus"]],
    ])
      if (values.includes(x[k])) b[k] = x[k];
    if (typeof x.caption === "string") b.caption = x.caption.slice(0, 80);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = splineQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export const workflowObjects = () => ({
  stage: { theme: "day", accent: false },
  tag: { theme: "day", accent: false },
});
export function applyWorkflowBinding(
  objects,
  { target, variable, event, bound, missing, typeFault },
  actualEvent,
) {
  if (!bound) return { ok: false, reason: "尚未保存绑定，变量未改变。" };
  if (actualEvent !== event)
    return { ok: false, reason: "事件与绑定不匹配，变量未改变。" };
  if (!objects[target] || (missing && target === "stage"))
    return {
      ok: false,
      reason: "目标对象缺失（模拟），不能静默绑定到其他对象。",
    };
  if (!["theme", "accent"].includes(variable) || typeFault)
    return {
      ok: false,
      reason: "变量名或类型不匹配（模拟），必须修复后重试。",
    };
  const old = objects[target][variable];
  if (
    (variable === "theme" && typeof old !== "string") ||
    (variable === "accent" && typeof old !== "boolean")
  )
    return { ok: false, reason: "变量类型不匹配，变量未改变。" };
  return {
    ok: true,
    objects: {
      ...objects,
      [target]: {
        ...objects[target],
        [variable]:
          variable === "theme" ? (old === "day" ? "night" : "day") : !old,
      },
    },
  };
}
// Manual local completion packets model cancellation/late results; no network or timers.
export function createWorkflowController(notify = () => {}) {
  let alive = true,
    serial = 0,
    current = { status: "empty", id: null },
    packets = [];
  const snapshot = () => ({ ...current, queued: packets.length });
  const emit = (type, extra = {}) => {
    if (alive) notify({ type, ...snapshot(), ...extra });
  };
  const finish = (p) => {
    if (!alive) return "disposed";
    if (p.done) {
      emit("duplicate");
      return "duplicate";
    }
    p.done = true;
    packets = packets.filter((v) => v !== p);
    if (current.id !== p.id || current.status !== "loading") {
      emit("stale", { packetId: p.id });
      return "stale";
    }
    current = {
      status: p.outcome === "success" ? "ready" : "failed",
      id: p.id,
    };
    emit(p.outcome === "success" ? "success" : "failure", { packetId: p.id });
    return p.outcome;
  };
  return {
    snapshot,
    start(outcome) {
      if (!alive) return { type: "disposed" };
      if (current.status === "loading") {
        emit("repeated");
        return { type: "repeated" };
      }
      if (packets.length >= 8) {
        emit("full");
        return { type: "full" };
      }
      const p = { id: ++serial, outcome, done: false };
      packets.push(p);
      current = { status: "loading", id: p.id };
      emit("started");
      return { type: "started", id: p.id, complete: () => finish(p) };
    },
    deliver() {
      if (!alive) return "disposed";
      if (!packets.length) {
        emit("empty");
        return "empty";
      }
      return finish(packets[0]);
    },
    cancel() {
      if (!alive) return;
      if (current.status !== "loading") {
        emit("no-cancel");
        return;
      }
      serial++;
      current = { status: "canceled", id: null };
      emit("canceled");
    },
    invalidate() {
      if (!alive) return;
      serial++;
      current = { status: "empty", id: null };
      emit("invalidated");
    },
    dispose() {
      alive = false;
      serial++;
      packets = [];
      current = { status: "disposed", id: null };
    },
  };
}
