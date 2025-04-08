// src/scripts/pdf-viewer.ts

// Declara que pdfjsLib y jspdf existen en el ámbito global
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
    // Zoom inicial; cámbialo según necesites
    scale: number = 0.5;
    marcas: Marca[] = [];
    loadedPDFs: { name: string; pdfDoc: any; thumbnail?: string; marks: Marca[] }[] = [];
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

    // Handlers globales para eventos
    private _openPdfHandler = () => {
      console.log("Evento open-pdf recibido en el visor");
      this.openPDF();
    };
    private _zoomInHandler = () => {
      console.log("Evento zoom-in recibido en el visor");
      this.zoomIn();
    };
    private _zoomOutHandler = () => {
      console.log("Evento zoom-out recibido en el visor");
      this.zoomOut();
    };
    private _addMarkHandler = () => {
      console.log("Evento add-mark recibido en el visor");
      this.agregarMarca();
    };
    private _printMarksHandler = () => {
      console.log("Evento print-marks recibido en el visor");
      this.imprimirMarcas();
    };
    private _saveMarksHandler = () => {
      console.log("Evento save-marks recibido en el visor");
      this.guardarMarcas();
    };

    connectedCallback(): void {
      this.baseUrl = this.getAttribute('base-url') || '/';

          // Al final de connectedCallback()
          this.addEventListener("select-pdf", (event: Event) => {
            var idx = (event as CustomEvent).detail;
            if (typeof idx === "number") {
              this.showPDF(idx);
            }
          });
          
          // Dentro de connectedCallback(), agrega esto:
this.addEventListener("delete-pdf", (event: Event) => {
  var idx = (event as CustomEvent).detail;
  if (typeof idx === "number") {
    // Elimina el PDF (y sus marcas) de la lista de PDFs cargados
    this.loadedPDFs.splice(idx, 1);
    // Actualiza la lista de PDFs disparando el evento "pdfs-updated"
    this.dispatchEvent(new CustomEvent("pdfs-updated", { detail: this.loadedPDFs }));
    // Si el PDF eliminado es el actual, actualiza el visor
    if (this.pdfDoc && this.loadedPDFs.length > 0) {
      // Si se eliminó el primer PDF, o si hay otros, elige el índice adecuado.
      var newIndex = idx === 0 ? 0 : idx - 1;
      var selected = this.loadedPDFs[newIndex];
      this.pdfDoc = selected.pdfDoc;
      this.currentPage = 1;
      this.scale = 1.0;
      this.marcas = selected.marks || [];
      this.renderPage(this.currentPage);
      this.dispatchEvent(new CustomEvent("marks-updated", { detail: this.marcas }));
    } else if (this.loadedPDFs.length === 0) {
      // Si ya no hay PDFs, limpia el visor y las marcas
      this.pdfDoc = null;
      this.marcas = [];
      this.ctxPdf.clearRect(0, 0, this.pdfCanvas.width, this.pdfCanvas.height);
      this.ctxOverlay.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      this.dispatchEvent(new CustomEvent("marks-updated", { detail: [] }));
    }
  }
});



      // Configura PDF.js
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js';

      console.log('Contenido interno del custom element:', this.innerHTML);

      // Busca los elementos internos (deben estar definidos en el contenido inyectado)
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

      // Registra eventos para panning y marcas
      this.overlayCanvas.addEventListener('mousedown', (e) => this.startMarking(e));
      this.overlayCanvas.addEventListener('mousemove', (e) => this.updateMarking(e));
      this.overlayCanvas.addEventListener('mouseup', (e) => this.finishMarking(e));

      this.viewerContainer.addEventListener('mousedown', (e) => this.startPanning(e));
      window.addEventListener('mousemove', (e) => this.doPanning(e));
      window.addEventListener('mouseup', (e) => this.stopPanning(e));

     
      // Registra eventos globales
      window.addEventListener('open-pdf', this._openPdfHandler);
      window.addEventListener('zoom-in', this._zoomInHandler);
      window.addEventListener('zoom-out', this._zoomOutHandler);
      window.addEventListener('add-mark', this._addMarkHandler);
      window.addEventListener('print-marks', this._printMarksHandler);
      window.addEventListener('save-marks', this._saveMarksHandler);

      // Agrega listener para eliminar marca (evento "delete-mark")
      this.addEventListener("delete-mark", (event: Event) => {
        // Se asume que event es un CustomEvent con la propiedad detail en forma de número (índice)
        const idx = (event as CustomEvent).detail;
        if (typeof idx === "number") {
          this.marcas.splice(idx, 1);
          this.updateMarksList();
          this.dibujarMarcasFijas();
        }
      });
    }

    

    // Métodos públicos
    public openPDF(): void {
      console.log("Ejecutando openPDF...");
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.multiple = true; // Permitir selección múltiple
      input.onchange = () => {
        const files = input.files;
        if (files && files.length > 0) {
          // Reinicia la lista de PDFs si se desea, o si quieres agregar nuevos, omite esta línea:
          this.loadedPDFs = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileReader = new FileReader();
            fileReader.onload = () => {
              const typedarray = new Uint8Array(fileReader.result as ArrayBuffer);
              pdfjsLib.getDocument(typedarray).promise.then((pdf: any) => {
                // Genera una previsualización del primer página como thumbnail
                pdf.getPage(1).then((page: any) => {
                  const thumbScale = 0.2;  // Escala pequeña para la previsualización
                  const viewport = page.getViewport({ scale: thumbScale });
                  const canvasThumb = document.createElement('canvas');
                  canvasThumb.width = viewport.width;
                  canvasThumb.height = viewport.height;
                  const ctxThumb = canvasThumb.getContext('2d');
                  const renderContext = {
                    canvasContext: ctxThumb,
                    viewport: viewport,
                  };
                  page.render(renderContext).promise.then(() => {
                    const thumbnail = canvasThumb.toDataURL("image/png");
                    // Agrega el PDF cargado a la lista con su nombre y thumbnail
                    this.loadedPDFs.push({
                      name: file.name,
                      pdfDoc: pdf,
                      thumbnail: thumbnail,
                      marks: [],
                    });
                    // Despacha el evento para actualizar el sidebar
                    this.dispatchEvent(new CustomEvent("pdfs-updated", {
                      detail: this.loadedPDFs
                    }));
                    // Si es el primer PDF cargado, muéstralo automáticamente
                    if (this.loadedPDFs.length === 1) {
                      this.currentPage = 1;
                      this.pdfDoc = pdf;
                      this.scale = 1.0; // Zoom por defecto para visualización
                      this.renderPage(this.currentPage);
                    }
                  });
                });
              }).catch((error: any) => {
                console.error("Error al cargar PDF:", error);
                alert("Error al cargar el PDF. Revisa la consola.");
              });
            };
            fileReader.readAsArrayBuffer(file);
          }
        }
      };
      input.click();
    }
    
    
    public showPDF(index: number): void {
      if (this.loadedPDFs[index]) {
        const selected = this.loadedPDFs[index];
        this.pdfDoc = selected.pdfDoc;
        this.currentPage = 1;
        this.scale = 1.0;
        // Carga las marcas almacenadas para ese PDF, o un arreglo vacío si no existen
        this.marcas = selected.marks || [];
        this.renderPage(this.currentPage);
        // Despacha el evento para actualizar la lista de marcas
        this.dispatchEvent(new CustomEvent("marks-updated", { detail: this.marcas }));
      }
    }
    

    public zoomIn(): void {
      this.scale *= 1.1;
      console.log("Nuevo scale (zoom in):", this.scale);
      this.renderPage(this.currentPage);
    }

    public zoomOut(): void {
      this.scale /= 1.1;
      console.log("Nuevo scale (zoom out):", this.scale);
      this.renderPage(this.currentPage);
    }

    public agregarMarca(): void {
      console.log("Activando modo agregar marca...");
      this.isMarcando = true;
      this.overlayCanvas.style.cursor = 'crosshair';
    }

    public imprimirMarcas(): void {
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

    public guardarMarcas(): void {
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

    // Métodos internos

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
      this.dispatchEvent(new CustomEvent("marks-updated", { detail: this.marcas }));
    }
    
    

    // Funciones para manejo de marcas
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
        const newMark: Marca = { x, y, width, height, color };
        this.marcas.push(newMark);
        // Actualiza las marcas en el PDF actual
        if (this.loadedPDFs.length > 0) {
          // Se asume que el PDF mostrado es el primero, o bien, implementa lógica para buscar el índice actual
          this.loadedPDFs[0].marks = this.marcas;
        }
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

    exportMarca(mark: Marca, callback: (imgData: string, cropW: number, cropH: number) => void): void {
      const exportScale = 2.0; // Ajusta este valor según necesites
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
          // Espera 300ms y usa requestAnimationFrame para asegurarte que el canvas se renderice
          setTimeout(() => {
            requestAnimationFrame(() => {
              try {
                const dataUrl = cropCanvas.toDataURL("image/png");
                callback(dataUrl, cropW, cropH);
              } catch (error) {
                console.error("Error al generar PNG:", error);
              }
            });
          }, 300);
        });
      });
    }
  }

  customElements.define('pdf-viewer-element', PDFViewerElement);
}
