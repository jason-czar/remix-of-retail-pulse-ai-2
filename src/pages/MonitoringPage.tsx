import { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  RefreshCw,
  XCircle,
  Zap,
  BarChart3,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  useHealthCheck, 
  useCacheMetrics, 
  useErrorLogs, 
  usePerformanceMetrics,
  calculatePerformanceAggregates,
  useErrorSummary
} from '@/hooks/use-monitoring-data';
import { DataCoverageTab } from '@/components/monitoring/DataCoverageTab';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Health status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    healthy: { className: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <CheckCircle className="h-3 w-3" /> },
    ok: { className: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <CheckCircle className="h-3 w-3" /> },
    good: { className: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <CheckCircle className="h-3 w-3" /> },
    CLOSED: { className: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <CheckCircle className="h-3 w-3" /> },
    degraded: { className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <AlertTriangle className="h-3 w-3" /> },
    fair: { className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <AlertTriangle className="h-3 w-3" /> },
    'HALF-OPEN': { className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <AlertTriangle className="h-3 w-3" /> },
    unhealthy: { className: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <XCircle className="h-3 w-3" /> },
    error: { className: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <XCircle className="h-3 w-3" /> },
    poor: { className: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <XCircle className="h-3 w-3" /> },
    OPEN: { className: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <XCircle className="h-3 w-3" /> },
  };
  
  const variant = variants[status] || { className: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> };
  
  return (
    <Badge variant="outline" className={cn('gap-1', variant.className)}>
      {variant.icon}
      {status}
    </Badge>
  );
}

// Severity badge for errors
function SeverityBadge({ severity }: { severity: string }) {
  const classes: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    error: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  };
  
  return (
    <Badge variant="outline" className={classes[severity] || ''}>
      {severity}
    </Badge>
  );
}

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useHealthCheck();
  const { data: cacheMetrics } = useCacheMetrics(7);
  const { data: errorLogs } = useErrorLogs({ limit: 50 });
  const { data: perfMetrics } = usePerformanceMetrics(24);
  const errorSummary = useErrorSummary();
  
  const perfAggregates = perfMetrics ? calculatePerformanceAggregates(perfMetrics) : [];

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time health, performance, and error tracking
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchHealth()}
          disabled={healthLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", healthLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Health Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* System Status */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {health ? (
              <>
                <StatusBadge status={health.status} />
                <p className="text-xs text-muted-foreground mt-2">
                  Last checked: {formatDistanceToNow(new Date(health.timestamp))} ago
                </p>
              </>
            ) : (
              <div className="h-8 animate-pulse bg-muted rounded" />
            )}
          </CardContent>
        </Card>

        {/* Database */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {health ? (
              <>
                <StatusBadge status={health.checks.database.status} />
                {health.checks.database.latency_ms && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Latency: {health.checks.database.latency_ms}ms
                  </p>
                )}
              </>
            ) : (
              <div className="h-8 animate-pulse bg-muted rounded" />
            )}
          </CardContent>
        </Card>

        {/* Cache Hit Rate */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {health ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {health.checks.cache_hit_rate.value || 0}%
                  </span>
                  <StatusBadge status={health.checks.cache_hit_rate.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
              </>
            ) : (
              <div className="h-8 animate-pulse bg-muted rounded" />
            )}
          </CardContent>
        </Card>

        {/* Errors */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorSummary.recentErrors}</div>
            <p className="text-xs text-muted-foreground">
              {errorSummary.unresolvedErrors} unresolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Circuit Breaker Status */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Circuit Breakers</CardTitle>
          <CardDescription>External API protection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <p className="font-medium">StockTwits API</p>
                <p className="text-sm text-muted-foreground">Upstream data feed</p>
              </div>
              {health && <StatusBadge status={health.checks.stocktwits_circuit.status} />}
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <p className="font-medium">Yahoo Finance API</p>
                <p className="text-sm text-muted-foreground">Price data feed</p>
              </div>
              {health && <StatusBadge status={health.checks.yahoo_circuit.status} />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="coverage" className="gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Coverage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Summary
              </CardTitle>
              <CardDescription>API latency by endpoint (last 24 hours)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Function</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Avg (ms)</TableHead>
                    <TableHead className="text-right">P95 (ms)</TableHead>
                    <TableHead className="text-right">Error Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfAggregates.slice(0, 10).map((agg, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{agg.function_name}</TableCell>
                      <TableCell>{agg.endpoint}</TableCell>
                      <TableCell className="text-right">{agg.count}</TableCell>
                      <TableCell className="text-right">{agg.avg_duration_ms}</TableCell>
                      <TableCell className="text-right">{agg.p95_duration_ms}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(agg.error_rate > 5 && 'text-red-500')}>
                          {agg.error_rate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {perfAggregates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No performance data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
              <CardDescription>Individual request timings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Cache</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(perfMetrics || []).slice(0, 50).map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(metric.recorded_at), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium">{metric.function_name}</TableCell>
                      <TableCell>{metric.endpoint || '-'}</TableCell>
                      <TableCell className="text-right">{metric.duration_ms}ms</TableCell>
                      <TableCell>
                        {metric.cache_status && (
                          <Badge variant="outline" className="text-xs">
                            {metric.cache_status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {metric.status_code && (
                          <span className={cn(
                            metric.status_code >= 400 && 'text-red-500'
                          )}>
                            {metric.status_code}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>Recent errors across the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead className="max-w-[300px]">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(errorLogs || []).map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(error.created_at))} ago
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{error.error_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={error.severity} />
                      </TableCell>
                      <TableCell>{error.function_name || '-'}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={error.error_message}>
                        {error.error_message}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!errorLogs || errorLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No errors recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
              <CardDescription>Daily cache performance by service</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Cache</TableHead>
                    <TableHead className="text-right">Hits</TableHead>
                    <TableHead className="text-right">Misses</TableHead>
                    <TableHead className="text-right">Stale Hits</TableHead>
                    <TableHead className="text-right">Hit Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cacheMetrics || []).map((metric, i) => (
                    <TableRow key={i}>
                      <TableCell>{metric.date}</TableCell>
                      <TableCell className="font-medium">{metric.cache_name}</TableCell>
                      <TableCell className="text-right text-green-600">{metric.hits}</TableCell>
                      <TableCell className="text-right text-red-500">{metric.misses}</TableCell>
                      <TableCell className="text-right text-yellow-600">{metric.stale_hits}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          metric.hit_rate >= 70 && 'text-green-600',
                          metric.hit_rate >= 50 && metric.hit_rate < 70 && 'text-yellow-600',
                          metric.hit_rate < 50 && 'text-red-500'
                        )}>
                          {metric.hit_rate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!cacheMetrics || cacheMetrics.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No cache statistics available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage">
          <DataCoverageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
