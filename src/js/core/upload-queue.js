/**
 * UploadQueue — concurrent upload manager.
 *
 * Default: 3 parallel uploads. Excess tasks wait in queue, pulled in FIFO order.
 *
 * Task = `() => Promise<any>`. Tasks are responsible for their own AbortController;
 * when a task is cancelled externally (slot cancel button), the task itself should
 * exit early (e.g. by checking slot state at the top).
 */
class UploadQueue {
  #queue = [];
  #active = 0;
  #maxConcurrent;

  constructor (maxConcurrent = 3) {
    this.#maxConcurrent = maxConcurrent;
  }

  /**
   * Push a task to the queue. Auto-runs if under concurrent limit.
   * @param {() => Promise<any>} task
   */
  push (task) {
    this.#queue.push(task);
    this.#process();
  }

  /**
   * Clear all queued tasks (does not abort active uploads — caller does that
   * via per-task AbortController).
   */
  clear () {
    this.#queue = [];
  }

  // --- Private ---

  async #process () {
    if (this.#active >= this.#maxConcurrent || !this.#queue.length) {
      return;
    }

    const task = this.#queue.shift();
    this.#active++;

    try {
      await task();
    } catch (error) {
      console.error('[Tepsi|UploadQueue] Task failed:', error);
    } finally {
      this.#active--;
      this.#process();
    }
  }
}

export default UploadQueue;
