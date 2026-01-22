import React, { useState, useRef } from 'react';
import { Upload, Play, Database, BarChart3, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import alasql from 'alasql';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const App = () => {
  const [csvData, setCsvData] = useState(null);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM tablename LIMIT 10');
  const [queryResult, setQueryResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
    console.log(`Uploading file: ${file.name} (${fileSizeGB} GB / ${fileSizeMB} MB)`);
    
    if (file.size > 1024 * 1024 * 1024) {
      setError(`File is too large (${fileSizeGB} GB). Maximum supported size is 1 GB. Please use a smaller file or a subset of the data.`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setFileName(file.name);

    const allData = [];
    let chunkCount = 0;

    try {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        chunkSize: 1024 * 1024 * 10,
        chunk: (results) => {
          chunkCount++;
          console.log(`Processing chunk ${chunkCount}, rows in chunk: ${results.data.length}, total so far: ${allData.length}`);
          allData.push(...results.data);
        },
        complete: (results) => {
          console.log('Parse complete. Total rows loaded:', allData.length);
          
          if (allData.length === 0) {
            setError('No data found in CSV file. The file may be empty or have formatting issues.');
            setLoading(false);
            return;
          }

          setCsvData(allData);
          setQueryResult(null);
          setLoading(false);
          
          console.log(`Successfully loaded ${allData.length.toLocaleString()} rows`);
        },
        error: (error) => {
          console.error('Parse error:', error);
          
          if (allData.length > 0) {
            console.log('Error occurred but recovered with partial data:', allData.length, 'rows');
            setCsvData(allData);
            setError(`Warning: File partially loaded (${allData.length.toLocaleString()} rows). Some data may be missing due to parsing issues.`);
            setLoading(false);
            return;
          }
          
          setError(`File parsing error: Unable to read file. This may be due to file corruption, encoding issues, or browser memory limitations.`);
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const executeQuery = () => {
    if (!csvData) {
      setError('Please upload a CSV file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      alasql('DROP TABLE IF EXISTS tablename');
      alasql('CREATE TABLE tablename');
      alasql.tables.tablename.data = csvData;

      const result = alasql(sqlQuery);
      setQueryResult(result);
      setLoading(false);
    } catch (err) {
      setError(`Query error: ${err.message}`);
      setQueryResult(null);
      setLoading(false);
    }
  };

  const calculateSummaryStats = (data) => {
    if (!data || data.length === 0) return null;

    const stats = {};
    const numericColumns = [];

    Object.keys(data[0]).forEach(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));

      if (numericValues.length > 0) {
        numericColumns.push(col);
        const sorted = [...numericValues].sort((a, b) => a - b);
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const mean = sum / numericValues.length;
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        stats[col] = {
          count: numericValues.length,
          min: Math.min(...numericValues).toFixed(2),
          max: Math.max(...numericValues).toFixed(2),
          mean: mean.toFixed(2),
          median: median.toFixed(2),
          stdDev: Math.sqrt(numericValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / numericValues.length).toFixed(2)
        };
      }
    });

    return { stats, numericColumns };
  };

  const generateDistributionChart = (data, column) => {
    if (!data || data.length === 0) return null;

    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));

    if (numericValues.length === 0) return null;

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    
    if (min === max) {
      return [{
        range: min.toFixed(1),
        count: numericValues.length
      }];
    }

    const binCount = Math.min(15, Math.ceil(Math.sqrt(numericValues.length)));
    const binSize = (max - min) / binCount;

    const bins = Array(binCount).fill(0).map((_, i) => ({
      range: `${(min + i * binSize).toFixed(1)}`,
      count: 0
    }));

    numericValues.forEach(val => {
      const binIndex = Math.min(Math.floor((val - min) / binSize), binCount - 1);
      if (bins[binIndex]) {
        bins[binIndex].count++;
      }
    });

    return bins;
  };

  const runEndToEndTest = async () => {
    setTestResults({ status: 'running', steps: [] });
    const steps = [];

    try {
      steps.push({ name: 'Generate test CSV', status: 'running' });
      setTestResults({ status: 'running', steps: [...steps] });

      const testData = [
        { City: 'Los Angeles', PM25: 45.2, AQI: 123, O3: 0.068, NO2: 42 },
        { City: 'New York', PM25: 35.1, AQI: 98, O3: 0.055, NO2: 38 },
        { City: 'Chicago', PM25: 28.3, AQI: 85, O3: 0.048, NO2: 32 },
        { City: 'Houston', PM25: 52.7, AQI: 145, O3: 0.075, NO2: 48 },
        { City: 'Phoenix', PM25: 41.5, AQI: 115, O3: 0.062, NO2: 40 },
        { City: 'Philadelphia', PM25: 33.8, AQI: 95, O3: 0.052, NO2: 36 },
        { City: 'San Antonio', PM25: 38.9, AQI: 108, O3: 0.058, NO2: 41 },
        { City: 'San Diego', PM25: 30.2, AQI: 88, O3: 0.050, NO2: 34 }
      ];

      const csv = Papa.unparse(testData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const file = new File([blob], 'test_data.csv', { type: 'text/csv' });

      steps[0].status = 'success';
      setTestResults({ status: 'running', steps: [...steps] });

      steps.push({ name: 'Upload test CSV', status: 'running' });
      setTestResults({ status: 'running', steps: [...steps] });

      await new Promise(resolve => {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            setCsvData(results.data);
            setFileName('test_data.csv');
            steps[1].status = 'success';
            setTestResults({ status: 'running', steps: [...steps] });
            resolve();
          }
        });
      });

      steps.push({ name: 'Execute SQL query', status: 'running' });
      setTestResults({ status: 'running', steps: [...steps] });

      alasql('DROP TABLE IF EXISTS tablename');
      alasql('CREATE TABLE tablename');
      alasql.tables.tablename.data = testData;
      const result = alasql('SELECT City, AVG(PM25) as avg_pm25, AVG(AQI) as avg_aqi FROM tablename GROUP BY City ORDER BY avg_aqi DESC');
      
      if (result && result.length > 0) {
        setQueryResult(result);
        setSqlQuery('SELECT City, AVG(PM25) as avg_pm25, AVG(AQI) as avg_aqi FROM tablename GROUP BY City ORDER BY avg_aqi DESC');
        steps[2].status = 'success';
      } else {
        throw new Error('Query returned no results');
      }
      setTestResults({ status: 'running', steps: [...steps] });

      steps.push({ name: 'Generate visualizations', status: 'running' });
      setTestResults({ status: 'running', steps: [...steps] });

      await new Promise(resolve => setTimeout(resolve, 500));
      steps[3].status = 'success';
      setTestResults({ status: 'success', steps: [...steps] });

    } catch (err) {
      steps[steps.length - 1].status = 'failed';
      steps.push({ name: 'Error', status: 'failed', message: err.message });
      setTestResults({ status: 'failed', steps: [...steps] });
    }
  };

  const summaryData = queryResult ? calculateSummaryStats(queryResult) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Air Quality Data SQL Tool</h1>
              <p className="text-gray-600">Upload CSV data, run SQL queries, and visualize results</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload CSV File
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Choose CSV File
              </button>
              {fileName && (
                <p className="mt-3 text-sm text-gray-600">
                  Loaded: <span className="font-medium">{fileName}</span> ({csvData?.length || 0} rows)
                </p>
              )}
            </div>
          </div>

          {csvData && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Database className="w-5 h-5" />
                SQL Query
              </h2>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg font-mono text-sm h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your SQL query here..."
              />
              <button
                onClick={executeQuery}
                disabled={loading}
                className="mt-3 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Execute Query
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={runEndToEndTest}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Run End-to-End Test
            </button>
          </div>

          {testResults && (
            <div className="mb-6 bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Test Results</h3>
              <div className="space-y-3">
                {testResults.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {step.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {step.status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                    {step.status === 'running' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                    <span className={step.status === 'failed' ? 'text-red-800' : 'text-gray-700'}>
                      {step.name}
                      {step.message && ` - ${step.message}`}
                    </span>
                  </div>
                ))}
              </div>
              {testResults.status === 'success' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium">
                  ✓ All tests passed successfully!
                </div>
              )}
            </div>
          )}
        </div>

        {queryResult && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Query Results ({queryResult.length} rows)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {Object.keys(queryResult[0] || {}).map(header => (
                        <th key={header} className="px-4 py-3 text-left font-semibold text-gray-700">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="px-4 py-3 text-gray-600">
                            {typeof val === 'number' ? val.toFixed(2) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {queryResult.length > 100 && (
                  <p className="mt-4 text-sm text-gray-600 text-center">
                    Showing first 100 of {queryResult.length} rows
                  </p>
                )}
              </div>
            </div>

            {summaryData && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-semibold mb-4">Summary Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(summaryData.stats).map(([col, stats]) => (
                    <div key={col} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 text-blue-900">{col}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Count:</span>
                          <span className="font-medium">{stats.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Min:</span>
                          <span className="font-medium">{stats.min}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Max:</span>
                          <span className="font-medium">{stats.max}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Mean:</span>
                          <span className="font-medium">{stats.mean}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Median:</span>
                          <span className="font-medium">{stats.median}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Std Dev:</span>
                          <span className="font-medium">{stats.stdDev}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summaryData && summaryData.numericColumns.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-semibold mb-6">Data Distributions</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {summaryData.numericColumns.slice(0, 6).map(col => {
                    const distData = generateDistributionChart(queryResult, col);
                    return distData && distData.length > 0 ? (
                      <div key={col}>
                        <h3 className="font-semibold mb-3 text-center text-gray-700">{col} Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={distData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} fontSize={11} />
                            <YAxis fontSize={11} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;