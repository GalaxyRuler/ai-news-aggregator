interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export function ConfidenceBadge({ confidence, className = "" }: ConfidenceBadgeProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "bg-green-500";
    if (confidence >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 85) return "text-green-600";
    if (confidence >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getConfidenceColor(confidence)}`}></div>
      <span className={`text-xs font-medium ${getConfidenceText(confidence)}`}>
        Analysis and summary of the news article
      </span>
    </div>
  );
}
