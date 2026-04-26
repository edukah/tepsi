import Slot from './slot.js';
import Validator from './validator.js';
import AjaxClient from './ajax-client.js';
import UploadQueue from './upload-queue.js';
import Language from './language.js';
import DragDrop from '../modules/drag-drop.js';
import Snackbar from '../modules/snackbar.js';
import helpData from '../docs/help.json';

/**
 * Tepsi — multi-slot file uploader with drag-drop UI.
 *
 * Stateless lib: file ops only, no DB. Caller syncs DB on form submit.
 *
 * @example
 * new Tepsi('#container', {
 *   uploadUrl: 'https://example.com/upload?token=xxx',
 *   deleteUrl: 'https://example.com/delete?token=xxx',
 *   directory: 'product/1/100/74',
 *   maxCount: 10,
 *   languageCode: 'tr'   // 'tr' | 'en' | null (default 'tr')
 * });
 */
class Tepsi {
  static DEFAULTS = {
    // Server endpoints
    uploadUrl: null,
    deleteUrl: null,
    directory: '',

    // Slot configuration
    maxCount: 1,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMb: 5,
    minWidth: null,
    minHeight: null,

    // Concurrent upload
    maxConcurrent: 3,

    // Module options
    dragDrop: true,

    // Form integration
    hiddenInputName: 'files',

    // Initial state
    initialFiles: [],

    // Language ('tr' | 'en' | null = keep current)
    languageCode: null,

    // Demo / testing
    mockMode: false,

    // Callbacks (optional)
    onUpload: null,
    onDelete: null,
    onReorder: null,
    onMessage: null,
    onError: null
  };

  // --- Private Instance Fields ---
  #config;
  #container;
  #slots = [];
  #queue;
  #ajax;
  #validator;
  #snackbar = null;
  #dragDrop = null;
  #fileInput;
  #hiddenInputContainer = null;
  #clickHandler;

  constructor (container, config = {}) {
    this.#container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.#container) {
      throw new Error(Language.t('error_container_not_found'));
    }

    if (this.#container.__tepsi) return this.#container.__tepsi;
    this.#container.__tepsi = this;

    this.#config = { ...Tepsi.DEFAULTS, ...config };

    if (this.#config.languageCode) {
      Language.setCurrent(this.#config.languageCode);
    }

    this.#ajax = new AjaxClient(this.#config);
    this.#validator = new Validator(this.#config);
    this.#queue = new UploadQueue(this.#config.maxConcurrent);

    if (!this.#config.onMessage) {
      this.#snackbar = Snackbar;
    }

    this.#renderGrid();
    this.#initFileInput();
    this.#bindEvents();
    this.#initFiles(this.#config.initialFiles);

    if (this.#config.dragDrop) {
      this.#dragDrop = new DragDrop(this);
    }
  }

  // --- Rendering ---

  #renderGrid () {
    // Defensive: container'da pre-existing children varsa temizle (re-init / dirty mount)
    this.#container.replaceChildren();
    this.#container.classList.add('tepsi');

    for (let i = 0; i < this.#config.maxCount; i++) {
      const slot = new Slot(i);
      this.#container.appendChild(slot.element);
      this.#slots.push(slot);
    }

    // Static helper text (slot grid'in son satırı — grid-column: 1 / -1 ile tam genişlik)
    const hint = document.createElement('p');
    hint.className = 'tepsi__hint';
    hint.textContent = Language.t('hint_drag_or_click');
    this.#container.appendChild(hint);
  }

  #initFileInput () {
    this.#fileInput = document.createElement('input');
    this.#fileInput.type = 'file';
    this.#fileInput.multiple = true;
    this.#fileInput.style.display = 'none';
    this.#fileInput.accept = this.#config.allowedTypes.join(',');
    this.#fileInput.addEventListener('change', () => {
      this.handleFiles(this.#fileInput.files);
      this.#fileInput.value = '';
    });
    this.#container.appendChild(this.#fileInput);
  }

  #initFiles (files) {
    files.forEach((file, i) => {
      const slot = this.#slots[i];
      if (!slot) return;
      slot.setFile(file);
      slot.setState('filled');
    });
    this.#syncHiddenInputs();
  }

  // --- Event Binding ---

  #bindEvents () {
    this.#clickHandler = (e) => this.#handleClick(e);
    this.#container.addEventListener('click', this.#clickHandler);
  }

  #handleClick (e) {
    const slotEl = e.target.closest('.tepsi__slot');
    if (!slotEl || !this.#container.contains(slotEl)) return;

    const idx = parseInt(slotEl.dataset.index, 10);
    const slot = this.#slots[idx];
    if (!slot) return;

    if (e.target.closest('.tepsi__loader-btn')) {
      this.#handleSlotCancel(slot);

      return;
    }

    if (e.target.closest('.tepsi__delete-btn')) {
      this.#handleSlotDelete(slot);

      return;
    }

    if (slot.state === 'empty') {
      this.#fileInput.click();
    }
  }

  // --- File Handling ---

  /**
   * Public: process a FileList (from file picker or external drop).
   *
   * 2-phase to avoid race condition (file picker + drag drop concurrent):
   *   Phase 1 (sync) — reserve empty slots by setting state='queued'
   *   Phase 2 (async) — validate each file and either start upload or release slot
   *
   * @param {FileList|File[]} files
   */
  async handleFiles (files) {
    if (!files || !files.length) return;

    const errors = [];
    const reserved = [];

    // Phase 1: Reserve empty slots synchronously (race-free)
    for (const file of files) {
      const emptySlot = this.#slots.find(s => s.state === 'empty');
      if (!emptySlot) {
        errors.push(Language.t('error_max_count', { max: this.#config.maxCount }));
        break;
      }
      emptySlot.setState('queued');
      reserved.push({ slot: emptySlot, file });
    }

    // Phase 2: Validate + start upload (or release slot on validation failure)
    for (const { slot, file } of reserved) {
      const validation = await this.#validator.validate(file);
      if (!validation.valid) {
        slot.setState('empty');
        errors.push(validation.message);
        continue;
      }
      this.#startUpload(slot, file);
    }

    if (errors.length) {
      this.#showMessage({ error: errors });
    }
  }

  #startUpload (slot, file) {
    // Slot is already in 'queued' state (reserved by handleFiles Phase 1)
    const abortController = new globalThis.AbortController();
    slot.setAbortController(abortController);

    const task = async () => {
      if (slot.state !== 'queued') return;

      slot.setState('uploading');

      try {
        const result = await this.#ajax.upload(file, this.#config.directory, abortController.signal);

        if (result.message) {
          this.#showMessage(result.message);
        }

        if (result.result) {
          slot.setFile({
            path: result.path,
            name: result.name,
            mime: result.mime,
            size: result.size,
            previewUrl: result.previewUrl  // optional — server-provided full URL (overrides blob)
          }, file);  // pass localFile for instant blob preview
          slot.setState('filled');
          this.#syncHiddenInputs();
          this.#config.onUpload?.(slot.file);
        } else {
          slot.clearFile();
          slot.setState('empty');
        }
      } catch (err) {
        if (err.name === 'AbortError') return;

        slot.clearFile();
        slot.setState('empty');
        this.#showMessage({ error: [Language.t('error_unexpected', { message: err.message })] });
        this.#config.onError?.(err, { phase: 'upload', file });
      }
    };

    this.#queue.push(task);
  }

  #handleSlotCancel (slot) {
    if (slot.state !== 'uploading' && slot.state !== 'queued') return;

    slot.abort();
    slot.clearFile();
    slot.setState('empty');
    this.#compactFilled();
    this.#syncHiddenInputs();
    this.#showMessage({ warning: [Language.t('warning_upload_cancelled')] });
  }

  async #handleSlotDelete (slot) {
    if (slot.state !== 'filled') return;

    const path = slot.file?.path;
    if (!path) return;

    slot.setState('deleting');

    try {
      const result = await this.#ajax.delete(path);

      if (result.message) {
        this.#showMessage(result.message);
      }

      if (result.result) {
        slot.clearFile();
        slot.setState('empty');
        this.#compactFilled();
        this.#syncHiddenInputs();
        this.#config.onDelete?.(path);
      } else {
        slot.setState('filled');
      }
    } catch (err) {
      slot.setState('filled');
      this.#showMessage({ error: [Language.t('error_delete', { message: err.message })] });
      this.#config.onError?.(err, { phase: 'delete', path });
    }
  }

  /**
   * Filled slot'ları başa shift eder — silme/cancel sonrası ortada kalan boşluğu kapatır
   * (Etsy/Shopify stili compact). Aktif yükleme/silme varsa atlar (UI'yı bozmamak için).
   */
  #compactFilled () {
    // In-flight operation varsa atla — uploading/queued/deleting slot'larını yerinden oynatmamak için
    const hasInFlight = this.#slots.some(s =>
      s.state === 'queued' || s.state === 'uploading' || s.state === 'deleting'
    );
    if (hasInFlight) return;

    const items = this.#slots
      .filter(s => s.state === 'filled')
      .map(s => ({ file: s.file, localFile: s.localFile }));

    this.#slots.forEach((slot, i) => {
      const item = items[i];
      if (item) {
        // Aynı file zaten doğru slot'taysa skip — gereksiz blob revoke+re-create flicker'ı önle
        if (slot.state === 'filled' && slot.file === item.file) return;
        slot.setFile(item.file, item.localFile);
        slot.setState('filled');
      } else if (slot.state === 'filled') {
        slot.clearFile();
        slot.setState('empty');
      }
    });
  }

  reorderSlots (fromIndex, toIndex) {
    // Snapshot filled items WITH localFile (for blob preview preservation)
    const items = this.#slots
      .filter(s => s.state === 'filled')
      .map(s => ({ file: s.file, localFile: s.localFile }));

    const filledCount = items.length;
    const sourceIdx = Math.min(fromIndex, filledCount - 1);
    const targetIdx = Math.min(toIndex, filledCount - 1);

    if (sourceIdx === targetIdx || sourceIdx < 0) return;

    const [moved] = items.splice(sourceIdx, 1);
    items.splice(targetIdx, 0, moved);

    this.#slots.forEach((slot, i) => {
      const item = items[i];
      if (item) {
        slot.setFile(item.file, item.localFile);  // localFile transferred → blob preview survives
        slot.setState('filled');
      } else if (slot.state === 'filled') {
        slot.clearFile();
        slot.setState('empty');
      }
    });

    this.#syncHiddenInputs();
    this.#config.onReorder?.(items.map(i => i.file.path));
  }

  // --- Hidden Input Sync ---

  #syncHiddenInputs () {
    if (this.#hiddenInputContainer) {
      this.#hiddenInputContainer.remove();
    }

    this.#hiddenInputContainer = document.createElement('div');
    this.#hiddenInputContainer.style.display = 'none';
    this.#hiddenInputContainer.dataset.tepsiHidden = '';

    const filledSlots = this.#slots.filter(s => s.state === 'filled');
    const namePrefix = this.#config.hiddenInputName;

    filledSlots.forEach((slot, idx) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = `${namePrefix}[${idx}][path]`;
      input.value = slot.file.path;
      this.#hiddenInputContainer.appendChild(input);
    });

    this.#container.appendChild(this.#hiddenInputContainer);
  }

  // --- Message dispatch (hibrit snackbar) ---

  #showMessage (message) {
    if (this.#config.onMessage) {
      this.#config.onMessage(message);

      return;
    }
    this.#snackbar?.show(message);
  }

  // --- Public API ---

  getFiles () {
    return this.#slots.filter(s => s.state === 'filled').map(s => s.file);
  }

  clearAll () {
    this.#slots.forEach(s => {
      if (s.state === 'filled') {
        s.clearFile();
        s.setState('empty');
      }
    });
    this.#syncHiddenInputs();
  }

  destroy () {
    this.#dragDrop?.detach();
    this.#snackbar?.clear();
    this.#queue.clear();
    this.#ajax.abortAll();
    this.#slots.forEach(s => s.destroy());
    this.#slots = [];

    if (this.#clickHandler) {
      this.#container.removeEventListener('click', this.#clickHandler);
    }
    this.#hiddenInputContainer?.remove();
    this.#fileInput?.remove();
    this.#container.classList.remove('tepsi');
    delete this.#container.__tepsi;
  }

  // --- Accessors (for DragDrop module) ---

  get container () { return this.#container; }
  get slots () { return this.#slots; }

  // --- Static API ---

  static getInstance (element) {
    return element?.__tepsi ?? element?.closest('.tepsi')?.__tepsi;
  }

  static help () {
    const lines = helpData.map(({ text, style }) => [`%c${text}\n`, style]);
    const messages = lines.map(([text]) => text);
    const styles = lines.flatMap(([_, style]) => style || '');

    console.info(messages.join(''), ...styles);
  }
}

export default Tepsi;
