# Deployment Guide - Sistema Agri

## Overview

Guía completa de deployment para producción del Sistema Agri.

---

## 📋 Requisitos Previos

### Servidor
- **CPU**: 2 cores mínimo (4 recomendado)
- **RAM**: 1GB mínimo (2GB recomendado)
- **Almacenamiento**: 10GB mínimo SSD
- **OS**: Linux (Ubuntu 20.04+ recomendado)

### Software
- **Node.js**: 18+ ([instalación](https://nodejs.org/))
- **PocketBase**: 0.21.5+ ([download](https://pocketbase.io/docs/))
- **Nginx** (opcional, para reverse proxy)
- **SSL Certificate** (Let's Encrypt recomendado)

---

## 🔧 Variables de Entorno

### Frontend (.env.production)
```bash
# PocketBase API URL
VITE_POCKETBASE_URL=https://api.yourdomain.com

# Email Service (Resend)
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx

# Environment
NODE_ENV=production
```

### Backend (PocketBase)
PocketBase usa archivo de configuración `pb_data/pb_hooks.json`:

```json
{
  "email": {
    "enabled": true,
    "smtpHost": "smtp.resend.com",
    "smtpPort": 587,
    "smtpUser": "resend",
    "smtpPassword": "your_api_key",
    "smtpFrom": "Sistema Agri <noreply@yourdomain.com>"
  }
}
```

---

## 📦 Build para Producción

### 1. Preparar el proyecto
```bash
cd /home/veranoby/sistema-agri
npm install
npm run build
```

### 2. Verificar el build
```bash
# Verificar que se creó la carpeta dist/
ls -la dist/

# Verificar tamaño del bundle
du -sh dist/
```

**Resultado esperado**:
- `dist/` contiene los archivos estáticos
- Bundle principal: ~1MB (304KB gzipped)
- Service worker: `sw.js` generado

---

## 🚀 Deployment Options

### Opción A: Vercel (Recomendado para Frontend)

**Ventajas**:
- CDN global
- Deploy automático desde git
- HTTPS automático
- Preview deployments

**Pasos**:
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Configuración `vercel.json`**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.yourdomain.com/api/:path*"
    }
  ]
}
```

---

### Opción B: VPS con Nginx

**1. Instalar Nginx**:
```bash
sudo apt update
sudo apt install nginx -y
```

**2. Configurar Nginx** (`/etc/nginx/sites-available/sistema-agri`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend estático
    root /var/www/sistema-agri/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy a PocketBase
    location /api/ {
        proxy_pass http://localhost:8090/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**3. Deploy del frontend**:
```bash
# Copiar build al servidor
scp -r dist/ user@server:/var/www/sistema-agri/

# Reiniciar Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🗄️ PocketBase Deployment

### 1. Instalar PocketBase
```bash
# Download
wget https://github.com/pocketbase/pocketbase/releases/download/v0.21.5/pocketbase_0.21.5_linux_amd64.zip

# Extraer
unzip pocketbase_0.21.5_linux_amd64.zip
chmod +x pocketbase

# Mover a ubicación final
sudo mv pocketbase /usr/local/bin/
```

### 2. Crear servicio systemd (`/etc/systemd/system/pocketbase.service`)
```ini
[Unit]
Description=PocketBase Service
After=network.target

[Service]
Type=simple
User=pocketbase
WorkingDirectory=/opt/pocketbase
ExecStart=/usr/local/bin/pocketbase serve --http0.0.0.0:8090
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

### 3. Iniciar servicio
```bash
# Crear usuario
sudo useradd -r -s /bin/false pocketbase

# Crear directorio
sudo mkdir -p /opt/pocketbase/pb_data
sudo chown -R pocketbase:pocketbase /opt/pocketbase

# Copiar datos
cp -r pocketbase/pb_data/* /opt/pocketbase/pb_data/

# Iniciar servicio
sudo systemctl daemon-reload
sudo systemctl enable pocketbase
sudo systemctl start pocketbase

# Verificar status
sudo systemctl status pocketbase
```

---

## 🔒 SSL con Let's Encrypt

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d yourdomain.com

# Renovación automática (configurada por certbot)
sudo certbot renew --dry-run
```

---

## 🔄 Proceso de Deployment Completo

### Script de Deployment (`deploy.sh`)
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Sistema Agri..."

# 1. Build
echo "📦 Building..."
npm run build

# 2. Deploy frontend a Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

# 3. Backup PocketBase
echo "💾 Backing up PocketBase..."
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz pocketbase/pb_data/

# 4. Restart PocketBase (si es necesario)
echo "🔄 Restarting PocketBase..."
ssh user@server "sudo systemctl restart pocketbase"

echo "✅ Deployment completo!"
```

---

## 🔄 Rollback Procedure

### Si algo sale mal:

**1. Frontend (Vercel)**:
```bash
# Listar deployments
vercel list

# Rollback a deployment específico
vercel rollback <deployment-url>
```

**2. Frontend (VPS)**:
```bash
# Restaurar backup anterior
sudo rm -rf /var/www/sistema-agri/dist
sudo mv /var/www/sistema-agri/dist.backup /var/www/sistema-agri/dist
sudo systemctl reload nginx
```

**3. PocketBase**:
```bash
# Detener servicio
sudo systemctl stop pocketbase

# Restaurar backup
cd /opt/pocketbase
rm -rf pb_data
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz

# Iniciar servicio
sudo systemctl start pocketbase
```

---

## 📊 Monitoreo

### Logs de PocketBase
```bash
# Ver logs en tiempo real
sudo journalctl -u pocketbase -f

# Ver logs recientes
sudo journalctl -u pocketbase -n 100
```

### Logs de Nginx
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Monitoreo de recursos
```bash
# Uso de CPU/Memoria
htop

# Espacio en disco
df -h

# Conexiones activas
ss -tuln
```

---

## 🔐 Seguridad en Producción

### Checklist
- [ ] SSL/TLS configurado
- [ ] Firewall activo (ufw)
- [ ] Actualizaciones automáticas activas
- [ ] Backups automáticos configurados
- [ ] Rate limiting configurado
- [ ] CORS configurado correctamente
- [ ] Variables de entorno no están en el repo
- [ ] PocketBase admin password fuerte

### Firewall (UFW)
```bash
# Habilitar firewall
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir PocketBase (solo localhost)
# No exponer puerto 8090 públicamente

# Verificar status
sudo ufw status
```

---

## 📱 PWA Considerations

El Sistema Agri es una PWA. Asegurar:

1. **Service Worker**: `sw.js` se sirve correctamente
2. **Manifest**: `manifest.webmanifest` tiene URLs correctas
3. **HTTPS**: Requerido para PWA
4. **Iconos**: Todos los tamaños de iconos están disponibles

---

## 🆘 Troubleshooting

### Problema: Build falla
```bash
# Limpiar cache
rm -rf node_modules dist
npm install
npm run build
```

### Problema: Service Worker no se registra
- Verificar que `sw.js` está en `dist/`
- Verificar HTTPS en producción
- Limpiar cache del browser

### Problema: PocketBase no inicia
```bash
# Verificar permisos
ls -la /opt/pocketbase/pb_data

# Verificar logs
journalctl -u pocketbase -n 50
```

### Problema: Error 401 en API
- Verificar token JWT en localStorage
- Verificar expiración del token
- Verificar API Rules en PocketBase

---

## 📞 Soporte

Para problemas de deployment:
- Verificar logs: `journalctl -u pocketbase -n 100`
- Revisar esta guía
- Consultar [PocketBase Docs](https://pocketbase.io/docs/)

---

**Versión**: 1.0
**Última actualización**: 2026-03-15
