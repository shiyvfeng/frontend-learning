import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  THREE_STORAGE,
  threeSteps,
  threeQuestions,
  threeSources,
  threeScope,
  threeInitial,
  readThreeProgress,
} from "./lesson-twenty-six-content";
import ThreeWorkbench from "./lesson-twenty-six-lab";
import "./lesson-twenty-six.css";
const add = (a, v) => [...new Set([...a, v])];
function ThreeReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十六节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课固定Three.js
          0.186.1（r186），真实动态导入本地打包模块并用WebGLRenderer/WebGL
          2绘制两个自制网格。无外链模型、视频或CSS
          3D；按需渲染，不自动旋转。软件渲染仅验证机制，不作为硬件性能证据。官方文档及版本于2026-10-22核对。
        </p>
        <div className="source-links">
          {threeSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwentySix({ onStorageStatus }) {
  const [data, setData] = useState(readThreeProgress),
    [notice, setNotice] = useState(""),
    [copyMessage, setCopyMessage] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const headingRef = useRef(null),
    draftRef = useRef(null),
    dialogRef = useRef(null),
    resetRef = useRef(null),
    generation = useRef(0),
    copyBusy = useRef(false),
    navigationFrame = useRef(0),
    focusRevision = useRef(0);
  const patch = (x) =>
    setData((old) => ({ ...old, ...(typeof x === "function" ? x(old) : x) }));
  useEffect(() => {
    try {
      localStorage.setItem(THREE_STORAGE, JSON.stringify(data));
      onStorageStatus("进度仅保存在当前浏览器");
    } catch {
      onStorageStatus("浏览器存储不可用；本次进度仅在页面内保留");
    }
  }, [data, onStorageStatus]);
  useEffect(() => {
    const trackFocus = () => focusRevision.current++;
    document.addEventListener("focusin", trackFocus);
    const active = document.activeElement;
    if (
      !headingRef.current?.closest(".lesson-twenty-six")?.contains(active) ||
      active === headingRef.current
    )
      headingRef.current?.focus();
    return () => {
      generation.current++;
      document.removeEventListener("focusin", trackFocus);
      if (navigationFrame.current)
        cancelAnimationFrame(navigationFrame.current);
    };
  }, []);
  useEffect(() => {
    if (resetOpen) {
      dialogRef.current?.showModal();
      dialogRef.current?.querySelector("button")?.focus();
    } else if (dialogRef.current?.open) {
      dialogRef.current.close();
      resetRef.current?.focus();
    }
  }, [resetOpen]);
  const [instanceEpoch, setInstanceEpoch] = useState(0);
  const tasks = [
    [
      [data.objectChanged, "调整对象参数，核对真实绘制或回退"],
      [data.rolesReviewed, "记录scene/camera/mesh/material/light职责"],
    ],
    [
      [data.viewChanged, "切换相机视角"],
      [data.lightChanged, "改变主光强度"],
      [data.cameraReset, "体验相机重置"],
    ],
    [
      [data.budgetChanged, "切换低分辨率预算"],
      [data.fallbackReviewed, "体验明确的非3D回退"],
      [data.inspected, "读取场景或回退说明"],
    ],
    threeQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成Three.js场景简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查对象、视角、材质、交互、加载与预算",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = threeSteps[data.step];
  const go = (next) => {
    const before = document.activeElement,
      revision = focusRevision.current,
      focusId = ++generation.current;
    patch({ step: next });
    setNotice("");
    setCopyMessage("");
    if (navigationFrame.current) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      if (generation.current !== focusId || focusRevision.current !== revision)
        return;
      navigationFrame.current = 0;
      const active = document.activeElement;
      if (active === before || active === document.body)
        headingRef.current?.focus();
    });
  };
  const finish = () => {
    if (!ready[data.step]) {
      setNotice(
        "先完成这一站的小任务，再继续。可以反复操作，进度不会重复计数。",
      );
      return;
    }
    patch((old) => ({ done: add(old.done, old.step) }));
    if (data.step < 4) go(data.step + 1);
    else if ([0, 1, 2, 3].every((n) => data.done.includes(n)))
      setNotice("第二十六节已完成。" + nextLessonHint(25));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请实现可访问、按需渲染的Three.js几何展示。标题：${data.caption}。用户无需手写代码或记矩阵；普通2D信息卡片仍先比较CSS/SVG，不强制3D。

真实机制与对象：${threeScope} 固定依赖版本，不从未知CDN或外链下载模型。Scene组织两个自制网格和灯光；geometry为立方体与地面形状，Mesh组合geometry/material，renderer实际绘制，不用CSS旋转Canvas冒充场景。

视角与交互：相机使用PerspectiveCamera(42度视野、near0.1、far50)，预设正面/斜侧/俯视并lookAt对象中心。当前${data.view}视角；按钮切换并提供回到斜侧默认的重置。对象绕Y轴${Math.round((data.turn * 180) / Math.PI)}度、尺寸${data.size.toFixed(2)}倍，改变对象不等于改变相机。外部原生按钮/滑块允许键盘和触屏，不把拖拽、hover或滚轮作为唯一通路，不捕获画面手势或劫持页面滚动。

材质与光照：立方体用MeshStandardMaterial，当前${data.metal ? "金属感" : "哑光"}；灯光为AmbientLight补光与DirectionalLight主光，主光强度${data.light}。粗糙度/金属度改变真实材质，主光改变真实灯光；这是简化照明实验，不是产品实拍或真实材质测量。说明不同材质对灯光的依赖不同，材质不是灯光的别名。

加载失败与回退：本地打包模块动态import，加载中有文字说明；模块加载失败提供重新加载页面的明确入口，本地进度保留，重进第26课继续。不要承诺浏览器同页动态import一定能绕过失败缓存。WebGL 2不可用、材质shader错误或webglcontextlost都保留参数和原生控件，明确文字/CSS回退不是真实3D成功。模拟开关仅演示回退。上下文恢复时重新创建renderer、geometry/material和相机灯光，不复用失效资源。异步模块迟到时先核对组件仍存活，隐藏时不创建资源；返回按最新参数重建，不能向已离开的课程挂renderer。必要语义和完成路径在画面外，回退也能学习。

性能与尺寸：两个自制网格、无贴图、阴影贴图、外链资产或后处理；常规DPR最多1.5，低预算0.75，每边不超过1024px且尊重WebGL实现上限。按容器尺寸更新camera.aspect/updateProjectionMatrix和位图，不能CSS拉伸画面；监听resize/DPR变化。最多合并一个待处理rAF，参数变更才render，无持续自动旋转。目标设备实测后决定预算/回退，软件WebGL不能当作真实GPU性能或帧率证据。

清理与减少动态：系统reduce实时显示，静态参数与全部门槛仍可完成；不要求播放动画。隐藏取消待处理帧、解绑当前program/VAO、dispose几何/材质/renderer并缩小位图，返回重建；重置、换站、离课和卸载还清理observer/媒体/事件。支持可选扩展时主动丢弃上下文，否则由浏览器回收；删除对象不等于自动释放GPU资源。旧帧/迟到加载不能改新会话，控件焦点不因渲染或回退失效。

验收：实际Three.js版本/对象/相机/灯光/renderer与像素变化，不只断言文字；对象与相机分别重置、快速输入、尺寸/DPR预算、加载失败重试、真实上下文丢失恢复、隐藏/卸载清理、减少动态中途切换。桌面/375px、axe、真实Tab和正常/系统reduce零键盘触屏，错题重试、示例与真实编辑、复制、刷新、取消/确认重置保留01–25进度。只实现26，不开始27。`,
      generated: true,
      reviewed: false,
    });
    setCopyMessage("");
  };
  const copy = async () => {
    if (copyBusy.current) return;
    copyBusy.current = true;
    const id = generation.current;
    try {
      if (!navigator.clipboard?.writeText) throw Error("unavailable");
      await navigator.clipboard.writeText(data.draft);
      if (id === generation.current)
        setCopyMessage("已复制，可以粘贴给 Coding Agent。");
    } catch {
      if (id === generation.current) {
        setCopyMessage(
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
    dialogRef.current?.close();
    resetRef.current?.focus();
    const before = document.activeElement,
      revision = focusRevision.current,
      focusId = ++generation.current;
    try {
      localStorage.removeItem(THREE_STORAGE);
    } catch {}
    setData(threeInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十六节的进度、参数与草稿；前二十五节进度已保留。");
    if (navigationFrame.current) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      if (generation.current !== focusId || focusRevision.current !== revision)
        return;
      navigationFrame.current = 0;
      const active = document.activeElement;
      if (
        active === before ||
        active === document.body ||
        active === resetRef.current
      )
        headingRef.current?.focus();
    });
  };
  return (
    <div className="lesson-two lesson-twenty-six">
      <div className="lesson-overline">
        <span className="pill">第二十六节 · Three.js</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Three.js<span className="title-period">.</span>
          </h1>
          <p>用对象、视角与光照描述三维画面，把成本和回退写清。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>26</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 辨认真实三维场景
        </span>
        <span>
          <Icon type="check" size={16} /> 区分视角与物体
        </span>
        <span>
          <Icon type="check" size={16} /> 限制预算与回退
        </span>
      </div>
      <nav className="stepper" aria-label="第二十六节学习步骤">
        {threeSteps.map((s, i) => (
          <button
            key={s.short}
            aria-current={data.step === i ? "step" : undefined}
            className={`${data.step === i ? "active" : ""} ${data.done.includes(i) ? "completed" : ""}`}
            onClick={() => go(i)}
          >
            <span className="step-circle">
              {data.done.includes(i) ? <Icon type="check" size={14} /> : i + 1}
            </span>
            <span>
              {s.short}
              <small>{s.time}</small>
            </span>
          </button>
        ))}
      </nav>
      <section className="lesson-stage" aria-labelledby="three26-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            THREE.JS LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="three26-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <ThreeWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {threeQuestions.map((q, i) => {
              const answer = data.answers[i],
                correct = answer === q.correct;
              return (
                <fieldset
                  key={q.q}
                  className={`quiz-card ${answer !== null ? (correct ? "correct" : "incorrect") : ""}`}
                >
                  <legend>
                    <span>0{i + 1}</span>
                    {q.q}
                  </legend>
                  <div className="quiz-options">
                    {q.options.map((option, j) => (
                      <button
                        key={option}
                        aria-pressed={answer === j}
                        onClick={() =>
                          patch((old) => ({
                            answers: old.answers.map((v, k) =>
                              k === i ? j : v,
                            ),
                          }))
                        }
                      >
                        <span className="answer-letter">
                          {j === 0 ? "A" : "B"}
                        </span>
                        {option}
                        {answer === j && (
                          <span className="answer-mark">
                            {correct ? "✓" : "↺"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {answer !== null && (
                    <div className="quiz-feedback" role="status">
                      <strong>
                        {correct ? "判断正确" : "再想一想，可以重新选择"}
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
              <h3>你的Three.js场景简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated
                  ? "重新生成Three.js场景草稿"
                  : "生成Three.js场景指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的Three.js场景指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制Three.js场景指令
                </button>
              </div>
              <label className="sr-only" htmlFor="three26-agent-draft">
                可编辑的 Three.js场景 Agent 指令
              </label>
              <textarea
                id="three26-agent-draft"
                onFocus={(event) =>
                  event.currentTarget.scrollIntoView({
                    block: "center",
                    behavior: "auto",
                  })
                }
                ref={draftRef}
                value={data.draft}
                maxLength={8000}
                onChange={(e) => {
                  patch({ draft: e.target.value, reviewed: false });
                  setCopyMessage("");
                }}
                placeholder="生成后，补充 对象、视角、材质与失败验收。"
              />
              <div className="copy-feedback" role="status">
                {copyMessage || "你可以修改全文。复制后，由你决定在哪里使用。"}
              </div>
              <label className="checkbox-label review">
                <input
                  type="checkbox"
                  disabled={!data.generated || data.draft.trim().length < 80}
                  checked={data.reviewed}
                  onChange={(e) => patch({ reviewed: e.target.checked })}
                />
                我已检查 对象、视角、材质、交互、加载与预算。
              </label>
            </div>
          </div>
        )}
        <div className="task-footer">
          <div>
            <strong>这一站的小任务</strong>
            <ul>
              {tasks[data.step].map(([ok, text]) => (
                <li key={text} className={ok ? "done" : ""}>
                  <span aria-label={ok ? "已完成" : "未完成"}>
                    {ok ? "✓" : "○"}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="stage-actions">
            {data.step > 0 && (
              <button className="text-button" onClick={() => go(data.step - 1)}>
                ← 上一步
              </button>
            )}
            <button className="primary next-button" onClick={finish}>
              {data.step < 4
                ? "完成并继续"
                : [0, 1, 2, 3].every((n) => data.done.includes(n))
                  ? "完成第二十六节"
                  : "保存本站成果"}
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
          className="text-button reset-button"
          ref={resetRef}
          onClick={() => setResetOpen(true)}
        >
          重置第二十六节进度
        </button>
      </div>
      <ThreeReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="three26-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="three26-reset-title">重新开始第二十六节？</h2>
        <p>仅清除第二十六节的进度、实验参数和草稿；前二十五节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留第二十六节进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置第二十六节
          </button>
        </div>
      </dialog>
    </div>
  );
}
