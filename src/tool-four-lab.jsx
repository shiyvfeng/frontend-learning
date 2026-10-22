import React, { useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/tool04/card";
import { LocalButton } from "./components/tool04/button";
import MaintenanceDialog from "./components/tool04/maintenance-dialog";
import cardSource from "./components/tool04/card.jsx?raw";
import buttonSource from "./components/tool04/button.jsx?raw";
import cssSource from "./components/tool04/components.css?raw";
import "./components/tool04/components.css";
import { tool04Layers, tool04Scope } from "./tool-four-content";
export default function Tool04Workbench({ data, patch, onLeave }) {
  const [counts, setCounts] = useState([0, 0]),
    [candidate, setCandidate] = useState(null),
    [applied, setApplied] = useState(null),
    [check, setCheck] = useState(null),
    [stats, setStats] = useState(null),
    [message, setMessage] = useState(
      "配置真实更新预览；源码是构建时读取的只读本地文件，不会被网页写入。",
    );
  const revision = useRef(0),
    preview = useRef(null);
  const edit = (change) => {
    revision.current++;
    setApplied(null);
    setCheck(null);
    setStats(null);
    patch((old) => ({
      ...change,
      reviewed: false,
      draftStale: old.generated || old.draftStale,
      ...(change.palette
        ? { palettesSeen: [...new Set([...old.palettesSeen, change.palette])] }
        : {}),
      ...(change.variant
        ? { variantsSeen: [...new Set([...old.variantsSeen, change.variant])] }
        : {}),
    }));
    setMessage(
      candidate
        ? "配置已变；旧候选保留作对照，但不能覆盖新选择。请重新准备。"
        : "配置已更新；候选预览已撤回，请重新读取实际值。",
    );
  };
  const effectiveVariant = applied?.mode === "replace" ? "solid" : data.variant;
  const padding =
    (data.density === "roomy" ? 24 : 16) +
    (applied?.mode === "selective" ? 4 : 0);
  const layer =
    tool04Layers.find((l) => l.id === data.layer) || tool04Layers[0];
  const measure = () => {
    const cards = [...preview.current.querySelectorAll('[data-slot="card"]')],
      buttons = [...preview.current.querySelectorAll(".tool04-button")];
    const result = {
      cards: cards.length,
      padding: cards.map((e) => getComputedStyle(e).paddingTop),
      radius: cards.map((e) => getComputedStyle(e).borderRadius),
      buttons: buttons.map((e) => ({
        tag: e.tagName,
        variant: e.dataset.variant,
        height: Math.round(e.getBoundingClientRect().height),
        background: getComputedStyle(e).backgroundColor,
        color: getComputedStyle(e).color,
        disabled: e.disabled,
        text: e.textContent,
        count: Number(e.dataset.businessCount),
      })),
      counts: [...counts],
    };
    setStats(result);
    patch({ measuredSeen: true });
    return result;
  };
  const activate = (i) => {
    if (i === 0 && data.disabled) {
      patch({ disabledSeen: true });
      setMessage(
        "第一张原生按钮已禁用；同模型入口也被守卫拦截，未增加计数。第二张仍可用。",
      );
      return;
    }
    setCounts((old) => old.map((n, k) => (k === i ? n + 1 : n)));
    patch(i === 0 ? { firstSeen: true } : { secondSeen: true });
    setMessage(`第${i + 1}张只更新自己的本地计数；没有报名接口或服务器。`);
  };
  const prepare = () => {
    setCandidate({
      revision: revision.current,
      mode: data.maintenanceChoice,
      variant: data.variant,
    });
    setCheck(null);
    setMessage(
      "已准备教学候选快照，尚未应用。不是获取真实上游更新，也不会写文件。",
    );
  };
  const apply = () => {
    if (!candidate) {
      setMessage("先准备候选，再检查与应用。");
      return;
    }
    if (candidate.revision !== revision.current) {
      patch({ staleSeen: true });
      setMessage("拒绝旧候选：配置已变，不覆盖新选择。请重新准备。");
      return;
    }
    setApplied(candidate);
    setCheck(null);
    if (candidate.mode === "replace") patch({ replacementSeen: true });
    setMessage(
      candidate.mode === "replace"
        ? "整份替换教学对照已应用到预览：本地描边支持丢失，按钮回到实心。配置原文仍保留，可撤回。"
        : candidate.mode === "selective"
          ? "选择合并预览：仅采用教学间距改进（+4px），保留本地variant和两份业务状态。"
          : "保留本地预览：未采用教学提案，仍需记录延期评估与后续回归。",
    );
  };
  const regression = () => {
    const s = measure();
    const current = applied && applied.revision === revision.current;
    const rules = [
      {
        label: "两个Card槽位及原生button仍存在",
        ok: s.cards === 2 && s.buttons.every((b) => b.tag === "BUTTON"),
      },
      {
        label: "项目交互目标最小高度44px（本例约定，非自动无障碍保证）",
        ok: s.buttons.every((b) => b.height >= 44),
      },
      {
        label: "保留项目描边支持及当前variant合同",
        ok:
          s.buttons.every((b) => b.variant === data.variant) &&
          applied?.mode !== "replace",
      },
      {
        label: "预览计数与当前业务模型一致",
        ok: s.buttons.every((b, i) => b.count === counts[i]),
      },
      { label: "候选对应当前配置代次", ok: !!current },
    ];
    const passed = rules.every((r) => r.ok);
    setCheck({ rules, passed });
    if (passed) patch({ maintainedSeen: true });
    setMessage(
      passed
        ? "明确规则通过：只核对以上项目约束，未运行AI评分或完整生产/无障碍验收；延期方案仍需后续评估。"
        : "规则未通过；保留失败说明，可撤回候选、选择合并或记录延期，再准备检查。",
    );
  };
  return (
    <div className="tool04-workbench">
      <p className="tool04-boundary">{tool04Scope}</p>
      <section className="tool04-panel" aria-label="组件职责与真实源码">
        <h3>四层职责，源码可以看见</h3>
        <div className="tool04-actions">
          {tool04Layers.map((l) => (
            <button
              key={l.id}
              aria-pressed={data.layer === l.id}
              onClick={() =>
                patch((old) => ({
                  layer: l.id,
                  layersSeen: [...new Set([...old.layersSeen, l.id])],
                }))
              }
            >
              {l.label}
            </button>
          ))}
        </div>
        <p>{layer.why}</p>
        <label htmlFor="tool04-source">只读本地源码文件</label>
        <select
          id="tool04-source"
          value={data.sourceFile}
          onChange={(e) => patch({ sourceFile: e.target.value })}
        >
          <option value="card">Card · 官方来源教学改编</option>
          <option value="button">LocalButton · 本站原创</option>
          <option value="css">组件CSS · 本站局部样式</option>
        </select>
        <button
          onClick={() => {
            patch({ sourceSeen: true });
            setMessage(
              "已展开实际导入文件原文；有限控件修改配置，不编辑或执行这份源码。",
            );
          }}
        >
          查看实际本地源码（只读）
        </button>
        {data.sourceSeen && (
          <div className="tool04-code">
            <p>
              构建时?raw读取，与实际运行文件同源；没有在线编辑器或任意代码执行。
            </p>
            <pre role="region" tabIndex={0} aria-label="实际本地组件源码">
              <code>
                {
                  { card: cardSource, button: buttonSource, css: cssSource }[
                    data.sourceFile
                  ]
                }
              </code>
            </pre>
            <a
              href="/licenses/shadcn-ui-MIT.txt"
              target="_blank"
              rel="noreferrer"
            >
              Card来源MIT声明 ↗
            </a>
          </div>
        )}
        <MaintenanceDialog
          onRead={() => {
            patch({ contractSeen: true });
            setMessage(
              "已记录维护清单观察；人工仍需实测焦点、阅读和业务，不保证安装后自动全部无障碍。",
            );
          }}
          onLeave={onLeave}
        />
      </section>
      <fieldset className="tool04-controls">
        <legend>有限配置，真实渲染</legend>
        <label htmlFor="tool04-palette">共享品牌token</label>
        <select
          id="tool04-palette"
          value={data.palette}
          onChange={(e) => edit({ palette: e.target.value })}
        >
          <option value="violet">紫色</option>
          <option value="forest">森林绿</option>
        </select>
        <label htmlFor="tool04-density">共享密度token</label>
        <select
          id="tool04-density"
          value={data.density}
          onChange={(e) => edit({ density: e.target.value })}
        >
          <option value="compact">紧凑16px</option>
          <option value="roomy">宽松24px</option>
        </select>
        <label htmlFor="tool04-radius">共享圆角token</label>
        <select
          id="tool04-radius"
          value={data.radius}
          onChange={(e) => edit({ radius: Number(e.target.value) })}
        >
          {[8, 12, 18].map((n) => (
            <option key={n} value={n}>
              {n}px
            </option>
          ))}
        </select>
        <label htmlFor="tool04-variant">本地按钮variant</label>
        <select
          id="tool04-variant"
          value={data.variant}
          onChange={(e) => edit({ variant: e.target.value })}
        >
          <option value="outline">描边</option>
          <option value="solid">实心</option>
        </select>
        <label htmlFor="tool04-size">本地按钮size</label>
        <select
          id="tool04-size"
          value={data.size}
          onChange={(e) => edit({ size: e.target.value })}
        >
          <option value="normal">常规，最小44px</option>
          <option value="large">较大，最小52px</option>
        </select>
        <label htmlFor="tool04-title">第一张标题（本地教学）</label>
        <input
          id="tool04-title"
          value={data.title}
          maxLength={160}
          onChange={(e) => edit({ title: e.target.value })}
        />
        <button
          onClick={() =>
            edit({
              title:
                "长标题示例：让组件在窄屏保留完整文字、可见焦点和清晰的业务入口",
            })
          }
        >
          填入长标题示例（替换本栏）
        </button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.disabled}
            onChange={(e) => edit({ disabled: e.target.checked })}
          />
          第一张原生disabled（第二张仍可用）
        </label>
        <button onClick={() => activate(0)}>
          同模型操作第一张（含禁用守卫）
        </button>
        <button onClick={measure}>读取真实组件样式与DOM</button>
      </fieldset>
      <section
        aria-label="真实本地组件预览"
        ref={preview}
        className="tool04-preview"
        data-applied={applied?.mode || "local"}
        style={{
          "--t04-brand": data.palette === "forest" ? "#216146" : "#5740a4",
          "--t04-pad": padding + "px",
          "--t04-gap": (data.density === "roomy" ? 18 : 12) + "px",
          "--t04-radius": data.radius + "px",
        }}
      >
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>
                {i === 0 ? data.title || "未命名教学活动" : "夜间阅读小组"}
              </CardTitle>
              <CardDescription>
                虚构教学活动 · 本地组件{i + 1}，不是实际报名。
              </CardDescription>
            </CardHeader>
            <CardContent>
              Card结构和token共享；业务状态由每个实例维护。
              {i === 0 ? "第一张可独立禁用。" : "第二张保留自己的操作。"}
            </CardContent>
            <CardFooter>
              <LocalButton
                data-business-count={counts[i]}
                variant={effectiveVariant}
                size={data.size}
                disabled={i === 0 && data.disabled}
                onClick={() => activate(i)}
              >
                第{i + 1}张本地练习 · {counts[i]}
              </LocalButton>
              <span>计数 {counts[i]}</span>
            </CardFooter>
          </Card>
        ))}
      </section>
      {stats && (
        <div className="tool04-readout" data-computed={JSON.stringify(stats)}>
          <h3>刚刚读取的真实值</h3>
          <p>
            Card数量 {stats.cards}；padding {stats.padding.join(" / ")}；radius{" "}
            {stats.radius.join(" / ")}
          </p>
          <p>
            Button{" "}
            {stats.buttons
              .map(
                (b) =>
                  `${b.tag}/${b.variant}/${b.height}px/${b.background}/${b.disabled ? "disabled" : "enabled"}`,
              )
              .join("；")}
          </p>
          <p>这是上次取样，改配置后需重读；不是由界面选择文本推算。</p>
        </div>
      )}
      {data.step === 2 && (
        <section className="tool04-maintenance" aria-label="本地候选维护模拟">
          <h3>本地维护演练 · 非真实上游公告</h3>
          <p>
            虚构提案调整Card间距。整份替换教学分支只保留实心按钮，会丢失项目描边支持；选择合并只将Card
            padding增加4px，保留本地variant。真实上游不会替你理解业务或自动合并。
          </p>
          <label htmlFor="tool04-plan">维护策略候选</label>
          <select
            id="tool04-plan"
            value={data.maintenanceChoice}
            onChange={(e) => edit({ maintenanceChoice: e.target.value })}
          >
            <option value="replace">整份替换教学对照（有冲突）</option>
            <option value="selective">比较后选择合并（保留本地variant）</option>
            <option value="defer">保留本地，记录延期评估</option>
          </select>
          <div className="tool04-actions">
            <button onClick={prepare}>准备教学候选快照</button>
            <button onClick={apply}>应用候选到本页预览</button>
            <button onClick={regression}>运行明确规则检查（非完整验收）</button>
            <button
              onClick={() => {
                setCandidate(null);
                setApplied(null);
                setCheck(null);
                setStats(null);
                setMessage(
                  "已撤回候选预览，配置和两份业务计数保留；没有项目文件被改写。",
                );
              }}
            >
              撤回候选预览
            </button>
          </div>
          <p>
            配置代次 {revision.current}；候选{" "}
            {candidate
              ? `${candidate.mode} / 代次${candidate.revision}`
              : "未准备"}
            ；当前预览 {applied?.mode || "原本地配置"}。
          </p>
          {check && (
            <div className="tool04-check">
              <strong>
                {check.passed
                  ? "明确规则通过，人工验收仍待执行"
                  : "规则未通过，可以恢复重试"}
              </strong>
              <ul>
                {check.rules.map((r) => (
                  <li key={r.label}>
                    {r.ok ? "✓" : "○"} {r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>
            无文件写入、安装或网络更新；检查不判断真实语义、焦点阅读体验或所有调用者。延期评估不是自动批准升级。
          </p>
        </section>
      )}
      <p className="tool04-feedback" role="status">
        {message}
      </p>
    </div>
  );
}
