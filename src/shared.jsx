import React from "react";
import { sources } from "./content";
import {
  courseRoute,
  lessonCatalog,
  coverageCatalog,
  availabilityText,
} from "./route";

export function Icon({ type = "layers", size = 20 }) {
  const paths = {
    layers: (
      <>
        <path d="m3 7 9-5 9 5-9 5-9-5Z" />
        <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h15m-6-6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    tree: (
      <>
        <path d="M12 3v7M5 17v-7h14v7" />
        <rect x="9" y="1" width="6" height="5" rx="1" />
        <rect x="2" y="17" width="6" height="5" rx="1" />
        <rect x="16" y="17" width="6" height="5" rx="1" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M15 8V3H3v12h5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type] || paths.layers}
    </svg>
  );
}
export function Roadmap() {
  return (
    <details className="roadmap-details">
      <summary>
        <span>路线核对说明与官方来源</span>
        <span className="micro">
          技术参考 2026-10-20 · 目录对齐 2026-10-21{" "}
          <span aria-hidden="true">＋</span>
        </span>
      </summary>
      <div className="roadmap-body">
        <p>
          保留“结构 → 布局与响应式 → 视觉 → 状态 → 动效 → 特殊渲染 →
          设计实现映射”的主干。工具穿插在具体问题中；这是截至核对日期的学习路线，不承诺永远最新。
        </p>
        <ul>
          <li>
            滚动效果先判断原生 CSS Scroll-driven Animations
            是否适用；复杂编排再评估 GSAP。定位补充 Anchor Positioning，切换补充
            View Transitions；各自检查目标浏览器兼容性并设计降级。
          </li>
          <li>
            Motion 可用于 React 布局动画。Lottie / dotLottie
            也能绑定交互和状态机；Rive
            也提供状态机与运行时。按动画资产、交互复杂度、平台支持及体积选择，不用“无交互
            / 有交互”二分。
          </li>
          <li>
            截图只能提供视觉证据，无法确定真实技术栈。可访问性、性能、兼容性与
            Agent
            指令验收贯穿每节：可用键盘、焦点可见、减少动态效果、移动端可读、依赖适量并有降级。
          </li>
        </ul>
        <p>
          原课程按 {courseRoute.length} 课逐章推进。{availabilityText}{" "}
          此前目录把多个主题合并为 8
          类，本次展开保留各课，主干分类用于理解关系，不替代原课编号。
        </p>
        <details className="full-course-outline">
          <summary>查看完整 {courseRoute.length} 课目录及覆盖标签</summary>
          <ol>
            {lessonCatalog.map((lesson) => (
              <li key={lesson.id} data-lesson-id={lesson.id}>
                {lesson.title} <span>{lesson.status}</span>
              </li>
            ))}
          </ol>
          <p>
            A、B 和 T01–T12
            是实施覆盖标签，不是原文的统一课程编号；工具会穿插到相关章节，综合能力持续练习；这些覆盖计划尚未作为独立模块制作。
          </p>
          <div className="source-links">
            {coverageCatalog.map(({ id, title, status }) => (
              <span key={id} data-coverage-id={id}>
                {id} · {title} · {status}
              </span>
            ))}
          </div>
        </details>
        <div className="source-links">
          {sources.map(([label, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {label} ↗
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
