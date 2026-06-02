# Manual de Usuario: Asistente AI Integrado

## 📌 ¿Qué hace este módulo?
El **Asistente AI Integrado** le da acceso a un asesor agronómico inteligente disponible las 24 horas, directamente dentro de ConAgri. Puede hacerle preguntas en lenguaje natural sobre plagas, enfermedades, dosis de agroquímicos, condiciones climáticas, manejo de cultivos y más. Responde en español, con conocimiento especializado en agricultura ecuatoriana.

Con este módulo, su hacienda usa la API de inteligencia artificial de Conespacio —no necesita contratar ni pagar su propia cuenta en OpenAI u OpenRouter.

---

## 📍 ¿Dónde se accede?
**Botón flotante** en la esquina inferior derecha de la pantalla (ícono de robot 🤖), visible en cualquier parte del sistema.

> No tiene una página propia. El asistente es un panel lateral que se despliega sobre cualquier vista.

> El botón solo aparece si:
> - La hacienda tiene el módulo `ai_assistant_premium` activado, **O**
> - El administrador ha configurado su propia API Key (modalidad BYOK — "Bring Your Own Key").

---

## 📋 Requerimientos
- **Conexión a internet:** el asistente necesita conexión activa para funcionar. No opera en modo offline.
- **No requiere configuración previa** si su plan incluye el módulo. Simplemente abra el panel y empiece a preguntar.

---

## 🚀 Guía Paso a Paso

### Hacer una consulta agronómica
1. Haga clic en el ícono de robot 🤖 en la esquina inferior derecha de cualquier pantalla.
2. Se abre el panel del asistente.
3. Escriba su pregunta en el cuadro de texto. Ejemplos:
   - *"¿Cuál es la dosis recomendada de Mancozeb para tratar sigatoka en banano?"*
   - *"Mi cultivo de palmito tiene manchas amarillas en las hojas, ¿qué puede ser?"*
   - *"¿Cuándo es mejor aplicar fertilizante nitrogenado en caña?"*
4. Presione **Enter** o el botón de enviar.
5. El asistente responderá en segundos con una respuesta detallada.

### Continuar una conversación
- Puede seguir preguntando en el mismo hilo. El asistente recuerda el contexto de la conversación mientras el panel esté abierto.
- Para empezar una consulta nueva sin contexto previo, haga clic en **"Nueva conversación"** o cierre y vuelva a abrir el panel.

### Configurar su propia API Key (modalidad BYOK)
Si prefiere usar su propia cuenta de OpenRouter:
1. Vaya a **Perfil de Hacienda** (botón de perfil en el menú lateral → ícono de cuenta).
2. Busque la sección **"Configuración de IA"**.
3. Ingrese su API Key de OpenRouter.
4. Guarde los cambios. A partir de ese momento, las consultas usarán su propia clave y no se facturarán al módulo premium de Conespacio.

---

## ⚠️ Limitaciones actuales conocidas
- El asistente **no analiza imágenes** en esta versión. Si necesita identificar una plaga o enfermedad por foto, deberá describir los síntomas en texto.
- Las respuestas son orientativas. Siempre valide con un agrónomo certificado antes de aplicar tratamientos o modificar dosis de agroquímicos.
- El historial de conversaciones no se guarda entre sesiones. Cada vez que cierre el panel o recargue la página, comenzará desde cero.
