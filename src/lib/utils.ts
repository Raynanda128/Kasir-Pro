export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  });
}
