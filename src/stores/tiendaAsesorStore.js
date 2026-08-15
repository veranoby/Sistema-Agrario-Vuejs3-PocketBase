import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { useAuthStore } from './authStore'

export const useTiendaAsesorStore = defineStore('tiendaAsesor', {
  state: () => ({
    // Catálogo público de productos
    productos: [],
    loadingProductos: false,
    
    // Mis productos como asesor (Vendedor)
    misProductos: [],
    loadingMisProductos: false,
    
    // Mis pedidos recibidos como asesor (Ventas)
    misVentas: [],
    loadingMisVentas: false,
    
    // Mis órdenes de compra como hacienda (Compras)
    misCompras: [],
    loadingMisCompras: false,
    
    // Carrito de compras local (Hacienda)
    cartItems: [],
    
    // Filtros de búsqueda en marketplace
    filtros: {
      search: '',
      categoria: null,
      pais: 'EC',
      provincia: '',
      soloCoberturaHacienda: true
    },
    
    pagination: {
      page: 1,
      perPage: 24,
      totalItems: 0
    }
  }),

  getters: {
    cartCount: (state) => {
      return state.cartItems.reduce((acc, item) => acc + (item.cantidad || 1), 0)
    },

    cartSubtotal: (state) => {
      return state.cartItems.reduce((acc, item) => acc + ((item.precio || 0) * (item.cantidad || 1)), 0)
    },

    cartTotal: (state) => {
      // Por ahora subtotal + flete base
      return state.cartItems.reduce((acc, item) => acc + ((item.precio || 0) * (item.cantidad || 1)), 0)
    },

    // Total de ventas acumuladas del asesor
    totalFacturadoAsesor: (state) => {
      return state.misVentas
        .filter(v => ['pago_aprobado', 'en_despacho', 'entregado', 'completado'].includes(v.estado))
        .reduce((acc, v) => acc + (v.total || 0), 0)
    },

    // Ventas pendientes de validación
    ventasPorVerificar: (state) => {
      return state.misVentas.filter(v => v.estado === 'pago_en_verificacion' || v.estado === 'pendiente_pago')
    }
  },

  actions: {
    // -------------------------------------------------------------
    // CATÁLOGO PÚBLICO & MARKETPLACE
    // -------------------------------------------------------------
    async fetchCatalogoPublico(page = 1) {
      this.loadingProductos = true
      try {
        const filterParts = ['estado = "activo"']

        if (this.filtros.search?.trim()) {
          const s = this.filtros.search.trim().replace(/['"]/g, '')
          filterParts.push(`(nombre ~ "${s}" || descripcion ~ "${s}")`)
        }

        if (this.filtros.categoria) {
          filterParts.push(`categoria = "${this.filtros.categoria}"`)
        }

        if (this.filtros.pais) {
          filterParts.push(`(pais_origen = "${this.filtros.pais}" || alcance_envio = "internacional")`)
        }

        const res = await pb.collection('asesor_productos').getList(page, this.pagination.perPage, {
          filter: filterParts.join(' && '),
          sort: '-created',
          expand: 'asesor'
        })

        this.productos = res.items
        this.pagination.page = res.page
        this.pagination.totalItems = res.totalItems
        return res.items
      } catch (err) {
        console.warn('Error al cargar catálogo de productos:', err)
        this.productos = []
        return []
      } finally {
        this.loadingProductos = false
      }
    },

    // -------------------------------------------------------------
    // ACCIONES DEL ASESOR (SELLER)
    // -------------------------------------------------------------
    async fetchMisProductos() {
      const authStore = useAuthStore()
      if (!authStore.user?.id) return []

      this.loadingMisProductos = true
      try {
        const res = await pb.collection('asesor_productos').getFullList({
          filter: `asesor = "${authStore.user.id}"`,
          sort: '-created'
        })
        this.misProductos = res
        return res
      } catch (err) {
        handleError(err, 'Error al cargar tus productos')
        this.misProductos = []
        return []
      } finally {
        this.loadingMisProductos = false
      }
    },

    async createProducto(formData) {
      const authStore = useAuthStore()
      const uiFeedback = useUiFeedbackStore()
      if (!authStore.user?.id) return

      try {
        formData.append('asesor', authStore.user.id)
        const record = await pb.collection('asesor_productos').create(formData)
        uiFeedback.showSnackbar('Producto publicado exitosamente', 'success')
        await this.fetchMisProductos()
        return record
      } catch (err) {
        handleError(err, 'Error al crear producto')
        throw err
      }
    },

    async updateProducto(id, formData) {
      const uiFeedback = useUiFeedbackStore()
      try {
        const record = await pb.collection('asesor_productos').update(id, formData)
        uiFeedback.showSnackbar('Producto actualizado correctamente', 'success')
        await this.fetchMisProductos()
        return record
      } catch (err) {
        handleError(err, 'Error al actualizar producto')
        throw err
      }
    },

    async deleteProducto(id) {
      const uiFeedback = useUiFeedbackStore()
      try {
        await pb.collection('asesor_productos').delete(id)
        uiFeedback.showSnackbar('Producto eliminado del catálogo', 'success')
        await this.fetchMisProductos()
      } catch (err) {
        handleError(err, 'Error al eliminar producto')
        throw err
      }
    },

    async fetchMisVentas() {
      const authStore = useAuthStore()
      if (!authStore.user?.id) return []

      this.loadingMisVentas = true
      try {
        const res = await pb.collection('asesor_pedidos').getFullList({
          filter: `asesor = "${authStore.user.id}"`,
          sort: '-created',
          expand: 'hacienda,comprador'
        })
        this.misVentas = res
        return res
      } catch (err) {
        console.warn('Error al cargar ventas del asesor:', err)
        this.misVentas = []
        return []
      } finally {
        this.loadingMisVentas = false
      }
    },

    async actualizarEstadoPedido(pedidoId, nuevoEstado, extraData = {}) {
      const uiFeedback = useUiFeedbackStore()
      try {
        const payload = {
          estado: nuevoEstado,
          ...extraData
        }
        const record = await pb.collection('asesor_pedidos').update(pedidoId, payload)
        uiFeedback.showSnackbar(`Pedido actualizado a: ${nuevoEstado}`, 'success')
        await this.fetchMisVentas()
        return record
      } catch (err) {
        handleError(err, 'Error al actualizar estado del pedido')
        throw err
      }
    },

    async subirGuiaDespacho(pedidoId, formData) {
      const uiFeedback = useUiFeedbackStore()
      try {
        formData.append('estado', 'en_despacho')
        const record = await pb.collection('asesor_pedidos').update(pedidoId, formData)
        uiFeedback.showSnackbar('Guía de despacho registrada. Pedido en camino.', 'success')
        await this.fetchMisVentas()
        return record
      } catch (err) {
        handleError(err, 'Error al subir guía de despacho')
        throw err
      }
    },

    // -------------------------------------------------------------
    // ACCIONES DE LA HACIENDA (BUYER & PROCUREMENT)
    // -------------------------------------------------------------
    addToCart(producto, cantidad = 1) {
      const uiFeedback = useUiFeedbackStore()
      const existing = this.cartItems.find(i => i.id === producto.id)
      
      // Validar que todos los items en carrito sean del mismo asesor para despacho conjunto
      if (this.cartItems.length > 0) {
        const firstAsesor = this.cartItems[0].asesor
        if (producto.asesor && firstAsesor && producto.asesor !== firstAsesor) {
          uiFeedback.showSnackbar('Para coordinar el despacho, genera órdenes separadas para cada asesor', 'warning')
          return false
        }
      }

      if (existing) {
        existing.cantidad += cantidad
      } else {
        this.cartItems.push({
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          unidad_medida: producto.unidad_medida,
          asesor: producto.asesor,
          pais_origen: producto.pais_origen,
          fotos: producto.fotos,
          cantidad: cantidad
        })
      }

      uiFeedback.showSnackbar(`${producto.nombre} agregado al pedido`, 'success')
      return true
    },

    removeFromCart(productoId) {
      this.cartItems = this.cartItems.filter(i => i.id !== productoId)
    },

    clearCart() {
      this.cartItems = []
    },

    async crearOrdenPedido(datosCheckout) {
      const authStore = useAuthStore()
      const uiFeedback = useUiFeedbackStore()
      if (!this.cartItems.length) return null

      try {
        const subtotal = this.cartSubtotal
        const costoEnvio = datosCheckout.costoEnvio || 0
        const total = subtotal + costoEnvio

        const payload = {
          asesor: this.cartItems[0].asesor,
          hacienda: datosCheckout.haciendaId,
          comprador: authStore.user.id,
          items: this.cartItems.map(item => ({
            producto_id: item.id,
            nombre: item.nombre,
            precio_unitario: item.precio,
            cantidad: item.cantidad,
            unidad: item.unidad_medida,
            subtotal: item.precio * item.cantidad
          })),
          subtotal,
          costo_envio: costoEnvio,
          total,
          estado: datosCheckout.comprobanteFile ? 'pago_en_verificacion' : 'pendiente_pago',
          metodo_pago: datosCheckout.metodoPago || 'transferencia',
          datos_entrega: datosCheckout.datosEntrega || {},
          ingreso_bodega_auto: !!datosCheckout.ingresoBodegaAuto
        }

        let record
        if (datosCheckout.comprobanteFile) {
          const form = new FormData()
          Object.keys(payload).forEach(k => {
            if (typeof payload[k] === 'object') {
              form.append(k, JSON.stringify(payload[k]))
            } else {
              form.append(k, payload[k])
            }
          })
          form.append('comprobante_pago', datosCheckout.comprobanteFile)
          record = await pb.collection('asesor_pedidos').create(form)
        } else {
          record = await pb.collection('asesor_pedidos').create(payload)
        }

        this.clearCart()
        uiFeedback.showSnackbar(`Orden ${record.codigo_orden || ''} creada exitosamente`, 'success')
        await this.fetchMisCompras()
        return record
      } catch (err) {
        handleError(err, 'Error al generar orden de compra')
        throw err
      }
    },

    async fetchMisCompras() {
      const authStore = useAuthStore()
      if (!authStore.user?.id) return []

      this.loadingMisCompras = true
      try {
        const filter = authStore.user.hacienda
          ? `(comprador = "${authStore.user.id}" || hacienda = "${authStore.user.hacienda}")`
          : `comprador = "${authStore.user.id}"`

        const res = await pb.collection('asesor_pedidos').getFullList({
          filter,
          sort: '-created',
          expand: 'asesor,hacienda'
        })
        this.misCompras = res
        return res
      } catch (err) {
        console.warn('Error al cargar compras de la hacienda:', err)
        this.misCompras = []
        return []
      } finally {
        this.loadingMisCompras = false
      }
    },

    async confirmarRecepcionFirma(pedidoId, firmaData) {
      const uiFeedback = useUiFeedbackStore()
      try {
        const record = await pb.collection('asesor_pedidos').update(pedidoId, {
          estado: 'entregado',
          acta_recepcion_firma: firmaData
        })
        uiFeedback.showSnackbar('Recepción de productos confirmada y firmada digitalmente', 'success')
        await this.fetchMisCompras()
        return record
      } catch (err) {
        handleError(err, 'Error al confirmar recepción')
        throw err
      }
    }
  }
})
