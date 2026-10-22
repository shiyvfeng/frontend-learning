export const POINTER_STORAGE = "frontend-observatory.lesson23.v1";
export const pointerScope =
  "本例在未变形的局部边界上读取clientX/clientY与getBoundingClientRect，归一化后夹在0–1。每帧最多提交一次最新坐标，只更新CSS变量与只读读数，不逐帧重建React组件树。radial-gradient改变聚光位置，perspective/rotateX/rotateY只倾斜一张CSS平面，不是图像几何扭曲或完整3D场景，未使用Canvas/WebGL/Three.js。";
export const pointerSteps = [
  {
    short: "跟随",
    time: "4 分钟",
    title: "指针位置是输入，不只是播放开关",
    desc: "鼠标或笔在局部边界内移动，看聚光和倾斜响应。键盘与触屏用分区按钮改变同一组坐标；所有完成门槛都不依赖hover。",
  },
  {
    short: "幅度",
    time: "4 分钟",
    title: "限幅、保留内容，不把倾斜叫完整3D",
    desc: "调节2° / 5° / 8°幅度，切换聚光并编辑文案。控件留在效果外，装饰不接收输入。",
  },
  {
    short: "复位",
    time: "4 分钟",
    title: "离开、取消与减少动态，都有退路",
    desc: "核对复位、减少动态和静态能力回退。鼠标滚动或改变窗口后重新测量边界，触摸滑动保持原生页面滚动。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "认清局部坐标与实现边界",
    desc: "判断坐标、更新成本和输入替代。选错可以重试，解释始终可读。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "给Agent一份克制的跟随指令",
    desc: "明确跟随范围、幅度、成本、装饰层与减少动态。生成后可以真实编辑，再复制使用。",
  },
];
export const pointerQuestions = [
  {
    q: "页面滚动后，怎样避免聚光偏离指针？",
    options: [
      "一直用初次进入页面时缓存的矩形",
      "用同一视口坐标系的clientX/clientY和当前未变形边界；滚动/resize后重测并限幅",
    ],
    correct: 1,
    why: "getBoundingClientRect相对视口；不能直接混用pageX/pageY或长期缓存旧矩形。测未变形外壳，避免测被倾斜元素造成反馈漂移。",
  },
  {
    q: "CSS卡片倾斜与完整3D场景是什么关系？",
    options: [
      "只是一个CSS平面的透视与旋转；不等于几何扭曲、材质灯光或完整3D场景",
      "用了rotateX就等于已接入Three.js完整3D",
    ],
    correct: 0,
    why: "radial-gradient和普通transform能做很多轻反馈。复杂网格变形、材质/灯光、场景交互才另评估图形技术，不把常规倾斜包装成3D引擎。",
  },
  {
    q: "哪份交互指令更完整？",
    options: [
      "全页追指针，每次pointermove重建大量UI，并阻止触摸滚动",
      "只跟随局部、合并更新并限幅；离开取消复位，键盘/触屏替代，减少动态保留内容",
    ],
    correct: 1,
    why: "装饰不应截获输入或遮住正文；不持续自转、不劫持触摸。静态分区按钮也能改变坐标参数，减少动态停止跟随与倾斜，课程仍能完成。",
  },
];
export const pointerSources = [
  [
    "MDN：Pointer Events",
    "https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events",
  ],
  [
    "MDN：getBoundingClientRect",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect",
  ],
  [
    "MDN：pointercancel",
    "https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event",
  ],
  [
    "MDN：touch-action",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action",
  ],
  [
    "MDN：requestAnimationFrame",
    "https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame",
  ],
  [
    "MDN：transform",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/transform",
  ],
  [
    "MDN：pointer-events",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events",
  ],
];
export const pointerInitial = () => ({
  step: 0,
  done: [],
  alternativeSeen: false,
  centered: false,
  inspected: false,
  tiltChanged: false,
  lightChanged: false,
  captionChanged: false,
  reducedChecked: false,
  fallbackReviewed: false,
  cleanupReviewed: false,
  follow: true,
  light: true,
  tilt: true,
  amplitude: 5,
  noMotion: false,
  forceStatic: false,
  caption: "让反馈跟手，让内容保持清楚",
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readPointerProgress() {
  const b = pointerInitial();
  try {
    const x = JSON.parse(localStorage.getItem(POINTER_STORAGE));
    if (!x || typeof x !== "object") return b;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((v) => [0, 1, 2, 3, 4].includes(v)))];
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([2, 5, 8].includes(x.amplitude)) b.amplitude = x.amplitude;
    if (typeof x.caption === "string") b.caption = x.caption.slice(0, 80);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = pointerQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export function pointerValues(x, y, amplitude = 5) {
  const safe = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5);
  const px = safe(x),
    py = safe(y),
    a = Number.isFinite(amplitude) ? Math.max(0, Math.min(8, amplitude)) : 5;
  return { x: px, y: py, rx: (0.5 - py) * 2 * a, ry: (px - 0.5) * 2 * a };
}
export function localPointer(clientX, clientY, rect) {
  return rect.width > 0 && rect.height > 0
    ? {
        ...pointerValues(
          (clientX - rect.left) / rect.width,
          (clientY - rect.top) / rect.height,
        ),
        inside:
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom,
      }
    : { ...pointerValues(0.5, 0.5), inside: false };
}
