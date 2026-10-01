"use client"

/**
 * react-router-dom compatible API on top of next/navigation, so the migrated
 * views keep their original navigation code. Navigation never scrolls to the
 * top, matching the React app (BrowserRouter without ScrollRestoration).
 */

import * as React from "react"
import NextLink from "next/link"
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation"

export interface PathObject {
  pathname?: string
  search?: string
  hash?: string
}

export type To = string | PathObject

export interface NavigateOptions {
  replace?: boolean
  /** Accepted for API compatibility; the React app never reads navigation state. */
  state?: unknown
}

export interface NavigateFunction {
  (to: To, options?: NavigateOptions): void
  (delta: number): void
}

function toHref(to: To): string {
  if (typeof to === "string") return to
  const pathname = to.pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/")
  const search = to.search ? (to.search.startsWith("?") ? to.search : `?${to.search}`) : ""
  const hash = to.hash ? (to.hash.startsWith("#") ? to.hash : `#${to.hash}`) : ""
  return `${pathname}${search}${hash}`
}

export function useNavigate(): NavigateFunction {
  const router = useRouter()
  return React.useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        window.history.go(to)
        return
      }
      const href = toHref(to)
      if (options?.replace) {
        router.replace(href, { scroll: false })
      } else {
        router.push(href, { scroll: false })
      }
    },
    [router]
  ) as NavigateFunction
}

export interface Location {
  pathname: string
  search: string
  hash: string
  state: null
  key: string
}

export function useLocation(): Location {
  const pathname = usePathname() || "/"
  const searchParams = useNextSearchParams()
  const query = searchParams?.toString() ?? ""
  const search = query ? `?${query}` : ""
  return React.useMemo(
    () => ({
      pathname,
      search,
      hash: typeof window !== "undefined" ? window.location.hash : "",
      state: null,
      key: `${pathname}${search}`,
    }),
    [pathname, search]
  )
}

export type URLSearchParamsInit =
  | string
  | URLSearchParams
  | Record<string, string | number | boolean | null | undefined | Array<string | number>>
  | Array<[string, string]>

export type SetURLSearchParams = (
  next: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit),
  options?: NavigateOptions
) => void

export function createSearchParams(init: URLSearchParamsInit = ""): URLSearchParams {
  if (typeof init === "string" || init instanceof URLSearchParams || Array.isArray(init)) {
    return new URLSearchParams(init)
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(init)) {
    // Same as react-router: null/undefined values are stringified, not dropped.
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)))
    } else {
      params.append(key, String(value))
    }
  }
  return params
}

export function useSearchParams(): [URLSearchParams, SetURLSearchParams] {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const nextParams = useNextSearchParams()
  const query = nextParams?.toString() ?? ""
  const searchParams = React.useMemo(() => new URLSearchParams(query), [query])

  const setSearchParams = React.useCallback<SetURLSearchParams>(
    (next, options) => {
      const current = new URLSearchParams(window.location.search)
      const resolved = createSearchParams(typeof next === "function" ? next(current) : next)
      const qs = resolved.toString()
      const href = `${window.location.pathname || pathname}${qs ? `?${qs}` : ""}`
      if (options?.replace) {
        router.replace(href, { scroll: false })
      } else {
        router.push(href, { scroll: false })
      }
    },
    [router, pathname]
  )

  return [searchParams, setSearchParams]
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  const params = useNextParams()
  return React.useMemo(() => {
    const out: Record<string, string | undefined> = {}
    for (const [key, value] of Object.entries(params ?? {})) {
      out[key] = Array.isArray(value) ? value.map(safeDecode).join("/") : safeDecode(String(value))
    }
    return out as T
  }, [params])
}

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">

export interface LinkProps extends AnchorProps {
  to: To
  replace?: boolean
  state?: unknown
  children?: React.ReactNode
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, ...rest },
  ref
) {
  return <NextLink ref={ref} href={toHref(to)} replace={replace} scroll={false} {...rest} />
})

export interface NavigateProps {
  to: To
  replace?: boolean
  state?: unknown
}

export function Navigate({ to, replace }: NavigateProps) {
  const navigate = useNavigate()
  const href = toHref(to)
  React.useEffect(() => {
    navigate(href, { replace })
  }, [navigate, href, replace])
  return null
}

const OutletSlotContext = React.createContext<React.ReactNode>(null)
const OutletDataContext = React.createContext<unknown>(undefined)

/**
 * Supplies the content that the nearest `<Outlet />` renders. Next.js layouts
 * wrap react-router style layout components in this and pass their `children`.
 */
export function OutletSlot({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return <OutletSlotContext.Provider value={content}>{children}</OutletSlotContext.Provider>
}

export function Outlet({ context }: { context?: unknown }) {
  const content = React.useContext(OutletSlotContext)
  return (
    <OutletDataContext.Provider value={context}>
      <OutletSlotContext.Provider value={null}>{content}</OutletSlotContext.Provider>
    </OutletDataContext.Provider>
  )
}

export function useOutletContext<T = unknown>(): T {
  return React.useContext(OutletDataContext) as T
}
