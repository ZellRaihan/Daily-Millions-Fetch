require('dotenv').config();
const axios = require('axios');
const { MongoClient, ObjectId } = require('mongodb');
const { getBuildId } = require('./getBuildId');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;

// Function to fetch lottery results
async function fetchLotteryResults() {
  try {
    // First, ensure we have the latest build ID and get the API URL directly
    const lotteryApiUrl = await getBuildId();
    
    console.log('Fetching lottery results...');
    const response = await axios.get(lotteryApiUrl);
    
    if (response.data && response.data.pageProps && response.data.pageProps.list) {
      console.log('Successfully fetched lottery results');
      return response.data.pageProps.list;
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error fetching lottery results:', error.message);
    throw error;
  }
}

// Function to check if result data is complete (has prize breakdown)
function isResultComplete(result) {
  // Check if main game has prizes
  const hasMainPrizes = result.standard && 
                        result.standard.prizes && 
                        Array.isArray(result.standard.prizes) && 
                        result.standard.prizes.length > 0 &&
                        result.standard.prizes.some(p => p.numberOfWinners > 0);
  
  // Check if Plus game has prizes (if it exists)
  let hasPlusPrizes = true;
  if (result.addonGames && result.addonGames.length > 0) {
    hasPlusPrizes = result.addonGames[0].prizes && 
                    Array.isArray(result.addonGames[0].prizes) && 
                    result.addonGames[0].prizes.length > 0 &&
                    result.addonGames[0].prizes.some(p => p.numberOfWinners > 0);
  }
  
  return hasMainPrizes && hasPlusPrizes;
}

// Function to store results in MongoDB
async function storeResultsInMongoDB(results) {
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  
  const client = new MongoClient(uri);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db('lottery_db');
    const collection = database.collection('daily_million_results');
    
    // Get the latest results (first item in the list)
    const latestResult = results[0];
    
    // Add a timestamp for when we stored this result
    latestResult.storedAt = new Date();
    
    // Check if the result is complete or has incomplete prize information
    latestResult.isComplete = isResultComplete(latestResult);
    
    // Check if this result already exists in the database
    const existingResult = await collection.findOne({
      'standard.drawDates': latestResult.standard.drawDates[0]
    });
    
    // If result exists but was incomplete and new one is complete, update it
    if (existingResult) {
      if (!existingResult.isComplete && latestResult.isComplete) {
        console.log('Found existing incomplete result. Updating with complete information...');
        const updateResult = await collection.updateOne(
          { _id: existingResult._id },
          { $set: { 
              standard: latestResult.standard,
              addonGames: latestResult.addonGames,
              isComplete: true,
              updatedAt: new Date()
            } 
          }
        );
        console.log(`Updated result with complete information: ${updateResult.modifiedCount} document modified`);
        
        // Retrieve and return the updated document
        const updatedResult = await collection.findOne({ _id: existingResult._id });
        return {
          result: updatedResult,
          status: 'updated'
        };
      } else {
        console.log('-------------------------');
        console.log('RESULTS ALREADY EXIST IN THE DATABASE');
        console.log('Draw Date:', new Date(existingResult.standard.drawDates[0]).toLocaleString('en-GB', {
          dateStyle: 'full',
          timeStyle: 'medium',
          timeZone: 'Europe/Dublin'
        }));
        console.log(`Complete: ${existingResult.isComplete ? 'Yes' : 'No'}`);
        console.log('-------------------------');
        return {
          result: existingResult,
          status: 'exists'
        };
      }
    } else {
      // Insert the new result
      const insertResult = await collection.insertOne(latestResult);
      console.log(`Inserted result with ID: ${insertResult.insertedId}`);
      console.log(`Complete: ${latestResult.isComplete ? 'Yes' : 'No'}`);
      
      // Return the newly inserted result
      return {
        result: latestResult,
        status: 'inserted'
      };
    }
  } catch (error) {
    console.error('Error storing results in MongoDB:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Function to get all incomplete results
async function getIncompleteResults() {
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const database = client.db('lottery_db');
    const collection = database.collection('daily_million_results');
    
    // Find all results marked as incomplete
    const incompleteResults = await collection
      .find({ isComplete: false })
      .sort({ 'standard.drawDates': -1 })
      .toArray();
    
    return incompleteResults;
  } catch (error) {
    console.error('Error fetching incomplete results:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

// Main function
async function main() {
  try {
    const results = await fetchLotteryResults();
    const { result: storedResult, status } = await storeResultsInMongoDB(results);
    
    // Extract the bonus numbers properly
    const mainBonusNumber = Array.isArray(storedResult.standard.grids[0].additional) 
      ? storedResult.standard.grids[0].additional[0] 
      : storedResult.standard.grids[0].additional;
    
    // Format date in Irish timezone
    const drawDate = new Date(storedResult.standard.drawDates[0]);
    const options = {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Europe/Dublin'
    };
    const formattedDate = drawDate.toLocaleString('en-GB', options);
    
    console.log('Latest Daily Million Results:');
    console.log('Draw Date (Irish Time):', formattedDate);
    console.log('Numbers:', storedResult.standard.grids[0].standard.join(','));
    console.log('Bonus Number:', mainBonusNumber);
    console.log('Complete:', storedResult.isComplete ? 'Yes' : 'No');
    console.log('Status:', status);
    
    if (storedResult.addonGames && storedResult.addonGames.length > 0) {
      const plusBonusNumber = Array.isArray(storedResult.addonGames[0].grids[0].additional)
        ? storedResult.addonGames[0].grids[0].additional[0]
        : storedResult.addonGames[0].grids[0].additional;
      
      console.log('\nDaily Million Plus Results:');
      console.log('Numbers:', storedResult.addonGames[0].grids[0].standard.join(','));
      console.log('Bonus Number:', plusBonusNumber);
    }
    
    return storedResult;
  } catch (error) {
    console.error('Error in main function:', error);
    throw error;
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main()
    .then(() => console.log('Fetch completed successfully'))
    .catch(error => console.error('Fetch failed:', error));
}

module.exports = { 
  fetchLotteryResults, 
  storeResultsInMongoDB, 
  main,
  getIncompleteResults,
  isResultComplete
}; 