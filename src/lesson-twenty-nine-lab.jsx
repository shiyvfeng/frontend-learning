import React, { useEffect, useId, useRef, useState } from "react";
import {
  chartRows,
  chartGeometry,
  chartSummary,
  trendPath,
  formatValue,
  parseMinutes,
  sampleMatrix,
  days,
  devices,
  chartScope,
} from "./lesson-twenty-nine-content";

export default function ChartWorkbench({ data, patch }) {
  const root = useRef(null),
    titleId = useId(),
    descId = useId();
  const [hover, setHover] = useState(null),
    [message, setMessage] = useState(
      "选择图形任务与筛选，再用数值入口固定详情。",
    ),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduced(m.matches);
    change();
    m.addEventListener("change", change);
    const escape = (e) => {
      if (
        e.key === "Escape" &&
        !e.defaultPrevented &&
        root.current?.contains(e.target)
      ) {
        setHover(null);
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      m.removeEventListener("change", change);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(
    () => setHover(null),
    [data.mode, data.filter, data.day, data.scenario, data.matrix],
  );
  const rows = chartRows(data),
    points = chartGeometry(rows, data.mode),
    summary = chartSummary(rows),
    active =
      rows.find((r) => r.key === hover) ||
      rows.find((r) => r.key === data.selected),
    pinned = rows.some((r) => r.key === data.selected);
  const chooseMode = (mode) => {
    patch({
      mode,
      filter:
        mode === "trend" && data.filter === "all" ? "reader" : data.filter,
      ...(mode === "compare" ? { compareSeen: true } : { trendSeen: true }),
    });
    setMessage(
      mode === "trend"
        ? "趋势按周一到周日排列；从全部设备切换时，明确改看阅读屏。缺失处留断点。"
        : "比较同一天的设备；长度从0基线起，固定0–240分钟标尺。",
    );
  };
  const inspect = (r) => {
    patch({
      selected: r.key,
      inspectedSeen: true,
      ...(r.value === null ? { missingSeen: true } : {}),
      ...(r.value === 0 ? { zeroSeen: true } : {}),
    });
    setHover(null);
    setMessage(
      `已固定${r.name} ${days[r.day]}：${formatValue(r.value)}。详情与数据表来自同一份当前结果。`,
    );
  };
  const edit = (value) => {
    const n = value === undefined ? parseMinutes(data.editText) : value;
    if (n === null && value !== null) {
      setMessage("输入无效：只接受0–240的整数；空串、负数和字符不会默默当0。");
      return;
    }
    if (data.matrix[data.editDevice][data.editDay] === n) {
      setMessage("该记录数值未变，请尝试另一个值再对照。");
      return;
    }
    patch((old) => ({
      matrix: {
        ...old.matrix,
        [old.editDevice]: old.matrix[old.editDevice].map((v, i) =>
          i === old.editDay ? n : v,
        ),
      },
      day: old.editDay,
      filter: old.mode === "compare" ? "all" : old.editDevice,
      scenario: "normal",
      editedSeen: true,
    }));
    setMessage(
      `仅修改${devices.find((d) => d.id === data.editDevice).name} ${days[data.editDay]}为${formatValue(n)}；已显示编辑目标，其余记录保留。`,
    );
  };
  const scenarioNames = {
    normal: "正常样例",
    empty: "空筛选（教学）",
    missing: "全缺失投影（教学）",
    zero: "全零投影（教学）",
  };
  return (
    <div
      className="chart29-lab"
      ref={root}
      data-mode={data.mode}
      data-scenario={data.scenario}
      data-reduced={reduced}
    >
      <div className="chart29-boundary">
        <strong>虚构设备教学样例 · 真实SVG数据映射</strong>
        <p>{chartScope}</p>
      </div>
      {data.step === 0 && (
        <div className="chart29-controls">
          <label>
            图表标题
            <input
              maxLength="100"
              value={data.caption}
              onChange={(e) => patch({ caption: e.target.value })}
            />
          </label>
          <button
            onClick={() =>
              patch({ caption: "三台虚构设备的一周用量（教学样例）" })
            }
          >
            填入标题示例
          </button>
        </div>
      )}
      <div className="chart29-controls">
        <div className="chart29-buttons" role="group" aria-label="图表任务">
          <button
            aria-pressed={data.mode === "compare"}
            onClick={() => chooseMode("compare")}
          >
            比较：设备条形图
          </button>
          <button
            aria-pressed={data.mode === "trend"}
            onClick={() => chooseMode("trend")}
          >
            趋势：每日折线图
          </button>
        </div>
        <fieldset>
          <legend>
            {data.mode === "compare" ? "比较设备范围" : "趋势设备（单台）"}
          </legend>
          <div className="chart29-buttons">
            {data.mode === "compare" && (
              <button
                aria-pressed={data.filter === "all"}
                onClick={() => {
                  patch({ filter: "all", filterSeen: true });
                  setMessage("筛选已更新为全部设备，不改变原始记录。");
                }}
              >
                全部设备
              </button>
            )}
            {devices.map((d) => (
              <button
                key={d.id}
                aria-pressed={data.filter === d.id}
                onClick={() => {
                  patch({ filter: d.id, filterSeen: true });
                  setMessage(
                    `已筛选${d.name}，图形/详情/表同步；不改变原始记录。`,
                  );
                }}
              >
                筛选{d.name}
              </button>
            ))}
          </div>
        </fieldset>
        {data.mode === "compare" && (
          <fieldset>
            <legend>比较日期</legend>
            <div className="chart29-buttons">
              {days.map((name, i) => (
                <button
                  key={name}
                  aria-pressed={data.day === i}
                  onClick={() => {
                    patch({ day: i, filterSeen: true });
                    setMessage(`比较日期已切换到${name}，单位仍为分钟/日。`);
                  }}
                >
                  比较{name}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>
      {data.step === 1 && (
        <fieldset className="chart29-controls">
          <legend>修改单条教学数据（其他记录保留）</legend>
          <label>
            编辑设备
            <select
              value={data.editDevice}
              onChange={(e) => patch({ editDevice: e.target.value })}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            编辑日期
            <select
              value={data.editDay}
              onChange={(e) => patch({ editDay: Number(e.target.value) })}
            >
              {days.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            教学用量（分钟，0–240整数）
            <input
              type="text"
              inputMode="numeric"
              maxLength="20"
              value={data.editText}
              onChange={(e) => patch({ editText: e.target.value })}
            />
          </label>
          <div className="chart29-buttons">
            <button onClick={() => patch({ editText: "90" })}>
              填入90分钟示例
            </button>
            <button onClick={() => edit()}>应用教学数值</button>
            <button onClick={() => edit(0)}>设为0分钟</button>
            <button onClick={() => edit(null)}>标记为缺失</button>
          </div>
          <p>
            应用后显示对应日期/设备，输入只改这一条。缺失是null，不是0。恢复原始数据会覆盖本课编辑。
          </p>
          <button
            onClick={() => {
              patch({ matrix: sampleMatrix(), scenario: "normal" });
              setMessage("已恢复原始21条教学记录，筛选与已完成学习标记保留。");
            }}
          >
            恢复原始教学数据
          </button>
        </fieldset>
      )}
      {data.step === 2 && (
        <fieldset className="chart29-controls">
          <legend>边界投影演练（不修改原始数据）</legend>
          <p>
            以下开关投影空结果、全缺失或全零，均为本地教学场景；恢复正常投影会保留你编辑的值。
          </p>
          <div className="chart29-buttons">
            {[
              ["empty", "空结果（教学筛选）"],
              ["missing", "全为缺失（教学）"],
              ["zero", "全为0（教学）"],
              ["normal", "恢复正常样例"],
            ].map(([v, name]) => (
              <button
                key={v}
                aria-pressed={data.scenario === v}
                onClick={() => {
                  patch({
                    scenario: v,
                    ...(v === "empty" ? { emptySeen: true } : {}),
                    ...(v === "normal" ? { restoredSeen: true } : {}),
                  });
                  setMessage(
                    v === "empty"
                      ? "没有符合筛选的记录；空结果不画成0。"
                      : v === "normal"
                        ? "已恢复正常投影，你的原始编辑值仍保留。"
                        : "投影已切换，请选择一个观测值核对其含义。",
                  );
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <figure className="chart29-figure">
        <figcaption>
          <h3>{data.caption || "未命名教学图表"}</h3>
          <p>
            {data.mode === "compare"
              ? `${days[data.day]}各设备比较`
              : `${devices.find((d) => d.id === data.filter)?.name || "阅读屏"}的一周趋势`}{" "}
            · {scenarioNames[data.scenario]} · 单位：分钟/日
          </p>
        </figcaption>
        {rows.length > 0 ? (
          <svg
            className="chart29-svg"
            viewBox="0 0 640 330"
            role="img"
            aria-labelledby={titleId}
            aria-describedby={descId}
            data-axis-min="0"
            data-axis-max="240"
            onPointerLeave={() => setHover(null)}
          >
            <title id={titleId}>
              {data.mode === "compare"
                ? "设备条形比较图"
                : "设备每日趋势折线图"}
              ，教学样例
            </title>
            <desc id={descId}>
              固定0至240分钟标尺，缺失不补零。完整数值见图后选择入口与数据表，图形本身不需要键盘操作。
            </desc>
            {[0, 60, 120, 180, 240].map((v) =>
              data.mode === "compare" ? (
                <g key={v}>
                  <line
                    x1={126 + (v / 240) * 420}
                    x2={126 + (v / 240) * 420}
                    y1="36"
                    y2="242"
                    className={v === 0 ? "chart29-axis" : "chart29-grid"}
                  />
                  <text
                    x={126 + (v / 240) * 420}
                    y="279"
                    textAnchor="middle"
                    className="chart29-tick"
                  >
                    {v}
                  </text>
                </g>
              ) : (
                <g key={v}>
                  <line
                    x1="66"
                    x2="534"
                    y1={240 - (v / 240) * 192}
                    y2={240 - (v / 240) * 192}
                    className={v === 0 ? "chart29-axis" : "chart29-grid"}
                  />
                  <text
                    x="50"
                    y={248 - (v / 240) * 192}
                    textAnchor="end"
                    className="chart29-tick"
                  >
                    {v}
                  </text>
                </g>
              ),
            )}
            {data.mode === "compare" ? (
              points.map((p) => (
                <g
                  key={p.key}
                  data-point={p.key}
                  data-value={p.value === null ? "missing" : p.value}
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "touch") setHover(p.key);
                  }}
                >
                  <text
                    x="112"
                    y={p.y + 23}
                    textAnchor="end"
                    className="chart29-label"
                  >
                    {p.name}
                  </text>
                  {p.value === null ? (
                    <text x="132" y={p.y + 23} className="chart29-label">
                      缺失，未知
                    </text>
                  ) : (
                    <>
                      <rect
                        data-bar={p.key}
                        x={p.x}
                        y={p.y}
                        width={p.width}
                        height={p.height}
                        rx="2"
                        className={
                          active?.key === p.key
                            ? "chart29-bar selected"
                            : "chart29-bar"
                        }
                      />
                      {p.value === 0 && (
                        <circle
                          cx="126"
                          cy={p.y + 14}
                          r="5"
                          className="chart29-zero"
                        />
                      )}
                    </>
                  )}
                  <text x="560" y={p.y + 23} className="chart29-label">
                    {p.value === null ? "—" : p.value}
                  </text>
                </g>
              ))
            ) : (
              <>
                <path
                  d={trendPath(points)}
                  data-trend-line="true"
                  fill="none"
                  className="chart29-line"
                />
                {points.map((p) => (
                  <g
                    key={p.key}
                    data-point={p.key}
                    data-value={p.value === null ? "missing" : p.value}
                    onPointerEnter={(e) => {
                      if (e.pointerType !== "touch") setHover(p.key);
                    }}
                  >
                    {p.value === null ? (
                      <text
                        x={p.x}
                        y="261"
                        textAnchor="middle"
                        className="chart29-missing"
                      >
                        缺失
                      </text>
                    ) : (
                      <circle
                        data-dot={p.key}
                        cx={p.x}
                        cy={p.y}
                        r={active?.key === p.key ? 9 : 6}
                        className={
                          p.value === 0 ? "chart29-zero" : "chart29-dot"
                        }
                      />
                    )}
                    <text
                      x={p.x}
                      y="294"
                      textAnchor="middle"
                      className="chart29-tick"
                    >
                      {days[p.day]}
                    </text>
                  </g>
                ))}
              </>
            )}
          </svg>
        ) : (
          <div className="chart29-empty">
            <strong>没有符合条件的教学记录</strong>
            <p>这不是0分钟或全缺失。可以恢复正常样例；当前没有可选择的数值。</p>
          </div>
        )}
        <p className="chart29-caption">
          标尺固定为0–240分钟；零有基线标记，缺失没有条形/点，折线在缺失处断开。趋势图轴下的“缺失”字样不是数值位置。
        </p>
      </figure>
      <div className="chart29-inspector">
        <h3>数值详情（可固定选择）</h3>
        <p className="chart29-detail" aria-live="off">
          {active
            ? `${active.name} · ${days[active.day]}：${formatValue(active.value)}。${active.value === null ? "未知，不代表零，不连接缺失段。" : active.value === 0 ? "观测为零，不是没有记录。" : "教学观测值，不作因果推断。"}`
            : data.selected && !pinned
              ? "当前筛选不含原选项，请重新选择；没有沿用旧详情。"
              : "尚未选择数值。鼠标可在图形上临时预览，键盘/触屏可用下方入口固定详情。"}
        </p>
        <div
          className="chart29-values"
          role="group"
          aria-label="可访问数值选择"
        >
          {rows.map((row) => (
            <button
              key={row.key}
              aria-label={`查看${row.name}${days[row.day]}`}
              aria-pressed={data.selected === row.key}
              onFocus={() => setHover(null)}
              onClick={() => inspect(row)}
            >
              <span>
                {row.name} · {days[row.day]}
              </span>
              <strong>{formatValue(row.value)}</strong>
              {data.selected === row.key && <small>✓ 已固定</small>}
            </button>
          ))}
        </div>
      </div>
      <p className="chart29-summary">
        当前结果 {summary.records} 条：已知 {summary.known}，缺失{" "}
        {summary.missing}，观测为0的有 {summary.zeros} 条。
        {reduced
          ? "减少动态：静态图完整可操作。"
          : "本课图形静态重绘，没有强制动画。"}
      </p>
      <div className="chart29-table-wrap">
        <table>
          <caption>当前教学结果数据表 · 与图形同一投影</caption>
          <thead>
            <tr>
              <th scope="col">设备</th>
              <th scope="col">日期</th>
              <th scope="col">用量（分钟）</th>
              <th scope="col">记录含义</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.key} data-table-row={row.key}>
                  <th scope="row">{row.name}</th>
                  <td>{days[row.day]}</td>
                  <td
                    data-table-value={
                      row.value === null ? "missing" : row.value
                    }
                  >
                    {row.value === null ? "—" : row.value}
                  </td>
                  <td>
                    {row.value === null
                      ? "缺失/未知"
                      : row.value === 0
                        ? "观测为0"
                        : "有记录"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">没有符合筛选的记录，可恢复正常样例。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data.step === 1 && (
        <button
          onClick={() => {
            patch({ tableReviewed: true });
            setMessage(
              "已对照：图形、数值入口、详情与数据表共用同一份当前结果。",
            );
          }}
        >
          确认已对照数据表
        </button>
      )}
      <div className="chart29-status" role="status">
        {message}
      </div>
      <div className="chart29-explain">
        <p>
          比较类别大小可用条形，趋势重视日期顺序；想看时长分布需另按区间统计频数，本课不画直方图。热力贡献格等外观也不唯一对应某个库。
        </p>
        <p>
          本例用React直接更新SVG；标准图表库提供常见图型/组件，D3更偏比例尺、形状、数据连接等定制层。团队、维护、性能预算与可访问性共同决定选择，不一律要求某个库。ECharts/D3的专门工具课留给T09。
        </p>
        <p>
          样例不是服务端数据，解说是固定教学文字，不是AI推断。所有门槛有原生按钮/输入，非hover专用；空、缺失、零分别说明，图外始终有文字和表格。
        </p>
      </div>
    </div>
  );
}
