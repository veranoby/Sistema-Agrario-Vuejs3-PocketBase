/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  // Colección: modulos
  const collection_modulos = new Collection({
    "id": "modulos_xxx",
    "name": "modulos",
    "type": "base",
    "system": false,
    "schema": [
      {
        "id": "name",
        "name": "name",
        "type": "text",
        "required": true,
        "unique": false
      },
      {
        "id": "code",
        "name": "code",
        "type": "text",
        "required": true,
        "unique": true
      },
      {
        "id": "description",
        "name": "description",
        "type": "text",
        "required": false,
        "unique": false
      },
      {
        "id": "price_monthly",
        "name": "price_monthly",
        "type": "number",
        "required": true,
        "unique": false
      },
      {
        "id": "price_yearly",
        "name": "price_yearly",
        "type": "number",
        "required": true,
        "unique": false
      },
      {
        "id": "category",
        "name": "category",
        "type": "select",
        "required": true,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "users",
            "haciendas",
            "ai",
            "reports",
            "storage",
            "support",
            "bitacoras_avanzadas",
            "programaciones_inteligentes",
            "alertas_proactivas",
            "auditoria_bpa"
          ]
        }
      },
      {
        "id": "is_active",
        "name": "is_active",
        "type": "bool",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "icon",
        "name": "icon",
        "type": "text",
        "required": false,
        "unique": false
      }
    ],
    "indexes": [
      "CREATE INDEX idx_modulos_category ON modulos (category)",
      "CREATE UNIQUE INDEX idx_modulos_code ON modulos (code)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.id != \"\" && @request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.id != \"\" && @request.auth.role = \"superadmin\""
  })

  // Colección: subscriptions
  const collection_subscriptions = new Collection({
    "id": "subscriptions_xxx",
    "name": "subscriptions",
    "type": "base",
    "system": false,
    "schema": [
      {
        "id": "hacienda",
        "name": "hacienda",
        "type": "relation",
        "required": true,
        "unique": false,
        "options": {
          "collectionId": "haciendas_collection_id",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": ["name"]
        }
      },
      {
        "id": "modulo",
        "name": "modulo",
        "type": "relation",
        "required": true,
        "unique": false,
        "options": {
          "collectionId": "modulos_xxx",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": ["name"]
        }
      },
      {
        "id": "is_active",
        "name": "is_active",
        "type": "bool",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "start_date",
        "name": "start_date",
        "type": "date",
        "required": true,
        "unique": false
      },
      {
        "id": "end_date",
        "name": "end_date",
        "type": "date",
        "required": false,
        "unique": false
      },
      {
        "id": "billing_cycle",
        "name": "billing_cycle",
        "type": "select",
        "required": true,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": ["monthly", "yearly"]
        }
      },
      {
        "id": "price_paid",
        "name": "price_paid",
        "type": "number",
        "required": false,
        "unique": false
      }
    ],
    "indexes": [
      "CREATE INDEX idx_subscriptions_hacienda ON subscriptions (hacienda)",
      "CREATE INDEX idx_subscriptions_modulo ON subscriptions (modulo)",
      "CREATE INDEX idx_subscriptions_active ON subscriptions (is_active)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.id != \"\" && @request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.id != \"\" && @request.auth.role = \"superadmin\""
  })

  return db.importCollections([collection_modulos, collection_subscriptions], true)
}, (db) => {
  // Rollback
  db.importCollection("modulos_xxx")
  db.importCollection("subscriptions_xxx")
})
