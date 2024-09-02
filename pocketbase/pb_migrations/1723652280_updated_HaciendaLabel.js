/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hh6op9bbhdtkkf7")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kyvfidgj",
    "name": "plan",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "k71wbkdxsz67mvy",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hh6op9bbhdtkkf7")

  // remove
  collection.schema.removeField("kyvfidgj")

  return dao.saveCollection(collection)
})
