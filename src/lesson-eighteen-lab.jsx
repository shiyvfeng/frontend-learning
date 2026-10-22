import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Choices, Note } from "./lesson-two";
import { presenceAnimationScope } from "./lesson-eighteen-content";

function useReduced() {
  const [r, set] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      f = () => set(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}
function PresenceRow({
  item,
  duration,
  hold,
  reduced,
  complete,
  register,
  remove,
  fallback,
  cancelAnimation,
}) {
  const node = useRef(null),
    animation = useRef(null),
    callbacks = useRef({ complete, register, fallback, cancelAnimation }),
    [text, setText] = useState(item.text);
  callbacks.current = { complete, register, fallback, cancelAnimation };
  useLayoutEffect(() => {
    const e = node.current;
    if (item.phase === "present") {
      e.style.opacity = "";
      e.style.transform = "";
      return;
    }
    const ticket = { id: item.id, epoch: item.epoch, phase: item.phase };
    let live = true,
      finished = false,
      a = null;
    const done = () => {
      if (!live) return;
      finished = true;
      callbacks.current.complete(ticket);
    };
    if (reduced || typeof e.animate !== "function") {
      if (!reduced) callbacks.current.fallback();
      done();
      return () => {
        live = false;
      };
    }
    try {
      const cs = getComputedStyle(e),
        from = {
          opacity:
            e.style.opacity || (item.phase === "entering" ? 0 : cs.opacity),
          transform:
            e.style.transform ||
            (item.phase === "entering" ? "translateY(12px)" : cs.transform),
        },
        to =
          item.phase === "entering"
            ? { opacity: 1, transform: "translateY(0px)" }
            : { opacity: 0, transform: "translateY(-12px)" };
      a = e.animate([from, to], { duration, easing: "ease-out", fill: "both" });
      animation.current = a;
      a.onfinish = done;
      a.oncancel = () => {
        if (live) callbacks.current.cancelAnimation(ticket);
      };
      callbacks.current.register(item.id, a);
      if (hold) a.pause();
    } catch {
      callbacks.current.fallback();
      done();
    }
    return () => {
      live = false;
      if (a) {
        a.onfinish = null;
        a.oncancel = null;
        const cs = getComputedStyle(e);
        if (!finished) {
          e.style.opacity = cs.opacity;
          e.style.transform = cs.transform;
        }
        a.cancel();
        if (animation.current === a) animation.current = null;
        callbacks.current.register(item.id, null, a);
      }
    };
  }, [item.id, item.epoch, item.phase, duration, reduced]);
  useLayoutEffect(() => {
    const a = animation.current;
    if (a && !reduced) {
      if (hold) a.pause();
      else if (a.playState === "paused") a.play();
    }
  }, [hold, reduced, item.epoch, item.phase]);
  return (
    <li
      ref={node}
      className="presence-row"
      data-id={item.id}
      data-epoch={item.epoch}
      data-phase={item.phase}
      inert={item.phase !== "present" ? true : undefined}
      aria-hidden={item.phase !== "present" ? true : undefined}
    >
      <span className="presence-number">#{item.id}</span>
      <div>
        <strong>{item.text}</strong>
        <label>
          通知 #{item.id} 的本地备注
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={60}
          />
        </label>
      </div>
      <button data-row-action onClick={() => remove(item.id)}>
        移除通知 #{item.id}
      </button>
    </li>
  );
}
export default function PresenceWorkbench({ data, patch }) {
  const [items, setItems] = useState([
      { id: 1, epoch: 0, phase: "present", text: "可操作的本地通知" },
    ]),
    [direct, setDirect] = useState(true),
    [message, setMessage] = useState("尚无操作"),
    [readout, setReadout] = useState("点击读取，不逐帧播报"),
    [queue, setQueue] = useState([]),
    [fallback, setFallback] = useState(false);
  const lastRemoved = useRef(null),
    model = useRef(items),
    sequence = useRef(1),
    alive = useRef(true),
    animations = useRef(new Map()),
    directRef = useRef(null),
    directShow = useRef(null),
    addRef = useRef(null),
    pending = useRef(queue),
    latest = useRef({ patch });
  latest.current.patch = patch;
  const systemReduced = useReduced(),
    reduced = systemReduced || data.noMotion;
  const commit = (next) => {
    model.current = next;
    setItems(next);
  };
  const remember = (ticket) => {
    const next = [...pending.current, ticket].slice(-24);
    pending.current = next;
    setQueue(next);
  };
  const register = (id, a, old) => {
    if (a) animations.current.set(id, a);
    else if (animations.current.get(id) === old) animations.current.delete(id);
  };
  const safeFocus = (id) => {
    const row = document.querySelector(
      `.lesson-eighteen .presence-row[data-id="${id}"]`,
    );
    if (!row?.contains(document.activeElement)) return;
    const next = model.current.find(
        (x) => x.id !== id && x.phase === "present",
      ),
      target = next
        ? document.querySelector(
            `.lesson-eighteen .presence-row[data-id="${next.id}"] [data-row-action]`,
          )
        : addRef.current;
    (target || addRef.current)?.focus();
  };
  const complete = (ticket) => {
    if (!alive.current) return false;
    const item = model.current.find((x) => x.id === ticket.id);
    if (!item || item.epoch !== ticket.epoch || item.phase !== ticket.phase)
      return false;
    if (ticket.phase === "exiting") {
      lastRemoved.current = item;
      safeFocus(item.id);
      commit(model.current.filter((x) => x.id !== item.id));
      latest.current.patch({ exitRemoved: true });
      setMessage(`通知 #${item.id} 离场完成：已从 DOM 真正移除。`);
    } else
      commit(
        model.current.map((x) =>
          x.id === item.id ? { ...x, phase: "present", epoch: x.epoch + 1 } : x,
        ),
      );
    return true;
  };
  const cancelAnimation = (ticket) => {
    if (!alive.current) return;
    const item = model.current.find((x) => x.id === ticket.id);
    if (!item || item.epoch !== ticket.epoch || item.phase !== ticket.phase)
      return;
    commit(
      model.current.map((x) =>
        x.id === item.id ? { ...x, phase: "present", epoch: x.epoch + 1 } : x,
      ),
    );
    latest.current.patch({ cancelled: true });
    setMessage(
      `通知 #${item.id} 的动画已取消：保留为可操作内容，不冒充离场完成。`,
    );
  };
  useEffect(
    () => () => {
      alive.current = false;
      for (const a of animations.current.values()) {
        a.onfinish = null;
        a.oncancel = null;
        a.cancel();
      }
      animations.current.clear();
    },
    [],
  );
  const add = () => {
    if (model.current.length >= 6) {
      setMessage("最多保留6个 DOM 通知；请先完成离场，不重复创建超限实例。");
      return;
    }
    const item = {
      id: ++sequence.current,
      epoch: 0,
      phase: "entering",
      text: data.label.trim() || "本地通知",
    };
    remember({ id: item.id, epoch: item.epoch, phase: item.phase });
    commit([...model.current, item]);
    patch({ added: true });
    setMessage(`添加独立实例 #${item.id}，entering → present；不联网。`);
  };
  const remove = (id) => {
    const item = model.current.find((x) => x.id === id);
    if (!item || item.phase === "exiting") {
      setMessage("该通知已离场或不存在，不重复提交移除。");
      return;
    }
    safeFocus(id);
    const next = { ...item, phase: "exiting", epoch: item.epoch + 1 };
    remember({ id: next.id, epoch: next.epoch, phase: next.phase });
    commit(model.current.map((x) => (x.id === id ? next : x)));
    setMessage(
      `通知 #${id} 进入 exiting：仍在 DOM，内部控件已 inert；完成后移除。`,
    );
  };
  const restore = () => {
    const item = [...model.current]
      .reverse()
      .find((x) => x.phase === "exiting");
    if (!item) {
      const old = lastRemoved.current;
      if (!old) {
        setMessage("没有正在离场或最近已移除的通知；请先移除一项。");
        return;
      }
      if (model.current.length >= 6) {
        setMessage("列表已满6项，先完成移除后再恢复内容。");
        return;
      }
      const next = {
        id: ++sequence.current,
        epoch: 0,
        phase: "entering",
        text: old.text,
      };
      lastRemoved.current = null;
      remember({ id: next.id, epoch: next.epoch, phase: next.phase });
      commit([...model.current, next]);
      patch({ restored: true });
      setMessage(
        `离场已完成：恢复内容为新实例 #${next.id}，旧 #${old.id} 的 DOM 不复活，备注重新初始化。`,
      );
      return;
    }
    const next = { ...item, phase: "entering", epoch: item.epoch + 1 };
    remember({ id: next.id, epoch: next.epoch, phase: next.phase });
    commit(model.current.map((x) => (x.id === item.id ? next : x)));
    patch({ restored: true });
    setMessage(
      `撤回 #${item.id} 离场，过渡代次 ${next.epoch}：从当前画面重新进入，保留同一节点和备注。`,
    );
  };
  const cancel = () => {
    const transitional = model.current.filter((x) => x.phase !== "present");
    if (!transitional.length) {
      setMessage("没有过渡需要取消；通知保持可操作。");
      return;
    }
    commit(
      model.current.map((x) =>
        x.phase === "present"
          ? x
          : { ...x, phase: "present", epoch: x.epoch + 1 },
      ),
    );
    patch({ cancelled: true });
    setMessage("已取消当前过渡并保留内容；旧动画与完成信号失效。");
  };
  const finish = () => {
    const current = model.current
      .filter((x) => x.phase !== "present")
      .map((x) => ({ id: x.id, epoch: x.epoch, phase: x.phase }));
    if (!current.length) {
      setMessage("当前没有过渡；无需等待动画即可继续操作。");
      return;
    }
    for (const ticket of current) {
      const a = animations.current.get(ticket.id);
      try {
        a?.finish();
      } catch {}
      complete(ticket);
    }
    setMessage(
      "已手动完成当前阶段：进入变 present，离场真正删除。不是伪造业务结果。",
    );
  };
  const stale = () => {
    const ticket = pending.current.find((t) => {
      if (t.phase !== "exiting") return false;
      const x = model.current.find((x) => x.id === t.id);
      return !x || x.epoch !== t.epoch || x.phase !== t.phase;
    });
    if (!ticket) {
      setMessage("尚无旧信号。先移除后撤回或取消，再投递。");
      return;
    }
    pending.current = pending.current.filter((t) => t !== ticket);
    setQueue(pending.current);
    const accepted = complete(ticket);
    if (!accepted) {
      patch({ staleIgnored: true });
      setMessage(
        `旧完成信号 #${ticket.id} / ${ticket.epoch} / ${ticket.phase} 已隔离；当前实例不被删除。`,
      );
    }
  };
  const retime = (duration) => {
    patch({ duration, speedChanged: true });
    commit(
      model.current.map((x) => {
        if (x.phase === "present") return x;
        const next = { ...x, epoch: x.epoch + 1 };
        remember({ id: next.id, epoch: next.epoch, phase: next.phase });
        return next;
      }),
    );
  };
  const directRemove = () => {
    if (directRef.current?.contains(document.activeElement))
      directShow.current?.focus();
    setDirect(false);
    patch({ directRemoved: true });
    setMessage("直接条件为 false：节点立即卸载，没有 DOM 可演离场。");
  };
  const inspect = () => {
    setReadout(
      `直接示例 DOM：${directRef.current ? "存在" : "不存在"}；保留列表 DOM ${model.current.length} 项。${model.current.map((x) => `#${x.id}：${x.phase}，代次${x.epoch}，${x.phase === "present" ? "可操作" : "inert，不进入 Tab"}`).join("；") || "无残留透明节点"}。减少动态${reduced ? "开启，过渡即时完成" : "关闭"}。${reduced || fallback ? "即时完成时没有可取消的动画；撤回通过新ID恢复内容，不能假称反转了已卸载节点。" : ""}`,
    );
    patch({
      phaseRead: true,
      ...(reduced || fallback ? { staticPolicyRead: true } : {}),
    });
  };
  return (
    <div
      className="presence-lab"
      data-testid="presence-lab"
      data-reduced={String(reduced)}
    >
      <div className="presence-heading">
        <strong>存在管理实验 · 全部本地</strong>
        <span className="micro">
          原生 WAAPI + React presence · 未使用 Motion
        </span>
      </div>
      <div className="presence-controls">
        <label>
          新通知内容
          <input
            value={data.label}
            maxLength={60}
            onChange={(e) =>
              patch({ label: e.target.value, labelEdited: true })
            }
          />
        </label>
        <button
          onClick={() =>
            patch({ label: "已存入本地观察清单", labelEdited: true })
          }
        >
          填入示例内容
        </button>
        <Choices
          label="过渡时长"
          values={[
            [280, "常速 · 280ms"],
            [1800, "慢速 · 1800ms"],
          ]}
          value={data.duration}
          onChange={retime}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.hold}
            onChange={(e) => patch({ hold: e.target.checked })}
          />
          暂停过渡以观察阶段
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.noMotion}
            onChange={(e) => patch({ noMotion: e.target.checked })}
          />
          减少动态并立即完成
        </label>
      </div>
      <p data-testid="presence-preference">
        系统减少动态：{systemReduced ? "开启" : "关闭"} · 当前：
        {reduced ? "即时完成，保留静态结果" : "允许过渡"}
        。系统偏好实时生效，优先于暂停与慢速。
      </p>
      {fallback && (
        <p className="presence-fallback" role="status">
          WAAPI 不可用或创建失败：已立即完成当前阶段，未留下不可操作的通知。
        </p>
      )}
      <div className="presence-direct">
        <h3>对照：直接条件卸载</h3>
        <div className="presence-direct-actions">
          <button onClick={directRemove}>直接卸载示例</button>
          <button ref={directShow} onClick={() => setDirect(true)}>
            重新挂载直接示例
          </button>
        </div>
        {direct ? (
          <div
            ref={directRef}
            className="presence-direct-node"
            data-testid="direct-notice"
          >
            <p>只用 show ? 节点 : null，false 时立即删除。</p>
            <button onClick={directRemove}>直接关闭此通知</button>
          </div>
        ) : (
          <p data-testid="direct-absent">DOM 不存在 · 没有 exit 阶段</p>
        )}
      </div>
      <section
        className="presence-managed"
        aria-label="保留至离场完成的通知列表"
      >
        <h3>实验：先离场，再真正移除</h3>
        <div className="presence-actions">
          <button ref={addRef} onClick={add}>
            添加通知
          </button>
          <button
            onClick={() => {
              const item = model.current.find((x) => x.phase !== "exiting");
              if (item) remove(item.id);
              else setMessage("没有可移除的通知；可添加、撤回或完成当前离场。");
            }}
          >
            移除最早可用通知
          </button>
          <button onClick={restore}>撤回最近离场</button>
          <button onClick={cancel}>取消过渡并保留内容</button>
          <button onClick={finish}>立即完成当前动画</button>
          <button onClick={stale}>投递一个旧完成信号</button>
        </div>
        <p className="micro">
          进入和离场期间均不可交互；present
          才可操作。操作按钮始终保留，可反复尝试，不要求等长动画。最多6项，重复内容也有独立ID。
        </p>
        <ul className="presence-list">
          {items.map((item) => (
            <PresenceRow
              key={item.id}
              item={item}
              duration={data.duration}
              hold={data.hold}
              reduced={reduced}
              complete={complete}
              register={register}
              remove={remove}
              fallback={() => setFallback(true)}
              cancelAnimation={cancelAnimation}
            />
          ))}
        </ul>
        {!items.length && (
          <p className="presence-empty">列表已空：所有通知节点确已移除。</p>
        )}
      </section>
      <div
        className="presence-state"
        data-testid="presence-state"
        data-count={items.length}
      >
        <h3>文字阶段表 · 直接读取当前模型</h3>
        <ul>
          {items.map((x) => (
            <li key={x.id} data-state-id={x.id} data-phase={x.phase}>
              #{x.id} · DOM存在 · <strong>{x.phase}</strong> · 代次{x.epoch} ·{" "}
              {x.phase === "present" ? "可操作" : "inert / 不可 Tab"}
            </li>
          ))}
        </ul>
        {!items.length && <p>DOM 0项，未保留透明占位通知。</p>}
        <button onClick={inspect}>读取 DOM 与动画阶段</button>
        <p role="status">{readout}</p>
        <p className="micro">
          保留最多24个教学完成信号，当前 {queue.length}{" "}
          个。手动投递只选已过期离场信号，核对身份/代次/阶段后拒绝，不触发有效动画的提前完成。
        </p>
      </div>
      <p
        className="presence-feedback"
        role="status"
        data-testid="presence-feedback"
      >
        {message}
      </p>
      <div className="presence-explain">
        <h3>可见性 ≠ DOM 存在 ≠ 动画阶段</h3>
        <p>
          本例进入 opacity 0→1、translateY 12px→0，离场
          1→0、0→-12px。暂停时可以看到阶段对应的 DOM；离场期间仍可见，但内容
          inert 且从辅助技术树隐藏。完成后从数组删除，React 真正卸载，不以
          opacity:0 代替移除。移除当前持焦项时，先移到下个 present
          通知的移除入口或添加按钮；外部控件已有焦点则不抢走。
        </p>
        <p data-testid="presence-animation-scope">{presenceAnimationScope}</p>
        <p>
          CSS transition/animation 描述属性与时序，也可配合事件和存在管理；WAAPI
          提供 Animation 对象、暂停/完成/取消。二者本身都不替 React
          决定卸载。presence 逻辑负责保留、身份、打断与删除，库（如
          AnimatePresence）可以管理这层。本课手写存在管理，用
          Element.animate，不声称已接入 Motion。无 WAAPI
          或创建失败时立即完成，保留操作；减少动态实时立即结算并取消动画，暂停也不能阻挡。原生动画
          cancel 事件同样恢复可操作内容，不等待不会到达的
          finish。旧回调只在实例ID、过渡代次和阶段均匹配时生效。
        </p>
        <button onClick={() => patch({ compared: true })}>
          记录 CSS / WAAPI / presence 分工
        </button>
      </div>
      <Note>
        建议暂停 → 添加 → 立即完成 → 移除 → 读取 → 撤回 → 再移除 → 取消 →
        投递旧信号。随后可再移除并完成，核对 DOM
        清空。反转从当前画面重新进入，不承诺完整时长连续倒播；同一实例备注保留，真正移除后再添加为新实例。换站、离课、刷新或重置取消所有动画和旧信号，学习进度单独保存。不联网，不把动画完成说成真实业务成功。
      </Note>
    </div>
  );
}
