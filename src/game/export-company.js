export function exportCompany(state) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'company-life-record.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

