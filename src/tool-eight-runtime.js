import * as T from "./lesson-twenty-six-engine";
const owners = new Set(),
  resources = new Set();
const totals = {
  createdControllers: 0,
  disposedGeometry: 0,
  disposedMaterial: 0,
  disposedRenderer: 0,
};
export const runtimeState = () => ({
  controllers: owners.size,
  renderers: resources.size,
  ...totals,
});
export function bufferSize(w, h, dpr, low, limit = 4096) {
  const ratio = Math.min(
    low ? 1 : 2,
    Math.max(1, Number.isFinite(dpr) ? dpr : 1),
  );
  const cw = Math.max(1, Number.isFinite(w) ? w : 1),
    ch = Math.max(1, Number.isFinite(h) ? h : 1);
  const scale = Math.min(
    ratio,
    640 / cw,
    480 / ch,
    Math.max(1, limit) / cw,
    Math.max(1, limit) / ch,
  );
  return {
    width: Math.max(1, Math.floor(cw * scale)),
    height: Math.max(1, Math.floor(ch * scale)),
  };
}
export function createScene(host, onState) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.tool08Canvas = "";
  host.append(canvas);
  const token = {};
  owners.add(token);
  totals.createdControllers++;
  let alive = true,
    frame = 0,
    epoch = 0,
    gl = null,
    r = null,
    config = null,
    lost = false,
    draws = 0,
    dprQuery = null;
  const report = (status, message) => {
    if (alive) onState({ status, message, draws });
  };
  function cancel() {
    epoch++;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function release(lose = false) {
    if (r) {
      const x = r;
      r = null;
      resources.delete(x);
      if (gl && !gl.isContextLost()) {
        gl.useProgram(null);
        gl.bindVertexArray(null);
      }
      for (const g of x.geometries) {
        g.dispose();
        totals.disposedGeometry++;
      }
      for (const m of x.materials) {
        m.dispose();
        totals.disposedMaterial++;
      }
      x.scene.clear();
      x.renderer.dispose();
      totals.disposedRenderer++;
      if (gl && !gl.isContextLost())
        for (let i = 0; i < 16 && gl.getError() !== gl.NO_ERROR; i++) {}
    }
    canvas.width = canvas.height = 1;
    if (lose && gl && !gl.isContextLost())
      gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  function build() {
    if (r) return;
    gl =
      gl ??
      canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
      });
    if (!gl) throw Error("WebGL 2不可用");
    if (gl.isContextLost()) throw Error("等待上下文恢复");
    const renderer = new T.WebGLRenderer({
        canvas,
        context: gl,
        antialias: false,
        alpha: false,
      }),
      scene = new T.Scene(),
      camera = new T.PerspectiveCamera(42, 1, 0.1, 40);
    r = {
      renderer,
      scene,
      camera,
      geometries: new Set(),
      materials: new Set(),
      markers: [],
      shaderFailed: false,
    };
    const owner = r;
    resources.add(r);
    renderer.debug.onShaderError = () => (owner.shaderFailed = true);
    scene.background = new T.Color("#eeedf4");
    const material = (color, extra = {}) => {
      const m = new T.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.1,
        ...extra,
      });
      r.materials.add(m);
      return m;
    };
    const box = (name, w, h, d, mat, x, y, z) => {
      const g = new T.BoxGeometry(w, h, d);
      r.geometries.add(g);
      const m = new T.Mesh(g, mat);
      m.name = name;
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    };
    r.bodyMaterial = material("#7963a6");
    const dark = material("#4e5364"),
      bulb = material("#fff0c6", {
        emissive: "#ffe7a3",
        emissiveIntensity: 0.35,
      });
    box("lamp-base", 1.6, 0.16, 1, r.bodyMaterial, 0, -0.9, 0);
    r.stem = box("lamp-stem", 0.14, 1.3, 0.14, dark, 0, -0.2, 0);
    r.shade = box("lamp-shade", 1, 0.3, 0.7, r.bodyMaterial, 0, 0.55, 0);
    r.bulb = box("lamp-bulb", 0.65, 0.06, 0.45, bulb, 0, 0.37, 0);
    const g = new T.PlaneGeometry(8, 8);
    r.geometries.add(g);
    const floor = new T.Mesh(g, material("#c9d2ce"));
    floor.name = "floor";
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    scene.add(floor);
    const stockMaterial = material("#527b70");
    for (let i = 0; i < 3; i++)
      r.markers.push(
        box(
          "stock-" + i,
          0.22,
          0.22,
          0.22,
          stockMaterial,
          -1.1 + i * 0.3,
          -0.78,
          0.85,
        ),
      );
    const ambient = new T.AmbientLight("#ffffff", 0.8);
    r.light = new T.DirectionalLight("#ffffff", 3);
    r.light.position.set(-3, 5, 4);
    scene.add(ambient, r.light, camera);
  }
  function draw() {
    if (!alive || document.hidden || lost || !config) return;
    if (config.fallback) {
      release();
      report("fallback", "手动非3D回退：配置文字与合同保留，没有真实3D画面。");
      return;
    }
    try {
      build();
      const rect = host.getBoundingClientRect(),
        limit = Math.min(
          gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
          ...gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        ),
        size = bufferSize(
          rect.width,
          rect.height,
          devicePixelRatio,
          config.low,
          limit,
        );
      r.renderer.setPixelRatio(1);
      r.renderer.setSize(size.width, size.height, false);
      r.camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
      r.camera.position.set(
        ...(config.view === "front" ? [0, 1, 5.2] : [3.5, 2.3, 4.5]),
      );
      r.camera.lookAt(0, 0, 0);
      r.camera.updateProjectionMatrix();
      r.bodyMaterial.color.set(
        config.finish === "sage" ? "#6f9c89" : "#7963a6",
      );
      const scale = config.height === "tall" ? 1.4 : 1;
      r.stem.scale.y = scale;
      r.stem.position.y = -0.85 + 0.65 * scale;
      r.shade.position.y = -0.85 + 1.3 * scale + 0.15;
      r.bulb.position.y = r.shade.position.y - 0.18;
      r.light.intensity = Number(config.light);
      r.markers.forEach((m, i) => (m.visible = i < config.stock));
      r.renderer.render(r.scene, r.camera);
      if (r.shaderFailed) throw Error("Three.js材质着色器编译或链接失败");
      if (gl.getError() !== gl.NO_ERROR) throw Error("WebGL绘制未成功");
      draws++;
      canvas.dataset.draws = String(draws);
      report(
        "ready",
        "真实Three.js已按当前配置绘制。无自动旋转、无持续渲染循环。",
      );
    } catch (e) {
      release();
      report("failed", `${e.message}；保留明确的非3D文字回退，可重试。`);
    }
  }
  function request() {
    if (!alive || document.hidden || lost || frame) return;
    const version = epoch;
    frame = requestAnimationFrame(() => {
      if (!alive || version !== epoch) return;
      frame = 0;
      draw();
    });
  }
  const visibility = () => {
    if (!alive) return;
    cancel();
    if (document.hidden) {
      release();
      report(
        "suspended",
        "页面隐藏，释放本例GPU资源并取消待处理帧；返回按最新配置重建。",
      );
    } else if (lost) {
      report(
        "lost",
        "页面已恢复可见，但WebGL上下文仍丢失；等待浏览器恢复，当前不是3D成功。",
      );
    } else request();
  };
  const contextLost = (e) => {
    if (!alive) return;
    e.preventDefault();
    lost = true;
    cancel();
    release();
    report(
      "lost",
      "真实WebGL上下文丢失，等待浏览器恢复或重新准备；文字不是3D成功。",
    );
  };
  const contextRestored = () => {
    if (!alive) return;
    lost = false;
    cancel();
    release();
    request();
  };
  const resize = () => request(),
    trackDPR = () => {
      // A retired callback cannot subscribe again after destroy.
      if (!alive) return;
      dprQuery?.removeEventListener("change", changedDPR);
      dprQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", changedDPR);
    },
    changedDPR = () => {
      trackDPR();
      request();
    };
  const ro =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  ro?.observe(host);
  trackDPR();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  return {
    update(d) {
      if (!alive) return;
      config = { ...d };
      request();
    },
    retry() {
      if (!alive) return;
      cancel();
      release();
      if (lost)
        report("lost", "上下文仍丢失，等待浏览器恢复或释放后重新准备。");
      else request();
    },
    inspect() {
      return {
        ...runtimeState(),
        kind: r ? "actual-three" : "non-3d",
        revision: T.REVISION,
        renderer: !!r?.renderer.isWebGLRenderer,
        draws,
        width: canvas.width,
        height: canvas.height,
        lost,
        pendingFrame: !!frame,
        ...(r
          ? {
              color: r.bodyMaterial.color.getHexString(),
              stemScale: r.stem.scale.y,
              shadeY: r.shade.position.y,
              stockVisible: r.markers.filter((m) => m.visible).length,
              camera: r.camera.position.toArray(),
              aspect: r.camera.aspect,
              light: r.light.intensity,
              triangles: r.renderer.info.render.triangles,
              rendererName: gl.getParameter(
                gl.getExtension("WEBGL_debug_renderer_info")
                  ?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER,
              ),
            }
          : {}),
      };
    },
    destroy() {
      if (!alive) return;
      alive = false;
      cancel();
      ro?.disconnect();
      dprQuery?.removeEventListener("change", changedDPR);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      release(true);
      canvas.remove();
      owners.delete(token);
    },
  };
}
