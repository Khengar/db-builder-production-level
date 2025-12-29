import 'dotenv/config'; 
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const server = Fastify({ logger: true });

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

  if (!desiredSql || !targetDbUrl) return reply.status(400).send({ error: "Missing Input" });
  if (!shadowDbUrl) return reply.status(500).send({ error: "Missing Shadow DB URL" });

  const fileName = `schema_${Date.now()}.sql`;
  
  try {
    await fs.writeFile(fileName, desiredSql);

    // Generate Safe File URL (Cross-Platform)
    let cwd = process.cwd();
    if (process.platform === 'win32') cwd = cwd.replace(/\\/g, '/');
    const schemaFileUrl = `file://${cwd}/${fileName}`;
    
    const args = [
      'schema', 'diff',
      '--from', targetDbUrl, 
      '--to', schemaFileUrl,
      '--dev-url', shadowDbUrl,
      '--format', 'sql'
    ];

    const cmd = process.platform === 'win32' ? 'atlas.exe' : 'atlas';

    return new Promise((resolve) => {
      const child = spawn(cmd, args);

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (d) => { stdoutData += d.toString(); });
      child.stderr.on('data', (d) => { stderrData += d.toString(); });

      child.on('close', async (code) => {
        try { await fs.unlink(fileName); } catch {}

        if (code !== 0 && stderrData.length > 0) {
          console.error("Atlas Error:", stderrData);
          resolve(reply.status(500).send({ success: false, error: "Migration failed", details: stderrData }));
        } else {
          resolve({ success: true, plan: stdoutData });
        }
      });
    });

  } catch (error: any) {
    try { await fs.unlink(fileName).catch(() => {}); } catch {}
    server.log.error(error);
    return reply.status(500).send({ success: false, error: "Server Error", details: error.message });
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