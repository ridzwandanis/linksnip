import { useState } from "react";
import Header from "@/components/Header";
import URLCard from "@/components/URLCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShortenUrl, LocalUrl, createLocalUrl } from "@/hooks/useUrls";
import { validateCustomCode, validateUrl } from "@/utils/validation";
import { formatError } from "@/lib/errorHandler";
import { Loader2 } from "lucide-react";

const Main = () => {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [showCustomizeFor, setShowCustomizeFor] = useState<string | null>(null);
  const [customCode, setCustomCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [urls, setUrls] = useState<LocalUrl[]>([]);

  const shortenMutation = useShortenUrl();

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError("");

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      setUrlError(urlValidation.error || "Invalid URL");
      return;
    }

    // Call API to shorten URL
    const response = await shortenMutation.mutateAsync({ url });

    if (response.success && response.data) {
      const newUrl = createLocalUrl(response.data);
      setUrls([newUrl, ...urls]);
      setUrl("");
      setShowCustomizeFor(newUrl.localId);
    } else if (response.error) {
      const formatted = formatError(response.error);
      setUrlError(formatted.message);
    }
  };

  const handleShortenWithCustomCode = async (urlId: string) => {
    // Validate custom code
    const validation = validateCustomCode(customCode);
    if (!validation.valid) {
      setCodeError(validation.error || "Custom code tidak valid");
      return;
    }

    // Find the URL to update
    const urlToUpdate = urls.find((u) => u.localId === urlId);
    if (!urlToUpdate) return;

    // Call API with custom code
    const response = await shortenMutation.mutateAsync({
      url: urlToUpdate.originalUrl,
      customCode: customCode,
    });

    if (response.success && response.data) {
      // Update the URL in the list with new short code
      setUrls(
        urls.map((u) =>
          u.localId === urlId
            ? { ...createLocalUrl(response.data!), localId: urlId }
            : u
        )
      );
      setCustomCode("");
      setCodeError("");
      setShowCustomizeFor(null);
    } else if (response.error) {
      const formatted = formatError(response.error);
      setCodeError(formatted.message);
    }
  };

  const isLoading = shortenMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center space-y-12 mb-24">
          <h1 className="text-5xl font-semibold tracking-tight">
            Shorten Your Link
          </h1>

          <form onSubmit={handleShorten} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="Paste your long URL here"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError("");
                }}
                required
                className="h-14 text-base"
                disabled={isLoading}
              />
              {urlError && (
                <p className="text-sm text-destructive text-left">{urlError}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Shortening...
                </>
              ) : (
                "Shorten Now"
              )}
            </Button>
          </form>
        </div>

        {/* Recent URLs */}
        {urls.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Recent Links
            </h2>
            <div className="space-y-4">
              {urls.map((urlItem) => (
                <div key={urlItem.localId} className="space-y-3">
                  <URLCard
                    originalUrl={urlItem.originalUrl}
                    shortUrl={urlItem.shortUrl}
                    clicks={urlItem.clicks}
                  />

                  {showCustomizeFor === urlItem.localId && (
                    <div className="border border-border bg-card p-6 space-y-4">
                      <h3 className="font-medium">Customize your short link</h3>
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Enter custom code - e.g., my-link"
                          value={customCode}
                          onChange={(e) => {
                            setCustomCode(e.target.value);
                            setCodeError("");
                          }}
                          className="h-12"
                          disabled={isLoading}
                        />
                        {codeError && (
                          <p className="text-sm text-destructive">
                            {codeError}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          3-20 characters, letters, numbers, hyphens,
                          underscores only.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() =>
                            handleShortenWithCustomCode(urlItem.localId)
                          }
                          className="flex-1"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            "Apply Custom Code"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowCustomizeFor(null);
                            setCustomCode("");
                            setCodeError("");
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {showCustomizeFor !== urlItem.localId && (
                    <Button
                      variant="outline"
                      onClick={() => setShowCustomizeFor(urlItem.localId)}
                      className="w-full"
                    >
                      Customize Link
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Main;
