export const TOOL10_STORAGE = "frontend-observatory.tool10.v1";
export const tool10Scope =
  "真实TanStack Query React 5.104.5；接口是本地手动Promise演练，无真实服务、测速或业务保存。Query缓存仅本次演练会话，不是数据库、永久存储或本地UI状态。";
export const tool10Steps = [
  {
    short: "职责",
    time: "4分钟",
    title: "先区分服务端状态与本地界面状态",
    desc: "来自外部源的数据副本需要取数、缓存、刷新；展开面板和选中按钮通常只是本地UI状态。简单一次性页面未必需要库。",
  },
  {
    short: "缓存",
    time: "6分钟",
    title: "看真实缓存命中与过期后台刷新",
    desc: "开启读取、手动投递首次结果；关闭再打开看缓存，换分组看query key。stale表示允许重新验证，不等于旧数据不可读。",
  },
  {
    short: "一致",
    time: "6分钟",
    title: "让失败、并发、取消和更新保持一致",
    desc: "旧数据可与刷新失败并存。用真实useMutation修改本地源，再定向失效重读；取消只约束尚未完成的本地尝试，不承诺撤销真实服务器写入。",
  },
  {
    short: "判断",
    time: "3分钟",
    title: "缓存工具不会理解全部业务",
    desc: "通过可重试判断，区分新鲜度、持久化、键与更新策略。",
  },
  {
    short: "交接",
    time: "4分钟",
    title: "写清数据合同和失效范围",
    desc: "用需求与质量约束选择是否引入工具；本地生成可编辑草稿，不发送给外部Agent。",
  },
];
export function recommendation(d) {
  return d.scenario === "shared"
    ? "多个视图复用相同外部数据，需要缓存、后台刷新、取消与更新后失效时，可评估现有框架数据方案或TanStack Query；先约定key与生命周期，不为库名迁移全部项目。"
    : "一次性、无需共享/缓存的简单读取，可用现有框架loader或普通请求加清理；不要为展开按钮、表单草稿等本地UI状态强制引入Query。";
}
export const tool10Questions = [
  {
    q: "缓存数据已stale，页面应该立即清空吗？",
    options: [
      "不必；可继续展示旧数据并标注后台刷新或刷新失败，按业务要求决定是否可继续使用",
      "stale说明数据必定错误，必须删掉全部内容",
    ],
    correct: 0,
    why: "stale是重新验证策略，不是数据有效性证明。本例后台刷新失败时，真实Query仍保留旧data并有error状态；高风险业务需另定使用规则。",
  },
  {
    q: "A/B组取数参数不同，query key与本地UI状态怎么处理？",
    options: [
      "所有请求共用一个key；展开面板也写入远端缓存",
      "key包含分组等影响数据的参数；展开状态独立。本地Query缓存不是数据库或永久保存",
    ],
    correct: 1,
    why: "key是缓存与共享的身份。不同参数需隔离；此课缓存随演练离站销毁，只有学习记录/草稿写本浏览器存储。",
  },
  {
    q: "写入成功后，Query会自动理解哪些报表需要更新吗？",
    options: [
      "不会；按业务约定定向invalidation或更新缓存，处理失败/取消和并发，不能把取消请求说成撤销已提交服务器写入",
      "会自动理解业务关系，并永久同步到所有设备",
    ],
    correct: 0,
    why: "本例useMutation成功后显式invalidate对应分组，活动查询再读本地源。真实接口要定义幂等/权限/错误；库不会替代数据库或业务规则。",
  },
];
export const tool10Sources = [
  [
    "TanStack Query · 默认值与stale/gc",
    "https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults",
  ],
  [
    "TanStack Query · query key",
    "https://tanstack.com/query/latest/docs/framework/react/guides/query-keys",
  ],
  [
    "TanStack Query · AbortSignal与取消",
    "https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation",
  ],
  [
    "TanStack Query · invalidation",
    "https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation",
  ],
  [
    "TanStack Query · mutation后失效",
    "https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations",
  ],
  [
    "TanStack Query · 重试策略",
    "https://tanstack.com/query/latest/docs/framework/react/guides/query-retries",
  ],
];
export const tool10Initial = () => ({
  step: 0,
  done: [],
  scenario: "simple",
  scenariosSeen: ["simple"],
  uiSeen: false,
  comparedSeen: false,
  group: "A",
  groupsSeen: ["A"],
  policy: "fresh",
  firstSeen: false,
  cacheHitSeen: false,
  backgroundSeen: false,
  inspectedSeen: false,
  refreshErrorSeen: false,
  retrySeen: false,
  canceledSeen: false,
  lateSeen: false,
  mutationSeen: false,
  invalidationSeen: false,
  cleanupSeen: false,
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function readTool10Progress() {
  const d = tool10Initial();
  try {
    const x = JSON.parse(localStorage.getItem(TOOL10_STORAGE));
    if (!x || typeof x !== "object") return d;
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof x[k] === "boolean") d[k] = x[k];
    for (const [k, vs] of Object.entries({
      scenario: ["simple", "shared"],
      group: ["A", "B"],
      policy: ["fresh", "stale"],
    }))
      if (vs.includes(x[k])) d[k] = x[k];
    for (const [k, vs] of Object.entries({
      scenariosSeen: ["simple", "shared"],
      groupsSeen: ["A", "B"],
    }))
      if (Array.isArray(x[k]))
        d[k] = [...new Set(x[k].filter((v) => vs.includes(v)))];
    d.step = [0, 1, 2, 3, 4].includes(x.step) ? x.step : 0;
    d.done = Array.isArray(x.done)
      ? [
          ...new Set(
            x.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
          ),
        ]
      : [];
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
export function tool10Brief(d) {
  return `服务端状态集成草稿\n项目现状（人工核对）：${d.context || "【待确认数据来源、现有框架与共享需求】"}\n选型：${recommendation(d)}\n实际边界：${tool10Scope}\n字段与身份：本地A/B组器材数量及版本；key=['tool10','loans',group]，包含影响数据的参数，UI展开状态独立。本例分组=${d.group}，新鲜策略=${d.policy}；生产列权限/用户范围和所有影响响应的参数，不把不同资源混为一个key。\n读取与新鲜度：首次pending无data显示读取状态；命中新鲜缓存不请求；过期缓存保留旧data并后台刷新。stale不等于不可用，刷新失败保留旧data加error和重试；按业务风险限制旧数据使用。\n演练设置：真实useQuery/QueryClient，staleTime为Infinity或0，不是过了虚构网络秒数；retry=false、焦点/重连自动刷新关闭、gcTime=Infinity，本例手动刷新并在离站clear。它们不是库默认值；官方默认stale0、客户端重试3次、inactive缓存通常5分钟回收。Infinity可被invalidate，不等于static。生产按更新频率、错误类别、成本和目标设备配置。\n并发与取消：不同key响应乱序不能覆盖当前分组；相同key在进行中复用请求，重复操作不叠加。queryFn消费AbortSignal，cancelQueries取消并恢复先前状态；本地旧Promise结果不能复活取消请求。真实请求取消是否停止传输取决于接口实现。\n更新合同：useMutation显式修改捕获分组的本地源，再invalidate该key；活动查询重新取数后才显示新版本。写入成功与视图刷新完成分别反馈；失败/重试与并发不丢其他分组。只演示本地投递前取消，不承诺撤销已提交服务器写入。生产约定幂等、权限、错误与失效范围，也可按需求setQueryData而非全量失效。\n质量：所有投递/取消/重试保留可操作焦点，不抢外部新焦点；键盘与触屏等价，无hover或动画门槛。请求日志、实际QueryCache和屏幕数据逐项一致；示例序号不是真实计时或性能测量。\n清理与验收：测试首次/新鲜命中/过期后台、带旧data的刷新失败、query key隔离、并发/重复/取消后迟到、写入失效刷新、reset/离站与迟到回调。作用域拥有独立QueryClient，本例离站cancelQueries、拒绝本地待处理Promise、清理订阅并clear缓存，禁止持续后台请求或无效回调。375px/桌面/短视口、normal/reduce、实际Tab与触屏验收。\n本地规则生成，可编辑复制，未发送执行/部署；学习和草稿只在当前浏览器，不跨设备。T10为工具专题，T11/T12仍为2个预告。`;
}
