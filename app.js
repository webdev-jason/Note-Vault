// Data model and persistence
const STORAGE_KEY = "notevault.v1.notes";

/** @typedef {{ id:string, partId:string, createdAt:number, updatedAt:number, pages:Array<{ body:string, images:Array<{ id:string, dataUrl:string, caption:string, originalDataUrl?:string }> }> }} Note */

/** @type {Note[]} */
let notes = [];
let selectedNoteId = null;
let selectedPageIndex = 0;
let selectedImageId = null;

const els = {
  notesList: document.getElementById("notesList"),
  viewer: document.getElementById("viewer"),
  viewerTitle: document.getElementById("viewerTitle"),
  pageIndicator: document.getElementById("pageIndicator"),
  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  addNoteBtn: document.getElementById("addNoteBtn"),
  saveNoteBtn: document.getElementById("saveNoteBtn"),
  deleteNoteBtn: document.getElementById("deleteNoteBtn"),
  partIdInput: document.getElementById("partIdInput"),
  notesInput: document.getElementById("notesInput"),
  addImageBtn: document.getElementById("addImageBtn"),
  imageInput: document.getElementById("imageInput"),
  imagesContainer: document.getElementById("imagesContainer"),
  imageCaptionInput: document.getElementById("imageCaptionInput"),
  addPageBtn: document.getElementById("addPageBtn"),
  removePageBtn: document.getElementById("removePageBtn"),
  editPageIndicator: document.getElementById("editPageIndicator"),
  noteListItemTemplate: document.getElementById("noteListItemTemplate"),
  expandBtn: document.getElementById("expandBtn"),
  exportNotesBtn: document.getElementById("exportNotesBtn"),
  importNotesInput: document.getElementById("importNotesInput"),
  // Cropper
  cropperModal: document.getElementById("cropperModal"),
  cropperImage: document.getElementById("cropperImage"),
  cropperStage: document.querySelector(".cropper-stage"),
  cropBox: document.getElementById("cropBox"),
  cropperCloseBtn: document.getElementById("cropperCloseBtn"),
  cropperCancelBtn: document.getElementById("cropperCancelBtn"),
  cropperApplyBtn: document.getElementById("cropperApplyBtn"),
};

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function generateId(prefix) {
  return `${prefix}_${Math.random()
    .toString(36)
    .slice(2, 9)}_${Date.now().toString(36)}`;
}

function ensureSelection() {
  if (!selectedNoteId && notes.length > 0) {
    selectedNoteId = notes[0].id;
    selectedPageIndex = 0;
  }
  if (selectedNoteId) {
    const note = notes.find((n) => n.id === selectedNoteId);
    if (!note) {
      selectedNoteId = null;
      selectedPageIndex = 0;
    } else if (selectedPageIndex >= note.pages.length) {
      selectedPageIndex = 0;
    }
  }
}

// Rendering
function renderNotesList() {
  els.notesList.innerHTML = "";
  notes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((note) => {
      const clone = /** @type {HTMLButtonElement} */ (
        els.noteListItemTemplate.content.firstElementChild.cloneNode(true)
      );
      const thumb = clone.querySelector(".thumb");
      const title = clone.querySelector(".title");
      const subtitle = clone.querySelector(".subtitle");
      const firstImg = note.pages[0]?.images[0]?.dataUrl || "";
      if (firstImg && thumb) thumb.style.backgroundImage = `url(${firstImg})`;
      if (title) title.textContent = note.partId || "Untitled";
      if (subtitle) subtitle.textContent = `Pages: ${note.pages.length}`;
      if (note.id === selectedNoteId) clone.classList.add("active");
      clone.addEventListener("click", () => {
        selectedNoteId = note.id;
        selectedPageIndex = 0;
        selectedImageId = null;
        renderAll();
      });
      els.notesList.appendChild(clone);
    });
}

function renderViewer() {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) {
    els.viewerTitle.textContent = "—";
    els.pageIndicator.textContent = "Page 0";
    els.viewer.innerHTML =
      '<div class="muted">Select or create a note to view.</div>';
    return;
  }
  const page = note.pages[selectedPageIndex] || { body: "", images: [] };
  els.viewerTitle.textContent = note.partId || "Untitled";
  els.pageIndicator.textContent = `Page ${selectedPageIndex + 1} / ${
    note.pages.length
  }`;

  const frag = document.createDocumentFragment();
  const h = document.createElement("div");
  h.className = "note-title";
  h.textContent = note.partId;
  frag.appendChild(h);

  const body = document.createElement("div");
  body.className = "note-body";
  body.textContent = page.body || "";
  frag.appendChild(body);

  const imagesWrap = document.createElement("div");
  imagesWrap.className = "images";
  page.images.forEach((img) => {
    const card = document.createElement("div");
    card.className = "image-card";
    const frame = document.createElement("div");
    frame.className = "image-frame";
    const image = document.createElement("img");
    image.src = img.dataUrl;
    frame.appendChild(image);
    card.appendChild(frame);
    const captionText = (img.caption || "").trim();
    if (captionText.length > 0) {
      const cap = document.createElement("div");
      cap.className = "caption";
      cap.textContent = captionText;
      card.appendChild(cap);
    }
    imagesWrap.appendChild(card);
  });
  frag.appendChild(imagesWrap);

  els.viewer.innerHTML = "";
  els.viewer.appendChild(frag);

  els.prevPageBtn.disabled = selectedPageIndex <= 0;
  els.nextPageBtn.disabled = selectedPageIndex >= note.pages.length - 1;
}

function renderEditor() {
  const note = notes.find((n) => n.id === selectedNoteId);
  const isNew = !note;
  els.saveNoteBtn.disabled = isNew;
  els.deleteNoteBtn.disabled = isNew;
  if (isNew) {
    els.partIdInput.value = "";
    els.notesInput.value = "";
    els.imagesContainer.innerHTML = "";
    els.editPageIndicator.textContent = "Page 0";
    return;
  }
  const page = note.pages[selectedPageIndex];
  els.partIdInput.value = note.partId;
  els.notesInput.value = page.body;
  els.editPageIndicator.textContent = `Page ${selectedPageIndex + 1} / ${
    note.pages.length
  }`;

  els.imagesContainer.innerHTML = "";
  page.images.forEach((img) => {
    const card = document.createElement("div");
    card.className = "img-card";
    if (img.id === selectedImageId) card.classList.add("active");
    const image = document.createElement("img");
    image.src = img.dataUrl;
    const caption = document.createElement("div");
    caption.className = "caption";
    caption.textContent = img.caption || "";
    const actions = document.createElement("div");
    actions.className = "img-actions";
    const cropBtn = document.createElement("button");
    cropBtn.textContent = "Crop";
    cropBtn.type = "button";
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "danger";
    delBtn.type = "button";
    actions.appendChild(cropBtn);
    actions.appendChild(delBtn);
    card.appendChild(image);
    card.appendChild(actions);
    card.appendChild(caption);

    card.addEventListener("click", () => {
      selectedImageId = img.id;
      els.imageCaptionInput.value = img.caption || "";
      renderEditor();
    });
    cropBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCropper(img);
    });
    delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeImage(img.id);
    });
    els.imagesContainer.appendChild(card);
  });

  const selectedImg = page.images.find((i) => i.id === selectedImageId);
  els.imageCaptionInput.value = selectedImg ? selectedImg.caption || "" : "";
}

function renderAll() {
  ensureSelection();
  renderNotesList();
  renderViewer();
  renderEditor();
}

// Mutations
function createNote() {
  const newNote = {
    id: generateId("note"),
    partId: "Untitled",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: [{ body: "", images: [] }],
  };
  notes.unshift(newNote);
  selectedNoteId = newNote.id;
  selectedPageIndex = 0;
  selectedImageId = null;
  saveNotes();
  renderAll();
}

function saveCurrentNote() {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  note.partId = els.partIdInput.value.trim() || "Untitled";
  note.pages[selectedPageIndex].body = els.notesInput.value;
  note.updatedAt = Date.now();
  saveNotes();
  renderAll();
}

function deleteCurrentNote() {
  if (!selectedNoteId) return;
  const idx = notes.findIndex((n) => n.id === selectedNoteId);
  if (idx >= 0) notes.splice(idx, 1);
  selectedNoteId = null;
  selectedPageIndex = 0;
  selectedImageId = null;
  saveNotes();
  renderAll();
}

function addPage() {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  note.pages.splice(selectedPageIndex + 1, 0, { body: "", images: [] });
  selectedPageIndex += 1;
  note.updatedAt = Date.now();
  saveNotes();
  renderAll();
}

function removePage() {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  if (note.pages.length <= 1) return;
  note.pages.splice(selectedPageIndex, 1);
  selectedPageIndex = Math.max(0, selectedPageIndex - 1);
  selectedImageId = null;
  note.updatedAt = Date.now();
  saveNotes();
  renderAll();
}

function addImagesFromFiles(fileList) {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  const page = note.pages[selectedPageIndex];
  const files = Array.from(fileList || []);
  if (files.length === 0) return;
  
  // Validate file sizes (warn if very large, but still allow)
  const maxSize = 50 * 1024 * 1024; // 50MB per file
  const oversized = files.filter(f => f.size > maxSize);
  if (oversized.length > 0) {
    if (!confirm(`${oversized.length} file(s) are larger than 50MB. Large images may cause performance issues. Continue anyway?`)) {
      els.imageInput.value = "";
      return;
    }
  }
  
  let pending = files.length;
  let hasError = false;
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = String(reader.result);
        const compressed = await compressDataUrl(data, { maxWidth: 3000, maxHeight: 3000, quality: 0.88 });
        page.images.push({
          id: generateId("img"),
          dataUrl: compressed,
          originalDataUrl: compressed,
          caption: "",
        });
        if (--pending === 0 && !hasError) {
          note.updatedAt = Date.now();
          try {
            saveNotes();
            renderAll();
          } catch (err) {
            console.error("Error saving notes (possibly localStorage quota exceeded):", err);
            alert("Error saving notes. Trying a smaller optimized version...");
            const startIdx = Math.max(0, page.images.length - files.length);
            for (let i = startIdx; i < page.images.length; i++) {
              const img = page.images[i];
              const smaller = await compressDataUrl(img.dataUrl, { maxWidth: 1800, maxHeight: 1800, quality: 0.8 });
              img.dataUrl = smaller;
              img.originalDataUrl = smaller;
            }
            try {
              saveNotes();
              renderAll();
            } catch (err2) {
              console.error("Save still failed after recompressing:", err2);
              alert("Still too large to save in browser storage. Consider smaller images.");
              page.images.splice(page.images.length - files.length);
              renderAll();
            }
          }
        }
      } catch (err) {
        console.error("Error processing image:", err);
        hasError = true;
        if (--pending === 0) {
          alert("Error adding one or more images. Some images may be too large.");
          renderAll();
        }
      }
    };
    reader.onerror = () => {
      console.error("Error reading file:", file.name);
      hasError = true;
      if (--pending === 0) {
        alert("Error reading one or more files. Please try again.");
        renderAll();
      }
    };
    reader.readAsDataURL(file);
  });
  // Reset file input so the same file can be selected again
  els.imageInput.value = "";
}

// Utilities to compress image data URLs to reduce localStorage usage
function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function compressDataUrl(dataUrl, opts) {
  const { maxWidth = 3000, maxHeight = 3000, quality = 0.88, type = 'image/jpeg' } = opts || {};
  try {
    const img = await loadImageFromDataUrl(dataUrl);
    const scale = Math.min(1, Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight));
    const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetH = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL(type, quality);
  } catch (e) {
    console.warn('compressDataUrl fallback to original due to error', e);
    return dataUrl;
  }
}

function updateSelectedImageCaption(value) {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  const page = note.pages[selectedPageIndex];
  const img = page.images.find((i) => i.id === selectedImageId);
  if (!img) return;
  img.caption = value;
  note.updatedAt = Date.now();
  saveNotes();
  renderEditor();
  renderViewer();
}

function removeImage(imageId) {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  const page = note.pages[selectedPageIndex];
  const idx = page.images.findIndex((i) => i.id === imageId);
  if (idx >= 0) page.images.splice(idx, 1);
  if (selectedImageId === imageId) selectedImageId = null;
  note.updatedAt = Date.now();
  saveNotes();
  renderAll();
}

// Pagination controls
els.prevPageBtn.addEventListener("click", () => {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  selectedPageIndex = Math.max(0, selectedPageIndex - 1);
  selectedImageId = null;
  renderAll();
});
els.nextPageBtn.addEventListener("click", () => {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  selectedPageIndex = Math.min(note.pages.length - 1, selectedPageIndex + 1);
  selectedImageId = null;
  renderAll();
});

// Note actions
els.addNoteBtn.addEventListener("click", createNote);
els.saveNoteBtn.addEventListener("click", saveCurrentNote);
els.deleteNoteBtn.addEventListener("click", deleteCurrentNote);

// Page actions
els.addPageBtn.addEventListener("click", addPage);
els.removePageBtn.addEventListener("click", removePage);

// Image upload
els.addImageBtn.addEventListener("click", () => els.imageInput.click());
els.imageInput.addEventListener("change", (e) =>
  addImagesFromFiles(e.target.files)
);

// Caption input
els.imageCaptionInput.addEventListener("input", (e) =>
  updateSelectedImageCaption(e.target.value)
);

// Export/Import
els.exportNotesBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(notes, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "notevault-export.json";
  a.click();
  URL.revokeObjectURL(url);
});
els.importNotesInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result));
      if (Array.isArray(imported)) {
        notes = imported;
        selectedNoteId = notes[0]?.id || null;
        selectedPageIndex = 0;
        selectedImageId = null;
        saveNotes();
        renderAll();
      }
    } catch {}
  };
  reader.readAsText(file);
});

// Expand (toggle full screen center)
els.expandBtn.addEventListener("click", () => {
  const center = document.querySelector(".panel-center");
  center.classList.toggle("expanded");
});

// Simple cropper implementation (1:1)
let cropperState = {
  imageId: null,
  naturalWidth: 0,
  naturalHeight: 0,
  imgRect: null,
  crop: { x: 0, y: 0, size: 100 },
  zoom: 1,
};

function openCropper(imgObj) {
  if (!imgObj.originalDataUrl) {
    imgObj.originalDataUrl = imgObj.dataUrl;
    saveNotes();
  }
  els.cropperImage.src = imgObj.originalDataUrl || imgObj.dataUrl;
  cropperState.imageId = imgObj.id;
  els.cropperModal.setAttribute("aria-hidden", "false");
  selectedImageId = imgObj.id;
  setZoom(1);
  // Wait for image to layout
  requestAnimationFrame(() => {
    const rect = getDisplayedImageRect();
    cropperState.imgRect = rect;
    cropperState.naturalWidth = els.cropperImage.naturalWidth;
    cropperState.naturalHeight = els.cropperImage.naturalHeight;
    const size = Math.min(rect.width, rect.height) * 0.6;
    const x = rect.left + (rect.width - size) / 2;
    const y = rect.top + (rect.height - size) / 2;
    positionCropBox(x, y, size);
    syncCropControls();
  });
}

function closeCropper() {
  els.cropperModal.setAttribute("aria-hidden", "true");
}

function positionCropBox(viewX, viewY, viewSize) {
  const container = els.cropperStage.getBoundingClientRect();
  const imageRect = getDisplayedImageRect();
  const cb = els.cropBox;
  const maxSize = Math.min(imageRect.width, imageRect.height);
  const size = Math.max(20, Math.min(viewSize, maxSize));
  const minLeft = imageRect.left;
  const minTop = imageRect.top;
  const maxLeft = imageRect.right - size;
  const maxTop = imageRect.bottom - size;
  const x = Math.max(minLeft, Math.min(viewX, maxLeft));
  const y = Math.max(minTop, Math.min(viewY, maxTop));
  cb.style.left = `${x - container.left}px`;
  cb.style.top = `${y - container.top}px`;
  cb.style.width = `${size}px`;
  cb.style.height = `${size}px`;
  cropperState.crop = { x, y, size };
  syncCropControls();
}

// Drag/resize crop box (resize via wheel; drag via pointer)
let dragging = false;
let dragOffset = { x: 0, y: 0 };
els.cropBox.addEventListener("pointerdown", (e) => {
  dragging = true;
  const rect = els.cropBox.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  els.cropBox.setPointerCapture(e.pointerId);
});
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const stage = els.cropperImage.getBoundingClientRect();
  const size = els.cropBox.getBoundingClientRect().width;
  positionCropBox(e.clientX - dragOffset.x, e.clientY - dragOffset.y, size);
});
window.addEventListener("pointerup", (e) => {
  dragging = false;
});
els.cropBox.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    const rect = els.cropBox.getBoundingClientRect();
    const newSize = rect.width * (1 - 0.08 * delta);
    positionCropBox(rect.left, rect.top, newSize);
  },
  { passive: false }
);

// Click image to center crop box at cursor
els.cropperImage.addEventListener("click", (e) => {
  const stage = getDisplayedImageRect();
  const cbRect = els.cropBox.getBoundingClientRect();
  const size = cbRect.width;
  const targetX = e.clientX - size / 2;
  const targetY = e.clientY - size / 2;
  positionCropBox(targetX, targetY, size);
});

// Keyboard nudge when crop box focused
els.cropBox.addEventListener("keydown", (e) => {
  const rect = els.cropBox.getBoundingClientRect();
  const step = e.shiftKey ? 10 : 2;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    positionCropBox(rect.left - step, rect.top, rect.width);
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    positionCropBox(rect.left + step, rect.top, rect.width);
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    positionCropBox(rect.left, rect.top - step, rect.width);
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    positionCropBox(rect.left, rect.top + step, rect.width);
  }
  if (e.key === "-" || e.key === "_") {
    e.preventDefault();
    positionCropBox(rect.left, rect.top, rect.width * 0.92);
  }
  if (e.key === "=" || e.key === "+") {
    e.preventDefault();
    positionCropBox(rect.left, rect.top, rect.width * 1.08);
  }
});

// Footer controls
const cropMinusBtn = document.getElementById("cropMinusBtn");
const cropPlusBtn = document.getElementById("cropPlusBtn");
const cropCenterBtn = document.getElementById("cropCenterBtn");
const cropSizeRange = document.getElementById("cropSizeRange");

function syncCropControls() {
  const stage = getDisplayedImageRect();
  const minSize = Math.max(
    40,
    Math.min(80, Math.min(stage.width, stage.height) * 0.08)
  );
  const maxSize = Math.min(stage.width, stage.height);
  cropSizeRange.min = String(Math.floor(minSize));
  cropSizeRange.max = String(Math.floor(maxSize));
  cropSizeRange.value = String(
    Math.floor(els.cropBox.getBoundingClientRect().width)
  );
}

cropMinusBtn?.addEventListener("click", () => {
  const rect = els.cropBox.getBoundingClientRect();
  positionCropBox(rect.left, rect.top, rect.width * 0.92);
});
cropPlusBtn?.addEventListener("click", () => {
  const rect = els.cropBox.getBoundingClientRect();
  positionCropBox(rect.left, rect.top, rect.width * 1.08);
});
cropCenterBtn?.addEventListener("click", () => {
  const stage = getDisplayedImageRect();
  const size = els.cropBox.getBoundingClientRect().width;
  const x = stage.left + (stage.width - size) / 2;
  const y = stage.top + (stage.height - size) / 2;
  positionCropBox(x, y, size);
});
cropSizeRange?.addEventListener("input", (e) => {
  const rect = els.cropBox.getBoundingClientRect();
  const size = Number(e.target.value) || rect.width;
  positionCropBox(rect.left, rect.top, size);
});

// Zoom controls (internal, no UI)
function setZoom(z) {
  const zoom = Math.max(0.25, Math.min(z, 3));
  cropperState.zoom = zoom;
  els.cropperImage.style.setProperty('--crop-zoom', String(zoom));
  // After zooming, re-clamp crop box to image bounds
  const rect = els.cropBox.getBoundingClientRect();
  positionCropBox(rect.left, rect.top, rect.width);
}

// Add corner handles to the crop box (once)
if (!els.cropBox.querySelector('.handle')) {
  ['nw','ne','sw','se'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `handle ${dir}`;
    h.dataset.corner = dir;
    els.cropBox.appendChild(h);
  });
}

let resizing = false;
let resizeAnchor = { x: 0, y: 0 };
let resizeCorner = 'se';

function beginResize(e, corner) {
  e.preventDefault();
  e.stopPropagation();
  resizing = true;
  resizeCorner = corner;
  const rect = els.cropBox.getBoundingClientRect();
  // Anchor is the opposite corner
  if (corner === 'nw') resizeAnchor = { x: rect.right, y: rect.bottom };
  if (corner === 'ne') resizeAnchor = { x: rect.left, y: rect.bottom };
  if (corner === 'sw') resizeAnchor = { x: rect.right, y: rect.top };
  if (corner === 'se') resizeAnchor = { x: rect.left, y: rect.top };
}

els.cropBox.addEventListener('pointerdown', (e) => {
  const t = e.target;
  if (t && t.classList && t.classList.contains('handle')) {
    beginResize(e, t.dataset.corner);
    els.cropBox.setPointerCapture(e.pointerId);
  }
});

window.addEventListener('pointermove', (e) => {
  if (!resizing) return;
  const imgRect = els.cropperImage.getBoundingClientRect();
  const cx = Math.max(imgRect.left, Math.min(e.clientX, imgRect.right));
  const cy = Math.max(imgRect.top, Math.min(e.clientY, imgRect.bottom));
  const size = Math.max(20, Math.min(
    Math.min(imgRect.width, imgRect.height),
    Math.max(Math.abs(cx - resizeAnchor.x), Math.abs(cy - resizeAnchor.y))
  ));
  let x = resizeAnchor.x;
  let y = resizeAnchor.y;
  if (resizeCorner === 'nw') { x = resizeAnchor.x - size; y = resizeAnchor.y - size; }
  if (resizeCorner === 'ne') { x = resizeAnchor.x;       y = resizeAnchor.y - size; }
  if (resizeCorner === 'sw') { x = resizeAnchor.x - size; y = resizeAnchor.y; }
  if (resizeCorner === 'se') { x = resizeAnchor.x;       y = resizeAnchor.y; }
  positionCropBox(x, y, size);
});

window.addEventListener('pointerup', () => { resizing = false; });

// Compute the displayed image rectangle inside the stage, respecting aspect ratio and zoom
function getDisplayedImageRect() {
  const stage = els.cropperStage.getBoundingClientRect();
  const natW = cropperState.naturalWidth || 1;
  const natH = cropperState.naturalHeight || 1;
  const fit = Math.min(stage.width / natW, stage.height / natH) * cropperState.zoom;
  const w = natW * fit;
  const h = natH * fit;
  const left = stage.left + (stage.width - w) / 2;
  const top = stage.top + (stage.height - h) / 2;
  return { left, top, width: w, height: h, right: left + w, bottom: top + h };
}

els.cropperApplyBtn.addEventListener("click", () => {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  const page = note.pages[selectedPageIndex];
  const img = page.images.find((i) => i.id === cropperState.imageId);
  if (!img) return;

  const stage = getDisplayedImageRect();
  const { x, y, size } = cropperState.crop;
  const relX = (x - stage.left) / stage.width;
  const relY = (y - stage.top) / stage.height;
  const relSize = size / stage.width; // assume square pixels and fit within width reference

  const sx = Math.max(
    0,
    Math.min(cropperState.naturalWidth - 1, relX * cropperState.naturalWidth)
  );
  const sy = Math.max(
    0,
    Math.min(cropperState.naturalHeight - 1, relY * cropperState.naturalHeight)
  );
  const sSize = Math.min(
    cropperState.naturalWidth,
    cropperState.naturalHeight,
    relSize * cropperState.naturalWidth
  );

  const canvas = document.createElement("canvas");
  canvas.width = 1024; // export size
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(els.cropperImage, sx, sy, sSize, sSize, 0, 0, 1024, 1024);
  img.dataUrl = canvas.toDataURL("image/jpeg", 0.92);

  note.updatedAt = Date.now();
  saveNotes();
  closeCropper();
  renderAll();
});
els.cropperCloseBtn.addEventListener("click", closeCropper);
els.cropperCancelBtn.addEventListener("click", closeCropper);

// Keyboard helpers
window.addEventListener("keydown", (e) => {
  if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveCurrentNote();
  }
});

// Bootstrap
notes = loadNotes();
if (notes.length === 0) {
  // Seed with example note per Notevault.md description
  notes.push({
    id: generateId("note"),
    partId: "KNX0400",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: [
      {
        body: '100% visual look for cable flexibility. AQL steps...\nIP columns D, E, F: Keyence 7020 program "KNX0400 High Precision Cable Side". Then, Keyence 7020, then M14 threads...',
        images: [],
      },
    ],
  });
}
selectedNoteId = notes[0]?.id || null;
selectedPageIndex = 0;
renderAll();
