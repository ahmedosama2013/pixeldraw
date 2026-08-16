document.addEventListener("DOMContentLoaded", () => {
  // --- App State ---
  let gridSize = 32;
  let activeTool = "pencil";
  let currentColor = "#059669";
  let isDrawing = false;
  let gridData = createGridData(gridSize);
  let pendingGridSize = 32;

  const presets = [
    "#059669", "#dc2626", "#2563eb", "#d97706",
    "#7c3aed", "#db2777", "#111827", "#ffffff"
  ];

  // --- DOM Elements ---
  const pixelCanvas = document.getElementById("pixel-canvas");
  const gridCanvas = document.getElementById("grid-canvas");
  const pixelCtx = pixelCanvas.getContext("2d");
  const gridCtx = gridCanvas.getContext("2d");
  const canvasWrapper = document.getElementById("canvas-wrapper");

  const colorInput = document.getElementById("primary-color");
  const paletteContainer = document.getElementById("color-palette");
  const toolBtns = document.querySelectorAll(".tool-btn");
  const clearBtn = document.getElementById("clear-btn");

  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  const exportPreview = document.getElementById("export-preview");
  const downloadBtn = document.getElementById("download-btn");

  // Custom Modals
  const clearModal = document.getElementById("clear-modal");
  const cancelClear = document.getElementById("cancel-clear");
  const confirmClear = document.getElementById("confirm-clear");

  const resizeModal = document.getElementById("resize-modal");
  const cancelResize = document.getElementById("cancel-resize");
  const confirmResize = document.getElementById("confirm-resize");

  // Custom Select Elements
  const gridSelectWrapper = document.getElementById("grid-select-wrapper");
  const gridSelectTrigger = document.getElementById("grid-select-trigger");
  const gridOptions = document.querySelectorAll("#grid-custom-options .custom-option");

  const formatSelectWrapper = document.getElementById("format-select-wrapper");
  const formatSelectTrigger = document.getElementById("format-select-trigger");
  const formatOptions = document.querySelectorAll("#format-custom-options .custom-option");

  const scaleSelectWrapper = document.getElementById("scale-select-wrapper");
  const scaleSelectTrigger = document.getElementById("scale-select-trigger");
  const scaleOptions = document.querySelectorAll("#scale-custom-options .custom-option");

  let selectedFormat = "png";
  let selectedScale = "8";

  // --- Initialize Application ---
  function init() {
    renderPalette();
    loadFromLocalStorage();
    setupCanvasResolution();
    renderPixelCanvas();
    renderGridOverlay();
    setupEventListeners();
  }

  function createGridData(size) {
    return Array.from({ length: size }, () => Array(size).fill(null));
  }

  function setupCanvasResolution() {
    const rect = canvasWrapper.getBoundingClientRect();
    const size = Math.floor(rect.width) || 400;
    pixelCanvas.width = size;
    pixelCanvas.height = size;
    gridCanvas.width = size;
    gridCanvas.height = size;
  }

  // --- Render Functions ---
  function renderPixelCanvas() {
    pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
    const cellSize = pixelCanvas.width / gridSize;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (gridData[y][x]) {
          pixelCtx.fillStyle = gridData[y][x];
          pixelCtx.fillRect(
            Math.floor(x * cellSize),
            Math.floor(y * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }
  }

  function renderGridOverlay() {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    gridCtx.strokeStyle = "rgba(0, 0, 0, 0.06)";
    gridCtx.lineWidth = 1;

    const cellSize = gridCanvas.width / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      const pos = Math.floor(i * cellSize);
      gridCtx.beginPath();
      gridCtx.moveTo(pos, 0);
      gridCtx.lineTo(pos, gridCanvas.height);
      gridCtx.stroke();

      gridCtx.beginPath();
      gridCtx.moveTo(0, pos);
      gridCtx.lineTo(gridCanvas.width, pos);
      gridCtx.stroke();
    }
  }

  function renderPalette() {
    paletteContainer.innerHTML = "";
    presets.forEach((color) => {
      const swatch = document.createElement("div");
      swatch.classList.add("swatch");
      if (color.toLowerCase() === currentColor.toLowerCase()) {
        swatch.classList.add("active");
      }
      swatch.style.backgroundColor = color;
      swatch.addEventListener("click", () => {
        currentColor = color;
        colorInput.value = color;
        updateSwatchActiveState();
      });
      paletteContainer.appendChild(swatch);
    });
  }

  function updateSwatchActiveState() {
    const swatches = paletteContainer.querySelectorAll(".swatch");
    swatches.forEach((s) => {
      s.classList.toggle("active", s.style.backgroundColor === hexToRgbStyle(currentColor));
    });
  }

  function hexToRgbStyle(hex) {
    const tempDiv = document.createElement("div");
    tempDiv.style.color = hex;
    return tempDiv.style.color;
  }

  // --- Interaction Logic ---
  function getGridCoordinates(event) {
    const rect = pixelCanvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const x = Math.floor(((clientX - rect.left) / rect.width) * gridSize);
    const y = Math.floor(((clientY - rect.top) / rect.height) * gridSize);

    return {
      x: Math.max(0, Math.min(gridSize - 1, x)),
      y: Math.max(0, Math.min(gridSize - 1, y)),
    };
  }

  function handleCellAction(x, y) {
    if (activeTool === "pencil") {
      gridData[y][x] = currentColor;
    } else if (activeTool === "eraser") {
      gridData[y][x] = null;
    } else if (activeTool === "bucket") {
      floodFill(x, y, gridData[y][x], currentColor);
    }

    renderPixelCanvas();
    saveToLocalStorage();
  }

  function floodFill(startX, startY, targetColor, replacementColor) {
    if (targetColor === replacementColor) return;
    if (activeTool === "bucket" && targetColor === null && replacementColor === null) return;

    const queue = [[startX, startY]];
    const visited = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

    while (queue.length > 0) {
      const [x, y] = queue.shift();

      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
      if (visited[y][x]) continue;

      visited[y][x] = true;

      if (gridData[y][x] === targetColor) {
        gridData[y][x] = replacementColor;

        queue.push([x + 1, y]);
        queue.push([x - 1, y]);
        queue.push([x, y + 1]);
        queue.push([x, y - 1]);
      }
    }
  }

  // --- Local Storage Management ---
  function saveToLocalStorage() {
    const payload = {
      gridSize,
      gridData,
    };
    localStorage.setItem("pixeldraw_studio_save", JSON.stringify(payload));
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem("pixeldraw_studio_save");
    if (saved) {
      try {
        const payload = JSON.parse(saved);
        if (payload.gridSize && payload.gridData) {
          gridSize = payload.gridSize;
          gridData = payload.gridData;
          
          const activeOpt = document.querySelector(`#grid-custom-options .custom-option[data-value="${gridSize}"]`);
          if (activeOpt) {
            gridSelectTrigger.textContent = activeOpt.textContent;
            gridOptions.forEach(o => o.classList.remove("selected"));
            activeOpt.classList.add("selected");
          }
        }
      } catch (e) {
        console.error("Failed to load saved pixel art", e);
      }
    }
  }

  // --- Export Handling ---
  function updateExportPreview() {
    const scale = parseInt(selectedScale, 10);
    const format = selectedFormat;

    if (format === "svg") {
      const svgString = generateSVGString(scale);
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      exportPreview.src = URL.createObjectURL(blob);
      return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = gridSize * scale;
    offscreen.height = gridSize * scale;
    const ctx = offscreen.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    if (format === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    }

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (gridData[y][x]) {
          ctx.fillStyle = gridData[y][x];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    exportPreview.src = offscreen.toDataURL(format === "jpg" ? "image/jpeg" : "image/png");
  }

  function generateSVGString(scale) {
    const dim = gridSize * scale;
    let rects = "";

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (gridData[y][x]) {
          rects += `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${gridData[y][x]}" />`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}">${rects}</svg>`;
  }

  function triggerDownload() {
    const link = document.createElement("a");
    link.download = `pixel-art-${gridSize}x${gridSize}-${selectedScale}x.${selectedFormat}`;
    link.href = exportPreview.src;
    link.click();
  }

  // --- Custom Dropdown Setup ---
  function setupCustomSelect(wrapper, trigger, options, callback) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".custom-select-wrapper").forEach(w => {
        if (w !== wrapper) w.classList.remove("open");
      });
      wrapper.classList.toggle("open");
    });

    options.forEach(option => {
      option.addEventListener("click", () => {
        options.forEach(o => o.classList.remove("selected"));
        option.classList.add("selected");
        trigger.textContent = option.textContent;
        wrapper.classList.remove("open");
        callback(option.dataset.value);
      });
    });
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    window.addEventListener("click", () => {
      document.querySelectorAll(".custom-select-wrapper").forEach(w => w.classList.remove("open"));
    });

    window.addEventListener("resize", () => {
      setupCanvasResolution();
      renderPixelCanvas();
      renderGridOverlay();
    });

    // Drawing Pointer Events
    const startDrawing = (e) => {
      isDrawing = true;
      const { x, y } = getGridCoordinates(e);
      handleCellAction(x, y);
    };

    const drawMove = (e) => {
      if (!isDrawing) return;
      if (activeTool === "bucket") return;
      const { x, y } = getGridCoordinates(e);
      handleCellAction(x, y);
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    pixelCanvas.addEventListener("mousedown", startDrawing);
    pixelCanvas.addEventListener("mousemove", drawMove);
    window.addEventListener("mouseup", stopDrawing);

    pixelCanvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startDrawing(e);
    });
    pixelCanvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      drawMove(e);
    });
    window.addEventListener("touchend", stopDrawing);

    // Color Inputs
    colorInput.addEventListener("input", (e) => {
      currentColor = e.target.value;
      updateSwatchActiveState();
    });

    // Tool Selector
    toolBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        toolBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeTool = btn.dataset.tool;
      });
    });

    // Custom Selects Initialization
    setupCustomSelect(gridSelectWrapper, gridSelectTrigger, gridOptions, (val) => {
      pendingGridSize = parseInt(val, 10);
      if (pendingGridSize !== gridSize) {
        resizeModal.classList.add("active");
      }
    });

    setupCustomSelect(formatSelectWrapper, formatSelectTrigger, formatOptions, (val) => {
      selectedFormat = val;
      updateExportPreview();
    });

    setupCustomSelect(scaleSelectWrapper, scaleSelectTrigger, scaleOptions, (val) => {
      selectedScale = val;
      updateExportPreview();
    });

    // Clear Modal Actions
    clearBtn.addEventListener("click", () => clearModal.classList.add("active"));
    cancelClear.addEventListener("click", () => clearModal.classList.remove("active"));
    confirmClear.addEventListener("click", () => {
      gridData = createGridData(gridSize);
      renderPixelCanvas();
      saveToLocalStorage();
      clearModal.classList.remove("active");
    });

    // Resize Modal Actions
    cancelResize.addEventListener("click", () => {
      resizeModal.classList.remove("active");
      const activeOpt = document.querySelector(`#grid-custom-options .custom-option[data-value="${gridSize}"]`);
      if (activeOpt) {
        gridSelectTrigger.textContent = activeOpt.textContent;
        gridOptions.forEach(o => o.classList.remove("selected"));
        activeOpt.classList.add("selected");
      }
    });

    confirmResize.addEventListener("click", () => {
      gridSize = pendingGridSize;
      gridData = createGridData(gridSize);
      setupCanvasResolution();
      renderPixelCanvas();
      renderGridOverlay();
      saveToLocalStorage();
      resizeModal.classList.remove("active");
    });

    // Tabs
    tabBtns.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabBtns.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));

        tab.classList.add("active");
        const targetTab = document.getElementById(`tab-${tab.dataset.tab}`);
        targetTab.classList.add("active");

        if (tab.dataset.tab === "export") {
          updateExportPreview();
        }
      });
    });

    downloadBtn.addEventListener("click", triggerDownload);
  }

  init();
});