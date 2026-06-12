import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090'); // Assuming local instance
async function test() {
  try {
    // Authenticate as superadmin or normal admin
    await pb.admins.authWithPassword('admin@example.com', 'admin1234');
    
    // Get schema for bitacora
    const collection = await pb.collections.getOne('bitacora');
    console.log("SCHEMA FIELDS:");
    collection.schema.forEach(f => console.log(f.name, f.type));
    
  } catch(e) {
    console.error(e.message);
  }
}
test();
