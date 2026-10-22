import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { sharedItems, sharedScope } from "./lesson-twenty-one-content";
const OWNER = Symbol.for("frontend-lesson21-transition-owner");
const pair = (id) => `lesson21-${id.toLowerCase()}`;
function Art({ item, hero, register, named }) {
  return (
    <div
      ref={register}
      className={`shared-art ${hero ? "hero" : "thumb"}`}
      data-art={item.id}
      style={{
        background: item.color,
        viewTransitionName: named ? pair(item.id) : "none",
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet">
        <circle cx={item.id === "B" ? 230 : 76} cy="52" r="24" fill="#fff2cc" />
        <path
          d={
            item.id === "B"
              ? "M0 115 Q80 65 160 115 T320 115 V180 H0Z"
              : "M0 180 L110 65 L188 145 L245 88 L320 180Z"
          }
          fill="#fff"
          opacity=".7"
        />
        <path
          d="M0 155 Q90 125 170 157 T320 150 V180 H0Z"
          fill="#24223d"
          opacity=".45"
        />
      </svg>
    </div>
  );
}
export default function SharedWorkbench({ data, patch }) {
  const [model, setModel] = useState({ id: null, version: 0 }),
    [notes, setNotes] = useState({ A: "", B: "", C: "" }),
    [missing, setMissing] = useState([]),
    [message, setMessage] = useState(
      "本地插画实验，无网络、私人文件或真实数据请求。",
    ),
    [inspection, setInspection] = useState("");
  const view = useRef(null),
    heading = useRef(null),
    sourceButtons = useRef({}),
    arts = useRef({}),
    modelRef = useRef(model),
    missingRef = useRef(missing),
    alive = useRef(true),
    seq = useRef(0),
    active = useRef(null),
    pending = useRef(null),
    focusPlan = useRef(null),
    serial = useRef(0),
    owner = useRef(Symbol("lesson21")),
    pairRef = useRef(null),
    requests = useRef(0),
    liveTransitions = useRef(new Set()),
    opts = useRef(data),
    patchRef = useRef(patch);
  const [systemReduce, setSystemReduce] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  opts.current = { ...data, systemReduce };
  patchRef.current = patch;
  missingRef.current = missing;
  const cleanupRoot = () => {
    const root = document.documentElement;
    if (
      root[OWNER] === owner.current &&
      !active.current &&
      liveTransitions.current.size === 0
    ) {
      root.classList.remove("lesson21-transition");
      root.style.removeProperty("--shared-duration");
      delete root[OWNER];
    }
  };
  const commit = (next, plan, sync) => {
    if (!alive.current) return;
    const previous = modelRef.current;
    const value = { id: next, version: previous.version + 1 };
    modelRef.current = value;
    focusPlan.current = plan;
    const update = () => setModel(value);
    if (sync) flushSync(update);
    else update();
    const flags = {};
    if (next) flags.opened = true;
    if (previous.id && !next) flags.returned = true;
    if (previous.id && next && previous.id !== next) flags.switched = true;
    if (previous.id && !next && missingRef.current.includes(previous.id))
      flags.fallbackSeen = true;
    patchRef.current(flags);
  };
  useLayoutEffect(() => {
    const p = focusPlan.current;
    focusPlan.current = null;
    if (!p || !p.owned || serial.current !== p.serial) return;
    const current = document.activeElement;
    if (current !== p.before && current !== document.body) return;
    let target = null;
    if (p.kind === "open") target = heading.current;
    if (p.kind === "return")
      target = sourceButtons.current[p.id] || heading.current;
    if (target) {
      target.focus({ preventScroll: true });
      const r = target.getBoundingClientRect();
      if (r.top < 90 || r.bottom > innerHeight - 24)
        target.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [model]);
  const skip = () => {
    const h = active.current;
    active.current = null;
    h?.vt.skipTransition();
  };
  const settle = (reason) => {
    if (!active.current && !pending.current) return;
    const intent = pending.current;
    seq.current++;
    skip();
    pending.current = null;
    if (intent) commit(intent.next, intent.plan, false);
    setMessage(reason + "：已采用最新视图，动画跳过。");
    cleanupRoot();
  };
  const navigate = (next, event) => {
    const before = document.activeElement,
      initiator = event?.currentTarget,
      previous = modelRef.current.id;
    const plan = {
      before,
      serial: serial.current,
      owned:
        before === document.body ||
        view.current?.contains(before) ||
        initiator === before,
      kind: next ? (previous ? "switch" : "open") : "return",
      id: previous || pending.current?.next,
    };
    if (!next && previous) pairRef.current = previous;
    const n = ++seq.current;
    skip();
    requests.current++;
    if (requests.current >= 2) patchRef.current({ multiChanged: true });
    const intent = { next, plan };
    pending.current = intent;
    // Only the chosen logical object gets a name in the old gallery capture.
    if (!previous && next) {
      pairRef.current = next;
      for (const [id, node] of Object.entries(arts.current))
        if (node)
          node.style.viewTransitionName = id === next ? pair(id) : "none";
    }
    const options = opts.current,
      supported =
        typeof document.startViewTransition === "function" &&
        CSS.supports("view-transition-name", "lesson21-a");
    const missingTarget = !next && missingRef.current.includes(plan.id);
    if (
      !options.animate ||
      options.noMotion ||
      options.systemReduce ||
      document.hidden ||
      !supported ||
      missingTarget ||
      (!previous && !next)
    ) {
      pending.current = null;
      commit(next, plan, false);
      setMessage(
        !supported
          ? "能力不支持：直接更新视图，功能与焦点策略保留。"
          : missingTarget
            ? "来源暂不可用：返回列表标题，可恢复来源卡片。"
            : "直接更新最新视图；没有播放共享动画。",
      );
      cleanupRoot();
      return;
    }
    const root = document.documentElement;
    root[OWNER] = owner.current;
    root.classList.add("lesson21-transition");
    root.style.setProperty("--shared-duration", `${options.duration}ms`);
    try {
      const vt = document.startViewTransition(() => {
        if (!alive.current || seq.current !== n) return;
        commit(next, plan, true);
      });
      liveTransitions.current.add(vt);
      active.current = { vt, n };
      setMessage("原生过渡请求已发出；可立即改变意图，不必等待。");
      vt.ready.then(
        () => {
          if (alive.current && seq.current === n)
            setMessage("浏览器正在配对运行时画面；实时控件仍可操作。");
        },
        () => {},
      );
      vt.updateCallbackDone.catch(() => {
        if (alive.current && seq.current === n) {
          pending.current = null;
          commit(next, plan, false);
          setMessage("更新异常：已直接采用最新视图。");
        }
      });
      const done = () => {
        liveTransitions.current.delete(vt);
        if (active.current?.n === n) {
          active.current = null;
          pending.current = null;
          if (alive.current && seq.current === n)
            setMessage("最新视图已就绪；原生过渡已结束或跳过。");
        }
        cleanupRoot();
      };
      vt.finished.then(done, done);
    } catch {
      active.current = null;
      pending.current = null;
      commit(next, plan, false);
      setMessage("原生创建失败：直接采用最新视图。");
      cleanupRoot();
    }
  };
  useEffect(() => {
    alive.current = true;
    const focus = () => {
      if (document.activeElement !== document.body) serial.current++;
    };
    document.addEventListener("focusin", focus);
    const mq = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setSystemReduce(mq.matches);
    mq.addEventListener("change", change);
    const hide = () => {
      if (document.hidden) settle("页面隐藏");
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      alive.current = false;
      seq.current++;
      pending.current = null;
      skip();
      cleanupRoot();
      document.removeEventListener("focusin", focus);
      mq.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    if (data.noMotion || systemReduce || !data.animate)
      settle("减少动态或关闭过渡");
  }, [data.noMotion, systemReduce, data.animate]);
  const item = sharedItems.find((x) => x.id === model.id);
  const back = (e) => navigate(null, e);
  return (
    <div className="shared-lab" data-view={model.id || "gallery"}>
      <div className="shared-controls">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.animate}
            onChange={(e) => patch({ animate: e.target.checked })}
          />
          启用原生共享过渡
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.noMotion}
            onChange={(e) =>
              patch({ noMotion: e.target.checked, reducedChecked: true })
            }
          />
          减少动态：直接最新视图
        </label>
        <div className="shared-buttons">
          <button
            aria-pressed={data.duration === 400}
            onClick={() => patch({ duration: 400 })}
          >
            常速400ms
          </button>
          <button
            aria-pressed={data.duration === 1200}
            onClick={() => patch({ duration: 1200 })}
          >
            慢速1200ms
          </button>
          <button onClick={back}>返回列表 / 取消待开详情</button>
        </div>
        <p className="micro">
          系统减少动态：{systemReduce ? "开启" : "关闭"}
          。时长仅影响下一次请求。快速打断采用最新意图，不承诺旧快照连续速度。
        </p>
      </div>
      <div
        className="shared-view"
        ref={view}
        onKeyDown={(e) => {
          if (e.key === "Escape" && modelRef.current.id) {
            e.preventDefault();
            back(e);
          }
        }}
      >
        {!item ? (
          <>
            <h3 tabIndex={-1} ref={heading}>
              本地插画列表
            </h3>
            <ul className="shared-gallery" aria-label="共享对象列表">
              {sharedItems
                .filter((x) => !missing.includes(x.id))
                .map((x) => (
                  <li key={x.id} data-source={x.id}>
                    <Art
                      item={x}
                      named={pairRef.current === x.id}
                      register={(node) => {
                        arts.current[x.id] = node;
                      }}
                    />
                    <div>
                      <h4>
                        {x.id} · {x.title}
                      </h4>
                      <p>缩略图 → 页内详情 → 准确返回</p>
                      <button
                        data-open={x.id}
                        ref={(node) => {
                          sourceButtons.current[x.id] = node;
                        }}
                        onClick={(e) => navigate(x.id, e)}
                      >
                        打开对象{x.id}
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <section
            className="shared-detail"
            aria-labelledby="shared-detail-title"
            data-detail={item.id}
          >
            <h3 id="shared-detail-title" tabIndex={-1} ref={heading}>
              {item.id} · {item.title}详情
            </h3>
            <div className="shared-buttons">
              <button onClick={back}>返回来源卡片{item.id}</button>
              {sharedItems.map((x) => (
                <button
                  key={x.id}
                  aria-pressed={item.id === x.id}
                  onClick={(e) => navigate(x.id, e)}
                >
                  查看对象{x.id}
                </button>
              ))}
            </div>
            <Art item={item} hero named />
            <p>{item.detail}</p>
            <p>
              配对标识：<code>{pair(item.id)}</code>
              。缩略图节点已卸载；详情插画是新节点。切换不同对象使用不同标识，可合理淡化，不把A冒充B。
            </p>
            <label className="shared-note">
              对象{item.id}本地备注
              <input
                value={notes[item.id]}
                maxLength={80}
                onChange={(e) => {
                  setNotes((old) => ({ ...old, [item.id]: e.target.value }));
                  patch({ noteSeen: true });
                }}
              />
            </label>
            <button
              onClick={() => {
                setNotes((old) => ({
                  ...old,
                  [item.id]: "返回同一对象，保留这条可编辑备注。",
                }));
                patch({ noteSeen: true });
              }}
            >
              填入备注示例
            </button>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={missing.includes(item.id)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...new Set([...missing, item.id])]
                    : missing.filter((x) => x !== item.id);
                  missingRef.current = next;
                  setMissing(next);
                }}
              />
              模拟来源卡片暂不可用（本地）
            </label>
          </section>
        )}
      </div>
      <div className="shared-controls">
        <div className="shared-buttons">
          <button
            onClick={() => {
              missingRef.current = [];
              setMissing([]);
              setMessage("来源卡片已恢复；未强抢当前焦点。");
            }}
          >
            恢复全部来源卡片
          </button>
          <button
            onClick={() => {
              patch({ inspected: true });
              setInspection(
                `当前真实视图：${modelRef.current.id ? "详情" + modelRef.current.id : "列表"}；插画节点数 ${view.current.querySelectorAll("[data-art]").length}；无隐藏可操作副本。浏览器原生快照是只读画面，不是DOM按钮。`,
              );
            }}
          >
            读取配对与真实DOM
          </button>
        </div>
        <p className="shared-inspection">
          {inspection ||
            "打开并返回后读取：对象身份与DOM节点是两件事。备注在本次实验会话内按对象ID保存，换站/刷新/离开后清空。"}
        </p>
      </div>
      <div className="shared-explain">
        <p>{sharedScope}</p>
        <p>
          生命周期：旧画面 → 更新真实DOM → 新画面 → 配对过渡 →
          清理。skipTransition只跳动画，仍须隔离迟到更新；本例无持续rAF。原生能力不可用、创建失败、页面隐藏或减少动态时直接到最新状态。缩略图与详情都不含隐藏交互副本。
        </p>
        <p>
          焦点：打开后落在详情标题；返回准确来源按钮，来源不存在则回到列表标题。仅在本次操作仍拥有焦点时恢复，已移到外部控件就不抢回。详情非模态，不困住Tab；详情区域内Escape可返回，触屏使用返回按钮。
        </p>
      </div>
      {data.step === 1 && (
        <div className="shared-candidates">
          <h3>候选比较：先看产品约束</h3>
          <p>
            <strong>Motion shared layout：</strong>
            React组件用layoutId建立跨位置/视图对应，结合挂载/离场生命周期，可用布局过渡或spring；同时存在时可crossfade。需引入库并设计焦点，不会自动替你解决业务返回。
          </p>
          <p>
            <strong>原生View Transition：</strong>
            本例已使用。用唯一view-transition-name关联浏览器运行时画面，DOM更新回调与动画Promise分开管理；需能力检测、跳过与失败回退。不要让快照层挡住实时操作。
          </p>
          <button onClick={() => patch({ compared: true })}>
            记录两种候选的比较
          </button>
        </div>
      )}
      <div role="status" className="shared-status">
        {message}
      </div>
    </div>
  );
}
