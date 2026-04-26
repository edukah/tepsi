/**
 * DragDrop — combined drag-drop handler.
 *
 * - **External file drop** (browser → page): HTML5 Drag & Drop API
 *   Mobile için irrelevant (mobil OS dosya sürüklemez), desktop'ta dosya bırakma için.
 *
 * - **Internal reorder** (slot ↔ slot): Pointer Events API
 *   Touch + mouse + pen ortak — mobile-friendly, native drag image yok.
 *
 * Optional module: disabled via `config.dragDrop: false`.
 */
class DragDrop {
  #tepsi;
  #container;
  #handlers = {};

  // Pointer drag state
  #pointer = null;

  constructor (tepsi) {
    this.#tepsi = tepsi;
    this.#container = tepsi.container;
    this.#attach();
  }

  // --- Lifecycle ---

  #attach () {
    // External file drop
    this.#handlers.dragover = (e) => this.#handleDragOver(e);
    this.#handlers.dragleave = (e) => this.#handleDragLeave(e);
    this.#handlers.drop = (e) => this.#handleDrop(e);
    this.#container.addEventListener('dragover', this.#handlers.dragover);
    this.#container.addEventListener('dragleave', this.#handlers.dragleave);
    this.#container.addEventListener('drop', this.#handlers.drop);

    // Internal reorder
    this.#handlers.pointerdown = (e) => this.#handlePointerDown(e);
    this.#container.addEventListener('pointerdown', this.#handlers.pointerdown);
  }

  detach () {
    this.#container.removeEventListener('dragover', this.#handlers.dragover);
    this.#container.removeEventListener('dragleave', this.#handlers.dragleave);
    this.#container.removeEventListener('drop', this.#handlers.drop);
    this.#container.removeEventListener('pointerdown', this.#handlers.pointerdown);

    this.#stopPointerTracking();
  }

  // --- External file drop ---

  #handleDragOver (e) {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();

    const slotEl = e.target.closest('.tepsi__slot');
    if (!slotEl || !this.#container.contains(slotEl)) return;

    const idx = parseInt(slotEl.dataset.index, 10);
    const slot = this.#tepsi.slots[idx];

    this.#clearDropTargets();

    // Highlight only empty slots for file drop
    if (slot?.state === 'empty') {
      slotEl.classList.add('is-drop-target');
    }
  }

  #handleDragLeave (e) {
    // dragleave child element'lere de fires — sadece container dışına çıkışta clear
    if (!this.#container.contains(e.relatedTarget)) {
      this.#clearDropTargets();
    }
  }

  #handleDrop (e) {
    if (!e.dataTransfer?.files?.length) return;

    e.preventDefault();
    this.#clearDropTargets();
    // handleFiles is async — catch to avoid unhandled promise rejection
    this.#tepsi.handleFiles(e.dataTransfer.files).catch(err => {
      console.error('[Tepsi|DragDrop] handleFiles failed:', err);
    });
  }

  #clearDropTargets () {
    this.#container.querySelectorAll('.is-drop-target').forEach(el => {
      el.classList.remove('is-drop-target');
    });
  }

  // --- Internal reorder (Pointer Events) ---

  #handlePointerDown (e) {
    // Sadece primary button / first touch
    if (e.button !== undefined && e.button !== 0) return;

    // Buttons (delete, loader) → drag başlatma
    if (e.target.closest('button')) return;

    const slotEl = e.target.closest('.tepsi__slot');
    if (!slotEl || !this.#container.contains(slotEl)) return;

    const idx = parseInt(slotEl.dataset.index, 10);
    const slot = this.#tepsi.slots[idx];

    // Sadece filled slot'lar drag edilebilir
    if (!slot || slot.state !== 'filled') return;

    this.#pointer = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      sourceEl: slotEl,
      sourceIndex: idx,
      targetIndex: null,
      dragging: false  // threshold sonrası true
    };

    this.#handlers.pointermove = (e2) => this.#handlePointerMove(e2);
    this.#handlers.pointerup = (e2) => this.#handlePointerUp(e2);

    document.addEventListener('pointermove', this.#handlers.pointermove);
    document.addEventListener('pointerup', this.#handlers.pointerup);
    document.addEventListener('pointercancel', this.#handlers.pointerup);
  }

  #handlePointerMove (e) {
    if (!this.#pointer || e.pointerId !== this.#pointer.pointerId) return;

    const dx = e.clientX - this.#pointer.startX;
    const dy = e.clientY - this.#pointer.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Threshold (6px) — accidental click vs intentional drag
    if (!this.#pointer.dragging && dist < 6) return;

    if (!this.#pointer.dragging) {
      this.#pointer.dragging = true;
      this.#pointer.sourceEl.classList.add('is-dragging');
      // Disable text selection during drag
      document.body.style.userSelect = 'none';
    }

    // Find current drop target
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const slotEl = targetEl?.closest('.tepsi__slot');

    this.#clearDropTargets();

    if (!slotEl || slotEl === this.#pointer.sourceEl || !this.#container.contains(slotEl)) {
      this.#pointer.targetIndex = null;

      return;
    }

    const targetIdx = parseInt(slotEl.dataset.index, 10);
    const targetSlot = this.#tepsi.slots[targetIdx];

    // Reorder target = filled slot (insertion among filled files)
    if (targetSlot?.state === 'filled') {
      slotEl.classList.add('is-drop-target');
      this.#pointer.targetIndex = targetIdx;
    } else {
      this.#pointer.targetIndex = null;
    }
  }

  #handlePointerUp (e) {
    if (!this.#pointer) return;

    const state = this.#pointer;
    this.#stopPointerTracking();

    state.sourceEl?.classList.remove('is-dragging');
    this.#clearDropTargets();
    document.body.style.userSelect = '';

    // Apply reorder if drag completed onto a valid target
    if (state.dragging && state.targetIndex !== null && state.targetIndex !== state.sourceIndex) {
      this.#tepsi.reorderSlots(state.sourceIndex, state.targetIndex);
    }
  }

  #stopPointerTracking () {
    if (this.#handlers.pointermove) {
      document.removeEventListener('pointermove', this.#handlers.pointermove);
      document.removeEventListener('pointerup', this.#handlers.pointerup);
      document.removeEventListener('pointercancel', this.#handlers.pointerup);
      delete this.#handlers.pointermove;
      delete this.#handlers.pointerup;
    }
    this.#pointer = null;
  }
}

export default DragDrop;
