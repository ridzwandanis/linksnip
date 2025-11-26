import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  useSystemAnalytics,
  usePopularUrls,
  AuthCredentials,
} from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/use-toast";
import { deleteUrl, shortenUrl } from "@/services/urlService";
import { validateCustomCode } from "@/utils/validation";
import { formatError } from "@/lib/errorHandler";
import {
  Loader2,
  Copy,
  Trash2,
  Edit,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const AUTH_STORAGE_KEY = "analytics_auth";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ITEMS_PER_PAGE = 10;

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<AuthCredentials | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [urlToDelete, setUrlToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [urlToEdit, setUrlToEdit] = useState<{
    shortCode: string;
    originalUrl: string;
  } | null>(null);
  const [newCustomCode, setNewCustomCode] = useState("");
  const [customCodeError, setCustomCodeError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        setCredentials(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        navigate("/login", { state: { from: "/dashboard" } });
      }
    } else {
      navigate("/login", { state: { from: "/dashboard" } });
    }
    setIsCheckingAuth(false);
  }, [navigate]);

  const systemAnalytics = useSystemAnalytics(credentials);
  const popularUrls = usePopularUrls(credentials, 10);

  useEffect(() => {
    if (systemAnalytics.data?.error?.status === 401) {
      setCredentials(null);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      navigate("/login", { state: { from: "/dashboard" } });
    }
  }, [systemAnalytics.data, navigate]);

  const handleCopyUrl = async (shortCode: string) => {
    const shortUrl = `${API_BASE_URL}/${shortCode}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedCode(shortCode);
      toast({ title: "Berhasil!", description: "URL berhasil disalin" });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast({
        title: "Gagal",
        description: "Tidak dapat menyalin URL",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (shortCode: string) => {
    setUrlToDelete(shortCode);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!urlToDelete) return;
    setIsDeleting(true);
    const response = await deleteUrl(urlToDelete);
    setIsDeleting(false);
    if (response.success) {
      toast({ title: "Berhasil!", description: "URL berhasil dihapus" });
      popularUrls.refetch();
      systemAnalytics.refetch();
      // Reset to page 1 if current page becomes empty after delete
      const remainingItems = (popularUrls.data?.data?.length || 1) - 1;
      const newTotalPages = Math.ceil(remainingItems / ITEMS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } else if (response.error) {
      const formatted = formatError(response.error);
      toast({
        title: formatted.title,
        description: formatted.message,
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setUrlToDelete(null);
  };

  const handleEditClick = (shortCode: string, originalUrl: string) => {
    setUrlToEdit({ shortCode, originalUrl });
    setNewCustomCode(shortCode);
    setCustomCodeError("");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!urlToEdit) return;

    // Validate custom code
    const validation = validateCustomCode(newCustomCode);
    if (!validation.valid) {
      setCustomCodeError(validation.error || "Custom code tidak valid");
      return;
    }

    // If code hasn't changed, just close
    if (newCustomCode === urlToEdit.shortCode) {
      setEditDialogOpen(false);
      return;
    }

    setIsSavingEdit(true);

    // Create new URL with custom code
    const response = await shortenUrl({
      url: urlToEdit.originalUrl,
      customCode: newCustomCode,
    });

    setIsSavingEdit(false);

    if (response.success) {
      // Delete old URL
      await deleteUrl(urlToEdit.shortCode);

      toast({ title: "Berhasil!", description: "Custom code berhasil diubah" });
      popularUrls.refetch();
      systemAnalytics.refetch();
      setEditDialogOpen(false);
      setUrlToEdit(null);
      setNewCustomCode("");
    } else if (response.error) {
      const formatted = formatError(response.error);
      setCustomCodeError(formatted.message);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!credentials) return null;

  const isLoading = systemAnalytics.isLoading || popularUrls.isLoading;
  const analytics = systemAnalytics.data?.data;
  const allUrls = popularUrls.data?.data || [];

  // Pagination logic
  const totalPages = Math.ceil(allUrls.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const urls = allUrls.slice(startIndex, endIndex);

  const chartData =
    allUrls.length > 0
      ? allUrls
          .slice(0, 7)
          .map((url) => ({ name: url.shortCode, clicks: url.clicks || 0 }))
      : [];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus URL?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong>{urlToDelete}</strong>? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Custom Code</DialogTitle>
            <DialogDescription>
              Ubah custom code untuk short URL ini
            </DialogDescription>
          </DialogHeader>
          {urlToEdit && (
            <div className="space-y-4">
              <div>
                <Label>Original URL</Label>
                <Input
                  value={urlToEdit.originalUrl}
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Current Short Code</Label>
                <Input
                  value={urlToEdit.shortCode}
                  readOnly
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label>New Custom Code</Label>
                <Input
                  value={newCustomCode}
                  onChange={(e) => {
                    setNewCustomCode(e.target.value);
                    setCustomCodeError("");
                  }}
                  placeholder="my-custom-code"
                  className="mt-1 font-mono"
                  disabled={isSavingEdit}
                  autoFocus
                />
                {customCodeError && (
                  <p className="text-sm text-destructive mt-1">
                    {customCodeError}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  3-20 karakter, huruf, angka, hyphens, underscores
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSavingEdit}
            >
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <main className="container mx-auto px-6 py-16 space-y-16">
        <div className="text-center">
          <h1 className="text-5xl font-semibold tracking-tight">
            Analytics Dashboard
          </h1>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <StatsCard
                title="Total Clicks"
                value={analytics?.totalClicks?.toString() || "0"}
                description="Across all your links"
              />
              <StatsCard
                title="URLs Created"
                value={analytics?.totalUrls?.toString() || "0"}
                description="Total shortened URLs"
              />
            </div>
            <div className="max-w-5xl mx-auto space-y-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Top URLs by Clicks
              </h2>
              <div className="border border-border bg-card p-8">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [
                          `${value} clicks`,
                          "Clicks",
                        ]}
                      />
                      <Bar
                        dataKey="clicks"
                        fill="hsl(var(--foreground))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Belum ada data
                  </div>
                )}
              </div>
            </div>
            <div className="max-w-5xl mx-auto space-y-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Popular Links
              </h2>
              <div className="border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-medium">Short Code</TableHead>
                      <TableHead className="font-medium">
                        Original URL
                      </TableHead>
                      <TableHead className="font-medium text-center">
                        Clicks
                      </TableHead>
                      <TableHead className="font-medium">Created</TableHead>
                      <TableHead className="font-medium text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urls.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          Belum ada URL
                        </TableCell>
                      </TableRow>
                    ) : (
                      urls.map((url) => (
                        <TableRow key={url.shortCode}>
                          <TableCell className="font-medium font-mono">
                            {url.shortCode}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[300px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate cursor-help">
                                  {url.originalUrl}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-md">
                                <p className="break-all">{url.originalUrl}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {url.clicks || 0}
                          </TableCell>
                          <TableCell>{formatDate(url.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleCopyUrl(url.shortCode)}
                                  >
                                    {copiedCode === url.shortCode ? (
                                      <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy URL</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      handleEditClick(
                                        url.shortCode,
                                        url.originalUrl
                                      )
                                    }
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Edit Custom Code
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      handleDeleteClick(url.shortCode)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {allUrls.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {startIndex + 1} -{" "}
                      {Math.min(endIndex, allUrls.length)} dari {allUrls.length}{" "}
                      URL
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-9"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
