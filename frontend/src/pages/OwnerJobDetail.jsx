import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteJob, updateJob, markDone, requestRedo, getDownloadUrl, getViewUrl, deleteSourceFile, addSourceFiles } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  CREATED: 'Created', VIEWED: 'Viewed', IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted', DONE: 'Done', REDO: 'Redo',
};

const DEADLINE_LABELS = {
  immediate: 'Immediate',
  today: 'Within Today',
};

const deadlineLabel = (d) => {
  if (d === 'immediate' || d === 'today') return DEADLINE_LABELS[d];
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return d;
};

export default function OwnerJobDetail() {
  const { user, logout } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [redoModal, setRedoModal] = useState(false);
  const [redoComment, setRedoComment] = useState('');

  const [editModal, setEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editComments, setEditComments] = useState('');
  const [editDeadline, setEditDeadline] = useState('immediate');

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [newFiles, setNewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setError('');
    setSuccess('');
    try {
      const [j, h] = await Promise.all([
        fetch(`/api/jobs/${id}`, { credentials: 'include' }).then(r => r.json()),
        fetch(`/api/jobs/${id}/history`, { credentials: 'include' }).then(r => r.json()),
      ]);
      setJob(j);
      setHistory(h);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleMarkDone = async () => {
    try {
      await markDone(id);
      setSuccess('Job marked as done');
      load();
    } catch (err) { setError(err.message); }
  };

  const handleRedo = async () => {
    if (!redoComment.trim()) { setError('Comment is required'); return; }
    try {
      await requestRedo(id, redoComment);
      setRedoModal(false);
      setRedoComment('');
      setSuccess('Redo requested');
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async () => {
    try {
      await deleteJob(id);
      navigate('/dashboard/owner');
    } catch (err) { setError(err.message); }
  };

  const openEdit = () => {
    setEditTitle(job.title);
    setEditComments(job.ownerComments || '');
    setEditDeadline(job.deadline);
    setEditModal(true);
  };

  const handleEdit = async () => {
    if (!editTitle.trim()) { setError('Title is required'); return; }
    try {
      await updateJob(id, { title: editTitle, comments: editComments, deadline: editDeadline });
      setEditModal(false);
      setSuccess('Job updated');
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteSource = async (fileId) => {
    if (!confirm('Remove this source file?')) return;
    try {
      await deleteSourceFile(id, fileId);
      setSuccess('Source file removed');
      load();
    } catch (err) { setError(err.message); }
  };

  const handleAddSources = async () => {
    if (newFiles.length === 0) { setError('Select files to upload'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      for (const f of newFiles) formData.append('files', f);
      await addSourceFiles(id, formData);
      setNewFiles([]);
      setSuccess('Source files added');
      load();
    } catch (err) { setError(err.message); } finally { setUploading(false); }
  };

  if (loading) return <div className="loading"><span className="spinner"></span></div>;
  if (!job) return <div className="container" style={{ marginTop: '2rem' }}><p>Job not found</p></div>;

  const isOverdue = () => {
    if (job.status === 'DONE') return false;
    if (job.deadline === 'today' && new Date().getHours() >= 18) return true;
    const dt = new Date(job.deadline);
    if (!isNaN(dt.getTime()) && dt < new Date()) return true;
    return false;
  };

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <span className="navbar-brand">SmartNet — Job Detail</span>
          <div className="navbar-right">
            <span>{user?.username}</span>
            <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => navigate('/dashboard/owner')}>Back</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ marginTop: '1.5rem' }}>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <div className="job-detail-grid">
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ marginBottom: '0.5rem' }}>{job.title}</h2>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Deadline: {deadlineLabel(job.deadline)}
                    {isOverdue() && <span className="overdue"> (OVERDUE)</span>}
                  </p>
                  <span className={`status-badge ${job.status.toLowerCase()}`}>{STATUS_LABELS[job.status] || job.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button className="btn btn-outline btn-sm" onClick={openEdit}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>Delete</button>
                </div>
              </div>
              {job.ownerComments && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="section-title">Instructions</div>
                  <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{job.ownerComments}</p>
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-title">Source Files</div>
              <div className="file-list">
                {job.sourceFiles?.map(f => (
                  <div key={f._id} className="source-file-item">
                    {f.type === 'image' ? (
                      <div className="source-file-preview">
                        <img src={getViewUrl(job._id, f._id)} alt={f.originalName} className="file-thumb" />
                        <a href={getDownloadUrl(job._id, f._id, 'source')} className="file-item" download>{f.originalName}</a>
                      </div>
                    ) : (
                      <a href={getDownloadUrl(job._id, f._id, 'source')} className="file-item" download>
                        <span className="pdf-icon">PDF</span> {f.originalName}
                      </a>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSource(f._id)} title="Remove file">&times;</button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
                <div className="form-group">
                  <div className="file-input" onClick={() => document.getElementById('add-source-upload').click()} style={{ padding: '0.75rem' }}>
                    <input id="add-source-upload" type="file" accept="image/*,application/pdf" multiple
                      onChange={e => setNewFiles([...e.target.files])} />
                    {newFiles.length === 0 ? (
                      <p style={{ fontSize: '0.85rem' }}>Upload additional source files</p>
                    ) : (
                      <div className="file-list">
                        {[...newFiles].map((f, i) => <span key={i} className="file-item">{f.name}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddSources} disabled={uploading || newFiles.length === 0}>
                  {uploading ? 'Uploading...' : 'Add Files'}
                </button>
              </div>
            </div>

            {job.translatedFiles?.length > 0 && (
              <div className="card">
                <div className="section-title">Translated Files</div>
                <div className="file-list">
                  {job.translatedFiles.map(f => (
                    <a key={f._id} href={getDownloadUrl(job._id, f._id, 'translated')} className="file-item" download>
                      {f.originalName} (v{f.version})
                    </a>
                  ))}
                </div>
              </div>
            )}

            {job.status === 'SUBMITTED' && (
              <div className="card" style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-success" onClick={handleMarkDone}>Mark as Done</button>
                <button className="btn btn-warning" onClick={() => setRedoModal(true)}>Request Redo</button>
              </div>
            )}
          </div>

          <div>
            <div className="card">
              <div className="section-title">Timeline</div>
              <div className="timeline">
                {history.map((h, i) => (
                  <div key={i} className="timeline-item">
                    <div className="time">{new Date(h.at).toLocaleString('en-GB')} — {h.actor}</div>
                    <div className="note"><strong>{STATUS_LABELS[h.status] || h.status}</strong>{h.note ? ` — ${h.note}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {redoModal && (
        <div className="modal-overlay" onClick={() => setRedoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Request Redo</h2>
            <div className="form-group">
              <label>Reason for redo</label>
              <textarea value={redoComment} onChange={e => setRedoComment(e.target.value)} placeholder="Explain what needs to be corrected..." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRedoModal(false)}>Cancel</button>
              <button className="btn btn-warning" onClick={handleRedo}>Request Redo</button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Job</h2>
            <div className="form-group">
              <label>Job Title</label>
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Instructions / Comments</label>
              <textarea value={editComments} onChange={e => setEditComments(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="edit-deadline" value="immediate" checked={editDeadline === 'immediate'} onChange={e => setEditDeadline(e.target.value)} />
                  Immediate
                </label>
                <label className="radio-label">
                  <input type="radio" name="edit-deadline" value="today" checked={editDeadline === 'today'} onChange={e => setEditDeadline(e.target.value)} />
                  Within Today
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Delete Job</h2>
            <p style={{ marginBottom: '1rem' }}>Are you sure you want to delete this job? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
