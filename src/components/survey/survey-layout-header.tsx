import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Survey, SurveyStatus } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SurveyLayoutHeaderProps {
  survey: Survey;
  activeTab: 'edit' | 'settings' | 'responses';
}

const STATUS_VARIANTS: Record<SurveyStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  published: { variant: 'default', label: 'Published' },
  closed: { variant: 'outline', label: 'Closed' },
};

const TABS = [
  { key: 'edit' as const, label: 'Edit', href: (id: string) => `/surveys/${id}/edit` },
  { key: 'settings' as const, label: 'Settings', href: (id: string) => `/surveys/${id}/settings` },
  { key: 'responses' as const, label: 'Responses', href: (id: string) => `/surveys/${id}/responses` },
];

export function SurveyLayoutHeader({ survey, activeTab }: SurveyLayoutHeaderProps) {
  const statusConfig = STATUS_VARIANTS[survey.status];

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        {/* Back button and breadcrumb */}
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{survey.title}</span>
          </div>

          <Badge variant={statusConfig.variant} className="ml-2">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Tab navigation */}
        <nav className="flex gap-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.href(survey.id)}
                className={cn(
                  'relative pb-3 px-1 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
