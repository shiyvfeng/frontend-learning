export const TOOL01_STORAGE = "frontend-observatory.tool01.v1";
export const tool01Steps = [
  {
    short: "选择场景",
    title: "UI库和应用框架，先按需求分工",
    time: "4 分钟",
    desc: "React负责组件UI；Next.js是基于React的应用框架候选。比较需求、数据和部署，不能只按名字选。",
  },
  {
    short: "首访流程",
    title: "把部署前准备和本次请求分开",
    time: "4 分钟",
    desc: "手动推进逻辑阶段，观察本站CSR与Next模型的首次输出、资源及水合区别；这不是实际Next请求。",
  },
  {
    short: "组件边界",
    title: "交互边界与服务器数据各有职责",
    time: "4 分钟",
    desc: "调整正文和控件的模块边界，体验失败、重试、取消和旧结果隔离，再操作真实React按钮。",
  },
  {
    short: "判断理由",
    title: "不要用一个标签替代完整渲染流程",
    time: "3 分钟",
    desc: "区分Client Component、Server Component、HTML预渲染和部署能力，错题可重选。",
  },
  {
    short: "项目简报",
    title: "按项目现状交代方案与约束",
    time: "4 分钟",
    desc: "保留当前站的React+Vite，生成可编辑说明；教学对照不等于要求迁移项目。",
  },
];
export const tool01Models = [
  {
    id: "vite",
    label: "本站式 React + Vite CSR",
    why: "适合现有静态交互页；路由、服务端能力需按项目另行组合。这只是CSR模型，不代表所有React应用都只在浏览器渲染。",
  },
  {
    id: "export",
    label: "Next App Router 静态导出模型",
    why: "公开内容可构建时生成多路由HTML，适合纯静态托管。导出后没有按请求运行的Next服务；也可配独立API，不自动保证性能或SEO。",
  },
  {
    id: "request",
    label: "Next App Router 请求时渲染模型",
    why: "本模型特意选择请求时处理的路由，需兼容运行环境。Next还支持预渲染、缓存与流式等组合，不是每个Next页面都每请求重新渲染。",
  },
];
export const tool01Cases = [
  {
    id: "catalog",
    label: "静态课程目录 + 收藏交互",
    dataSource: "public",
    interactive: true,
    note: "公开教学数据与本地交互通常可保留现有CSR；若需要预生成多路由HTML，也可评估框架静态导出。",
  },
  {
    id: "member",
    label: "每次请求的个性化首次HTML",
    dataSource: "request",
    interactive: true,
    note: "只使用虚构访客样例。这里明确要求本次请求生成个性化HTML，不能假装纯静态主机已具备运行时；其他React SSR架构也可能满足。",
  },
  {
    id: "article",
    label: "公开多路由文档 + 阅读",
    dataSource: "public",
    interactive: false,
    note: "可评估预生成HTML或已有内容框架；是否加客户端交互、路由运行时及如何部署要分别确认，不以Next名称保证SEO。",
  },
];
export const tool01Data = [
  ["public", "可公开的内置教学数据"],
  ["api", "浏览器就绪后请求业务API（模拟）"],
  ["request", "要求本次请求生成个性化首次HTML（模拟）"],
];
export const tool01Hosts = [
  ["static", "仅静态文件，无业务API"],
  ["api", "静态文件 + 另有业务API"],
  ["runtime", "兼容方案的服务运行环境（可含API）"],
];
export function tool01Check(d) {
  const issues = [];
  if (d.model === "request" && d.host !== "runtime")
    issues.push({
      id: "runtime",
      text: "请求时渲染模型需要兼容运行环境；仅静态文件或另有API不等于拥有Next渲染服务。",
    });
  if (d.dataSource === "request" && d.model !== "request")
    issues.push({
      id: "personal",
      text: "本需求要求个性化首次HTML，所选CSR/静态导出模型不能独自满足。可改为浏览器后取API，或评估Next服务/其他React SSR架构；不是React库不能服务端渲染。",
    });
  if (d.dataSource === "api" && d.host === "static")
    issues.push({
      id: "api",
      text: "选择了后续业务API，但部署约束没有API能力。需要另有服务或改用公开内置数据；前端不保存服务密钥。",
    });
  if (d.model !== "vite" && d.interactive && d.controlSide === "server")
    issues.push({
      id: "boundary",
      text: "交互控件需要事件/状态，不能在本RSC模型中只做Server Component；把交互放入Client边界，数据读取仍可留服务端。",
    });
  if (
    d.model !== "vite" &&
    d.dataSource === "api" &&
    d.contentSide === "server" &&
    d.controlSide === "server"
  )
    issues.push({
      id: "boundary",
      text: "本例要在浏览器后取API并更新正文，需要选择客户端执行边界（如正文的Client子树），或改为构建/请求时取数。框架路由运行时不会自动承担业务API逻辑；独立脚本等其他方案需另行设计。",
    });
  return { valid: issues.length === 0, issues };
}
export function tool01Preparation(d) {
  if (d.model === "vite")
    return "部署前：构建JS/CSS。本项目index.html只有空root，浏览器用createRoot生成主体；这里没有对服务器生成的主体HTML做水合。React库也可用于其他SSR/RSC架构。";
  if (d.model === "export")
    return "部署前：构建环境执行Server Components得到RSC输出，并将包括Client边界的页面预渲染为HTML。访问时服务静态产物，不在每次访问重新构建；仍可能包含框架/交互JS。";
  return "部署前：准备框架和客户端资源。本模型选择请求时渲染路由；真实Next可按路由/片段组合预渲染、缓存、流式等，不能用此简化流程代表全部Next。";
}
export function tool01Phases(d) {
  const hasClient = d.contentSide === "client" || d.controlSide === "client";
  const request = {
    id: "request",
    lane: "browser",
    title: "浏览器发起首访",
    note: "新的模拟尝试；没有真的发送HTTP、cookie或凭据。",
  };
  const resources = {
    id: "resources",
    lane: "browser",
    title: "等待客户端资源结果",
    note: "由你手动投递教学成功/失败，不测网络或服务器耗时。",
    wait: true,
  };
  const hydrate = {
    id: hasClient ? "hydrate" : "coordinate",
    lane: "browser",
    title: hasClient ? "协调RSC树并水合Client边界" : "处理RSC与框架路由运行时",
    note: hasClient
      ? "已有HTML不等于事件已接上。Client Component在此例首访也有预渲染HTML，再由JS接入交互。"
      : "没有用户交互边界不代表框架必定零JS；Server Component代码不下发，与框架客户端运行时是两件事。",
  };
  let phases;
  if (d.model === "vite")
    phases = [
      request,
      {
        id: "shell",
        lane: "host",
        title: "静态主机返回入口壳",
        note: "本站式空root和资源引用；主体并未在此HTML里生成。",
      },
      resources,
      {
        id: "client-render",
        lane: "browser",
        title: "浏览器执行JS与createRoot",
        note: "生成React主体；这是客户端渲染，不是对主体SSR HTML的水合。",
        preview: true,
      },
    ];
  else if (d.model === "export")
    phases = [
      request,
      {
        id: "display",
        lane: "host",
        title: "返回构建时已生成的HTML",
        note: "包括Client边界的首次内容预览与RSC/资源信息；不是浏览器才第一次生成全部HTML。",
        preview: true,
      },
      resources,
      hydrate,
    ];
  else
    phases = [
      request,
      {
        id: "server-data",
        lane: "server",
        title:
          d.dataSource === "request"
            ? "等待本请求的服务器样例数据"
            : "本请求读取公开样例",
        note: "固定的服务器数据职责在Client模块边界之外，只向界面传教学可序列化数据；不读取真实身份或密钥。",
        wait: d.dataSource === "request",
      },
      {
        id: "rsc",
        lane: "server",
        title: "Server Components形成RSC输出",
        note: "教学输出描述，不是实际RSC报文；RSC不是HTML，Server Component也不等同传统SSR的全部概念。",
      },
      {
        id: "html",
        lane: "server",
        title: "RSC与Client Components参与HTML预渲染",
        note: "此例按请求生成HTML；即使正文加入Client模块子树，也不能推断首次没有服务器HTML。",
      },
      {
        id: "display",
        lane: "browser",
        title: "浏览器先显示首访HTML",
        note: "可读预览先到，交互JS尚未就绪；实际传输可流式/并行，本表不是性能时间线。",
        preview: true,
      },
      resources,
      hydrate,
    ];
  if (d.dataSource === "api")
    phases.push({
      id: "client-data",
      lane: "browser",
      title: "等待浏览器后取的业务API结果",
      note: "HTML可先是公开占位；模型只投递本地样例，不调用业务服务，也不把服务密钥放浏览器。",
      wait: true,
      preview: true,
    });
  phases.push({
    id: "ready",
    lane: "browser",
    title: d.interactive ? "模型已就绪，可体验真实React控件" : "模型阅读完成",
    note: "这只表示教学阶段已完成，不证明Next真实运行、性能/SEO达标或生产部署。",
  });
  return phases;
}
export const tool01Questions = [
  {
    q: "Next App Router的Client Component首访，HTML一定只在浏览器生成吗？",
    options: [
      "一定，Client这个名字已说明全部阶段",
      "不一定，首次可在构建/服务器预渲染HTML，再水合交互",
    ],
    correct: 1,
    why: "模块客户端边界与HTML生成阶段不同；交互能力需要浏览器JS，但Client Component在Next首访仍可参与HTML预渲染。后续客户端导航流程又不同。",
  },
  {
    q: "Server Component和传统SSR可以完全画等号吗？",
    options: [
      "不可以，RSC职责/输出与生成HTML的阶段需要区分",
      "可以，所有服务器相关概念都是SSR",
    ],
    correct: 0,
    why: "Server Components可在构建或请求环境执行并形成RSC输出；HTML预渲染另有职责，不用RSC的React架构也可SSR。",
  },
  {
    q: "只有静态文件托管，却要每次请求个性化首次HTML，换个Next名字会自动解决吗？",
    options: [
      "会，也自动保证SEO与性能",
      "不会，需匹配运行环境/服务与真实验收；可比较其他合理架构",
    ],
    correct: 1,
    why: "静态导出没有按请求运行的Next服务。按需求选择数据时机、交互边界和部署能力；Next不是性能/SEO保证，也不要求把本站迁移过去。",
  },
];
export const tool01Scope =
  "实际运行的是本站React19.3.1 + Vite8.3.4客户端UI；未安装或运行Next服务器。首访、RSC、HTML和资源结果均为本地逻辑模拟，不是实际协议、缓存实现、耗时或SEO测试。使用公开虚构样例，无真实身份、密钥、业务网络请求或迁移。";
export const tool01Sources = [
  [
    "React · UI库与应用架构",
    "https://react.dev/learn/build-a-react-app-from-scratch",
  ],
  [
    "React · Server Components",
    "https://react.dev/reference/rsc/server-components",
  ],
  ["React · use client边界", "https://react.dev/reference/rsc/use-client"],
  [
    "React · hydrateRoot",
    "https://react.dev/reference/react-dom/client/hydrateRoot",
  ],
  [
    "Next · Server/Client边界",
    "https://nextjs.org/docs/app/guides/server-and-client-boundary",
  ],
  [
    "Next · Server/Client Components",
    "https://nextjs.org/docs/app/getting-started/server-and-client-components",
  ],
  ["Next · 静态导出", "https://nextjs.org/docs/app/guides/static-exports"],
  [
    "Next · 部署与平台支持",
    "https://nextjs.org/docs/app/getting-started/deploying",
  ],
];
export const tool01Initial = () => ({
  step: 0,
  done: [],
  model: "vite",
  scenario: "catalog",
  dataSource: "public",
  host: "static",
  interactive: true,
  contentSide: "server",
  controlSide: "client",
  modelsSeen: ["vite"],
  validSeen: false,
  constraintSeen: false,
  boundaryErrorSeen: false,
  csrComplete: false,
  nextComplete: false,
  htmlBeforeHydrationSeen: false,
  requestComplete: false,
  realSeen: false,
  failureSeen: false,
  retrySeen: false,
  cancelSeen: false,
  lateSeen: false,
  answers: [null, null, null],
  context: "",
  generated: false,
  reviewed: false,
  draftStale: false,
  draft: "",
});
export function readTool01Progress() {
  const d = tool01Initial();
  try {
    const s = JSON.parse(localStorage.getItem(TOOL01_STORAGE));
    if (!s || typeof s !== "object") return d;
    const r = { ...d };
    for (const k of Object.keys(d))
      if (typeof d[k] === "boolean" && typeof s[k] === "boolean") r[k] = s[k];
    for (const [k, values] of Object.entries({
      model: tool01Models.map((v) => v.id),
      scenario: tool01Cases.map((v) => v.id),
      dataSource: tool01Data.map((v) => v[0]),
      host: tool01Hosts.map((v) => v[0]),
      contentSide: ["server", "client"],
      controlSide: ["server", "client"],
    }))
      if (values.includes(s[k])) r[k] = s[k];
    r.step = Number.isInteger(s.step) && s.step >= 0 && s.step < 5 ? s.step : 0;
    r.done = Array.isArray(s.done)
      ? [
          ...new Set(
            s.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5),
          ),
        ]
      : [];
    r.modelsSeen = Array.isArray(s.modelsSeen)
      ? [
          ...new Set(
            s.modelsSeen.filter((v) => tool01Models.some((m) => m.id === v)),
          ),
        ]
      : ["vite"];
    r.answers = d.answers.map((_, i) =>
      [0, 1].includes(s.answers?.[i]) ? s.answers[i] : null,
    );
    r.context = typeof s.context === "string" ? s.context.slice(0, 700) : "";
    r.draft = typeof s.draft === "string" ? s.draft.slice(0, 10000) : "";
    r.reviewed =
      r.reviewed && r.generated && !r.draftStale && r.draft.trim().length >= 80;
    return r;
  } catch {
    return d;
  }
}
export function tool01Brief(d) {
  const check = tool01Check(d);
  return `React / Next.js选型草稿\n项目现状（由用户核对）：${d.context || "【待确认：项目与部署现状】"}\n不要为学习专题迁移本站；先读现有项目约定，再按需求评估UI库与应用框架职责。React可以用于多种渲染架构，Next是其中的框架候选，Vite是本项目构建工具。\n教学对照选择：${tool01Models.find((m) => m.id === d.model)?.label}；场景${tool01Cases.find((c) => c.id === d.scenario)?.label}；数据：${tool01Data.find((v) => v[0] === d.dataSource)?.[1]}；部署：${tool01Hosts.find((v) => v[0] === d.host)?.[1]}。${check.valid ? "显式教学约束未冲突，仍不是生产方案验证。" : "当前组合有待解决约束：" + check.issues.map((i) => i.text).join("；")}\n组件与交互：${d.interactive ? "需要点击、触屏和键盘事件/状态" : "当前示例以阅读为主"}；正文${d.model === "vite" ? "在本CSR模型的浏览器UI中" : d.contentSide === "server" ? "保留Server职责" : "加入Client依赖子树"}，控件${d.model === "vite" ? "由浏览器React处理" : d.controlSide === "client" ? "放入Client边界" : "保留Server职责（如需交互则冲突）"}。数据读取按职责留在外部服务/构建/服务器环境，只把必要可序列化样例数据传给界面；不要把私有密钥放客户端。Client模块导入子树与作为children传入的Server输出不能混为一谈。\n准备与首访：${tool01Preparation(d)} 逻辑阶段为${tool01Phases(
    d,
  )
    .map((p) => p.title)
    .join(
      " → ",
    )}。不是实际计时、协议抓包或缓存实现；真实框架可流式、并行、预取与缓存。Client Component不等于首次HTML只在浏览器生成；Server Component的执行/输出与HTML SSR不是同一个概念。\n数据与失败：明确公开构建数据、请求时数据或浏览器后取API的时机；加载/错误/重试/取消都有文字反馈，重复开始守卫，取消/切场景后旧结果不得覆盖新尝试，保留可读回退并标明不是本次成功。\n部署与质量：核对静态导出限制与所选平台支持；需要请求时服务就提供匹配运行环境或重新设计需求，不凭Next名称承诺SEO/性能。375px/桌面、长内容、键盘焦点与触屏验收，减少动态不影响阅读与学习，无无意义后台循环，卸载取消回调。\n验收：对照首访HTML和后续交互，分别检查服务器/构建职责与客户端JS；覆盖缺失运行环境、非法边界、失败重试、取消与迟到结果、快速切场景/重置。真正实现后报告实际测试与限制，未测不称已通过。\n边界：${tool01Scope} 学习选择与草稿只保存在本浏览器，不跨设备同步；模拟会话/队列离站清空。T01是工具专题，不是第35课，T09–T12仍为预告。`;
}
