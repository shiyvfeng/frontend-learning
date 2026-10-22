const owned = new Set();
let created = 0,
  destroyed = 0;
export const runtimeState = () => ({ owned: owned.size, created, destroyed });
export async function prepareAsset(signal) {
  const [m, r] = await Promise.all([
    import("lottie-web/build/player/lottie_light"),
    fetch("/lesson28-timeline.json", { signal }),
  ]);
  if (!r.ok) throw Error(`同源JSON HTTP ${r.status}`);
  const json = await r.json();
  if (
    json.w !== 240 ||
    json.h !== 160 ||
    json.op !== 120 ||
    json.fr !== 30 ||
    json.assets?.length !== 0 ||
    !Array.isArray(json.layers) ||
    json.layers.length !== 2 ||
    json.layers.some(
      (layer) => !layer || layer.ty !== 4 || !Array.isArray(layer.shapes),
    )
  )
    throw Error("原创资产结构不匹配");
  return { json, library: m.default };
}
export function createPlayer(host, asset, callbacks) {
  let alive = true,
    started = false,
    item;
  const guard =
    (f) =>
    (...args) => {
      if (alive) f(...args);
    };
  const loaded = guard(() => {
    if (started) return;
    started = true;
    callbacks.ready();
  });
  const events = {
    DOMLoaded: loaded,
    enterFrame: guard(() => callbacks.frame(item.currentFrame)),
    complete: guard(() => callbacks.complete()),
    data_failed: guard(() => callbacks.fail()),
    error: guard(() => callbacks.fail()),
  };
  try {
    item = asset.library.loadAnimation({
      container: host,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: structuredClone(asset.json),
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
        progressiveLoad: false,
      },
    });
    owned.add(item);
    created++;
    for (const [n, f] of Object.entries(events)) item.addEventListener(n, f);
    // DOMLoaded is normally asynchronous. Defer already-loaded notification so
    // the caller receives this controller before ready configures the instance.
    if (item.isLoaded) queueMicrotask(loaded);
  } catch (e) {
    alive = false;
    if (item) {
      item.destroy();
      owned.delete(item);
      destroyed++;
    }
    throw e;
  }
  return {
    seek(n) {
      if (alive) item.goToAndStop(n, true);
    },
    pause() {
      if (alive) item.pause();
    },
    play(direction = 1) {
      if (!alive) return;
      item.setDirection(direction);
      if (direction === 1 && item.currentFrame >= 118)
        item.goToAndStop(0, true);
      if (direction === -1 && item.currentFrame <= 0)
        item.goToAndStop(119, true);
      item.play();
    },
    configure(speed, loop) {
      if (alive) {
        item.setSpeed(Number(speed));
        item.loop = loop;
      }
    },
    inspect() {
      return {
        ...runtimeState(),
        version: asset.library.version,
        renderer: "svg",
        currentFrame: item.currentFrame,
        totalFrames: item.totalFrames,
        isPaused: item.isPaused,
        speed: item.playSpeed,
        direction: item.playDirection,
        loop: item.loop,
        svgPresent: !!host.querySelector("svg"),
      };
    },
    destroy() {
      if (!alive) return;
      alive = false;
      for (const [n, f] of Object.entries(events))
        item.removeEventListener(n, f);
      item.destroy();
      owned.delete(item);
      destroyed++;
    },
  };
}
