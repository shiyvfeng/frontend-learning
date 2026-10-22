import React, { useId } from "react";
export function Tool05CardBody({
  id,
  note,
  expanded,
  marked,
  onNote,
  onExpand,
  onMark,
  onRemove,
  inactive = false,
}) {
  const input = useId(),
    name = id.toUpperCase();
  return (
    <>
      <h3>
        <span aria-hidden="true" className="tool05-dot" />
        {name} ·{" "}
        {{ a: "规划视觉目标", b: "核对交互边界", c: "补充回归验收" }[id]}
      </h3>
      <p>原创教学卡片 · 备注/标记保留在本地会话，不是协作或后端任务。</p>
      <label htmlFor={input}>{name}卡片备注（本地会话）</label>
      <input
        disabled={inactive}
        id={input}
        data-control={`${id}-note`}
        value={note}
        maxLength={180}
        onChange={(e) => onNote(id, e.target.value)}
      />
      <div className="tool05-actions">
        <button
          disabled={inactive}
          data-control={`${id}-sample`}
          onClick={() =>
            onNote(id, "示例：先描述效果和取消路径，再核对最终状态。")
          }
        >
          填入{name}备注示例（替换本栏）
        </button>
        <button
          disabled={inactive}
          data-control={`${id}-expand`}
          aria-expanded={expanded}
          onClick={() => onExpand(id)}
        >
          {expanded ? "收起" : "展开"}
          {name}卡片说明
        </button>
        <button
          disabled={inactive}
          data-control={`${id}-mark`}
          aria-pressed={marked}
          onClick={() => onMark(id)}
        >
          {name}教学标记：{marked ? "已标记" : "未标记"}
        </button>
        <button
          disabled={inactive}
          data-control={`${id}-remove`}
          onClick={() => onRemove(id)}
        >
          移除{name}卡片
        </button>
      </div>
      {expanded && (
        <div className="tool05-detail">
          <strong>尺寸与位置的分工</strong>
          <p>
            这张卡片的高度立即采用最终CSS布局；后面的卡片位置用Motion过渡。position-only不平滑改变本卡高度，文字和标记不靠缩放拉伸。展开后仍可直接收起，不锁定交互等待动画。
          </p>
        </div>
      )}
    </>
  );
}
export function Tool05PlainBoard({ ids, ...props }) {
  return (
    <ul className="tool05-list" data-renderer="static-react">
      {ids.map((id) => (
        <li
          key={id}
          className="tool05-card"
          data-item={id}
          data-present="true"
          data-phase="static"
        >
          <Tool05CardBody
            id={id}
            note={props.notes[id]}
            expanded={props.expanded[id]}
            marked={props.marked[id]}
            {...props.handlers}
          />
        </li>
      ))}
    </ul>
  );
}
