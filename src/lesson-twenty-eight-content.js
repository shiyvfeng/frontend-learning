export const MOTION_STORAGE = "frontend-observatory.lesson28.v1";
export const motionScope =
  "左侧真实lottie-web 5.13.0 SVG运行时播放本仓库手工自制JSON；不是CSS替身。右侧为React/HTML/CSS输入与状态工作流模拟，未导入Rive SDK或.riv，未运行dotLottie状态机。没有账户、付费、第三方上传或远程素材。";
export const motionSteps = [
  {
    short: "播放",
    time: "4 分钟",
    title: "先控制真实Lottie时间线",
    desc: "加载原创资源，改变采样位置与速度。默认不自动播放；减少动态也可静态完成。",
  },
  {
    short: "输入",
    time: "4 分钟",
    title: "业务含义需要显式映射",
    desc: "用布尔、数值与触发事件改变示意状态，区分业务流程与动画表现。这一侧是Rive工作流模拟。",
  },
  {
    short: "回退",
    time: "4 分钟",
    title: "资源失败与迟到结果不能改错画面",
    desc: "手动应用本地资源结果，体验失败、重试和取消。真实本地资源加载与教学延迟分别标注。",
  },
  {
    short: "判断",
    time: "3 分钟",
    title: "按资产与协作选，不按工具名字选",
    desc: "Lottie也可以交互，dotLottie具备状态机能力；具体取决于资产、编辑器、运行时与版本。",
  },
  {
    short: "指令",
    time: "3 分钟",
    title: "写清时间线、数据映射和加载回退",
    desc: "生成可编辑简报，约定资源来源、运行时支持、播放控制、输入类型与清理。",
  },
];
export const motionQuestions = [
  {
    q: "Lottie只能播放，只有Rive可以交互吗？",
    options: [
      "是，工具名就能决定全部交互能力",
      "不是；播放控制可接网页事件，dotLottie还支持状态机，需匹配编辑器、资产和runtime支持",
    ],
    correct: 1,
    why: "本例lottie-web播放JSON时间线，没有dotLottie状态机。dotLottie状态机需要含对应定义的资产与支持的runtime，不能把本例能力等同整个生态。",
  },
  {
    q: "一个成功请求，能由动画引擎自动理解并记住吗？",
    options: [
      "不能；应用掌握业务状态，再明确映射到布尔、数值或一次性触发，动画状态不是真实业务凭据",
      "能；看到庆祝效果就说明服务端保存成功",
    ],
    correct: 0,
    why: "布尔表示持续条件，数值表示程度，触发器表示一次事件，不能拿一个布尔代替全部业务阶段。Rive新项目应核对Data Binding/View Model；旧Inputs属于legacy接口。",
  },
  {
    q: "如何选择Lottie与Rive的集成工作流？",
    options: [
      "不用看资产，只要名字更高级就强制替换",
      "按团队制作与更新方式、资源许可、目标runtime特性和性能选择，验证加载失败与减少动态",
    ],
    correct: 1,
    why: "设计工具负责创作，资产包含时间线或状态逻辑，runtime负责加载和运行；并非任意导出或平台都支持全部特性。本例Rive是本地模拟，不是.riv能力证明。",
  },
];
export const motionSources = [
  ["lottie-web官方：加载、播放与销毁", "https://github.com/airbnb/lottie-web"],
  [
    "dotLottie官方：状态机与资产要求",
    "https://github.com/LottieFiles/dotlottie-web/wiki/State-Machines",
  ],
  [
    "dotLottie官方：运行时API与支持",
    "https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/api/reference",
  ],
  ["Rive官方：Web运行时与清理", "https://rive.app/docs/runtimes/web/web-js"],
  [
    "Rive官方：Data Binding / View Model",
    "https://rive.app/docs/runtimes/web/data-binding",
  ],
  ["Rive官方：旧Inputs接口边界", "https://rive.app/docs/runtimes/web/inputs"],
];
export const motionInitial = () => ({
  step: 0,
  done: [],
  caption: "从时间线到业务输入",
  frame: 0,
  speed: 1,
  busy: false,
  amount: 0,
  pulses: 0,
  business: "idle",
  outcome: "success",
  loadedSeen: false,
  sampledSeen: false,
  speedSeen: false,
  boundaryReviewed: false,
  boolSeen: false,
  numberSeen: false,
  triggerSeen: false,
  mappedSeen: false,
  failureSeen: false,
  retrySeen: false,
  canceledSeen: false,
  staleSeen: false,
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
export function readMotionProgress() {
  const b = motionInitial();
  try {
    const x = JSON.parse(localStorage.getItem(MOTION_STORAGE));
    if (!x || typeof x !== "object") return b;
    for (const [k, v] of Object.entries(b))
      if (typeof v === "boolean") b[k] = x[k] === true;
    if ([0, 1, 2, 3, 4].includes(x.step)) b.step = x.step;
    if (Array.isArray(x.done))
      b.done = [...new Set(x.done.filter((n) => [0, 1, 2, 3, 4].includes(n)))];
    for (const [k, vs] of [
      ["speed", [0.5, 1, 2]],
      ["business", ["idle", "busy", "success", "failure"]],
      ["outcome", ["success", "failure"]],
    ])
      if (vs.includes(x[k])) b[k] = x[k];
    for (const [k, max] of [
      ["frame", 119],
      ["amount", 100],
      ["pulses", 999],
    ])
      if (Number.isFinite(x[k]))
        b[k] = Math.max(0, Math.min(max, Math.round(x[k])));
    if (typeof x.caption === "string") b.caption = x.caption.slice(0, 80);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = motionQuestions.map((_, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
  } catch {}
  return b;
}
export function visualState(busy, amount) {
  return busy
    ? "处理中"
    : amount >= 100
      ? "完成"
      : amount > 0
        ? "进行中"
        : "待机";
}
// A bounded manual gate delays application of real local resource results, not the network.
export function createAssetGate(notify = () => {}) {
  let alive = true,
    serial = 0,
    current = { status: "empty", id: null },
    packets = [];
  const snapshot = () => ({
    ...current,
    queued: packets.length,
    prepared: packets.filter((p) => p.ready).length,
  });
  const emit = (type, extra = {}) => {
    if (alive) notify({ type, ...snapshot(), ...extra });
  };
  const finish = (p) => {
    if (!alive) return "disposed";
    if (p.done) {
      emit("duplicate");
      return "duplicate";
    }
    if (!p.ready) {
      emit("preparing");
      return "preparing";
    }
    p.done = true;
    packets = packets.filter((v) => v !== p);
    if (current.id !== p.id || current.status !== "loading") {
      emit("stale");
      return "stale";
    }
    current = { status: p.error ? "failed" : "ready", id: p.id };
    emit(p.error ? "failure" : "success", { value: p.value, error: p.error });
    return p.error ? "failure" : "success";
  };
  return {
    snapshot,
    start() {
      if (!alive) return null;
      if (current.status === "loading") {
        emit("repeated");
        return null;
      }
      if (packets.length >= 8) {
        emit("full");
        return null;
      }
      const p = { id: ++serial, ready: false, done: false };
      packets.push(p);
      current = { status: "loading", id: p.id };
      emit("started");
      return {
        id: p.id,
        prepare(value, error) {
          if (!alive) return "disposed";
          if (p.ready || p.done) return "duplicate";
          Object.assign(p, { ready: true, value, error });
          emit("prepared");
          return "prepared";
        },
        complete: () => finish(p),
      };
    },
    deliver() {
      if (!alive) return "disposed";
      if (!packets.length) {
        emit("empty");
        return "empty";
      }
      return finish(packets[0]);
    },
    cancel() {
      if (!alive) return;
      if (current.status !== "loading") {
        emit("no-cancel");
        return;
      }
      serial++;
      current = { status: "canceled", id: null };
      emit("canceled");
    },
    dispose() {
      alive = false;
      packets = [];
      current = { status: "disposed", id: null };
    },
  };
}
export function motionBrief(data) {
  return `请实现资源动画与业务输入的网页集成。标题：${data.caption}。

实际机制与边界：${motionScope} 原创JSON只含矢量形状与关键帧，无外链图像/字体。本课右侧局部示意模型不是Rive API或.riv文件。正式接入Rive需合法自制/授权资产及真实runtime，不能把CSS动画伪称运行时结果。

资产与团队：设计工具负责创作协作，交付资产包含时间线、状态机或数据绑定，runtime按目标平台加载运行。按设计师更新频率、团队工具链、交付特性、许可和体积/绘制预算比较Lottie/dotLottie/Rive，不按名字选。不要声称Lottie只能播放、Rive才可交互；dotLottie支持状态机，但需要相符编辑器、包含定义的资产和支持版本。本例lottie-web不运行dotLottie状态机。核对官方当期API与功能支持、账号计划和资产授权，不承诺任意格式或免费导出。

播放控制：默认暂停、单次播放，原生按钮可播放/暂停、重置、采样0/50/100%，速度0.5/1/2倍；采样定位使用实际runtime接口，速度只改变时间推进，不改变关键帧内容。重复播放不叠加循环，末帧重播从头开始。减少动态实时暂停，禁止自动恢复；静态采样仍显示真实帧，不把播放到某秒作为通关门槛。

业务与表现：业务状态由应用与真实服务结果决定，不由动画推断。本例${data.business}仅本地业务演练。明确映射表：busy布尔表达持续处理条件，amount数值表达0–100程度，celebrate触发器是一次事件而非保持true的成功标志。快速输入以当前值为准；触发计数有上限且可重置，不承诺排队播放全部庆祝。错误保留文字与重试，庆祝不能伪造业务成功。Rive新项目优先核对Data Binding/View Model的属性/触发器；旧stateMachineInputs属legacy，不直接照搬本地字段为SDK调用。

加载、失败与取消：本课实际从同源加载JSON与懒加载lottie-web，手动应用队列仅为模拟慢速结果，不是假称服务器延迟。显式模拟失败和实际fetch/JSON/runtime错误都有文本回退/重试。开始时捕获选项，重复开始不并发，队列最多8条。取消中止fetch并使旧代次失效；完成的旧资源、加载中取消和卸载后的回调不能重建已销毁实例或覆盖新结果。runtime初始化/渲染失败也销毁实例并允许重试。Rive正式集成另验证.riv/WASM/字体加载与失败；本课未加载它们。

清理与输入：离站/重置/卸载destroy Lottie、移除事件监听、中止加载；隐藏页面暂停且不自动续播，无无意义后台循环。不依赖hover或拖拽，键盘与触屏用原生按钮/范围控件与文字替代；画面仅装饰，不残留不可见Tab目标。实时减少动态、长标题、375px与短视口可读，live-region只报离散操作，不逐帧播报。必要业务控件不依赖动画加载成功。

验收：真实runtime实例与SVG关键帧画面变化、采样/速度/播放暂停，布尔/数值/触发器的实际示意反馈，业务映射与错误文字，快速输入、重复开始、取消/迟到结果、加载失败/重试/渲染失败、隐藏/离站清理、实时reduce、焦点不抢外部。错题可重试，示例可填入也可编辑，复制失败有替代，刷新/取消确认重置保留01–27。只实现28，不开始29。`;
}
