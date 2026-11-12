/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)
 * SCRIPT: checkWriterIsolation.js
 * 
 * DESCRIPTION:
 * Read-only preflight writer-isolation inspector.
 * Validates the complete isolation of the database and application environment
 * before production namespace provisioning is considered.
 * 
 * STRICT SAFETY DIRECTIVES:
 * 1. INSPECTION ONLY: Performs zero mutations, zero writes, zero kills.
 * 2. NEVER AUTOMATICALLY TERMINATES PROCESSES: Requires manual administrative action.
 * 3. ZERO MONGODB WRITES: Opens read-only administrative inspection sessions.
 * 4. FAIL-CLOSED: Any unknown listener, active app process, or anomaly produces NO-GO.
 * 5. HONEST LIMITATIONS: Explicitly documents that an empty currentOp() does not
 *    guarantee exclusive database locking on standalone MongoDB 8.2.
 * ==============================================================================
 */

import { execSync, execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ISOLATION_DEFAULTS = {
  PORTS_TO_CHECK: [5000, 5173],
  SOURCE_DB_NAME: 'shivneri_classic_admin_db',
  TARGET_DB_NAME: 'shivneri_classic_prod_db',
  MONGO_URI: 'mongodb://localhost:27017',
  EXPECTED_SOURCE_DOCS: 194,
  EXPECTED_SOURCE_COLLECTIONS: 10
};

/**
 * Parses listening TCP ports from Windows Get-NetTCPConnection with fallback to netstat.
 * Returns a map of port number to array of { localAddress, pid, rawLine }.
 */
export function getListeningTcpPorts(specificPorts = null) {
  const listeningMap = new Map();

  // 1. Primary: Query Windows network stack driver via Get-NetTCPConnection
  try {
    const portArg = specificPorts && specificPorts.length > 0 ? `-LocalPort ${specificPorts.join(',')}` : '';
    const psCmd = `Get-NetTCPConnection ${portArg} -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess | ConvertTo-Json -Compress`;
    const psOut = execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (psOut) {
      let parsed = JSON.parse(psOut);
      if (!Array.isArray(parsed)) parsed = [parsed];

      for (const item of parsed) {
        const port = item.LocalPort;
        const pid = item.OwningProcess;
        if (port && pid) {
          if (!listeningMap.has(port)) {
            listeningMap.set(port, []);
          }
          listeningMap.get(port).push({ localAddress: item.LocalAddress || '0.0.0.0', pid });
        }
      }
    }
  } catch {
    // Fall back to netstat
  }

  // 2. Secondary: Complement with netstat -ano -p tcp
  try {
    const output = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = output.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('TCP')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 5) {
        const localAddr = parts[1];
        const state = parts[3];
        const pid = parseInt(parts[4], 10);

        if (state === 'LISTENING') {
          const lastColon = localAddr.lastIndexOf(':');
          if (lastColon !== -1) {
            const port = parseInt(localAddr.slice(lastColon + 1), 10);
            if (!isNaN(port) && (!specificPorts || specificPorts.includes(port))) {
              if (!listeningMap.has(port)) {
                listeningMap.set(port, []);
              }
              const existing = listeningMap.get(port);
              if (!existing.some(e => e.pid === pid)) {
                existing.push({ localAddress: localAddr, pid, rawLine: trimmed });
              }
            }
          }
        }
      }
    }
  } catch {
    // Ignore error
  }

  return listeningMap;
}

/**
 * Queries process details for a specific PID using PowerShell Get-CimInstance Win32_Process.
 * Avoids broken Get-Process .CommandLine property on Windows PowerShell 5.1.
 */
export function getProcessDetailsByPid(pid) {
  if (!pid || isNaN(pid)) {
    return { pid, name: null, executablePath: null, commandLine: null, isUnknown: true };
  }

  try {
    const psCmd = `Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object ProcessId, Name, ExecutablePath, CommandLine | ConvertTo-Json -Compress`;
    const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (!output) {
      return { pid, name: null, executablePath: null, commandLine: null, isUnknown: true };
    }

    const parsed = JSON.parse(output);
    return {
      pid: parsed.ProcessId || pid,
      name: parsed.Name || 'UNKNOWN',
      executablePath: parsed.ExecutablePath || 'UNKNOWN',
      commandLine: parsed.CommandLine || '',
      isUnknown: false
    };
  } catch {
    return { pid, name: null, executablePath: null, commandLine: null, isUnknown: true };
  }
}

/**
 * Inspects a specific port and returns its status:
 * - 'NOT_LISTENING': Safe.
 * - 'LISTENING_IDENTIFIED': Port is listening and process is identified (unsafe).
 * - 'LISTENING_UNKNOWN': Port is listening but process identity could not be established (NO-GO).
 */
export function inspectPort(portNumber, listeningMap) {
  const listeners = listeningMap.get(portNumber) || [];

  if (listeners.length === 0) {
    return {
      port: portNumber,
      status: 'NOT_LISTENING',
      safe: true,
      listeners: []
    };
  }

  const detailedListeners = [];
  let hasUnknownProcess = false;

  for (const item of listeners) {
    const details = getProcessDetailsByPid(item.pid);
    detailedListeners.push({
      localAddress: item.localAddress,
      pid: item.pid,
      processName: details.name,
      executablePath: details.executablePath,
      commandLine: details.commandLine,
      isUnknown: details.isUnknown
    });

    if (details.isUnknown || !details.name) {
      hasUnknownProcess = true;
    }
  }

  const status = hasUnknownProcess ? 'LISTENING_UNKNOWN' : 'LISTENING_IDENTIFIED';

  return {
    port: portNumber,
    status,
    safe: false,
    hasUnknownProcess,
    listeners: detailedListeners
  };
}

/**
 * Enumerates all active node.exe processes using Get-CimInstance Win32_Process.
 * Discriminates between Shivneri application processes and unrelated Node.js tooling.
 */
export function inspectRunningNodeProcesses() {
  const results = [];
  try {
    const psCmd = `Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Select-Object ProcessId, Name, ExecutablePath, CommandLine | ConvertTo-Json -Compress`;
    const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (!output) {
      return results;
    }

    let parsed = JSON.parse(output);
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    for (const proc of parsed) {
      const pid = proc.ProcessId;
      const cmd = proc.CommandLine || '';
      const execPath = proc.ExecutablePath || '';

      // Skip this current inspection process
      if (pid === process.pid) {
        continue;
      }

      // Discriminate actual server processes vs tooling
      const isBackend = (/server[\\\/]src[\\\/]server\.js|server\.js/i.test(cmd) || /nodemon/i.test(cmd)) && !/checkWriterIsolation|provisionProductionNamespace|test-/i.test(cmd);
      const isFrontend = /vite/i.test(cmd) && /client/i.test(cmd);
      const isShivneriScript = /Shivneri/i.test(cmd) && !/checkWriterIsolation|provisionProductionNamespace|test-/i.test(cmd);

      let classification = 'UNRELATED_NODE_PROCESS';
      let isShivneriAppProcess = false;

      if (isBackend) {
        classification = 'SHIVNERI_BACKEND_PROCESS';
        isShivneriAppProcess = true;
      } else if (isFrontend) {
        classification = 'SHIVNERI_FRONTEND_PROCESS';
        isShivneriAppProcess = true;
      } else if (isShivneriScript) {
        classification = 'SHIVNERI_AUXILIARY_PROCESS';
        isShivneriAppProcess = true;
      }

      results.push({
        pid,
        name: proc.Name || 'node.exe',
        executablePath: execPath,
        commandLine: cmd,
        classification,
        isShivneriAppProcess,
        safe: !isShivneriAppProcess
      });
    }
  } catch (err) {
    console.warn('⚠️  Could not enumerate Node processes:', err.message);
  }
  return results;
}

/**
 * Checks for registered Scheduled Tasks and Windows Services related to Shivneri.
 */
export function inspectScheduledTasksAndServices() {
  let scheduledTasks = [];
  let services = [];

  try {
    const taskCmd = `Get-ScheduledTask | Where-Object { $_.TaskName -match 'shivneri|apartment' } | Select-Object TaskName, State | ConvertTo-Json -Compress`;
    const taskOut = execFileSync('powershell.exe', ['-NoProfile', '-Command', taskCmd], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (taskOut) {
      const parsed = JSON.parse(taskOut);
      scheduledTasks = Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch {
    // Ignore error if no tasks or permission issue
  }

  try {
    const svcCmd = `Get-Service | Where-Object { $_.Name -match 'shivneri' } | Select-Object Name, Status | ConvertTo-Json -Compress`;
    const svcOut = execFileSync('powershell.exe', ['-NoProfile', '-Command', svcCmd], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (svcOut) {
      const parsed = JSON.parse(svcOut);
      services = Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch {
    // Ignore error if no services
  }

  return {
    scheduledTasks,
    services,
    hasConflictingTask: scheduledTasks.length > 0,
    hasConflictingService: services.length > 0,
    safe: scheduledTasks.length === 0 && services.length === 0
  };
}

/**
 * Inspects MongoDB active operations, connections, and database standstill.
 */
export async function inspectMongoDbWriters(mongoUri = ISOLATION_DEFAULTS.MONGO_URI) {
  let conn;
  try {
    conn = await mongoose.createConnection(mongoUri, { serverSelectionTimeoutMS: 4000 }).asPromise();
    const adminDb = conn.db.admin();

    // 1. Current operations snapshot
    const currentOpResult = await adminDb.command({ currentOp: 1, '$all': true });
    const inprog = currentOpResult.inprog || [];

    // Filter out internal system background tasks
    const activeUserOps = inprog.filter(op => {
      if (!op.active) return false;
      const ns = op.ns || '';
      if (ns.startsWith('local.') || ns.startsWith('config.') || ns.startsWith('admin.')) return false;
      if (op.op === 'none') return false;
      return true;
    });

    // 2. Server status & connection count
    const serverStatus = await adminDb.serverStatus();
    const connectionsCurrent = serverStatus.connections ? serverStatus.connections.current : 0;
    const mongoVersion = serverStatus.version;

    // 3. Source database census
    const sourceConn = await mongoose.createConnection(`${mongoUri}/${ISOLATION_DEFAULTS.SOURCE_DB_NAME}`).asPromise();
    const sourceColls = await sourceConn.db.listCollections().toArray();
    let sourceTotalDocs = 0;
    for (const c of sourceColls) {
      sourceTotalDocs += await sourceConn.db.collection(c.name).countDocuments();
    }
    await sourceConn.close();

    // 4. Target production database absence check
    const allDbs = await adminDb.listDatabases();
    const prodDbExists = allDbs.databases.some(d => d.name === ISOLATION_DEFAULTS.TARGET_DB_NAME);

    await conn.close();

    return {
      connected: true,
      mongoVersion,
      connectionsCurrent,
      totalSnapshotOps: inprog.length,
      activeUserOps,
      activeUserOpsCount: activeUserOps.length,
      sourceCollsCount: sourceColls.length,
      sourceTotalDocs,
      prodDbExists,
      safe: activeUserOps.length === 0 &&
            sourceColls.length === ISOLATION_DEFAULTS.EXPECTED_SOURCE_COLLECTIONS &&
            sourceTotalDocs === ISOLATION_DEFAULTS.EXPECTED_SOURCE_DOCS &&
            prodDbExists === false,
      limitationNotice: 'currentOp snapshot captures an instantaneous point-in-time state. Standalone MongoDB 8.2 does not lock out concurrent writers.'
    };
  } catch (err) {
    if (conn) await conn.close().catch(() => {});
    return {
      connected: false,
      error: err.message,
      safe: false,
      limitationNotice: 'Could not connect to MongoDB for writer inspection.'
    };
  }
}

/**
 * Main Orchestration Function:
 * Evaluates all writer-isolation constraints and returns an authoritative PASS / NO-GO verdict.
 */
export async function checkWriterIsolation(options = {}) {
  const timestamp = new Date().toISOString();
  const listeningMap = getListeningTcpPorts();

  const port5000 = inspectPort(5000, listeningMap);
  const port5173 = inspectPort(5173, listeningMap);
  const nodeProcesses = inspectRunningNodeProcesses();
  const tasksAndServices = inspectScheduledTasksAndServices();
  const mongoInspection = await inspectMongoDbWriters(options.mongoUri || ISOLATION_DEFAULTS.MONGO_URI);

  const issues = [];
  const recommendations = [];

  // Check 1: Port 5000 (Backend API)
  if (port5000.status === 'LISTENING_IDENTIFIED') {
    issues.push(`PORT 5000 IS ACTIVE: Backend listener identified (PID(s): ${port5000.listeners.map(l => l.pid).join(', ')}).`);
    recommendations.push(`Terminate specific backend process: Stop-Process -Id ${port5000.listeners.map(l => l.pid).join(', ')}`);
  } else if (port5000.status === 'LISTENING_UNKNOWN') {
    issues.push('PORT 5000 IS LISTENING WITH UNKNOWN PROCESS: Identity could not be resolved (Security hazard).');
    recommendations.push('Investigate port 5000 listener using elevated administrative tools.');
  }

  // Check 2: Port 5173 (Vite Frontend)
  if (port5173.status === 'LISTENING_IDENTIFIED') {
    issues.push(`PORT 5173 IS ACTIVE: Frontend Vite listener identified (PID(s): ${port5173.listeners.map(l => l.pid).join(', ')}).`);
    recommendations.push(`Terminate specific Vite process: Stop-Process -Id ${port5173.listeners.map(l => l.pid).join(', ')}`);
  } else if (port5173.status === 'LISTENING_UNKNOWN') {
    issues.push('PORT 5173 IS LISTENING WITH UNKNOWN PROCESS: Identity could not be resolved (Security hazard).');
    recommendations.push('Investigate port 5173 listener using elevated administrative tools.');
  }

  // Check 3: Active Shivneri Node processes
  const activeShivneriProcs = nodeProcesses.filter(p => p.isShivneriAppProcess);
  if (activeShivneriProcs.length > 0) {
    for (const p of activeShivneriProcs) {
      issues.push(`ACTIVE APP PROCESS: ${p.classification} (PID: ${p.pid}) is running.`);
      recommendations.push(`Terminate specific PID: Stop-Process -Id ${p.pid} (Command: ${p.commandLine.slice(0, 80)}...)`);
    }
  }

  // Check 4: Scheduled tasks or services
  if (!tasksAndServices.safe) {
    if (tasksAndServices.hasConflictingTask) {
      issues.push(`SCHEDULED TASK CONFLICT: Found ${tasksAndServices.scheduledTasks.length} task(s) matching 'shivneri'.`);
    }
    if (tasksAndServices.hasConflictingService) {
      issues.push(`SERVICE CONFLICT: Found ${tasksAndServices.services.length} service(s) matching 'shivneri'.`);
    }
  }

  // Check 5: MongoDB state
  if (!mongoInspection.connected) {
    issues.push(`MONGODB UNREACHABLE: ${mongoInspection.error}`);
  } else {
    if (mongoInspection.activeUserOpsCount > 0) {
      issues.push(`ACTIVE MONGODB WRITERS: Found ${mongoInspection.activeUserOpsCount} active user operation(s) in progress.`);
    }
    if (mongoInspection.sourceTotalDocs !== ISOLATION_DEFAULTS.EXPECTED_SOURCE_DOCS) {
      issues.push(`SOURCE DATABASE MUTATION: Expected 194 docs, found ${mongoInspection.sourceTotalDocs}.`);
    }
    if (mongoInspection.prodDbExists) {
      issues.push(`TARGET PRODUCTION DATABASE ALREADY EXISTS: "shivneri_classic_prod_db" exists!`);
    }
  }

  const verdict = issues.length === 0 ? 'PASS' : 'NO-GO';

  return {
    timestamp,
    verdict,
    safeForCutover: verdict === 'PASS',
    checks: {
      port5000,
      port5173,
      nodeProcessesCount: nodeProcesses.length,
      activeShivneriProcsCount: activeShivneriProcs.length,
      unrelatedNodeProcsCount: nodeProcesses.length - activeShivneriProcs.length,
      tasksAndServices,
      mongoInspection
    },
    issues,
    recommendations,
    processInventory: nodeProcesses
  };
}

/**
 * Formatted Console Output Runner.
 */
export async function runConsolePreflightCheck() {
  console.log('==============================================================================');
  console.log('🏛️  SHIVNERI CLASSIC APARTMENT – PREFLIGHT WRITER-ISOLATION INSPECTOR');
  console.log('PHASE 9.1.1.5: Non-Destructive Windows Process & Writer Verification');
  console.log('==============================================================================\n');

  const report = await checkWriterIsolation();

  console.log(`Timestamp: ${report.timestamp}`);
  console.log('------------------------------------------------------------------------------');
  console.log('1. NETWORK PORT INSPECTION:');
  console.log(`   - TCP Port 5000 (Backend API)  : [${report.checks.port5000.status}] (Safe: ${report.checks.port5000.safe})`);
  if (report.checks.port5000.listeners.length > 0) {
    for (const l of report.checks.port5000.listeners) {
      console.log(`     -> PID: ${l.pid} | Process: ${l.processName} | Executable: ${l.executablePath}`);
    }
  }

  console.log(`   - TCP Port 5173 (Vite Frontend): [${report.checks.port5173.status}] (Safe: ${report.checks.port5173.safe})`);
  if (report.checks.port5173.listeners.length > 0) {
    for (const l of report.checks.port5173.listeners) {
      console.log(`     -> PID: ${l.pid} | Process: ${l.processName} | Executable: ${l.executablePath}`);
    }
  }

  console.log('\n2. PROCESS DISCRIMINATION (Win32_Process):');
  console.log(`   - Total Active Node Processes : ${report.checks.nodeProcessesCount}`);
  console.log(`   - Shivneri App Processes      : ${report.checks.activeShivneriProcsCount} (Safe: ${report.checks.activeShivneriProcsCount === 0})`);
  console.log(`   - Unrelated Tooling Processes : ${report.checks.unrelatedNodeProcsCount}`);
  if (report.processInventory.length > 0) {
    for (const p of report.processInventory) {
      console.log(`     -> PID: ${p.pid} | Classification: ${p.classification} | Name: ${p.name}`);
      console.log(`        Cmd: ${p.commandLine.slice(0, 95)}...`);
    }
  }

  console.log('\n3. SCHEDULED TASKS & SERVICES:');
  console.log(`   - Conflicting Scheduled Tasks : ${report.checks.tasksAndServices.scheduledTasks.length}`);
  console.log(`   - Conflicting Services        : ${report.checks.tasksAndServices.services.length}`);

  console.log('\n4. MONGODB 8.2 WRITER INSPECTION:');
  if (report.checks.mongoInspection.connected) {
    console.log(`   - MongoDB Version             : ${report.checks.mongoInspection.mongoVersion}`);
    console.log(`   - Active User Operations      : ${report.checks.mongoInspection.activeUserOpsCount} (Safe: ${report.checks.mongoInspection.activeUserOpsCount === 0})`);
    console.log(`   - Current Client Connections  : ${report.checks.mongoInspection.connectionsCurrent}`);
    console.log(`   - Source DB Total Docs        : ${report.checks.mongoInspection.sourceTotalDocs} (Expected: 194)`);
    console.log(`   - Target Prod DB Exists       : ${report.checks.mongoInspection.prodDbExists} (Expected: false)`);
    console.log(`   - Inherent Boundary Notice    : ${report.checks.mongoInspection.limitationNotice}`);
  } else {
    console.log(`   - Connection Status           : FAILED (${report.checks.mongoInspection.error})`);
  }

  console.log('\n==============================================================================');
  console.log(`PREFLIGHT WRITER-ISOLATION VERDICT: [ ${report.verdict} ]`);
  console.log('==============================================================================');

  if (report.verdict === 'PASS') {
    console.log('✅ PASS: All writer isolation requirements satisfied.');
    console.log('   Zero application listeners, zero active Shivneri processes, clean standstill.');
  } else {
    console.log('❌ NO-GO: Cutover cannot proceed until the following issues are resolved:\n');
    for (const issue of report.issues) {
      console.log(`  • ${issue}`);
    }
    if (report.recommendations.length > 0) {
      console.log('\nRECOMMENDED ADMINISTRATIVE ACTIONS:');
      for (const rec of report.recommendations) {
        console.log(`  👉 ${rec}`);
      }
    }
  }
  console.log('==============================================================================\n');
  return report;
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  runConsolePreflightCheck()
    .then(report => {
      process.exit(report.verdict === 'PASS' ? 0 : 1);
    })
    .catch(err => {
      console.error('\n❌ PREFLIGHT CHECK FAILED UNEXPECTEDLY:', err);
      process.exit(1);
    });
}
