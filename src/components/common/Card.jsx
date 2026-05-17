export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-4 py-3 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 ${onClick ? 'cursor-pointer active:bg-gray-50 select-none' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
