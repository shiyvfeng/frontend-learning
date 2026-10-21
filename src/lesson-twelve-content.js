export const STATE_STORAGE = "frontend-observatory.lesson12.v1";
export const phaseInfo = {
  idle: {
    label: "待机",
    symbol: "○",
    text: "准备好了。点击开始，进入本地模拟。",
  },
  listening: {
    label: "等待输入",
    symbol: "◎",
    text: "演示 listening：等待你提交示例主题，没有采集声音。",
  },
  thinking: {
    label: "处理中",
    symbol: "···",
    text: "演示 thinking：等待手动投递的结果，没有 AI 或网络请求。",
  },
  speaking: {
    label: "展示答复",
    symbol: "≋",
    text: "演示 speaking：用文字展示模拟答复，不播放声音。",
  },
  error: {
    label: "发生错误",
    symbol: "!",
    text: "模拟失败。可以重试这份主题，也可以取消回到待机。",
  },
};
export const topics = {
  route: "整理路线",
  review: "复习清单",
  layout: "对比两种布局",
};
export const actionInfo = {
  start: "开始模拟",
  submit: "提交示例主题",
  success: "模拟成功",
  fail: "模拟失败",
  finish: "结束展示",
  retry: "重试当前主题",
  cancel: "取消当前流程",
};
export const allowedActions = {
  idle: ["start"],
  listening: ["submit", "cancel"],
  thinking: ["success", "fail", "cancel"],
  speaking: ["finish", "cancel"],
  error: ["retry", "cancel"],
};
export const stateSteps = [
  {
    short: "界面与记忆",
    title: "同一个界面，记住当前状态",
    time: "4 分钟",
    desc: "先直接预览五种状态，再更新旁边的计数。观察：其他数据改变，当前状态仍保留；这不是换了五张页面。",
  },
  {
    short: "事件与结果",
    title: "点的是事件，变化的是状态",
    time: "4 分钟",
    desc: "开始、提交、成功、失败、重试或取消，操作与当前状态相配。结果全部由你手动触发，不需要等待定时器。",
  },
  {
    short: "独立与取消",
    title: "开关可以并存，旧结果不能插队",
    time: "4 分钟",
    desc: "把互斥流程与独立偏好分开。手动投递一份已取消的旧结果，再投递当前结果，检查界面是否被污染。",
  },
  {
    short: "做出判断",
    title: "用状态解释 UI，而不是猜动画",
    time: "3 分钟",
    desc: "三个可以重试的判断。分清流程状态、独立开关与取消后迟到的结果。",
  },
  {
    short: "交给 Agent",
    title: "写清事件前后，界面应该怎样变",
    time: "3 分钟",
    desc: "生成并编辑本地助手或任务面板指令，列出状态、允许操作、反馈、取消与重试。",
  },
];
export const stateQuestions = [
  {
    q: "同一个助手流程通常不能同时 listening 和 speaking，怎样表达更清楚？",
    options: [
      "用一个 phase 值表达互斥阶段，再由它决定显示与允许操作",
      "给每个阶段都设独立布尔值，允许它们任意同时为 true",
    ],
    correct: 0,
    why: "本例用 idle / listening / thinking / speaking / error 中的一个 phase 表达当前阶段，避免同一流程同时听和说。界面结果与可用操作从当前阶段得到，不必为每个状态复制整页。其他业务可以有不同规则，先说明实际约束。",
  },
  {
    q: "静音偏好和说明是否展开，可以同时为 true。也必须禁止使用布尔值吗？",
    options: [
      "必须；所有布尔值都是坏设计",
      "不必；这两个开关可并存，分别用布尔值很合理",
    ],
    correct: 1,
    why: "互斥阶段适合一个明确的值；独立的静音与展开信息可以各用布尔值。是否一起更新、会不会矛盾以及能否由已有信息计算，才是组织状态的依据。静音不等于取消，展开也不应改掉当前流程。",
  },
  {
    q: "请求 A 已取消，B 正在处理，A 的成功结果现在才到，该怎么做？",
    options: [
      "只要成功就覆盖当前界面，让 B 看起来也成功",
      "核对结果归属，忽略 A，保留 B 的状态并等待 B 的结果",
    ],
    correct: 1,
    why: "旧事件处理器可能记住旧值；取消后收到的结果不能随便覆盖新流程。本地实验记录每份请求的编号，只有当前编号且仍处于 thinking 的结果才会改变 UI；失败、取消、重试和离开实验都需要清理或失效处理。",
  },
];
export const stateSources = [
  [
    "React：State 是组件的记忆",
    "https://react.dev/learn/state-a-components-memory",
  ],
  [
    "React：用状态响应输入",
    "https://react.dev/learn/reacting-to-input-with-state",
  ],
  [
    "React：组织状态，避免矛盾与冗余",
    "https://react.dev/learn/choosing-the-state-structure",
  ],
  ["React：状态是一份快照", "https://react.dev/learn/state-as-a-snapshot"],
  [
    "WAI：状态消息",
    "https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html",
  ],
];
export const stateInitial = () => ({
  step: 0,
  done: [],
  preview: "idle",
  previewSeen: ["idle"],
  neighbor: 0,
  memoryChecked: false,
  topic: "route",
  muted: false,
  expanded: false,
  muteChanged: false,
  expandChanged: false,
  eventsSeen: [],
  staleIgnored: false,
  freshAfterStale: false,
  answers: [null, null, null],
  brief: "assistant",
  includeEdges: true,
  draft: "",
  generated: false,
  reviewed: false,
});
export function readStateProgress() {
  const b = stateInitial();
  try {
    const x = JSON.parse(localStorage.getItem(STATE_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, values] of Object.entries({
      step: [0, 1, 2, 3, 4],
      preview: Object.keys(phaseInfo),
      neighbor: [0, 1, 2, 3, 4, 5, 6],
      topic: Object.keys(topics),
      brief: ["assistant", "task"],
    }))
      if (values.includes(x[k])) b[k] = x[k];
    for (const [k, values] of Object.entries({
      done: [0, 1, 2, 3, 4],
      previewSeen: Object.keys(phaseInfo),
      eventsSeen: Object.keys(actionInfo),
    }))
      if (Array.isArray(x[k]))
        b[k] = [...new Set(x[k].filter((v) => values.includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean" && typeof x[k] === "boolean") b[k] = x[k];
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = stateQuestions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export const sessionInitial = () => ({
  phase: "idle",
  seq: 0,
  active: null,
  lastTopic: null,
  result: "",
  mailbox: [],
  log: [],
  feedback: "本地演示已就绪。每个事件由你手动触发。",
});
// A bounded, manually delivered mailbox: no timers, microphone, audio or network.
export function applySessionEvent(old, event, topic) {
  let next = { ...old },
    flags = {},
    message = "";
  const record = (text) => {
    next.log = [...old.log, text].slice(-6);
    next.feedback = text;
  };
  if (event === "clear")
    return {
      session: { ...sessionInitial(), seq: old.seq },
      flags,
      message: "模拟会话已清空；学习进度与独立开关保留。",
    };
  if (event === "deliver") {
    const packet = old.mailbox[0];
    if (!packet)
      return {
        session: old,
        flags,
        message: "没有待投递的结果。先提交一份示例主题。",
      };
    next.mailbox = old.mailbox.slice(1);
    if (old.phase !== "thinking" || old.active?.id !== packet.id) {
      record(
        `忽略旧结果 #${packet.id}：已取消或不属于当前请求；当前 ${old.phase} 保留。`,
      );
      return {
        session: next,
        flags: { staleIgnored: true },
        message: next.feedback,
      };
    }
    event = "success";
  }
  if (!allowedActions[old.phase].includes(event))
    return {
      session: old,
      flags,
      message: `当前 ${old.phase} 不能${actionInfo[event] ?? "执行该操作"}；允许：${allowedActions[old.phase].map((e) => actionInfo[e]).join("、")}。`,
    };
  flags.event = event;
  if (event === "start") {
    next.phase = "listening";
    next.result = "";
    record("开始：idle → listening；等待提交示例主题。");
  }
  if (event === "submit" || event === "retry") {
    const selected = event === "retry" ? (old.lastTopic ?? topic) : topic,
      packet = { id: old.seq + 1, topic: selected };
    next = {
      ...next,
      phase: "thinking",
      seq: packet.id,
      active: packet,
      lastTopic: selected,
      result: "",
      mailbox: [...old.mailbox, packet].slice(-4),
    };
    record(
      `${event === "retry" ? "重试" : "提交"} #${packet.id}：记录主题“${topics[selected]}”，进入 thinking。`,
    );
  }
  if (event === "success" || event === "fail") {
    const packet = old.active;
    next.active = null;
    next.mailbox = next.mailbox.filter((p) => p.id !== packet.id);
    next.phase = event === "success" ? "speaking" : "error";
    next.result =
      event === "success"
        ? `示例答复 #${packet.id}：${topics[packet.topic]}，先列约束，再逐项验收。`
        : "模拟出错，尚未生成答复。";
    record(
      `${event === "success" ? "成功" : "失败"} #${packet.id}：thinking → ${next.phase}。`,
    );
    flags.accepted = event === "success";
  }
  if (event === "finish" || event === "cancel") {
    next.phase = "idle";
    next.active = null;
    next.result = "";
    record(
      event === "cancel"
        ? "已取消：回到 idle；旧信封保留供检查，之后不能覆盖新请求。"
        : "结束展示：回到 idle。",
    );
  }
  return { session: next, flags, message: next.feedback };
}
