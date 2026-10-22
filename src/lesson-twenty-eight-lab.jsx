import React, { useEffect, useRef, useState } from "react";
import {
  createAssetGate,
  motionScope,
  visualState,
} from "./lesson-twenty-eight-content";

function LottieStage({ asset, data, patch, reduced, onFailure, announce }) {
  const host = useRef(null),
    instance = useRef(null),
    output = useRef(null),
    latest = useRef({ data, patch, onFailure, announce });
  latest.current = { data, patch, onFailure, announce };
  const [ready, setReady] = useState(false),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!asset) return;
    let alive = true,
      item,
      started = false;
    const fail = () => {
      if (alive)
        latest.current.onFailure(
          "Lottie初始化或渲染失败，已释放实例；可以重新加载。",
        );
    };
    const loaded = () => {
      if (!alive || started) return;
      started = true;
      item.setSpeed(latest.current.data.speed);
      item.goToAndStop(latest.current.data.frame, true);
      setReady(true);
      latest.current.patch({ loadedSeen: true });
    };
    const frame = () => {
      if (!alive) return;
      const n = Math.round(item.currentFrame);
      if (output.current) output.current.textContent = String(n);
      if (host.current) host.current.dataset.frame = String(n);
    };
    const complete = () => {
      if (alive) {
        setPlaying(false);
        latest.current.announce(
          "单次播放完成；这只是时间线结束，不代表业务成功。",
        );
      }
    };
    try {
      item = asset.library.loadAnimation({
        container: host.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: structuredClone(asset.json),
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: false,
        },
      });
      instance.current = item;
      item.addEventListener("DOMLoaded", loaded);
      item.addEventListener("enterFrame", frame);
      item.addEventListener("complete", complete);
      item.addEventListener("data_failed", fail);
      item.addEventListener("error", fail);
      if (item.isLoaded) loaded();
    } catch {
      fail();
    }
    return () => {
      alive = false;
      setReady(false);
      setPlaying(false);
      if (item) {
        for (const [n, f] of [
          ["DOMLoaded", loaded],
          ["enterFrame", frame],
          ["complete", complete],
          ["data_failed", fail],
          ["error", fail],
        ])
          item.removeEventListener(n, f);
        item.destroy();
      }
      instance.current = null;
    };
  }, [asset]);
  useEffect(() => {
    instance.current?.setSpeed(data.speed);
  }, [data.speed]);
  useEffect(() => {
    const pause = () => {
      instance.current?.pause();
      setPlaying(false);
    };
    const visibility = () => {
      if (document.hidden) {
        pause();
        latest.current.announce("页面隐藏，已暂停；返回后需主动播放。");
      }
    };
    document.addEventListener("visibilitychange", visibility);
    if (reduced || document.hidden) pause();
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [reduced]);
  useEffect(() => {
    instance.current?.pause();
    setPlaying(false);
  }, [data.step]);
  const seek = (n) => {
    if (!ready) {
      announce("先加载并应用Lottie资源，静态文字仍可阅读。");
      return;
    }
    instance.current.goToAndStop(n, true);
    setPlaying(false);
    patch({ frame: n, sampledSeen: true });
    announce(`已用真实runtime采样第${n}帧；不是改变业务状态。`);
  };
  const play = () => {
    if (!ready) {
      announce("先加载并应用Lottie资源。");
      return;
    }
    if (reduced || document.hidden) {
      announce("减少动态或隐藏时保持静态；使用采样按钮观察真实帧。");
      return;
    }
    const a = instance.current;
    if (a.currentFrame >= a.totalFrames - 1) a.goToAndStop(0, true);
    a.play();
    setPlaying(true);
    announce("开始单次播放，速度只改变时间推进。重复点击不叠加循环。");
  };
  return (
    <section
      className="motion28-card"
      data-engine="lottie-web"
      data-ready={ready}
      data-playing={playing}
    >
      <h3>真实Lottie时间线</h3>
      <p>
        lottie-web 5.13.0 · SVG renderer · 原创JSON，120帧 /
        30fps，默认暂停、单次播放。
      </p>
      <div className="motion28-view" aria-hidden="true">
        <div className="motion28-renderer" ref={host} data-frame="0" />
      </div>
      {!ready && (
        <p className="motion28-fallback">
          资源未就绪：圆点沿轨道从左到右移动；文字与操作说明保留。
        </p>
      )}
      <p className="motion28-readout">
        真实当前帧：
        <output ref={output} aria-live="off">
          0
        </output>{" "}
        / 119；播放：{playing ? "运行中" : "暂停"}；速度 {data.speed} 倍
      </p>
      {data.step === 0 && (
        <>
          <div className="motion28-buttons">
            <button onClick={play}>单次播放Lottie</button>
            <button
              onClick={() => {
                instance.current?.pause();
                setPlaying(false);
                announce("已暂停Lottie，当前位置保留。");
              }}
            >
              暂停Lottie
            </button>
            <button onClick={() => seek(0)}>重置到首帧</button>
          </div>
          <div className="motion28-buttons">
            {[
              [0, "0%"],
              [60, "50%"],
              [119, "100%"],
            ].map(([n, label]) => (
              <button key={n} onClick={() => seek(n)}>
                采样{label}
              </button>
            ))}
          </div>
          <label>
            采样位置（暂停定位）
            <input
              type="range"
              min="0"
              max="119"
              value={data.frame}
              onChange={(e) => seek(Number(e.target.value))}
            />
          </label>
          <div className="motion28-buttons" role="group" aria-label="播放速度">
            {[0.5, 1, 2].map((v) => (
              <button
                key={v}
                aria-pressed={data.speed === v}
                onClick={() => {
                  patch({ speed: v, speedSeen: true });
                  announce(`速度已设为${v}倍；不改变关键帧内容。`);
                }}
              >
                {v}倍速度
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
export default function MotionWorkbench({ data, patch }) {
  const latest = useRef({ data, patch });
  latest.current = { data, patch };
  const [asset, setAsset] = useState(null),
    [snap, setSnap] = useState({ status: "empty", queued: 0, prepared: 0 }),
    [message, setMessage] = useState(
      "本地资源需主动加载并手动应用。输入示意不依赖真实Rive加载。",
    ),
    [engineError, setEngineError] = useState(false),
    [reduced, setReduced] = useState(false);
  const gate = useRef(null),
    controllers = useRef(new Set()),
    failed = useRef(false);
  useEffect(() => {
    const c = createAssetGate((e) => {
      setSnap(e);
      const { patch } = latest.current;
      switch (e.type) {
        case "started":
          setAsset(null);
          setEngineError(false);
          setMessage(
            "正在准备同源JSON和Lottie模块；准备完成后手动应用，教学慢速不是真实服务器。",
          );
          break;
        case "prepared":
          setMessage(
            "本地结果已准备，可手动应用最早结果。取消后的旧结果仍须核对代次。",
          );
          break;
        case "success":
          setAsset(e.value);
          patch({ retrySeen: failed.current || latest.current.data.retrySeen });
          setMessage(
            "资源结果已接受，正在初始化真实Lottie；输入侧仍是Rive工作流模拟。",
          );
          break;
        case "failure":
          failed.current = true;
          patch({ failureSeen: true });
          setAsset(null);
          setMessage(
            `资源失败：${e.error}。文字回退可读，选择正常资源后重试。`,
          );
          break;
        case "canceled":
          setAsset(null);
          patch({ canceledSeen: true });
          setMessage("已取消；旧结果不能覆盖下一次加载。");
          break;
        case "stale":
          patch({ staleSeen: true });
          setMessage("旧结果已隔离，当前会话与画面不变。");
          break;
        case "repeated":
          setMessage("已有加载进行中，重复开始被阻止。");
          break;
        case "full":
          setMessage("队列达到8条上限，先应用并清理旧结果。");
          break;
        case "preparing":
          setMessage("最早结果仍在准备，请准备完成后应用；没有创建重复任务。");
          break;
        case "empty":
          setMessage("没有待应用结果；按钮保持可操作且焦点保留。");
          break;
        default:
          break;
      }
    });
    gate.current = c;
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduced(m.matches);
    change();
    m.addEventListener("change", change);
    return () => {
      c.dispose();
      gate.current = null;
      for (const a of controllers.current) a.abort();
      controllers.current.clear();
      m.removeEventListener("change", change);
    };
  }, []);
  const begin = () => {
    const request = gate.current?.start();
    if (!request) return;
    const abort = new AbortController();
    controllers.current.add(abort);
    const outcome = data.outcome;
    (async () => {
      try {
        if (outcome === "failure")
          throw Error("手动模拟资源损坏（未伪造网络成功）");
        const [mod, response] = await Promise.all([
          import("lottie-web/build/player/lottie_light"),
          fetch("/lesson28-timeline.json", { signal: abort.signal }),
        ]);
        if (!response.ok) throw Error(`同源资源HTTP ${response.status}`);
        const json = await response.json();
        if (
          json.w !== 240 ||
          json.h !== 160 ||
          json.op !== 120 ||
          json.assets?.length !== 0 ||
          !Array.isArray(json.layers) ||
          json.layers.length !== 2
        )
          throw Error("资源结构不符合本例原创资产约定");
        request.prepare({ library: mod.default, json }, null);
      } catch (e) {
        request.prepare(
          null,
          e.name === "AbortError" ? "加载已中止" : String(e.message || e),
        );
      } finally {
        controllers.current.delete(abort);
      }
    })();
  };
  const renderFailure = (message) => {
    setAsset(null);
    setEngineError(true);
    failed.current = true;
    patch({ failureSeen: true });
    setMessage(message);
  };
  const state = visualState(data.busy, data.amount);
  const mapBusiness = () => {
    const values = {
      idle: { busy: false, amount: 0 },
      busy: { busy: true, amount: 40 },
      success: { busy: false, amount: 100 },
      failure: { busy: false, amount: 0 },
    };
    patch({ ...values[data.business], mappedSeen: true });
    setMessage(
      `应用明确映射：业务${data.business}→输入值。${data.business === "failure" ? "失败保留文字，不触发庆祝。" : "动画状态不是真实业务凭据。"}`,
    );
  };
  return (
    <div
      className="motion28-lab"
      data-status={engineError ? "failed" : snap.status}
      data-queued={snap.queued}
      data-prepared={snap.prepared}
      data-reduced={reduced}
    >
      <div className="motion28-boundary">
        <strong>真实Lottie播放 / Rive教学模拟</strong>
        <p>{motionScope}</p>
      </div>
      {data.step === 0 && (
        <div className="motion28-controls">
          <label>
            演练标题
            <input
              maxLength="80"
              value={data.caption}
              onChange={(e) => patch({ caption: e.target.value })}
            />
          </label>
          <button
            onClick={() => patch({ caption: "自制时间线与业务输入对照" })}
          >
            填入标题示例
          </button>
          <button
            onClick={() => {
              patch({ boundaryReviewed: true });
              setMessage(
                "已记录：实际Lottie、Rive模拟；dotLottie状态机不是本例运行机制。",
              );
            }}
          >
            记录实际与模拟边界
          </button>
        </div>
      )}
      {data.step !== 1 && (
        <fieldset className="motion28-controls">
          <legend>本地资源与教学延迟</legend>
          <p>
            真实同源JSON与懒加载模块先准备，再由你手动应用结果（模拟慢速）；不是外网或服务器计时。最多8条。选项只影响下一次开始。
          </p>
          <div className="motion28-buttons">
            <button
              aria-pressed={data.outcome === "success"}
              onClick={() => patch({ outcome: "success" })}
            >
              下次资源：正常
            </button>
            <button
              aria-pressed={data.outcome === "failure"}
              onClick={() => patch({ outcome: "failure" })}
            >
              下次资源：模拟失败
            </button>
          </div>
          <div className="motion28-buttons">
            <button onClick={begin}>加载或重试Lottie</button>
            <button onClick={() => gate.current?.deliver()}>
              应用最早资源结果
            </button>
            <button
              onClick={() => {
                gate.current?.cancel();
                for (const a of controllers.current) a.abort();
              }}
            >
              取消本次资源加载
            </button>
          </div>
        </fieldset>
      )}
      <h3 className="motion28-title">{data.caption || "未命名动画演练"}</h3>
      <div className="motion28-comparison">
        <LottieStage
          asset={asset}
          data={data}
          patch={patch}
          reduced={reduced}
          onFailure={renderFailure}
          announce={setMessage}
        />
        <section className="motion28-card" data-engine="rive-simulation">
          <h3>Rive输入/状态教学模拟</h3>
          <p>
            React本地模型 + 静态CSS反馈，没有.riv或Rive
            runtime；无预制动画假装运行时。
          </p>
          <div
            className="motion28-model"
            data-busy={data.busy}
            data-amount={data.amount}
            data-state={state}
            data-pulses={data.pulses}
          >
            <strong>动画示意状态：{state}</strong>
            <div className="motion28-meter" aria-hidden="true">
              <span style={{ width: `${data.amount}%` }} />
            </div>
            <p>
              busy = {String(data.busy)}；amount = {data.amount}；一次事件计数 ={" "}
              {data.pulses}
            </p>
            <p>
              {data.pulses > 0
                ? "已收到庆祝事件；不代表业务保存成功。"
                : "尚未收到庆祝事件。"}
            </p>
            {data.business === "failure" && (
              <p className="motion28-business-error">
                业务失败（本地演练），可改选处理中或待机再映射。没有真实请求。
              </p>
            )}
          </div>
          {data.step === 1 && (
            <>
              <div className="motion28-buttons">
                <button
                  aria-pressed={data.busy}
                  onClick={() => {
                    patch({ busy: !data.busy, boolSeen: true });
                    setMessage("busy布尔改变持续条件，不代表一次性成功事件。");
                  }}
                >
                  切换busy布尔值
                </button>
                <button
                  onClick={() => {
                    patch({
                      pulses: Math.min(999, data.pulses + 1),
                      triggerSeen: true,
                    });
                    setMessage(
                      data.pulses >= 999
                        ? "触发计数已达999上限，可重置本课。"
                        : "已发送一次celebrate事件；不保持true、不改变业务结果。",
                    );
                  }}
                >
                  触发celebrate一次事件
                </button>
              </div>
              <label>
                amount数值（0–100）
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={data.amount}
                  onChange={(e) => {
                    patch({ amount: Number(e.target.value), numberSeen: true });
                    setMessage("数值输入表示程度；表现由本地规则显式计算。");
                  }}
                />
              </label>
              <div className="motion28-buttons">
                {[0, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      patch({ amount: n, numberSeen: true });
                      setMessage(`amount已设为${n}，不会自动决定业务状态。`);
                    }}
                  >
                    程度{n}%
                  </button>
                ))}
              </div>
              <fieldset>
                <legend>业务状态（仅本地）</legend>
                <div className="motion28-buttons">
                  {[
                    ["idle", "待机"],
                    ["busy", "处理中"],
                    ["success", "成功"],
                    ["failure", "失败"],
                  ].map(([v, n]) => (
                    <button
                      key={v}
                      aria-pressed={data.business === v}
                      onClick={() => patch({ business: v })}
                    >
                      业务：{n}
                    </button>
                  ))}
                </div>
                <button onClick={mapBusiness}>应用业务到表现的映射</button>
              </fieldset>
              <p>
                规则：busy=true优先显示处理中；否则amount≥100显示完成、0以上显示进行中，其余待机。触发器只记一次事件，不覆盖这些持续值。
              </p>
            </>
          )}
        </section>
      </div>
      <p className="motion28-metrics">
        资源状态：{engineError ? "failed" : snap.status}；待应用 {snap.queued}
        ，已准备 {snap.prepared}。
        {reduced
          ? "减少动态：静态采样，不自动播放。"
          : "普通动态：只有主动播放才推进。"}
        离开前三站/重置/刷新释放真实实例与队列，学习标记与输入配置可保留。
      </p>
      <div className="motion28-status" role="status">
        {message}
      </div>
      <div className="motion28-explain">
        <p>
          时间线像预先设计的片段：播放、暂停、速度与定位改变播放方式。接上网页事件也能交互；dotLottie另外有状态机，需匹配编辑器、资产定义与runtime。本例没有运行它。
        </p>
        <p>
          输入驱动把应用值交给表现规则，动画引擎不会自动理解业务。Rive新项目核对Data
          Binding / View
          Model，旧Inputs属于legacy；本地busy/amount/celebrate不是可直接调用的Rive
          API。
        </p>
        <p>
          本例零外链素材与上传。真实项目另验证资源许可、制作与更新流程、平台支持、文件体积/绘制预算、加载失败与减少动态；二维界面简单反馈仍可先选CSS。
        </p>
      </div>
    </div>
  );
}
