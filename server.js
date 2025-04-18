const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const { getBuildId } = require('./getBuildId');
require('dotenv').config();

// Import cron job configuration
const { startCronJobs } = require('./cron-config');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection URI
const uri = process.env.MONGODB_URI;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Override console.log to fix bonus number display
const originalLog = console.log;
console.log = function() {
  const args = Array.from(arguments);
  
  // Check if this is a bonus number log
  if (args[0] === 'Bonus Number:' && Array.isArray(args[1])) {
    // Replace the array with its first value
    args[1] = args[1][0];
  }
  
  // Call the original console.log with fixed arguments
  originalLog.apply(console, args);
};

// Routes
app.get('/', async (req, res) => {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    const database = client.db('lottery_db');
    const collection = database.collection('daily_million_results');
    
    // Get the most recent results
    const results = await collection.find().sort({ 'storedAt': -1 }).limit(10).toArray();
    
    // Count incomplete results
    const incompleteCount = await collection.countDocuments({ isComplete: false });
    
    await client.close();
    
    res.render('index', { 
      results,
      incompleteCount
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.render('index', { 
      results: [], 
      error: 'Failed to fetch results',
      incompleteCount: 0
    });
  }
});

// Route to fetch latest results
app.get('/api/fetch-results', async (req, res) => {
  try {
    // Import the main fetching functionality
    const { main, fetchLotteryResults, storeResultsInMongoDB } = require('./fetchResults');
    
    // Get the latest results but don't store them yet
    const results = await fetchLotteryResults();
    
    // Check if this result already exists in MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    
    const database = client.db('lottery_db');
    const collection = database.collection('daily_million_results');
    
    // Get the latest draw date from the fetched results
    const latestDrawDate = results[0].standard.drawDates[0];
    
    // Check if this result already exists in the database
    const existingResult = await collection.findOne({
      'standard.drawDates': latestDrawDate
    });
    
    await client.close();
    
    if (existingResult) {
      // If existing result is incomplete, check if the new one is complete
      if (existingResult.isComplete === false) {
        // Try to update with complete data
        const { result, status } = await storeResultsInMongoDB(results);
        
        if (status === 'updated') {
          return res.json({ 
            success: true, 
            existed: true,
            updated: true,
            message: 'Results existed but were updated with complete information',
            data: result
          });
        } else {
          // Result exists but still incomplete
          return res.json({ 
            success: true, 
            existed: true,
            updated: false,
            message: 'Results exist but are still incomplete',
            data: existingResult
          });
        }
      } else {
        // Result already exists and is complete
        return res.json({ 
          success: true, 
          existed: true,
          updated: false,
          message: 'Complete results already exist in the database',
          data: existingResult
        });
      }
    } else {
      // Store the new result
      const { result, status } = await storeResultsInMongoDB(results);
      
      res.json({ 
        success: true, 
        existed: false,
        updated: false,
        complete: result.isComplete,
        message: `Successfully fetched and stored new results (${result.isComplete ? 'complete' : 'incomplete'})`,
        data: result
      });
    }
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch latest results',
      error: error.message
    });
  }
});

// Route to get incomplete results
app.get('/api/incomplete-results', async (req, res) => {
  try {
    const { getIncompleteResults } = require('./fetchResults');
    const incompleteResults = await getIncompleteResults();
    
    res.json({
      success: true,
      count: incompleteResults.length,
      data: incompleteResults
    });
  } catch (error) {
    console.error('Error fetching incomplete results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incomplete results',
      error: error.message
    });
  }
});

// Route to check and update incomplete results
app.get('/api/update-incomplete', async (req, res) => {
  try {
    const { getIncompleteResults, fetchLotteryResults, storeResultsInMongoDB } = require('./fetchResults');
    
    // First get all incomplete results
    const incompleteResults = await getIncompleteResults();
    
    if (incompleteResults.length === 0) {
      return res.json({
        success: true,
        message: 'No incomplete results found',
        updated: 0
      });
    }
    
    // Fetch latest results to see if any incomplete results can be updated
    const newResults = await fetchLotteryResults();
    
    // Track updates
    const updates = [];
    let updateCount = 0;
    
    // For each incomplete result, check if the new data has complete information
    for (const incompleteResult of incompleteResults) {
      // Find the matching result in the new data
      const matchingResult = newResults.find(r => 
        r.standard.drawDates[0] === incompleteResult.standard.drawDates[0]
      );
      
      if (matchingResult) {
        // Try to update it
        const { result, status } = await storeResultsInMongoDB([matchingResult]);
        
        if (status === 'updated') {
          updateCount++;
          updates.push({
            drawDate: incompleteResult.standard.drawDates[0],
            status: 'updated'
          });
        } else {
          updates.push({
            drawDate: incompleteResult.standard.drawDates[0],
            status: 'still-incomplete'
          });
        }
      }
    }
    
    res.json({
      success: true,
      message: `Checked ${incompleteResults.length} incomplete results, updated ${updateCount}`,
      updated: updateCount,
      details: updates
    });
    
  } catch (error) {
    console.error('Error updating incomplete results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update incomplete results',
      error: error.message
    });
  }
});

// Route to get all results from the database
app.get('/api/results', async (req, res) => {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    const database = client.db('lottery_db');
    const collection = database.collection('daily_million_results');
    
    // Get the most recent results
    const results = await collection.find().sort({ 'storedAt': -1 }).toArray();
    
    await client.close();
    
    res.json({ 
      success: true, 
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error fetching results from database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch results from database',
      error: error.message
    });
  }
});

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Status endpoint for cron jobs
app.get('/api/cron-status', (req, res) => {
  res.json({
    status: 'active',
    schedules: [
      {
        name: 'afternoon',
        time: '2:00-2:30 PM (Irish Time)',
        interval: 'Every 2 minutes'
      },
      {
        name: 'evening',
        time: '9:00-9:30 PM (Irish Time)',
        interval: 'Every 2 minutes'
      }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Start cron jobs if not in development mode
  if (process.env.NODE_ENV !== 'development') {
    startCronJobs();
  } else {
    console.log('Cron jobs not started in development mode. Use npm run cron to start them manually.');
  }
}); 