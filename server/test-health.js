import app from './src/app.js';

const PORT = 5001; // test port
const server = app.listen(PORT, async () => {
  try {
    const res = await fetch(`http://localhost:${PORT}/api/v1/health`);
    const json = await res.json();
    console.log(`Status Code: ${res.status}`);
    console.log('Response Body:', JSON.stringify(json, null, 2));
    if (res.status === 200 && json.status === 'ok') {
      console.log('Health check verification: PASSED');
    } else {
      console.error('Health check verification: FAILED');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Test error:', error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
