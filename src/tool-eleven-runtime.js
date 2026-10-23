import { assign, createActor, fromPromise, setup } from "xstate";
let sessions = 0,
  actors = 0,
  subscriptions = 0,
  uiSubscribers = 0,
  pendingEffects = 0,
  created = 0;
export const runtimeState = () => ({
  sessions,
  actors,
  subscriptions,
  uiSubscribers,
  pendingEffects,
  created,
});
export const stateLabels = {
  draft: "填写申请",
  pending: "处理中",
  failure: "失败可重试",
  reserved: "预约已返回",
  completed: "流程完成",
};
export const publicEvents = [
  "SUBMIT",
  "CANCEL",
  "RETRY",
  "EDIT",
  "FINISH",
  "TOGGLE_MARK",
  "FAKE_COMPLETE",
];
export const requestAllowed = (c) =>
  c.title.trim().length >= c.minLength && c.confirmed;
export function createFlowSession(options = {}) {
  const minLength = [2, 6].includes(options.minLength) ? options.minLength : 2,
    cancelMode = options.cancelMode === "ignore" ? "ignore" : "cooperate";
  let alive = true,
    started = false,
    revision = 0,
    serial = 0,
    actor,
    subscription = null,
    actorCounted = false,
    subCounted = false,
    internal = null;
  const listeners = new Set(),
    records = [],
    events = [];
  const emit = () => {
    if (alive) {
      revision++;
      for (const f of listeners) f();
    }
  };
  const pushEvent = (row) => {
    events.push({ id: events.length ? events.at(-1).id + 1 : 1, ...row });
    if (events.length > 40) events.shift();
  };
  const releaseSubCount = () => {
    if (subCounted) {
      subscriptions--;
      subCounted = false;
    }
  };
  const releaseActorCount = () => {
    if (actorCounted) {
      actors--;
      actorCounted = false;
    }
  };
  function request(input, signal, owner) {
    if (!alive) return Promise.reject(Error("会话已销毁"));
    const row = {
      id: ++serial,
      attempt: input.attempt,
      title: input.title,
      status: "pending",
      deliveries: 0,
      owner,
      signal,
      abort: null,
      resolve: null,
      reject: null,
    };
    records.push(row);
    while (records.length > 24) {
      const index = records.findIndex(
        (r) => !["pending", "detached"].includes(r.status),
      );
      if (index < 0) break;
      records.splice(index, 1);
    }
    if (
      records.filter((r) => ["pending", "detached"].includes(r.status)).length >
      8
    ) {
      row.status = "error";
      row.error = "最多8个未结算副作用，请先投递旧结果";
      emit();
      return Promise.reject(Error(row.error));
    }
    pendingEffects++;
    return new Promise((resolve, reject) => {
      row.resolve = resolve;
      row.reject = reject;
      row.abort = () => {
        if (row.status !== "pending") return;
        signal.removeEventListener("abort", row.abort);
        row.aborted = true;
        if (cancelMode === "ignore") {
          row.status = "detached";
          row.note = "模拟接口忽略取消，已脱离actor但仍待结算";
        } else {
          row.status = "canceled";
          pendingEffects--;
          reject(new DOMException("本地接口配合取消", "AbortError"));
        }
        emit();
      };
      signal.addEventListener("abort", row.abort, { once: true });
      if (signal.aborted) row.abort();
      else emit();
    });
  }
  const machine = setup({
    actors: {
      reserve: fromPromise(({ input, signal, self }) =>
        request(input, signal, self),
      ),
    },
    guards: {
      validRequest: ({ context }) => requestAllowed(context),
      currentAttempt: ({ context, event }) =>
        event.output?.attempt === context.attempt,
    },
    actions: {
      setTitle: assign({
        title: ({ event }) => String(event.value ?? "").slice(0, 80),
      }),
      toggleConfirm: assign({ confirmed: ({ context }) => !context.confirmed }),
      toggleMark: assign({ marked: ({ context }) => !context.marked }),
      begin: assign({
        attempt: ({ context }) => context.attempt + 1,
        sentTitle: ({ context }) => context.title.trim(),
        result: null,
        error: null,
      }),
      saveResult: assign({
        result: ({ event }) => ({ ...event.output }),
        error: null,
      }),
      saveError: assign({
        error: ({ event }) => String(event.error?.message ?? "本地接口失败"),
        result: null,
      }),
      rejectResult: assign({
        error: "结果试次不匹配，已拒绝；可重试。",
        result: null,
      }),
      clearError: assign({ error: null, result: null }),
    },
  }).createMachine({
    id: "booking",
    initial: "draft",
    context: () => ({
      title: "",
      confirmed: false,
      marked: false,
      minLength,
      cancelMode,
      attempt: 0,
      sentTitle: "",
      result: null,
      error: null,
    }),
    on: { TOGGLE_MARK: { actions: "toggleMark" } },
    states: {
      draft: {
        on: {
          SET_TITLE: { actions: "setTitle" },
          TOGGLE_CONFIRM: { actions: "toggleConfirm" },
          SUBMIT: {
            guard: "validRequest",
            target: "pending",
            actions: "begin",
          },
        },
      },
      pending: {
        invoke: {
          id: "reservation",
          src: "reserve",
          input: ({ context }) => ({
            attempt: context.attempt,
            title: context.sentTitle,
          }),
          onDone: [
            {
              guard: "currentAttempt",
              target: "reserved",
              actions: "saveResult",
            },
            { target: "failure", actions: "rejectResult" },
          ],
          onError: { target: "failure", actions: "saveError" },
        },
        on: { CANCEL: { target: "draft", actions: "clearError" } },
      },
      failure: {
        on: {
          RETRY: { guard: "validRequest", target: "pending", actions: "begin" },
          EDIT: { target: "draft", actions: "clearError" },
        },
      },
      reserved: { on: { FINISH: { target: "completed" } } },
      completed: { type: "final" },
    },
  });
  actor = createActor(machine, {
    id: "booking",
    inspect: (e) => {
      if (
        !alive ||
        e.type !== "@xstate.event" ||
        e.actorRef.id !== "booking" ||
        !/^xstate\.(done|error)\.actor\./.test(e.event.type)
      )
        return;
      internal = {
        type: e.event.type,
        attempt: e.event.output?.attempt ?? null,
        before: actor.getSnapshot().value,
      };
    },
  });
  function viewSnapshot() {
    const s = actor.getSnapshot();
    return {
      value: s.value,
      status: s.status,
      context: structuredClone(s.context),
      children: Object.fromEntries(
        Object.entries(s.children).map(([key, child]) => [
          key,
          { id: child.id, status: child.getSnapshot().status },
        ]),
      ),
      rawCan: Object.fromEntries(
        publicEvents.map((type) => [type, s.can({ type })]),
      ),
      can: Object.fromEntries(
        publicEvents.map((type) => [
          type,
          started && s.status === "active" && s.can({ type }),
        ]),
      ),
      canEdit:
        started &&
        s.status === "active" &&
        s.can({ type: "SET_TITLE", value: s.context.title }),
    };
  }
  const recordView = () =>
    records.map(({ resolve, reject, owner, signal, abort, ...r }) => ({
      ...r,
      childStatus: owner.getSnapshot().status,
    }));
  const transitions = () =>
    Object.entries(machine.config.states).flatMap(([from, config]) => [
      ...Object.entries(config.on ?? {}).map(([event, t]) => ({
        from,
        event,
        target: t.target ?? from,
        guard: t.guard ?? null,
        source: "公开事件",
      })),
      ...(config.invoke
        ? [
            ...config.invoke.onDone.map((t, i) => ({
              from,
              event:
                i === 0 ? "Promise完成·试次匹配" : "Promise完成·试次不匹配",
              target: t.target,
              guard: t.guard ?? "前一guard未通过",
              source: "真实invoke输出",
            })),
            {
              from,
              event: "Promise失败",
              target: config.invoke.onError.target,
              guard: null,
              source: "真实invoke错误",
            },
          ]
        : []),
    ]);
  const api = {
    snapshot: () => ({
      records: recordView(),
      calls: serial,
      pending: records.filter((r) => ["pending", "detached"].includes(r.status))
        .length,
    }),
    deliver(id, outcome = "success") {
      if (!alive) return { ignored: true, message: "会话已销毁，未投递。" };
      const r = records.find((r) => r.id === id);
      if (!r) return { ignored: true, message: "没有该本地结果。" };
      r.deliveries++;
      if (!["pending", "detached", "canceled"].includes(r.status)) {
        emit();
        return { ignored: true, message: `#${id}已结算，重复投递不再应用。` };
      }
      const was = r.status,
        output = {
          attempt: r.attempt + (outcome === "mismatch" ? 1000 : 0),
          title: r.title,
          receipt: `DEMO-${r.attempt}`,
        };
      r.signal.removeEventListener("abort", r.abort);
      if (was !== "canceled") {
        pendingEffects--;
        r.status =
          was === "detached"
            ? "late"
            : outcome === "error"
              ? "error"
              : "success";
      } else r.lateDelivered = true;
      r.wasDetached = was === "detached";
      r.output = output;
      r.outcome = outcome;
      if (outcome === "error") r.reject(Error("本地模拟接口失败"));
      else r.resolve(output);
      emit();
      return {
        late: was !== "pending",
        message:
          was !== "pending"
            ? `#${id}旧结果已投递；检查实际actor快照与日志，旧invoke不能复活。`
            : `#${id}已结算本地Promise（${outcome}）；由真实invoke输出驱动机器。`,
      };
    },
  };
  const session = {
    actor,
    machine,
    api,
    get alive() {
      return alive;
    },
    get started() {
      return started;
    },
    getRevision: () => revision,
    runtimeState,
    subscribe(f) {
      if (!alive) return () => {};
      listeners.add(f);
      uiSubscribers++;
      return () => {
        if (listeners.delete(f)) uiSubscribers--;
      };
    },
    start() {
      if (!alive || started) return;
      started = true;
      sessions++;
      created++;
      actors++;
      actorCounted = true;
      subscriptions++;
      subCounted = true;
      subscription = actor.subscribe({
        next: (s) => {
          if (!alive) return;
          if (internal) {
            pushEvent({
              event: internal.type,
              origin: "真实invoke",
              before: internal.before,
              after: s.value,
              attempt: internal.attempt,
              allowed: true,
            });
            internal = null;
          }
          emit();
        },
        complete: () => {
          releaseActorCount();
          releaseSubCount();
          emit();
        },
        error: (error) => {
          releaseActorCount();
          releaseSubCount();
          pushEvent({
            event: "actor.error",
            origin: "runtime",
            message: String(error.message),
            allowed: false,
          });
          emit();
        },
      });
      actor.start();
    },
    inspect: () => ({
      alive,
      started,
      snapshot: viewSnapshot(),
      events: events.map((e) => ({ ...e })),
      service: api.snapshot(),
      transitions: transitions(),
      states: Object.keys(machine.config.states),
      rootContextEvents: Object.keys(machine.config.on),
      runtime: runtimeState(),
    }),
    send(event) {
      if (!alive)
        return { allowed: false, message: "旧会话已销毁，未发送事件。" };
      const before = actor.getSnapshot();
      if (!started || before.status !== "active") {
        pushEvent({
          event: event.type,
          origin: "本地入口守卫",
          before: before.value,
          after: before.value,
          allowed: false,
          reason: "actor非active，未发送",
        });
        emit();
        return {
          allowed: false,
          message: "actor未活动；完成/停止后需重建，不会假装提交。",
        };
      }
      const allowed = before.can(event),
        handler =
          machine.config.states[before.value]?.on?.[event.type] ??
          machine.config.on?.[event.type],
        reason = !allowed
          ? handler?.guard
            ? `guard未满足：标题至少${minLength}字且业务确认已开启。`
            : `${before.value}不接收${event.type}，无允许转换。`
          : "snapshot.can通过";
      actor.send(event);
      const after = actor.getSnapshot();
      pushEvent({
        event: event.type,
        origin: "实际actor.send",
        before: before.value,
        after: after.value,
        allowed,
        reason,
        contextChanged: before.context !== after.context,
        attempt: after.context.attempt,
      });
      emit();
      return {
        allowed,
        guardBlocked: !allowed && !!handler?.guard,
        before: before.value,
        after: after.value,
        message: allowed
          ? `已发送${event.type}：${before.value} → ${after.value}`
          : reason,
      };
    },
    stop() {
      if (!alive) return;
      subscription?.unsubscribe();
      releaseSubCount();
      actor.stop();
      releaseActorCount();
      pushEvent({
        event: "actor.stop()",
        origin: "真实runtime",
        after: actor.getSnapshot().value,
        status: actor.getSnapshot().status,
      });
      emit();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      if (started) sessions--;
      subscription?.unsubscribe();
      releaseSubCount();
      actor.stop();
      releaseActorCount();
      for (const r of records)
        if (["pending", "detached"].includes(r.status)) {
          pendingEffects--;
          r.status = "disposed";
          r.signal.removeEventListener("abort", r.abort);
          r.reject(Error("本地会话释放"));
        }
      uiSubscribers -= listeners.size;
      listeners.clear();
    },
  };
  return session;
}
