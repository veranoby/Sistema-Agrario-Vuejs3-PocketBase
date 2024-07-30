/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "hh6op9bbhdtkkf7",
    "created": "2024-07-26 17:14:46.023Z",
    "updated": "2024-07-26 17:14:46.023Z",
    "name": "HaciendaLabel",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "llsqobz0",
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "lbvhhnqm",
        "name": "info",
        "type": "editor",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "convertUrls": false
        }
      },
      {
        "system": false,
        "id": "hnrhfcdq",
        "name": "location",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("hh6op9bbhdtkkf7");

  return dao.deleteCollection(collection);
})
