import 'dotenv/config'; 
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

const server = Fastify({ logger: true });

// --- TYPES ---
interface DeployBody {
  desiredSql: string;
  targetDbUrl: string;
}

server.register(cors, { origin: true });

server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date() };
});

server.post<{ Body: DeployBody }>('/deploy/plan', async (request, reply) => {
  const { desiredSql, targetDbUrl } = request.body;
  const shadowDbUrl = process.env.SHADOW_DB_URL;

  if (!desiredSql || !targetDbUrl) {
    return reply.status(400).send({ error: "Missing SQL or Target DB URL" });
  }
  if (!shadowDbUrl) {
    return reply.status(500).send({ error: "Server misconfigured: SHADOW_DB_URL missing" });
  }

  // 1. WRITE FILE LOCALLY
  // We use a simple relative name. Node writes this to your 'backend' folder.
  const fileName = `temp_${Date.now()}.sql`;
  
  try {
    await fs.writeFile(fileName, desiredSql);

    // 2. CONVERT TO URL (THE FIX)
    // We resolve the full path (G:\Code\...) and convert it to a URL (file:///G:/Code/...)
    // This format works perfectly on Windows with Atlas.
    const fullPath = path.resolve(fileName);
    const fileUrl = pathToFileURL(fullPath).toString();

    console.log("Plan Target:", fileUrl); // Debug log

    // 3. RUN ATLAS (Spawn)
    const args = [
      'schema', 'diff',
      '--from', targetDbUrl,
      '--to', fileUrl,        // Passing the safe file URL
      '--dev-url', shadowDbUrl,
      '--format', 'sql'
    ];

    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'atlas.exe' : 'atlas';

    return new Promise((resolve) => {
      const child = spawn(cmd, args);

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (d) => { stdoutData += d.toString(); });
      child.stderr.on('data', (d) => { stderrData += d.toString(); });

      child.on('close', async (code) => {
        // ALWAYS CLEANUP
        try { await fs.unlink(fileName); } catch {}

        if (code !== 0 && stderrData.length > 0) {
          console.error("Atlas Failed:", stderrData);
          resolve(reply.status(500).send({ 
            success: false, 
            error: "Migration calculation failed",
            details: stderrData 
          }));
        } else {
          resolve({ success: true, plan: stdoutData });
        }
      });
    });

  } catch (error: any) {
    // Cleanup if crash
    try { await fs.unlink(fileName).catch(() => {}); } catch {}
    
    server.log.error(error);
    return reply.status(500).send({ 
      success: false, 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();