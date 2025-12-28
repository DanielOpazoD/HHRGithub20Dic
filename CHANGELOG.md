# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Añadido
- Sistema de auditoría con `AuditView` para visualizar logs de acciones críticas
- Exportación de CUDYR a Excel
- Selector de pasaporte para acceso offline
- Soporte WhatsApp para envío de reportes
- Firma digital para entrega médica

### Cambiado
- Refactorizado `App.tsx` extrayendo `AppProviders.tsx` y `AppRouter.tsx`
- Eliminados tipos `any` en código de producción (mejorado tipado TypeScript)
- Sincronización de enfermeras/TENS ahora usa arrays completos en vez de dot-notation

### Corregido
- Bug de sincronización de asignaciones de staff con Firestore
- Arrays de enfermeras se guardaban como objetos con claves numéricas

---

## [1.0.0] - 2024-12-01

### Añadido
- Gestión de censo diario de pacientes hospitalizados
- Vista de 18 camas fijas + camas extra dinámicas
- Sistema CUDYR para scoring de dependencia/riesgo
- Entrega de turno de enfermería y médica
- Exportación a Excel y CSV
- Sincronización en tiempo real con Firebase
- Modo offline con localStorage
- Autenticación con Firebase Auth
- Sistema de roles (viewer, editor, admin)
- Reportes y estadísticas
- PWA con service worker

### Infraestructura
- React 18 + TypeScript
- Vite como bundler
- TailwindCSS para estilos
- Firebase (Auth + Firestore)
- Netlify para hosting
- Gmail API para envío de emails

---

## Tipos de Cambios

- `Añadido` para nuevas funcionalidades
- `Cambiado` para cambios en funcionalidades existentes
- `Obsoleto` para funcionalidades que serán removidas
- `Eliminado` para funcionalidades removidas
- `Corregido` para corrección de bugs
- `Seguridad` para vulnerabilidades
