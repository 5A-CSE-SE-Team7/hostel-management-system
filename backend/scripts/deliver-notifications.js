// Optional recovery sweep: run one worker instance, after SMTP configuration.
const config = require('../src/config');
const { pool } = require('../src/db');
const { deliver } = require('../src/utils/notify');
(async () => {
  if (!config.smtp.host) throw new Error('SMTP_HOST must be configured for delivery');
  const statuses = process.argv.includes('--retry-failed') ? "('in_app','failed')" : "('in_app')";
  const [rows] = await pool.query(`SELECT id FROM notifications WHERE delivery_status IN ${statuses} ORDER BY id LIMIT 100`);
  for (const { id } of rows) await deliver(id);
  console.log(`Processed ${rows.length} notification(s). Inspect delivery_status for outcomes.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
