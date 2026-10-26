const units = ['B', 'KB', 'MB', 'GB'];

export default function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unitIndex);
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}