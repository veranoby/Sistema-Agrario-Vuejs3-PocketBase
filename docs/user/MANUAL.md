# 📔 Manual de Operaciones y Producto - ConAgri

Este documento centraliza la información operativa y comercial para usuarios y gestores del sistema.

---

## 🔐 1. Directorio de Usuarios y Accesos
Datos para pruebas y configuración inicial en PocketBase:

### 🚀 Super Administrador (SaaS)
- **Acceso**: `/admin`
- **Email**: `superadmin@sistema-agri.com` | **User**: `superadmin_global`
- **Función**: Gestión de haciendas, módulos y métricas globales.

### 👥 Usuarios de Prueba (Hacienda Principal)
| Email | Rol | Contexto |
| :--- | :--- | :--- |
| `isaias@gmail.com` | Administrador | Control total + Finanzas |
| `veranoby@hotmail.com` | Auditor | Trazabilidad BPA (Solo lectura) |
| `wmoncayo@hotmail.com` | Operador | Registro de campo (Offline) |

---

## 📢 2. Catálogo de Funcionalidades (Para Clientes)
Módulos core para presentaciones comerciales:

1.  **Gestión de Usuarios (Role Safeguard)**: 4 niveles de acceso protegidos por API y UI.
2.  **Siembras y Proyectos**: Dashboard con paginación real, filtros por cultivo y estado.
3.  **Bitácora Inteligente**: Formulario adaptativo, carga de fotos, registro offline y georreferenciación.
4.  **Programación Avanzada**: Recurrencia (diaria/mensual), ejecución en lote (Batch) y alarmas.
5.  **Mapas GIS**: Dibujo de polígonos con Leaflet, medición de áreas y vista satelital.
6.  **Módulo Financiero**: Registro de ingresos/gastos, balance por siembra e importación desde Excel.
7.  **BPA Compliance**: Scoring automático de cumplimiento normativo y reportes PDF/Excel automáticos.
8.  **Asistente IA (Gemini)**: Consultas técnicas de riego y fertilización contextualizadas a la siembra.
9.  **Knowledge Hub**: Buscador global de "Recetas de Éxito" y catálogo de mejores prácticas.
10. **Panel Super Admin**: Analytics de uso, minería de datos y marketplace de módulos.

---

## 💰 3. Modelo de Negocio y Estrategia
- **Visión**: Transformar el campo en una operación data-driven y certificable.
- **Monetización**: Suscripción mensual base por hacienda + cobro por volumen de usuarios + módulos "Plus" activables.
- **Diferenciador**: Capacidad **Offline-first** (funciona en zonas sin señal) y **Scoring BPA** (facilita certificaciones internacionales).
- **Roadmap Futuro**: IoT (Sensores de humedad), Blockchain (Trazabilidad inmutable) y App Nativa.

---

## 🛠️ Configuración de Entorno (.env)
```env
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_RESEND_API_KEY=re_YOUR_KEY
VITE_GEMINI_API_KEY=AIzaSy_YOUR_KEY
```
