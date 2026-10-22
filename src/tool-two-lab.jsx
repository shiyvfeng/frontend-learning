import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import compiled from "./tool-two.generated.css?raw";
import {
  tool02Palettes,
  tool02Classes,
  tool02LongTitle,
  tool02Scope,
} from "./tool-two-content";
const html =
  '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tailwind真实编译样例</title></head><body><div id="tool02-root"></div></body></html>';
const base =
  "html{font-size:16px}body{margin:12px;background:#fff;color:#272334;font:16px/1.6 system-ui,sans-serif}h2,h3,p{margin:0}main{min-width:0}h2{font-size:16px;margin-bottom:12px}h3{font-size:18px}.demo-content{flex:1;min-width:min(100%,8rem);max-width:100%;overflow-wrap:anywhere}.demo-marker{font-size:20px;line-height:32px}.demo-content button{margin-top:12px;max-width:100%;overflow-wrap:anywhere}.demo-cards{display:grid;gap:16px}.demo-help{margin-top:12px;font-size:14px}.demo-card{scroll-margin:18px}";
export default function Tool02Workbench({ data, patch }) {
  const iframe = useRef(null),
    alive = useRef(true),
    latest = useRef(data),
    [doc, setDoc] = useState(null),
    [fault, setFault] = useState(""),
    [stats, setStats] = useState(null),
    [counts, setCounts] = useState([0, 0]),
    [message, setMessage] = useState(
      "选择视觉参数，再按“读取实际样式并记录观察”。数值来自浏览器，不是替你完成生产验收。",
    );
  latest.current = data;
  const classes = tool02Classes(data),
    palette =
      tool02Palettes.find((p) => p.id === data.palette) || tool02Palettes[0];
  const measure = useCallback(() => {
    const d = iframe.current?.contentDocument;
    if (!alive.current || !d?.querySelector(".demo-card")) return null;
    try {
      const a = d.querySelectorAll(".demo-card"),
        buttons = d.querySelectorAll(".demo-action"),
        w = d.defaultView,
        one = w.getComputedStyle(a[0]),
        two = w.getComputedStyle(a[1]),
        button = w.getComputedStyle(buttons[0]),
        panel = d.querySelector("#demo-panel"),
        root = w.getComputedStyle(d.documentElement),
        rules = [];
      const wanted = [
        latest.current.density === "compact" ? "p-4" : "p-6",
        "bg-brand",
        latest.current.query === "viewport"
          ? "lab:flex-row"
          : "@lab/panel:flex-row",
        "disabled:bg-soft",
        "focus-visible:outline-2",
      ];
      const walk = (rs, parents = []) => {
        for (const r of rs) {
          if (
            r.selectorText &&
            wanted.some((c) => r.selectorText.includes("." + w.CSS.escape(c)))
          )
            rules.push(
              parents.map((h) => h + " {").join("\n") +
                "\n" +
                r.cssText +
                "\n" +
                parents.map(() => "}").join("\n"),
            );
          if (r.cssRules)
            walk(
              r.cssRules,
              r.selectorText
                ? parents
                : [...parents, r.cssText.split("{")[0].trim()],
            );
        }
      };
      const sheet = d.querySelector("#tool02-compiled")?.sheet;
      if (sheet) walk(sheet.cssRules);
      const s = {
        viewport: w.innerWidth,
        outerViewport: window.innerWidth,
        panel: Math.round(panel.getBoundingClientRect().width * 10) / 10,
        media: w.matchMedia("(min-width:256px)").matches,
        containerSupported: w.CSS.supports("container-type", "inline-size"),
        containerName: w.getComputedStyle(panel).containerName,
        padding: one.paddingTop,
        secondPadding: two.paddingTop,
        gap: one.gap,
        direction: one.flexDirection,
        secondDirection: two.flexDirection,
        buttonBackground: button.backgroundColor,
        buttonColor: button.color,
        brand: root.getPropertyValue("--color-brand").trim(),
        unit: root.getPropertyValue("--spacing").trim(),
        outline: button.outlineStyle,
        buttonDisabled: buttons[0].disabled,
        overflow: d.documentElement.scrollWidth > w.innerWidth,
        compiledRules: [...new Set(rules)].join("\n"),
        compiledBytes: compiled.length,
        ready:
          !!sheet && one.display === "flex" && parseFloat(one.paddingTop) > 0,
      };
      const h = Math.ceil(
        d.querySelector("main").getBoundingClientRect().height + 24,
      );
      if (
        iframe.current &&
        Math.abs(parseFloat(iframe.current.style.height || "0") - h) > 1
      )
        iframe.current.style.height = Math.max(260, h) + "px";
      setFault(
        s.ready
          ? ""
          : "编译样式没有生效；只能阅读文字回退，不能记作真实样式验证。",
      );
      setStats((old) => (JSON.stringify(old) === JSON.stringify(s) ? old : s));
      return s;
    } catch (e) {
      setFault(
        "无法读取隔离预览的真实样式；可使用文字回退，并在支持环境补测。",
      );
      return null;
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const loaded = () => {
    if (!alive.current) return;
    try {
      const d = iframe.current.contentDocument;
      if (!d?.querySelector("#tool02-root")) throw Error("missing document");
      if (!d.querySelector("#tool02-compiled")) {
        const basic = d.createElement("style");
        basic.textContent = base;
        basic.id = "tool02-base";
        d.head.append(basic);
        const style = d.createElement("style");
        style.id = "tool02-compiled";
        style.textContent = compiled;
        d.head.append(style);
      }
      setFault("");
      setDoc(d);
    } catch {
      setFault("无法载入隔离预览；这里没有伪造Tailwind结果，可阅读文字回退。");
    }
  };
  useLayoutEffect(() => {
    if (!doc) return;
    const root = doc.documentElement;
    root.style.setProperty("--spacing", data.unit + "px");
    root.style.setProperty("--color-brand", palette.brand);
    root.style.setProperty("--color-brand-deep", palette.deep);
    measure();
  }, [doc, data, counts, measure, palette]);
  useEffect(() => {
    if (!doc) return;
    const win = doc.defaultView;
    const listener = () => measure();
    win.addEventListener("resize", listener);
    doc.addEventListener("focusin", listener);
    doc.addEventListener("focusout", listener);
    doc.addEventListener("pointerover", listener);
    doc.addEventListener("pointerout", listener);
    const ro =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(listener)
        : null;
    ro?.observe(doc.body);
    const panel = doc.querySelector("#demo-panel");
    if (panel) ro?.observe(panel);
    return () => {
      ro?.disconnect();
      win.removeEventListener("resize", listener);
      doc.removeEventListener("focusin", listener);
      doc.removeEventListener("focusout", listener);
      doc.removeEventListener("pointerover", listener);
      doc.removeEventListener("pointerout", listener);
    };
  }, [doc, measure]);
  const edit = (change) => {
    patch((old) => ({
      ...change,
      reviewed: false,
      draftStale: old.generated || old.draftStale,
      ...(change.density
        ? {
            densitiesSeen: [...new Set([...old.densitiesSeen, change.density])],
          }
        : {}),
      ...(change.palette
        ? { palettesSeen: [...new Set([...old.palettesSeen, change.palette])] }
        : {}),
      ...(change.variant
        ? { variantsSeen: [...new Set([...old.variantsSeen, change.variant])] }
        : {}),
    }));
    setMessage("参数已改变；真实样式由浏览器重算，编辑草稿不会自动覆盖。");
  };
  const choose = (i) => {
    if (i === 0 && latest.current.disabled) {
      patch({ disabledSeen: true });
      setMessage(
        "第一张是原生disabled，选择次数未增加；禁用样式不代表业务成功。",
      );
      return;
    }
    setCounts((v) => v.map((n, j) => (j === i ? n + 1 : n)));
    patch(i === 0 ? { firstSeen: true } : { secondSeen: true });
    setMessage(`第${i + 1}张实例的本地选择次数增加；没有发送或保存到服务器。`);
  };
  const observe = () => {
    const s = measure();
    if (!s?.ready) {
      setMessage("尚未获得真实编译样式；不能把文字回退记作样式验证。");
      return;
    }
    if (data.query === "container" && !s.containerSupported) {
      setMessage(
        "当前环境不支持container query；可阅读静态回退并记录补测限制。",
      );
      return;
    }
    patch({
      sampleSeen: true,
      ...(data.query === "viewport"
        ? { viewportSeen: true }
        : { containerSeen: true }),
      ...(data.query === "container" &&
      data.panel === 55 &&
      s.panel < s.viewport
        ? { independentSeen: true }
        : {}),
      ...(data.title.trim().length >= 35 && !s.overflow
        ? { longSeen: true }
        : {}),
    });
    setMessage(
      `已读取：padding ${s.padding}，gap ${s.gap}，方向 ${s.direction}；iframe viewport ${s.viewport}px，container ${s.panel}px。这是当前预览观察，不是生产验证。`,
    );
  };
  const iframeContent =
    doc &&
    createPortal(
      <main aria-label="真实Tailwind样例">
        <h2>本地组件样例 · 两个独立实例</h2>
        <div
          id="demo-panel"
          className="@container/panel"
          style={{ width: data.panel + "%", maxWidth: "100%" }}
        >
          <div className="demo-cards">
            {[0, 1].map((i) => {
              const c =
                i === 0
                  ? classes
                  : tool02Classes({ ...data, variant: "outline" });
              return (
                <article
                  key={i}
                  className={"demo-card " + c.card}
                  aria-label={`教学卡片${i + 1}`}
                >
                  <span className="demo-marker" aria-hidden="true">
                    {i === 0 ? "◈" : "◇"}
                  </span>
                  <div className="demo-content">
                    <h3>
                      {i === 1 ? "第二实例 · " : ""}
                      {data.title || "未填写标题（空状态）"}
                    </h3>
                    <p>
                      共享间距与品牌token；
                      {i === 0 ? "当前变体可切换" : "描边变体保持独立"}。
                    </p>
                    <button
                      className={"demo-action " + c.button}
                      disabled={i === 0 && data.disabled}
                      onClick={() => choose(i)}
                      aria-label={`选择第${i + 1}张教学卡片`}
                    >{`选择第${i + 1}张`}</button>
                    <p data-demo-count={i}>
                      本地选择 {counts[i]} 次
                      {i === 0 && data.disabled ? " · 当前不可用" : ""}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <p className="demo-help">
          只有此iframe加载Tailwind编译CSS。按钮是真实原生按钮；状态和计数由本站React处理。
        </p>
      </main>,
      doc.querySelector("#tool02-root"),
    );
  return (
    <div
      className="tool02-workbench"
      data-stats={JSON.stringify(stats)}
      data-counts={JSON.stringify(counts)}
    >
      <p className="tool02-boundary">
        <strong>真实编译 · 限定样例 · 无全站Preflight</strong>。{tool02Scope}
      </p>
      <div className="tool02-controls">
        <fieldset>
          <legend>同一组件的视觉参数</legend>
          <label htmlFor="tool02-density">密度变体</label>
          <select
            id="tool02-density"
            value={data.density}
            onChange={(e) => edit({ density: e.target.value })}
          >
            <option value="compact">紧凑 · p-4 / gap-3</option>
            <option value="roomy">宽松 · p-6 / gap-4</option>
          </select>
          <label htmlFor="tool02-palette">共享品牌token</label>
          <select
            id="tool02-palette"
            value={data.palette}
            onChange={(e) => edit({ palette: e.target.value })}
          >
            {tool02Palettes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <label htmlFor="tool02-unit">共享间距单元（只影响预览）</label>
          <select
            id="tool02-unit"
            value={data.unit}
            onChange={(e) => edit({ unit: Number(e.target.value) })}
          >
            <option value={4}>4px · 原始token</option>
            <option value={6}>6px · 两实例同步</option>
          </select>
          <p>
            密度改变完整utilities组合；token改变相同utility引用的值。两者不是自动生成设计规范。
          </p>
        </fieldset>
        <fieldset>
          <legend>响应条件与实际范围</legend>
          <label htmlFor="tool02-query">布局条件</label>
          <select
            id="tool02-query"
            value={data.query}
            onChange={(e) => edit({ query: e.target.value })}
          >
            <option value="viewport">media · iframe viewport ≥256px</option>
            <option value="container">container · panel ≥192px</option>
          </select>
          <label htmlFor="tool02-frame">iframe实际viewport宽度</label>
          <select
            id="tool02-frame"
            value={data.frameSize}
            onChange={(e) => edit({ frameSize: e.target.value })}
          >
            <option value="full">填满可用预览区</option>
            <option value="narrow">可用区的70%（改变真实iframe宽度）</option>
            <option value="compact">
              220px样例viewport（仍受可用空间限制）
            </option>
          </select>
          <label htmlFor="tool02-panel">内部container宽度</label>
          <select
            id="tool02-panel"
            value={data.panel}
            onChange={(e) => edit({ panel: Number(e.target.value) })}
          >
            <option value={100}>100% · 保持较宽</option>
            <option value={55}>55% · 只缩小container</option>
          </select>
          <p>
            示例自定义lab阈值：256px，@lab/panel为192px；非默认sm/md，非生产断点建议。改变container不会触发media。窄容器即使条件为row也可能正常换行。
          </p>
        </fieldset>
        <fieldset>
          <legend>组件变体、长内容与原生状态</legend>
          <label htmlFor="tool02-variant">第一张按钮变体</label>
          <select
            id="tool02-variant"
            value={data.variant}
            onChange={(e) => edit({ variant: e.target.value })}
          >
            <option value="solid">实心 · 主操作</option>
            <option value="outline">描边 · 次操作</option>
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.disabled}
              onChange={(e) => edit({ disabled: e.target.checked })}
            />
            第一张原生disabled（第二张仍可用）
          </label>
          <label htmlFor="tool02-title">可编辑教学标题</label>
          <textarea
            id="tool02-title"
            maxLength={160}
            value={data.title}
            onFocus={(e) =>
              e.currentTarget.scrollIntoView({
                block: "center",
                behavior: "auto",
              })
            }
            onChange={(e) => edit({ title: e.target.value })}
          />
          <button onClick={() => edit({ title: tool02LongTitle })}>
            填入长标题示例（替换本栏）
          </button>
          <p>
            示例颜色经过限定；实际项目仍需验收每种状态的对比度与语义。focus-visible不应被当成装饰删除；禁用按钮会跳过原生Tab序列。
          </p>
        </fieldset>
      </div>
      <div className="tool02-actions">
        <button onClick={observe}>读取实际样式并记录观察</button>
        <button onClick={() => choose(0)}>
          同模型操作第一张（含禁用守卫）
        </button>
        <button onClick={() => choose(1)}>同模型操作第二张</button>
      </div>
      <div className="tool02-feedback" role="status">
        {message}
      </div>
      <section className="tool02-preview" aria-label="隔离的真实编译预览">
        <h3>真实样例 · iframe viewport与内部container各有范围</h3>
        <p>
          可直接点击/Tab到下面的原生按钮；上方同模型按钮提供等价入口。预览没有拖拽、滚动劫持或动画学习门槛。
        </p>
        <iframe
          ref={iframe}
          title="Tailwind真实编译样例"
          srcDoc={html}
          onLoad={loaded}
          style={{
            width:
              data.frameSize === "full"
                ? "100%"
                : data.frameSize === "compact"
                  ? "220px"
                  : "70%",
            height: 600,
          }}
        />
        {iframeContent}
        {(fault || stats?.containerSupported === false) && (
          <div className="tool02-boundary">
            <p>
              {fault ||
                "当前环境不支持container query；阅读文字回退，不冒称条件已生效。"}
            </p>
            <p>
              utility描述最终CSS；共享变量和明确组件变体需要团队约定。media看viewport，container看指定容器。静态文字不等于实际样式验证。
            </p>
            <button
              onClick={() => {
                patch({ fallbackAccepted: true });
                setMessage(
                  "已记录静态回退与补测限制；没有记为真实编译/条件验证。",
                );
              }}
            >
              阅读静态回退并记录验收限制
            </button>
          </div>
        )}
      </section>
      <section className="tool02-readout" aria-label="utility与实际CSS对应">
        <h3>视觉选择 → utility → 编译CSS → computed结果</h3>
        <p>
          仅数值观察区更新，不逐帧播报；点击记录时才播报结果。无自动持续动画。
        </p>
        <div className="tool02-table-scroll">
          <table>
            <caption>浏览器当前实测，不是期望值替身</caption>
            <thead>
              <tr>
                <th>观察</th>
                <th>引用</th>
                <th>实际结果</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>第一/二张padding</th>
                <td>{data.density === "compact" ? "p-4" : "p-6"}，--spacing</td>
                <td data-css="padding">
                  {stats
                    ? `${stats.padding} / ${stats.secondPadding}`
                    : "尚未读取"}
                </td>
              </tr>
              <tr>
                <th>布局间距</th>
                <td>{data.density === "compact" ? "gap-3" : "gap-4"}</td>
                <td data-css="gap">{stats?.gap || "尚未读取"}</td>
              </tr>
              <tr>
                <th>第一/二张方向</th>
                <td>
                  {data.query === "viewport"
                    ? "lab:flex-row"
                    : "@lab/panel:flex-row"}
                </td>
                <td data-css="direction">
                  {stats
                    ? `${stats.direction} / ${stats.secondDirection}`
                    : "尚未读取"}
                </td>
              </tr>
              <tr>
                <th>iframe / container / 父页面</th>
                <td>真实不同空间</td>
                <td data-css="width">
                  {stats
                    ? `${stats.viewport}px / ${stats.panel}px / ${stats.outerViewport}px`
                    : "尚未读取"}
                </td>
              </tr>
              <tr>
                <th>viewport media条件</th>
                <td>iframe ≥256px</td>
                <td data-css="media">
                  {stats ? String(stats.media) : "尚未读取"}
                </td>
              </tr>
              <tr>
                <th>第一张按钮背景/文字</th>
                <td>
                  {data.disabled
                    ? "disabled:bg-soft / text-muted"
                    : data.variant === "solid"
                      ? "bg-brand / text-white"
                      : "bg-paper / text-brand"}
                </td>
                <td data-css="color">
                  {stats
                    ? `${stats.buttonBackground} / ${stats.buttonColor}`
                    : "尚未读取"}
                </td>
              </tr>
              <tr>
                <th>共享token</th>
                <td>--spacing / --color-brand</td>
                <td>{stats ? `${stats.unit} / ${stats.brand}` : "尚未读取"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <details>
          <summary>查看当前完整类名组合（无需记忆）</summary>
          <p>卡片</p>
          <pre data-class="card">{classes.card}</pre>
          <p>第一张按钮</p>
          <pre data-class="button">{classes.button}</pre>
        </details>
        <details>
          <summary>查看样式表中实际编译的相关规则</summary>
          <p>
            保留样式表真实外层条件；规则存在不代表当前条件已满足，请对照computed结果。
          </p>
          <pre data-compiled-rules>
            {stats?.compiledRules ||
              "等待真实样式表；没有用预制映射冒充生成CSS。"}
          </pre>
        </details>
        <p>
          构建期已生成有限候选；运行时改token是CSS变量更新。没有“排列class就一定最后覆盖”的保证，状态冲突要看实际层叠并集中约束。
        </p>
      </section>
    </div>
  );
}
