import React, { useEffect, useRef, useState } from "react";
import { Icon, Roadmap } from "./shared";
import { nextLessonHint } from "./route";
import {
  SPLINE_STORAGE,
  splineSteps,
  splineQuestions,
  splineSources,
  splineScope,
  splineInitial,
  readSplineProgress,
} from "./lesson-twenty-seven-content";
import SplineWorkbench from "./lesson-twenty-seven-lab";
import "./lesson-twenty-seven.css";
const add = (a, v) => [...new Set([...a, v])];
function SplineReferences() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>第二十七节核对说明与官方来源</span>
        <span className="micro">2026-10-22 核对 ＋</span>
      </summary>
      <div className="roadmap-body">
        <p>
          本课是纯React/HTML/CSS工作流模拟，没有Spline资产、runtime或Three.js渲染，不仿造真实编辑器。官方导出、Code
          API、变量、计划与条款于2026-10-22核对；文档列出的选项不等于当前账号都可免费使用，许可和计划权限需分别确认，并核对条款生效日期。无需账号、付费或上传。
        </p>
        <div className="source-links">
          {splineSources.map(([text, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {text} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
export default function LessonTwentySeven({ onStorageStatus }) {
  const [data, setData] = useState(readSplineProgress),
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
      localStorage.setItem(SPLINE_STORAGE, JSON.stringify(data));
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
      !headingRef.current?.closest(".lesson-twenty-seven")?.contains(active) ||
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
      [data.exported, "生成本地交付记录（非实际导出）"],
      [data.loadedSeen, "完成一次模拟加载"],
      [data.boundaryReviewed, "记录交付、计划与授权边界"],
    ],
    [
      [data.bound, "保存对象/事件/变量规则"],
      [data.eventSeen, "通过DOM入口改变示意变量"],
      [data.guardSeen, "体验绑定失效时阻止写入"],
      [data.recoveredSeen, "修复后重新验证事件"],
    ],
    [
      [data.failureSeen, "体验模拟加载失败"],
      [data.retrySeen, "失败后重试到本地就绪"],
      [data.canceledSeen, "取消进行中的模拟加载"],
      [data.staleSeen, "投递旧结果并核对隔离"],
    ],
    splineQuestions.map((q, i) => [
      data.answers[i] === q.correct,
      `理解判断题 ${i + 1} 的理由`,
    ]),
    [
      [data.generated, "生成Spline集成简报"],
      [
        data.reviewed && data.draft.trim().length >= 80,
        "检查来源、交付、绑定、回退、许可与成本",
      ],
    ],
  ];
  const ready = tasks.map((items) => items.every(([ok]) => ok));
  const step = splineSteps[data.step];
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
      setNotice("第二十七节已完成。" + nextLessonHint(26));
    else
      setNotice(
        `本站成果已保存。还有 ${[0, 1, 2, 3].filter((n) => !data.done.includes(n)).length} 站未完成，可以从顶部继续。`,
      );
  };
  const generate = () => {
    patch({
      draft: `请规划场景资产到网页的交互集成。演练标题：${data.caption}。本课交付仅为工作流模拟，不能宣称运行了Spline或导出了真实资产。

模拟边界：${splineScope} 二维卡片的变化只证明本地绑定规则，不证明Spline资产、shader或运行时成功。若任务要求真正Spline接入，需另行提供合法可用资产并实际安装/验证选定runtime；不能把本演练函数当Spline API。

场景来源与协作：当前选择${data.source === "designer" ? "设计师维护场景" : "程序化数据场景"}。设计师主导、频繁视觉编辑可评估Spline资产流程；大量动态数据与算法对象可优先比较Three.js，也可按官方交付能力组合，并非互斥。普通2D界面先比较DOM/CSS/SVG，不强制3D。不新建账号、付费或上传私人文件来获得演练素材。

设计、资产与运行时：分别写清设计工具负责创作/协作、交付记录指向什么资产、网页选用什么runtime/Viewer/Code路径。当前${data.delivery === "runtime" ? "网页运行时" : "静态图片"}仅生成本地模拟记录，不实际导出。静态图片不自带场景对象事件，网页自身仍可有DOM交互；不要把不同交付形式当成保留全部交互的等价转换。

事件/对象/变量：本例规则为${data.event === "activate" ? "真实DOM按钮激活" : "真实DOM聚焦"}→${data.target === "stage" ? "展示台" : "标签牌"}→${data.variable}切换取值。标签和ID属于本地示意数据，不是可复用Spline对象ID。正式资产按所选SDK版本核对对象ID/名称、事件和变量名/类型；资产改名或删除后验证绑定，不静默改到其他对象。配置修改后重存规则，未保存、目标缺失或类型不符时拒绝写入并反馈，修复后重试。

加载与失败：演练使用手动投递的本地结果，无网络、上传或定时等待；本地就绪不代表Spline加载成功。正式集成需明确加载中、成功、失败、重试、取消与文字/控件替代，保留必要内容。重复开始不创建并发重复请求；取消/交付条件变化使旧代次失效，迟到结果不得覆盖新会话。演练开始时捕获结果选项，后改开关只影响下一次；队列最多8条，满时先排空旧结果，不无限积压。

许可、计划与导出：按实施时的当前账号计划、实际导出面板、资产来源授权及生效条款确认；计划功能权限与素材许可分别核对。官方列出Web/Code等路径不等于任意账号均免费可用，也不承诺任意格式、无限变量、所有交互或商用权。核对官方当期文档和选定runtime API，不把Code API与编辑器里的Real-time API混为一谈。

输入、性能与清理：DOM事件入口有原生按钮，键盘/触屏无需hover或拖拽；聚焦只在焦点进入触发，可用明确的送焦点按钮。必要语义在画面外，错误反馈不只靠颜色。正式3D场景按目标设备设置几何/贴图、像素密度、帧率/按需渲染和加载预算，提供减少动态与不支持/低性能回退；本演练无3D硬件性能证据。取消、重置、离课清理回调/绑定/运行时，旧结果不能写新状态；本地示意会话/队列不跨刷新保留，学习标记和配置仅存当前浏览器。

验收：真实DOM点击/聚焦与触屏替代、对象及变量类型隔离、绑定失效/修复、失败重试/取消、重复开始、迟到与乱序旧结果、队列上限、重置与离课。桌面/375px、axe、真实Tab、正常/系统reduce零键盘触屏完成错题重试、示例和真实编辑、复制回退、刷新、取消/确认重置保留01–26。醒目标明工作流模拟，网络检查无Spline/Three资产或SDK加载。只实现27，不开始28。`,
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
      localStorage.removeItem(SPLINE_STORAGE);
    } catch {}
    setData(splineInitial());

    setInstanceEpoch((n) => n + 1);
    setResetOpen(false);
    setCopyMessage("");
    setNotice("已重置第二十七节的进度、参数与草稿；前二十六节进度已保留。");
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
    <div className="lesson-two lesson-twenty-seven">
      <div className="lesson-overline">
        <span className="pill">第二十七节 · Spline（工作流模拟）</span>
        <span>约 18 分钟</span>
        <span>无需写代码</span>
      </div>
      <div className="lesson-title">
        <div>
          <h1>
            Spline<span className="title-period">.</span>
          </h1>
          <p>从设计交付到网页事件，先辨认每一层，再写清绑定与回退。</p>
          <p className="spline27-hero-boundary">
            <strong>工作流模拟 · 未运行Spline</strong> ·
            二维示意，不是真实编辑器或3D预览
          </p>
        </div>
        <div className="lesson-stamp" aria-hidden="true">
          <Icon type="layers" size={32} />
          <span>
            LESSON
            <br />
            <b>27</b>
          </span>
        </div>
      </div>
      <div className="outcome-strip">
        <span>
          <Icon type="check" size={16} /> 区分设计与运行时
        </span>
        <span>
          <Icon type="check" size={16} /> 验证事件与变量
        </span>
        <span>
          <Icon type="check" size={16} /> 限制预算与回退
        </span>
      </div>
      <nav className="stepper" aria-label="第二十七节学习步骤">
        {splineSteps.map((s, i) => (
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
      <section
        className="lesson-stage"
        aria-labelledby="spline27-stage-heading"
      >
        <div className="stage-intro">
          <div className="eyebrow">
            WORKFLOW LAB 0{data.step + 1} <span>/ 05</span>
          </div>
          <h2 id="spline27-stage-heading" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h2>
          <p>{step.desc}</p>
        </div>
        {data.step < 3 && (
          <SplineWorkbench key={instanceEpoch} data={data} patch={patch} />
        )}
        {data.step === 3 && (
          <div className="quiz-grid">
            {splineQuestions.map((q, i) => {
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
              <h3>你的Spline集成简报</h3>
              <p>由本地规则生成，可编辑，不调用 AI 批改或自动发送。</p>
              <button className="primary" onClick={generate}>
                {data.generated
                  ? "重新生成Spline集成草稿"
                  : "生成Spline集成指令"}
                <Icon type="arrow" size={17} />
              </button>
              <p className="micro">
                重新生成会覆盖编辑。草稿仅保存在当前浏览器，请勿填写敏感信息。
              </p>
            </div>
            <div className="agent-editor">
              <div className="panel-heading">
                <span>给 Coding Agent 的Spline集成指令</span>
                <button
                  className="text-button"
                  disabled={!data.draft.trim()}
                  onClick={copy}
                >
                  <Icon type="copy" size={16} />
                  复制Spline集成指令
                </button>
              </div>
              <label className="sr-only" htmlFor="spline27-agent-draft">
                可编辑的 Spline集成 Agent 指令
              </label>
              <textarea
                id="spline27-agent-draft"
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
                placeholder="生成后，补充 资产来源、事件绑定与加载回退。"
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
                我已检查 来源、交付、绑定、回退、许可与成本。
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
                  ? "完成第二十七节"
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
          重置第二十七节进度
        </button>
      </div>
      <SplineReferences />
      <Roadmap />
      <dialog
        ref={dialogRef}
        aria-labelledby="spline27-reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setResetOpen(false);
        }}
      >
        <h2 id="spline27-reset-title">重新开始第二十七节？</h2>
        <p>仅清除第二十七节的进度、实验参数和草稿；前二十六节进度保留。</p>
        <div className="dialog-actions">
          <button onClick={() => setResetOpen(false)}>
            保留第二十七节进度
          </button>
          <button className="primary" onClick={reset}>
            确认重置第二十七节
          </button>
        </div>
      </dialog>
    </div>
  );
}
