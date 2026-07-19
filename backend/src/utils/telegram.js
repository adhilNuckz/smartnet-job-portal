const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendJobNotification(job) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('Telegram not configured — skipping notification');
    return;
  }

  const deadlineLabel = job.deadline === 'immediate' ? 'Immediate' : 'Within Today';
  const notes = (job.ownerComments || '').slice(0, 200);
  const text = `📄 New Job: ${job.title}\n⏰ Deadline: ${deadlineLabel}\n📝 Notes: ${notes}`;

  try {
    await axios.post(`${API_BASE}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
    });
  } catch (err) {
    console.error('Telegram sendMessage failed:', err.message);
  }

  for (const file of job.sourceFiles) {
    try {
      const filePath = file.storedPath;
      const absPath = path.resolve(filePath);
      if (!fs.existsSync(absPath)) continue;

      const form = new FormData();
      form.append('chat_id', CHAT_ID);
      form.append('document', fs.createReadStream(absPath), {
        filename: file.originalName,
      });

      await axios.post(`${API_BASE}/sendDocument`, form, {
        headers: form.getHeaders(),
      });
    } catch (err) {
      console.error('Telegram sendDocument failed for', file.originalName, err.message);
    }
  }
}

module.exports = { sendJobNotification };
