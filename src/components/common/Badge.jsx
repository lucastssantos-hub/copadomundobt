import { MATCH_STATUS_LABELS, MATCH_STATUS_COLORS } from '../../data/mockData';

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${MATCH_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {MATCH_STATUS_LABELS[status] || status}
    </span>
  );
}

export function CategoryBadge({ category }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
      CAT {category}
    </span>
  );
}
