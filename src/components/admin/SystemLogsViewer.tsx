'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSystemLogs, type SystemLog } from '@/hooks/useSystemLogs';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Activity,
  Filter,
  RefreshCw,
  Download
} from 'lucide-react';

export function SystemLogsViewer() {
  const { 
    logs, 
    isLoading, 
    error, 
    errorLogs, 
    warningLogs, 
    infoLogs, 
    successLogs,
    getLogsByCategory 
  } = useSystemLogs();

  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);

  const getLevelIcon = (level: SystemLog['level']) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: SystemLog['level']) => {
    switch (level) {
      case 'error': return 'text-destructive';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'success': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getCategoryColor = (category: SystemLog['category']) => {
    switch (category) {
      case 'player': return 'bg-blue-100 text-blue-800';
      case 'station': return 'bg-purple-100 text-purple-800';
      case 'playlist': return 'bg-green-100 text-green-800';
      case 'auth': return 'bg-orange-100 text-orange-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    return filtered;
  };

  const exportLogs = () => {
    const filteredLogs = filterLogs();
    const csvContent = [
      'Timestamp,Level,Category,Message,User ID,Station ID',
      ...filteredLogs.map(log => 
        `${log.timestamp.toISOString()},${log.level},${log.category},"${log.message}",${log.userId || ''},${log.stationId || ''}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = filterLogs();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement des logs...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-destructive">
          <XCircle className="h-8 w-8 mx-auto mb-4" />
          <p>Erreur lors du chargement des logs</p>
          <p className="text-sm mt-2">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et Statistiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{errorLogs.length}</div>
              <p className="text-sm text-muted-foreground">Erreurs</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{warningLogs.length}</div>
              <p className="text-sm text-muted-foreground">Avertissements</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{infoLogs.length}</div>
              <p className="text-sm text-muted-foreground">Informations</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{successLogs.length}</div>
              <p className="text-sm text-muted-foreground">Succès</p>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                <SelectItem value="error">Erreurs</SelectItem>
                <SelectItem value="warning">Avertissements</SelectItem>
                <SelectItem value="info">Informations</SelectItem>
                <SelectItem value="success">Succès</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="station">Station</SelectItem>
                <SelectItem value="playlist">Playlist</SelectItem>
                <SelectItem value="auth">Authentification</SelectItem>
                <SelectItem value="system">Système</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Logs Système ({filteredLogs.length})</span>
            <Button 
              onClick={() => setShowDetails(!showDetails)} 
              variant="outline" 
              size="sm"
            >
              {showDetails ? 'Masquer détails' : 'Afficher détails'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun log trouvé avec les filtres actuels
                </p>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-shrink-0 mt-0.5">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${getLevelColor(log.level)}`}>
                          {log.message}
                        </span>
                        <Badge className={getCategoryColor(log.category)}>
                          {log.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleString()}
                      </p>
                      
                      {showDetails && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          {log.userId && (
                            <p>Utilisateur: {log.userId}</p>
                          )}
                          {log.stationId && (
                            <p>Station: {log.stationId}</p>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <p>Métadonnées: {JSON.stringify(log.metadata)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 