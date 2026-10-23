import { QueryClient } from "@tanstack/react-query";
let sessions = 0,
  requests = 0,
  created = 0;
export const runtimeState = () => ({ sessions, requests, created });
export const queryKey = (group) => ["tool10", "loans", group];
export function createLocalSession() {
  let alive = true,
    revision = 0,
    serial = 0;
  const listeners = new Set(),
    rows = [],
    source = {
      A: { group: "A", count: 8, version: 1 },
      B: { group: "B", count: 3, version: 1 },
    };
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
      },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  sessions++;
  created++;
  const emit = () => {
    if (alive) {
      revision++;
      for (const f of listeners) f();
    }
  };
  const snapshot = () => ({
    alive,
    revision,
    source: structuredClone(source),
    records: rows.map(({ resolve, reject, signal, abort, ...r }) => ({
      ...r,
      snapshot: { ...r.snapshot },
    })),
    runtime: runtimeState(),
  });
  function request(kind, group, signal) {
    if (!alive) return Promise.reject(Error("本地会话已结束"));
    if (rows.filter((r) => r.status === "pending").length >= 8)
      return Promise.reject(Error("最多8个待处理教学请求"));
    return new Promise((resolve, reject) => {
      const row = {
        id: ++serial,
        kind,
        group,
        key: queryKey(group),
        snapshot: { ...source[group] },
        status: "pending",
        deliveries: 0,
        resolve,
        reject,
        signal,
        abort: null,
      };
      row.abort = () => {
        if (row.status !== "pending") return;
        row.status = "canceled";
        requests--;
        signal?.removeEventListener("abort", row.abort);
        reject(new DOMException("本地请求已取消", "AbortError"));
        emit();
      };
      rows.push(row);
      requests++;
      while (rows.length > 24) {
        const index = rows.findIndex((r) => r.status !== "pending");
        if (index < 0) break;
        rows.splice(index, 1);
      }
      signal?.addEventListener("abort", row.abort, { once: true });
      if (signal?.aborted) row.abort();
      else emit();
    });
  }
  const api = {
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    revision: () => revision,
    snapshot,
    read: (group, signal) => request("read", group, signal),
    write: (group) => request("write", group),
    deliver(id, ok = true) {
      if (!alive) return "会话已结束，未应用结果。";
      const r = rows.find((r) => r.id === id);
      if (!r) return "没有该教学请求。";
      r.deliveries++;
      if (r.status !== "pending") {
        if (r.status === "canceled") {
          r.resolve({ ...r.snapshot });
          r.lateIgnored = true;
          emit();
          return `旧请求${id}已取消；迟到resolve被已拒绝的Promise隔离，不改缓存/本地源。`;
        }
        emit();
        return `请求${id}已结束；重复投递不再应用。`;
      }
      requests--;
      r.signal?.removeEventListener("abort", r.abort);
      if (!ok) {
        r.status = "error";
        r.reject(Error("本地模拟接口失败"));
        emit();
        return `请求${id}模拟失败；不是实际服务器故障。`;
      }
      r.status = "success";
      const result =
        r.kind === "write"
          ? {
              ...source[r.group],
              count: source[r.group].count + 1,
              version: source[r.group].version + 1,
            }
          : { ...r.snapshot };
      if (r.kind === "write") source[r.group] = result;
      r.result = { ...result };
      r.resolve(result);
      emit();
      return `请求${id}本地成功；${r.group}组${result.count}件，版本${result.version}。`;
    },
    cancelWrites() {
      let n = 0;
      for (const r of rows)
        if (r.kind === "write" && r.status === "pending") {
          r.abort();
          n++;
        }
      return n;
    },
  };
  return {
    client,
    api,
    get alive() {
      return alive;
    },
    runtimeState,
    inspect() {
      return {
        ...snapshot(),
        queries: client
          .getQueryCache()
          .getAll()
          .map((q) => ({
            key: q.queryKey,
            observers: q.getObserversCount(),
            active: q.isActive(),
            stale: q.isStale(),
            status: q.state.status,
            fetchStatus: q.state.fetchStatus,
            data: q.state.data ?? null,
            error: q.state.error?.message ?? null,
            invalidated: q.state.isInvalidated,
          })),
        mutations: client
          .getMutationCache()
          .getAll()
          .map((m) => ({
            status: m.state.status,
            variables: m.state.variables,
            error: m.state.error?.message ?? null,
          })),
      };
    },
    destroy() {
      if (!alive) return;
      alive = false;
      sessions--;
      void client.cancelQueries();
      for (const r of rows) if (r.status === "pending") r.abort();
      listeners.clear();
      client.clear();
    },
  };
}
