# Plan de implementación: Soporte para archivos Word (.docx)

## Objetivo

Extender la funcionalidad actual de la aplicación para permitir la carga, procesamiento y traducción de archivos Word (.docx), manteniendo el mismo flujo de trabajo que existe para archivos PDF:

1. Subir archivo (PDF o Word) ✅
2. Convertir a Markdown ✅
3. Enviar a OpenAI para traducción ✅
4. Convertir el Markdown traducido a documento Word ✅

## Estado actual de la implementación

### Flujo de traducción de documentos Word ✅

1. **Carga de archivo Word** ✅
   - Componente FileUpload actualizado para aceptar .docx
   - Validación de tipo de archivo y tamaño
   - UI con feedback específico para Word

2. **Conversión a Markdown** ✅
   - Implementado en word-parser.ts
   - Usa mammoth.js para Word → HTML
   - Usa turndown para HTML → Markdown
   - Usa markdownlint para limpiar y estandarizar el Markdown
   - Preserva formatos básicos (negritas, cursivas, listas)

3. **Proceso de traducción** ✅
   - Usa el mismo flujo que PDF
   - El Markdown se envía a OpenAI para traducción
   - No requiere cambios en translateContent
   - Mantiene el formato durante la traducción

4. **Generación del documento final** ✅
   - Usa el generador existente (docx-generator)
   - Convierte el Markdown traducido a Word
   - Mantiene el formato del documento original

### Características implementadas ✅

- Soporte completo para archivos .docx
- Preservación de formato básico
- Interfaz unificada para PDF y Word
- Manejo de errores específico para Word
- Retroalimentación visual del proceso
- Descarga del documento traducido

## Alcance del MVP

- Soporte para archivos Word (.docx) simples (sin imágenes, tablas o elementos complejos) ✅
- Preservación de formatos básicos (negritas, cursivas, listas, encabezados) ✅
- Integración con el flujo existente de la aplicación ✅
- Experiencia de usuario consistente independientemente del formato de archivo subido ✅

## Milestones

### 1. Preparación y configuración ✅

- [x] Investigar y seleccionar biblioteca para procesar archivos Word (mammoth.js)
- [x] Instalar dependencias necesarias (mammoth, turndown, remark)
- [x] Crear estructura de archivos para los nuevos componentes

### 2. Implementación del parser de Word ✅

- [x] Crear módulo `word-parser.ts` para convertir archivos Word a Markdown
- [x] Asegurar que se preserven los formatos básicos

### 3. Actualización de la interfaz de usuario ✅

- [x] Modificar el componente `FileUpload.tsx` para aceptar archivos Word
- [x] Actualizar mensajes y validaciones
- [x] Mejorar la UI para indicar soporte para múltiples formatos

### 4. Integración con el backend ✅

- [x] Modificar la ruta API para detectar y procesar diferentes tipos de archivos
- [x] Actualizar tipos e interfaces para ser genéricos
- [x] Implementar manejo de errores específicos para archivos Word

### 5. Próximos pasos (post-MVP)

#### 5.1 Mejoras en la experiencia de usuario
- [ ] Agregar indicador de progreso específico para el procesamiento de Word
- [ ] Mejorar los mensajes de éxito/error para distinguir entre PDF y Word
- [ ] Agregar vista previa del contenido del documento Word antes de la traducción

#### 5.2 Optimizaciones de rendimiento
- [ ] Implementar procesamiento por lotes para documentos grandes
- [ ] Optimizar la conversión de Word a HTML para archivos complejos
- [ ] Mejorar el manejo de memoria durante la conversión

#### 5.3 Soporte para elementos adicionales
- [ ] Agregar soporte para tablas simples
- [ ] Mejorar la preservación de estilos y formatos
- [ ] Implementar soporte para imágenes básicas

## Detalles técnicos

### Bibliotecas implementadas ✅

- **mammoth.js**: Conversión de Word a HTML
- **turndown**: Conversión de HTML a Markdown
- **remark**: Procesamiento y normalización de Markdown

### Implementación del parser de Word ✅

El módulo `word-parser.ts` ha sido implementado con:
- Conversión de Word a HTML usando mammoth.js
- Transformación de HTML a Markdown usando Turndown
- Preservación de formatos básicos
- Manejo de errores robusto
- Integración con el tipo PDFContent existente

### Actualización de la interfaz ✅

El componente `FileUpload.tsx` ha sido actualizado para:
- Aceptar archivos .docx
- Mostrar mensajes apropiados para ambos tipos de archivo
- Mantener una experiencia de usuario consistente

### Integración con el backend ✅

La ruta API ha sido modificada para:
- Detectar automáticamente el tipo de archivo
- Usar el parser apropiado según el tipo
- Manejar errores específicos de cada formato

## Próximos pasos recomendados

1. **Mejoras en la UI**
   - Implementar indicadores de progreso específicos para Word
   - Mejorar los mensajes de retroalimentación

2. **Optimizaciones**
   - Implementar procesamiento por lotes
   - Mejorar el manejo de memoria
   - Optimizar la conversión para archivos grandes

3. **Características adicionales**
   - Soporte para tablas simples
   - Mejor preservación de estilos
   - Soporte básico para imágenes

## Recursos

- [Documentación de mammoth.js](https://github.com/mwilliamson/mammoth.js)
- [Documentación de la API de OpenAI](https://platform.openai.com/docs/api-reference)
- [Guía de Markdown](https://www.markdownguide.org/basic-syntax/) 