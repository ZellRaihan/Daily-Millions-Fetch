const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOTTERY_BASE_URL = 'https://www.lottery.ie/results/daily-million/history';

async function getBuildId() {
  try {
    console.log(`Fetching HTML from ${LOTTERY_BASE_URL}...`);
    const response = await axios.get(LOTTERY_BASE_URL);
    
    // Extract the build ID from the HTML
    // The build ID is typically found in script tags loading Next.js data
    const html = response.data;
    
    // Look for the pattern in script tags
    const buildIdRegex = /"buildId":"([^"]+)"/;
    const match = html.match(buildIdRegex);
    
    if (match && match[1]) {
      const buildId = match[1];
      console.log(`Found build ID: ${buildId}`);
      
      // Construct the API URL with the new build ID
      const apiUrl = `https://www.lottery.ie/_next/data/${buildId}/en/results/daily-million/history.json`;
      console.log(`Complete API URL: ${apiUrl}`);
      
      // Update the .env file with the new API URL
      const envPath = path.join(__dirname, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace the existing API URL or add a new one
      if (envContent.includes('LOTTERY_API_URL=')) {
        envContent = envContent.replace(
          /LOTTERY_API_URL=.*/,
          `LOTTERY_API_URL=${apiUrl}`
        );
      } else {
        envContent += `\nLOTTERY_API_URL=${apiUrl}`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('.env file updated with the latest API URL');
      
      return buildId;
    } else {
      throw new Error('Build ID not found in the HTML response');
    }
  } catch (error) {
    console.error('Error fetching build ID:', error.message);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  getBuildId()
    .then(buildId => {
      console.log('Successfully updated build ID');
    })
    .catch(error => {
      console.error('Failed to update build ID:', error);
      process.exit(1);
    });
}

module.exports = { getBuildId }; 