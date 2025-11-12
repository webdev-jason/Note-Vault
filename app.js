// --- NEW DB HELPER (Vanilla IndexedDB) ---
const DB_NAME = 'NoteVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes_store';
const KEY = 'all_notes'; // We will store the entire notes array as one object
const LEGACY_STORAGE_KEY = "notevault.v1.notes"; // For migration

const db = {
  _db: null,

  open() {
    return new Promise((resolve, reject) => {
      if (this._db) return resolve(this._db);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (e) => {
        console.error('Error opening IndexedDB', e);
        reject(new Error('Could not open database.'));
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
    });
  },

  async get() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY);

      request.onerror = (e) => reject(new Error('Could not get notes.'));
      request.onsuccess = (e) => {
        resolve(e.target.result); // Returns undefined if not found
      };
    });
  },

  async set(data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, KEY);

      request.onerror = (e) => reject(new Error('Could not save notes.'));
      request.onsuccess = (e) => resolve(e.target.result);
    });
  }
};
// --- END DB HELPER ---


/** @typedef {{ id:string, partId:string, createdAt:number, updatedAt:number, body:string, images:Array<{ id:string, dataUrl:string, caption:string, originalDataUrl?:string }> }} Note */

/** @type {Note[]} */
let notes = [];
let selectedNoteId = null;
let selectedImageId = null;
let imageViewerZoom = 1;

const els = {
  notesList: document.getElementById("notesList"),
  searchInput: document.getElementById("searchInput"),
  appMain: document.querySelector(".app-main"),
  viewer: document.getElementById("viewer"),
  viewerTitle: document.getElementById("viewerTitle"),
  addNoteBtn: document.getElementById("addNoteBtn"),
  saveNoteBtn: document.getElementById("saveNoteBtn"),
  deleteNoteBtn: document.getElementById("deleteNoteBtn"),
  partIdInput: document.getElementById("partIdInput"),
  notesInput: document.getElementById("notesInput"),
  addImageBtn: document.getElementById("addImageBtn"),
  imageInput: document.getElementById("imageInput"),
  imagesContainer: document.getElementById("imagesContainer"),
  imageCaptionInput: document.getElementById("imageCaptionInput"),
  noteListItemTemplate: document.getElementById("noteListItemTemplate"),
  expandBtn: document.getElementById("expandBtn"),
  printBtn: document.getElementById("printBtn"), // NEW
  // Cropper
  cropperModal: document.getElementById("cropperModal"),
  cropperImage: document.getElementById("cropperImage"),
  cropperStage: document.querySelector(".cropper-stage"),
  cropBox: document.getElementById("cropBox"),
  cropperCloseBtn: document.getElementById("cropperCloseBtn"),
  cropperCancelBtn: document.getElementById("cropperCancelBtn"),
  cropperApplyBtn: document.getElementById("cropperApplyBtn"),
  // Image Viewer
  imageViewerModal: document.getElementById("imageViewerModal"),
  modalViewerImage: document.getElementById("modalViewerImage"),
  modalViewerCloseBtn: document.getElementById("modalViewerCloseBtn"),
};

async function loadNotes() {
  let parsed = [];
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      // Data found in old localStorage, start migration
      console.log("Old localStorage data found. Attempting migration...");
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];

      // --- MIGRATION LOGIC to flatten 'pages' ---
      const migrated = parsed.map(note => {
        if (note.pages) {
          console.log("Migrating old note:", note.partId);
          const newNote = { ...note };
          newNote.body = note.pages.map(p => p.body).join('\n\n');
          newNote.images = note.pages.flatMap(p => p.images);
          delete newNote.pages;
          return newNote;
        }
        return note;
      });
      
      console.log("Migration complete. Saving to IndexedDB.");
      await db.set(migrated); // Save migrated data to new DB
      localStorage.removeItem(LEGACY_STORAGE_KEY); // Clean up old data
      return migrated;
    }
  } catch (e) {
    console.error("Error migrating from localStorage:", e);
  }

  // No localStorage data, try to load from IndexedDB
  const notesFromDB = await db.get();
  return Array.isArray(notesFromDB) ? notesFromDB : [];
}


async function saveNotes() {
  try {
    await db.set(notes);
  } catch (e) {
    console.error("Fatal error saving to IndexedDB:", e);
    alert("FATAL ERROR: Could not save notes to database. " + e.message);
  }
}

function generateId(prefix) {
  return `${prefix}_${Math.random()
    .toString(36)
    .slice(2, 9)}_${Date.now().toString(36)}`;
}

function ensureSelection() {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) {
    const filterText = els.searchInput.value.toLowerCase().trim();
    const filteredNotes = notes.filter(n => {
      if (filterText === "") return true;
      return n.partId.toLowerCase().includes(filterText);
    });
    selectedNoteId = (filteredNotes.length > 0) ? filteredNotes[0].id : null;
  }
}

/**
 * Creates the DOM fragment for a note's content (body + images)
 * @param {Note} note
 * @returns {DocumentFragment}
 */
function createNoteContentView(note) {
  const frag = document.createDocumentFragment();

  // *** NEW: Add the Part ID for printing ***
  const partId = document.createElement("div");
  partId.className = "print-part-id"; // We will style this in CSS
  partId.textContent = note.partId || "Untitled";
  frag.appendChild(partId);

  const body = document.createElement("div");
  body.className = "note-body";
  body.textContent = note.body || "";
  frag.appendChild(body);

  const imagesWrap = document.createElement("div");
  imagesWrap.className = "images";
  note.images.forEach((img) => {
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

    card.addEventListener("click", () => {
      els.modalViewerImage.src = img.dataUrl;
      els.imageViewerModal.setAttribute("aria-hidden", "false");
    });
  });
  frag.appendChild(imagesWrap);
  return frag;
}

// Rendering
function renderNotesList() {
  const filterText = els.searchInput.value.toLowerCase().trim();

  els.notesList.innerHTML = "";
  notes
    .filter(note => {
      if (filterText === "") return true;
      return note.partId.toLowerCase().includes(filterText);
    })
    .forEach((note) => {
      const clone = /** @type {HTMLButtonElement} */ (
        els.noteListItemTemplate.content.firstElementChild.cloneNode(true)
      );
      const thumb = clone.querySelector(".thumb");
      
      const content = createNoteContentView(note);
      const scaleWrapper = document.createElement('div');
      scaleWrapper.className = 'thumb-scale-wrap';
      scaleWrapper.appendChild(content);
      
      thumb.innerHTML = "";
      thumb.appendChild(scaleWrapper);

      const title = clone.querySelector(".title");
      
      if (note.id === selectedNoteId) clone.classList.add("active");
      
      els.notesList.appendChild(clone);

      if (title) {
        title.textContent = note.partId || "Untitled";
        
        requestAnimationFrame(() => {
          title.style.fontSize = '14px';
          let fontSize = 14;
          const containerWidth = title.clientWidth;
          let textWidth = title.scrollWidth;

          while (textWidth > containerWidth && fontSize > 8) {
            fontSize--;
            title.style.fontSize = `${fontSize}px`;
            textWidth = title.scrollWidth;
          }
        });
      }

      clone.addEventListener("click", () => {
        selectedNoteId = note.id;
        selectedImageId = null;
        renderAll();
      });
    });
}

function renderViewer() {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) {
    els.viewerTitle.textContent = "—";
    els.viewer.innerHTML =
      '<div class="muted">Select or create a note to view.</div>';
    return;
  }
  
  els.viewerTitle.textContent = note.partId || "Untitled";

  const content = createNoteContentView(note);
  els.viewer.innerHTML = "";
  els.viewer.appendChild(content);
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
    return;
  }
  
  els.partIdInput.value = note.partId;
  els.notesInput.value = note.body;

  els.imagesContainer.innerHTML = "";
  note.images.forEach((img) => {
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

  const selectedImg = note.images.find((i) => i.id === selectedImageId);
  els.imageCaptionInput.value = selectedImg ? selectedImg.caption || "" : "";
}

function renderAll() {
  notes.sort((a, b) => a.partId.localeCompare(b.partId));
  ensureSelection();
  renderNotesList();
  renderViewer();
  renderEditor();
}

// Mutations (NOW ASYNC)
async function createNote() {
  const newNote = {
    id: generateId("note"),
    partId: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    body: "",
    images: [],
  };
  notes.unshift(newNote);
  selectedNoteId = newNote.id;
  selectedImageId = null;
  await saveNotes();
  renderAll();
}

async function saveCurrentNote() {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  note.partId = els.partIdInput.value.trim() || "Untitled";
  note.body = els.notesInput.value;
  note.updatedAt = Date.now();
  await saveNotes();
  renderAll();
}

async function deleteCurrentNote() {
  if (!selectedNoteId) return;
  const idx = notes.findIndex((n) => n.id === selectedNoteId);
  if (idx >= 0) notes.splice(idx, 1);
  selectedNoteId = null;
  selectedImageId = null;
  await saveNotes();
  renderAll();
}

async function addImagesFromFiles(fileList) {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  const files = Array.from(fileList || []);
  if (files.length === 0) return;
  
  const maxSize = 50 * 1024 * 1024;
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
        note.images.push({
          id: generateId("img"),
          dataUrl: compressed,
          originalDataUrl: compressed,
          caption: "",
        });
        if (--pending === 0 && !hasError) {
          note.updatedAt = Date.now();
          try {
            await saveNotes();
            renderAll();
          } catch (err) {
            console.error("Error saving notes (possibly quota exceeded):", err);
            alert("Error saving notes. Trying a smaller optimized version...");
            const startIdx = Math.max(0, note.images.length - files.length);
            for (let i = startIdx; i < note.images.length; i++) {
              const img = note.images[i];
              const smaller = await compressDataUrl(img.dataUrl, { maxWidth: 1800, maxHeight: 1800, quality: 0.8 });
              img.dataUrl = smaller;
              img.originalDataUrl = smaller;
            }
            try {
              await saveNotes();
              renderAll();
            } catch (err2) {
              console.error("Save still failed after recompressing:", err2);
              alert("Still too large to save in browser storage. Consider smaller images.");
              note.images.splice(note.images.length - files.length);
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
  els.imageInput.value = "";
}

// Utilities to compress image data URLs
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

async function updateSelectedImageCaption(value) {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  const img = note.images.find((i) => i.id === selectedImageId);
  if (!img) return;
  img.caption = value;
  note.updatedAt = Date.now();
  await saveNotes();
  renderEditor();
  renderViewer();
}

async function removeImage(imageId) {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  const idx = note.images.findIndex((i) => i.id === imageId);
  if (idx >= 0) note.images.splice(idx, 1);
  if (selectedImageId === imageId) selectedImageId = null;
  note.updatedAt = Date.now();
  await saveNotes();
  renderAll();
}

// Note actions (now async)
els.addNoteBtn.addEventListener("click", createNote);
els.saveNoteBtn.addEventListener("click", saveCurrentNote);
els.deleteNoteBtn.addEventListener("click", deleteCurrentNote);

// Image upload
els.addImageBtn.addEventListener("click", () => els.imageInput.click());
els.imageInput.addEventListener("change", (e) =>
  addImagesFromFiles(e.target.files)
);

// Caption input (now async)
els.imageCaptionInput.addEventListener("input", (e) =>
  updateSelectedImageCaption(e.target.value)
);

// Horizontal scroll for image editor
els.imagesContainer.addEventListener("wheel", (e) => {
  if (e.deltaY !== 0) {
    e.preventDefault();
    els.imagesContainer.scrollLeft += e.deltaY;
  }
}, { passive: false });

// Expand (toggle full screen center)
els.expandBtn.addEventListener("click", () => {
  const isExpanded = els.appMain.classList.toggle("view-expanded");
  if (isExpanded) {
    els.expandBtn.textContent = "Collapse Note";
  } else {
    els.expandBtn.textContent = "Expand Note";
  }
});

// Print (NEW)
els.printBtn.addEventListener("click", () => {
  const { ipcRenderer } = require('electron');
  // Send the partId to the main process for a better default filename
  const note = notes.find(n => n.id === selectedNoteId);
  const partId = note ? note.partId : 'Note';
  ipcRenderer.send('print-to-pdf', partId);
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

async function openCropper(imgObj) {
  if (!imgObj.originalDataUrl) {
    imgObj.originalDataUrl = imgObj.dataUrl;
    await saveNotes();
  }
  els.cropperImage.src = imgObj.originalDataUrl || imgObj.dataUrl;
  cropperState.imageId = imgObj.id;
  els.cropperModal.setAttribute("aria-hidden", "false");
  selectedImageId = imgObj.id;
  setZoom(1);
  
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

// Drag/resize crop box
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

els.cropperImage.addEventListener("click", (e) => {
  const stage = getDisplayedImageRect();
  const cbRect = els.cropBox.getBoundingClientRect();
  const size = cbRect.width;
  const targetX = e.clientX - size / 2;
  const targetY = e.clientY - size / 2;
  positionCropBox(targetX, targetY, size);
});

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

function setZoom(z) {
  const zoom = Math.max(0.25, Math.min(z, 3));
  cropperState.zoom = zoom;
  els.cropperImage.style.setProperty('--crop-zoom', String(zoom));
  const rect = els.cropBox.getBoundingClientRect();
  positionCropBox(rect.left, rect.top, rect.width);
}

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

els.cropperApplyBtn.addEventListener("click", async () => {
  const note = notes.find((n) => n.id === selectedNoteId);
  if (!note) return;
  const img = note.images.find((i) => i.id === cropperState.imageId);
  if (!img) return;

  const stage = getDisplayedImageRect();
  const { x, y, size } = cropperState.crop;
  const relX = (x - stage.left) / stage.width;
  const relY = (y - stage.top) / stage.height;
  const relSize = size / stage.width; 

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
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(els.cropperImage, sx, sy, sSize, sSize, 0, 0, 1024, 1024);
  img.dataUrl = canvas.toDataURL("image/jpeg", 0.92);

  note.updatedAt = Date.now();
  await saveNotes();
  closeCropper();
  renderAll();
});
els.cropperCloseBtn.addEventListener("click", closeCropper);
els.cropperCancelBtn.addEventListener("click", closeCropper);

// Image Viewer Listeners
function closeImageViewer() {
  els.imageViewerModal.setAttribute("aria-hidden", "true");
  els.modalViewerImage.src = ""; // Clear image
  // Reset zoom
  imageViewerZoom = 1;
  els.modalViewerImage.style.transform = 'scale(1)';
}
els.modalViewerCloseBtn.addEventListener("click", closeImageViewer);
els.imageViewerModal.addEventListener("click", (e) => {
  if (e.target === els.imageViewerModal) {
    closeImageViewer();
  }
});

// Zoom on wheel in image viewer
els.imageViewerModal.addEventListener("wheel", (e) => {
  e.preventDefault(); // Stop page from scrolling
  
  // Determine zoom direction
  const delta = e.deltaY > 0 ? -0.1 : 0.1; // - for wheel down, + for wheel up
  
  // Calculate new zoom level, clamped between 0.5x and 5x
  imageViewerZoom = Math.max(0.5, Math.min(imageViewerZoom + delta, 5));
  
  // Apply the zoom
  els.modalViewerImage.style.transform = `scale(${imageViewerZoom})`;
}, { passive: false });

// Search filter
els.searchInput.addEventListener("input", () => {
  renderAll(); // Re-render all to re-filter and re-select
});


// Keyboard helpers
window.addEventListener("keydown", (e) => {
  if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveCurrentNote();
  }
});

// Bootstrap (NOW ASYNC)
(async () => {
  notes = await loadNotes();
  renderAll();
})();