import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, AlertTriangle } from "lucide-react";

interface VerificationBadgeProps {
  sourceUrls: string[];
  className?: string;
}

export function VerificationBadge({ sourceUrls, className = "" }: VerificationBadgeProps) {
  const hasValidSources = sourceUrls && sourceUrls.length > 0;
  
  if (!hasValidSources) {
    return (
      <Badge variant="destructive" className={`text-xs ${className}`}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        Unverified
      </Badge>
    );
  }

  return (
    <Badge variant="default" className={`bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs ${className}`}>
      <ShieldCheck className="w-3 h-3 mr-1" />
      Verified Sources
    </Badge>
  );
}

interface VerificationStatusProps {
  sourceUrls: string[];
  sources: string[];
  className?: string;
}

export function VerificationStatus({ sourceUrls, sources, className = "" }: VerificationStatusProps) {
  const hasValidSources = sourceUrls && sourceUrls.length > 0;
  const verifiedSourceCount = hasValidSources ? sourceUrls.length : 0;
  
  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      <Shield className="w-4 h-4" />
      <span>
        {hasValidSources 
          ? `${verifiedSourceCount} verified source${verifiedSourceCount !== 1 ? 's' : ''}`
          : 'Sources unverified'
        }
      </span>
    </div>
  );
}