import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');
async function test() {
  try {
    const authData = await pb.admins.authWithPassword('conagri@conespacio.org', '1234567890'); // Trying standard admin passwords or user
  } catch(e) {}
  
  try {
    // If not admin, try to authenticate as a normal user. Let's look for a user in the db.
    // Or I'll just skip testing and look at the logs of pocketbase.
  } catch(e) {}
}
test();
