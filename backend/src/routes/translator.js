const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = Router();
router.use(authenticate);
router.use(requireRole('translator'));

const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '..', '..', '..', 'storage');

function addHistory(job, status, actor, note) {
  job.history.push({ status, at: new Date(), actor, note });
}

router.patch('/:id/start', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'VIEWED' && job.status !== 'CREATED') {
      return res.status(400).json({ error: 'Job must be in VIEWED or CREATED status to start' });
    }

    job.status = 'IN_PROGRESS';
    addHistory(job, 'IN_PROGRESS', req.user.username, 'Translator started working');
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Start job error:', err);
    res.status(500).json({ error: 'Failed to start job' });
  }
});

router.post('/:id/submit', upload.array('files', 20), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Job must be in IN_PROGRESS status to submit' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one translated file is required' });
    }

    const currentVersion = job.translatedFiles.length > 0
      ? Math.max(...job.translatedFiles.map(f => f.version)) + 1
      : 1;

    for (const file of req.files) {
      job.translatedFiles.push({
        originalName: file.originalname,
        storedPath: file.path,
        uploadedAt: new Date(),
        version: currentVersion,
      });
    }

    job.status = 'SUBMITTED';
    addHistory(job, 'SUBMITTED', req.user.username, 'Translator submitted translated files');
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Submit job error:', err);
    res.status(500).json({ error: 'Failed to submit job' });
  }
});

router.patch('/:id/reopen', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'DONE') {
      return res.status(400).json({ error: 'Job must be in DONE status to reopen' });
    }

    job.status = 'IN_PROGRESS';
    addHistory(job, 'IN_PROGRESS', req.user.username, 'Translator reopened the job');
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Reopen job error:', err);
    res.status(500).json({ error: 'Failed to reopen job' });
  }
});

router.delete('/:id/translated/:fileId', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const file = job.translatedFiles.id(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'Translated file not found' });

    try { fs.unlinkSync(path.resolve(file.storedPath)); } catch (e) { /* ok */ }

    job.translatedFiles.pull({ _id: req.params.fileId });
    addHistory(job, job.status, req.user.username, `Translator deleted translated file: ${file.originalName}`);
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Delete translated file error:', err);
    res.status(500).json({ error: 'Failed to delete translated file' });
  }
});

module.exports = router;
