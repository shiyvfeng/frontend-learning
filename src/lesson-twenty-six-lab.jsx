import React, { useEffect, useRef, useState } from "react";
import {
  threeSize,
  threeScope,
  cameraPositions,
} from "./lesson-twenty-six-content";
export default function ThreeWorkbench({ data, patch }) {
  const canvas = useRef(null),
    wrapper = useRef(null),
    latest = useRef(data),
    patchRef = useRef(patch),
    api = useRef(null),
    queue = useRef(() => {});
  latest.current = data;
  patchRef.current = patch;
  const [status, setStatus] = useState("loading"),
    [message, setMessage] = useState("正在加载本地打包的Three.js模块。"),
    [info, setInfo] = useState({ width: 0, height: 0, draws: 0, triangles: 0 }),
    [inspection, setInspection] = useState(""),
    [moduleError, setModuleError] = useState(false),
    [reduce, setReduce] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  useEffect(() => {
    const e = canvas.current;
    let alive = true,
      frame = 0,
      epoch = 0,
      T = null,
      loading = null,
      resources = null,
      gl = null,
      lost = false,
      draws = 0,
      ro = null,
      dprQuery = null;
    const report = (s, text) => {
      if (alive) {
        setStatus(s);
        setMessage(text);
        e.dataset.state = s;
      }
    };
    const cancel = () => {
      epoch++;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    const release = (lose = false) => {
      if (resources) {
        if (gl && !gl.isContextLost()) {
          gl.useProgram(null);
          gl.bindVertexArray(null);
        }
        const r = resources;
        resources = null;
        for (const g of r.geometries) g.dispose();
        for (const m of r.materials) m.dispose();
        r.scene.clear();
        r.renderer.dispose();
        if (gl && !gl.isContextLost())
          for (let i = 0; i < 16 && gl.getError() !== gl.NO_ERROR; i++) {}
        if (
          lose &&
          !gl.isContextLost() &&
          gl.getExtension("WEBGL_lose_context")
        )
          r.renderer.forceContextLoss();
      }
      e.width = e.height = 1;
    };
    const build = () => {
      if (resources) return;
      gl =
        gl ??
        e.getContext("webgl2", {
          alpha: false,
          antialias: false,
          depth: true,
          stencil: false,
          preserveDrawingBuffer: true,
          powerPreference: "low-power",
        });
      if (!gl) throw Error("WebGL 2不可用");
      if (gl.isContextLost()) throw Error("WebGL上下文已丢失，等待恢复");
      const renderer = new T.WebGLRenderer({
        canvas: e,
        context: gl,
        antialias: false,
        alpha: false,
      });
      const scene = new T.Scene(),
        camera = new T.PerspectiveCamera(42, 1, 0.1, 50);
      resources = {
        renderer,
        scene,
        camera,
        geometries: [],
        materials: [],
        mesh: null,
        keyLight: null,
      };
      const owner = resources;
      renderer.debug.onShaderError = () => {
        owner.shaderFailed = true;
      };
      scene.background = new T.Color("#eeeaf3");
      const geometry = new T.BoxGeometry(1.5, 1.5, 1.5);
      resources.geometries.push(geometry);
      const material = new T.MeshStandardMaterial({
        color: "#8574b8",
        roughness: 0.8,
        metalness: 0.05,
      });
      resources.materials.push(material);
      const mesh = new T.Mesh(geometry, material);
      mesh.name = "教学立方体";
      resources.mesh = mesh;
      scene.add(mesh);
      const floorGeometry = new T.PlaneGeometry(8, 8);
      resources.geometries.push(floorGeometry);
      const floorMaterial = new T.MeshStandardMaterial({
        color: "#bfc9c6",
        roughness: 1,
        metalness: 0,
      });
      resources.materials.push(floorMaterial);
      const floor = new T.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.05;
      floor.name = "自制地面";
      scene.add(floor);
      const ambient = new T.AmbientLight("#ffffff", 0.7),
        light = new T.DirectionalLight("#ffffff", 3);
      light.position.set(-3, 5, 4);
      light.name = "主光";
      resources.keyLight = light;
      scene.add(ambient, light, camera);
    };
    const draw = () => {
      if (!alive || document.hidden) return;
      if (latest.current.fallback) {
        cancel();
        release();
        report(
          "fallback",
          "模拟3D不可用：显示文字与CSS回退，不是真实Three.js画面。",
        );
        return;
      }
      if (lost) {
        report(
          "lost",
          "真实WebGL上下文丢失，保留参数与文字回退；浏览器恢复后重建场景。",
        );
        return;
      }
      if (!T) {
        if (loading) return;
        report(
          "loading",
          "正在加载本地Three.js模块；此时显示回退，不冒充3D成功。",
        );
        const pending = import("./lesson-twenty-six-engine");
        loading = pending;
        pending
          .then((module) => {
            if (loading === pending) loading = null;
            if (!alive) return;
            setModuleError(false);
            T = module;
            if (!document.hidden) request();
          })
          .catch(() => {
            if (loading === pending) loading = null;
            if (alive) setModuleError(true);
            if (alive && !document.hidden && !latest.current.fallback)
              report(
                "failed",
                "Three.js模块加载失败；请重新加载页面重试，本地进度保留，重新进入第26课。当前显示非3D回退。",
              );
          });
        return;
      }
      try {
        build();
        const r = resources,
          d = latest.current,
          rect = e.getBoundingClientRect();
        const size = threeSize(
          rect.width,
          rect.height,
          devicePixelRatio,
          d.low,
          Math.min(
            gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            ...gl.getParameter(gl.MAX_VIEWPORT_DIMS),
          ),
        );
        r.renderer.setPixelRatio(1);
        r.renderer.setSize(size.width, size.height, false);
        r.camera.aspect = rect.width / Math.max(1, rect.height);
        r.camera.position.set(...cameraPositions[d.view]);
        r.camera.lookAt(0, 0, 0);
        r.camera.updateProjectionMatrix();
        r.mesh.rotation.y = d.turn;
        r.mesh.scale.setScalar(d.size);
        r.mesh.material.roughness = d.metal ? 0.25 : 0.8;
        r.mesh.material.metalness = d.metal ? 0.65 : 0.05;
        r.keyLight.intensity = d.light;
        r.renderer.render(r.scene, r.camera);
        if (r.shaderFailed) throw Error("Three.js材质着色器编译或链接失败");
        if (gl.getError() !== gl.NO_ERROR) throw Error("WebGL绘制未成功");
        draws++;
        e.dataset.draws = String(draws);
        report(
          "ready",
          "真实Three.js场景已按当前对象、相机和光照绘制；无自动旋转。",
        );
        setInfo({
          width: e.width,
          height: e.height,
          draws,
          triangles: r.renderer.info.render.triangles,
        });
      } catch (error) {
        release();
        report(
          "failed",
          `${error.message}；显示明确的非3D回退，参数保留，可重试。`,
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
        report(
          "suspended",
          "页面隐藏：停止待处理帧并dispose几何、材质和renderer，缩小位图；返回重建。",
        );
      } else request();
    };
    const contextLost = (event) => {
      event.preventDefault();
      lost = true;
      cancel();
      release();
      report("lost", "真实WebGL上下文丢失；当前显示文字/CSS回退，不是3D成功。");
    };
    const contextRestored = () => {
      lost = false;
      cancel();
      release();
      request();
    };
    const resize = () => request(),
      trackDPR = () => {
        dprQuery?.removeEventListener("change", changedDPR);
        dprQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
        dprQuery.addEventListener("change", changedDPR);
      },
      changedDPR = () => {
        trackDPR();
        request();
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
    document.addEventListener("visibilitychange", hidden);
    e.addEventListener("webglcontextlost", contextLost);
    e.addEventListener("webglcontextrestored", contextRestored);
    api.current = {
      retry: () => {
        cancel();
        release();
        request();
      },
      inspect: () =>
        resources
          ? {
              revision: T.REVISION,
              renderer: resources.renderer.isWebGLRenderer,
              triangles: resources.renderer.info.render.triangles,
              rendererName: gl.getParameter(
                gl.getExtension("WEBGL_debug_renderer_info")
                  ?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER,
              ),
              aspect: resources.camera.aspect,
            }
          : null,
    };
    request();
    return () => {
      alive = false;
      cancel();
      ro?.disconnect();
      media.removeEventListener("change", motion);
      dprQuery?.removeEventListener("change", changedDPR);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", hidden);
      e.removeEventListener("webglcontextlost", contextLost);
      e.removeEventListener("webglcontextrestored", contextRestored);
      release(true);
      api.current = null;
    };
  }, []);
  useEffect(() => {
    queue.current();
  }, [
    data.turn,
    data.size,
    data.view,
    data.light,
    data.metal,
    data.low,
    data.fallback,
  ]);
  const inspect = () => {
    const r = status === "ready" ? api.current?.inspect() : null;
    setInspection(
      r
        ? `Three.js r${r.revision} · WebGLRenderer=${r.renderer} · 当前${r.triangles}三角形 · 相机aspect ${r.aspect.toFixed(3)} · 渲染器 ${r.rendererName}。软件渲染不证明硬件性能。`
        : "当前为加载中或明确的非3D回退，不能记作真实Three.js成功；保留参数与重试。",
    );
    patch({ inspected: true });
  };
  return (
    <div className="three26-lab" data-state={status}>
      <div className="three26-controls">
        <label className="three26-caption">
          场景标题
          <input
            aria-label="场景标题"
            maxLength={80}
            value={data.caption}
            onChange={(e) => patch({ caption: e.target.value })}
          />
        </label>
        <button onClick={() => patch({ caption: "自制几何：换视角，看光照" })}>
          填入标题示例
        </button>
        <div className="three26-buttons">
          <button
            onClick={() =>
              patch({
                turn: (data.turn + Math.PI / 6) % (2 * Math.PI),
                objectChanged: true,
              })
            }
          >
            对象旋转30度
          </button>
          <button onClick={() => patch({ size: 1.25, objectChanged: true })}>
            放大对象
          </button>
          <button onClick={() => patch({ turn: 0, size: 1 })}>恢复对象</button>
          <button onClick={() => patch({ metal: !data.metal })}>
            {data.metal ? "切换哑光材质" : "切换金属感材质"}
          </button>
        </div>
        <label>
          对象尺寸 {data.size.toFixed(2)}倍
          <input
            aria-label="对象尺寸"
            type="range"
            min="0.7"
            max="1.3"
            step="0.05"
            value={data.size}
            onChange={(e) =>
              patch({ size: Number(e.target.value), objectChanged: true })
            }
          />
        </label>
        <div className="three26-buttons">
          {[
            ["front", "正面视角"],
            ["side", "斜侧视角"],
            ["top", "俯视角"],
          ].map(([view, text]) => (
            <button
              key={view}
              aria-pressed={data.view === view}
              onClick={() => patch({ view, viewChanged: true })}
            >
              {text}
            </button>
          ))}
          <button onClick={() => patch({ view: "side", cameraReset: true })}>
            重置相机
          </button>
        </div>
        <div className="three26-buttons">
          <button onClick={() => patch({ light: 0.6, lightChanged: true })}>
            柔和主光
          </button>
          <button onClick={() => patch({ light: 3, lightChanged: true })}>
            明亮主光
          </button>
          <button onClick={() => patch({ rolesReviewed: true })}>
            记录五个角色
          </button>
          <button onClick={inspect}>读取场景与渲染预算</button>
          <button
            onClick={() =>
              moduleError ? location.reload() : api.current?.retry()
            }
          >
            {moduleError ? "重新加载页面重试模块" : "重试3D绘制"}
          </button>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.low}
            onChange={(e) =>
              patch({ low: e.target.checked, budgetChanged: true })
            }
          />
          低分辨率预算：最多0.75倍CSS像素
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.fallback}
            onChange={(e) =>
              patch({ fallback: e.target.checked, fallbackReviewed: true })
            }
          />
          模拟3D不可用：文字与CSS回退
        </label>
      </div>
      <h3 className="three26-title">{data.caption || "未命名3D场景"}</h3>
      <p>
        对象、相机、灯光都由上方原生控件调整；不在画面里捕获拖拽、滚轮或触摸手势。切换相机不会修改对象本身。
      </p>
      <div className="three26-wrapper" ref={wrapper}>
        <canvas
          ref={canvas}
          role="img"
          aria-label="Three.js自制立方体与地面，参数和视角由外部控件调整"
          style={{ visibility: status === "ready" ? "visible" : "hidden" }}
        >
          立方体与地面；全部说明和操作也在画布外提供。
        </canvas>
        {status !== "ready" && (
          <div className="three26-fallback">
            <strong>文字/CSS回退 · 不是真实3D</strong>
            <p>场景包含立方体、地面、相机和灯光。参数与学习操作保留。</p>
          </div>
        )}
      </div>
      <p className="three26-metrics">
        {status === "ready"
          ? `Three.js 0.186.1 · WebGL 2 · 位图${info.width}×${info.height} · ${info.triangles}三角形 · 已绘制${info.draws}次。`
          : "当前加载中或使用非3D回退，不能算真实3D成功。"}{" "}
        常规DPR最多1.5，低预算0.75，每边最多1024px且尊重实现上限。
        {reduce ? "系统减少动态已开启" : "系统未要求减少动态"}
        ；始终静态按需重绘，没有自动旋转。
      </p>
      <div className="three26-status" role="status">
        {message}
      </div>
      {inspection && <p className="three26-inspection">{inspection}</p>}
      <div className="three26-explain">
        <p>{threeScope}</p>
        <dl>
          <dt>Scene · 场景</dt>
          <dd>像舞台清单，组织网格、灯光与相机，不是一个DOM容器截图。</dd>
          <dt>Camera · 相机</dt>
          <dd>决定从哪里看、看多宽；容器变化需要更新aspect和投影。</dd>
          <dt>Mesh · 网格</dt>
          <dd>把几何形状与材质装在一起，可独立移动、旋转和缩放。</dd>
          <dt>Material · 材质</dt>
          <dd>
            本例表面有粗糙度和金属度；“金属感”是简化光照实验，不是产品实拍或真实材质测量。
          </dd>
          <dt>Light · 灯光</dt>
          <dd>影响本例会响应光照的材质；不是所有材质都必须依赖灯光。</dd>
        </dl>
        <p>
          本例仅两个自制网格，不加载纹理、外部模型、阴影贴图或后处理。Three.js帮助组织和渲染三维内容，不是建模软件；普通2D卡片可用CSS/SVG，无需强加3D。软件WebGL只验证机制，不证明目标设备的GPU性能。
        </p>
        <p>
          按需合并重绘，无持续动画。隐藏dispose几何、材质、renderer并缩小位图；卸载再在扩展可用时主动丢弃上下文，否则由浏览器回收。模块加载失败、WebGL
          2不可用或上下文丢失保留明确的非3D回退和重试，恢复重建，不把回退计为真实渲染。
        </p>
      </div>
    </div>
  );
}
