import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  GL_STORAGE,
  glSteps,
  glQuestions,
  glSources,
  glScope,
  glInitial,
  readGLProgress,
} from "./lesson-twenty-five-content";
import GLWorkbench from "./lesson-twenty-five-lab";
import "./lesson-twenty-five.css";
const add = (a, v) => [...new Set([...a, v])];
function GLReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十五节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课真实编译链接WebGL
          1程序，把参数传入uniform后绘制两个三角形的二维波纹。没有3D模型、图形库或自动播放。静态采样与明确标注的CSS回退均能完成学习；软件渲染不作为GPU性能证据。官方资料于2026-10-22核对。
        </p>
        <div className="source-links">
          {glSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwentyFive({ onStorageStatus }) {
  const [data, setData] = useState(readGLProgress),
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
      localStorage.setItem(GL_STORAGE, JSON.stringify(data));
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
      !headingRef.current?.closest(".lesson-twenty-five")?.contains(active) ||
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
      [data.parameterChanged, "调节效果参数，区分真实绘制与回退"],
      [data.sampled, "切换一个静态相位采样"],
    ],
    [
      [data.centerChanged, "通过短按或按钮改变中心"],
      [data.compared, "记录Canvas、WebGL与3D区别"],
    ],
    [
      [data.budgetChanged, "切换低分辨率预算"],
      [data.fallbackReviewed, "体验明确标注的CSS回退"],
      [data.inspected, "读取上下文或回退说明"],
    ],
    glQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成WebGL效果简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查效果、uniform、预算、回退与清理",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = glSteps[data.step];
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
      setNotice("第二十五节已完成。" + nextLessonHint(24));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请实现可访问、成本有上限的二维WebGL波纹。标题：${data.caption}。用户只需辨认效果与调参，不要求手写GLSL或记矩阵。

效果目标与技术边界：${glScope} Canvas是承载表面，WebGL是绘图API，3D是内容组织；不能把三个概念画等号。简单界面优先比较CSS/SVG/Canvas 2D，不能宣称WebGL总更快。

参数与输入：强度${Math.round(data.amp * 100)}%、密度${data.frequency}、静态采样相位${data.phase.toFixed(2)}、中心(${data.cx.toFixed(2)},${data.cy.toFixed(2)})与当前位图尺寸实际传入uniform，并调用drawArrays重绘。强度0仍有基础条纹，不谎称清空；相位仅离散采样，不冒充播放时间。短按中心从当前CSS矩形归一化，GL纵轴自底向上；外部左/中/右按钮提供键盘与触屏替代，不依赖hover/拖拽。滑动、长按、pointercancel/leave/blur取消定位，保留页面滚动。

性能预算：一次绘制两个三角形，不加载图片纹理、不跑多重噪声循环、不默认自动播放。常规DPR最多1.5，低预算最多0.75；按CSS尺寸、系统DPR和实现上限保持比例，位图每边不超过1024且尊重MAX_RENDERBUFFER_SIZE/MAX_VIEWPORT_DIMS。resize/DPR变化重测，不用无限放大canvas；输入合并最多一个待处理rAF，空闲无持续循环。软件WebGL只证明API与像素路径可用，不证明硬件GPU帧率；低性能须在目标设备实测，再降分辨率或使用清楚标注的CSS静态回退。不要虚构自动帧率判定。

错误与恢复：getContext失败、真实shader编译/程序链接失败、webglcontextlost都保留文本与参数、标明CSS回退不是shader结果，不能假成功。编译/链接失败删除已创建的部分资源；重试重新编译链接。contextlost preventDefault允许恢复，restored后重新建立program/buffer/shader/uniform位置，不复用旧资源。模拟不支持只是主动体验回退。必要内容与操作在Canvas外，回退也能完成所有学习门槛。

生命周期与减少动态：本例始终静态，无闪烁和自动播放，系统reduce实时显示且不妨碍调参采样。隐藏取消待处理帧、删除program/shader/buffer并缩小位图；返回按最新参数重建；重置、换站与卸载取消回调/监听/observer并释放GL上下文，旧代次不得绘制新会话。不把可访问文字烘焙进GPU画面，不逐帧live播报。

验收：真实WebGL上下文、uniform值和readPixels变化，不能只断言文字；DPR/尺寸上限、真实短按、快速参数变化、编译/链接故障、丢失恢复、隐藏/卸载资源释放、无后台循环。桌面/375px、axe、真实Tab及正常/系统reduce零键盘触屏完成错题重试、示例与真实编辑、复制回退、刷新、取消/确认重置，保留01–24进度。明确软件渲染/模拟事件与真实硬件测试的区别。只实现25，不开始26。`,
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
      localStorage.removeItem(GL_STORAGE);
    } catch {}
    setData(glInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十五节的进度、参数与草稿；前二十四节进度已保留。");
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
    <div className="lesson-two lesson-twenty-five">
      <div className="lesson-overline">
        <span className="pill">第二十五节 · WebGL / Shader</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            WebGL / Shader<span className="title-period">.</span>
          </h1>
          <p>用参数改变像素规则，先写清效果，再写清成本与回退。</p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>25</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 辨认真实shader
        </span>
        <span>
          <Icon type="check" size={16} /> 理解参数入口
        </span>
        <span>
          <Icon type="check" size={16} /> 限制预算与回退
        </span>
      </div>
      <nav className="stepper" aria-label="第二十五节学习步骤">
        {glSteps.map((s, i) => (
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
      <section className="lesson-stage" aria-labelledby="gl25-stage-heading">
        <div className="stage-intro">
          <div className="eyebrow">
            WEBGL LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="gl25-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <GLWorkbench
            key={`${instanceEpoch}-${data.step}`}
            data={data}
            patch={patch}
          />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {glQuestions.map((q, i) => {
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
              <h3>你的WebGL效果简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated ? "重新生成WebGL效果草稿" : "生成WebGL效果指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的WebGL效果指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制WebGL效果指令
                </button>
              </div>
              <label className="sr-only" htmlFor="gl25-agent-draft">
                可编辑的 WebGL效果 Agent 指令
              </label>
              <textarea
                id="gl25-agent-draft"
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
                placeholder="生成后，补充 效果目标、性能预算与回退验收。"
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
                我已检查 效果、uniform、预算、回退与清理。
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
                  ? "完成第二十五节"
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
          重置第二十五节进度
        </button>
      </div>
      <GLReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="gl25-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="gl25-reset-title">重新开始第二十五节？</h2>
        <p>仅清除第二十五节的进度、实验参数和草稿；前二十四节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留第二十五节进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置第二十五节
          </button>
        </div>
      </dialog>
    </div>
  );
}
