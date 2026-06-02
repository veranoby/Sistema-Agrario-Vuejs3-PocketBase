/// <reference path="../pb_data/types.d.ts" />
/**
 * pb_hooks/asesores.pb.js
 * 
 * Hooks para el módulo Asesor Técnico:
 * 1. Auto-completa fecha_envio al cambiar receta a 'enviada'
 * 2. Auto-completa fecha_vista al cambiar receta a 'vista'
 * 3. Notifica a hacienda al recibir una receta 'enviada'
 * 4. Previene vinculaciones duplicadas
 */

/**
 * Hook: Transiciones de estado en recetas
 * - Al pasar a 'enviada': setea fecha_envio y notifica al admin de hacienda
 * - Al pasar a 'vista': setea fecha_vista y notifica al asesor
 */
onRecordUpdateRequest((e) => {
  const collName = e.record.collection().name
  if (collName !== 'recetas') return e.next()

  const nuevoEstado = e.record.get('estado')
  const estadoAnterior = e.record.original().get('estado')

  // Transición → enviada
  if (estadoAnterior !== 'enviada' && nuevoEstado === 'enviada') {
    e.record.set('fecha_envio', new Date().toISOString())
  }

  // Transición → vista
  if (estadoAnterior !== 'vista' && nuevoEstado === 'vista') {
    e.record.set('fecha_vista', new Date().toISOString())
  }

  const res = e.next()

  // Transición → enviada (Notificación post-guardado)
  if (estadoAnterior !== 'enviada' && nuevoEstado === 'enviada') {
    try {
      const haciendaId = e.record.get('hacienda_id')
      const asesorId = e.record.get('asesor_id')
      const titulo = e.record.get('titulo') || 'Receta Técnica'

      if (haciendaId) {
        const hacienda = e.app.dao().findRecordById('Haciendas', haciendaId)
        if (hacienda) {
          const asesor = asesorId ? e.app.dao().findRecordById('users', asesorId) : null
          const asesorNombre = asesor ? `${asesor.get('name')} ${asesor.get('lastname')}` : 'Tu Asesor'
          const contactoEmail = hacienda.get('contacto_email')

          if (contactoEmail) {
            $http.send({
              url: 'http://127.0.0.1:8090/api/ext/alerts/send',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'emergency',
                hacienda: hacienda.get('name'),
                recipients: [contactoEmail],
                subject: `Nueva Receta Técnica de ${asesorNombre}`,
                message: `Has recibido una nueva receta fitosanitaria de tu asesor ${asesorNombre}: "${titulo}". Ingresa a la plataforma para revisarla y aprobarla.`
              })
            })
          }
        }
      }
    } catch (notifErr) {
      e.app.logger().warn('[asesores.pb] Notificación hacienda falló (non-critical):', notifErr)
    }
  }

  // Transición → vista (Notificación post-guardado)
  if (estadoAnterior !== 'vista' && nuevoEstado === 'vista') {
    try {
      const asesorId = e.record.get('asesor_id')
      const titulo = e.record.get('titulo') || 'Receta Técnica'

      if (asesorId) {
        const asesor = e.app.dao().findRecordById('users', asesorId)
        if (asesor && asesor.get('email')) {
          $http.send({
            url: 'http://127.0.0.1:8090/api/ext/alerts/send',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'emergency',
              hacienda: 'ConAgri',
              recipients: [asesor.get('email')],
              subject: 'Tu receta ha sido revisada',
              message: `La hacienda ha revisado tu receta "${titulo}". Próximamente recibirás confirmación de aprobación o rechazo.`
            })
          })
        }
      }
    } catch (notifErr) {
      e.app.logger().warn('[asesores.pb] Notificación asesor falló (non-critical):', notifErr)
    }
  }

  return res
}, 'recetas')

onRecordUpdateRequest((e) => {
  const collName = e.record.collection().name
  if (collName !== 'paquetes_evaluacion') return e.next()

  const nuevoEstado = e.record.get('estado')
  const estadoAnterior = e.record.original().get('estado')

  if (estadoAnterior === 'enviado' && nuevoEstado === 'visto') {
    e.record.set('fecha_visto', new Date().toISOString())
  }

  return e.next()
}, 'paquetes_evaluacion')

onRecordCreateRequest((e) => {
  const collName = e.record.collection().name
  if (collName !== 'vinculaciones_asesor') return e.next()

  const haciendaId = e.record.get('hacienda_id')
  const asesorId = e.record.get('asesor_id')

  try {
    e.app.dao().findFirstRecordByFilter(
      'vinculaciones_asesor',
      `hacienda_id = "${haciendaId}" && asesor_id = "${asesorId}" && estado != "revocada"`
    )
    throw new BadRequestError('Ya existe una vinculación activa o pendiente con este asesor.')
  } catch (err) {
    if (err instanceof BadRequestError) throw err
  }

  return e.next()
}, 'vinculaciones_asesor')
