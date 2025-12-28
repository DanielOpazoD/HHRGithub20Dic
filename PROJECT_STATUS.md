# HHR Hospital Tracker - Estado del Proyecto

> **Última actualización:** 2024-12-27
> **Nota global:** 6.1 / 7

---

## 📊 Tests

### Unit Tests (Vitest)
| Categoría | Archivos | Tests | Estado |
|-----------|:--------:|:-----:|:------:|
| hooks/ | 13 | ~150 | ✅ |
| services/ | 10 | ~80 | ✅ |
| integration/ | 7 | ~60 | ✅ |
| utils/ | 5 | ~40 | ✅ |
| components/ | 4 | ~30 | ✅ |
| validation/ | 1 | ~8 | ✅ |
| **Total** | **40** | **368** | ✅ |

```bash
npm run test          # Ejecutar todos
npm run test:coverage # Con cobertura
```

### E2E Tests (Playwright)
| Archivo | Tests | Estado |
|---------|:-----:|:------:|
| census-mocked.spec.ts | 3 | ✅ |
| comprehensive.spec.ts | 4 | ✅ |
| excel-export.spec.ts | 2 | ✅ |
| hospitalDay.spec.ts | 2 | ⚠️ Flaky |
| medical-signature.spec.ts | 1 | ✅ |
| passport-auth.spec.ts | 2 | ✅ |
| patient-flow.spec.ts | 2 | ✅ |
| patient-operations.spec.ts | 2 | ✅ |
| **Total** | **~20** | ⚠️ |

```bash
npx playwright test   # Ejecutar todos
```

---

## 🏗️ Arquitectura

### Hooks (20+)
| Hook | Propósito | Testeado |
|------|-----------|:--------:|
| `useDailyRecord` | Orquestador principal | ✅ |
| `useBedManagement` | Gestión de camas | ✅ |
| `usePatientValidation` | Validación RUT/nombres | ✅ |
| `useAuthState` | Autenticación Firebase/Passport | ✅ |
| `useDateNavigation` | Navegación de fechas | ✅ |
| `useModal` | Estado genérico de modales | ✅ |
| `useAppState` | UI state centralizado | ✅ |

### Servicios
| Servicio | Propósito | Testeado |
|----------|-----------|:--------:|
| `auditService` | Logs de auditoría | ✅ |
| `passportService` | Auth offline | ✅ |
| `dataService` | CRUD pacientes | ✅ |
| `authService` | Firebase auth | ✅ |

### Componentes Reutilizables
| Componente | Propósito | Usa BaseModal |
|------------|-----------|:-------------:|
| `BaseModal` | Modal base | N/A |
| `SettingsModal` | Configuración | ✅ |
| `BedManagerModal` | Admin camas | ❌ |
| `DemographicsModal` | Datos paciente | ❌ |

---

## 📁 Estructura de Directorios

```
/
├── components/     # UI components (40+)
│   ├── shared/     # BaseModal, ErrorBoundary
│   ├── modals/     # Modales (10)
│   ├── layout/     # Navbar, DateStrip
│   └── census/     # PatientRow, etc.
├── hooks/          # Custom hooks (20+)
├── services/       # Business logic
├── views/          # Page components
├── context/        # React contexts (5)
├── tests/          # Unit tests (40 files)
└── e2e/            # Playwright tests (10 files)
```

---

## 🔧 Configuración

| Herramienta | Versión | Config |
|-------------|---------|--------|
| React | 18.x | - |
| TypeScript | 5.x | `tsconfig.json` |
| Vite | 6.x | `vite.config.ts` |
| Vitest | 3.x | `vitest.config.ts` |
| Playwright | 1.x | `playwright.config.ts` |
| Tailwind | 4.x | `index.css` |

---

## 📈 Métricas

| Métrica | Valor | Objetivo |
|---------|:-----:|:--------:|
| Unit tests | 368 | 400+ |
| E2E tests | ~20 | 30 |
| Modals con BaseModal | 1/10 | 10/10 |
| A11y score | ~70 | 90+ |
| Build time | ~8s | <10s |

---

## 🚀 Próximas Mejoras (Prioridad)

1. 🔴 **P1:** Migrar modals restantes a BaseModal
2. 🟠 **P2:** Accesibilidad básica (aria-labels)
3. 🟡 **P3:** Estabilizar E2E tests flaky
4. 🟢 **P4:** Dark mode
