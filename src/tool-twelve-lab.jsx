import React, { useState } from "react";
import SortLab from "./tool-twelve-sort";
import VirtualLab from "./tool-twelve-virtual";
import { recommendation, tool12Scope } from "./tool-twelve-content";
export default function Tool12Workbench({ data, patch }) {
  const [expanded, setExpanded] = useState(false);
  if (data.step === 1) return <SortLab data={data} patch={patch} />;
  if (data.step === 2) return <VirtualLab data={data} patch={patch} />;
  return (
    <div className="tool12-lab">
      <div className="tool12-runtime">
        <strong>目标：按责任与维护条件选工具</strong>
        <p>{tool12Scope}</p>
      </div>
      <div className="tool12-panel">
        <h3>同一产品的不同瓶颈</h3>
        <div className="tool12-buttons">
          {[
            ["small", "少量对象排序"],
            ["browse", "大量已加载对象浏览"],
            ["remote", "远端分批数据合同"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={data.need === id}
              onClick={() =>
                patch({
                  need: id,
                  needsSeen: [...new Set([...data.needsSeen, id])],
                  reviewed: false,
                  draftStale: data.generated || data.draftStale,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="tool12-recommendation">{recommendation(data)}</p>
        <button aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          展开三种职责对照
        </button>
        {expanded && (
          <table>
            <caption>可组合，但不是同一职责</caption>
            <thead>
              <tr>
                <th scope="col">机制</th>
                <th scope="col">负责/不自动负责</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">拖拽排序</th>
                <td>
                  把输入转成移动合同；项目持有稳定ID顺序、取消与持久化策略。
                </td>
              </tr>
              <tr>
                <th scope="row">虚拟渲染</th>
                <td>
                  挂载窗口和滚动几何；不自动减少已加载数据或保留行内状态。
                </td>
              </tr>
              <tr>
                <th scope="row">分页/数据加载</th>
                <td>
                  每批数据范围、错误和缓存；是否卸载旧DOM另看实现，本例仅说明合同。
                </td>
              </tr>
            </tbody>
          </table>
        )}
        <button onClick={() => patch({ scopeSeen: true })}>
          核对职责与当前实际机制
        </button>
      </div>
      <div className="tool12-panel">
        <h3>从第30/31节到工具集成</h3>
        <p>
          本节观察真实库的getItemKey、overscan、滚动实例与清理；不重复只算一个窗口公式。排序采用小范围原生事务，对照引入dnd-kit后仍需维护的业务合同。需求变复杂时可以换库，不以库越多越好。
        </p>
        <p>
          2000条是固定教学规模，不是性能阈值。生产用真实数据量、内容和目标设备测量，再决定原生、现有组件、dnd-kit、TanStack
          Virtual或其他候选。
        </p>
      </div>
    </div>
  );
}
