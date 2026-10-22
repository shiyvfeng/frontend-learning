import React, { useEffect, useRef, useState } from "react";
import {
  workflowObjects,
  applyWorkflowBinding,
  createWorkflowController,
  splineScope,
} from "./lesson-twenty-seven-content";
const names = { stage: "展示台", tag: "标签牌" };
export default function SplineWorkbench({ data, patch }) {
  const [model, setModel] = useState(workflowObjects),
    [machine, setMachine] = useState({ status: "empty", id: null, queued: 0 }),
    [message, setMessage] = useState(
      "这是本地工作流模拟，没有Spline资产或运行时。先生成交付记录，再模拟加载。",
    ),
    [logs, setLogs] = useState([]),
    [reduce, setReduce] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const latest = useRef(data),
    patchRef = useRef(patch),
    modelRef = useRef(model),
    trigger = useRef(null),
    controller = useRef(null),
    failedBefore = useRef(false),
    guarded = useRef(false),
    logId = useRef(0);
  latest.current = data;
  patchRef.current = patch;
  modelRef.current = model;
  const say = (text) => {
    setMessage(text);
    setLogs((old) => [{ id: ++logId.current, text }, ...old].slice(0, 6));
  };
  if (!controller.current)
    controller.current = createWorkflowController((e) => {
      setMachine({ status: e.status, id: e.id, queued: e.queued });
      if (e.type === "started")
        say(`模拟加载#${e.id}进行中；没有网络或定时器，等待手动投递结果。`);
      else if (e.type === "success") {
        const fresh = workflowObjects();
        modelRef.current = fresh;
        setModel(fresh);
        patchRef.current({
          loadedSeen: true,
          ...(failedBefore.current ? { retrySeen: true } : {}),
        });
        failedBefore.current = false;
        guarded.current = false;
        say(
          `本地演练#${e.id}已就绪；这不是Spline加载成功，示意变量已恢复初值。`,
        );
      } else if (e.type === "failure") {
        failedBefore.current = true;
        patchRef.current({ failureSeen: true });
        say(
          "模拟加载失败：显示文字回退，保留配置，可选择下次成功后重新模拟加载。",
        );
      } else if (e.type === "canceled") {
        patchRef.current({ canceledSeen: true });
        say(
          "已取消本次模拟加载；旧结果仍可手动投递，用于验证隔离，不会变成就绪。",
        );
      } else if (e.type === "stale") {
        patchRef.current({ staleSeen: true });
        say(
          `旧结果#${e.packetId}已忽略；当前会话状态保持${e.status}，未覆盖新尝试。`,
        );
      } else if (e.type === "repeated")
        say("已有一次模拟加载进行中；重复开始不会创建第二次请求。");
      else if (e.type === "full")
        say("待投递队列已达8条上限；先投递旧结果再开始，避免无限积压。");
      else if (e.type === "empty") say("没有待投递结果，状态未改变。");
      else if (e.type === "no-cancel")
        say("当前没有进行中的模拟加载；取消未改变已完成或空状态。");
      else if (e.type === "invalidated") {
        failedBefore.current = false;
        guarded.current = false;
        modelRef.current = workflowObjects();
        setModel(modelRef.current);
        say(
          "交付条件已改变；当前就绪或待处理尝试已失效，旧结果不能套到新配置。",
        );
      }
    });
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      changed = () => setReduce(media.matches);
    media.addEventListener("change", changed);
    return () => {
      controller.current.dispose();
      media.removeEventListener("change", changed);
    };
  }, []);
  const changeDelivery = (x) => {
    controller.current.invalidate();
    patch({ ...x, exported: false });
  };
  const exportPlan = () => {
    if (!data.rights) {
      say(
        "先勾选演练中的自制/授权假定；真实项目仍需核对来源、许可与计划。未生成交付记录。",
      );
      return;
    }
    controller.current.invalidate();
    patch({ exported: true });
    say(
      `已生成本地${data.delivery === "runtime" ? "网页运行时" : "静态图片"}交付记录（模拟），未实际导出任何Spline文件。`,
    );
  };
  const begin = () => {
    if (!data.rights || !data.exported) {
      say("缺少演练授权假定或本地交付记录，不能开始模拟加载。");
      return;
    }
    if (data.delivery !== "runtime") {
      say(
        "图片不保留场景对象事件；网页按钮仍可有自身DOM逻辑。请选择网页运行时交付，再生成记录。",
      );
      return;
    }
    controller.current.start(data.outcome);
  };
  const configure = (x) => {
    patch({ ...x, bound: false });
    say("绑定配置已改变，需重新保存规则；当前变量未被自动修改。");
  };
  const saveBinding = () => {
    if (data.missing && data.target === "stage") {
      guarded.current = true;
      patch({ bound: false, guardSeen: true });
      say("目标对象缺失（模拟），未保存绑定；请恢复目标或改选标签牌。");
      return;
    }
    if (data.typeFault) {
      guarded.current = true;
      patch({ bound: false, guardSeen: true });
      say("变量类型不匹配（模拟），未保存绑定；先修复再保存。");
      return;
    }
    patch({ bound: true });
    say(
      `已保存模拟规则：${data.event === "activate" ? "网页按钮激活" : "DOM聚焦"} → ${names[data.target]} → ${data.variable}。不是Spline API调用。`,
    );
  };
  const fire = (actual) => {
    if (controller.current.snapshot().status !== "ready") {
      say(
        "本地演练尚未就绪，事件没有改变量；先生成交付记录并完成一次模拟加载。",
      );
      return;
    }
    const d = latest.current,
      r = applyWorkflowBinding(modelRef.current, d, actual);
    if (!r.ok) {
      guarded.current = true;
      patchRef.current({ guardSeen: true });
      say(r.reason);
      return;
    }
    modelRef.current = r.objects;
    setModel(r.objects);
    patchRef.current({
      eventSeen: true,
      ...(guarded.current ? { recoveredSeen: true } : {}),
    });
    guarded.current = false;
    say(
      `真实DOM${actual === "activate" ? "激活" : "聚焦"}入口已执行本地规则：${names[d.target]}.${d.variable}=${String(r.objects[d.target][d.variable])}。仅为二维模拟结果。`,
    );
  };
  const label = {
    empty: "尚未模拟加载",
    loading: "模拟加载中",
    ready: "本地演练就绪（非Spline）",
    failed: "模拟失败，文字回退",
    canceled: "模拟加载已取消",
  }[machine.status];
  return (
    <div
      className="spline27-lab"
      data-status={machine.status}
      data-queued={machine.queued}
    >
      <div className="spline27-boundary">
        <strong>工作流模拟 · 未运行Spline</strong>
        <p>{splineScope}</p>
      </div>
      <div className="spline27-controls">
        <label className="spline27-caption">
          演练标题
          <input
            aria-label="演练标题"
            maxLength={80}
            value={data.caption}
            onChange={(e) => patch({ caption: e.target.value })}
          />
        </label>
        <button
          onClick={() => patch({ caption: "设计交付到网页：先核对绑定与回退" })}
        >
          填入标题示例
        </button>
        <fieldset>
          <legend>协作与场景来源（演练假定）</legend>
          <div className="spline27-buttons">
            <button
              aria-pressed={data.source === "designer"}
              onClick={() => changeDelivery({ source: "designer" })}
            >
              设计师维护场景
            </button>
            <button
              aria-pressed={data.source === "code"}
              onClick={() => changeDelivery({ source: "code" })}
            >
              程序化数据场景
            </button>
          </div>
          <p>
            {data.source === "designer"
              ? "可优先评估设计师维护的Spline资产工作流，再核对网页接入。"
              : "大量动态数据/算法对象可优先比较Three.js；也可组合设计资产，不把工具互斥。"}
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.rights}
              onChange={(e) => changeDelivery({ rights: e.target.checked })}
            />
            演练假定：场景自制且已获使用授权
          </label>
        </fieldset>
        <fieldset>
          <legend>交付选择 · 不实际导出文件</legend>
          <div className="spline27-buttons">
            <button
              aria-pressed={data.delivery === "runtime"}
              onClick={() => changeDelivery({ delivery: "runtime" })}
            >
              网页运行时交付
            </button>
            <button
              aria-pressed={data.delivery === "image"}
              onClick={() => changeDelivery({ delivery: "image" })}
            >
              静态图片交付
            </button>
            <button onClick={exportPlan}>生成交付记录（模拟）</button>
            <button
              onClick={() => {
                patch({ boundaryReviewed: true });
                say(
                  "已记录边界：官方导出选项不等于当前账号全可用；核对计划、实际导出面板、素材授权与条款生效日期，不承诺免费或任意格式。",
                );
              }}
            >
              记录交付与计划边界
            </button>
          </div>
          <p>
            当前记录：{data.exported ? "已生成本地模拟记录" : "尚未生成"}
            。真实项目分别核对工具、交付资产和所选runtime；本例没有.splinecode文件。
          </p>
        </fieldset>
        <fieldset>
          <legend>手动加载实验 · 全部是本地模拟</legend>
          <div className="spline27-buttons">
            <button
              aria-pressed={data.outcome === "success"}
              onClick={() => patch({ outcome: "success" })}
            >
              下次结果：成功
            </button>
            <button
              aria-pressed={data.outcome === "failure"}
              onClick={() => patch({ outcome: "failure" })}
            >
              下次结果：失败
            </button>
            <button onClick={begin}>开始或重试模拟加载</button>
            <button onClick={() => controller.current.deliver()}>
              投递最早模拟结果
            </button>
            <button onClick={() => controller.current.cancel()}>
              取消本次模拟加载
            </button>
          </div>
          <p>
            开始时捕获“下次结果”，以后改开关只影响下一次。待投递{machine.queued}
            条，最多8条；旧结果仍可投递以验证取消/配置更新后的隔离。
          </p>
        </fieldset>
        <fieldset>
          <legend>对象、事件与变量绑定 · 不是Spline API</legend>
          <div className="spline27-buttons">
            <button
              aria-pressed={data.target === "stage"}
              onClick={() => configure({ target: "stage" })}
            >
              目标：展示台
            </button>
            <button
              aria-pressed={data.target === "tag"}
              onClick={() => configure({ target: "tag" })}
            >
              目标：标签牌
            </button>
            <button
              aria-pressed={data.variable === "theme"}
              onClick={() => configure({ variable: "theme" })}
            >
              变量：主题字符串
            </button>
            <button
              aria-pressed={data.variable === "accent"}
              onClick={() => configure({ variable: "accent" })}
            >
              变量：强调布尔值
            </button>
            <button
              aria-pressed={data.event === "activate"}
              onClick={() => configure({ event: "activate" })}
            >
              事件：按钮激活
            </button>
            <button
              aria-pressed={data.event === "focus"}
              onClick={() => configure({ event: "focus" })}
            >
              事件：DOM聚焦
            </button>
            <button onClick={saveBinding}>保存模拟绑定</button>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.missing}
              onChange={(e) => patch({ missing: e.target.checked })}
            />
            模拟展示台对象缺失
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.typeFault}
              onChange={(e) => patch({ typeFault: e.target.checked })}
            />
            模拟变量类型不匹配
          </label>
          <p>
            规则：{data.event === "activate" ? "按钮激活" : "DOM聚焦"} →{" "}
            {names[data.target]} → {data.variable}切换取值；
            {data.bound ? "已保存" : "尚未保存"}
            。配置变化需重新保存；目标缺失/类型错误会阻止写入，不改绑到别的对象。
          </p>
        </fieldset>
        <div className="spline27-buttons">
          <button
            ref={trigger}
            onClick={() => {
              if (latest.current.event === "activate") fire("activate");
            }}
            onFocus={() => {
              if (latest.current.event === "focus") fire("focus");
            }}
          >
            网页事件入口（本地演练）
          </button>
          <button
            onClick={() => {
              trigger.current?.focus();
              if (latest.current.event !== "focus")
                say("当前监听按钮激活，单独聚焦不修改变量。");
            }}
          >
            把焦点送入事件入口
          </button>
        </div>
        <p>
          按钮激活支持点击/触屏/Enter/Space。聚焦规则只在焦点进入时触发；可先点“把焦点送入”，无需键盘。这里是真实DOM事件驱动本地规则，不是Spline场景事件。
        </p>
      </div>
      <h3 className="spline27-title">{data.caption || "未命名工作流演练"}</h3>
      <ol className="spline27-pipeline" aria-label="设计到网页的工作流示意">
        <li>
          <strong>设计工具</strong>
          <span>本例仅演练流程，无真实编辑器</span>
        </li>
        <li>
          <strong>交付资产</strong>
          <span>{data.exported ? "本地交付记录（模拟）" : "尚无交付记录"}</span>
        </li>
        <li>
          <strong>网页运行时</strong>
          <span>{label}</span>
        </li>
      </ol>
      <div
        className="spline27-diagram"
        aria-label="二维对象与变量示意，非真实3D"
        data-ready={machine.status === "ready"}
      >
        <p className="spline27-diagram-label">
          二维对象/变量示意 · 不是Spline编辑器或3D预览
        </p>
        {Object.entries(model).map(([id, o]) => (
          <div
            key={id}
            className="spline27-object"
            data-object={id}
            data-theme={o.theme}
            data-accent={String(o.accent)}
          >
            <h4>
              {names[id]} {data.missing && id === "stage" ? "（模拟缺失）" : ""}
            </h4>
            <p>
              theme = {o.theme} · accent = {String(o.accent)}
            </p>
            <span>
              {data.missing && id === "stage"
                ? "绑定目标不可用"
                : o.accent
                  ? "✓ 强调开启"
                  : "○ 强调关闭"}
            </span>
          </div>
        ))}
        {machine.status !== "ready" && (
          <p className="spline27-fallback">
            当前不是就绪状态：仅保留示意数据与文字回退，事件不会写入变量。
          </p>
        )}
      </div>
      <p className="spline27-metrics">
        当前：{label}。{reduce ? "系统减少动态已开启" : "系统未要求减少动态"}
        ；演练始终静态，无等待动画。学习标记和配置可保存，当前加载队列/变量会话不跨刷新或离开实验保留。
      </p>
      <div className="spline27-status" role="status">
        {message}
      </div>
      <details className="spline27-log">
        <summary>查看最近6条本地操作反馈</summary>
        <ol>
          {logs.map((x) => (
            <li key={x.id}>{x.text}</li>
          ))}
        </ol>
      </details>
      <div className="spline27-explain">
        <h3>选型时分别问三件事</h3>
        <p>
          谁维护场景？设计工具偏重可视化创作与协作，程序化场景偏重数据与代码控制；Spline与Three.js可以按官方交付能力组合，并非互斥。
        </p>
        <p>
          交付了什么？网页Viewer、Code或其他资产各有接入路径，静态图片不自动保留对象事件。官方列出选项不代表任意账号都可免费导出；按当前计划、实际导出面板、素材许可及条款生效日期核对。
        </p>
        <p>
          网页怎样运行？真实项目才安装选定runtime、加载合法资产并绑定实际对象/变量。验证加载失败、对象改名/删除、变量类型、取消与清理，给文字/控件替代和性能预算。本例本地函数不是Spline
          API。
        </p>
      </div>
    </div>
  );
}
