require('dotenv').config();
const { startCronJobs } = require('./cron-config');

console.log('Starting cron job runner for Daily Million Results...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:3000'}`);

// Start the cron jobs
startCronJobs();

// Keep the process running
console.log('Cron job runner is active. Press Ctrl+C to stop.');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down cron jobs...');
  const { stopCronJobs } = require('./cron-config');
  stopCronJobs();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down cron jobs...');
  const { stopCronJobs } = require('./cron-config');
  stopCronJobs();
  process.exit(0);
}); 