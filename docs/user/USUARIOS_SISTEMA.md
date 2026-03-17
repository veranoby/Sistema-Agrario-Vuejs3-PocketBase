# 🔐 Usuarios y Accesos del Sistema

Este documento contiene la lista de usuarios actuales en la base de datos y sus respectivos roles.

## ⚠️ Nota de Seguridad
Las contraseñas en **PocketBase** se almacenan de forma encriptada (hashing). Por seguridad, no es posible recuperar la contraseña original desde la base de datos. Si no recuerdas la contraseña, puedes restablecerla desde el panel de administración de PocketBase o mediante el flujo de "Olvidé mi contraseña" en la app (si ya configuraste Resend).

---

## 🚀 Super Administrador Global (SaaS)
Este usuario tiene acceso exclusivo al entorno `/admin` para gestionar todas las haciendas y módulos de la plataforma. **No pertenece a ninguna hacienda.**

- **Email**: `superadmin@sistema-agri.com`
- **Username**: `superadmin_global`
- **Rol**: `superadmin`
- **is_super_admin**: `true`
- **Hacienda**: (Ninguna / Sin acceso a datos operativos de clientes)

**Acción Requerida**: Dado que este usuario ha sido creado mediante script, debes acceder al panel de PocketBase (`http://127.0.0.1:8090/_/`), buscarlo en la colección `users` y **establecer su contraseña manualmente** para poder iniciar sesión.

---

## 👥 Usuarios de Clientes (Haciendas)
Usuarios registrados para la gestión operativa de sus respectivas fincas.

| Email | Username | Rol | Hacienda (Contexto) |
| :--- | :--- | :--- | :--- |
| `isaias@gmail.com` | `ISAIAS` | `administrador` | Hacienda Principal |
| `veranoby@hotmail.com` | `VERANOBY` | `auditor` | Hacienda Principal |
| `wmoncayo@hotmail.com` | `WMONCAYO` | `operador` | Hacienda Principal |

---

## 🛠️ Administrador de Base de Datos (PocketBase Admin)
Acceso al panel técnico: `http://127.0.0.1:8090/_/`

- **Email**: `veranoby@gmail.com`
- **Contraseña**: Definida en la instalación inicial de PocketBase.

---

## 🔄 Cómo restablecer una contraseña
Si necesitas resetear un usuario manualmente para pruebas:
1. Accede al panel de PocketBase (`/_/`).
2. Ve a la colección `users`.
3. Selecciona el usuario y escribe una nueva contraseña en el campo `Password`.
4. Guarda los cambios.
