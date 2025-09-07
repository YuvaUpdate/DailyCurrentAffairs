import { X, Calendar, ExternalLink, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Article } from "@/types/article";
import { formatDistanceToNow } from "date-fns";

interface ArticleModalProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLink: (url: string) => void;
}

export function ArticleModal({ article, isOpen, onClose, onOpenLink }: ArticleModalProps) {
  if (!article) return null;

  const timeAgo = formatDistanceToNow(article.publishedAt, { addSuffix: true });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 bg-card">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="interactive flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{timeAgo}</span>
              <span>•</span>
              <span>{article.source}</span>
              {article.readTime && (
                <>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{article.readTime} min read</span>
                </>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onOpenLink(article.sourceUrl)}
            className="interactive flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Original
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <article className="max-w-content mx-auto space-y-6">
            {article.category && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {article.category}
              </Badge>
            )}

            <h1 className="text-2xl md:text-3xl font-bold text-card-foreground leading-tight">
              {article.title}
            </h1>

            {article.imageUrl && (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {article.summary}
              </p>
              
              {article.content && (
                <div 
                  className="mt-6 text-card-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              )}
            </div>

            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {article.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </article>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}