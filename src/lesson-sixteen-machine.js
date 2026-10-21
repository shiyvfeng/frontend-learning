export const stateNames = {
  draft: "草稿",
  review: "待确认",
  running: "执行中",
  error: "失败",
  success: "成功",
  cancelled: "已取消",
};
export const eventNames = {
  REVIEW: "核对任务",
  EDIT: "返回编辑",
  START: "开始执行",
  DONE: "模拟成功",
  FAIL: "模拟失败",
  RETRY: "重试任务",
  CANCEL: "取消任务",
  RESET: "重新准备",
};
export const rules = [
  ["draft", "REVIEW", "review", "title"],
  ["review", "EDIT", "draft", null],
  ["review", "START", "running", "ready"],
  ["review", "CANCEL", "cancelled", null],
  ["running", "DONE", "success", "attempt"],
  ["running", "FAIL", "error", "attempt"],
  ["running", "CANCEL", "cancelled", null],
  ["error", "RETRY", "running", "ready"],
  ["error", "CANCEL", "cancelled", null],
  ["success", "RESET", "draft", null],
  ["cancelled", "RESET", "draft", null],
].map(([from, event, to, guard]) => ({
  key: `${from}-${event}`,
  from,
  event,
  to,
  guard,
}));
export const initialTask = () => ({
  phase: "draft",
  context: {
    title: "",
    consent: false,
    pinned: false,
    details: false,
    expected: "DONE",
  },
  active: 0,
  sequence: 0,
  queue: [],
  lastEdge: null,
  lastStartWasRetry: false,
  cancellations: 0,
  cancelledAttempts: [],
});
export function assess(model, event) {
  const type = event.type;
  if (!Object.hasOwn(stateNames, model.phase))
    return {
      ok: false,
      code: "invalid-state",
      reason: "状态值不在已声明集合中。",
    };
  if (!Object.hasOwn(eventNames, type))
    return { ok: false, code: "unknown-event", reason: "事件未在合同中定义。" };
  if (
    event.source === "queue" &&
    ["DONE", "FAIL"].includes(type) &&
    (model.phase !== "running" ||
      !model.active ||
      event.attempt !== model.active)
  )
    return {
      ok: false,
      code: "stale",
      reason: `旧尝试 #${event.attempt} 已失效；当前${model.active ? `尝试 #${model.active}` : "没有运行尝试"}，结果不能覆盖界面。`,
    };
  const rule = rules.find((r) => r.from === model.phase && r.event === type);
  if (!rule)
    return {
      ok: false,
      code: "state",
      reason: `${stateNames[model.phase]}（${model.phase}）不允许 ${type}；请按当前允许事件继续。`,
    };
  if (["title", "ready"].includes(rule.guard) && !model.context.title.trim())
    return {
      ok: false,
      code: "title",
      rule,
      reason: "标题守卫失败：请填入示例或输入非空任务标题。",
    };
  if (rule.guard === "ready" && !model.context.consent)
    return {
      ok: false,
      code: "consent",
      rule,
      reason: "确认守卫失败：先勾选已核对任务说明。",
    };
  if (rule.guard === "ready" && model.queue.length >= 16)
    return {
      ok: false,
      code: "capacity",
      rule,
      reason: "本地结果队列已满16个；先投递旧结果，再开始或重试。",
    };
  if (
    rule.guard === "attempt" &&
    (!model.active || model.active !== event.attempt)
  )
    return {
      ok: false,
      code: "attempt",
      rule,
      reason: "尝试编号不匹配，拒绝此结果。",
    };
  return {
    ok: true,
    code: "allowed",
    rule,
    reason: `允许 ${rule.from} + ${type} → ${rule.to}。`,
  };
}
export function transition(model, event) {
  const decision = assess(model, event);
  if (!decision.ok) return { model, decision };
  const next = {
    ...model,
    phase: decision.rule.to,
    lastEdge: decision.rule.key,
  };
  if (["START", "RETRY"].includes(event.type)) {
    next.sequence = model.sequence + 1;
    next.active = next.sequence;
    next.lastStartWasRetry = event.type === "RETRY";
    next.queue = [
      ...model.queue,
      { attempt: next.active, type: model.context.expected },
    ];
  }
  if (["DONE", "FAIL", "CANCEL", "RESET"].includes(event.type)) next.active = 0;
  if (
    event.type === "CANCEL" &&
    model.phase === "running" &&
    model.active > 0
  ) {
    next.cancellations = model.cancellations + 1;
    next.cancelledAttempts = [
      ...new Set([...model.cancelledAttempts, model.active]),
    ].filter((id) => model.queue.some((q) => q.attempt === id));
  }
  if (event.type === "RESET") {
    next.context = { ...model.context, consent: false };
    next.lastStartWasRetry = false;
  }
  return { model: next, decision };
}
