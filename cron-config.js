const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

// Set up the base URL for the fetch endpoint
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FETCH_ENDPOINT = '/api/fetch-results';
const UPDATE_INCOMPLETE_ENDPOINT = '/api/update-incomplete';

// Format timestamp for logs
function getTimestamp() {
  return new Date().toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Europe/Dublin'
  });
}

// Function to fetch results from the API
async function fetchResults() {
  const timestamp = getTimestamp();
  
  console.log(`[${timestamp}] Attempting to fetch latest lottery results...`);
  
  try {
    const response = await axios.get(`${BASE_URL}${FETCH_ENDPOINT}`);
    
    if (response.data.success) {
      if (response.data.existed) {
        if (response.data.updated) {
          console.log(`[${timestamp}] Existing result was updated with complete information!`);
        } else {
          console.log(`[${timestamp}] Results already exist in the database.`);
        }
      } else {
        console.log(`[${timestamp}] Successfully fetched and stored new results!`);
        console.log(`[${timestamp}] Complete: ${response.data.complete ? 'Yes' : 'No'}`);
      }
    } else {
      console.error(`[${timestamp}] Error: ${response.data.message}`);
    }
  } catch (error) {
    console.error(`[${timestamp}] Failed to fetch results: ${error.message}`);
  }
}

// Function to check and update incomplete results
async function updateIncompleteResults() {
  const timestamp = getTimestamp();
  
  console.log(`[${timestamp}] Checking for incomplete results to update...`);
  
  try {
    const response = await axios.get(`${BASE_URL}${UPDATE_INCOMPLETE_ENDPOINT}`);
    
    if (response.data.success) {
      if (response.data.updated > 0) {
        console.log(`[${timestamp}] Updated ${response.data.updated} incomplete results!`);
      } else {
        console.log(`[${timestamp}] ${response.data.message}`);
      }
    } else {
      console.error(`[${timestamp}] Error: ${response.data.message}`);
    }
  } catch (error) {
    console.error(`[${timestamp}] Failed to update incomplete results: ${error.message}`);
  }
}

// Configure cron jobs

// 2:00 PM to 2:30 PM, every 2 minutes (Irish time)
// Cron format: minute hour day-of-month month day-of-week
// */2 14 * * * means every 2 minutes between 2:00-2:59 PM every day
const afternoonFetch = cron.schedule('*/2 14 * * *', fetchResults, {
  scheduled: false,
  timezone: 'Europe/Dublin'
});

// 9:00 PM to 9:30 PM, every 2 minutes (Irish time)
// */2 21 * * * means every 2 minutes between 9:00-9:59 PM every day
const eveningFetch = cron.schedule('*/2 21 * * *', fetchResults, {
  scheduled: false,
  timezone: 'Europe/Dublin'
});

// Check for incomplete results every hour during active periods
// 0 15,16,17,22,23 * * * means at minute 0 of hours 15,16,17,22,23 every day
const updateIncomplete = cron.schedule('0 15,16,17,22,23 * * *', updateIncompleteResults, {
  scheduled: false,
  timezone: 'Europe/Dublin'
});

// Check for incomplete results early morning to catch any overnight updates
// 0 8 * * * means at 8:00 AM every day
const morningUpdateCheck = cron.schedule('0 8 * * *', updateIncompleteResults, {
  scheduled: false,
  timezone: 'Europe/Dublin'
});

// Function to start the cron jobs
function startCronJobs() {
  console.log('Starting cron jobs for automatic fetching...');
  console.log('- Every 2 minutes between 2:00-2:30 PM (Irish time)');
  console.log('- Every 2 minutes between 9:00-9:30 PM (Irish time)');
  console.log('- Checking for incomplete results at 3 PM, 4 PM, 5 PM, 10 PM, 11 PM (Irish time)');
  console.log('- Morning check for incomplete results at 8 AM (Irish time)');
  
  afternoonFetch.start();
  eveningFetch.start();
  updateIncomplete.start();
  morningUpdateCheck.start();
  
  // Run the update check immediately on startup
  updateIncompleteResults();
}

// Function to stop the cron jobs
function stopCronJobs() {
  console.log('Stopping all cron jobs...');
  afternoonFetch.stop();
  eveningFetch.stop();
  updateIncomplete.stop();
  morningUpdateCheck.stop();
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  fetchResults, // Export for manual triggering
  updateIncompleteResults // Export for manual triggering
}; 