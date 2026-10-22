export const GL_STORAGE = "frontend-observatory.lesson25.v1";
export const glScope =
  "真实WebGL 1程序：一块Canvas承载绘图，顶点shader铺满两个三角形，片元shader计算每个像素的静态波纹颜色。应用把强度、密度、采样相位、中心和位图尺寸传入uniform；没有纹理图片、DOM波纹或3D场景。GPU可并行处理像素，但浏览器也可能用软件实现，不能据此声称硬件性能。";
export const glSteps = [
  {
    short: "效果",
    time: "4 分钟",
    title: "让参数进入真正的shader",
    desc: "改变波纹强度，手动切换一个静态采样。没有自动播放，不需要等待动画；不可用时可在标明的回退中完成学习。",
  },
  {
    short: "输入",
    time: "4 分钟",
    title: "Canvas是画面入口，不等于3D",
    desc: "短按画面或使用中心按钮改变波纹位置。比较Canvas、WebGL和3D内容；不需要记GLSL或矩阵。",
  },
  {
    short: "预算",
    time: "4 分钟",
    title: "先限制成本，再设计回退",
    desc: "切换低分辨率预算，体验模拟不支持并恢复。真实编译、链接、上下文丢失也有诚实的回退和重试。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "识别GPU效果的边界",
    desc: "按效果、设备和可访问性选技术；选错可以重试并阅读理由。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "给Agent可验收的图形简报",
    desc: "描述效果目标、输入参数、像素预算、清理和回退。生成后可以编辑复制，不要求手写shader。",
  },
];
export const glQuestions = [
  {
    q: "画面是二维波纹，能是真正的WebGL吗？",
    options: [
      "不能，WebGL画面必须有3D模型",
      "能；Canvas是承载表面，WebGL是绘图API，二维程序化颜色也能由shader生成",
    ],
    correct: 1,
    why: "是否使用WebGL看实际上下文、编译链接和绘制调用，而不是画面有没有3D。Canvas也能承载2D上下文，两种API不是同一件事。",
  },
  {
    q: "产品里的强度滑块怎样影响shader画面？",
    options: [
      "应用把参数传入uniform，shader据此计算像素，再发起重绘",
      "改一下说明文字就代表GPU参数已经改变",
    ],
    correct: 0,
    why: "uniform是本次绘制的参数入口，不是自动动画。要真的上传参数并绘制；静态相位采样也能验证效果，不必持续循环。",
  },
  {
    q: "复杂效果应该怎样安排预算与回退？",
    options: [
      "WebGL总更快，设备失败也继续称shader已生效",
      "限制像素密度、尺寸与更新频率，在目标设备实测；不支持或低性能时明确回退，语义留在画布外",
    ],
    correct: 1,
    why: "高像素密度会增加像素工作量。软件渲染不能证明真实GPU性能；DOM/SVG/CSS也可能更合适。回退保留内容与操作，但不能冒充真实shader。",
  },
];
export const glSources = [
  [
    "MDN：WebGL入门",
    "https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL",
  ],
  [
    "MDN：uniform参数",
    "https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/uniform",
  ],
  [
    "MDN：WebGL实践与资源预算",
    "https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices",
  ],
  [
    "MDN：上下文丢失与恢复",
    "https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event",
  ],
  [
    "MDN：像素读回",
    "https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/readPixels",
  ],
];
export const glInitial = () => ({
  step: 0,
  done: [],
  amp: 0.45,
  frequency: 6,
  phase: 0,
  cx: 0.5,
  cy: 0.5,
  low: false,
  fallback: false,
  caption: "静态波纹：参数改变，画面重绘",
  parameterChanged: false,
  sampled: false,
  centerChanged: false,
  compared: false,
  budgetChanged: false,
  fallbackReviewed: false,
  inspected: false,
  answers: [null, null, null],
  generated: false,
  reviewed: false,
  draft: "",
});
export function readGLProgress() {
  const b = glInitial();
  try {
    const x = JSON.parse(localStorage.getItem(GL_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries(b)) {
      if (typeof v === "boolean") b[k] = x[k] === true;
    }
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((n) => [0, 1, 2, 3, 4].includes(n)))];
    for (const [k, min, max] of [
      ["amp", 0, 1],
      ["frequency", 2, 10],
      ["phase", 0, Math.PI * 2],
      ["cx", 0, 1],
      ["cy", 0, 1],
    ])
      if (typeof x[k] === "number" && Number.isFinite(x[k]))
        b[k] = Math.min(max, Math.max(min, x[k]));
    if (typeof x.caption === "string") b.caption = x.caption.slice(0, 80);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = glQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export function glSize(width, height, dpr, low = false, limit = 1024) {
  const density = Math.min(
      Math.max(Number.isFinite(dpr) ? dpr : 1, 0.5),
      low ? 0.75 : 1.5,
    ),
    max = Math.max(1, Math.min(1024, limit)),
    scale = Math.min(
      density,
      max / Math.max(1, width),
      max / Math.max(1, height),
    );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    density,
  };
}
export const vertexSource = `attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
export const fragmentSource = `precision mediump float;
uniform vec2 u_resolution; uniform vec2 u_center;
uniform float u_amp; uniform float u_frequency; uniform float u_phase;
void main(){vec2 uv=gl_FragCoord.xy/u_resolution;vec2 p=uv-u_center;p.x*=u_resolution.x/u_resolution.y;
float radius=length(p);float wave=sin(radius*u_frequency*6.283185+u_phase);
float stripe=0.5+0.5*sin((uv.x+u_amp*0.075*wave)*12.56637+uv.y*3.0);
vec3 color=mix(vec3(0.22,0.18,0.40),vec3(0.62,0.85,0.80),stripe);
color+=u_amp*0.12*wave;gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);}`;
