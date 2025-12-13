import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

export function ActivityLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground mt-1">
          View your recent actions in the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Activity logging coming soon. This will show your recent logins, 
            changes made, and actions performed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
