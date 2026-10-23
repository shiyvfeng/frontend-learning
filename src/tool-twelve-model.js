export const CARD_IDS = ["A", "B", "C", "D", "E", "F"];
export const ROWS = Array.from({ length: 2000 }, (_, i) => ({
  id: `item-${String(i + 1).padStart(4, "0")}`,
  number: i + 1,
  label: `教学对象 ${String(i + 1).padStart(4, "0")} · 排程记录`,
}));
export const ROW_HEIGHT = 72;
export const metrics = {
  sortSessions: 0,
  transactions: 0,
  listeners: 0,
  virtualComponents: 0,
  rectObservers: 0,
  offsetObservers: 0,
};
export const runtimeState = () => ({ ...metrics });
export function moveByID(order, id, target) {
  const a = order.indexOf(id),
    b = order.indexOf(target);
  if (a < 0 || b < 0 || a === b) return [...order];
  const next = [...order];
  next.splice(a, 1);
  next.splice(b, 0, id);
  return next;
}
export const filterRows = (f) =>
  f === "empty" ? [] : f === "odd" ? ROWS.filter((r) => r.number % 2) : ROWS;
export function createSortSession() {
  let alive = true,
    started = false,
    revision = 0,
    serial = 0,
    order = [...CARD_IDS],
    tx = null,
    last = null;
  const events = [],
    undo = [],
    subs = new Set();
  const emit = () => {
    if (alive) {
      revision++;
      for (const f of subs) f();
    }
  };
  const log = (kind, details = {}) => {
    last = { kind, seq: ++serial, ...details };
    events.push(last);
    if (events.length > 24) events.shift();
    emit();
  };
  const current = (token) => alive && !!tx && tx.token === token;
  const end = () => {
    if (tx) {
      metrics.transactions--;
      tx = null;
    }
  };
  const s = {
    get alive() {
      return alive;
    },
    getRevision: () => revision,
    subscribe(f) {
      if (!alive) return () => {};
      subs.add(f);
      return () => subs.delete(f);
    },
    start() {
      if (alive && !started) {
        started = true;
        metrics.sortSessions++;
        emit();
      }
    },
    inspect: () => ({
      alive,
      started,
      order: [...order],
      transaction: tx ? { ...tx, base: [...tx.base] } : null,
      last: last ? { ...last } : null,
      events: events.map((x) => ({ ...x })),
      undoDepth: undo.length,
      runtime: runtimeState(),
    }),
    begin(id, mode = "buttons", pointerId = null) {
      if (!alive || !started || !order.includes(id) || tx) return null;
      tx = {
        token: ++serial,
        id,
        target: id,
        mode,
        pointerId,
        base: [...order],
      };
      metrics.transactions++;
      log("begin", { token: tx.token, id, mode });
      return tx.token;
    },
    preview(target, token) {
      if (!current(token) || !order.includes(target)) return false;
      if (tx.target !== target) {
        tx = { ...tx, target };
        emit();
      }
      return true;
    },
    previewDelta(delta, token) {
      if (!current(token)) return false;
      const at = order.indexOf(tx.target),
        i = Math.max(0, Math.min(order.length - 1, at + delta));
      return s.preview(order[i], token);
    },
    commit(token) {
      if (!current(token)) return false;
      const t = tx,
        next = moveByID(order, t.id, t.target),
        changed = next.some((id, i) => order[i] !== id);
      if (changed) {
        undo.push([...order]);
        if (undo.length > 12) undo.shift();
        order = next;
      }
      end();
      log(changed ? "commit" : "unchanged", {
        id: t.id,
        target: t.target,
        mode: t.mode,
        token,
        order: [...order],
      });
      return changed;
    },
    cancel(reason = "用户取消", token = tx?.token) {
      if (!current(token)) return false;
      const t = tx;
      end();
      log("cancel", {
        token,
        id: t.id,
        mode: t.mode,
        reason,
        order: [...order],
      });
      return true;
    },
    move(id, target) {
      if (!alive || !started) return false;
      s.cancel("替代操作前取消旧事务");
      const token = s.begin(id, "buttons");
      if (!token) return false;
      s.preview(target, token);
      return s.commit(token);
    },
    undo() {
      if (!alive) return;
      s.cancel("撤销前取消事务");
      if (!undo.length) {
        log("no-undo");
        return;
      }
      order = undo.pop();
      log("undo", { order: [...order] });
    },
    reset() {
      if (!alive) return;
      s.cancel("恢复初始顺序");
      order = [...CARD_IDS];
      undo.length = 0;
      log("reset", { order: [...order] });
    },
    destroy() {
      if (!alive) return;
      end();
      alive = false;
      if (started) metrics.sortSessions--;
      subs.clear();
      undo.length = 0;
    },
  };
  return s;
}
