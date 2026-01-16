import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  BellOff,
  Trash2,
  Loader2,
  Clock,
  Zap,
  Settings,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  useAlerts,
  useToggleAlert,
  useDeleteAlert,
  Alert,
} from "@/hooks/use-alerts";
import {
  getAlertTypeLabel,
  getAlertTypeIcon,
  isEmotionAlert,
  ALERT_CATEGORIES,
} from "@/lib/alert-types";
import { CreateAlertDialog } from "@/components/alerts/CreateAlertDialog";
import { format, formatDistanceToNow } from "date-fns";

type AlertFilter = "all" | "active" | "paused" | "emotion" | "sentiment";

function AlertTableRow({ alert }: { alert: Alert }) {
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();

  const isEmotion = isEmotionAlert(alert.alert_type);
  const Icon = getAlertTypeIcon(alert.alert_type);

  const handleToggle = async (checked: boolean) => {
    try {
      await toggleAlert.mutateAsync({ alertId: alert.id, isActive: checked });
      toast.success(checked ? "Alert enabled" : "Alert paused");
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAlert.mutateAsync({ alertId: alert.id, symbol: alert.symbol });
      toast.success("Alert deleted");
    } catch (error) {
      toast.error("Failed to delete alert");
    }
  };

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              alert.is_active
                ? isEmotion
                  ? "bg-accent/20 text-accent"
                  : "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <Link
              to={`/symbol/${alert.symbol}`}
              className="font-mono font-semibold hover:text-primary transition-colors"
            >
              ${alert.symbol}
            </Link>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge
            variant={isEmotion ? "outline" : "secondary"}
            className={isEmotion ? "border-accent text-accent w-fit" : "w-fit"}
          >
            {getAlertTypeLabel(alert.alert_type)}
          </Badge>
          {alert.threshold && (
            <span className="text-xs text-muted-foreground">
              Threshold: {alert.threshold}%
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={alert.is_active ? "bullish" : "outline"}>
          {alert.is_active ? "Active" : "Paused"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {alert.last_triggered_at ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(alert.last_triggered_at), {
              addSuffix: true,
            })}
          </div>
        ) : (
          <span className="text-muted-foreground/50">Never</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(alert.created_at), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            {alert.is_active ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Switch
              checked={alert.is_active}
              onCheckedChange={handleToggle}
              disabled={toggleAlert.isPending}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleteAlert.isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            {deleteAlert.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AlertsPage() {
  const { data: alerts, isLoading, error } = useAlerts();
  const [filter, setFilter] = useState<AlertFilter>("all");

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];

    switch (filter) {
      case "active":
        return alerts.filter((a) => a.is_active);
      case "paused":
        return alerts.filter((a) => !a.is_active);
      case "emotion":
        return alerts.filter((a) => isEmotionAlert(a.alert_type));
      case "sentiment":
        return alerts.filter((a) => !isEmotionAlert(a.alert_type));
      default:
        return alerts;
    }
  }, [alerts, filter]);

  const activeCount = alerts?.filter((a) => a.is_active).length || 0;
  const emotionCount = alerts?.filter((a) => isEmotionAlert(a.alert_type)).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display mb-2 flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              Alerts
            </h1>
            <p className="text-muted-foreground">
              Manage your sentiment and emotion signal notifications
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            <CreateAlertDialog />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{alerts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bullish/20">
                <Zap className="h-5 w-5 text-bullish" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{emotionCount}</p>
                <p className="text-sm text-muted-foreground">Emotion Signals</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {(alerts?.length || 0) - activeCount}
                </p>
                <p className="text-sm text-muted-foreground">Paused</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as AlertFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
              <TabsTrigger value="emotion" className="text-accent data-[state=active]:text-accent">
                Emotion
              </TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {filteredAlerts.length} alert
            {filteredAlerts.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Alert Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-10 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Failed to load alerts. Please try again later.
                  </TableCell>
                </TableRow>
              ) : filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12"
                  >
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground mb-4">
                      {filter === "all"
                        ? "No alerts configured yet"
                        : `No ${filter} alerts`}
                    </p>
                    <CreateAlertDialog />
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <AlertTableRow key={alert.id} alert={alert} />
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Quick Tips */}
        <Card className="mt-8 p-6 glass-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Alert Types
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {ALERT_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">
                  {category.label}
                </h4>
                <ul className="space-y-2">
                  {category.types.map((type) => {
                    const Icon = type.icon;
                    return (
                      <li
                        key={type.value}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Icon
                          className={`h-4 w-4 mt-0.5 shrink-0 ${
                            category.id === "emotion"
                              ? "text-accent"
                              : "text-primary"
                          }`}
                        />
                        <div>
                          <span className="font-medium">{type.label}</span>
                          <p className="text-muted-foreground text-xs">
                            {type.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
