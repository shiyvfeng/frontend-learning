import React, { useEffect, useRef, useState } from "react";
import {
  glScope,
  glSize,
  vertexSource,
  fragmentSource,
} from "./lesson-twenty-five-content";
export default function GLWorkbench({ data, patch }) {
  const canvas = useRef(null),
    wrapper = useRef(null),
    latest = useRef(data),
    patchRef = useRef(patch),
    runtime = useRef(null),
    queue = useRef(() => {}),
    press = useRef(null),
    count = useRef(0);
  latest.current = data;
  patchRef.current = patch;
  const [status, setStatus] = useState("starting"),
    [message, setMessage] = useState("准备本地WebGL程序。"),
    [metrics, setMetrics] = useState({
      width: 0,
      height: 0,
      cssWidth: 0,
      cssHeight: 0,
      dpr: 1,
      draws: 0,
    }),
    [inspection, setInspection] = useState(""),
    [reduce, setReduce] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  useEffect(() => {
    const e = canvas.current;
    let alive = true,
      frame = 0,
      epoch = 0,
      gl = null,
      resources = null,
      ro = null,
      dprQuery = null;
    const cancel = () => {
      epoch++;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      press.current = null;
    };
    const release = () => {
      if (resources && gl) {
        gl.useProgram(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(resources.buffer);
        gl.deleteProgram(resources.program);
        for (const s of resources.shaders) gl.deleteShader(s);
      }
      resources = null;
    };
    const report = (state, text) => {
      if (alive) {
        setStatus(state);
        setMessage(text);
        e.dataset.state = state;
      }
    };
    const build = () => {
      if (resources) return;
      gl =
        gl ??
        e.getContext("webgl", {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: true,
          powerPreference: "low-power",
        });
      if (!gl) throw Error("WebGL上下文不可用");
      if (gl.isContextLost()) throw Error("WebGL上下文已丢失，等待浏览器恢复");
      resources = { buffer: null, program: null, shaders: [], uniforms: {} };
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertexSource],
        [gl.FRAGMENT_SHADER, fragmentSource],
      ]) {
        const s = gl.createShader(type);
        if (!s) throw Error("无法分配着色器资源");
        resources.shaders.push(s);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw Error("着色器编译失败");
      }
      const p = gl.createProgram();
      resources.program = p;
      if (!p) throw Error("无法分配程序资源");
      for (const s of resources.shaders) gl.attachShader(p, s);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw Error("着色器程序链接失败");
      gl.useProgram(p);
      const b = gl.createBuffer();
      resources.buffer = b;
      if (!b) throw Error("无法分配顶点资源");
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const a = gl.getAttribLocation(p, "a_position");
      if (a < 0) throw Error("顶点参数不可用");
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      for (const name of [
        "u_resolution",
        "u_center",
        "u_amp",
        "u_frequency",
        "u_phase",
      ]) {
        const u = gl.getUniformLocation(p, name);
        if (u === null) throw Error("uniform参数不可用");
        resources.uniforms[name] = u;
      }
    };
    const draw = () => {
      if (!alive || document.hidden) return;
      const d = latest.current;
      if (d.fallback) {
        release();
        e.width = e.height = 1;
        report("fallback", "模拟不支持：显示CSS静态回退，当前不是shader结果。");
        return;
      }
      try {
        build();
        const rect = e.getBoundingClientRect();
        const size = glSize(
          rect.width,
          rect.height,
          devicePixelRatio,
          d.low,
          Math.min(
            gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            ...gl.getParameter(gl.MAX_VIEWPORT_DIMS),
          ),
        );
        if (e.width !== size.width || e.height !== size.height) {
          e.width = size.width;
          e.height = size.height;
        }
        gl.viewport(0, 0, e.width, e.height);
        gl.useProgram(resources.program);
        const u = resources.uniforms;
        gl.uniform2f(u.u_resolution, e.width, e.height);
        gl.uniform2f(u.u_center, d.cx, d.cy);
        gl.uniform1f(u.u_amp, d.amp);
        gl.uniform1f(u.u_frequency, d.frequency);
        gl.uniform1f(u.u_phase, d.phase);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        count.current++;
        e.dataset.draws = String(count.current);
        report(
          "ready",
          "真实WebGL已绘制静态采样；参数变化才重绘，没有自动播放。",
        );
        setMetrics({
          width: e.width,
          height: e.height,
          cssWidth: rect.width,
          cssHeight: rect.height,
          dpr: devicePixelRatio,
          draws: count.current,
        });
      } catch (error) {
        release();
        e.width = e.height = 1;
        report(
          "failed",
          `${error.message}；显示明确标注的CSS回退，保留参数和全部学习操作，可重试。`,
        );
      }
    };
    const request = () => {
      if (!alive || document.hidden || frame) return;
      const id = epoch;
      frame = requestAnimationFrame(() => {
        if (!alive || id !== epoch) return;
        frame = 0;
        draw();
      });
    };
    queue.current = request;
    const hidden = () => {
      cancel();
      if (document.hidden) {
        release();
        e.width = e.height = 1;
        report(
          "suspended",
          "页面隐藏：释放程序、缓冲区和着色器，缩小位图；返回后按当前参数重建。",
        );
      } else request();
    };
    const lost = (event) => {
      event.preventDefault();
      cancel();
      release();
      report(
        "lost",
        "真实WebGL上下文丢失；当前显示CSS回退，等待浏览器恢复或重试，不冒充shader。",
      );
    };
    const restored = () => {
      cancel();
      release();
      request();
    };
    const clearPress = () => {
      press.current = null;
    };
    const resize = () => {
      press.current = null;
      request();
    };
    const trackDPR = () => {
      dprQuery?.removeEventListener("change", changedDPR);
      dprQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", changedDPR);
    };
    const changedDPR = () => {
      trackDPR();
      resize();
    };
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      motion = () => setReduce(media.matches);
    media.addEventListener("change", motion);
    trackDPR();
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(wrapper.current);
    }
    window.addEventListener("resize", resize);
    window.addEventListener("blur", clearPress);
    window.addEventListener("scroll", clearPress, { passive: true });
    document.addEventListener("visibilitychange", hidden);
    e.addEventListener("webglcontextlost", lost);
    e.addEventListener("webglcontextrestored", restored);
    runtime.current = {
      retry: () => {
        cancel();
        release();
        request();
      },
      inspect: () =>
        gl && !gl.isContextLost()
          ? {
              version: gl.getParameter(gl.VERSION),
              renderer: gl.getParameter(
                gl.getExtension("WEBGL_debug_renderer_info")
                  ?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER,
              ),
              max: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            }
          : null,
    };
    request();
    return () => {
      alive = false;
      cancel();
      release();
      ro?.disconnect();
      media.removeEventListener("change", motion);
      dprQuery?.removeEventListener("change", changedDPR);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", clearPress);
      window.removeEventListener("scroll", clearPress);
      document.removeEventListener("visibilitychange", hidden);
      e.removeEventListener("webglcontextlost", lost);
      e.removeEventListener("webglcontextrestored", restored);
      try {
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {}
      runtime.current = null;
    };
  }, []);
  useEffect(() => {
    queue.current();
  }, [
    data.amp,
    data.frequency,
    data.phase,
    data.cx,
    data.cy,
    data.low,
    data.fallback,
  ]);
  const update = (x) => patch(x),
    center = (cx, cy = 0.5) => {
      update({ cx, cy, centerChanged: true });
    },
    inspect = () => {
      queue.current();
      const i = status === "ready" ? runtime.current?.inspect() : null;
      setInspection(
        i
          ? `真实上下文：${i.version}；渲染器：${i.renderer}。设备上限${i.max}px；本例仍按1024px/DPR预算限制。渲染器可能是软件实现，本读数不是GPU性能测试。`
          : "当前无可用WebGL上下文；这是明确标注的CSS回退，可继续学习并重试。",
      );
      update({ inspected: true });
    };
  return (
    <div className="gl25-lab" data-state={status}>
      <div className="gl25-controls">
        <label className="gl25-caption">
          效果标题
          <input
            aria-label="效果标题"
            value={data.caption}
            maxLength={80}
            onChange={(e) => update({ caption: e.target.value })}
          />
        </label>
        <button
          onClick={() => update({ caption: "低成本二维波纹，静态采样观察" })}
        >
          填入标题示例
        </button>
        <label>
          波纹强度 {Math.round(data.amp * 100)}%
          <input
            aria-label="波纹强度"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={data.amp}
            onChange={(e) =>
              update({ amp: Number(e.target.value), parameterChanged: true })
            }
          />
        </label>
        <div className="gl25-buttons">
          <button onClick={() => update({ amp: 0, parameterChanged: true })}>
            强度0%
          </button>
          <button onClick={() => update({ amp: 0.75, parameterChanged: true })}>
            强度75%
          </button>
          <button
            onClick={() =>
              update({
                phase: (data.phase + Math.PI / 3) % (2 * Math.PI),
                sampled: true,
              })
            }
          >
            下一个静态采样
          </button>
          <button
            onClick={() =>
              update({
                frequency: data.frequency === 6 ? 10 : 6,
                parameterChanged: true,
              })
            }
          >
            切换波纹密度
          </button>
        </div>
        <div className="gl25-buttons">
          {[
            [0.25, "左"],
            [0.5, "中"],
            [0.75, "右"],
          ].map(([v, label]) => (
            <button
              key={v}
              aria-pressed={data.cx === v && data.cy === 0.5}
              onClick={() => center(v)}
            >
              中心偏{label}
            </button>
          ))}
          <button
            onClick={() => {
              update({ amp: 0.45, frequency: 6, phase: 0, cx: 0.5, cy: 0.5 });
            }}
          >
            恢复效果参数
          </button>
        </div>
        <div className="gl25-buttons">
          <button onClick={inspect}>读取真实上下文与预算</button>
          <button onClick={() => runtime.current?.retry()}>
            重试WebGL绘制
          </button>
          <button onClick={() => update({ compared: true })}>
            记录Canvas、WebGL与3D区别
          </button>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.low}
            onChange={(e) =>
              update({ low: e.target.checked, budgetChanged: true })
            }
          />
          低分辨率预算：最多0.75倍CSS像素
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.fallback}
            onChange={(e) =>
              update({ fallback: e.target.checked, fallbackReviewed: true })
            }
          />
          模拟不支持：CSS静态回退
        </label>
      </div>
      <h3 className="gl25-title">{data.caption || "未命名波纹效果"}</h3>
      <p className="gl25-guide">
        仅短按画面定位中心；滑动保留页面滚动。键盘/触屏可用左、中、右按钮，无需拖拽或hover。中心：横向
        {Math.round(data.cx * 100)}%，纵向自上{Math.round((1 - data.cy) * 100)}
        %。
      </p>
      <div className="gl25-wrapper" ref={wrapper}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={`WebGL二维静态波纹，强度${Math.round(data.amp * 100)}%，中心横向${Math.round(data.cx * 100)}%`}
          aria-describedby="gl25-mode"
          style={{ visibility: status === "ready" ? "visible" : "hidden" }}
          onPointerDown={(e) => {
            if (e.isPrimary && e.button === 0)
              press.current = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                t: performance.now(),
              };
          }}
          onPointerMove={(e) => {
            const p = press.current;
            if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8)
              press.current = null;
          }}
          onPointerLeave={() => (press.current = null)}
          onPointerCancel={() => (press.current = null)}
          onPointerUp={(e) => {
            const p = press.current;
            press.current = null;
            if (
              status !== "ready" ||
              !p ||
              p.id !== e.pointerId ||
              performance.now() - p.t > 600
            )
              return;
            const r = e.currentTarget.getBoundingClientRect();
            if (r.width && r.height)
              center(
                Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)),
              );
          }}
        >
          WebGL波纹示意；全部参数和学习操作也在画布外提供。
        </canvas>
        {status !== "ready" && (
          <div className="gl25-fallback">
            <strong>CSS静态回退 · 不是shader结果</strong>
            <p>保留效果说明、参数、重试与学习路径。</p>
          </div>
        )}
      </div>
      <p className="gl25-metrics" id="gl25-mode">
        {status === "ready"
          ? `真实WebGL：CSS ${metrics.cssWidth.toFixed(1)}×${metrics.cssHeight.toFixed(1)}；位图 ${metrics.width}×${metrics.height}；系统DPR ${metrics.dpr}；已绘制${metrics.draws}次。`
          : "当前显示回退，不能把它计为真实shader成功。"}{" "}
        常规DPR最多1.5、单边最多1024px；低预算最多0.75。
        {reduce ? "系统减少动态已开启" : "系统未要求减少动态"}
        ；本例始终静态，离散采样不自动播放。
      </p>
      <div className="gl25-status" role="status">
        {message}
      </div>
      {inspection && <p className="gl25-inspection">{inspection}</p>}
      <div className="gl25-explain">
        <p>{glScope}</p>
        <p>
          GPU像一组并行处理像素的工作位，shader是计算规则，uniform是本次绘制的参数单。实际调参后才重绘；采样相位只是波纹的一个静态截面，不代表播放或真实时间。画布外保留文字、焦点和原生控件。
        </p>
        <p>
          不为一个简单按钮强用WebGL：先比较CSS/SVG/Canvas
          2D。这里一次绘制两个三角形，不加载纹理、不跑噪声多重循环、不默认播放；限制位图是成本预算，不是跨设备帧率承诺。低性能需在目标设备实测后降低分辨率或改用明确回退。
        </p>
        <p>
          隐藏页面释放程序、shader和顶点缓冲并缩小位图，返回按当前参数重建；卸载再释放上下文。真实编译/链接失败和上下文丢失保留回退，恢复后重建资源；模拟开关只是体验回退，不会假装发生真实设备故障。
        </p>
      </div>
    </div>
  );
}
