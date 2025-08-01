
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function ParametresPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Gérez les paramètres de votre compte et de l&apos;application.</p>
      </div>

      <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed">
        <CardHeader>
          <div className="mx-auto bg-muted p-4 rounded-full">
            <Settings className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">Bientôt disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La page des paramètres est en cours de préparation. Vous pourrez bientôt y gérer vos préférences de compte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
