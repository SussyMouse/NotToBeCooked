import { Button } from "@base-ui/react"

export function SharedMainApp({ platform }: { platform: "web" | "tauri" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
        NotToBeCooked
      </h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">
        Running seamlessly on{" "}
        <span className="font-semibold text-primary">{platform}</span>!
      </p>
      <div className="mt-6 flex gap-4">
        <Button onClick={() => alert(`Hello from ${platform}!`)}>
          Shared Action Button
        </Button>
      </div>
    </div>
  )
}
