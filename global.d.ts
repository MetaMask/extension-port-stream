// Global type declarations for browser APIs not included in TypeScript's built-in types

export {};

declare global {
  interface Scheduler {

    /**
     * The `yield()` method of the `Scheduler interface is used for yielding to
     * the main thread during a task and continuing execution later, with the
     * continuation scheduled as a prioritized task (see the Prioritized Task
     * Scheduling API for more information). This allows long-running work to be
     * broken up so the browser stays responsive.
     *
     * The task can continue when the promise returned by the method is
     * resolved. The priority for when the promise is resolved defaults to
     * `"user-visible"`, but can inherit a different priority if the `yield()`
     * call occurs within a `Scheduler.postTask()` callback.
     *
     * In addition, the continuation of work after the `yield()` call can be
     * canceled if it occurs within a `postTask()` callback and the task is
     * aborted.
     *
     * @returns Returns a `Promise` that is fulfilled with `undefined`, or rejected
     * with an `AbortSignal.reason`.
     */
    yield(): Promise<void>;
  }

  // eslint-disable-next-line no-var
  var scheduler: Scheduler | undefined;
}
