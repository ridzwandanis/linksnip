import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface URLCardProps {
  originalUrl: string;
  shortUrl: string;
  clicks: number;
}

const URLCard = ({ originalUrl, shortUrl, clicks }: URLCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border bg-card p-6 space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Original URL
        </p>
        <p className="text-sm break-all">{originalUrl}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Short URL
        </p>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium flex-1">{shortUrl}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{clicks}</span> clicks
        </p>
      </div>
    </div>
  );
};

export default URLCard;
