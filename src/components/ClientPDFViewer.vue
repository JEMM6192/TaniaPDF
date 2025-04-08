<!-- src/components/ClientPDFViewer.vue -->
<template>
  <component :is="customEl" base-url="/TaniaPDF" id="pdfViewerElement">
    <!-- Contenedor del visor: permite scroll horizontal y vertical -->
    <div
      id="viewerContainer"
      class="w-full h-full border border-base-200 rounded-lg bg-base-100 overflow-x-auto overflow-y-auto cursor-grab"
    >
      <div class="relative">
        <canvas id="pdfCanvas" class="block"></canvas>
        <canvas id="overlayCanvas" class="absolute top-0 left-0 pointer-events-auto"></canvas>
      </div>
    </div>
  </component>
</template>

<script>
import "../scripts/pdf-viewer.ts";
export default {
  name: "ClientPDFViewer",
  data() {
    return {
      customEl: "pdf-viewer-element"
    }
  }
}
</script>
