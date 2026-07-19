const mongoose = require('mongoose');

const sourceFileSchema = new mongoose.Schema({
  originalName: String,
  storedPath: String,
  type: { type: String, enum: ['image', 'pdf'] },
  uploadedAt: { type: Date, default: Date.now },
});

const translatedFileSchema = new mongoose.Schema({
  originalName: String,
  storedPath: String,
  uploadedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
});

const historyEntrySchema = new mongoose.Schema({
  status: String,
  at: { type: Date, default: Date.now },
  actor: String,
  note: String,
}, { _id: false });

const redoCommentSchema = new mongoose.Schema({
  text: String,
  at: { type: Date, default: Date.now },
}, { _id: false });

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  ownerComments: { type: String, default: '' },
  deadline: { type: String, enum: ['immediate', 'today'], default: 'immediate' },
  sourceFiles: [sourceFileSchema],
  translatedFiles: [translatedFileSchema],
  status: {
    type: String,
    enum: ['CREATED', 'VIEWED', 'IN_PROGRESS', 'SUBMITTED', 'DONE', 'REDO'],
    default: 'CREATED',
  },
  redoComments: [redoCommentSchema],
  history: [historyEntrySchema],
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
