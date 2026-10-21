export { courseRoute as lessons } from "./route";
export const steps = [
  {
    short: "拆开界面",
    title: "先看职责，再看关系",
    time: "4 分钟",
    desc: "点一下左侧界面，看看它在右侧属于谁。再切换 DOM 树，观察同一界面的另一种组织方式。",
  },
  {
    short: "试试复用",
    title: "一套组件，可以出现很多次",
    time: "3 分钟",
    desc: "新增一条 Message，再统一改变圆角。你改的是共同规则，每条消息仍拥有自己的内容。",
  },
  {
    short: "改变参数",
    title: "同一个 Message，不同的样子",
    time: "4 分钟",
    desc: "不用改代码。把 role、status、content 当作三个旋钮，看看数据如何改变界面。",
  },
  {
    short: "判断一下",
    title: "你能从界面推断什么？",
    time: "3 分钟",
    desc: "三个小判断。答错可以再试；重点是看懂理由，而不是记住答案。",
  },
  {
    short: "交给 Agent",
    title: "把观察变成一条好指令",
    time: "4 分钟",
    desc: "选好要求，生成草稿，再亲自编辑。验收标准越具体，Coding Agent 越容易做出你要的效果。",
  },
];
export const responsibilities = {
  ChatApp: [
    "整个聊天工作区",
    "组合 Sidebar 和 Main，负责页面级结构。",
    "无（本例根组件）",
    "Sidebar、Main",
  ],
  Sidebar: ["会话导航", "呈现会话入口，与主要内容区域并列。", "ChatApp", "无"],
  Main: [
    "主要内容容器",
    "组合顶部信息、消息列表与输入区域。",
    "ChatApp",
    "Header、MessageList、Composer",
  ],
  Header: [
    "当前会话信息",
    "展示标题与状态，不负责呈现整段消息。",
    "Main",
    "无",
  ],
  MessageList: [
    "消息集合",
    "按数据顺序呈现多个 Message 实例。",
    "Main",
    "多个 Message",
  ],
  Message: [
    "一条消息",
    "接收 role、status、content；共同样式可复用。",
    "MessageList",
    "无（本例内部直接使用 HTML 元素）",
  ],
  Composer: [
    "输入区域",
    "提供输入与发送入口；本教学示例仅用于观察。",
    "Main",
    "无",
  ],
};
export const questions = [
  {
    q: "看到三条样式相似的消息，可以要求 Agent 复用一个 Message 组件吗？",
    options: ["可以，作为一种合理的实现方案", "不可以，每条都必须独立手写"],
    correct: 0,
    why: "重复的职责和视觉规则适合复用。每条消息是独立实例，用参数区分内容；这是一种实现建议，不是对原站源码的断言。",
  },
  {
    q: "截图中有一个消息气泡，就代表 DOM 里恰好只有一个元素？",
    options: [
      "是，一块可见区域对应一个元素",
      "否，一个组件可以输出多个 DOM 元素",
    ],
    correct: 1,
    why: "本例一个 Message 里就有 article、头像 span、正文 div、strong、p 等元素。组件按职责组织，DOM 按浏览器节点组织；Fragment 甚至不会增加包装元素。",
  },
  {
    q: "只看一张截图，就能确定网站用了 React 或 GSAP？",
    options: ["能，外观会暴露唯一技术", "不能，需要源码或运行时等证据"],
    correct: 1,
    why: "不同工具可以做出相近效果。先描述结构与行为，再提出可验证的实现假设；静态截图连交互过程都无法展示。",
  },
];
export const sources = [
  ["React：UI 树", "https://react.dev/learn/understanding-your-ui-as-a-tree"],
  ["React：组件拆分", "https://react.dev/learn/thinking-in-react"],
  ["React：Props", "https://react.dev/learn/passing-props-to-a-component"],
  [
    "MDN：DOM",
    "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model",
  ],
  [
    "MDN：滚动驱动动画",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations",
  ],
  [
    "MDN：锚点定位",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning",
  ],
  [
    "MDN：View Transitions",
    "https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API",
  ],
  ["Motion：布局动画", "https://motion.dev/docs/react-layout-animations"],
  ["Base UI：可访问性", "https://base-ui.com/react/overview/accessibility"],
  ["dotLottie：状态机", "https://lottiefiles.com/state-machines"],
  ["Rive：状态机", "https://rive.app/docs/runtimes/state-machines"],
];
