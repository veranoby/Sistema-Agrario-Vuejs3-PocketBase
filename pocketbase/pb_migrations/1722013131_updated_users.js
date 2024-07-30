/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1iy9k7mh",
    "name": "role",
    "type": "select",
    "required": true,
    "presentable": true,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "administrador",
        "auditor",
        "colaborador"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1iy9k7mh",
    "name": "role",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "administrador",
        "auditor",
        "colaborador"
      ]
    }
  }))

  return dao.saveCollection(collection)
})
