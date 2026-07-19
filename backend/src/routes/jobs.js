const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

function addHistory(job, status, actor, note) {
  job.history.push({ status, at: new Date(), actor, note });
}

router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (req.user.role === 'translator' && job.status === 'CREATED') {
      job.status = 'VIEWED';
      addHistory(job, 'VIEWED', req.user.username, 'Translator opened the job');
      await job.save();
    }

    res.json(job);
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).select('history');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job.history);
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.get('/:id/source/:fileId/view', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const file = job.sourceFiles.id(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const absPath = path.resolve(file.storedPath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found on disk' });

    res.sendFile(absPath);
  } catch (err) {
    console.error('View source file error:', err);
    res.status(500).json({ error: 'Failed to view file' });
  }
});

router.get('/:id/source/:fileId/download', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const file = job.sourceFiles.id(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const absPath = path.resolve(file.storedPath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found on disk' });

    res.download(absPath, file.originalName);
  } catch (err) {
    console.error('Download source file error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.get('/:id/translated/:fileId/download', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const file = job.translatedFiles.id(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const absPath = path.resolve(file.storedPath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found on disk' });

    res.download(absPath, file.originalName);
  } catch (err) {
    console.error('Download translated file error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
