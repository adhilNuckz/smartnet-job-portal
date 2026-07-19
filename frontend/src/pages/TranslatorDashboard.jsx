import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export default function TranslatorDashboard() {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState([]);
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

  const sortKey = (job) => {
    if (job.deadline === 'immediate') return 0;
    if (job.deadline === 'today') return 1;
    const dt = new Date(job.deadline);
    return isNaN(dt.getTime()) ? 3 : 2;
  };

  const sorted = [...jobs].sort((a, b) => {
    const ak = sortKey(a), bk = sortKey(b);
    if (ak !== bk) return ak - bk;
    if (ak === 2) return new Date(a.deadline) - new Date(b.deadline);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const isOverdue = (job) => {
    if (job.status === 'DONE') return false;
    if (job.deadline === 'today' && new Date().getHours() >= 18) return true;
    const dt = new Date(job.deadline);
    if (!isNaN(dt.getTime()) && dt < new Date()) return true;
    return false;
  };
  const isNew = (job) => job.status === 'CREATED';

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <span className="navbar-brand">SmartNet — Translator</span>
          <div className="navbar-right">
            <span>{user?.username}</span>
            <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: '#fff' }} onClick={logout}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ marginTop: '1.5rem' }}>
        <div className="page-header">
          <h1>Jobs</h1>
        </div>

        {loading ? (
          <div className="loading"><span className="spinner"></span></div>
        ) : sorted.length === 0 ? (
          <div className="empty-state"><p>No jobs assigned</p></div>
        ) : (
          <div className="job-grid">
            {sorted.map(job => (
              <Link to={`/dashboard/translator/job/${job._id}`} key={job._id} className={`card job-card ${isOverdue(job) ? 'urgent' : ''}`}>
                <div className="job-card-info">
                  <h3>{job.title} {isNew(job) && <span className="badge badge-cre">NEW</span>}</h3>
                  <div className="meta">
                    Deadline: {deadlineLabel(job.deadline)}
                    {isOverdue(job) && <span className="overdue"> (OVERDUE)</span>}
                  </div>
                </div>
                <div className="job-card-actions">
                  <span className={`status-badge ${job.status.toLowerCase()}`}>
                    {STATUS_LABELS[job.status] || job.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
