export const FIXED_STEP = 1 / 240;
export const MAX_FRAME = 0.05;
export const MAX_GAP = 0.2;
export const MAX_RUN = 8;
export const defaultParameters = {
  stiffness: 280,
  damping: 20,
  mass: 1,
  duration: 800,
  easing: "cubic-out",
};
export function initialMotion() {
  return {
    target: 25,
    time: { x: 25, v: 0, startX: 25, done: true },
    spring: { x: 25, v: 0, done: true },
    parameters: { ...defaultParameters },
    startedAt: 0,
    lastAt: 0,
    accumulator: 0,
    running: false,
    reason: "共同起点",
    lastCommand: null,
  };
}
export function settle(model, reason) {
  return {
    ...model,
    time: { ...model.time, x: model.target, v: 0, done: true },
    spring: { x: model.target, v: 0, done: true },
    accumulator: 0,
    running: false,
    reason,
  };
}
export function retarget(
  model,
  target,
  now,
  parameters = defaultParameters,
  instant = false,
) {
  const p = { ...parameters, mass: 1 },
    seconds = p.duration / 1000;
  const next = {
    ...model,
    target,
    parameters: p,
    startedAt: now,
    lastAt: now,
    accumulator: 0,
    running: true,
    reason: "运动中",
    time: {
      x: model.time.x,
      v: ((target - model.time.x) * (p.easing === "linear" ? 1 : 3)) / seconds,
      startX: model.time.x,
      done: false,
    },
    spring: { ...model.spring, done: false },
    lastCommand: {
      kind: instant ? "instant" : model.running ? "interrupted" : "started",
      before: {
        timeX: model.time.x,
        timeV: model.time.v,
        springX: model.spring.x,
        springV: model.spring.v,
      },
      after: {
        timeX: model.time.x,
        springX: model.spring.x,
        springV: model.spring.v,
      },
      target,
    },
  };
  if (instant) {
    const stopped = settle(next, "静态到位");
    stopped.lastCommand = {
      ...stopped.lastCommand,
      after: { timeX: target, springX: target, springV: 0 },
    };
    return stopped;
  }
  if (
    Math.abs(model.time.x - target) < 1e-9 &&
    Math.abs(model.spring.x - target) < 1e-9 &&
    Math.abs(model.spring.v) < 1e-9
  )
    return settle(next, "已在目标，无需运动");
  return next;
}
export function advance(model, now) {
  if (!model.running || now <= model.lastAt) return model;
  const gap = (now - model.lastAt) / 1000;
  if (gap > MAX_GAP)
    return settle(model, "长帧恢复保护：直接到位，未补算后台时间");
  if ((now - model.startedAt) / 1000 >= MAX_RUN)
    return settle(model, "8秒安全终止：直接到位");
  const n = {
    ...model,
    lastAt: now,
    time: { ...model.time },
    spring: { ...model.spring },
  };
  const p = n.parameters,
    t = Math.min(1, (now - n.startedAt) / p.duration),
    e = p.easing === "linear" ? t : 1 - (1 - t) ** 3;
  n.time.x = n.time.startX + (n.target - n.time.startX) * e;
  n.time.v =
    t === 1
      ? 0
      : ((n.target - n.time.startX) *
          (p.easing === "linear" ? 1 : 3 * (1 - t) ** 2)) /
        (p.duration / 1000);
  n.time.done = t === 1;
  n.accumulator += Math.min(gap, MAX_FRAME);
  while (n.accumulator + 1e-12 >= FIXED_STEP) {
    if (!n.spring.done) {
      const a =
        (-p.stiffness * (n.spring.x - n.target) - p.damping * n.spring.v) /
        p.mass;
      n.spring.v += a * FIXED_STEP;
      n.spring.x += n.spring.v * FIXED_STEP;
    }
    n.accumulator = Math.max(0, n.accumulator - FIXED_STEP);
  }
  if (Math.abs(n.spring.x - n.target) < 0.02 && Math.abs(n.spring.v) < 0.05) {
    n.spring = { x: n.target, v: 0, done: true };
  }
  n.running = !(n.time.done && n.spring.done);
  if (!n.running) n.reason = "自然稳定";
  return n;
}
