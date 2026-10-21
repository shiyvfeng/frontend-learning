import { appendFileSync, mkdirSync } from "node:fs";

// Cache only the target of this action. Every traversed Tab remains a real key;
// visible focus, viewport fit, hit testing and all lesson tasks stay unchanged.
export function createKeyboardNavigator(
  page,
  expect,
  trace,
  { lesson, profile },
) {
  const directory = process.env.KEYBOARD_DIAGNOSTICS;
  const diagnosticFile = directory
    ? `${directory}/${lesson}-${profile}.jsonl`
    : null;
  const record = (row) => {
    if (!diagnosticFile) return;
    mkdirSync(directory, { recursive: true });
    appendFileSync(
      diagnosticFile,
      JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n",
    );
  };
  async function seek(locator, name) {
    const started = performance.now();
    let target,
      tabs = 0,
      lookupMs = 0,
      keyMs = 0,
      resolutionMs = 0,
      call = "enabled",
      lastFocus = null;
    try {
      await expect(locator).toBeEnabled();
      call = "resolve current target once";
      let t = performance.now();
      target = await locator.elementHandle();
      resolutionMs += performance.now() - t;
      if (!target) throw Error("Missing target " + name);
      if (diagnosticFile) {
        const before = await target.evaluate((e) => {
          const r = e.getBoundingClientRect(),
            a = document.activeElement;
          return {
            targetTag: e.tagName,
            targetVisible: !!e.getClientRects().length,
            targetRect: { x: r.x, y: r.y, width: r.width, height: r.height },
            focusTag: a?.tagName,
            focusText: (a?.textContent ?? "").trim().slice(0, 100),
          };
        });
        record({
          phase: "begin",
          name,
          locator: locator.toString(),
          ...before,
        });
      }
      for (let probes = 0; tabs < 240 && probes < 480; probes++) {
        call = "cached target evaluate focus and current geometry";
        t = performance.now();
        const state = await target.evaluate(
          (e, sample) => {
            const connected = e.isConnected,
              a = document.activeElement;
            const focus = sample
              ? {
                  focusTag: a?.tagName,
                  focusText: (a?.textContent ?? "").trim().slice(0, 100),
                }
              : {};
            if (!connected || e !== a)
              return { connected, focused: false, ...focus };
            const r = e.getBoundingClientRect(),
              hit = document.elementFromPoint(
                r.left + r.width / 2,
                r.top + r.height / 2,
              );
            return {
              connected,
              focused: true,
              outline: getComputedStyle(e).outlineStyle,
              visible: r.top >= 0 && r.bottom <= innerHeight + 1,
              covered: hit !== e && !e.contains(hit),
              targetConnected: connected,
              focusTag: a?.tagName,
              focusText: (a?.textContent ?? "").trim().slice(0, 100),
            };
          },
          !!diagnosticFile && tabs % 25 === 0,
        );
        lookupMs += performance.now() - t;
        if (!state.connected) {
          record({ phase: "replaced", name, tabs });
          await target.dispose();
          call = "resolve replaced target";
          t = performance.now();
          target = await locator.elementHandle();
          resolutionMs += performance.now() - t;
          if (!target) throw Error("Detached target " + name);
          continue;
        }
        if (state.focused) {
          // Recheck selector identity once on arrival, rather than recomputing
          // role and accessible name against the whole page after every Tab.
          call = "verify cached target still matches live locator";
          t = performance.now();
          const liveMatches = await locator.evaluate(
            (live, cached) => live === cached,
            target,
          );
          resolutionMs += performance.now() - t;
          if (!liveMatches) {
            await target.dispose();
            target = await locator.elementHandle();
            if (!target) throw Error("Changed target " + name);
            continue;
          }
          expect(state.focused).toBe(true);
          expect(state.targetConnected).toBe(true);
          expect(state.outline).not.toBe("none");
          expect(state.visible).toBe(true);
          expect(state.covered).toBe(false);
          trace.push({ name, tabs, ...state });
          record({
            phase: "reached",
            name,
            tabs,
            elapsedMs: performance.now() - started,
            lookupMs,
            resolutionMs,
            keyMs,
            ...state,
          });
          return;
        }
        if (diagnosticFile && tabs % 25 === 0) {
          lastFocus = { focusTag: state.focusTag, focusText: state.focusText };
          record({
            phase: "scanning",
            name,
            tabs,
            lookupMs,
            resolutionMs,
            keyMs,
            ...lastFocus,
          });
        }
        call = "keyboard.press Tab";
        t = performance.now();
        await page.keyboard.press("Tab");
        keyMs += performance.now() - t;
        tabs++;
      }
      throw Error("Unreachable " + name);
    } catch (error) {
      record({
        phase: "error",
        name,
        tabs,
        call,
        elapsedMs: performance.now() - started,
        lookupMs,
        resolutionMs,
        keyMs,
        lastFocus,
        error: String(error),
      });
      throw error;
    } finally {
      await target?.dispose().catch(() => {});
    }
  }
  const act = async (locator, name) => {
    await seek(locator, name);
    const started = performance.now();
    await page.keyboard.press("Enter");
    trace.push({ enter: name });
    record({
      phase: "action",
      name,
      key: "Enter",
      elapsedMs: performance.now() - started,
    });
  };
  const toggle = async (locator, name) => {
    await seek(locator, name);
    const started = performance.now();
    await page.keyboard.press("Space");
    trace.push({ space: name });
    record({
      phase: "action",
      name,
      key: "Space",
      elapsedMs: performance.now() - started,
    });
  };
  return { seek, act, toggle };
}
