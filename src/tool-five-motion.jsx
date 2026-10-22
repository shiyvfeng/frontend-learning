import React, { forwardRef, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useIsPresent,
} from "motion/react";
import { Tool05CardBody } from "./tool-five-card";
// popLayout measures this direct child: its forwarded ref reaches the real li.
const MotionCard = forwardRef(function MotionCard(
  { id, note, expanded, marked, handlers, slow, onEvent },
  ref,
) {
  const present = useIsPresent(),
    latest = useRef(present),
    alive = useRef(true),
    [phase, setPhase] = useState("ready");
  latest.current = present;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <motion.li
      ref={ref}
      layout="position"
      className="tool05-card"
      data-item={id}
      data-present={String(present)}
      data-phase={!present ? "exiting" : phase}
      inert={present ? undefined : true}
      aria-hidden={present ? undefined : true}
      style={{ pointerEvents: present ? undefined : "none" }}
      initial={{ opacity: 1, y: 14 }}
      animate="visible"
      exit="exit"
      variants={{ visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -14 } }}
      transition={{
        opacity: { type: "tween", duration: slow ? 1.1 : 0.24 },
        y: { type: "tween", duration: slow ? 1.1 : 0.24 },
        layout: slow
          ? { type: "spring", stiffness: 70, damping: 18, mass: 1 }
          : { type: "spring", stiffness: 320, damping: 34, mass: 1 },
      }}
      onAnimationStart={(definition) => {
        if (!alive.current) return;
        if (definition === "visible" && latest.current) {
          setPhase("entering");
          onEvent(id, "进入开始", "visible");
        } else if (definition === "exit" && !latest.current)
          onEvent(id, "收到退出开始信号", "exit");
      }}
      onAnimationComplete={(definition) => {
        if (!alive.current) return;
        if (definition === "visible" && latest.current) {
          setPhase("ready");
          onEvent(id, "进入/反向恢复完成", "visible");
        } else if (definition === "exit" && !latest.current)
          onEvent(id, "收到退出完成信号", "exit");
      }}
      onLayoutAnimationStart={() => {
        if (alive.current && latest.current)
          onEvent(id, "布局位置过渡开始", "layout");
      }}
      onLayoutAnimationComplete={() => {
        if (alive.current && latest.current)
          onEvent(id, "布局位置过渡完成", "layout");
      }}
    >
      <Tool05CardBody
        id={id}
        inactive={!present}
        note={note}
        expanded={expanded}
        marked={marked}
        {...handlers}
      />
    </motion.li>
  );
});
export default function Tool05MotionBoard({
  ids,
  notes,
  expanded,
  marked,
  handlers,
  slow,
  onEvent,
}) {
  return (
    <MotionConfig reducedMotion="user">
      <ul className="tool05-list" data-renderer="motion14.6.0">
        <AnimatePresence initial={false} mode="popLayout">
          {ids.map((id) => (
            <MotionCard
              key={id}
              id={id}
              note={notes[id]}
              expanded={expanded[id]}
              marked={marked[id]}
              handlers={handlers}
              slow={slow}
              onEvent={onEvent}
            />
          ))}
        </AnimatePresence>
      </ul>
    </MotionConfig>
  );
}
