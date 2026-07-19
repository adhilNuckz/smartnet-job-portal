import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NewJobPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [comments, setComments] = useState('');
  const [deadline, setDeadline] = useState('immediate');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Title is required'); return; }
    if (!deadline) { setError('Deadline is required'); return; }
    if (files.length === 0) { setError('At least one file is required'); return; }

    setLoading(true);
    console.log('[NewJobPage] Submitting job:', { title, comments, deadline, fileCount: files.length });
    for (const f of files) {
      console.log('[NewJobPage] File:', { name: f.name, size: f.size, type: f.type });
    }
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('comments', comments);
      formData.append('deadline', deadline);
      for (const f of files) formData.append('files', f);
      console.log('[NewJobPage] Sending POST /api/jobs with FormData');
      const result = await createJob(formData);
      console.log('[NewJobPage] Job created successfully:', result);
      navigate('/dashboard/owner');
    } catch (err) {
      console.error('[NewJobPage] Error creating job:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <span className="navbar-brand">SmartNet — New Job</span>
          <div className="navbar-right">
            <span>{user?.username}</span>
            <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => navigate('/dashboard/owner')}>Back</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ marginTop: '1.5rem', maxWidth: '600px' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Create New Job</h1>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Job Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Passport Translation" />
          </div>
          <div className="form-group">
            <label>Instructions / Comments</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Describe what needs to be translated..." />
          </div>
          <div className="form-group">
            <label>Deadline</label>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" name="deadline" value="immediate" checked={deadline === 'immediate'} onChange={e => setDeadline(e.target.value)} />
                Immediate
              </label>
              <label className="radio-label">
                <input type="radio" name="deadline" value="today" checked={deadline === 'today'} onChange={e => setDeadline(e.target.value)} />
                Within Today
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Files (images or PDF)</label>
            <div className="file-input" onClick={() => document.getElementById('file-upload').click()}>
              <input id="file-upload" type="file" accept="image/*,application/pdf" capture="environment" multiple
                onChange={e => setFiles([...e.target.files])} />
              {files.length === 0 ? (
                <p>Tap to take photos or choose files</p>
              ) : (
                <div className="file-list">
                  {[...files].map((f, i) => <span key={i} className="file-item">{f.name}</span>)}
                </div>
              )}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        </form>
      </div>
    </div>
  );
}
