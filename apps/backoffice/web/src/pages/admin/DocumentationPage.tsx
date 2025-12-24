export function DocumentationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentation</h1>
        <p className="text-muted-foreground">
          General system documentation and guides
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
          <p className="text-muted-foreground mb-4">
            Learn the basics of using the Handled platform
          </p>
          <div className="text-sm text-muted-foreground">
            Coming soon...
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">API Integration</h2>
          <p className="text-muted-foreground mb-4">
            Technical guides for integrating with our APIs
          </p>
          <div className="text-sm text-muted-foreground">
            Coming soon...
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">Best Practices</h2>
          <p className="text-muted-foreground mb-4">
            Recommended approaches and patterns
          </p>
          <div className="text-sm text-muted-foreground">
            Coming soon...
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">Troubleshooting</h2>
          <p className="text-muted-foreground mb-4">
            Common issues and solutions
          </p>
          <div className="text-sm text-muted-foreground">
            Coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}
