# Air Quality SQL Query Tool

A web application for uploading CSV files, running SQL queries, and visualizing air quality data.

## Features

- Upload CSV files up to 1GB
- Execute arbitrary SQL queries
- View results in tabular format
- Automatic summary statistics
- Distribution visualizations
- End-to-end testing capability

## Deployed:
Link: https://vercel.com/wyatt-neiguts-projects/air-quality-sql-tool

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) (should open automatically)

## Usage

1. Upload a CSV file containing air quality data
2. Write SQL queries using `tablename` as the table name
3. Execute queries to see results, statistics, and visualizations
4. Use the test button to verify all functionality

## Technologies Utilized

- React 18
- Papa Parse (CSV parsing)
- AlaSQL (SQL engine)
- Recharts (visualizations)
- Tailwind CSS (styling)
- Lucide React (icons)
