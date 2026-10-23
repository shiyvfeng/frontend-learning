import { select } from "d3-selection";
import { scaleBand, scaleLinear } from "d3-scale";
import { line } from "d3-shape";
let controllers = 0,
  created = 0,
  draws = 0,
  removed = 0,
  nextId = 0;
export const runtimeState = () => ({ controllers, created, draws, removed });
export function createChart(host, onSelect, onDraw) {
  let alive = true,
    frame = 0,
    config = null,
    epoch = 0;
  const id = ++nextId,
    svg = select(host)
      .append("svg")
      .attr("data-d3-chart", "")
      .attr("role", "img")
      .attr(
        "aria-labelledby",
        `tool09-chart-title-${id} tool09-chart-desc-${id}`,
      );
  svg.append("title").attr("id", `tool09-chart-title-${id}`);
  svg.append("desc").attr("id", `tool09-chart-desc-${id}`);
  const grid = svg.append("g"),
    body = svg.append("g"),
    labels = svg.append("g");
  controllers++;
  created++;
  function draw() {
    if (!alive || document.hidden || !config) return;
    const width = host.clientWidth,
      height = 260;
    if (width < 1) return;
    const { rows, mode, selected } = config,
      left = 36,
      right = 12,
      top = 24,
      bottom = 216;
    const x = scaleBand(
        rows.map((d) => d.id),
        [left, Math.max(left + 1, width - right)],
      ).padding(0.3),
      y = scaleLinear([0, 40], [bottom, top]);
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("data-mode", mode);
    svg
      .select("title")
      .text(`虚构器材借用次数 · ${mode === "bar" ? "柱形比较" : "日期趋势"}`);
    svg
      .select("desc")
      .text(
        "纵轴0至40次；0有基线标记，缺失不当0。图外数据表及查看按钮提供同等信息与操作。",
      );
    const ticks = grid
      .selectAll("g")
      .data([0, 10, 20, 30, 40])
      .join((enter) => {
        const g = enter.append("g");
        g.append("line");
        g.append("text");
        return g;
      });
    ticks
      .select("line")
      .attr("x1", left)
      .attr("x2", width - right)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", (d) => (d === 0 ? "#676078" : "#dedbe8"));
    ticks
      .select("text")
      .attr("x", left - 6)
      .attr("y", (d) => y(d) + 4)
      .attr("text-anchor", "end")
      .text((d) => d);
    labels
      .selectAll("text")
      .data(rows, (d) => d.id)
      .join("text")
      .attr("x", (d) => x(d.id) + x.bandwidth() / 2)
      .attr("y", 238)
      .attr("text-anchor", "middle")
      .text((d) => d.day);
    svg
      .selectAll("text.unit")
      .data(["次"])
      .join("text")
      .attr("class", "unit")
      .attr("x", 8)
      .attr("y", 14)
      .text((d) => d);
    const marks = body
      .selectAll("g.mark")
      .data(rows, (d) => d.id)
      .join(
        (enter) => enter.append("g").attr("class", "mark"),
        (update) => update,
        (exit) => exit.on(".chart", null).remove(),
      )
      .attr("data-row", (d) => d.id)
      .attr("data-value", (d) => (d.value === null ? "missing" : d.value))
      .on("click.chart", (_, d) => {
        if (alive) onSelect(d.id);
      });
    marks.each(function (d) {
      const g = select(this),
        cx = x(d.id) + x.bandwidth() / 2,
        color = selected === d.id ? "#40358c" : "#7264b2";
      g.selectAll("rect")
        .data(mode === "bar" && d.value !== null ? [d] : [])
        .join("rect")
        .attr("x", x(d.id))
        .attr("y", y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", bottom - y(d.value))
        .attr("fill", color);
      g.selectAll("circle")
        .data(mode === "line" && d.value !== null ? [d] : [])
        .join("circle")
        .attr("cx", cx)
        .attr("cy", y(d.value))
        .attr("r", selected === d.id ? 6 : 4)
        .attr("fill", color);
      g.selectAll("line.zero")
        .data(mode === "bar" && d.value === 0 ? [d] : [])
        .join("line")
        .attr("class", "zero")
        .attr("x1", x(d.id))
        .attr("x2", x(d.id) + x.bandwidth())
        .attr("y1", bottom)
        .attr("y2", bottom)
        .attr("stroke", color)
        .attr("stroke-width", 3);
      g.selectAll("text.value")
        .data([d])
        .join("text")
        .attr("class", "value")
        .attr("x", cx)
        .attr("y", d.value === null ? bottom - 8 : Math.max(13, y(d.value) - 9))
        .attr("text-anchor", "middle")
        .text(d.value === null ? "缺失" : d.value);
    });
    body
      .selectAll("path.trend")
      .data(mode === "line" ? [rows] : [])
      .join("path")
      .attr("class", "trend")
      .attr(
        "d",
        line()
          .defined((d) => d.value !== null)
          .x((d) => x(d.id) + x.bandwidth() / 2)
          .y((d) => y(d.value)),
      )
      .attr("fill", "none")
      .attr("stroke", "#7264b2")
      .attr("stroke-width", 2)
      .attr("pointer-events", "none")
      .lower();
    svg
      .selectAll("text.empty")
      .data(rows.length ? [] : ["没有匹配记录（不是0次）"])
      .join("text")
      .attr("class", "empty")
      .attr("x", width / 2)
      .attr("y", 115)
      .attr("text-anchor", "middle")
      .text((d) => d);
    draws++;
    onDraw?.();
  }
  function request() {
    if (!alive || document.hidden || frame) return;
    const version = epoch;
    frame = requestAnimationFrame(() => {
      if (!alive || version !== epoch) return;
      frame = 0;
      draw();
    });
  }
  function cancel() {
    epoch++;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  const visibility = () => {
    if (!alive) return;
    if (document.hidden) cancel();
    else request();
  };
  const ro =
    typeof ResizeObserver === "function" ? new ResizeObserver(request) : null;
  ro?.observe(host);
  if (!ro) window.addEventListener("resize", request);
  document.addEventListener("visibilitychange", visibility);
  return {
    update(next) {
      if (!alive) return;
      config = next;
      request();
    },
    snapshot() {
      return {
        alive,
        pending: !!frame,
        width: Number(svg.attr("width")),
        mode: svg.attr("data-mode"),
        rows: body
          .selectAll("g.mark")
          .data()
          .map((d) => ({ ...d })),
        geometry: body
          .selectAll("g.mark")
          .nodes()
          .map((n) => ({
            id: n.getAttribute("data-row"),
            rect: n.querySelector("rect")
              ? Object.fromEntries(
                  ["x", "y", "width", "height"].map((a) => [
                    a,
                    Number(n.querySelector("rect").getAttribute(a)),
                  ]),
                )
              : null,
            circle: n.querySelector("circle")
              ? {
                  cx: Number(n.querySelector("circle").getAttribute("cx")),
                  cy: Number(n.querySelector("circle").getAttribute("cy")),
                }
              : null,
            zero: !!n.querySelector("line.zero"),
          })),
        path: body.select("path.trend").node()?.getAttribute("d") ?? null,
        counts: runtimeState(),
      };
    },
    destroy() {
      if (!alive) return;
      alive = false;
      cancel();
      ro?.disconnect();
      window.removeEventListener("resize", request);
      document.removeEventListener("visibilitychange", visibility);
      body.selectAll(".mark").on(".chart", null);
      svg.remove();
      controllers--;
      removed++;
    },
  };
}
