import { useLocation } from 'react-router-dom';
import { Construction, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { navigation } from '../../config/navigation';

interface ComingSoonPageProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  features?: string[];
}

export function ComingSoonPage({ title, description, icon: Icon, features }: ComingSoonPageProps) {
  const location = useLocation();

  // Auto-detect section from route if not provided
  const section = navigation.find(
    (s) => s.href && s.href !== '/' && location.pathname.startsWith(s.href)
  );

  const displayTitle = title || section?.label || 'Coming Soon';
  const DisplayIcon = Icon || section?.icon || Construction;
  const displayDescription =
    description || `The ${displayTitle} module is currently under development.`;
  const displayFeatures = features || section?.children?.map((c) => c.label) || [];

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <DisplayIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{displayTitle}</CardTitle>
          <CardDescription className="text-base">{displayDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {displayFeatures.length > 0 && (
            <div className="mt-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Planned Features:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {displayFeatures.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            Check back soon for updates, or contact the development team for more information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
