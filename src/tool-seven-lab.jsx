import React, { useEffect, useRef, useState } from "react";
import { createAssetGate } from "./lesson-twenty-eight-content";
import {
  assets,
  recommendation,
  tool07Scope,
  businessFrames,
} from "./tool-seven-content";
const add = (a, v) => [...new Set([...a, v])];
function Player({
  asset,
  data,
  patch,
  reduced,
  hidden,
  announce,
  onFailure,
  mapRevision,
}) {
  const host = useRef(null),
    out = useRef(null),
    controller = useRef(null),
    latest = useRef(null);
  latest.current = { data, patch, announce, onFailure };
  const [ready, setReady] = useState(false),
    [playing, setPlaying] = useState(false),
    [snapshot, setSnapshot] = useState(null);
  const blocked = reduced || hidden || data.mode === "static";
  useEffect(() => {
    // Keep the controls mounted across resource changes/errors. Only the
    // renderer belongs to this asset lifetime, so focused buttons stay put.
    setReady(false);
    setPlaying(false);
    setSnapshot(null);
    if (host.current) host.current.dataset.frame = "0";
    if (out.current) out.current.textContent = "0";
    if (!asset) return;
    let live = true,
      c;
    const fail = () => {
      if (live)
        latest.current.onFailure(
          "真实Lottie初始化/渲染失败，已释放；可重试或确认文字回退。",
        );
    };
    try {
      c = asset.runtime.createPlayer(host.current, asset, {
        ready() {
          if (!live) return;
          c.configure(latest.current.data.speed, latest.current.data.loop);
          c.seek(latest.current.data.frame);
          setReady(true);
          latest.current.patch({ loadedSeen: true });
        },
        frame(n) {
          if (!live) return;
          host.current.dataset.frame = String(n);
          if (out.current) out.current.textContent = String(Math.round(n));
        },
        complete() {
          if (live) {
            setPlaying(false);
            latest.current.announce("单次动画播放结束；业务状态未改变。");
          }
        },
        fail,
      });
      controller.current = c;
    } catch {
      fail();
    }
    return () => {
      live = false;
      c?.destroy();
      controller.current = null;
    };
  }, [asset]);
  useEffect(() => {
    controller.current?.configure(data.speed, data.loop);
    setSnapshot(null);
  }, [data.speed, data.loop]);
  useEffect(() => {
    controller.current?.seek(data.frame);
    setPlaying(false);
    setSnapshot(null);
  }, [data.frame, mapRevision]);
  useEffect(() => {
    if (blocked) {
      controller.current?.pause();
      setPlaying(false);
      setSnapshot(null);
    }
  }, [blocked]);
  function contract(values) {
    patch((old) => ({
      ...values,
      draftStale: old.generated || old.draftStale,
      reviewed: false,
    }));
  }
  function sample(n) {
    patch({ frame: n, sampledSeen: true });
    controller.current?.seek(n);
    setPlaying(false);
    setSnapshot(null);
    announce(
      ready
        ? `真实runtime已暂停采样第${n}帧。`
        : "文字静态示意：资源未就绪，未声称运行runtime。",
    );
  }
  function play(dir) {
    patch(dir === 1 ? { playedSeen: true } : { reversedSeen: true });
    if (!ready || blocked) {
      sample(dir === 1 ? 119 : 0);
      announce(
        "未播放动态：减少动态/静态/未就绪时用明确的静态阶段替代；不会冒称运行。",
      );
      return;
    }
    controller.current.play(dir);
    setPlaying(true);
    setSnapshot(null);
    announce(
      dir === 1
        ? "真实runtime向前播放；不改变业务。"
        : "真实runtime从当前位置反向播放；到边界时从末帧重播。",
    );
  }
  return (
    <section
      className="tool07-panel tool07-player"
      data-ready={ready}
      data-playing={playing}
      data-engine="lottie-web"
      data-blocked={blocked}
    >
      <h3>固定真实预览 · Lottie JSON</h3>
      <p>
        lottie-web 5.13.0 · SVG renderer ·
        本站原创120帧/30fps。候选资产选择不替换这份预览。
      </p>
      <div className="tool07-art" aria-hidden="true">
        <div ref={host} data-lottie-host data-frame="0" />
      </div>
      {!ready && (
        <p>文字替代：圆点沿轨道移动。当前资源未就绪；Rive候选不在这里运行。</p>
      )}
      <p>
        {ready ? "真实帧：" : "播放器未就绪（占位读数）："}
        <output ref={out} aria-live="off">
          0
        </output>{" "}
        /119；{playing ? "运行中" : "暂停"}。业务：
        <strong data-business>{data.business}</strong>，动画complete不改业务。
      </p>
      <div className="tool07-buttons">
        <button onClick={() => play(1)}>播放或重播真实预览</button>
        <button
          onClick={() => {
            controller.current?.pause();
            setPlaying(false);
            patch({ pausedSeen: true });
            setSnapshot(null);
            announce("已暂停，当前位置保留。");
          }}
        >
          暂停预览
        </button>
        <button onClick={() => play(-1)}>反向预览</button>
      </div>
      <div className="tool07-buttons">
        {[0, 60, 119].map((n) => (
          <button key={n} onClick={() => sample(n)}>
            采样第{n}帧
          </button>
        ))}
      </div>
      <div className="tool07-controls">
        <label htmlFor="tool07-speed">播放速度</label>
        <select
          id="tool07-speed"
          value={data.speed}
          onChange={(e) => contract({ speed: e.target.value })}
        >
          <option value="0.5">0.5倍</option>
          <option value="1">1倍</option>
          <option value="2">2倍</option>
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.loop}
            onChange={(e) => contract({ loop: e.target.checked })}
          />
          显式允许循环（默认关闭）
        </label>
      </div>
      <button
        onClick={() =>
          setSnapshot(
            controller.current
              ? {
                  ...controller.current.inspect(),
                  blocked,
                  business: data.business,
                }
              : {
                  kind: "text-fallback",
                  runtime: false,
                  blocked,
                  business: data.business,
                },
          )
        }
      >
        读取真实播放器快照
      </button>
      {snapshot && (
        <pre
          className="tool07-snapshot"
          data-player-snapshot={JSON.stringify(snapshot)}
        >
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      )}
    </section>
  );
}
export default function Tool07Workbench({ data, patch }) {
  const [asset, setAsset] = useState(null),
    [snap, setSnap] = useState({ status: "empty", queued: 0, prepared: 0 }),
    [message, setMessage] = useState(
      "先核对资产合同；真实预览需要主动准备和应用。",
    ),
    [reduced, setReduced] = useState(false),
    [hidden, setHidden] = useState(false),
    [epoch, setEpoch] = useState(0),
    [mapRevision, setMapRevision] = useState(0);
  const gate = useRef(null),
    controllers = useRef(new Set()),
    latest = useRef(null),
    failed = useRef(false);
  latest.current = { data, patch };
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduced(mq.matches),
      vis = () => setHidden(document.hidden);
    change();
    vis();
    mq.addEventListener("change", change);
    document.addEventListener("visibilitychange", vis);
    return () => {
      mq.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  useEffect(() => {
    const g = createAssetGate((e) => {
      setSnap(e);
      const { data, patch } = latest.current;
      switch (e.type) {
        case "started":
          setAsset(null);
          setMessage(
            "准备真实同源JSON和runtime；手动应用结果是教学延迟，不是服务器。",
          );
          break;
        case "prepared":
          setMessage("结果已准备，可以应用最早结果；旧代次仍须隔离。");
          break;
        case "success":
          setAsset(e.value);
          patch({ retrySeen: failed.current || data.retrySeen });
          setMessage("当前代次资源已接受，初始化真实Lottie。");
          break;
        case "failure":
          failed.current = true;
          setAsset(null);
          patch({ failureSeen: true });
          setMessage(`资源失败：${e.error}。保留文字，可选正常资源重试。`);
          break;
        case "canceled":
          setAsset(null);
          patch({ canceledSeen: true });
          setMessage("已取消；旧结果可投递但不会覆盖当前资源。");
          break;
        case "stale":
          patch({ staleSeen: true });
          setMessage("旧结果已隔离，未改当前实例或业务。");
          break;
        case "repeated":
          setMessage("当前正在准备，重复点击不会再建实例。");
          break;
        case "full":
          setMessage("最多8条待投递结果，请先应用清理。");
          break;
        case "preparing":
          setMessage("真实资源尚在准备，请准备完成后应用。");
          break;
        case "empty":
          setMessage("没有待应用结果；按钮和焦点保留。");
          break;
        default:
          break;
      }
    });
    gate.current = g;
    return () => {
      g.dispose();
      gate.current = null;
      for (const c of controllers.current) c.abort();
      controllers.current.clear();
    };
  }, [epoch]);
  function begin() {
    const request = gate.current?.start();
    if (!request) return;
    const c = new AbortController();
    controllers.current.add(c);
    const outcome = data.outcome;
    (async () => {
      try {
        if (outcome === "failure") throw Error("手动模拟损坏资源");
        const runtime = await import("./tool-seven-runtime");
        const a = await runtime.prepareAsset(c.signal);
        request.prepare({ ...a, runtime }, null);
      } catch (e) {
        request.prepare(
          null,
          e.name === "AbortError" ? "准备已中止" : String(e.message || e),
        );
      } finally {
        controllers.current.delete(c);
      }
    })();
  }
  function change(k, v, seen) {
    patch((o) => ({
      [k]: v,
      ...(seen ? { [seen]: add(o[seen], v) } : {}),
      draftStale: o.generated || o.draftStale,
      reviewed: false,
    }));
  }
  function fail(m) {
    failed.current = true;
    setAsset(null);
    patch({ failureSeen: true });
    setMessage(m);
  }
  return (
    <div
      className="tool07-lab"
      data-status={snap.status}
      data-queued={snap.queued}
      data-prepared={snap.prepared}
      data-reduced={reduced}
      data-hidden={hidden}
    >
      <div className="tool07-runtime">
        <strong>实际runtime与候选边界</strong>
        <p>{tool07Scope}</p>
        <p>
          {reduced || hidden || data.mode === "static"
            ? "当前停止动态，保留真实帧采样或明确文字回退；恢复不自动播放。"
            : "默认暂停，按需播放；没有必须等动画的通关门槛。"}
        </p>
      </div>
      {data.step === 0 && (
        <>
          <fieldset className="tool07-panel">
            <legend>资产 / 输入 / 部署条件</legend>
            <div className="tool07-buttons">
              {assets.map(([v, n]) => (
                <button
                  key={v}
                  aria-pressed={data.asset === v}
                  onClick={() => change("asset", v, "assetsSeen")}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="tool07-buttons">
              {[
                ["playback", "只需播放控制"],
                ["data", "需要持续业务输入"],
              ].map(([v, n]) => (
                <button
                  key={v}
                  aria-pressed={data.need === v}
                  onClick={() => change("need", v, "needsSeen")}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="tool07-buttons">
              {[
                ["web", "部署Web页面"],
                ["native", "部署原生App"],
              ].map(([v, n]) => (
                <button
                  key={v}
                  aria-pressed={data.environment === v}
                  onClick={() => change("environment", v, "environmentsSeen")}
                >
                  {n}
                </button>
              ))}
            </div>
            <label htmlFor="tool07-budget">实例预算情境</label>
            <select
              id="tool07-budget"
              value={data.budget}
              onChange={(e) => change("budget", e.target.value)}
            >
              <option value="single">单个按需预览</option>
              <option value="many">多个同时展示</option>
            </select>
            <p className="tool07-recommendation">{recommendation(data)}</p>
            <button onClick={() => patch({ comparedSeen: true })}>
              记录选型条件与非唯一答案
            </button>
          </fieldset>
          <section className="tool07-panel">
            <h3>交付前先问设计师</h3>
            <ul>
              <li>
                资源来源、修改权限、格式版本、动画/片段或artboard标识是什么？
              </li>
              <li>绑定了哪些属性、类型和范围？是持续值还是一次事件？</li>
              <li>
                是否引用图片/字体？目标平台、CSP和资源预算允许哪个runtime/renderer？
              </li>
            </ul>
            <p>
              同一个效果有多种合理实现。此处是本地规则说明，不是AI评审、素材转换或第三方上传服务。
            </p>
          </section>
        </>
      )}
      {data.step !== 0 && (
        <>
          <fieldset className="tool07-panel">
            <legend>同源资源与手动结果应用</legend>
            <p>
              复用本站原创JSON，实际模块/资源请求；结果手动应用模拟慢速，最多8条。只有当前代次可创建实例。
            </p>
            <div className="tool07-buttons">
              <button
                aria-pressed={data.outcome === "success"}
                onClick={() => patch({ outcome: "success" })}
              >
                下次资源正常
              </button>
              <button
                aria-pressed={data.outcome === "failure"}
                onClick={() => patch({ outcome: "failure" })}
              >
                下次资源模拟失败
              </button>
            </div>
            <div className="tool07-buttons">
              <button onClick={begin}>准备或重试真实资源</button>
              <button onClick={() => location.reload()}>
                重载页面重试资源与模块
              </button>
              <button onClick={() => gate.current?.deliver()}>
                应用最早资源结果
              </button>
              <button
                onClick={() => {
                  gate.current?.cancel();
                  for (const c of controllers.current) c.abort();
                }}
              >
                取消本次准备
              </button>
              <button
                onClick={() => {
                  setAsset(null);
                  setEpoch((x) => x + 1);
                  patch({ cleanupSeen: true, frame: 0 });
                  setMessage("已释放预览和旧队列；再次准备不会自动播放。");
                }}
              >
                释放预览并恢复
              </button>
            </div>
            <p>
              状态：{snap.status} · 队列{snap.queued} · 已准备{snap.prepared}
            </p>
            <button
              onClick={() => {
                patch({ fallbackAcknowledged: true });
                setMessage(
                  "已确认：文字/静态示意可学习，但不是实际runtime成功。",
                );
              }}
            >
              确认文字回退边界
            </button>
          </fieldset>
          <div className="tool07-controls">
            <label htmlFor="tool07-mode">动态策略</label>
            <select
              id="tool07-mode"
              value={data.mode}
              onChange={(e) => change("mode", e.target.value)}
            >
              <option value="normal">遵循系统，手动播放</option>
              <option value="static">保持静态采样</option>
            </select>
          </div>
          <Player
            key={epoch}
            asset={asset}
            data={data}
            patch={patch}
            reduced={reduced}
            hidden={hidden}
            announce={setMessage}
            onFailure={fail}
            mapRevision={mapRevision}
          />
          {data.step === 1 && (
            <section className="tool07-panel">
              <h3>业务→表现 · 应用的显式映射</h3>
              <p>
                本地业务演练，无真实订单/请求。选择状态不会偷偷认定动画成功，点击应用后暂停定位到对应帧。
              </p>
              <div className="tool07-buttons">
                {Object.keys(businessFrames).map((v) => (
                  <button
                    key={v}
                    aria-pressed={data.business === v}
                    onClick={() => change("business", v)}
                  >
                    业务选择{v}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setMapRevision((n) => n + 1);
                  patch({
                    frame: businessFrames[data.business],
                    mappedSeen: true,
                  });
                  setMessage(
                    `应用映射：${data.business}→第${businessFrames[data.business]}帧；失败保留文字，动画不决定业务。`,
                  );
                }}
              >
                应用业务映射
              </button>
              {data.business === "failure" && (
                <p className="tool07-error">
                  业务失败（本地样例）：保留原输入，允许重新尝试；不播放成功庆祝。
                </p>
              )}
              <p>
                Rive契约模拟：若同样需求交付.riv，新工作核对View
                Model实例/属性绑定；旧Inputs是遗留接口。dotLottie可有状态机，需相应资产及runtime支持。本例没有.riv/.lottie，不冒称运行它们。
              </p>
              <table>
                <caption>输入合同示例，非真实Rive接口调用</caption>
                <thead>
                  <tr>
                    <th>信息</th>
                    <th>职责与边界</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>busy布尔</th>
                    <td>持续条件，不代表成功事件</td>
                  </tr>
                  <tr>
                    <th>progress数值</th>
                    <td>0–100程度，缺失/失败另给状态</td>
                  </tr>
                  <tr>
                    <th>celebrate事件</th>
                    <td>只在业务确认成功时发一次，按事务去重</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
      <p className="tool07-feedback" role="status">
        {message}
      </p>
    </div>
  );
}
