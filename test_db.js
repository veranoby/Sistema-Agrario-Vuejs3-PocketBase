import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');
const records = await pb.collection('system_config').getFullList();
console.log(JSON.stringify(records, null, 2));
