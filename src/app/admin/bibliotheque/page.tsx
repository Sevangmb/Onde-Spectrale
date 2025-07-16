
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Library } from 'lucide-react';

export default function BibliothequePage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">Bibliothèque</h1>
        <p className="text-muted-foreground">Gérez vos pistes musicales et vos messages sauvegardés.</p>
      </div>

      <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed">
        <CardHeader>
          <div className="mx-auto bg-muted p-4 rounded-full">
            <Library className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">Bientôt disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La bibliothèque musicale est en cours de construction. Bientôt, vous pourrez sauvegarder et organiser vos pistes préférées ici.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
