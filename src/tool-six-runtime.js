import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// T06 is the only GSAP owner in this project. Keep the plugin asleep until a
// live scroll scene owns it; disabling restores global listeners/keep-alive.
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.disable(true, true);
gsap.ticker.sleep();
let pluginEnabled = false;
const disablePlugin = () => {
  if (pluginEnabled) {
    ScrollTrigger.disable(true, true);
    pluginEnabled = false;
  }
  gsap.ticker.sleep();
};
function paint(root, tl) {
  root.dataset.progress = tl.progress().toFixed(5);
  root.dataset.time = tl.time().toFixed(4);
  root.dataset.paused = String(tl.paused());
  root.dataset.reversed = String(tl.reversed());
  const out = root.querySelector("[data-progress-text]");
  if (out) out.textContent = `${Math.round(tl.progress() * 100)}%`;
}
function choreography(root, update) {
  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "none" },
    onUpdate: update,
  });
  gsap.set(root.querySelector("[data-dot]"), { x: 0 });
  gsap.set(root.querySelector("[data-bar]"), {
    scaleX: 0.1,
    transformOrigin: "left center",
  });
  gsap.set(root.querySelector("[data-badge]"), { rotation: 0 });
  tl.addLabel("move", 0)
    .to(
      root.querySelector("[data-dot]"),
      {
        x: () => Math.max(36, Math.min(260, root.clientWidth - 80)),
        duration: 1,
      },
      0,
    )
    .addLabel("draw", 0.8)
    .to(root.querySelector("[data-bar]"), { scaleX: 1, duration: 0.8 }, 0.8)
    .addLabel("turn", 1.6)
    .to(
      root.querySelector("[data-badge]"),
      { rotation: 180, duration: 0.8 },
      1.6,
    );
  return tl;
}
export function createTimeScene(root, notify) {
  let live = true,
    tl;
  const ctx = gsap.context(() => {
    tl = choreography(root, () => {
      if (live) paint(root, tl);
    });
    tl.eventCallback(
      "onComplete",
      () => live && notify("时间线到达终点，控件仍可操作。"),
    );
    tl.eventCallback(
      "onReverseComplete",
      () => live && notify("时间线反向到达起点。"),
    );
  }, root);
  root.dataset.runtime = `gsap${gsap.version}`;
  root.dataset.duration = String(tl.duration());
  paint(root, tl);
  return {
    play() {
      tl.play();
      paint(root, tl);
    },
    pause() {
      tl.pause();
      paint(root, tl);
    },
    reverse() {
      tl.reverse();
      paint(root, tl);
    },
    seek(f) {
      tl.pause().progress(f);
      paint(root, tl);
    },
    speed(v) {
      tl.timeScale(v);
    },
    inspect() {
      return {
        kind: "time",
        gsap: gsap.version,
        duration: tl.duration(),
        time: tl.time(),
        progress: tl.progress(),
        paused: tl.paused(),
        reversed: tl.reversed(),
        labels: tl.labels,
        triggerCount: ScrollTrigger.getAll().length,
      };
    },
    dispose() {
      live = false;
      ctx.revert();
      root.dataset.runtime = "static";
      disablePlugin();
    },
  };
}
export function createScrollScene(
  root,
  viewport,
  { distance, pin, scrub },
  mark,
) {
  let live = true,
    tl,
    st,
    frame = 0,
    last = 0;
  ScrollTrigger.enable();
  pluginEnabled = true;
  const scene = root.querySelector("[data-scroll-art]"),
    track = root.querySelector("[data-scroll-track]");
  const bounds = () => {
    if (!live || !st) return;
    root.dataset.scrollProgress = st.progress.toFixed(5);
    root.dataset.start = st.start.toFixed(3);
    root.dataset.end = st.end.toFixed(3);
    root.dataset.pin = String(!!st.pin);
    root.dataset.triggerCount = String(ScrollTrigger.getAll().length);
  };
  const ctx = gsap.context(() => {
    tl = choreography(scene, () => {
      if (live) paint(scene, tl);
    });
    st = ScrollTrigger.create({
      id: "tool06-scroll",
      trigger: track,
      scroller: viewport,
      animation: tl,
      start: "top top",
      end: () => `+=${distance}`,
      scrub: scrub === "direct" ? true : 0.35,
      pin: pin ? scene : false,
      pinSpacing: true,
      invalidateOnRefresh: true,
      onRefresh: bounds,
      onUpdate: (self) => {
        if (!live) return;
        const f = self.progress;
        root.dataset.scrollProgress = f.toFixed(5);
        if (f > last + 0.001) mark({ forwardSeen: true });
        if (f < last - 0.001) mark({ backSeen: true });
        last = f;
      },
    });
  }, root);
  viewport.scrollTo({ top: 0, behavior: "instant" });
  st.refresh();
  st.update();
  bounds();
  scene.dataset.runtime = `gsap${gsap.version}`;
  root.dataset.runtime = "ScrollTrigger3.15.0";
  root.dataset.scrub = scrub;
  paint(scene, tl);
  let size = "";
  const refresh = () => {
    const now = `${viewport.clientWidth}/${viewport.clientHeight}`;
    if (now === size) return;
    size = now;
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (live) {
        st.refresh();
        st.update();
        bounds();
      }
    });
  };
  const ro =
    typeof ResizeObserver === "function" ? new ResizeObserver(refresh) : null;
  ro?.observe(viewport);
  return {
    seek(f) {
      viewport.scrollTo({
        top: st.start + (st.end - st.start) * f,
        behavior: "instant",
      });
      ScrollTrigger.update();
    },
    inspect() {
      bounds();
      return {
        kind: "scroll",
        gsap: gsap.version,
        scrollTrigger: ScrollTrigger.version,
        progress: st.progress,
        animationProgress: tl.progress(),
        start: st.start,
        end: st.end,
        scrollTop: viewport.scrollTop,
        scrollerMatches: st.scroller === viewport,
        pin: !!st.pin,
        scrub: st.vars.scrub,
        triggerCount: ScrollTrigger.getAll().length,
        spacers: root.querySelectorAll(".pin-spacer").length,
      };
    },
    dispose() {
      live = false;
      if (frame) cancelAnimationFrame(frame);
      ro?.disconnect();
      ctx.revert();
      disablePlugin();
      root.dataset.runtime = "static";
      root.dataset.triggerCount = "0";
      root.dataset.scrollProgress = "0.00000";
      root.dataset.pin = "false";
    },
  };
}
export function shutdown() {
  disablePlugin();
}
