/**
 * Utilidad para firmas digitales usando Web Crypto API
 * No requiere servicios externos - completamente en el cliente
 * 
 * @module utils/digitalSignature
 */

import { logger } from '@/utils/logger'

/**
 * Clase para firmas digitales usando Web Crypto API
 */
export class DigitalSignature {
  constructor() {
    this.keyPair = null
  }

  /**
   * Genera par de claves RSA para el usuario
   * @returns {Promise<CryptoKeyPair>} Par de claves generadas
   */
  async generateKeyPair() {
    try {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['sign', 'verify']
      )

      // Guardar en IndexedDB
      await this.saveKeyPair()

      logger.info('[DigitalSignature] Par de claves generado exitosamente')
      return this.keyPair
    } catch (error) {
      logger.error('[DigitalSignature] Error generando claves:', error)
      throw error
    }
  }

  /**
   * Firma un dato (por ejemplo, un ID de bitácora + timestamp)
   * @param {Object} data - Datos a firmar
   * @returns {Promise<Object>} Datos firmados con signature
   */
  async sign(data) {
    if (!this.keyPair) {
      await this.loadKeyPair()
    }

    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(JSON.stringify(data))

    const signature = await window.crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      this.keyPair.privateKey,
      dataBuffer
    )

    // Convertir a base64
    const signatureArray = Array.from(new Uint8Array(signature))
    const signatureBase64 = btoa(String.fromCharCode.apply(null, signatureArray))

    return {
      data,
      signature: signatureBase64,
      algorithm: 'RSASSA-PKCS1-v1_5',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Verifica una firma
   * @param {Object} signedData - Datos firmados
   * @returns {Promise<boolean>} True si la firma es válida
   */
  async verify(signedData) {
    const { data, signature } = signedData

    if (!this.keyPair) {
      await this.loadKeyPair()
    }

    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(JSON.stringify(data))

    const signatureArray = Uint8Array.from(atob(signature), c => c.charCodeAt(0))

    const isValid = await window.crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      this.keyPair.publicKey,
      signatureArray,
      dataBuffer
    )

    logger.info(`[DigitalSignature] Verificación: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`)
    return isValid
  }

  /**
   * Guarda el par de claves en IndexedDB
   * @private
   */
  async saveKeyPair() {
    const publicKey = await window.crypto.subtle.exportKey(
      'spki',
      this.keyPair.publicKey
    )
    const privateKey = await window.crypto.subtle.exportKey(
      'pkcs8',
      this.keyPair.privateKey
    )

    const db = await this.openDB()
    const tx = db.transaction('keys', 'readwrite')
    const store = tx.objectStore('keys')
    await store.put({
      id: 'user-key-pair',
      publicKey: Array.from(new Uint8Array(publicKey)),
      privateKey: Array.from(new Uint8Array(privateKey))
    })

    logger.info('[DigitalSignature] Claves guardadas en IndexedDB')
  }

  /**
   * Carga el par de claves desde IndexedDB
   * @private
   */
  async loadKeyPair() {
    const db = await this.openDB()
    const tx = db.transaction('keys', 'readonly')
    const store = tx.objectStore('keys')
    const result = await store.get('user-key-pair')

    if (!result) {
      throw new Error('No se encontraron claves. Genera un par de claves primero.')
    }

    const publicKeyData = new Uint8Array(result.publicKey)
    const privateKeyData = new Uint8Array(result.privateKey)

    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      publicKeyData.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['verify']
    )

    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyData.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['sign']
    )

    this.keyPair = { publicKey, privateKey }
    logger.info('[DigitalSignature] Claves cargadas desde IndexedDB')
  }

  /**
   * Abre/crea IndexedDB para almacenar claves
   * @private
   * @returns {Promise<IDBDatabase>}
   */
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DigitalSignatureDB', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys')
        }
      }
    })
  }
}

/**
 * Verifica si el navegador soporta Web Crypto API
 * @returns {boolean}
 */
export function isWebCryptoSupported() {
  return !!(window.crypto && window.crypto.subtle)
}

/**
 * Instancia global de DigitalSignature
 */
export const digitalSignature = new DigitalSignature()
