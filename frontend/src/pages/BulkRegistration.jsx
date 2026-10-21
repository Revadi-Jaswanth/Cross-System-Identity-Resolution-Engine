import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { ArrowLeft, Download } from 'lucide-react';
import CSVUploader from '@/components/identity/CSVUploader';
import CSVPreviewTable from '@/components/identity/CSVPreviewTable';
import DuplicatePreviewModal from '@/components/identity/DuplicatePreviewModal';
import UploadProgressDialog from '@/components/identity/UploadProgressDialog';
import ImportSummary from '@/components/identity/ImportSummary';
import ImportHistoryTable from '@/components/identity/ImportHistoryTable';

export const BulkRegistration = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [parsedRecords, setParsedRecords] = useState([]);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [uploadProgressOpen, setUploadProgressOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importSummary, setImportSummary] = useState(null);

  // Check duplicate rows inside file
  const findFileDuplicates = (records) => {
    const seen = new Set();
    const dups = [];
    records.forEach(rec => {
      const key = `${rec.system_source}:${rec.system_uid}`;
      if (seen.has(key)) {
        dups.push(rec);
      } else {
        seen.add(key);
      }
    });
    return dups;
  };

  const bulkMutation = useMutation({
    mutationFn: (payload) => api.post('/v1/identities/ingest/bulk', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['identities']);
      setImportSummary(res.data?.data || { processed: parsedRecords.length, failed: 0, failures: [] });
    },
    onError: (err) => {
      setImportSummary({
        processed: 0,
        failed: parsedRecords.length,
        failures: [{ index: 0, error: err.message }]
      });
    },
    onSettled: () => {
      setUploadProgressOpen(false);
    }
  });

  const handleFileParsed = (records) => {
    setParsedRecords(records);
    const duplicates = findFileDuplicates(records);
    if (duplicates.length > 0) {
      setDuplicateWarningOpen(true);
    }
  };

  const handleStartImport = () => {
    setDuplicateWarningOpen(false);
    setUploadProgressOpen(true);
    setUploadProgress(0);

    // Mock progress visual updates
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= parsedRecords.length - 1) {
          clearInterval(interval);
          return parsedRecords.length;
        }
        return prev + Math.floor(parsedRecords.length / 5);
      });
    }, 400);

    bulkMutation.mutate({ records: parsedRecords });
  };

  // Download template CSV format
  const handleDownloadTemplate = () => {
    const headers = ['system_source', 'system_uid', 'organization_id', 'name', 'dob', 'gender', 'address', 'aadhaar', 'email'];
    const row = ['AadhaarService', 'UID-001', '1', 'Rajesh Kumar', '1990-01-01', 'M', '123 Main Road New Delhi', '123456789012', 'operator@resolution.gov.in'];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Identity_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Bulk Ingestion Console
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Ingest multiple records using CSV spreadsheets files.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
        >
          <Download size={14} />
          <span>Download CSV Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ingestion controllers */}
        <div className="lg:col-span-2 space-y-6">
          {importSummary ? (
            <ImportSummary summary={importSummary} onReset={() => { setImportSummary(null); setParsedRecords([]); }} />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-6">
              <CSVUploader onFileParsed={handleFileParsed} />
              <CSVPreviewTable records={parsedRecords} />
              
              {parsedRecords.length > 0 && (
                <button
                  onClick={handleStartImport}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors uppercase tracking-wider"
                >
                  Start Batch Ingest
                </button>
              )}
            </div>
          )}
        </div>

        {/* History panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft h-fit">
          <ImportHistoryTable />
        </div>

      </div>

      {/* Confirmation warning */}
      <DuplicatePreviewModal
        isOpen={duplicateWarningOpen}
        onClose={() => setDuplicateWarningOpen(false)}
        onConfirm={handleStartImport}
        duplicates={findFileDuplicates(parsedRecords)}
      />

      <UploadProgressDialog
        isOpen={uploadProgressOpen}
        progress={uploadProgress}
        total={parsedRecords.length}
        onCancel={() => setUploadProgressOpen(false)}
      />
    </div>
  );
};
export default BulkRegistration;
