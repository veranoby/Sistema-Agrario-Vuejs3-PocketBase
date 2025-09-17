import { SyncQueue } from '@/utils/syncQueue'

// Create a test instance
const testQueue = new SyncQueue();

// Test the backoff delay calculation
console.log('Testing backoff delay calculation:');

for (let i = 0; i < 6; i++) {
  const delay = testQueue.calculateBackoffDelay(i);
  console.log(`Retry ${i}: ${delay}ms`);
}

// Test with multiple calls to see jitter effect
console.log('\nTesting jitter effect:');
for (let i = 0; i < 5; i++) {
  const delay = testQueue.calculateBackoffDelay(3); // Retry 3
  console.log(`Retry 3 attempt ${i + 1}: ${delay}ms`);
}

console.log('\nBackoff testing complete.');