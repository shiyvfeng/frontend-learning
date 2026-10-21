import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { lessons, steps, responsibilities, questions } from "./content";
import "./styles.css";
import { Icon, Roadmap } from "./shared";
import LessonTwo from "./lesson-two";
import LessonThree from "./lesson-three";
import LessonFour from "./lesson-four";
import LessonFive from "./lesson-five";
import LessonSix from "./lesson-six";
import LessonSeven from "./lesson-seven";
import LessonEight from "./lesson-eight";
import {
  lessonCatalog,
  availableLessons,
  availabilityText,
  availabilityFooter,
  nextLessonHint,
} from "./route";
const LessonNine = React.lazy(() => import("./lesson-nine"));
const LessonTen = React.lazy(() => import("./lesson-ten"));
const LessonEleven = React.lazy(() => import("./lesson-eleven"));
const LessonTwelve = React.lazy(() => import("./lesson-twelve"));
const LessonThirteen = React.lazy(() => import("./lesson-thirteen"));
const LessonFourteen = React.lazy(() => import("./lesson-fourteen"));
const LessonFifteen = React.lazy(() => import("./lesson-fifteen"));
const LessonEighteen = React.lazy(() => import("./lesson-eighteen"));
const LessonSeventeen = React.lazy(() => import("./lesson-seventeen"));
const LessonSixteen = React.lazy(() => import("./lesson-sixteen"));
const lessonViews = {
  flex: LessonTwo,
  grid: LessonThree,
  position: LessonFour,
  sizing: LessonFive,
  responsive: LessonSix,
  surface: LessonSeven,
  glass: LessonEight,
  glow: LessonNine,
  mask: LessonTen,
  vector: LessonEleven,
  state: LessonTwelve,
  props: LessonThirteen,
  conditional: LessonFourteen,
  feedback: LessonFifteen,
  machine: LessonSixteen,
  micro: LessonSeventeen,
  presence: LessonEighteen,
};

const STORAGE = "frontend-observatory.lesson1.v1";
const initial = () => ({
  step: 0,
  done: [],
  explored: [],
  treeSeen: false,
  count: 2,
  radius: 16,
  added: false,
  styled: false,
  role: "assistant",
  status: "sent",
  content: "把复杂页面拆成小组件，就能逐个描述、逐个验收。",
  changed: [],
  answers: [null, null, null],
  draft: "",
  generated: false,
  reviewed: false,
});
function readProgress() {
  try {
    const x = JSON.parse(localStorage.getItem(STORAGE));
    if (!x) return initial();
    const b = initial();
    if (Number.isInteger(x.step) && x.step >= 0 && x.step < 5) b.step = x.step;
    b.done = Array.isArray(x.done)
      ? x.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 5)
      : [];
    b.explored = Array.isArray(x.explored)
      ? x.explored.filter((n) => Object.hasOwn(responsibilities, n))
      : [];
    b.changed = Array.isArray(x.changed)
      ? x.changed.filter((n) => ["role", "status", "content"].includes(n))
      : [];
    for (const key of ["treeSeen", "added", "styled", "generated", "reviewed"])
      b[key] = x[key] === true;
    if (Number.isInteger(x.count) && x.count >= 2 && x.count <= 6)
      b.count = x.count;
    if ([4, 16, 28].includes(x.radius)) b.radius = x.radius;
    if (["user", "assistant"].includes(x.role)) b.role = x.role;
    if (["sent", "sending", "error"].includes(x.status)) b.status = x.status;
    if (typeof x.content === "string") b.content = x.content.slice(0, 180);
    if (typeof x.draft === "string") b.draft = x.draft.slice(0, 8000);
    if (Array.isArray(x.answers))
      b.answers = questions.map((q, i) =>
        [0, 1].includes(x.answers[i]) ? x.answers[i] : null,
      );
    return b;
  } catch {
    return initial();
  }
}
function InspectLabel({ name, id = name, selected, onSelect }) {
  return (
    <button
      type="button"
      data-inspector="true"
      className={`inspect-label ${selected === id ? "chosen" : ""}`}
      aria-label={`选择 ${id}`}
      aria-pressed={selected === id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {name}
    </button>
  );
}
function Sidebar(p) {
  return (
    <aside data-owner="Sidebar" className="chat-sidebar">
      <InspectLabel name="Sidebar" {...p} />
      <div className="chat-brand">
        <span className="brand-star">✳</span> 留白
      </div>
      <div className="fake-new">＋ 新的对话</div>
      <small>最近对话</small>
      <div className="fake-conversation">把想法变成页面</div>
      <div className="fake-line">周末的灵感收集</div>
      <div className="sidebar-bottom">
        <span className="avatar mini">L</span> 我的工作区
      </div>
    </aside>
  );
}
function Header(p) {
  return (
    <header data-owner="Header" className="chat-header">
      <div>
        <strong>把想法变成页面</strong>
        <span className="online">示例会话</span>
      </div>
      <InspectLabel name="Header" {...p} />
    </header>
  );
}
function Message({ index, role, status, content, selected, onSelect }) {
  const id = `Message ${index + 1}`;
  return (
    <article data-owner={id} className={`message role-${role}`}>
      <span className={`avatar ${role}`}>{role === "user" ? "你" : "✳"}</span>
      <div className="message-body">
        <strong>{role === "user" ? "你" : "留白助手"}</strong>
        <p>{content || "（内容为空）"}</p>
        <span
          className={`message-status ${status}`}
          role={status === "error" ? "status" : undefined}
        >
          {status === "sending"
            ? "◌ 发送中…"
            : status === "error"
              ? "! 发送失败 · 请重试"
              : "✓ 已发送"}
        </span>
      </div>
      <InspectLabel
        name={`Message · ${index + 1}`}
        id={id}
        selected={selected}
        onSelect={onSelect}
      />
    </article>
  );
}
function MessageList({ data, ...p }) {
  return (
    <div data-owner="MessageList" className="message-list">
      <InspectLabel name="MessageList" {...p} />
      {Array.from({ length: data.count }, (_, i) => (
        <Message
          key={i}
          index={i}
          role={i === 0 ? "user" : i === 1 ? data.role : "assistant"}
          status={i === 1 ? data.status : "sent"}
          content={
            i === 0
              ? "我想做一个聊天页面，应该从哪里开始？"
              : i === 1
                ? data.content
                : `这是第 ${i + 1} 条消息。新的内容，同一个 Message 组件。`
          }
          {...p}
        />
      ))}
    </div>
  );
}
function Composer(p) {
  return (
    <footer data-owner="Composer" className="composer">
      <InspectLabel name="Composer" {...p} />
      <div className="composer-field">
        <span>描述你的想法…</span>
        <span className="send-glyph" aria-hidden="true">
          ↑
        </span>
      </div>
      <small>仅供结构观察，不会发送真实消息</small>
    </footer>
  );
}
function Main({ data, ...p }) {
  return (
    <section data-owner="Main" className="chat-main">
      <div className="main-label" data-inspector="true">
        <InspectLabel name="Main" {...p} />
      </div>
      <Header {...p} />
      <MessageList data={data} {...p} />
      <Composer {...p} />
    </section>
  );
}
function ChatApp({ data, selected, onSelect, demoRef, onInspectClick }) {
  return (
    <div
      ref={demoRef}
      data-owner="ChatApp"
      className="demo-root"
      style={{ "--bubble-radius": `${data.radius}px` }}
      onClick={onInspectClick}
    >
      <Sidebar selected={selected} onSelect={onSelect} />
      <Main data={data} selected={selected} onSelect={onSelect} />
    </div>
  );
}
const node = (id, label, children = []) => ({ id, label, children });
function componentNodes(count) {
  return [
    node("ChatApp", "ChatApp", [
      node("Sidebar", "Sidebar"),
      node("Main", "Main", [
        node("Header", "Header"),
        node(
          "MessageList",
          "MessageList",
          Array.from({ length: count }, (_, i) =>
            node(`Message ${i + 1}`, `Message · ${i + 1}`),
          ),
        ),
        node("Composer", "Composer"),
      ]),
    ]),
  ];
}
function domNodes(root) {
  if (!root) return [];
  const walk = (el, path) => ({
    id: `dom-${path}`,
    label: `<${el.tagName.toLowerCase()}>`,
    owner: el.closest("[data-owner]")?.dataset.owner,
    element: el,
    detail: el.dataset.owner || "",
    children: [...el.children]
      .filter((x) => !x.hasAttribute("data-inspector"))
      .map((x, i) => walk(x, `${path}.${i}`)),
  });
  return [walk(root, "0")];
}
function Tree({ nodes, selected, onSelect, dom = false }) {
  return (
    <ol className="tree-list">
      {nodes.map((n) => (
        <li key={n.id}>
          <button
            className={`tree-node ${selected === n.id ? "active" : ""}`}
            aria-pressed={selected === n.id}
            onClick={() => onSelect(n)}
          >
            <span className="tree-dot" />
            {n.label}
            {dom && n.detail && <small>{n.detail}</small>}
          </button>
          {n.children?.length > 0 && (
            <Tree
              nodes={n.children}
              selected={selected}
              onSelect={onSelect}
              dom={dom}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
function flatten(nodes) {
  return nodes.flatMap((n) => [n, ...flatten(n.children || [])]);
}
function Workbench({ data, patch, mode }) {
  const [selected, setSelected] = useState("Message 2");
  const [treeMode, setTreeMode] = useState("component");
  const [dom, setDom] = useState([]);
  const [domSelected, setDomSelected] = useState("");
  const demoRef = useRef(null);
  useLayoutEffect(() => {
    setDom(domNodes(demoRef.current));
  }, [data.count, data.role, data.status, data.content]);
  useEffect(() => {
    const elements =
      demoRef.current?.querySelectorAll("[data-highlight]") || [];
    elements.forEach((e) => e.removeAttribute("data-highlight"));
    if (treeMode === "component") {
      const el = [
        demoRef.current,
        ...demoRef.current.querySelectorAll("[data-owner]"),
      ].find((e) => e?.dataset.owner === selected);
      el?.setAttribute("data-highlight", "component");
    } else {
      flatten(dom)
        .find((n) => n.id === domSelected)
        ?.element?.setAttribute("data-highlight", "dom");
    }
    return () => {
      demoRef.current
        ?.querySelectorAll("[data-highlight]")
        .forEach((e) => e.removeAttribute("data-highlight"));
      demoRef.current?.removeAttribute("data-highlight");
    };
  }, [selected, domSelected, treeMode, dom]);
  const select = (id) => {
    setSelected(id);
    patch({
      explored: [
        ...new Set([
          ...data.explored,
          id.startsWith("Message ") ? "Message" : id,
        ]),
      ],
    });
    if (treeMode === "dom") {
      setDomSelected(
        flatten(dom).find((n) => n.element?.dataset.owner === id)?.id || "",
      );
    }
  };
  const base = selected.startsWith("Message ") ? "Message" : selected;
  const r = responsibilities[base];
  return (
    <div className="workbench">
      <div className="preview-card">
        <div className="panel-heading">
          <span>
            <i className="live-dot" />
            可点选的界面
          </span>
          <span className="micro">原创教学示例 · 留白</span>
        </div>
        <ChatApp
          data={data}
          selected={selected}
          onSelect={select}
          demoRef={demoRef}
          onInspectClick={(e) => {
            if (e.target.closest("[data-inspector]")) return;
            if (treeMode === "dom") {
              const n = flatten(dom).find((n) => n.element === e.target);
              if (n) {
                setDomSelected(n.id);
                setSelected(n.owner);
              }
            } else {
              const owner = e.target.closest("[data-owner]")?.dataset.owner;
              if (owner) select(owner);
            }
          }}
        />
        <div className="demo-caption">
          <span className="key">↖</span>{" "}
          点击区域或紫色标签，与树双向对应。此示例不代表 ChatGPT 内部实现。
        </div>
      </div>
      <div className="inspector-card">
        <div className="panel-heading">
          <span>
            <Icon type="tree" size={17} />
            结构透视
          </span>
          <span className="micro">同一个界面，两种视角</span>
        </div>
        <div className="segmented" aria-label="选择树的视角">
          <button
            aria-pressed={treeMode === "component"}
            onClick={() => setTreeMode("component")}
          >
            组件树
          </button>
          <button
            aria-pressed={treeMode === "dom"}
            onClick={() => {
              setTreeMode("dom");
              setDomSelected(
                flatten(dom).find((n) => n.element?.dataset.owner === selected)
                  ?.id || "dom-0",
              );
              patch({ treeSeen: true });
            }}
          >
            DOM 树
          </button>
        </div>
        <p className="tree-intro">
          {treeMode === "component"
            ? "按职责组合。缩进表示“谁渲染了谁”。"
            : "来自左侧实际 DOM 的元素树，已省略教学检查按钮和文本节点。"}
        </p>
        <div
          className={`tree-scroll ${treeMode === "dom" ? "dom-tree" : ""}`}
          aria-label={
            treeMode === "dom" ? "示例的 DOM 元素树" : "示例的 React 组件树"
          }
        >
          <Tree
            nodes={treeMode === "dom" ? dom : componentNodes(data.count)}
            selected={treeMode === "dom" ? domSelected : selected}
            onSelect={(n) => {
              if (treeMode === "dom") {
                setDomSelected(n.id);
                select(n.owner);
                setDomSelected(n.id);
              } else select(n.id);
            }}
            dom={treeMode === "dom"}
          />
        </div>
        <div className="selection-info" aria-live="polite">
          <div className="eyebrow">
            {treeMode === "dom" ? "对应的组件职责" : "当前观察"}
          </div>
          <h3>
            {selected} <span>{r?.[0]}</span>
          </h3>
          <p>{r?.[1]}</p>
          <div className="relation">
            <span>
              父级 <b>{r?.[2]}</b>
            </span>
            <span>
              子级 <b>{r?.[3]}</b>
            </span>
          </div>
        </div>
      </div>
      {mode === 0 && (
        <div className="insight full">
          <span className="insight-icon">
            <Icon type="layers" />
          </span>
          <div>
            <strong>组件树 ≠ DOM 树</strong>
            <p>
              组件树表达职责与组合；DOM 是浏览器中的节点结构。看
              Message：一个组件输出了多个 HTML 元素。组件也可能用 Fragment
              组合元素而不增加包装节点；本例未使用 Fragment。文本本身也是 DOM
              节点。React DevTools 看组件，浏览器 Elements 面板看 DOM。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
function App() {
  const [data, setData] = useState(readProgress);
  const [storageMessage, setStorageMessage] =
    useState("进度仅保存在当前浏览器");
  const [course, setCourse] = useState(0);
  const activeLesson = lessonCatalog[course];
  const ActiveLesson = lessonViews[activeLesson.view];
  const [menu, setMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [platform, setPlatform] = useState("React + 原生 CSS");
  const [mobile, setMobile] = useState(true);
  const [failure, setFailure] = useState(true);
  const headingRef = useRef(null);
  const draftRef = useRef(null);
  const dialogRef = useRef(null);
  const resetRef = useRef(null);
  const copyBusy = useRef(false);
  const copyGeneration = useRef(0);
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(data));
      setStorageMessage("进度仅保存在当前浏览器");
    } catch {
      setStorageMessage("浏览器存储不可用；本次进度仅在页面内保留");
    }
  }, [data]);
  useEffect(() => {
    if (confirmReset) {
      dialogRef.current?.showModal();
      dialogRef.current?.querySelector("button")?.focus();
    } else if (dialogRef.current?.open) {
      dialogRef.current.close();
      resetRef.current?.focus();
    }
  }, [confirmReset]);
  useEffect(
    () => () => {
      copyGeneration.current++;
    },
    [],
  );
  const ready = [
    data.explored.includes("Sidebar") &&
      data.explored.includes("Message") &&
      data.treeSeen,
    data.added && data.styled,
    ["role", "status", "content"].every((x) => data.changed.includes(x)),
    questions.every((q, i) => data.answers[i] === q.correct),
    data.generated && data.draft.trim().length >= 80 && data.reviewed,
  ];
  const tasks = [
    [
      [data.explored.includes("Sidebar"), "点选 Sidebar，找到它的父级"],
      [data.explored.includes("Message"), "点选一条 Message，找到它的父级"],
      [data.treeSeen, "切换 DOM 树，看看一个 Message 内部"],
    ],
    [
      [data.added, "新增一个 Message 实例"],
      [data.styled, "改变所有消息的共同圆角"],
    ],
    ["role", "status", "content"].map((x) => [
      data.changed.includes(x),
      `改变 ${x}，观察第二条消息`,
    ]),
    questions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成一份 Agent 指令"],
      [data.reviewed, "检查并确认可执行的验收标准"],
    ],
  ];
  const go = (step) => {
    patch({ step });
    setNotice("");
    setCopied("");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const finish = () => {
    if (!ready[data.step]) {
      setNotice("先完成下方的观察任务，再继续。");
      return;
    }
    patch((old) => ({ done: [...new Set([...old.done, old.step])] }));
    if (data.step < 4) go(data.step + 1);
    else if ([0, 1, 2, 3].every((n) => data.done.includes(n)))
      setNotice(
        "第一节已完成。你已经把界面观察变成了一份可交付的指令；" +
          nextLessonHint(0),
      );
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部步骤继续学习。`,
      );
  };
  const generate = () => {
    const draft = `请为我实现一个原创聊天界面。目标是清晰、易读、可复用。\n\n技术方案：${platform}。先按现有项目约定实现，不为这个界面额外引入动画库。\n\n结构：ChatApp 包含 Sidebar 与 Main；Main 包含 Header、MessageList、Composer；MessageList 根据数组渲染多个 Message。请解释组件职责和父子关系，不要把组件树当成 DOM 元素的一一映射。\n\n数据与复用：Message 接收 role（user / assistant）、status（sent / sending / error）、content；保留每个实例独立的数据。共同圆角使用一个样式规则，初始 ${data.radius}px。新增消息不应复制一套独立组件。${failure ? "错误状态展示文字提示与重试入口；重试时避免重复提交。" : "所有状态提供明确的文字提示。"}\n\n验收：\n1. 初始两条消息；新增一条后只增加一个 Message 实例，统一调整圆角影响全部实例。\n2. 分别改变 role、status、content，只有对应消息的角色、状态、正文发生预期变化。\n3. ${mobile ? "在 375px 手机与 1440px 桌面宽度下无页面横向溢出；窄屏导航可收起，输入区仍可使用。" : "在目标桌面宽度下布局清晰，并说明窄屏适配方案。"}\n4. 按 Tab 可到达所有操作，焦点清晰；输入框有标签；错误不只靠颜色表达。\n5. 尊重 prefers-reduced-motion；避免无必要依赖。说明目标浏览器、兼容性降级与测试结果。\n\n请先列实现计划和待确认的行为，再完成实现并按上述标准自测。截图只能帮助判断外观，不代表真实网站采用的技术。`;
    patch({ draft, generated: true, reviewed: false });
    setCopied("");
  };
  const copy = async () => {
    if (copyBusy.current) return;
    copyBusy.current = true;
    const generation = copyGeneration.current;
    try {
      if (!navigator.clipboard?.writeText) throw Error("unavailable");
      await navigator.clipboard.writeText(data.draft);
      if (generation === copyGeneration.current)
        setCopied("已复制。可以粘贴给 Coding Agent。");
    } catch {
      if (generation === copyGeneration.current) {
        setCopied(
          "自动复制不可用：已选中全文，请按 Ctrl+C / ⌘C；手机可长按复制。",
        );
        draftRef.current?.focus();
        draftRef.current?.select();
      }
    } finally {
      copyBusy.current = false;
    }
  };
  const reset = () => {
    copyGeneration.current++;
    try {
      localStorage.removeItem(STORAGE);
    } catch {}
    setData(initial());
    setCourse(0);
    setMenu(false);
    setNotice("已重置本浏览器的第一节进度和实验数据。");
    setCopied("");
    setPlatform("React + 原生 CSS");
    setMobile(true);
    setFailure(true);
    setConfirmReset(false);
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  useEffect(() => {
    document.title = `${lessons[course][1]} · 前端观察室`;
  }, [course]);
  const step = steps[data.step];
  return (
    <>
      <a className="skip-link" href="#lesson">
        跳到课程内容
      </a>
      <div className="app-shell">
        <aside
          id="mobile-directory"
          className={`course-sidebar ${menu ? "open" : ""}`}
        >
          <a
            className="site-brand"
            href="#lesson"
            onClick={() => {
              setCourse(0);
              setMenu(false);
            }}
          >
            <span className="brand-icon">
              <Icon />
            </span>
            <span>
              前端观察室<small>FRONTEND OBSERVATORY</small>
            </span>
          </a>
          <div className="sidebar-intro">
            看懂效果，
            <br />
            说清实现。
          </div>
          <div className="nav-caption">
            学习路线{" "}
            <span>
              {String(availableLessons.length).padStart(2, "0")} /{" "}
              {lessons.length}
            </span>
          </div>
          <nav aria-label="课程目录">
            {lessons.map((l, i) => (
              <button
                key={l[0]}
                className={`course-link ${course === i ? "current" : ""}`}
                aria-current={course === i ? "page" : undefined}
                onClick={() => {
                  setCourse(i);
                  setMenu(false);
                  requestAnimationFrame(() => headingRef.current?.focus());
                }}
              >
                <span className="course-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{l[0]}</strong>
                  <small>
                    {lessonCatalog[i].available ? l[1] : "尚未制作"}
                  </small>
                </span>
                {lessonCatalog[i].available ? (
                  <span className="available-dot" aria-label="可学习" />
                ) : (
                  <Icon type="lock" size={13} />
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <span className="little-square" /> 给与 Agent 协作的你
            <br />
            <span>不必手写代码，也能判断实现。</span>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <button
              className="mobile-menu"
              aria-expanded={menu}
              aria-controls="mobile-directory"
              onClick={() => setMenu(!menu)}
            >
              {menu ? "关闭目录" : "☰ 课程"}
            </button>
            <div className="breadcrumb">
              学习路线 <span>/</span> {lessons[course][0]}
            </div>
            <div className="saved">
              <span className="saved-dot" />
              {storageMessage}
            </div>
          </header>
          <main id="lesson">
            {activeLesson.view === "structure" ? (
              <>
                <div className="lesson-overline">
                  <span className="pill">第一节 · 结构</span>
                  <span>约 18 分钟</span>
                  <span>无需写代码</span>
                </div>
                <div className="lesson-title">
                  <div>
                    <h1>
                      页面不是一张图<span className="title-period">.</span>
                    </h1>
                    <p>从“看起来像什么”，走向“它由什么组成”。</p>
                  </div>
                  <div className="lesson-stamp" aria-hidden="true">
                    <Icon type="layers" size={32} />
                    <span>
                      LESSON
                      <br />
                      <b>01</b>
                    </span>
                  </div>
                </div>
                <div className="outcome-strip">
                  <span>
                    <Icon type="check" size={16} /> 看懂组件关系
                  </span>
                  <span>
                    <Icon type="check" size={16} /> 分清结构与数据
                  </span>
                  <span>
                    <Icon type="check" size={16} /> 写出可验收的指令
                  </span>
                </div>
                <nav className="stepper" aria-label="第一节学习步骤">
                  {steps.map((s, i) => (
                    <button
                      key={s.short}
                      aria-current={data.step === i ? "step" : undefined}
                      className={`${data.step === i ? "active" : ""} ${data.done.includes(i) ? "completed" : ""}`}
                      onClick={() => go(i)}
                    >
                      <span className="step-circle">
                        {data.done.includes(i) ? (
                          <Icon type="check" size={14} />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span>
                        {s.short}
                        <small>{s.time}</small>
                      </span>
                    </button>
                  ))}
                </nav>
                <section
                  className="lesson-stage"
                  aria-labelledby="stage-heading"
                >
                  <div className="stage-intro">
                    <div className="eyebrow">
                      EXPERIMENT 0{data.step + 1} <span>/ 05</span>
                    </div>
                    <h2 ref={headingRef} tabIndex={-1} id="stage-heading">
                      {step.title}
                    </h2>
                    <p>{step.desc}</p>
                  </div>
                  {data.step < 3 && (
                    <Workbench
                      key={`workbench-${data.step}`}
                      data={data}
                      patch={patch}
                      mode={data.step}
                    />
                  )}
                  {data.step === 1 && (
                    <div className="control-panel">
                      <div>
                        <div className="eyebrow">复用实验</div>
                        <h3>改规则，不逐条重做</h3>
                        <p>
                          当前 <b>{data.count}</b> 个 Message
                          实例，共用一个组件定义。
                        </p>
                      </div>
                      <div className="reuse-controls">
                        <button
                          className="primary"
                          disabled={data.count >= 6}
                          onClick={() =>
                            patch((old) => ({
                              count: Math.min(6, old.count + 1),
                              added: true,
                            }))
                          }
                        >
                          ＋ 新增 Message
                          {data.count >= 6 ? "（已达 6 条上限）" : ""}
                        </button>
                        <fieldset>
                          <legend>共同圆角</legend>
                          {[4, 16, 28].map((r) => (
                            <button
                              key={r}
                              aria-pressed={data.radius === r}
                              onClick={() =>
                                patch({
                                  radius: r,
                                  styled: data.styled || r !== data.radius,
                                })
                              }
                            >
                              {r}px
                            </button>
                          ))}
                        </fieldset>
                      </div>
                      <p className="control-note">
                        观察：树里多了一个实例，组件种类没有增加。先选一个不同的圆角，看看所有消息怎样一起变化。
                      </p>
                    </div>
                  )}
                  {data.step === 2 && (
                    <div className="control-panel props-panel">
                      <div>
                        <div className="eyebrow">MESSAGE · 2 实验台</div>
                        <h3>数据是组件的输入</h3>
                        <p>
                          仅控制第二条消息。Props
                          是传给组件的输入；本实验用表单状态生成它们。
                        </p>
                      </div>
                      <div className="prop-fields">
                        <label>
                          role · 谁发的
                          <select
                            value={data.role}
                            onChange={(e) =>
                              patch({
                                role: e.target.value,
                                changed: [
                                  ...new Set([...data.changed, "role"]),
                                ],
                              })
                            }
                          >
                            <option value="assistant">assistant · 助手</option>
                            <option value="user">user · 用户</option>
                          </select>
                        </label>
                        <label>
                          status · 当前状态
                          <select
                            value={data.status}
                            onChange={(e) =>
                              patch({
                                status: e.target.value,
                                changed: [
                                  ...new Set([...data.changed, "status"]),
                                ],
                              })
                            }
                          >
                            <option value="sent">sent · 已发送</option>
                            <option value="sending">sending · 发送中</option>
                            <option value="error">error · 发送失败</option>
                          </select>
                        </label>
                        <label className="wide-field">
                          content · 消息内容
                          <textarea
                            maxLength={180}
                            rows={2}
                            value={data.content}
                            onChange={(e) =>
                              patch({
                                content: e.target.value,
                                changed: [
                                  ...new Set([...data.changed, "content"]),
                                ],
                              })
                            }
                          />
                          <span className="micro">
                            {data.content.length} / 180 ·
                            纯文本显示，空内容有占位提示
                          </span>
                        </label>
                      </div>
                      <p className="control-note">
                        role 决定角色与对齐，status 决定反馈，content
                        决定正文。参数不同，不等于需要另写一个组件。
                      </p>
                    </div>
                  )}
                  {data.step === 3 && (
                    <div className="quiz-grid">
                      {questions.map((q, i) => {
                        const answer = data.answers[i],
                          isCorrect = answer === q.correct;
                        return (
                          <fieldset
                            className={`quiz-card ${answer !== null ? (isCorrect ? "correct" : "incorrect") : ""}`}
                            key={q.q}
                          >
                            <legend>
                              <span>0{i + 1}</span>
                              {q.q}
                            </legend>
                            <div className="quiz-options">
                              {q.options.map((o, j) => (
                                <button
                                  key={o}
                                  aria-pressed={answer === j}
                                  onClick={() =>
                                    patch((old) => ({
                                      answers: old.answers.map((a, k) =>
                                        k === i ? j : a,
                                      ),
                                    }))
                                  }
                                >
                                  <span className="answer-letter">
                                    {j === 0 ? "A" : "B"}
                                  </span>
                                  {o}
                                  {answer === j && (
                                    <span className="answer-mark">
                                      {isCorrect ? "✓" : "↺"}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                            {answer !== null && (
                              <div className="quiz-feedback" role="status">
                                <strong>
                                  {isCorrect
                                    ? "判断正确"
                                    : "再想一想，可以重新选择"}
                                </strong>
                                <p>{q.why}</p>
                              </div>
                            )}
                          </fieldset>
                        );
                      })}
                    </div>
                  )}
                  {data.step === 4 && (
                    <div className="agent-grid">
                      <div className="agent-options">
                        <span className="agent-icon">
                          <Icon type="spark" size={26} />
                        </span>
                        <h3>你的实现简报</h3>
                        <p>
                          规则生成的可编辑草稿，不会调用 AI 批改或自动发送。
                        </p>
                        <label>
                          技术方案
                          <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                          >
                            <option>React + 原生 CSS</option>
                            <option>沿用现有项目技术栈</option>
                          </select>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={mobile}
                            onChange={(e) => setMobile(e.target.checked)}
                          />
                          加入手机与桌面验收
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={failure}
                            onChange={(e) => setFailure(e.target.checked)}
                          />
                          加入错误与重复点击要求
                        </label>
                        <button className="primary" onClick={generate}>
                          {data.generated ? "重新生成草稿" : "生成 Agent 指令"}
                          <Icon type="arrow" size={17} />
                        </button>
                        <p className="micro">
                          重新生成会覆盖下方编辑。草稿会随进度保存在此浏览器，请勿输入敏感信息。
                        </p>
                      </div>
                      <div className="agent-editor">
                        <div className="panel-heading">
                          <span>给 Coding Agent 的指令</span>
                          <button
                            className="text-button"
                            onClick={copy}
                            disabled={!data.draft.trim()}
                          >
                            <Icon type="copy" size={16} />
                            复制
                          </button>
                        </div>
                        <label className="sr-only" htmlFor="agent-draft">
                          可编辑的 Agent 指令
                        </label>
                        <textarea
                          ref={draftRef}
                          id="agent-draft"
                          maxLength={8000}
                          value={data.draft}
                          onChange={(e) => {
                            patch({ draft: e.target.value, reviewed: false });
                            setCopied("");
                          }}
                          placeholder="先生成草稿，再补充你想要的行为与验收标准。"
                        />
                        <div className="copy-feedback" role="status">
                          {copied ||
                            "你可以直接编辑。复制成功后，仍由你决定在哪里使用。"}
                        </div>
                        <label className="checkbox-label review">
                          <input
                            type="checkbox"
                            checked={data.reviewed}
                            disabled={
                              !data.generated || data.draft.trim().length < 80
                            }
                            onChange={(e) =>
                              patch({ reviewed: e.target.checked })
                            }
                          />
                          我已检查结构、交互和验收标准，能据此判断结果。
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="task-footer">
                    <div>
                      <strong>这一站的小任务</strong>
                      <ul>
                        {tasks[data.step].map(([ok, label]) => (
                          <li key={label} className={ok ? "done" : ""}>
                            <span aria-label={ok ? "已完成" : "未完成"}>
                              {ok ? "✓" : "○"}
                            </span>
                            {label}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="stage-actions">
                      {data.step > 0 && (
                        <button
                          className="text-button"
                          onClick={() => go(data.step - 1)}
                        >
                          ← 上一步
                        </button>
                      )}
                      <button className="primary next-button" onClick={finish}>
                        {data.step === 4
                          ? [0, 1, 2, 3].every((n) => data.done.includes(n))
                            ? "完成第一节"
                            : "保存本站成果"
                          : "完成并继续"}
                        <Icon type="arrow" size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="notice" role="status">
                    {notice}
                  </div>
                </section>
                <div className="lesson-bottom">
                  <span>
                    {data.done.length} / 5 站已完成
                    <span className="progress-track">
                      <span style={{ width: `${data.done.length * 20}%` }} />
                    </span>
                  </span>
                  <button
                    ref={resetRef}
                    className="text-button reset-button"
                    onClick={() => setConfirmReset(true)}
                  >
                    重置本地进度
                  </button>
                </div>
                <Roadmap />
              </>
            ) : ActiveLesson ? (
              <React.Suspense fallback={<p role="status">正在载入本课实验…</p>}>
                <ActiveLesson onStorageStatus={setStorageMessage} />
              </React.Suspense>
            ) : (
              <section className="coming-soon">
                <span className="pill">
                  第 {course + 1} 节 · {lessons[course][0]}
                </span>
                <div className="coming-icon">
                  <Icon type="lock" size={34} />
                </div>
                <h1 ref={headingRef} tabIndex={-1}>
                  {lessons[course][1]}
                </h1>
                <p className="coming-status">尚未制作</p>
                <p>这一节将学习 {lessons[course][2]}。</p>
                <div className="tool-preview">
                  工具会在问题中登场
                  <br />
                  <strong>{lessons[course][3]}</strong>
                </div>
                <p className="micro">{availabilityText}</p>
                <button
                  className="primary"
                  onClick={() => {
                    setCourse(0);
                    requestAnimationFrame(() => headingRef.current?.focus());
                  }}
                >
                  返回第一节
                  <Icon type="arrow" size={18} />
                </button>
                <Roadmap />
              </section>
            )}
            <footer className="site-footer">
              <span>前端观察室 · 从观察到表达</span>
              <span>
                {activeLesson.technology
                  ? `本节：${activeLesson.technology}`
                  : "目录预览 · 尚未制作"}
              </span>
              <span>{availabilityFooter}</span>
            </footer>
          </main>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby="reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setConfirmReset(false);
        }}
      >
        <h2 id="reset-title">重新开始第一节？</h2>
        <p>将清除当前浏览器的进度、实验参数与指令草稿。</p>
        <div className="dialog-actions">
          <button onClick={() => setConfirmReset(false)}>保留进度</button>
          <button className="primary" onClick={reset}>
            确认重置
          </button>
        </div>
      </dialog>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
