# Air Quality SQL Query Tool

A web application for uploading CSV files, running SQL queries, and visualizing air quality data.

## Features

- Upload CSV files up to 1GB
- Execute arbitrary SQL queries
- View results in tabular format
- Automatic summary statistics
- Distribution visualizations
- End-to-end testing capability

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Deploy (Vercel auto-detects React apps)

### Build for Production

```bash
npm run build
```

## Usage

1. Upload a CSV file containing air quality data
2. Write SQL queries using `tablename` as the table name
3. Execute queries to see results, statistics, and visualizations
4. Use the test button to verify all functionality

## Technologies

- React 18
- Papa Parse (CSV parsing)
- AlaSQL (SQL engine)
- Recharts (visualizations)
- Tailwind CSS (styling)
- Lucide React (icons)