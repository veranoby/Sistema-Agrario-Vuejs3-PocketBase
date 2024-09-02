/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("k71wbkdxsz67mvy")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ekrkculg",
    "name": "auditores",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("k71wbkdxsz67mvy")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ekrkculg",
    "name": "supervisores",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
})
