import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Plus, ArrowLeft, Edit, Trash2, Check, X, Warehouse, Users, Building2 } from 'lucide-react';

export function StyleGuidePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Style Guide</h1>
        <p className="text-muted-foreground mt-1">
          Component library and design patterns for the Handled backoffice
        </p>
      </div>

      {/* Color Foundations */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Color System</h2>
        <p className="text-muted-foreground">
          Semantic color tokens that automatically adapt to light and dark modes
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Light Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Light Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-background border"></div>
                <div>
                  <p className="font-medium text-sm">Background</p>
                  <code className="text-xs text-muted-foreground">bg-background</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-primary"></div>
                <div>
                  <p className="font-medium text-sm">Primary</p>
                  <code className="text-xs text-muted-foreground">bg-primary</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-secondary"></div>
                <div>
                  <p className="font-medium text-sm">Secondary</p>
                  <code className="text-xs text-muted-foreground">bg-secondary</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-muted"></div>
                <div>
                  <p className="font-medium text-sm">Muted</p>
                  <code className="text-xs text-muted-foreground">bg-muted</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-destructive"></div>
                <div>
                  <p className="font-medium text-sm">Destructive</p>
                  <code className="text-xs text-muted-foreground">bg-destructive</code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dark Mode */}
          <Card className="dark bg-background">
            <CardHeader>
              <CardTitle className="text-sm">Dark Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-background border"></div>
                <div>
                  <p className="font-medium text-sm">Background</p>
                  <code className="text-xs text-muted-foreground">bg-background</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-primary"></div>
                <div>
                  <p className="font-medium text-sm">Primary</p>
                  <code className="text-xs text-muted-foreground">bg-primary</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-secondary"></div>
                <div>
                  <p className="font-medium text-sm">Secondary</p>
                  <code className="text-xs text-muted-foreground">bg-secondary</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-muted"></div>
                <div>
                  <p className="font-medium text-sm">Muted</p>
                  <code className="text-xs text-muted-foreground">bg-muted</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-destructive"></div>
                <div>
                  <p className="font-medium text-sm">Destructive</p>
                  <code className="text-xs text-muted-foreground">bg-destructive</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Buttons</h2>
          <p className="text-muted-foreground">Button variants and sizes</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>All available button styles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default buttons */}
            <div>
              <h3 className="font-medium mb-3">Default Size</h3>
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <code className="block mt-2 text-xs text-muted-foreground">
                {`<Button>Primary</Button>`}
              </code>
            </div>

            {/* Buttons with icons */}
            <div>
              <h3 className="font-medium mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
              <code className="block mt-2 text-xs text-muted-foreground">
                {`<Button><Plus className="h-4 w-4 mr-2" />Add Item</Button>`}
              </code>
            </div>

            {/* Button sizes */}
            <div>
              <h3 className="font-medium mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
              </div>
              <code className="block mt-2 text-xs text-muted-foreground">
                {`<Button size="sm">Small</Button>`}
              </code>
            </div>

            {/* Icon only buttons */}
            <div>
              <h3 className="font-medium mb-3">Icon Only</h3>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" variant="ghost">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Cards</h2>
          <p className="text-muted-foreground">Card components and hover states</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Static Card */}
          <Card>
            <CardHeader>
              <CardTitle>Static Card</CardTitle>
              <CardDescription>Non-interactive card for content display</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Used for displaying information without click interaction.
              </p>
              <code className="block mt-2 text-xs text-muted-foreground">
                {`<Card>...</Card>`}
              </code>
            </CardContent>
          </Card>

          {/* Clickable Card */}
          <Card className="cursor-pointer hover:shadow-xl transition-all duration-200 border-2 hover:border-primary/50">
            <CardHeader>
              <CardTitle>Clickable Card</CardTitle>
              <CardDescription>Interactive card with hover effects</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hover over this card to see the effect. Used in grid views.
              </p>
              <code className="block mt-2 text-xs text-muted-foreground break-all">
                {`className="hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"`}
              </code>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tables */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Tables</h2>
          <p className="text-muted-foreground">Table layouts with clickable rows</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clickable Table Rows</CardTitle>
            <CardDescription>Hover over rows to see the effect</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-primary/5 cursor-pointer transition-all duration-200 hover:shadow-md">
                  <td className="px-4 py-3">
                    <div className="font-medium">Example Item 1</div>
                    <div className="text-sm text-muted-foreground">example-1</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>Active</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">Warehouse</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
                <tr className="border-b hover:bg-primary/5 cursor-pointer transition-all duration-200 hover:shadow-md">
                  <td className="px-4 py-3">
                    <div className="font-medium">Example Item 2</div>
                    <div className="text-sm text-muted-foreground">example-2</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">Pending</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">Client</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="p-4 border-t bg-muted/20">
              <code className="text-xs text-muted-foreground break-all">
                {`className="border-b hover:bg-primary/5 cursor-pointer transition-all duration-200 hover:shadow-md"`}
              </code>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Forms */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Form Elements</h2>
          <p className="text-muted-foreground">Input fields and form controls</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
            <CardDescription>Standard form inputs and controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Text Input */}
            <div className="space-y-2">
              <Label htmlFor="demo-input">Text Input</Label>
              <Input id="demo-input" placeholder="Enter text here..." />
              <code className="block text-xs text-muted-foreground">
                {`<Input placeholder="Enter text here..." />`}
              </code>
            </div>

            {/* Select */}
            <div className="space-y-2">
              <Label htmlFor="demo-select">Select Dropdown</Label>
              <Select>
                <SelectTrigger id="demo-select">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox id="demo-checkbox" />
              <Label htmlFor="demo-checkbox" className="cursor-pointer">
                Checkbox option
              </Label>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <Label htmlFor="demo-textarea">Textarea</Label>
              <Textarea id="demo-textarea" placeholder="Enter longer text..." rows={3} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Badges</h2>
          <p className="text-muted-foreground">Status indicators and labels</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Badge Variants</CardTitle>
            <CardDescription>Different badge styles for status display</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
            <code className="block mt-4 text-xs text-muted-foreground">
              {`<Badge variant="secondary">Secondary</Badge>`}
            </code>
          </CardContent>
        </Card>
      </section>

      {/* Navigation Patterns */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Navigation Patterns</h2>
          <p className="text-muted-foreground">Standard navigation components</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Back Button</CardTitle>
            <CardDescription>Standard pattern for detail pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            <code className="block text-xs text-muted-foreground">
              {`<Button variant="ghost" size="sm">
  <ArrowLeft className="h-4 w-4 mr-2" />
  Back
</Button>`}
            </code>
            <p className="text-sm text-muted-foreground mt-2">
              ✅ Use this pattern instead of breadcrumbs for consistency
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Empty States */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Empty States</h2>
          <p className="text-muted-foreground">No data placeholders</p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Warehouse className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No items found</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Get started by creating your first item. You can add details and configure settings once created.
            </p>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>

        <div className="p-4 bg-muted rounded-lg">
          <code className="text-xs break-all">
            {`<CardContent className="py-12 text-center">
  <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-semibold">Heading</h3>
  <p className="mt-2 text-sm text-muted-foreground">Description</p>
  <Button className="mt-6">CTA</Button>
</CardContent>`}
          </code>
        </div>
      </section>

      {/* Loading States */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Loading States</h2>
          <p className="text-muted-foreground">Spinners and progress indicators</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Spinner</CardTitle>
              <CardDescription>Page-level loading</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </CardContent>
            <div className="px-6 pb-6">
              <code className="text-xs text-muted-foreground break-all">
                {`<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>`}
              </code>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Bar</CardTitle>
              <CardDescription>Operation progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={33} />
              <Progress value={66} />
              <Progress value={100} />
            </CardContent>
            <div className="px-6 pb-6">
              <code className="text-xs text-muted-foreground">
                {`<Progress value={66} />`}
              </code>
            </div>
          </Card>
        </div>
      </section>

      {/* Tabs */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Tabs</h2>
          <p className="text-muted-foreground">Tabbed navigation for detail pages</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tab Component</CardTitle>
            <CardDescription>Used in detail pages like Client and Warehouse</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tab1">
              <TabsList>
                <TabsTrigger value="tab1">Overview</TabsTrigger>
                <TabsTrigger value="tab2">Details</TabsTrigger>
                <TabsTrigger value="tab3">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="py-4">
                <p className="text-sm text-muted-foreground">Overview tab content</p>
              </TabsContent>
              <TabsContent value="tab2" className="py-4">
                <p className="text-sm text-muted-foreground">Details tab content</p>
              </TabsContent>
              <TabsContent value="tab3" className="py-4">
                <p className="text-sm text-muted-foreground">Settings tab content</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* Dialogs */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Dialogs & Modals</h2>
          <p className="text-muted-foreground">Confirmation and form dialogs</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alert Dialog</CardTitle>
            <CardDescription>Confirmation dialogs for destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Item</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </section>

      {/* Icons */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Icons</h2>
          <p className="text-muted-foreground">Lucide icon library usage</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Common Icons</CardTitle>
            <CardDescription>Standard icons used throughout the app</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-6">
              <div className="flex flex-col items-center gap-2">
                <Plus className="h-6 w-6" />
                <span className="text-xs">Plus</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Edit className="h-6 w-6" />
                <span className="text-xs">Edit</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Trash2 className="h-6 w-6" />
                <span className="text-xs">Trash2</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Check className="h-6 w-6" />
                <span className="text-xs">Check</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <X className="h-6 w-6" />
                <span className="text-xs">X</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ArrowLeft className="h-6 w-6" />
                <span className="text-xs">ArrowLeft</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Warehouse className="h-6 w-6" />
                <span className="text-xs">Warehouse</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span className="text-xs">Users</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Building2 className="h-6 w-6" />
                <span className="text-xs">Building2</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Import from: <code className="text-xs">lucide-react</code>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
