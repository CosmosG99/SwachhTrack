const { spawn } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', '..', 'anomaly', 'anomaly_detection.py');

/**
 * Runs anomaly_detection.py with JSON on stdin; returns parsed { alerts, error }.
 */
function runDetection(payload) {
  const pythonBin = process.env.PYTHON_PATH || 'python';
  const args = [SCRIPT];

  return new Promise((resolve) => {
    const child = spawn(pythonBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let out = '';
    let err = '';

    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      err += d.toString();
    });

    child.on('error', (e) => {
      resolve({
        alerts: [],
        error: `Failed to start Python: ${e.message}. Set PYTHON_PATH or install Python.`,
      });
    });

    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(out.trim() || '{}');
        if (!parsed.error && err.trim()) {
          parsed._stderr = err.trim();
        }
        resolve(parsed);
      } catch {
        resolve({
          alerts: [],
          error: err.trim() || out.trim() || `Python exited with code ${code}`,
        });
      }
    });

    child.stdin.write(JSON.stringify(payload ?? {}));
    child.stdin.end();
  });
}

module.exports = { runDetection, SCRIPT };
