<template>
    <component :is="customEl" base-url="/TaniaPDF">
      <div id="mainContainer">
        <div id="viewerContainer">
          <div id="pdfContainer">
            <canvas id="pdfCanvas"></canvas>
            <canvas id="overlayCanvas"></canvas>
          </div>
        </div>
        <div id="controlPanel">
          <button id="btnAbrir">Abrir PDF</button>
          <button id="btnZoomIn">Acercar</button>
          <button id="btnZoomOut">Alejar</button>
          <button id="btnAgregarMarca">Agregar Marca</button>
          <button id="btnImprimir">Imprimir</button>
          <button id="btnGuardar">Guardar</button>
          <div id="marksListContainer">
            <div id="marksList"></div>
          </div>
        </div>
      </div>
    </component>
  </template>
  
  <script setup lang="ts">
    // Importa el archivo que define el custom element
    import '../scripts/pdf-viewer.ts';
    // Define el nombre del custom element como string
    const customEl = 'pdf-viewer-element';
  </script>
  