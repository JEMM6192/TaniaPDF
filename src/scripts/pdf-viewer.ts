// src/scripts/pdf-viewer.ts

// Primero, declara que pdfjsLib y jspdf existen en el ámbito global
declare const pdfjsLib: any;
declare const jspdf: any;

interface Marca {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

if (typeof window !== 'undefined') {
  class PDFViewerElement extends HTMLElement {
    pdfDoc: any = null;
    currentPage: number = 1;
    scale: number = 1.0;
    marcas: Marca[] = [];
    isMarcando: boolean = false;
    currentMarca: { startX: number; startY: number } | null = null;
    selectedMarkIndex: number | null = null;
    isPanning: boolean = false;
    startPan: { x: number; y: number } = { x: 0, y: 0 };
    startScroll: { left: number; top: number } = { left: 0, top: 0 };
    baseUrl: string = '/';

    viewerContainer!: HTMLElement;
    pdfCanvas!: HTMLCanvasElement;
    overlayCanvas!: HTMLCanvasElement;
    ctxPdf!: CanvasRenderingContext2D;
    ctxOverlay!: CanvasRenderingContext2D;

    connectedCallback(): void {
      this.baseUrl = this.getAttribute('base-url') || '/';

      // Configura PDF.js
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js';

        console.log('Contenido interno del custom element:', this.innerHTML);

      // Asocia los elementos internos; se espera que el contenido del custom element incluya estos IDs.
      const viewerContainer = this.querySelector('#viewerContainer');
      const pdfCanvas = this.querySelector('#pdfCanvas');
      const overlayCanvas = this.querySelector('#overlayCanvas');

      if (!viewerContainer || !pdfCanvas || !overlayCanvas) {
        console.error('No se encontraron los elementos necesarios en el visor.');
        return;
      }

      this.viewerContainer = viewerContainer as HTMLElement;
      this.pdfCanvas = pdfCanvas as HTMLCanvasElement;
      this.overlayCanvas = overlayCanvas as HTMLCanvasElement;
      this.ctxPdf = this.pdfCanvas.getContext('2d') as CanvasRenderingContext2D;
      this.ctxOverlay = this.overlayCanvas.getContext('2d') as CanvasRenderingContext2D;

      this.initializeEvents();
    }

    initializeEvents(): void {
      const btnAbrir = this.querySelector('#btnAbrir');
      btnAbrir?.addEventListener('click', () => this.openPDF());

      const btnZoomIn = this.querySelector('#btnZoomIn');
      btnZoomIn?.addEventListener('click', () => {
        this.scale *= 1.1;
        this.renderPage(this.currentPage);
      });

      const btnZoomOut = this.querySelector('#btnZoomOut');
      btnZoomOut?.addEventListener('click', () => {
        this.scale /= 1.1;
        this.renderPage(this.currentPage);
      });

      const btnAgregarMarca = this.querySelector('#btnAgregarMarca');
      btnAgregarMarca?.addEventListener('click', () => {
        this.isMarcando = true;
        this.overlayCanvas.style.cursor = 'crosshair';
      });

      const btnImprimir = this.querySelector('#btnImprimir');
      btnImprimir?.addEventListener('click', () => this.imprimirMarcas());

      const btnGuardar = this.querySelector('#btnGuardar');
      btnGuardar?.addEventListener('click', () => this.guardarMarcas());

      // Eventos para el canvas (marcas)
      this.overlayCanvas.addEventListener('mousedown', (e) => this.startMarking(e));
      this.overlayCanvas.addEventListener('mousemove', (e) => this.updateMarking(e));
      this.overlayCanvas.addEventListener('mouseup', (e) => this.finishMarking(e));

      // Eventos para panning
      this.viewerContainer.addEventListener('mousedown', (e) => this.startPanning(e));
      window.addEventListener('mousemove', (e) => this.doPanning(e));
      window.addEventListener('mouseup', (e) => this.stopPanning(e));
    }

    openPDF(): void {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.onchange = () => {
        const file = input.files ? input.files[0] : null;
        if (file) {
          const fileReader = new FileReader();
          fileReader.onload = () => {
            const typedarray = new Uint8Array(fileReader.result as ArrayBuffer);
            pdfjsLib.getDocument(typedarray).promise.then((pdf: any) => {
              this.pdfDoc = pdf;
              this.currentPage = 1;
              this.scale = 1.0;
              this.marcas = [];
              this.selectedMarkIndex = null;
              this.renderPage(this.currentPage);
            }).catch((error: any) => {
              console.error("Error al cargar PDF:", error);
              alert("Error al cargar el PDF. Revisa la consola.");
            });
          };
          fileReader.readAsArrayBuffer(file);
        }
      };
      input.click();
    }

    renderPage(num: number): void {
      this.pdfDoc.getPage(num).then((page: any) => {
        const viewport = page.getViewport({ scale: this.scale });
        this.pdfCanvas.width = viewport.width;
        this.pdfCanvas.height = viewport.height;
        this.actualizarOverlay();
        const renderContext = {
          canvasContext: this.ctxPdf,
          viewport: viewport,
        };
        page.render(renderContext).promise.then(() => {
          this.dibujarMarcasFijas();
        });
      });
    }

    actualizarOverlay(): void {
      this.overlayCanvas.width = this.pdfCanvas.width;
      this.overlayCanvas.height = this.pdfCanvas.height;
    }

    dibujarMarcasFijas(): void {
      this.ctxOverlay.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      this.marcas.forEach((marca: Marca) => {
        this.ctxOverlay.strokeStyle = marca.color;
        this.ctxOverlay.lineWidth = 2;
        this.ctxOverlay.setLineDash([]);
        this.ctxOverlay.strokeRect(
          marca.x * this.scale,
          marca.y * this.scale,
          marca.width * this.scale,
          marca.height * this.scale
        );
      });
      this.updateMarksList();
    }

    updateMarksList(): void {
      const listDiv = this.querySelector('#marksList');
      if (!listDiv) return;
      listDiv.innerHTML = '';
      this.marcas.forEach((marca: Marca, idx: number) => {
        const container = document.createElement('div');
        container.dataset.index = idx.toString();

        const colorBox = document.createElement('div');
        colorBox.className = 'colorBox';
        colorBox.style.backgroundColor = marca.color;

        const label = document.createElement('span');
        label.className = 'markLabel';
        label.textContent = 'Marca ' + (idx + 1);
        label.addEventListener('click', () => {
          this.selectedMarkIndex = idx;
          listDiv.querySelectorAll('div').forEach(el => el.classList.remove('selected'));
          container.classList.add('selected');
        });

        const deleteBtn = document.createElement('img');
        deleteBtn.className = 'deleteBtn';
        deleteBtn.src = this.baseUrl + '/icons/delete.svg';
        deleteBtn.style.width = '24px';
        deleteBtn.style.height = '24px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          const index = parseInt(container.dataset.index || '0', 10);
          this.marcas.splice(index, 1);
          if (this.selectedMarkIndex === index) {
            this.selectedMarkIndex = null;
          }
          this.updateMarksList();
          this.dibujarMarcasFijas();
        });

        container.appendChild(colorBox);
        container.appendChild(label);
        container.appendChild(deleteBtn);
        listDiv.appendChild(container);
      });
    }

    // Funciones para marcas
    startMarking(e: MouseEvent): void {
      if (this.isMarcando) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        this.currentMarca = {
          startX: e.clientX - rect.left,
          startY: e.clientY - rect.top,
        };
      }
    }

    updateMarking(e: MouseEvent): void {
      if (this.isMarcando && this.currentMarca) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.dibujarMarcasFijas();
        this.ctxOverlay.save();
        this.ctxOverlay.strokeStyle = 'black';
        this.ctxOverlay.setLineDash([5, 3]);
        const width = mouseX - this.currentMarca.startX;
        const height = mouseY - this.currentMarca.startY;
        this.ctxOverlay.strokeRect(
          this.currentMarca.startX,
          this.currentMarca.startY,
          width,
          height
        );
        this.ctxOverlay.restore();
      }
    }

    finishMarking(e: MouseEvent): void {
      if (this.isMarcando && this.currentMarca) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        const x = Math.min(this.currentMarca.startX, endX) / this.scale;
        const y = Math.min(this.currentMarca.startY, endY) / this.scale;
        const width = Math.abs(endX - this.currentMarca.startX) / this.scale;
        const height = Math.abs(endY - this.currentMarca.startY) / this.scale;
        const colors = ["red", "blue", "green", "orange", "purple", "brown"];
        const color = colors[this.marcas.length % colors.length];
        this.marcas.push({ x, y, width, height, color });
        this.isMarcando = false;
        this.currentMarca = null;
        this.overlayCanvas.style.cursor = 'default';
        this.dibujarMarcasFijas();
      }
    }

    // Funciones para panning
    startPanning(e: MouseEvent): void {
      if (!this.isMarcando) {
        this.isPanning = true;
        this.viewerContainer.style.cursor = 'grabbing';
        this.startPan = { x: e.clientX, y: e.clientY };
        this.startScroll = { left: this.viewerContainer.scrollLeft, top: this.viewerContainer.scrollTop };
      }
    }

    doPanning(e: MouseEvent): void {
      if (this.isPanning) {
        const dx = e.clientX - this.startPan.x;
        const dy = e.clientY - this.startPan.y;
        this.viewerContainer.scrollLeft = this.startScroll.left - dx;
        this.viewerContainer.scrollTop = this.startScroll.top - dy;
      }
    }

    stopPanning(e: MouseEvent): void {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewerContainer.style.cursor = 'grab';
      }
    }

    // Función para exportar una marca
    exportMarca(mark: Marca, callback: (imgData: string, cropW: number, cropH: number) => void): void {
      const exportScale = 3.0;
      this.pdfDoc.getPage(this.currentPage).then((page: any) => {
        const viewportHigh = page.getViewport({ scale: exportScale });
        const highCanvas = document.createElement('canvas');
        highCanvas.width = viewportHigh.width;
        highCanvas.height = viewportHigh.height;
        const highCtx = highCanvas.getContext('2d');
        const renderContext = { canvasContext: highCtx, viewport: viewportHigh };
        page.render(renderContext).promise.then(() => {
          const cropX = mark.x * exportScale;
          const cropY = mark.y * exportScale;
          const cropW = mark.width * exportScale;
          const cropH = mark.height * exportScale;
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext('2d');
          cropCtx?.drawImage(highCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          callback(cropCanvas.toDataURL("image/png"), cropW, cropH);
        });
      });
    }

    imprimirMarcas(): void {
      if (this.marcas.length === 0) {
        alert("No hay marcas para imprimir.");
        return;
      }
      const { jsPDF } = jspdf;
      let pdf: any = null;
      let processed = 0;
      const processMark = (i: number) => {
        this.exportMarca(this.marcas[i], (imgData, cropW, cropH) => {
          const orientation = cropW > cropH ? "landscape" : "portrait";
          if (i === 0) {
            pdf = new jsPDF({
              orientation: orientation,
              unit: "px",
              format: [cropW, cropH],
            });
            pdf.addImage(imgData, "PNG", 0, 0, cropW, cropH);
          } else {
            pdf.addPage([cropW, cropH], orientation);
            pdf.addImage(imgData, "PNG", 0, 0, cropW, cropH);
          }
          processed++;
          if (processed === this.marcas.length) {
            const pdfBlob = pdf.output("blob");
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.open(blobUrl, "_blank");
          } else {
            processMark(i + 1);
          }
        });
      };
      processMark(0);
    }

    guardarMarcas(): void {
      if (this.marcas.length === 0) {
        alert("No hay marcas para guardar.");
        return;
      }
      const { jsPDF } = jspdf;
      let pdf: any = null;
      let processed = 0;
      const processMark = (i: number) => {
        this.exportMarca(this.marcas[i], (imgData, cropW, cropH) => {
          const orientation = cropW > cropH ? "landscape" : "portrait";
          if (i === 0) {
            pdf = new jsPDF({
              orientation: orientation,
              unit: "px",
              format: [cropW, cropH],
            });
            pdf.addImage(imgData, "PNG", 0, 0, cropW, cropH);
          } else {
            pdf.addPage([cropW, cropH], orientation);
            pdf.addImage(imgData, "PNG", 0, 0, cropW, cropH);
          }
          processed++;
          if (processed === this.marcas.length) {
            pdf.save("marcas.pdf");
          } else {
            processMark(i + 1);
          }
        });
      };
      processMark(0);
    }
  }

  customElements.define('pdf-viewer-element', PDFViewerElement);
}
