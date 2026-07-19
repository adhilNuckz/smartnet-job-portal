import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startJob, submitJob, reopenJob, deleteTranslatedFile, getDownloadUrl, getViewUrl } from '../api/client';
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

export default function TranslatorJobDetail() {
  const { user, logout } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
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

  const handleStart = async () => {
    try {
      await startJob(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleSubmit = async () => {
    if (files.length === 0) { setError('Please select translated files to upload'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      for (const f of files) formData.append('files', f);
      await submitJob(id, formData);
      setFiles([]);
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleReopen = async () => {
    try {
      await reopenJob(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteTranslated = async (fileId, fileName) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      await deleteTranslatedFile(id, fileId);
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading"><span className="spinner"></span></div>;
  if (!job) return <div className="container" style={{ marginTop: '2rem' }}><p>Job not found</p></div>;

  const isOverdue = () => {
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
            <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => navigate('/dashboard/translator')}>Back</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ marginTop: '1.5rem' }}>
        {error && <div className="error-msg">{error}</div>}

        <div className="job-detail-grid">
          <div>
            <div className="card">
              <h2 style={{ marginBottom: '0.5rem' }}>{job.title}</h2>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Deadline: {deadlineLabel(job.deadline)}
                {isOverdue() && job.status !== 'DONE' && <span className="overdue"> (OVERDUE)</span>}
              </p>
              <span className={`status-badge ${job.status.toLowerCase()}`}>{STATUS_LABELS[job.status] || job.status}</span>
              {job.ownerComments && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="section-title">Owner Instructions</div>
                  <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{job.ownerComments}</p>
                </div>
              )}
            </div>

            {job.redoComments?.length > 0 && (
              <div className="redo-banner">
                <strong>Redo Requested</strong>
                {job.redoComments.map((rc, i) => (
                  <p key={i} style={{ marginTop: i > 0 ? '0.3rem' : 0 }}>{rc.text} <em style={{ fontSize: '0.75rem', color: '#6b7280' }}>({new Date(rc.at).toLocaleString('en-GB')})</em></p>
                ))}
              </div>
            )}

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
                  </div>
                ))}
              </div>
            </div>

            {(job.status === 'VIEWED' || job.status === 'CREATED') && (
              <div className="card">
                <button className="btn btn-primary" onClick={handleStart}>Start Task</button>
              </div>
            )}

            {job.translatedFiles?.length > 0 && (
              <div className="card">
                <div className="section-title">My Translated Files</div>
                <div className="file-list">
                  {job.translatedFiles.map(f => (
                    <div key={f._id} className="source-file-item">
                      <a href={getDownloadUrl(job._id, f._id, 'translated')} className="file-item" download>
                        {f.originalName} (v{f.version})
                      </a>
                      {job.status !== 'SUBMITTED' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTranslated(f._id, f.originalName)} title="Delete file">&times;</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.status === 'IN_PROGRESS' && (
              <div className="card">
                <div className="section-title">Upload Translated Files</div>
                {job.translatedFiles?.length > 0 && (
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Previously uploaded files shown above. Upload new files to add or update.
                  </p>
                )}
                <div className="form-group">
                  <div className="file-input" onClick={() => document.getElementById('trans-file-upload').click()}>
                    <input id="trans-file-upload" type="file" accept="*/*" multiple
                      onChange={e => setFiles([...e.target.files])} />
                    {files.length === 0 ? (
                      <p>Select translated files to upload</p>
                    ) : (
                      <div className="file-list">
                        {[...files].map((f, i) => <span key={i} className="file-item">{f.name}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <button className="btn btn-success" onClick={handleSubmit} disabled={submitting || files.length === 0}>
                  {submitting ? 'Submitting...' : 'Submit Translation'}
                </button>
              </div>
            )}

            {job.status === 'DONE' && (
              <div className="card">
                <button className="btn btn-warning" onClick={handleReopen}>Reopen & Continue</button>
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
    </div>
  );
}
