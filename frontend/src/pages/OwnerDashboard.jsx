import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchJobs } from '../api/client';
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

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'ALL' ? jobs : jobs.filter(j => j.status === filter);

  const isOverdue = (job) => {
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
          <span className="navbar-brand">SmartNet — Owner</span>
          <div className="navbar-right">
            <span>{user?.username}</span>
            <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: '#fff' }} onClick={logout}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ marginTop: '1.5rem' }}>
        <div className="page-header">
          <h1>Jobs</h1>
          <Link to="/dashboard/owner/new" className="btn btn-primary">+ New Job</Link>
        </div>

        <div className="job-filters">
          {['ALL', 'CREATED', 'VIEWED', 'IN_PROGRESS', 'SUBMITTED', 'DONE', 'REDO'].map(s => (
            <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
              {s === 'ALL' ? 'All' : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><span className="spinner"></span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No jobs found</p></div>
        ) : (
          <div className="job-grid">
            {filtered.map(job => (
              <Link to={`/dashboard/owner/job/${job._id}`} key={job._id} className={`card job-card ${isOverdue(job) ? 'urgent' : ''}`}>
                <div className="job-card-info">
                  <h3>{job.title}</h3>
                  <div className="meta">
                    Deadline: {deadlineLabel(job.deadline)}
                    {isOverdue(job) && <span className="overdue"> (OVERDUE)</span>}
                  </div>
                </div>
                <div className="job-card-actions">
                  <span className={`status-badge ${job.status.toLowerCase()}`}>
                    {STATUS_LABELS[job.status] || job.status}
                  </span>
                  <span className="spinner" style={{ display: 'none' }}></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
