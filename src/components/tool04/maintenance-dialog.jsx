// Original teaching wrapper; existing Radix Dialog1.3.1 supplies modal behavior.
import React, { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
export default function MaintenanceDialog({ onRead, onLeave }) {
  const [open, setOpen] = useState(false),
    [epoch, setEpoch] = useState(0);
  const trigger = useRef(null),
    content = useRef(null),
    alive = useRef(true),
    opened = useRef(false),
    generation = useRef(0),
    closing = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      opened.current = false;
      generation.current++;
    };
  }, []);
  const change = (v) => {
    if (v === opened.current) return;
    if (v) {
      setEpoch(++generation.current);
      closing.current = null;
    } else {
      const node = content.current,
        active = document.activeElement;
      closing.current = {
        id: generation.current,
        node,
        owned: active === document.body || node?.contains(active),
      };
    }
    opened.current = v;
    setOpen(v);
  };
  return (
    <Dialog.Root modal open={open} onOpenChange={change}>
      <Dialog.Trigger asChild>
        <button ref={trigger}>打开维护契约清单</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="tool04-overlay" />
        <Dialog.Content
          key={epoch}
          ref={content}
          className="tool04-dialog"
          aria-modal="true"
          onFocusCapture={(e) => {
            const panel = e.currentTarget,
              r = e.target.getBoundingClientRect(),
              b = panel.getBoundingClientRect();
            if (r.top < b.top + 12) panel.scrollTop += r.top - b.top - 12;
            else if (r.bottom > b.bottom - 12)
              panel.scrollTop += r.bottom - b.bottom + 12;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const c = closing.current,
              a = document.activeElement;
            if (
              alive.current &&
              !opened.current &&
              c?.id === epoch &&
              generation.current === epoch &&
              c.owned &&
              (a === document.body || c.node?.contains(a)) &&
              trigger.current?.isConnected
            )
              trigger.current.focus();
          }}
        >
          <Dialog.Title>本地组件维护合同</Dialog.Title>
          <Dialog.Description>
            这是现有Radix Dialog依赖的真实模态；卡片样式与业务计数仍由项目维护。
          </Dialog.Description>
          <Dialog.Close asChild>
            <button>关闭维护清单</button>
          </Dialog.Close>
          <p>
            保留原生button、props/ref、标题描述、Tab循环、Escape与焦点返回。不是每个Card都依赖Radix：本例Card只是结构，本面板才使用Dialog
            primitive。
          </p>
          <p>
            本地规则只测明确项目约束。人工仍需验收阅读顺序、焦点可见、窄屏、业务和真实设备，不声称安装后自动全部无障碍。
          </p>
          <button onClick={onRead}>记录已核对维护职责</button>
          <button onClick={onLeave}>离开T04复习T03</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
