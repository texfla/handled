# UI Lifecycle Patterns

Frontend requirements for three-tier lifecycle support.

## Delete Button Behavior

Frontend should call DELETE endpoint and handle 409 responses:

```tsx
const handleDelete = async (entityType: 'warehouse' | 'customer', id: string) => {
  try {
    await api.delete(`/api/${entityType}s/${id}`, {
      body: { reason: deleteReason }
    });
    
    // Success - entity was soft-deleted
    toast.success(`${entityType} deleted successfully`);
    navigate(`/${entityType}s`);
    
  } catch (error) {
    if (error.status === 409) {
      // Has history - show retirement modal instead
      setShowRetireModal(true);
      setRetireGuidance({
        message: error.data.suggestion.message,
        endpoint: error.data.suggestion.endpoint,
        payload: error.data.suggestion.payload,
        reason: error.data.reason,
        details: error.data.details
      });
    } else {
      toast.error(`Failed to delete: ${error.message}`);
    }
  }
};
```

## Retirement Modal

When 409 is returned, show a modal explaining why deletion isn't allowed:

```tsx
<Dialog open={showRetireModal} onOpenChange={setShowRetireModal}>
  <DialogHeader>
    <DialogTitle>Cannot Delete - History Exists</DialogTitle>
    <DialogDescription>
      {retireGuidance?.message}
    </DialogDescription>
  </DialogHeader>
  
  <DialogContent>
    <Alert variant="warning">
      <AlertTitle>Why can't I delete this?</AlertTitle>
      <AlertDescription>
        {retireGuidance?.reason}
        
        {retireGuidance?.details && (
          <ul className="mt-2 text-sm">
            {Object.entries(retireGuidance.details).map(([key, count]) => (
              count > 0 && <li key={key}>{count} {key}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
    
    <Label>Reason for retirement (required):</Label>
    <Textarea 
      value={retirementReason}
      onChange={(e) => setRetirementReason(e.target.value)}
      placeholder="e.g., Customer churned after contract expiration"
      minLength={10}
    />
  </DialogContent>
  
  <DialogFooter>
    <Button variant="outline" onClick={() => setShowRetireModal(false)}>
      Cancel
    </Button>
    <Button 
      variant="default"
      onClick={handleRetire}
      disabled={retirementReason.length < 10}
    >
      Retire {entityType}
    </Button>
  </DialogFooter>
</Dialog>
```

## List View Filters

Add toggle to show/hide retired records:

```tsx
<div className="flex items-center gap-2">
  <Checkbox 
    id="show-retired"
    checked={showRetired}
    onCheckedChange={setShowRetired}
  />
  <Label htmlFor="show-retired">Show Terminated/Retired</Label>
</div>

// In query:
const { data } = useQuery({
  queryKey: ['customers', showRetired],
  queryFn: () => api.get('/api/clients', {
    params: { include_retired: showRetired }
  })
});
```

## Create Forms: Test Data Checkbox

Add option to mark new records as test data:

```tsx
<div className="flex items-center gap-2">
  <Checkbox 
    id="is-test-data"
    checked={formData.isTestData}
    onCheckedChange={(checked) => 
      setFormData(prev => ({ ...prev, isTestData: checked }))
    }
  />
  <Label htmlFor="is-test-data">
    Mark as Test Data
    <span className="text-xs text-muted-foreground ml-2">
      (can be safely deleted even with allocations)
    </span>
  </Label>
</div>
```

## Status Badges

Show lifecycle state visually:

```tsx
const getStatusBadge = (item: Customer | Warehouse) => {
  if (item.deleted) {
    return <Badge variant="destructive">Deleted (Pending Purge)</Badge>;
  }
  
  if (item.retiredAt) {
    return <Badge variant="secondary">Retired</Badge>;
  }
  
  if (item.status === 'terminated') {
    return <Badge variant="outline">Terminated</Badge>;
  }
  
  return <Badge variant="default">{item.status}</Badge>;
};
```

## Delete Confirmation Dialog

Show different messages based on entity state:

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {entityType}?</AlertDialogTitle>
      <AlertDialogDescription>
        {hasHistory ? (
          <>
            <p className="text-destructive font-medium">
              This {entityType} has operational history.
            </p>
            <p className="mt-2">
              Deletion will fail. You should retire it instead to preserve audit trail.
            </p>
          </>
        ) : (
          <>
            <p>This {entityType} has no operational history and can be safely deleted.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              It will be permanently removed after 180 days.
            </p>
          </>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        onClick={handleDelete}
        className="bg-destructive text-destructive-foreground"
      >
        {hasHistory ? 'Try Delete (will fail)' : 'Delete'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Retirement Button

Separate button for explicit retirement:

```tsx
<Button 
  variant="outline" 
  size="sm"
  onClick={() => setShowRetireModal(true)}
>
  <Archive className="h-4 w-4 mr-2" />
  Retire
</Button>
```

## Admin View: Show Deleted Toggle

Admin users can see deleted records:

```tsx
{user.permissions.includes('admin') && (
  <div className="flex items-center gap-2">
    <Checkbox 
      id="show-deleted"
      checked={showDeleted}
      onCheckedChange={setShowDeleted}
    />
    <Label htmlFor="show-deleted" className="text-destructive">
      Show Deleted (Admin Only)
    </Label>
  </div>
)}
```

## Audit Trail Display

Show lifecycle history in detail view:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Lifecycle History</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {item.retiredAt && (
        <div className="flex items-start gap-3">
          <Archive className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Retired</p>
            <p className="text-sm text-muted-foreground">
              {format(item.retiredAt, 'PPP')} by {item.retiredByUser?.name}
            </p>
            {item.retiredReason && (
              <p className="text-sm mt-1 italic">"{item.retiredReason}"</p>
            )}
          </div>
        </div>
      )}
      
      {item.deletedAt && (
        <div className="flex items-start gap-3">
          <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Deleted</p>
            <p className="text-sm text-muted-foreground">
              {format(item.deletedAt, 'PPP')} by {item.deletedByUser?.name}
            </p>
            {item.deletedReason && (
              <p className="text-sm mt-1 italic">"{item.deletedReason}"</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Will be permanently purged after {format(addDays(item.deletedAt, 180), 'PPP')}
            </p>
          </div>
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

## Contact-Specific Pattern

Contacts use `active` flag instead of status:

```tsx
const handleDeleteContact = async (contactId: string) => {
  try {
    const response = await api.delete(`/api/clients/${customerId}/contacts/${contactId}`, {
      body: { reason: deleteReason }
    });
    
    if (response.action === 'deactivated') {
      toast.info('Contact marked as inactive (has communication history)');
    } else {
      toast.success('Contact deleted successfully');
    }
    
    refetch();
  } catch (error) {
    toast.error(`Failed to delete contact: ${error.message}`);
  }
};
```

## Contract Archive Pattern

Contracts are archived, not deleted:

```tsx
const handleArchiveContract = async (contractId: string) => {
  if (!archiveReason || archiveReason.length < 10) {
    toast.error('Please provide a detailed reason for archival (minimum 10 characters)');
    return;
  }
  
  try {
    await api.post(`/api/clients/${customerId}/contracts/${contractId}/archive`, {
      body: { reason: archiveReason }
    });
    
    toast.success('Contract archived successfully');
    refetch();
  } catch (error) {
    if (error.status === 400 && error.data.error === 'Cannot archive active contract') {
      toast.error('Cannot archive active contract. Terminate or expire it first.');
    } else {
      toast.error(`Failed to archive: ${error.message}`);
    }
  }
};
```

## User Disable vs Delete

Users have both `disabled` and `deleted`:

```tsx
const handleDisableUser = async (userId: string) => {
  await api.patch(`/api/users/${userId}`, {
    body: { disabled: true }
  });
  toast.success('User disabled (preserved for audit trail)');
};

const handleDeleteUser = async (userId: string) => {
  try {
    await api.delete(`/api/users/${userId}`, {
      body: { reason: 'Test account with no activity' }
    });
    toast.success('User deleted');
  } catch (error) {
    if (error.status === 409) {
      toast.error('Cannot delete user with activity. Please disable instead.');
      setShowDisableModal(true);
    }
  }
};
```

## Role Retirement

Roles are retired, never deleted:

```tsx
const handleDeleteRole = async (roleId: number) => {
  try {
    await api.delete(`/api/roles/${roleId}`, {
      body: { reason: 'Role no longer needed' }
    });
    
    toast.info('Role retired (preserved for audit trail)');
    refetch();
  } catch (error) {
    if (error.status === 409) {
      toast.error('Cannot retire role with active users. Remove all assignments first.');
    }
  }
};
```

## Summary

### Delete Button Flow

1. User clicks "Delete"
2. Frontend calls DELETE endpoint
3. Backend checks evidentiary value
4. If has history:
   - Returns 409 with suggestion
   - Frontend shows retirement modal
   - User provides reason
   - Frontend calls retirement endpoint
5. If no history:
   - Backend soft-deletes
   - Frontend shows success message

### UI States

- **Active**: Default view, full functionality
- **Retired/Terminated**: Grayed out, read-only, badge indicator
- **Deleted**: Hidden by default, visible in admin view with warning badge

### Key Principles

1. **Progressive disclosure**: Don't show retirement options until delete fails
2. **Clear messaging**: Explain why deletion isn't allowed
3. **Audit trail visibility**: Show who/when/why for lifecycle changes
4. **Admin controls**: Separate toggles for retired vs deleted records
5. **Consistent patterns**: Same flow across all entity types

