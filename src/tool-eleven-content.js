export const TOOL11_STORAGE = "frontend-observatory.tool11.v1";
export const tool11Scope =
  "真实XState核心5.33.3 machine/actor，React原生订阅；未使用@xstate/react或Rive。接口是本地手动Promise模拟，无真实预约、网络服务或动画引擎。学习/草稿仅本浏览器保存，actor和副作用记录离站清空。";
export const tool11Steps = [
  {
    short: "选型",
    time: "4分钟",
    title: "复杂的是转换约束，不只是状态数量",
    desc: "明确React状态或普通转换表已经足够的情况，再比较XState提供的可执行模型、actor和生命周期；不为一张图迁移全部应用。",
  },
  {
    short: "执行",
    time: "6分钟",
    title: "让真实actor执行申请合同",
    desc: "尝试守卫失败与非法事件，再填写标题、确认、提交、返回结果和完成。图、表、快照和日志来自同一台可执行machine。",
  },
  {
    short: "生命周期",
    time: "6分钟",
    title: "副作用失败、取消与停止不是一回事",
    desc: "真实invoke管理Promise actor。比较接口配合/忽略取消，观察旧结果、失败重试、root actor stop与订阅释放。",
  },
  {
    short: "判断",
    time: "3分钟",
    title: "工具和图不能替代业务验证",
    desc: "解释型判断可重试，不靠记库名或状态个数得分。",
  },
  {
    short: "交接",
    time: "4分钟",
    title: "交接状态、事件与副作用所有权",
    desc: "本地生成可编辑草稿，写清允许/禁止转换、guard/context、输入输出、取消、停止与验收；不会发送给外部Agent。",
  },
];
export function recommendation(d) {
  return d.scenario === "workflow"
    ? "当转换约束、重复事件、异步作用域、取消与协作沟通开始难维护时，可评估XState；先验证业务合同和现有框架适配，不靠状态个数划线。普通转换表也可能足够。"
    : "简单开关或少量明确状态，用React state/reducer或普通转换表即可；不要因状态数量超过某个值就强制XState，也不必为一张图引库。";
}
export const tool11Questions = [
  {
    q: "何时值得评估XState？",
    options: [
      "看转换约束、异步作用域、可测试性和团队协作成本；简单流程仍可用React或普通转换表",
      "只要超过5个状态就必须用，画出图就等于业务正确",
    ],
    correct: 0,
    why: "状态数量没有通用分界。XState让模型可执行、调度actor，但不自动验证需求、权限或所有业务异常；本课还要检查真实快照、事件和副作用。",
  },
  {
    q: "取消处理中流程，是否能保证真实服务器也撤销？",
    options: [
      "肯定能，actor停止等于服务端回滚",
      "不能；退出pending会停invoke，接口是否配合AbortSignal另定。停止的Promise actor忽略迟到输出，真实已提交业务另需补偿/幂等",
    ],
    correct: 1,
    why: "本例既能让接口配合取消，也能故意让本地Promise继续结算，观察actor隔离旧输出。网络取消不是业务回滚承诺。",
  },
  {
    q: "XState与Rive视觉状态机是什么关系？",
    options: [
      "XState管理业务事件与副作用，Rive偏动画资产内部状态；可按需求组合，XState不是动画库",
      "两个名字不同但层级完全相同，装任意一个就自动实现接口与视觉",
    ],
    correct: 0,
    why: "业务流程与视觉状态是不同职责。Context通过assign更新，guard保持纯同步判断，异步交给invoke等机制；父machine和Promise actor的能力也不同。",
  },
];
export const tool11Sources = [
  ["Stately · machine与setup", "https://stately.ai/docs/machines"],
  ["Stately · guards", "https://stately.ai/docs/guards"],
  ["Stately · context与assign", "https://stately.ai/docs/context"],
  ["Stately · invoke生命周期", "https://stately.ai/docs/invoke"],
  ["Stately · Promise actor与signal", "https://stately.ai/docs/promise-actors"],
  ["Stately · actor start/stop/订阅", "https://stately.ai/docs/actors"],
];
export const tool11Initial = () => ({
  step: 0,
  done: [],
  scenario: "simple",
  scenariosSeen: ["simple"],
  uiSeen: false,
  comparedSeen: false,
  minLength: 2,
  cancelMode: "cooperate",
  guardSeen: false,
  illegalSeen: false,
  contextSeen: false,
  completedSeen: false,
  inspectedSeen: false,
  failureSeen: false,
  retrySeen: false,
  canceledSeen: false,
  lateSeen: false,
  ignoreSeen: false,
  stoppedSeen: false,
  cleanupSeen: false,
  answers: [null, null, null],
  context: "",
  draft: "",
  generated: false,
  reviewed: false,
  draftStale: false,
});
export function readTool11Progress() {
  const d = tool11Initial();
  try {
    const x = JSON.parse(localStorage.getItem(TOOL11_STORAGE));
    if (!x || typeof x !== "object") return d;
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof x[k] === "boolean") d[k] = x[k];
    for (const [k, vs] of Object.entries({
      scenario: ["simple", "workflow"],
      cancelMode: ["cooperate", "ignore"],
      minLength: [2, 6],
    }))
      if (vs.includes(x[k])) d[k] = x[k];
    if (Array.isArray(x.scenariosSeen))
      d.scenariosSeen = [
        ...new Set(
          x.scenariosSeen.filter((v) => ["simple", "workflow"].includes(v)),
        ),
      ];
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
export function tool11Brief(d) {
  return `可执行状态流程工具草稿\n项目现状（人工核对）：${d.context || "【待确认现有状态逻辑、接口与业务异常】"}\n选型：${recommendation(d)}\n实际机制：${tool11Scope} 官方文档当前也有v6 alpha，本例固定稳定v5.33.3，未声称接入Stately Studio或编辑器。\n状态：draft/pending/failure/reserved/completed互斥；completed为top-level final，actor.status为done，不能继续处理事件，需重建新actor。关注标记是独立context字段，不扩成成倍业务状态。React订阅使用useSyncExternalStore，不冒称@xstate/react。\n事件与guard：draft允许SET_TITLE/TOGGLE_CONFIRM；SUBMIT及failure.RETRY要求标题trim后至少${d.minLength}字且确认。guard纯同步读取context，assign更新数据，不在guard发请求。pending只允许CANCEL和独立标记；重复SUBMIT/非法完成无允许转换，实际actor忽略并记录。failure可EDIT或RETRY；reserved可FINISH，不能把图当需求或安全证明。\n副作用：真实invoke/fromPromise，输入捕获标题与试次；onDone校验返回试次才进reserved，错误试次或reject进failure。Promise actor不接收普通事件；手动投递只是本地接口结算，不是伪造完成事件。图与事件表从实际machine配置投影；快照/日志/请求记录一致，snapshot.can是判断候选，还需检查actor active，不能拿can当授权。\n取消合同：模式=${d.cancelMode}。退出pending停止invoked actor；配合模式消费AbortSignal拒绝Promise，忽略模式故意让本地Promise继续，证明旧输出仍被停止的actor隔离。真实网络/服务器是否停止或回滚另定，不承诺撤销已提交预约。保留旧试次与新试次隔离、重复结算不重复应用。\n生命周期：actor.start后运行，订阅unsubscribe、actor.stop和会话销毁都有明确所有者。停止root不代表业务完成；保留停止前快照并标stopped。规则/接口取消模式变化明确停止旧actor并重建，不让旧回调复活新实例。离站强制结算/拒绝本地残留模拟工作、清订阅，无延迟定时或轮询；本例最多8个未结算副作用、24条接口记录/40条事件历史，不宣称大规模或硬件性能。\n交互与验收：标题示例可填入也能编辑；事件按钮、结果投递、重试/取消/重建都可键盘与触屏，无拖图/hover/动画门槛。actor完成或停止后不禁用当前持焦按钮，不抢外部焦点。验证真实machine snapshot、can与状态、guard失败/非法/重复、请求次数、取消与不配合接口迟到、失败/试次错误/重试、final/stop、订阅清理及离站回调。桌面/375px/短视口与normal/reduce检查，报告模拟设备和夹具限制。\n本地规则生成，可编辑复制，未发送执行或部署。学习与草稿仅当前浏览器，actor/接口状态不持久化、不跨设备。本节是T11工具专题，原46项入口已制作。`;
}
