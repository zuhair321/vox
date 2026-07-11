import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag, AlertCircle, CheckCircle, XCircle, Clock,
  User, MessageSquare, Server, Shield
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';
import { Avatar } from '../components/ui/Avatar';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatRelative } from '../utils/formatters';
import { useToastStore } from '../components/ui/Toast';

const reasonIcons: Record<string, typeof Flag> = {
  spam: AlertCircle,
  harassment: Shield,
  inappropriate: XCircle,
  unsafe: AlertCircle,
  other: Flag,
};

const reasonColors: Record<string, string> = {
  spam: 'text-warning',
  harassment: 'text-danger',
  inappropriate: 'text-pink-400',
  unsafe: 'text-orange-400',
  other: 'text-gray-400',
};

export function ReportsPage() {
  const {
    reports, reportsTotal, reportsPage, reportsPages,
    loading, fetchReports, updateReport
  } = useAdminStore();
  const { addToast } = useToastStore();

  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => { fetchReports({ status: statusFilter }); }, [statusFilter]);

  const handleResolve = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      await updateReport(id, { status });
      addToast('success', `Report ${status}`);
      setSelectedReport(null);
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-gray-400 mt-1">{reportsTotal} total reports</p>
        </div>
        <div className="flex gap-2">
          {['', 'pending', 'resolved', 'dismissed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === status
                  ? 'bg-accent text-white'
                  : 'bg-surface-3 text-gray-400 hover:text-white'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {reports.map((report, i) => {
            const Icon = reasonIcons[report.reason] || Flag;
            const color = reasonColors[report.reason] || 'text-gray-400';
            
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-panel-hover p-5 cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl bg-surface-3 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={report.type === 'user' ? 'info' : report.type === 'message' ? 'accent' : 'warning'}>
                        {report.type}
                      </Badge>
                      <Badge variant={
                        report.reason === 'spam' ? 'warning' :
                        report.reason === 'harassment' ? 'danger' :
                        report.reason === 'inappropriate' ? 'danger' : 'default'
                      }>
                        {report.reason}
                      </Badge>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{report.details || 'No additional details provided'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User size={10} /> Reported by @{report.reporter.username}
                      </span>
                      {report.reportedUser && (
                        <span className="flex items-center gap-1">
                          <Shield size={10} /> Against @{report.reportedUser.username}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {formatRelative(report.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {reports.length === 0 && !loading.reports && (
          <div className="text-center py-16">
            <Flag size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No reports found</p>
          </div>
        )}
      </div>

      <Pagination
        page={reportsPage}
        pages={reportsPages}
        onChange={p => fetchReports({ status: statusFilter, page: p })}
        className="justify-center"
      />

      {/* Report Detail Modal */}
      <Modal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Report Details"
        size="md"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={selectedReport.type === 'user' ? 'info' : 'accent'}>{selectedReport.type}</Badge>
              <Badge variant="warning">{selectedReport.reason}</Badge>
              <StatusBadge status={selectedReport.status} />
            </div>

            <div className="p-3 rounded-lg bg-surface-3/50">
              <p className="text-xs text-gray-500 uppercase mb-1">Details</p>
              <p className="text-sm text-gray-300">{selectedReport.details || 'No details provided'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-surface-3/50">
                <p className="text-xs text-gray-500 uppercase mb-1">Reporter</p>
                <div className="flex items-center gap-2">
                  <Avatar src={selectedReport.reporter.avatarUrl} size="sm" />
                  <span className="text-sm text-white">@{selectedReport.reporter.username}</span>
                </div>
              </div>
              {selectedReport.reportedUser && (
                <div className="p-3 rounded-lg bg-surface-3/50">
                  <p className="text-xs text-gray-500 uppercase mb-1">Reported User</p>
                  <div className="flex items-center gap-2">
                    <Avatar src={selectedReport.reportedUser.avatarUrl} size="sm" />
                    <span className="text-sm text-white">@{selectedReport.reportedUser.username}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">Submitted {formatDate(selectedReport.createdAt)}</p>

            {selectedReport.status === 'pending' && (
              <div className="flex justify-end gap-2 pt-2 border-t border-surface-4">
                <button
                  onClick={() => handleResolve(selectedReport.id, 'dismissed')}
                  className="btn-ghost"
                >
                  <XCircle size={14} className="mr-1 inline" /> Dismiss
                </button>
                <button
                  onClick={() => handleResolve(selectedReport.id, 'resolved')}
                  className="btn-primary"
                >
                  <CheckCircle size={14} className="mr-1 inline" /> Resolve
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
