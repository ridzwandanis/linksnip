/**
 * React Query Hooks for URL Operations
 * Requirements: 2.4, 5.1, 5.4
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  shortenUrl,
  deleteUrl,
  ShortenUrlRequest,
  ShortenedUrl,
} from "@/services/urlService";
import { useToast } from "@/hooks/use-toast";
import { formatError } from "@/lib/errorHandler";

/**
 * Hook for shortening URLs
 * Requirements: 2.4
 */
export function useShortenUrl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: ShortenUrlRequest) => shortenUrl(request),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch URL lists
        queryClient.invalidateQueries({ queryKey: ["urls"] });
        toast({
          title: "Berhasil!",
          description: "URL berhasil dipendekkan",
        });
      } else if (response.error) {
        const formatted = formatError(response.error);
        toast({
          title: formatted.title,
          description: formatted.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal memendekkan URL",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for deleting URLs
 * Requirements: 5.3, 5.4
 */
export function useDeleteUrl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (shortCode: string) => deleteUrl(shortCode),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch URL lists
        queryClient.invalidateQueries({ queryKey: ["urls"] });
        toast({
          title: "Dihapus",
          description: "URL berhasil dihapus",
        });
      } else if (response.error) {
        const formatted = formatError(response.error);
        toast({
          title: formatted.title,
          description: formatted.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus URL",
        variant: "destructive",
      });
    },
  });
}

/**
 * Local state management for recent URLs
 * Since we don't have a "get all URLs" endpoint for anonymous users,
 * we'll manage recent URLs in local state
 */
export interface LocalUrl extends ShortenedUrl {
  localId: string;
}

export function createLocalUrl(data: ShortenedUrl): LocalUrl {
  return {
    ...data,
    localId: data.id || Date.now().toString(),
  };
}
