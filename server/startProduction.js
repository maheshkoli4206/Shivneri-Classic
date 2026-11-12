/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)
 * SCRIPT: startProduction.js
 * 
 * UNIFIED PRODUCTION STACK LAUNCHER
 * 
 * Orchestrates:
 * 1. Express API backend on http://127.0.0.1:5000 (connected to production MongoDB).
 * 2. Production HTTPS Reverse Proxy on https://localhost:5443 (terminates TLS,
 *    proxies /api to backend, and serves client/dist SPA).
 * 3. Graceful shutdown coordination for both services.
 * ==============================================================================
 */

import 'dotenv/config';
import connectDB from './src/config/db.js';
import app from './src/app.js';
import { createHttpsReverseProxy } from './src/httpsProxy.js';

const BACKEND_PORT = parseInt(process.env.PORT || '5000', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '5443', 10);

async function startProductionStack() {
  console.log('==============================================================================');
  console.log('🏛️  SHIVNERI CLASSIC APARTMENT – PRODUCTION SYSTEM STARTUP');
  console.log('ENVIRONMENT : PRODUCTION (NODE_ENV=production)');
  console.log('==============================================================================\n');

  // 1. Connect to MongoDB
  console.log('Connecting to Production Database...');
  await connectDB();

  // 2. Start Express Backend
  const backendServer = app.listen(BACKEND_PORT, '127.0.0.1', () => {
    console.log(`✓ Backend API listening on: http://127.0.0.1:${BACKEND_PORT}`);
  });

  // 3. Start HTTPS Reverse Proxy
  const LAN_IP = process.env.LAN_IP || '192.168.1.13';

  // Specific LAN interface listener (Serves LAN devices and DuckDNS domain)
  const httpsProxyLan = createHttpsReverseProxy();
  httpsProxyLan.listen(HTTPS_PORT, LAN_IP, () => {
    console.log(`✓ HTTPS Reverse Proxy (LAN) listening on: https://${LAN_IP}:${HTTPS_PORT}`);
    console.log(`  -> LAN Web App:      https://${LAN_IP}:${HTTPS_PORT}`);
    console.log(`  -> DuckDNS Hostname: https://shivneri.duckdns.org:${HTTPS_PORT}`);
  });

  // Dedicated Loopback listener (Serves local machine and Tailscale port 443 forwarder)
  const httpsProxyLocal = createHttpsReverseProxy();
  httpsProxyLocal.listen(HTTPS_PORT, '127.0.0.1', () => {
    console.log(`✓ HTTPS Reverse Proxy (Localhost & Tailscale) listening on: https://localhost:${HTTPS_PORT}`);
    console.log(`  -> Health Check:     https://localhost:${HTTPS_PORT}/api/v1/health`);
    console.log('\n==============================================================================');
    console.log('🎉 SHIVNERI CLASSIC PRODUCTION SYSTEM IS FULLY ACTIVE AND SECURE ON LAN & TAILSCALE!');
    console.log('==============================================================================\n');
  });

  // Coordinated Graceful Shutdown
  const handleShutdown = (signal) => {
    console.log(`\nReceived ${signal}: Gracefully shutting down production stack...`);
    let closedCount = 0;
    const onProxyClosed = () => {
      closedCount++;
      if (closedCount === 2) {
        console.log('  ✓ HTTPS Reverse Proxies closed.');
        backendServer.close(() => {
          console.log('  ✓ Backend API server closed.');
          process.exit(0);
        });
      }
    };
    httpsProxyLan.close(onProxyClosed);
    httpsProxyLocal.close(onProxyClosed);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startProductionStack().catch((err) => {
  console.error('\n❌ FATAL: Production stack failed to start:');
  console.error(err.message);
  process.exit(1);
});

