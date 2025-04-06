<template>
  <component :is="customEl" base-url="/TaniaPDF">
    <div id="mainContainer" class="flex h-full" data-theme="light">
    <!-- Visualizador -->
    <div id="viewerContainer" class="flex-1 m-2 p-2 border border-base-200 rounded-lg bg-base-100 overflow-auto cursor-grab">
      <div class="relative">
        <canvas id="pdfCanvas" class="block"></canvas>
        <canvas id="overlayCanvas" class="absolute top-0 left-0 pointer-events-auto"></canvas>
      </div>
    </div>
    <!-- Panel de control -->
      <div id="controlPanel" class="w-64 p-4 border-l border-base-200 box-border overflow-y-auto">
    <button id="btnAbrir" class="btn btn-primary w-full mb-2 flex items-center space-x-2 justify-start">
      <span class="icon-[ix--open-file-filled]" style="width: 24px; height: 24px;"></span>
      <span>Abrir PDF</span>
    </button>
    <button id="btnZoomIn" class="btn btn-secondary w-full mb-2 flex items-center space-x-2 justify-start">
      <span class="icon-[tdesign--zoom-in-filled]" style="width: 24px; height: 24px;"></span>
      <span>Acercar</span>
    </button>
    <button id="btnZoomOut" class="btn btn-secondary w-full mb-2 flex items-center space-x-2 justify-start">
      <span class="icon-[tdesign--zoom-out-filled]" style="width: 24px; height: 24px;"></span>
      <span>Alejar</span>
    </button>
    <button id="btnAgregarMarca" class="btn btn-info w-full mb-2 flex items-center space-x-2 justify-start">
      <span class="icon-[subway--mark-3]" style="width: 24px; height: 24px;"></span>
      <span>Agregar Marca</span>
    </button>
    <button id="btnImprimir" class="btn btn-warning w-full mb-2 flex items-center space-x-2 justify-start">
      <span class="icon-[tdesign--print-filled]" style="width: 24px; height: 24px;"></span>
      <span>Imprimir</span>
    </button>
    <button id="btnGuardar" class="btn btn-success w-full mb-2 flex items-center space-x-2 justify-start">
      <span class="icon-[material-symbols--file-save-rounded]" style="width: 24px; height: 24px;"></span>
      <span>Guardar</span>
    </button>
    <div id="marksListContainer" class="h-96 overflow-y-auto border border-base-200 p-2 mt-2 rounded">
      <div id="marksList" class="space-y-2">
        <!-- Aquí se generarán los elementos de marca -->
      </div>
    </div>
  </div>

    
  </div>
  </component>
</template>

<script setup lang="ts">
  import '../scripts/pdf-viewer.ts';
  const customEl = 'pdf-viewer-element';

</script>
