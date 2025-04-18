# Daily Million Results Fetcher

A Node.js application that fetches the latest Daily Million lottery results from the Irish National Lottery website and stores them in MongoDB. Includes a modern web interface to view and manage results.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables in the `.env` file:
   ```
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000 (optional, defaults to 3000)
   BASE_URL=https://your-app-url.com (for production cron jobs)
   ```

3. Run the application:
   - Web interface: `npm start`
   - CLI fetch only: `npm run fetch`
   - Scheduled fetching: `npm run schedule` or `npm run cron`

## Features

- Modern, responsive web interface to view and manage lottery results
- Automatically detects and uses the latest build ID from the lottery website
- Fetches the latest Daily Million and Daily Million Plus results
- Stores results in MongoDB with timestamps
- Avoids duplicate entries by checking existing records
- RESTful API endpoints for accessing and managing results
- Proper timezone handling for Irish lottery times
- Scheduled fetching via cron jobs at specific draw times

## Application Structure

- `server.js` - Main web server application with Express
- `fetchResults.js` - Core functionality for fetching and storing lottery results
- `getBuildId.js` - Helper to extract the latest build ID from the lottery website
- `cron-config.js` - Configuration for scheduled fetching via cron jobs
- `cron.js` - Standalone cron job runner
- `schedule.js` - Legacy scheduler script (12-hour intervals)

## Available Scripts

- `npm start` - Start the web server
- `npm run dev` - Start the web server with nodemon for development
- `npm run fetch` - Run a one-time fetch of the latest results (CLI mode)
- `npm run schedule` - Start the legacy scheduler (fetches every 12 hours)
- `npm run cron` - Start the cron job runner (fetches at 2-2:30 PM and 9-9:30 PM daily)
- `npm run cron-dev` - Start the cron job runner in development mode
- `npm run build-id` - Manual update of the build ID in the .env file

## API Endpoints

- `GET /` - Web interface homepage
- `GET /api/results` - Get all stored lottery results
- `GET /api/fetch-results` - Fetch and store the latest results
- `GET /api/health` - Health check endpoint for monitoring
- `GET /api/cron-status` - Status information about cron jobs

## Automated Fetching

The application uses cron jobs to automatically fetch results during the following intervals:

1. **Afternoon Draw**: Every 2 minutes between 2:00-2:30 PM (Irish Time)
2. **Evening Draw**: Every 2 minutes between 9:00-9:30 PM (Irish Time)

These times correspond to the official Daily Million draw times, with a buffer window to ensure results are captured.

## Deployment on Vercel

This application is configured for easy deployment on Vercel. The `vercel.json` file includes:

1. Configuration for the Node.js server
2. Routes to direct all traffic to the server
3. Cron job schedules that match the fetch windows

When deploying to Vercel:
1. Make sure to set the `MONGODB_URI` environment variable in your Vercel project settings
2. Update the `BASE_URL` in `vercel.json` to match your actual deployed URL
3. Vercel will automatically run the cron jobs at the specified times

## Build ID Management

The application includes automatic build ID management to ensure the API requests always use the latest URL:

1. The `getBuildId.js` script fetches the lottery website's HTML
2. It extracts the current build ID from the page
3. Updates the .env file with the correct API URL
4. This happens automatically before each data fetch

## Data Structure

The application stores lottery results with the following key information:
- Draw date and time (using Irish timezone)
- Winning numbers for both Daily Million and Daily Million Plus
- Bonus numbers
- Prize information and winners
- Timestamp of when the result was stored 