import { Accessor, createEffect, Owner, runWithOwner } from "solid-js"
import { IS_DEVELOPMENT } from "./mode"

export const narrow = <A, B extends A>(accessor: Accessor<A>, guard: (v: A) => v is B): B | null => {
  const val = accessor()
  if (guard(val)) {
    return val
  }
  return null
}

export type GetSetType<T> = T extends Set<infer U> ? U : never;
export type KeysOfType<T, U> = keyof {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
}

export const getLast = <T>(v: T | T[]) => Array.isArray(v)
  ? v[v.length - 1]
  : v

export const signalAsPromise = (signal: Accessor<boolean>, owner: typeof Owner) => {
  const { promise, resolve } = Promise.withResolvers<void>()

  runWithOwner(owner, () => createEffect(() => {
    if (signal()) {
      resolve()
    }
  }))

  return promise
}

export function* chain<T>(...iterables: Iterable<T>[]) {
  for (const iterable of iterables) {
    yield* iterable
  }
}


export const intersection = <T>(a: Set<T>, b: Set<T>) =>
  // avoid narrowing...
  "intersection" in a as unknown
    ? a.intersection(b)
    : new Set(a
      .keys()
      .filter(e => b.has(e))
    )

export const union = <T>(a: Set<T>, b: Set<T>) =>
  // avoid narrowing...
  "union" in a as unknown
    ? a.union(b)
    : new Set(chain(a.keys(), b.keys()))


export const withWindowOpen = (fn: (open: (href: string) => void) => Promise<void>) => () => {
  const windowRef = window.open("/loading")
  fn(href => {
    if (windowRef === null) {
      location.href = href
      return
    }
    windowRef.location = href
  })
}


const dbgStore = new Map()
const makeDbg = (ctx: unknown = undefined, showCtx = false) => IS_DEVELOPMENT ? new Proxy({} as Record<string | symbol, unknown>, {
  set:
    (obj, prop, value) => {
      const key = `${String(prop)} = ${value}`
      if (obj[key] === undefined)
        obj[key] = 0
      const seen = ++(obj[key] as number)
      if (!showCtx)
        console.log({ [prop]: value, details: { seen } })
      else
        console.log({ [prop]: value, details: { ctx, seen } })
      return true
    }
}) : null!
export const dbgIn = (ctx: unknown) => {
  let dbg = dbgStore.get(ctx)
  if (dbg === undefined) {
    dbg = makeDbg(ctx, true)
    dbgStore.set(ctx, dbg)
  }
  return dbg
}
export const dbg = makeDbg()
