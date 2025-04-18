const { exec } = require('child_process');
const path = require('path');
const { getBuildId } = require('./getBuildId');

// Get the script path
const scriptPath = path.join(__dirname, 'fetchResults.js');

console.log('Starting Daily Million Results Scheduler');
console.log(`Script path: ${scriptPath}`);
console.log('The application will fetch results every 12 hours');

// Function to run the main script
async function runScript() {
  const now = new Date().toLocaleString();
  console.log(`[${now}] Running fetch script...`);
  
  try {
    // First update the build ID
    console.log('Updating build ID before fetching results...');
    await getBuildId();
    
    // Then run the main script
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error.message}`);
        return;
      }
      
      if (stderr) {
        console.error(`Script stderr: ${stderr}`);
        return;
      }
      
      console.log(`Script output: ${stdout}`);
      console.log(`[${new Date().toLocaleString()}] Fetch completed`);
    });
  } catch (error) {
    console.error(`Error updating build ID: ${error.message}`);
  }
}

// Run immediately on start
runScript();

// Schedule to run every 12 hours (in milliseconds)
const twelveHours = 12 * 60 * 60 * 1000;
setInterval(runScript, twelveHours);

console.log('Scheduler is running. Press Ctrl+C to stop.'); 