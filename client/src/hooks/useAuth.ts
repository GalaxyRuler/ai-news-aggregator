import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: authStatus, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/status"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isAuthenticated: authStatus?.authenticated || false,
    isLoading,
    refetch,
  };
}