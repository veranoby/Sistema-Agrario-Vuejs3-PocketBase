const pb = require('./node_modules/pocketbase');
const client = new pb('https://conagri.conespacio.org');

async function test() {
  try {
    const list = await client.collection('recetas').getList(1, 1);
    if(list.items.length > 0) {
      console.log("Recetas keys:", Object.keys(list.items[0]));
    } else {
      console.log("No recetas found, checking error when querying by vinculacion_id");
      await client.collection('recetas').getList(1, 1, { filter: 'vinculacion_id="123"' });
    }
  } catch(e) {
    console.error("Error with vinculacion_id:", e.message);
    try {
      console.log("Testing with vinculacion:");
      await client.collection('recetas').getList(1, 1, { filter: 'vinculacion="123"' });
      console.log("Success with vinculacion!");
    } catch(e2) {
      console.error("Error with vinculacion:", e2.message);
      try {
        console.log("Testing with asesor_id:");
        await client.collection('recetas').getList(1, 1, { filter: 'asesor_id="123"' });
        console.log("Success with asesor_id!");
      } catch(e3) {
        console.error("Error with asesor_id:", e3.message);
      }
    }
  }
}
test();
