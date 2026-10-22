import { gsap } from "gsap";
const publicBaseline = [
  gsap.matchMedia,
  gsap.addEventListener,
  gsap.delayedCall,
];
export const initializationMethodsRestored = () =>
  publicBaseline.every(
    (fn, i) =>
      fn === [gsap.matchMedia, gsap.addEventListener, gsap.delayedCall][i],
  );
// GSAP3.15 ScrollTrigger.enable creates orientation MatchMedia and core event
// callbacks that disable() alone leaves registered. T06 is the sole GSAP owner.
// Capture only synchronous initialization calls, then immediately restore the
// public methods. Revert contexts AND detach their native callbacks on disposal.
export function beginInitializationOwnership() {
  const scopes = [],
    native = [],
    core = [],
    calls = [];
  const originalMedia = gsap.matchMedia;
  const originalEvent = gsap.addEventListener;
  const originalDelayedCall = gsap.delayedCall;
  let restored = false,
    disposed = false;
  function captureNative(action) {
    const originalMatch = window.matchMedia;
    const restores = [];
    window.matchMedia = function (...args) {
      const query = originalMatch.apply(window, args);
      for (const [addName, removeName] of [
        ["addListener", "removeListener"],
        ["addEventListener", "removeEventListener"],
      ]) {
        const descriptor = Object.getOwnPropertyDescriptor(query, addName);
        const add = query[addName];
        if (typeof add !== "function") continue;
        query[addName] = function (...values) {
          native.push(() => query[removeName](...values));
          return add.apply(query, values);
        };
        restores.push(() => {
          if (descriptor) Object.defineProperty(query, addName, descriptor);
          else delete query[addName];
        });
      }
      return query;
    };
    try {
      return action();
    } finally {
      window.matchMedia = originalMatch;
      restores.reverse().forEach((restore) => restore());
    }
  }
  gsap.matchMedia = function (...args) {
    const scope = originalMedia.apply(gsap, args);
    scopes.push(scope);
    const add = scope.add;
    scope.add = function (...values) {
      return captureNative(() => add.apply(scope, values));
    };
    return scope;
  };
  gsap.addEventListener = function (type, callback) {
    core.push([type, callback]);
    return originalEvent.call(gsap, type, callback);
  };
  gsap.delayedCall = function (...args) {
    const call = originalDelayedCall.apply(gsap, args);
    calls.push(call);
    return call;
  };
  return {
    restore() {
      if (restored) return;
      restored = true;
      gsap.matchMedia = originalMedia;
      gsap.addEventListener = originalEvent;
      gsap.delayedCall = originalDelayedCall;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      this.restore();
      core.forEach(([type, callback]) =>
        gsap.removeEventListener(type, callback),
      );
      scopes.forEach((scope) => scope.revert());
      calls.forEach((call) => call.kill());
      native.forEach((remove) => remove());
      core.length = scopes.length = native.length = calls.length = 0;
    },
  };
}
// ES dependency evaluation starts this before the plugin import, covering its
// optional global auto-registration and the runtime explicit registration.
// Runtime closes this lease before exposing scene APIs.
export const initialRegistrationOwnership = beginInitializationOwnership();
