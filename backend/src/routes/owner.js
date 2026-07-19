const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sendJobNotification } = require('../utils/telegram');

const router = Router();
router.use(authenticate);

const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '..', '..', '..', 'storage');

function addHistory(job, status, actor, note) {
  job.history.push({ status, at: new Date(), actor, note });
}

router.post('/', requireRole('owner'), upload.array('files', 20), async (req, res) => {
  try {
    const { title, comments, deadline } = req.body;
    if (!title || !deadline) {
      return res.status(400).json({ error: 'Title and deadline are required' });
    }

    if (!['immediate', 'today'].includes(deadline)) {
      return res.status(400).json({ error: 'Deadline must be "immediate" or "today"' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    const sourceFiles = [];
    for (const file of req.files) {
      const isImage = file.mimetype.startsWith('image/');
      sourceFiles.push({
        originalName: file.originalname,
        storedPath: file.path,
        type: isImage ? 'image' : 'pdf',
        uploadedAt: new Date(),
      });
    }

    const job = new Job({
      title,
      ownerComments: comments || '',
      deadline,
      sourceFiles,
      status: 'CREATED',
    });

    addHistory(job, 'CREATED', req.user.username, 'Job created');
    await job.save();

    sendJobNotification(job).catch(err => {
      console.error('Telegram notification failed (non-blocking):', err.message);
    });

    res.status(201).json(job);
  } catch (err) {
    console.error('Create job error:', err);
    if (err.message?.includes('Only JPEG')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create job' });
  }
});

router.patch('/:id', requireRole('owner'), async (req, res) => {
  try {
    const { title, comments, deadline } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (title !== undefined) job.title = title;
    if (comments !== undefined) job.ownerComments = comments;
    if (deadline !== undefined) {
      if (!['immediate', 'today'].includes(deadline)) {
        return res.status(400).json({ error: 'Deadline must be "immediate" or "today"' });
      }
      job.deadline = deadline;
    }

    addHistory(job, job.status, req.user.username, 'Job details updated');
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Edit job error:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

router.delete('/:id', requireRole('owner'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    for (const f of job.sourceFiles) {
      try { fs.unlinkSync(path.resolve(f.storedPath)); } catch (e) { /* ok */ }
    }
    for (const f of job.translatedFiles) {
      try { fs.unlinkSync(path.resolve(f.storedPath)); } catch (e) { /* ok */ }
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

router.delete('/:id/source/:fileId', requireRole('owner'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const file = job.sourceFiles.id(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'Source file not found' });

    try { fs.unlinkSync(path.resolve(file.storedPath)); } catch (e) { /* ok */ }

    job.sourceFiles.pull({ _id: req.params.fileId });
    addHistory(job, job.status, req.user.username, `Source file removed: ${file.originalName}`);
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Delete source file error:', err);
    res.status(500).json({ error: 'Failed to delete source file' });
  }
});

router.post('/:id/sources', requireRole('owner'), upload.array('files', 20), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    for (const file of req.files) {
      const isImage = file.mimetype.startsWith('image/');
      job.sourceFiles.push({
        originalName: file.originalname,
        storedPath: file.path,
        type: isImage ? 'image' : 'pdf',
        uploadedAt: new Date(),
      });
    }

    addHistory(job, job.status, req.user.username, `Added ${req.files.length} source file(s)`);
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Add source files error:', err);
    res.status(500).json({ error: 'Failed to add source files' });
  }
});

router.patch('/:id/mark-done', requireRole('owner'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Job must be in SUBMITTED status to mark done' });
    }

    job.status = 'DONE';
    addHistory(job, 'DONE', req.user.username, 'Owner marked job as done');
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Mark done error:', err);
    res.status(500).json({ error: 'Failed to mark job as done' });
  }
});

router.patch('/:id/request-redo', requireRole('owner'), async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required for redo request' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Job must be in SUBMITTED status to request redo' });
    }

    job.status = 'IN_PROGRESS';
    job.redoComments.push({ text: comment, at: new Date() });
    addHistory(job, 'REDO', req.user.username, `Redo requested: ${comment}`);
    await job.save();
    res.json(job);
  } catch (err) {
    console.error('Request redo error:', err);
    res.status(500).json({ error: 'Failed to request redo' });
  }
});

module.exports = router;
