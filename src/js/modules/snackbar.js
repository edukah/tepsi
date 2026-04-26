import Language from '../core/language.js';

/**
 * Snackbar — Tepsi's default message UI (zero-dependency).
 *
 * Hibrit pattern: bu UI default. Consumer `config.onMessage(message)` callback ile
 * override edebilir (örn. Sadrazam.Snackbar bağlamak için).
 *
 * Accepts Dialog format directly:
 *   { success: [...], error: [...], warning: [...], notice: [...] }
 */
class Snackbar {
  static TYPES = ['success', 'error', 'warning', 'notice'];

  static #wrapper = null;
  static #timer = null;

  /**
   * Show a notification message.
   * @param {object} message - Dialog format (type-grouped arrays)
   * @param {number|false} [time=4000] - Auto-dismiss delay in ms; false to disable
   */
  static show (message, time = 4000) {
    Snackbar.clear();

    if (!message || typeof message !== 'object') return;

    // Pick dominant type for border color (priority: error > warning > success > notice)
    const priority = ['error', 'warning', 'success', 'notice'];
    const dominantType = priority.find(t => message[t]?.length);

    if (!dominantType) return;

    const wrapper = document.createElement('div');
    wrapper.className = `tepsi__snackbar tepsi__snackbar--${dominantType}`;

    // Message list
    const list = document.createElement('ul');
    list.className = 'tepsi__snackbar__list';

    for (const type of Snackbar.TYPES) {
      const items = message[type];
      if (!Array.isArray(items)) continue;

      for (const text of items) {
        const li = document.createElement('li');
        li.textContent = text;
        list.appendChild(li);
      }
    }

    wrapper.appendChild(list);

    // Manual close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tepsi__snackbar__close';
    closeBtn.setAttribute('aria-label', Language.t('aria_close'));
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => Snackbar.clear());
    wrapper.appendChild(closeBtn);

    document.body.appendChild(wrapper);
    Snackbar.#wrapper = wrapper;

    if (time !== false && typeof time === 'number') {
      Snackbar.#timer = globalThis.setTimeout(() => Snackbar.clear(), time);
    }
  }

  /**
   * Remove current notification.
   */
  static clear () {
    if (Snackbar.#timer) {
      globalThis.clearTimeout(Snackbar.#timer);
      Snackbar.#timer = null;
    }
    Snackbar.#wrapper?.remove();
    Snackbar.#wrapper = null;
  }
}

export default Snackbar;
