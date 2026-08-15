import { formatDate } from './dateUtils';

/**
 * Utility functions for exporting data to CSV / Excel formatted files.
 * Includes UTF-8 BOM (\uFEFF) for seamless opening in Microsoft Excel.
 */

function downloadCSV(filename, content) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export full Girvi Ledger to Excel / CSV
 */
export function exportGirviLedger(girvis) {
  const headers = [
    'Pledge No',
    'Customer Name',
    'Relation Type',
    'Relation Name',
    'Mobile Number',
    'Pledge Date',
    'Due Date',
    'Items Description',
    'Net Weight (g)',
    'Gross Weight (g)',
    'Present Value (₹)',
    'Loan Amount (₹)',
    'Status'
  ];

  const rows = girvis.map(g => {
    const relation = (g.relation_type || '') + ' ' + (g.relation_name || '');
    const items = g.articles?.map(a => `${a.name} (${a.quantity})`).join('; ') || '-';
    const netWt = g.articles?.reduce((sum, a) => sum + (Number(a.net_wt) || 0), 0).toFixed(2) || '0.00';
    const grossWt = g.articles?.reduce((sum, a) => sum + (Number(a.gross_wt) || 0), 0).toFixed(2) || '0.00';

    return [
      g.pledge_no,
      g.customer_name,
      g.relation_type || '',
      g.relation_name || '',
      g.mobile_number ? g.mobile_number.replace('+91', '') : '',
      formatDate(g.pledge_date),
      formatDate(g.due_date),
      items,
      netWt,
      grossWt,
      g.present_value || 0,
      g.loan_amount || 0,
      g.status || 'Active'
    ].map(escapeCSV).join(',');
  });

  const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');
  const filename = `Girvi_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(filename, csvContent);
}

/**
 * Export Bank Re-Pledges & Interest Logs to Excel / CSV
 */
export function exportBankRePledges(repledges) {
  const headers = [
    'Bank Name',
    'Loan Number',
    'Repledger Name',
    'Date of Loan',
    'Bank Loan Amount (₹)',
    'Total Interest Paid (₹)',
    'Status',
    'Linked Customer Girvis Count',
    'Interest Payments Log'
  ];

  const rows = repledges.map(r => {
    const totalPaid = r.transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
    const txLog = r.transactions?.map(t => 
      `${formatDate(t.payment_date)}: ₹${t.amount}${t.remarks ? ' (' + t.remarks + ')' : ''}`
    ).join(' | ') || 'No payments recorded';

    return [
      r.bank_name,
      r.loan_number,
      r.repledger_name,
      formatDate(r.date_of_loan),
      r.amount || 0,
      totalPaid,
      r.status || 'Active',
      r.girvis?.length || 0,
      txLog
    ].map(escapeCSV).join(',');
  });

  const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');
  const filename = `Bank_RePledge_Report_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(filename, csvContent);
}

/**
 * Export Date-Wise Interest Collection Report
 */
export function exportInterestReport(repledges) {
  const headers = [
    'Bank Name',
    'Bank Loan No',
    'Repledger Name',
    'Payment Date',
    'Interest Amount Paid (₹)',
    'Remarks'
  ];

  const rows = [];
  repledges.forEach(r => {
    if (r.transactions && r.transactions.length > 0) {
      r.transactions.forEach(t => {
        rows.push([
          r.bank_name,
          r.loan_number,
          r.repledger_name,
          formatDate(t.payment_date),
          t.amount || 0,
          t.remarks || '-'
        ].map(escapeCSV).join(','));
      });
    }
  });

  const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');
  const filename = `Interest_Collection_Report_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(filename, csvContent);
}

