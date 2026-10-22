import React, { useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { tool03Choices, tool03Long, tool03Scope } from "./tool-three-content";
export default function Tool03Workbench({ data, patch, onLeave }) {
  const [open, setOpen] = useState(false),
    [epoch, setEpoch] = useState(0),
    [hasTrigger, setHasTrigger] = useState(true),
    [editTitle, setEditTitle] = useState("整理一张教学卡片"),
    [committed, setCommitted] = useState("整理一张教学卡片"),
    [error, setError] = useState(""),
    [contract, setContract] = useState(null),
    [message, setMessage] = useState(
      "真实Radix Dialog始终使用模态契约。先打开并读取实际名称、描述与Portal位置。",
    );
  const triggerRef = useRef(null),
    fallbackRef = useRef(null),
    externalRef = useRef(null),
    contentRef = useRef(null),
    fieldRef = useRef(null),
    alive = useRef(true),
    openRef = useRef(false),
    epochRef = useRef(0),
    closing = useRef(null),
    reason = useRef("cancel"),
    latest = useRef(data),
    id = useId();
  latest.current = data;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      epochRef.current++;
      openRef.current = false;
    };
  }, []);
  const edit = (change) =>
    patch((old) => ({
      ...change,
      reviewed: false,
      draftStale: old.generated || old.draftStale,
      ...(change.theme
        ? { themesSeen: [...new Set([...old.themesSeen, change.theme])] }
        : {}),
      ...(change.size
        ? { sizesSeen: [...new Set([...old.sizesSeen, change.size])] }
        : {}),
      ...(change.choice
        ? { choicesSeen: [...new Set([...old.choicesSeen, change.choice])] }
        : {}),
    }));
  const changeOpen = (value) => {
    if (value === openRef.current) return;
    if (value) {
      const n = ++epochRef.current;
      setEpoch(n);
      reason.current = "cancel";
      closing.current = null;
      setError("");
      setEditTitle(committed);
      openRef.current = true;
      setOpen(true);
    } else {
      const node = contentRef.current,
        active = document.activeElement;
      closing.current = {
        id: epochRef.current,
        node,
        active,
        reason: reason.current,
        owned: active === document.body || !!node?.contains(active),
      };
      openRef.current = false;
      setOpen(false);
      patch({
        closedSeen: true,
        ...(["cancel", "escape", "outside"].includes(reason.current)
          ? { cancelSeen: true }
          : {}),
      });
      setMessage(
        `已关闭（${{ cancel: "取消", escape: "Escape", outside: "外点", save: "本地保存", missing: "移除触发器", external: "前往外部说明" }[reason.current] || "关闭"}）；取消路径不提交编辑。`,
      );
    }
  };
  const afterClose = (event, closedId) => {
    event.preventDefault();
    const w = closing.current;
    if (
      !alive.current ||
      openRef.current ||
      !w ||
      w.id !== closedId ||
      closedId !== epochRef.current ||
      !w.owned
    )
      return;
    const a = document.activeElement;
    if (a !== document.body && !w.node?.contains(a)) return;
    const available = (e) =>
      e?.isConnected && !e.disabled && e.getClientRects().length;
    let target =
      w.reason === "external" ? externalRef.current : triggerRef.current;
    if (!available(target)) target = fallbackRef.current;
    if (!available(target)) return;
    target.focus();
    if (document.activeElement === target) {
      if (target === fallbackRef.current) patch({ fallbackSeen: true });
      else if (target === triggerRef.current) patch({ returnSeen: true });
      setMessage(
        target === fallbackRef.current
          ? "触发器已移除，焦点回到可见的恢复入口；可恢复后再次打开。"
          : target === externalRef.current
            ? "按本次操作前往外部说明入口；不把焦点强拉回触发器。"
            : "关闭后焦点已返回本次触发器；离站或已移动到外部时不会强抢。",
      );
    }
  };
  const readContract = () => {
    const node = contentRef.current;
    if (!node?.isConnected) return;
    const titleId = node.getAttribute("aria-labelledby"),
      descIds = (node.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean),
      s = {
        tag: node.tagName,
        role: node.getAttribute("role"),
        modal: node.getAttribute("aria-modal"),
        title: document.getElementById(titleId)?.textContent || "",
        description: descIds
          .map((i) => document.getElementById(i)?.textContent || "")
          .join(" "),
        portal:
          document.body.contains(node) &&
          !document.querySelector(".tool03-clipped")?.contains(node),
        focusInside: node.contains(document.activeElement),
        width: Math.round(node.getBoundingClientRect().width),
        height: Math.round(node.getBoundingClientRect().height),
        state: node.getAttribute("data-state"),
      };
    setContract(s);
    if (s.role === "dialog" && s.modal === "true" && s.title && s.description)
      patch({ namedSeen: true, ...(s.portal ? { portalSeen: true } : {}) });
    setMessage(
      "已读取真实DOM契约；库提供行为底座，文字、样式和业务规则仍由本例实现。",
    );
  };
  const save = () => {
    if (!editTitle.trim()) {
      setError("请填写卡片标题；这是本例业务校验，未关闭或提交。");
      patch({ invalidSeen: true });
      fieldRef.current?.focus();
      return;
    }
    setCommitted(editTitle.trim());
    patch({ savedSeen: true });
    reason.current = "save";
    changeOpen(false);
  };
  const controls = (inside = false) => (
    <div className="tool03-appearance">
      <label htmlFor={`${id}-${inside ? "in" : "out"}-theme`}>
        {inside ? "面板内主题" : "外观主题"}
      </label>
      <select
        id={`${id}-${inside ? "in" : "out"}-theme`}
        value={data.theme}
        onChange={(e) => edit({ theme: e.target.value })}
      >
        <option value="light">浅色 · 本站CSS</option>
        <option value="ink">深色 · 本站CSS</option>
      </select>
      <label htmlFor={`${id}-${inside ? "in" : "out"}-size`}>
        {inside ? "面板内尺寸" : "面板尺寸"}
      </label>
      <select
        id={`${id}-${inside ? "in" : "out"}-size`}
        value={data.size}
        onChange={(e) => edit({ size: e.target.value })}
      >
        <option value="compact">紧凑 · 最大440px</option>
        <option value="wide">较宽 · 最大640px</option>
      </select>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={data.long}
          onChange={(e) => edit({ long: e.target.checked })}
        />
        {inside ? "面板内长说明" : "显示长说明"}
      </label>
    </div>
  );
  const info = contract && (
    <dl className="tool03-contract">
      <dt>实际元素 / role</dt>
      <dd>
        {contract.tag} / {contract.role}
      </dd>
      <dt>名称 / 描述</dt>
      <dd>
        {contract.title} / {contract.description}
      </dd>
      <dt>aria-modal / DOM状态</dt>
      <dd>
        {contract.modal} / {contract.state}
      </dd>
      <dt>Portal已离开裁切祖先</dt>
      <dd>{String(contract.portal)}</dd>
      <dt>读取时焦点在内部</dt>
      <dd>{String(contract.focusInside)}</dd>
      <dt>实际面板宽 / 高</dt>
      <dd>
        {contract.width}px / {contract.height}px
      </dd>
    </dl>
  );
  return (
    <div
      className="tool03-workbench"
      data-open={open}
      data-epoch={epoch}
      data-contract={JSON.stringify(contract)}
      data-committed={committed}
    >
      <p className="tool03-boundary">
        <strong>真实Radix Dialog · 外观与业务由本例提供</strong>。{tool03Scope}
      </p>
      <fieldset className="tool03-choices">
        <legend>候选条件，不按库名评分</legend>
        <p>
          选择仅改变候选说明；真实实验始终运行Radix
          Dialog，不会因此安装/切换为Base UI。
        </p>
        {tool03Choices.map((c) => (
          <div key={c.id}>
            <button
              aria-pressed={data.choice === c.id}
              onClick={() => edit({ choice: c.id })}
            >
              {c.label}
            </button>
            <p>{c.why}</p>
          </div>
        ))}
      </fieldset>
      {controls()}
      <section
        className="tool03-static"
        aria-label="静态外观对照，不是dialog"
        data-theme={data.theme}
      >
        <h3>静态外观对照 · 不是dialog</h3>
        <p>
          普通卡片可以有同样圆角与颜色，但没有因此获得模态、焦点循环或Escape行为。原生button已有基本键盘语义；表单选择框是原生select，不是本例额外运行了Radix
          Select。
        </p>
        <p>当前本地会话标题：{committed}</p>
      </section>
      <div className="tool03-clipped">
        <p>此演示祖先有裁切与transform，真正Portal内容将挂到body。</p>
        <Dialog.Root modal={true} open={open} onOpenChange={changeOpen}>
          {hasTrigger ? (
            <Dialog.Trigger asChild>
              <button className="primary tool03-trigger" ref={triggerRef}>
                打开真实Radix对话框
              </button>
            </Dialog.Trigger>
          ) : (
            <p>原trigger已移除；下面稳定入口可以恢复。</p>
          )}
          <Dialog.Portal>
            <Dialog.Overlay className="tool03-overlay" />
            <Dialog.Content
              key={epoch}
              ref={contentRef}
              className="tool03-dialog"
              data-theme={data.theme}
              data-size={data.size}
              aria-modal="true"
              onOpenAutoFocus={() => patch({ openedSeen: true })}
              onCloseAutoFocus={(e) => afterClose(e, epoch)}
              onFocusCapture={(event) => {
                if (!latest.current.focusSeen) patch({ focusSeen: true });
                // Radix wraps focus with preventScroll. Expose the genuinely
                // focused control inside this scrollable panel without moving
                // focus or scrolling the background page.
                const panel = event.currentTarget;
                const control = event.target.getBoundingClientRect();
                const bounds = panel.getBoundingClientRect();
                if (control.top < bounds.top + 12)
                  panel.scrollTop += control.top - bounds.top - 12;
                else if (control.bottom > bounds.bottom - 12)
                  panel.scrollTop += control.bottom - bounds.bottom + 12;
              }}
              onEscapeKeyDown={() => {
                reason.current = "escape";
              }}
              onPointerDownOutside={() => {
                reason.current = "outside";
              }}
            >
              <Dialog.Title>调整教学卡片</Dialog.Title>
              <Dialog.Description>
                真实Radix模态演示；编辑仅在本地会话，取消不会保存。
              </Dialog.Description>
              <Dialog.Close asChild>
                <button
                  className="tool03-top-close"
                  onClick={() => (reason.current = "cancel")}
                >
                  关闭对话框
                </button>
              </Dialog.Close>
              <p>
                Tab与Shift+Tab在模态内循环，Escape或可见按钮关闭；标题、描述文字和功能样式由本站提供。
              </p>
              <label htmlFor={`${id}-edit`}>卡片标题（本地会话）</label>
              <input
                ref={fieldRef}
                id={`${id}-edit`}
                type="text"
                value={editTitle}
                maxLength={160}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  setError("");
                }}
              />
              <div className="tool03-actions">
                <button
                  onClick={() => {
                    setEditTitle("整理一张可访问的教学卡片");
                    setError("");
                  }}
                >
                  填入标题示例（替换本栏）
                </button>
                <button
                  onClick={() => {
                    setEditTitle("");
                    setError("");
                  }}
                >
                  清空标题，观察本例校验
                </button>
              </div>
              {error && (
                <p id={`${id}-error`} role="alert" className="tool03-error">
                  {error}
                </p>
              )}
              {controls(true)}
              {data.long && (
                <div className="tool03-long">
                  {[0, 1, 2].map((i) => (
                    <p key={i}>{tool03Long}</p>
                  ))}
                </div>
              )}
              <button onClick={readContract}>读取真实语义与Portal位置</button>
              {info}
              <p>
                这里不是原生&lt;dialog&gt;的showModal/top
                layer；背景隔离、Tab约束由Radix处理。本例配合modal显式提供aria-modal，不能只声明ARIA而缺少行为。
              </p>
              <div className="tool03-actions">
                <button className="tool03-save" onClick={save}>
                  保存本地标题并关闭
                </button>
                <Dialog.Close asChild>
                  <button onClick={() => (reason.current = "cancel")}>
                    取消本地编辑
                  </button>
                </Dialog.Close>
                <button
                  onClick={() => {
                    reason.current = "missing";
                    changeOpen(false);
                    setHasTrigger(false);
                  }}
                >
                  关闭并移除触发器
                </button>
                <button
                  onClick={() => {
                    reason.current = "external";
                    changeOpen(false);
                  }}
                >
                  关闭并前往外部说明
                </button>
                {onLeave && (
                  <button onClick={onLeave}>关闭并离开T03复习T02</button>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div className="tool03-actions">
        <button
          ref={fallbackRef}
          onClick={() => {
            setHasTrigger(true);
            setMessage("触发器已恢复；当前焦点保持在恢复入口，可再次打开。");
          }}
        >
          稳定入口：恢复触发器
        </button>
        <button
          ref={externalRef}
          onClick={() =>
            setMessage(
              "这是面板外的说明入口；用户已来到这里时，旧关闭回调不得抢走焦点。",
            )
          }
        >
          外部说明入口
        </button>
      </div>
      <div className="tool03-feedback" role="status">
        {message}
      </div>
      <section className="tool03-readout">
        <h3>职责与真实结果</h3>
        <p>
          Dialog角色、模态约束和Portal来自实际库组件；CSS、可见焦点、标题/描述文字、空值校验与缺失trigger补偿由本例实现。名称/描述关联、DOM位置可在打开后读取；下面保留的是最近一次观察，不代表面板仍存在。
        </p>
        {info || <p>尚未读取实际对话框。</p>}
        <p>
          取消、Escape和外点不提交；保存只更新本地会话，离开/换站清空。原生&lt;dialog&gt;是另一个可评估方案，不和本例的DIV
          role=dialog混淆。
        </p>
      </section>
    </div>
  );
}
