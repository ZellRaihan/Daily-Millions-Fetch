const axios = require('axios');
const fs = require('fs');
const path = require('path');

const LOTTERY_BASE_URL = 'https://www.lottery.ie/results/daily-million/history';

// Global variable to store the latest API URL
let cachedApiUrl = null;

async function getBuildId() {
  try {
    // If we already have a cached URL, return it
    if (cachedApiUrl) {
      console.log('Using cached API URL:', cachedApiUrl);
      return cachedApiUrl;
    }
    
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
      
      // Store in cache for future use
      cachedApiUrl = apiUrl;
      
      // Try to write to .env file if possible (for local development)
      try {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
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
        }
      } catch (error) {
        // Just log the error but don't fail - this is expected in serverless environments
        console.log('Could not update .env file (expected in serverless environments):', error.message);
      }
      
      return apiUrl;
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
    .then(url => {
      console.log('Successfully updated build ID');
      console.log('API URL:', url);
    })
    .catch(error => {
      console.error('Failed to update build ID:', error);
      process.exit(1);
    });
}

module.exports = { getBuildId }; 