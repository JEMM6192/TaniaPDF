export default function initViewer() {
  // Configuración de PDF.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js';

  let pdfDoc = null,
      currentPage = 1,
      // Zoom inicial predefinido: 1.0 para 100%
      scale = 1.0,
      pdfCanvas = document.getElementById("pdfCanvas"),
      ctxPdf = pdfCanvas.getContext("2d"),
      overlayCanvas = document.getElementById("overlayCanvas"),
      ctxOverlay = overlayCanvas.getContext("2d");

  // Variable para guardar el nombre del PDF abierto
  let pdfFileName = "";

  // Variables para marcas (coordenadas en relación a la página original)
  let marcas = [];
  let isMarcando = false, currentMarca = null;
  let selectedMarkIndex = null;

  // Panning: variables para arrastrar en el visualizador
  let isPanning = false, startPan = { x: 0, y: 0 }, startScroll = { left: 0, top: 0 };
  const viewerContainer = document.getElementById("viewerContainer");

  function actualizarOverlay() {
    overlayCanvas.width = pdfCanvas.width;
    overlayCanvas.height = pdfCanvas.height;
  }

  function renderPage(num) {
    pdfDoc.getPage(num).then(function(page) {
      const viewport = page.getViewport({ scale: scale });
      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      actualizarOverlay();
      const renderContext = {
        canvasContext: ctxPdf,
        viewport: viewport
      };
      page.render(renderContext).promise.then(function() {
        dibujarMarcasFijas();
      });
    });
  }

  function dibujarMarcasFijas() {
    ctxOverlay.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    marcas.forEach((marca) => {
      ctxOverlay.strokeStyle = marca.color;
      ctxOverlay.lineWidth = 2;
      ctxOverlay.setLineDash([]);
      ctxOverlay.strokeRect(marca.x * scale, marca.y * scale, marca.width * scale, marca.height * scale);
    });
    updateMarksList();
  }

  function updateMarksList() {
    const listDiv = document.getElementById("marksList");
    listDiv.innerHTML = "";
    marcas.forEach((marca, idx) => {
      const container = document.createElement("div");
      container.dataset.index = idx;
      // Recuadro de color
      const colorBox = document.createElement("div");
      colorBox.className = "colorBox";
      colorBox.style.backgroundColor = marca.color;
      // Etiqueta
      const label = document.createElement("span");
      label.className = "markLabel";
      label.textContent = "Marca " + (idx + 1);
      label.addEventListener("click", () => {
        selectedMarkIndex = idx;
        listDiv.querySelectorAll("div").forEach(el => el.classList.remove("selected"));
        container.classList.add("selected");
      });
      // Botón de eliminar con ícono
      const deleteBtn = document.createElement("img");
      deleteBtn.className = "deleteBtn";
      deleteBtn.src = "icons/delete.svg"; // Asegúrate de que el archivo se encuentre en public/icons/
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(container.dataset.index, 10);
        marcas.splice(index, 1);
        if (selectedMarkIndex === index) {
          selectedMarkIndex = null;
        }
        updateMarksList();
        dibujarMarcasFijas();
      });
      container.appendChild(colorBox);
      container.appendChild(label);
      container.appendChild(deleteBtn);
      listDiv.appendChild(container);
    });
  }

  document.getElementById("btnAbrir").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        pdfFileName = file.name;
        const fileReader = new FileReader();
        fileReader.onload = function() {
          const typedarray = new Uint8Array(this.result);
          pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            currentPage = 1;
            scale = 1.0;
            marcas = [];
            selectedMarkIndex = null;
            renderPage(currentPage);
          }).catch(function(error) {
            console.error("Error al cargar PDF:", error);
            alert("Error al cargar el PDF. Revisa la consola.");
          });
        };
        fileReader.readAsArrayBuffer(file);
      }
    };
    input.click();
  });

  document.getElementById("btnZoomIn").addEventListener("click", () => {
    scale *= 1.1;
    renderPage(currentPage);
  });

  document.getElementById("btnZoomOut").addEventListener("click", () => {
    scale /= 1.1;
    renderPage(currentPage);
  });

  document.getElementById("btnAgregarMarca").addEventListener("click", () => {
    isMarcando = true;
    overlayCanvas.style.cursor = "crosshair";
  });

  overlayCanvas.addEventListener("mousedown", e => {
    if (isMarcando) {
      const rect = overlayCanvas.getBoundingClientRect();
      currentMarca = {
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top
      };
    }
  });

  overlayCanvas.addEventListener("mousemove", e => {
    if (isMarcando && currentMarca) {
      const rect = overlayCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      dibujarMarcasFijas();
      ctxOverlay.save();
      ctxOverlay.strokeStyle = "black";
      ctxOverlay.setLineDash([5, 3]);
      const width = mouseX - currentMarca.startX;
      const height = mouseY - currentMarca.startY;
      ctxOverlay.strokeRect(currentMarca.startX, currentMarca.startY, width, height);
      ctxOverlay.restore();
    }
  });

  overlayCanvas.addEventListener("mouseup", e => {
    if (isMarcando && currentMarca) {
      const rect = overlayCanvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      const x = Math.min(currentMarca.startX, endX) / scale;
      const y = Math.min(currentMarca.startY, endY) / scale;
      const width = Math.abs(endX - currentMarca.startX) / scale;
      const height = Math.abs(endY - currentMarca.startY) / scale;
      const colors = ["red", "blue", "green", "orange", "purple", "brown"];
      const color = colors[marcas.length % colors.length];
      marcas.push({ x, y, width, height, color });
      isMarcando = false;
      currentMarca = null;
      overlayCanvas.style.cursor = "default";
      dibujarMarcasFijas();
    }
  });

  // Panning: desplazar el visualizador cuando no se está marcando
  viewerContainer.addEventListener("mousedown", e => {
    if (!isMarcando) {
      isPanning = true;
      viewerContainer.style.cursor = "grabbing";
      startPan = { x: e.clientX, y: e.clientY };
      startScroll = { left: viewerContainer.scrollLeft, top: viewerContainer.scrollTop };
    }
  });
  window.addEventListener("mousemove", e => {
    if (isPanning) {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      viewerContainer.scrollLeft = startScroll.left - dx;
      viewerContainer.scrollTop = startScroll.top - dy;
    }
  });
  window.addEventListener("mouseup", e => {
    if (isPanning) {
      isPanning = false;
      viewerContainer.style.cursor = "grab";
    }
  });

  // Función para exportar (guardar o imprimir) una marca en alta calidad
  function exportMarca(mark, callback) {
    let exportScale = 3.0;
    pdfDoc.getPage(currentPage).then(function(page) {
      let viewportHigh = page.getViewport({ scale: exportScale });
      let highCanvas = document.createElement("canvas");
      highCanvas.width = viewportHigh.width;
      highCanvas.height = viewportHigh.height;
      let highCtx = highCanvas.getContext("2d");
      let renderContext = { canvasContext: highCtx, viewport: viewportHigh };
      page.render(renderContext).promise.then(function() {
        let cropX = mark.x * exportScale;
        let cropY = mark.y * exportScale;
        let cropW = mark.width * exportScale;
        let cropH = mark.height * exportScale;
        let cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        let cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(highCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        callback(cropCanvas.toDataURL("image/png"), cropW, cropH);
      });
    });
  }

  // Imprimir Marca(s): genera un PDF con una página por cada marca y lo abre en una nueva pestaña
  document.getElementById("btnImprimir").addEventListener("click", () => {
    if (marcas.length === 0) {
      alert("No hay marcas para imprimir.");
      return;
    }
    const { jsPDF } = window.jspdf;
    let pdf = null;
    let processed = 0;
    function processMark(i) {
      exportMarca(marcas[i], (imgData, cropW, cropH) => {
        const orientation = cropW > cropH ? "landscape" : "portrait";
        if (i === 0) {
          pdf = new jsPDF({
            orientation: orientation,
            unit: "px",
            format: [cropW, cropH]
          });
          pdf.addImage(imgData, "PNG", 0, 0, cropW, cropH);
        } else {
          pdf.addPage([cropW, cropH], orientation);
          pdf.addImage(imgData, "PNG", 0, 0, cropW, cropH);
        }
        processed++;
        if (processed === marcas.length) {
          const pdfBlob = pdf.output("blob");
          const blobUrl = URL.createObjectURL(pdfBlob);
          window.open(blobUrl, "_blank");
        } else {
          processMark(i + 1);
        }
      });
    }
    processMark(0);
  });

  // Guardar Marca(s): genera y descarga un PDF con todas las marcas
  document.getElementById("btnGuardar").addEventListener("click", () => {
    if (marcas.length === 0) {
      alert("No hay marcas para guardar.");
      return;
    }
    const { jsPDF } = window.jspdf;
    let pdf = null;
    let processed = 0;
    function processMark(i) {
      exportMarca(marcas[i], (imgData, cropW, cropH) => {
        const orientation = cropW > cropH ? "landscape" : "portrait";
        if (i === 0) {
          pdf = new jsPDF({
            orientation: orientation,
            unit: "px",
            format: [cropW, cropH]
          });
          pdf.addImage(imgData, "PNG", 0, 0, cropW, cropH);
        } else {
          pdf.addPage([cropW, cropH], orientation);
          pdf.addImage(imgData, "PNG", 0, 0, cropW, cropH);
        }
        processed++;
        if (processed === marcas.length) {
          const baseName = pdfFileName.replace(/\.[^/.]+$/, "");
          pdf.save(baseName + "_marcas.pdf");
        } else {
          processMark(i + 1);
        }
      });
    }
    processMark(0);
  });
}
