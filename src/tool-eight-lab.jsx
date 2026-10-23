import React, { useEffect, useRef, useState } from "react";
import { createAssetGate } from "./lesson-twenty-eight-content";
import { routes, recommendation, tool08Scope } from "./tool-eight-content";
const add = (a, v) => [...new Set([...a, v])];
function SceneView({ asset, data, patch, api, failed }) {
  const host = useRef(null),
    latest = useRef(null);
  latest.current = { data, patch };
  const [state, setState] = useState({
    status: "empty",
    message: "未准备真实模块，当前仅显示文字替代。",
    draws: 0,
  });
  useEffect(() => {
    setState({
      status: asset ? "loading" : "empty",
      message: asset
        ? "正在创建本例Three.js场景。"
        : "未准备真实模块，当前仅显示文字替代。",
      draws: 0,
    });
    if (!asset) return;
    let live = true,
      c;
    const report = (e) => {
      if (!live) return;
      setState(e);
      const { data, patch } = latest.current;
      if (e.status === "ready") {
        if (!data.loadedSeen) patch({ loadedSeen: true });
        if (failed.current && !data.retrySeen) patch({ retrySeen: true });
      }
      if (e.status === "failed") {
        failed.current = true;
        if (!data.failureSeen) patch({ failureSeen: true });
      }
    };
    try {
      c = asset.createScene(host.current, report);
      api.current = c;
      c.update(latest.current.data);
    } catch {
      report({
        status: "failed",
        message: "场景初始化失败，当前为非3D回退，可重新准备。",
        draws: 0,
      });
    }
    return () => {
      live = false;
      c?.destroy();
      api.current = null;
    };
  }, [asset]);
  useEffect(() => {
    api.current?.update(data);
  }, [
    data.finish,
    data.height,
    data.view,
    data.light,
    data.stock,
    data.low,
    data.fallback,
  ]);
  return (
    <section className="tool08-scene tool08-panel" data-state={state.status}>
      <h3>固定真实预览 · 几何台灯</h3>
      <p>
        Three.js 0.186.1 / WebGL
        2。自制几何示意，非制造模型；R3F/Spline候选不改变此处引擎。
      </p>
      <div className="tool08-canvas-host" ref={host} aria-hidden="true" />
      <p className="tool08-render-status">
        绘制状态：{state.status} · {state.message}
      </p>
      <p>
        配置文字替代：{data.finish}灯罩 / {data.height}支架 / {data.view}视角 /
        主光{data.light}。库存样例{data.stock}，对应{data.stock}个标记。
      </p>
      <p>
        实际绘制次数：<output aria-live="off">{state.draws}</output>
        ；静止时不持续绘制。
      </p>
    </section>
  );
}
export default function Tool08Workbench({ data, patch }) {
  const [asset, setAsset] = useState(null),
    [snap, setSnap] = useState({ status: "empty", queued: 0, prepared: 0 }),
    [message, setMessage] = useState(
      "先核对路线。预览仅在主动准备并应用后创建。",
    ),
    [reduced, setReduced] = useState(false),
    [epoch, setEpoch] = useState(0),
    [snapshot, setSnapshot] = useState(null);
  const gate = useRef(null),
    api = useRef(null),
    latest = useRef(null),
    failed = useRef(false);
  latest.current = { data, patch };
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduced(m.matches);
    change();
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const g = createAssetGate((e) => {
      setSnap(e);
      const { data, patch } = latest.current;
      switch (e.type) {
        case "started":
          setAsset(null);
          setSnapshot(null);
          setMessage("正在准备真实打包模块；应用由你手动决定，用来演练延迟。");
          break;
        case "prepared":
          setMessage("模块结果已准备，可应用最早结果。");
          break;
        case "success":
          setAsset(e.value);
          setMessage("当前代次已接受；资源就绪与实际3D绘制是两个状态。");
          if (failed.current && !data.retrySeen) patch({ retrySeen: true });
          break;
        case "failure":
          failed.current = true;
          setAsset(null);
          patch({ failureSeen: true });
          setMessage(`模块失败：${e.error}。保留文字，可以重试或重载页面。`);
          break;
        case "canceled":
          setAsset(null);
          patch({ canceledSeen: true });
          setMessage(
            "已取消本次应用；浏览器模块下载可能继续，旧结果不能建场景。",
          );
          break;
        case "stale":
          patch({ staleSeen: true });
          setMessage("旧代次已隔离，未改变当前场景或焦点。");
          break;
        case "repeated":
          setMessage("已有准备进行中，重复开始不增加场景。");
          break;
        case "full":
          setMessage("最多8条待应用结果，请先投递清理。");
          break;
        case "preparing":
          setMessage("最早模块尚未准备完成；没有创建额外请求。");
          break;
        case "empty":
          setMessage("没有待应用结果，操作按钮与焦点保留。");
          break;
        default:
          break;
      }
    });
    gate.current = g;
    return () => {
      g.dispose();
      gate.current = null;
    };
  }, [epoch]);
  function begin() {
    const r = gate.current?.start();
    if (!r) return;
    const outcome = data.outcome;
    (async () => {
      try {
        if (outcome === "failure") throw Error("手动模拟模块失败");
        const m = await import("./tool-eight-runtime");
        r.prepare(m, null);
      } catch (e) {
        r.prepare(null, String(e.message || e));
      }
    })();
  }
  function change(k, v, flags = {}) {
    setSnapshot(null);
    patch((o) => ({
      [k]: v,
      ...flags,
      draftStale: o.generated || o.draftStale,
      reviewed: false,
    }));
  }
  function inspect() {
    const actual = api.current?.inspect();
    setSnapshot(
      actual ?? { kind: "non-3d", renderer: false, reason: "尚无本例运行时" },
    );
    patch({ inspectedSeen: true });
    setMessage(
      actual?.renderer
        ? "已读取实际renderer、几何参数与绘制状态；软件WebGL不是硬件跑分。"
        : "当前为明确非3D快照，不算真实运行成功。",
    );
  }
  return (
    <div
      className="tool08-lab"
      data-status={snap.status}
      data-queued={snap.queued}
      data-prepared={snap.prepared}
      data-reduced={reduced}
    >
      <div className="tool08-runtime">
        <strong>实际机制与候选边界</strong>
        <p>{tool08Scope}</p>
        <p>
          {reduced
            ? "系统减少动态：本例本来就按需静态绘制，无自动动画，所有参数和文字仍可操作。"
            : "默认静态、按需绘制，控件不劫持页面滚动。"}
        </p>
      </div>
      {data.step === 0 && (
        <>
          <fieldset className="tool08-panel">
            <legend>同一台灯产品预览的路线条件</legend>
            <div className="tool08-buttons">
              {routes.map(([v, n]) => (
                <button
                  key={v}
                  aria-pressed={data.route === v}
                  onClick={() => {
                    change("route", v);
                    patch((o) => ({ routesSeen: add(o.routesSeen, v) }));
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="tool08-controls">
              <label htmlFor="tool08-asset">现有资产</label>
              <select
                id="tool08-asset"
                value={data.asset}
                onChange={(e) => change("asset", e.target.value)}
              >
                <option value="geometry">可程序化的简单几何</option>
                <option value="designer">已有设计师交付资产</option>
              </select>
              <label htmlFor="tool08-app">现有应用</label>
              <select
                id="tool08-app"
                value={data.app}
                onChange={(e) => change("app", e.target.value)}
              >
                <option value="react">已有React应用</option>
                <option value="plain">非React页面</option>
              </select>
            </div>
            <div className="tool08-buttons">
              {[
                ["static", "固定展示需求"],
                ["data", "动态业务数据需求"],
              ].map(([v, n]) => (
                <button
                  key={v}
                  aria-pressed={data.input === v}
                  onClick={() => {
                    change("input", v);
                    patch((o) => ({ inputsSeen: add(o.inputsSeen, v) }));
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="tool08-recommendation">{recommendation(data)}</p>
            <button onClick={() => patch({ comparedSeen: true })}>
              记录抽象层级与选型条件
            </button>
          </fieldset>
          <ol className="tool08-layers">
            <li>
              <strong>Three.js</strong>：组织对象/相机/材质，调用renderer。
            </li>
            <li>
              <strong>R3F候选</strong>
              ：用React组件/props组织Three.js对象，仍有资源和渲染预算。
            </li>
            <li>
              <strong>Spline候选</strong>：设计工具 → 合法导出资产 →
              对应runtime；React包装不等于R3F。
            </li>
          </ol>
        </>
      )}
      {data.step !== 0 && (
        <>
          <fieldset className="tool08-panel">
            <legend>真实模块与手动应用队列</legend>
            <p>
              模块来自本地打包；手动应用模拟延迟，不是假服务器。取消只撤销结果应用，ES模块下载可能继续。最多8条，只有当前代次可创建场景。
            </p>
            <div className="tool08-buttons">
              <button
                aria-pressed={data.outcome === "success"}
                onClick={() => patch({ outcome: "success" })}
              >
                下次模块正常
              </button>
              <button
                aria-pressed={data.outcome === "failure"}
                onClick={() => patch({ outcome: "failure" })}
              >
                下次模块模拟失败
              </button>
            </div>
            <div className="tool08-buttons">
              <button onClick={begin}>准备或重试3D模块</button>
              <button onClick={() => gate.current?.deliver()}>
                应用最早模块结果
              </button>
              <button onClick={() => gate.current?.cancel()}>
                取消本次应用
              </button>
              <button
                onClick={() => {
                  setAsset(null);
                  setSnapshot(null);
                  setEpoch((x) => x + 1);
                  patch({ cleanupSeen: true });
                  setMessage(
                    "已释放本例场景、模块结果队列和待处理帧，控件保持。",
                  );
                }}
              >
                释放本例3D资源
              </button>
              <button onClick={() => location.reload()}>
                重载页面重试模块
              </button>
            </div>
            <p>
              资源结果状态：{snap.status} · 队列{snap.queued} · 已准备
              {snap.prepared}
            </p>
            <button
              onClick={() => {
                patch({ fallbackAcknowledged: true });
                setMessage("已确认：非3D文字回退可学习，但不是实际渲染成功。");
              }}
            >
              确认非3D回退边界
            </button>
          </fieldset>
          <div className="tool08-controls">
            <label htmlFor="tool08-finish">灯罩颜色</label>
            <select
              id="tool08-finish"
              value={data.finish}
              onChange={(e) =>
                change("finish", e.target.value, { variantSeen: true })
              }
            >
              <option value="violet">紫色</option>
              <option value="sage">鼠尾草绿</option>
            </select>
            <label htmlFor="tool08-height">支架高度</label>
            <select
              id="tool08-height"
              value={data.height}
              onChange={(e) =>
                change("height", e.target.value, { variantSeen: true })
              }
            >
              <option value="normal">标准高度</option>
              <option value="tall">加高支架</option>
            </select>
            <label htmlFor="tool08-light">主光强度</label>
            <select
              id="tool08-light"
              value={data.light}
              onChange={(e) => change("light", e.target.value)}
            >
              <option value="1">柔和1</option>
              <option value="3">明亮3</option>
            </select>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={data.low}
                onChange={(e) => change("low", e.target.checked)}
              />
              低分辨率预算
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={data.fallback}
                onChange={(e) => change("fallback", e.target.checked)}
              />
              手动非3D回退
            </label>
          </div>
          <div className="tool08-buttons">
            <button
              onClick={() =>
                change("view", "front", {
                  viewSeen: data.view !== "front" || data.viewSeen,
                })
              }
            >
              切换正面相机
            </button>
            <button
              onClick={() =>
                change("view", "side", {
                  viewSeen: data.view !== "side" || data.viewSeen,
                })
              }
            >
              重置侧面相机
            </button>
            <button onClick={() => change("stock", 0, { dataSeen: true })}>
              应用本地库存0
            </button>
            <button onClick={() => change("stock", 3, { dataSeen: true })}>
              应用本地库存3
            </button>
            <button
              onClick={() => {
                api.current?.retry();
                setSnapshot(null);
                setMessage(
                  "已请求当前有效场景按最新配置重建；丢失的上下文等待浏览器恢复。",
                );
              }}
            >
              重建当前3D
            </button>
            <button onClick={inspect}>读取实际3D快照</button>
          </div>
          <SceneView
            key={epoch}
            asset={asset}
            data={data}
            patch={patch}
            api={api}
            failed={failed}
          />
          {snapshot && (
            <p className="tool08-boundary">
              以下是点击时的快照，不是实时数据流；当前绘制状态见上方，调参后可重新读取。
            </p>
          )}
          {snapshot && (
            <pre
              className="tool08-snapshot"
              data-scene-snapshot={JSON.stringify(snapshot)}
            >
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          )}
          {data.step === 1 && (
            <section className="tool08-panel">
              <h3>同一状态对象，三条接入合同</h3>
              <p>
                本地手动样例：finish={data.finish} / height={data.height} /
                stock={data.stock}
                。这些数据不会从服务端同步，也不是保存成功凭据。
              </p>
              <table>
                <caption>仅Three.js真实执行，其他两行是路线示意</caption>
                <thead>
                  <tr>
                    <th>路线</th>
                    <th>同一配置的映射与维护</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Three.js（实际）</th>
                    <td>
                      更新灯罩material、支架scale/位置、库存标记visible，再按需render。
                    </td>
                  </tr>
                  <tr>
                    <th>R3F候选（示意）</th>
                    <td>
                      配置成为组件props，React组织Three.js对象；按需模式核对invalidate，缓存/共享资源明确所有权。
                    </td>
                  </tr>
                  <tr>
                    <th>Spline候选（示意）</th>
                    <td>
                      需资产暴露灯罩/支架对象及stock变量或事件；核对标识、导出和runtime后与DOM表单同步。
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
      <p className="tool08-feedback" role="status">
        {message}
      </p>
    </div>
  );
}
