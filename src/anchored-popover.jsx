import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Choices, Note } from "./lesson-two";

export default function AnchoredPopover({ data, patch }) {
  const boardRef = useRef(null),
    triggerRef = useRef(null),
    popupRef = useRef(null),
    openRef = useRef(false);
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState(""),
    [backgroundCount, setBackgroundCount] = useState(0),
    [placement, setPlacement] = useState({ side: "below", shifted: false });
  const supported =
    typeof HTMLElement.prototype.showPopover === "function" &&
    "popover" in HTMLElement.prototype;
  const native = supported && !data.anchorFallback;
  const dismiss = (reason, returnFocus = true) => {
    if (!openRef.current) return;
    openRef.current = false;
    try {
      if (popupRef.current?.matches(":popover-open"))
        popupRef.current.hidePopover();
    } catch {}
    setOpen(false);
    patch({ anchorClosed: true });
    setMessage(
      reason +
        (returnFocus
          ? "；焦点已回到锚点按钮。"
          : "；继续当前操作，不抢走其他控件的焦点。"),
    );
    if (returnFocus && triggerRef.current?.isConnected)
      triggerRef.current.focus({ preventScroll: true });
  };
  const toggle = () => {
    if (openRef.current) {
      dismiss("已用锚点按钮收起");
      return;
    }
    boardRef.current.scrollIntoView({ block: "center", behavior: "auto" });
    openRef.current = true;
    setOpen(true);
    patch({ anchorOpened: true });
    setMessage("非模态信息已打开，背景仍可操作。");
  };
  useLayoutEffect(() => {
    if (!open) return;
    const popup = popupRef.current,
      trigger = triggerRef.current,
      board = boardRef.current;
    const place = () => {
      if (!openRef.current) return;
      const a = trigger.getBoundingClientRect(),
        r = board.getBoundingClientRect();
      const bounds = {
        left: Math.max(8, r.left + 8),
        right: Math.min(innerWidth - 8, r.right - 8),
        top: Math.max(8, r.top + 8),
        bottom: Math.min(innerHeight - 8, r.bottom - 8),
      };
      if (
        a.bottom < 8 ||
        a.top > innerHeight - 8 ||
        bounds.right - bounds.left < 100 ||
        bounds.bottom - bounds.top < 80
      ) {
        dismiss("锚点或可用区域已离开视口", false);
        return;
      }
      const width = Math.min(224, bounds.right - bounds.left),
        maxHeight = bounds.bottom - bounds.top;
      popup.style.width = width + "px";
      popup.style.maxHeight = maxHeight + "px";
      const height = popup.getBoundingClientRect().height,
        gap = 8;
      let side = "below",
        top = a.bottom + gap;
      if (top + height > bounds.bottom && a.top - gap - height >= bounds.top) {
        side = "above";
        top = a.top - gap - height;
      } else if (top + height > bounds.bottom) {
        side =
          a.top - bounds.top > bounds.bottom - a.bottom ? "above" : "below";
        top = side === "above" ? a.top - gap - height : top;
      }
      top = Math.max(bounds.top, Math.min(top, bounds.bottom - height));
      const left = Math.max(
        bounds.left,
        Math.min(a.left, bounds.right - width),
      );
      popup.style.left = left + "px";
      popup.style.top = top + "px";
      setPlacement((old) =>
        old.side === side && old.shifted === Math.abs(left - a.left) > 1
          ? old
          : { side, shifted: Math.abs(left - a.left) > 1 },
      );
    };
    const outside = (event) => {
      if (popup.contains(event.target) || trigger.contains(event.target))
        return;
      const interactive =
        event.target instanceof Element &&
        event.target.closest("button,a[href],input,select,textarea,[tabindex]");
      // Blank-area pointer defaults would blur the focus we are returning.
      // Interactive targets keep their own default action and focus.
      if (!interactive) event.preventDefault();
      dismiss("已按外点策略关闭", !interactive);
    };
    const key = (event) => {
      if (event.key !== "Escape" || document.querySelector("dialog:modal"))
        return;
      event.preventDefault();
      event.stopPropagation();
      dismiss("已用 Esc 关闭");
    };
    const nativeToggle = (event) => {
      if (
        event.newState === "closed" &&
        openRef.current &&
        !popup.matches(":popover-open")
      )
        dismiss(
          "浏览器已收起浮层",
          popup.contains(document.activeElement) ||
            document.activeElement === document.body,
        );
    };
    popup.addEventListener("toggle", nativeToggle);
    if (native) {
      try {
        popup.showPopover();
      } catch {
        patch({ anchorFallback: true });
        setMessage("原生 Popover 未能打开，已切换兼容演示。");
        return () => popup.removeEventListener("toggle", nativeToggle);
      }
    }
    place();
    popup.querySelector("button")?.focus({ preventScroll: true });
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      popup.removeEventListener("toggle", nativeToggle);
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      try {
        if (native && popup.matches(":popover-open")) popup.hidePopover();
      } catch {}
    };
  }, [open, native, data.anchorEdge]);
  const setting = (value, key) => {
    if (openRef.current) dismiss("设置已改变，浮层已收起", false);
    patch({ [key]: value });
  };
  return (
    <>
      <div className="anchor-experiment">
        <div className="panel-heading">
          <span>有锚点的非模态信息</span>
          <span className="micro">
            {native ? "原生 Popover · 浏览器顶层" : "兼容演示 · Portal + fixed"}
          </span>
        </div>
        <div className="anchor-lab-grid">
          <div
            ref={boardRef}
            className="anchor-demo-board"
            data-testid="anchor-board"
          >
            <span className="anchor-board-caption">
              演示容器边界 · 留出 8px 安全距离
            </span>
            <button
              ref={triggerRef}
              className={`anchor-trigger anchor-${data.anchorEdge}`}
              aria-expanded={open}
              aria-controls="position-anchor-popup"
              aria-haspopup="dialog"
              onClick={toggle}
            >
              ⓘ 锚点说明
            </button>
          </div>
          <div className="anchor-controls">
            <Choices
              label="锚点的位置"
              values={[
                ["top", "上方"],
                ["bottom-right", "右下边缘"],
              ]}
              value={data.anchorEdge}
              onChange={(value) => setting(value, "anchorEdge")}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={data.anchorFallback}
                onChange={(event) =>
                  setting(event.target.checked, "anchorFallback")
                }
              />
              模拟不支持 Popover，检查兼容回退
            </label>
            <button
              className="position-background-action"
              onClick={() => setBackgroundCount((n) => n + 1)}
            >
              背景计数 ＋1：{backgroundCount}
            </button>
            <p className="anchor-status" role="status">
              {open
                ? `当前${placement.side === "above" ? "向上避让" : "向下展开"}${placement.shifted ? "，横向回推" : ""}。`
                : ""}
              {message}
            </p>
            <p className="micro">
              点演示容器空白、锚点或关闭按钮收起；键盘可按
              Esc。点其他可操作控件会关闭并继续该操作，不强行抢焦点。打开时把实验区域带入视口；滚动和缩放时重新测量，锚点离开可见区时收起。
            </p>
          </div>
        </div>
      </div>
      <Note title="Portal、顶层与模态，是不同的事情">
        Portal 只改变 DOM 挂载位置，可以避开某些祖先裁切，但仍受目标位置的 CSS
        和绘制层级影响，不保证免于所有遮挡，也不自动提供焦点或关闭行为。浏览器顶层是另一种绘制机制；原生
        popover 是非模态，不会让背景 inert，也不把 Tab
        困在其中。dialog.showModal() 则有模态的背景与焦点责任。本例用 JS
        测量锚点、上下避让和横向回推，不依赖 CSS Anchor Positioning。
      </Note>
      {createPortal(
        <div
          ref={popupRef}
          id="position-anchor-popup"
          className="position-anchor-popup"
          hidden={!open}
          popover={native ? "auto" : undefined}
          role="dialog"
          aria-modal="false"
          aria-labelledby="position-anchor-title"
          data-placement={placement.side}
          data-shifted={placement.shifted}
          data-native={native}
        >
          <span className="eyebrow">ANCHORED / NON-MODAL</span>
          <h4 id="position-anchor-title">锚点的补充信息</h4>
          <p>
            这个面板跟随锚点放置，并在容器边缘避让。背景仍可操作，不是模态窗口。
          </p>
          <button onClick={() => dismiss("已用关闭按钮收起")}>
            关闭锚点说明
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
