import React, { useState } from 'react';
import { Upload, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';

export const CSVUploader = ({ onFileParsed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [validationReport, setValidationReport] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileParse = (file) => {
    setError('');
    setValidationReport(null);

    // 10MB size validation check
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setError('File size exceeds the maximum limit of 10MB.');
      return;
    }

    // MIME type checking validation
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Invalid file type. Only CSV files (.csv) are accepted.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const rawRows = text.split('\n').map(line => line.split(','));
        
        // Remove empty row lines
        const rows = rawRows.filter(row => row.length > 0 && row.some(cell => cell.trim().length > 0));

        if (rows.length === 0) {
          setError('CSV file is empty.');
          return;
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        // Mandatory columns schema validation check
        const requiredHeaders = ['system_source', 'system_uid', 'organization_id', 'name'];
        const missing = requiredHeaders.filter(r => !headers.includes(r));
        
        if (missing.length > 0) {
          setError(`Invalid CSV schema. Missing headers: ${missing.join(', ')}`);
          return;
        }

        const parsedRecords = [];
        const fileDuplicates = [];
        const seenKeys = new Set();
        let invalidRowsCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === headers.length) {
            const record = {};
            headers.forEach((h, idx) => {
              record[h] = row[idx]?.trim();
            });

            const source = record.system_source;
            const uid = record.system_uid;
            const orgId = parseInt(record.organization_id);

            // Basic row sanity validations
            if (!source || !uid || isNaN(orgId) || !record.name) {
              invalidRowsCount++;
              continue;
            }

            const recKey = `${source}:${uid}`;
            if (seenKeys.has(recKey)) {
              fileDuplicates.push({ index: i, system_source: source, system_uid: uid });
            } else {
              seenKeys.add(recKey);
            }

            parsedRecords.push({
              system_source: source,
              system_uid: uid,
              organization_id: orgId,
              attributes: {
                name: record.name,
                dob: record.dob || null,
                gender: record.gender || null,
                address: record.address || null,
                aadhaar: record.aadhaar || null,
                abha: record.abha || null,
                digilocker: record.digilocker || null,
                mobile: record.mobile || null,
                email: record.email || null
              }
            });
          } else {
            invalidRowsCount++;
          }
        }

        const report = {
          totalRows: rows.length - 1,
          validRows: parsedRecords.length - fileDuplicates.length,
          invalidRows: invalidRowsCount,
          duplicatesCount: fileDuplicates.length,
          duplicatesList: fileDuplicates
        };

        setValidationReport(report);
        onFileParsed(parsedRecords, report);
      } catch (err) {
        setError('Failed to parse CSV spreadsheet. Please confirm formatting options.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileParse(e.dataTransfer.files[0]);
    }
  };

  const downloadValidationReport = () => {
    if (!validationReport) return;
    const reportText = `CSV Validation Summary Report\n` +
      `-----------------------------\n` +
      `Total Rows Evaluated: ${validationReport.totalRows}\n` +
      `Valid Ingestible Rows: ${validationReport.validRows}\n` +
      `Malformed/Invalid Rows: ${validationReport.invalidRows}\n` +
      `Internal File Duplicates: ${validationReport.duplicatesCount}\n`;
    
    const csvContent = "data:text/plain;charset=utf-8," + encodeURIComponent(reportText);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `CSV_Validation_Report_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-premium text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {validationReport && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-premium flex items-center justify-between text-xs animate-slide-in">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">CSV validation completed</p>
            <p className="text-slate-400 mt-1">
              Valid: {validationReport.validRows} • Malformed: {validationReport.invalidRows} • Duplicates: {validationReport.duplicatesCount}
            </p>
          </div>
          <button
            onClick={downloadValidationReport}
            className="flex items-center gap-1 px-3 py-1.5 border rounded-premium font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors uppercase tracking-wider"
          >
            <Download size={14} />
            <span>Download Report</span>
          </button>
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-premium text-center transition-all ${
          dragActive
            ? 'border-primary-500 bg-primary-50/10'
            : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
        }`}
      >
        <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full mb-4">
          <Upload size={32} />
        </div>
        
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          Drag and drop your ingestion CSV here
        </h3>
        
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 max-w-xs">
          Files must not exceed 10MB. Requires `system_source`, `system_uid`, `organization_id`, and `name`.
        </p>

        <label className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold text-xs rounded-premium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors uppercase tracking-wider">
          Browse CSV File
          <input
            type="file"
            className="hidden"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileParse(e.target.files[0]);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
};
export default CSVUploader;
