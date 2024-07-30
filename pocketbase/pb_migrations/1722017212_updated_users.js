/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  // remove
  collection.schema.removeField("ldgu5y2l")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qpzwfqr6",
    "name": "hacienda",
    "type": "relation",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "hh6op9bbhdtkkf7",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ldgu5y2l",
    "name": "hacienda",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // remove
  collection.schema.removeField("qpzwfqr6")

  return dao.saveCollection(collection)
})
