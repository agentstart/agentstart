/* agent-frontmatter:start
AGENT: Feedback statistics component
PURPOSE: Display feedback statistics in card format
FEATURES:
  - Total feedback count
  - Status breakdown (pending, reviewed, resolved)
  - Real-time updates
USAGE: <FeedbackStats stats={statsData} />
SEARCHABLE: feedback stats, statistics component
agent-frontmatter:end */

import { AlertCircle, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
          <CardTitle className="font-medium text-sm">Total Feedback</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Pending</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">
            {stats.byStatus.pending || 0}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Reviewed</CardTitle>
          <AlertCircle className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">
            {stats.byStatus.reviewed || 0}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Resolved</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">
            {stats.byStatus.resolved || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
