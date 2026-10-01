/** Top progress bar shown while a route's code loads (the React app's router `PageLoader`). */
export function RouteLoader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div className="h-1 w-full bg-zinc-100 overflow-hidden">
        <div className="h-full bg-zinc-950 animate-progress origin-left"></div>
      </div>
    </div>
  )
}

export default RouteLoader
