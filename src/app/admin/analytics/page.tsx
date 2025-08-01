
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Suivez les performances de vos stations.</p>
      </div>

      <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed">
        <CardHeader>
          <div className="mx-auto bg-muted p-4 rounded-full">
            <BarChart2 className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">Bientôt disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La section des statistiques est en cours de développement. Revenez bientôt pour découvrir des données détaillées sur l&apos;écoute de vos stations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
