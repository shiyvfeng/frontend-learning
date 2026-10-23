export const TOOL07_STORAGE = "frontend-observatory.tool07.v1";
export const tool07Scope =
  "真实预览固定使用lottie-web 5.13.0的SVG renderer与本站原创lesson28-timeline.json（120帧/30fps，无外部图片字体）。Rive/.riv与dotLottie/.lottie仅为选型和输入契约模拟，未安装对应runtime。候选选择不切换真实预览引擎；不上传私人资产、不执行用户代码。";
export const tool07Steps = [
  {
    short: "资产与环境",
    title: "先核对拿到了什么资产，再选运行方式",
    time: "4分钟",
    desc: "把已有格式、所需输入和目标平台放在一起比较。沿用第28课的素材经验，这次为集成决策写条件，而不是按品牌打分。",
  },
  {
    short: "输入合同",
    title: "播放完成，不等于业务成功",
    time: "5分钟",
    desc: "真实Lottie可播放、暂停、反向和静态采样；应用显式业务映射，观察输入如何影响同一预览。Rive和dotLottie候选需要资产实际暴露相应接口。",
  },
  {
    short: "加载与释放",
    title: "资源就绪、业务状态和实例生命周期分别管理",
    time: "5分钟",
    desc: "真实同源资源先准备，再手动应用以模拟延迟。失败重试、取消后旧结果和释放都可反复实验，不代表真实服务器业务。",
  },
  {
    short: "判断理由",
    title: "按资产与约束选择，不背库名",
    time: "3分钟",
    desc: "三题均可重试。区分格式、runtime能力、数据绑定和业务判断。",
  },
  {
    short: "Agent简报",
    title: "把资产、输入和部署环境交接清楚",
    time: "4分钟",
    desc: "本地规则生成草稿，可编辑复制。说明真实机制与候选、加载和静态替代、清理与可验证验收，不自动发送或部署。",
  },
];
export const assets = [
  ["json", "已有Lottie JSON"],
  ["riv", "已有Rive .riv"],
  ["dot", "已有dotLottie .lottie"],
];
export const tool07Questions = [
  {
    q: "设计师交付了.lottie并包含状态机，应该怎样决定集成？",
    options: [
      "Lottie只能播放，必须全部重做成Rive",
      "核对状态机定义、输入与所选dotLottie runtime/版本支持；不是交给任意lottie-web就能运行",
    ],
    correct: 1,
    why: "dotLottie支持状态机和交互，但容器、资产定义、平台和runtime版本必须匹配。本例lottie-web只运行原创JSON，没有运行dotLottie状态机。",
  },
  {
    q: "真实动画触发complete，是否可以把订单直接标记为成功？",
    options: [
      "不能；业务结果决定映射，动画完成只说明播放结束",
      "可以，动画引擎已经理解业务",
    ],
    correct: 0,
    why: "本地样例也明确由应用映射业务→帧/输入，动画结束不会改业务。失败要有文字恢复，不靠庆祝图形判断保存结果。",
  },
  {
    q: "已有.riv使用旧Inputs，新需求要数据绑定，应该怎么交接？",
    options: [
      "不看资产，安装任何runtime会自动升级全部绑定",
      "核对资产的View Model/属性或旧状态机Inputs、运行时与平台；约定迁移、类型和生命周期",
    ],
    correct: 1,
    why: "Rive官方将旧Inputs标为deprecated，新工作推荐Data Binding。绑定需要资产导出相应View Model及实例并核对所选runtime支持；不是给React变量起同名就自动生效。",
  },
];
export const tool07Sources = [
  [
    "lottie-web · 官方API/renderer/生命周期",
    "https://github.com/airbnb/lottie-web",
  ],
  [
    "dotLottie · 当前Web API与状态机",
    "https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/api/reference",
  ],
  [
    "Rive · Web Data Binding",
    "https://rive.app/docs/runtimes/web/data-binding",
  ],
  ["Rive · 旧Inputs弃用说明", "https://rive.app/docs/runtimes/web/inputs"],
  ["Rive · Web运行时与资源", "https://rive.app/docs/runtimes/web/web-js"],
];
export function recommendation(d) {
  const format =
    d.asset === "json"
      ? "已有JSON可先验证lottie-web；它不是dotLottie状态机播放器。"
      : d.asset === "riv"
        ? "已有.riv可评估Rive runtime；先确认artboard、状态机与View Model导出，不能直接交给Lottie播放器。"
        : "已有.lottie可评估dotLottie runtime；先确认内含动画/状态机及平台版本，不能把容器当普通JSON。";
  const input =
    d.need === "data"
      ? "需要持续业务数据：列明属性名/类型/范围、更新方向和事件去重。Rive优先评估Data Binding；dotLottie可评估资产状态机；普通JSON也可由应用显式映射帧/片段，但不冒称资产内置状态机。"
      : "只需播放控制：已有资产的播放/暂停/重播接口可能已足够，不必为名字重做成状态机。";
  const env =
    d.environment === "native"
      ? "目标改为原生App：本页Web预览不能证明原生可用；核对对应平台SDK、特性矩阵和资产效果。"
      : "目标Web：核对SVG/Canvas/WASM等实际renderer、CSP、同源资源、浏览器及依赖加载，不能把一份预览当全平台保证。";
  return `${format} ${input} ${env} ${d.budget === "many" ? "多实例优先按需加载、可见时播放、离屏暂停并实测；本例单实例不是性能跑分。" : "单实例也设尺寸/资源预算，默认暂停、失败保留文字，减少动态可静态采样。"} 这是本地条件说明，不是AI评分或唯一正确方案。`;
}
export const businessFrames = { idle: 0, busy: 40, success: 119, failure: 0 };
export const tool07Initial = () => ({
  step: 0,
  done: [],
  asset: "json",
  need: "playback",
  environment: "web",
  budget: "single",
  assetsSeen: ["json"],
  needsSeen: ["playback"],
  environmentsSeen: ["web"],
  comparedSeen: false,
  loadedSeen: false,
  fallbackAcknowledged: false,
  playedSeen: false,
  pausedSeen: false,
  reversedSeen: false,
  sampledSeen: false,
  mappedSeen: false,
  failureSeen: false,
  retrySeen: false,
  canceledSeen: false,
  staleSeen: false,
  cleanupSeen: false,
  business: "idle",
  frame: 0,
  speed: "1",
  loop: false,
  mode: "normal",
  outcome: "success",
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function readTool07Progress() {
  const d = tool07Initial();
  try {
    const x = JSON.parse(localStorage.getItem(TOOL07_STORAGE));
    if (!x || typeof x !== "object") return d;
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof x[k] === "boolean") d[k] = x[k];
    for (const [k, vs] of Object.entries({
      asset: assets.map((x) => x[0]),
      need: ["playback", "data"],
      environment: ["web", "native"],
      budget: ["single", "many"],
      business: Object.keys(businessFrames),
      speed: ["0.5", "1", "2"],
      mode: ["normal", "static"],
      outcome: ["success", "failure"],
    }))
      if (vs.includes(x[k])) d[k] = x[k];
    d.step = [0, 1, 2, 3, 4].includes(x.step) ? x.step : 0;
    d.done = Array.isArray(x.done)
      ? [
          ...new Set(
            x.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
          ),
        ]
      : [];
    for (const [k, vs] of Object.entries({
      assetsSeen: assets.map((x) => x[0]),
      needsSeen: ["playback", "data"],
      environmentsSeen: ["web", "native"],
    }))
      if (Array.isArray(x[k]))
        d[k] = [...new Set(x[k].filter((v) => vs.includes(v)))];
    if (Number.isFinite(x.frame))
      d.frame = Math.max(0, Math.min(119, Math.round(x.frame)));
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
export function tool07Brief(d) {
  return `动画资产集成草稿\n项目现状（用户核对）：${d.context || "【待确认资产来源、版本、输入和部署】"}\n候选条件：${recommendation(d)}\n演示边界：${tool07Scope}\n交接清单：合法来源/修改权限、资源格式与版本、动画/片段标识、外部图片字体、所选runtime及锁定版本。已有组件与CSS简单反馈保留；不为安装更多库加分。\n输入合同：播放/暂停/反向/重播、速度与循环是播放器控制；业务${d.business}由应用显式映射，本例idle→0帧、busy→40帧、success→119帧、failure→0帧并显示失败文字。播放complete不改业务成功。持续属性定义名称/类型/范围，事件定义触发和去重，旧事件不得覆盖新业务。Rive新工作核对View Model/Data Binding导出和runtime支持，旧Inputs须列迁移边界；dotLottie状态机需相应资产与runtime，不能用普通JSON播放器冒称运行。\n加载策略：按需加载，本例默认暂停，loop=${d.loop}、速度${d.speed}倍；生产环境按实际字节/尺寸/实例数预算测量而非凭空跑分。资源与业务状态分离，失败保留文字、明确重试；模块无法恢复时重载页面再准备，取消/重置/离站隔离旧代次结果和回调。\n减少动态和隐藏：暂停当前播放，保留真实静态帧采样/文字替代；恢复不自动补播。卸载removeEventListener与destroy，释放SVG和循环，不影响其他实例。资源成功/失败保持操作控件与其焦点，不抢用户已移到外部的新焦点。静态示意和Rive契约模拟不冒称runtime。\n验收：核对实际资源和renderer，真实中间帧、暂停稳定、反向/重播、业务快速变化、错误/取消/重试与晚到结果，离站无残留实例和持续帧；375px/短视口、可见焦点和触屏不依赖hover，reduce仍可完成。Web结果不等于原生App或真实设备性能验证。\n本地规则草稿可编辑复制，未发送、执行或部署；进度仅当前浏览器不跨设备。T07为工具专题，T09–T12仍为4个预告。`;
}
