// AGENT: Feedback statistics component
// PURPOSE: Display feedback statistics in card format
// FEATURES:
//   - Total feedback count
//   - Status breakdown (pending, reviewed, resolved)
//   - Real-time updates
// USAGE: <FeedbackStats stats={statsData} />
// SEARCHABLE: feedback stats, statistics component

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface FeedbackStatsProps {
  stats:
    | {
        total: number;
        byStatus: {
          pending?: number;
          reviewed?: number;
          resolved?: number;
        };
      }
    | undefined;
}

export function FeedbackStats({ stats }: FeedbackStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          <MessageSquare className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.byStatus.pending || 0}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
          <AlertCircle className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.byStatus.reviewed || 0}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.byStatus.resolved || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
