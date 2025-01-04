import { createAsync } from "@solidjs/router"
import { Accessor, batch, createEffect, createMemo, createRenderEffect, createSignal } from "solid-js"
import { createStore } from "solid-js/store"

// if its a hobby hack the code can be as clever (read: bad) as I want!
// sorry :3

export const createCursorReduction = <TRetVal, TAccumulator>(
  fn: (cursor: string | undefined) => Promise<TRetVal>,
  extractCursor: (value: TRetVal) => string | undefined,
  reducer: (previous: TAccumulator, currentValue: TRetVal) => TAccumulator,
  initialValue: TAccumulator,
  terminate: (value: TAccumulator) => boolean = () => false
) => {
  const [accumulator, setAccumulator] = createSignal<TAccumulator>(initialValue)
  const [cursor, setCursor] = createSignal<string | undefined>()
  const [isDone, setDone] = createSignal(false)
  const partial = createAsync(() => fn(cursor()))
  createEffect(() => {
    const partialValue = partial()
    const newCursor = partialValue !== undefined
      ? extractCursor(partialValue)
      : undefined
    // console.log({ oldCursor: untrack(cursor), newCursor: newCursor })
    // console.log("effect", partialValue)
    batch(() => {
      if (partialValue !== undefined) {
        const newValue = setAccumulator(previous => reducer(previous, partialValue))
        if (terminate(newValue)) {
          setDone(true)
          return
        }
      }
      if (newCursor === undefined) {
        setDone(true)
        return
      }
      setDone(false)
      setCursor(newCursor)
    })
  })

  return {
    data: accumulator,
    isDone
  }
}


export const createCursorMappingReduction = <TInput, TOutput, TAccumulator>(
  source: ReturnType<typeof createCursorReduction<unknown, Iterable<TInput>>>,
  extractKey: (value: TInput) => string,
  map: (input: TInput, cursor: string | undefined) => Promise<TOutput>,
  extractCursor: (value: TOutput) => string | undefined,
  reducer: (previous: TAccumulator, currentValue: TOutput) => TAccumulator,
  initialValue: () => TAccumulator,
  merge: (a: TAccumulator, b: TAccumulator) => TAccumulator
) => {

  const [derivationCursorStore, setDerivationCursorStore] = createStore({} as Record<string, ReturnType<typeof createCursorReduction<TOutput, TAccumulator>>>)

  createRenderEffect(() => {
    const sourceData = source.data()
    // map remembers insertion order
    // source data is new to old, so by reversing old data will be overwritten by new data if keys match
    const kv = new Map(Array.from(sourceData).map(data => [extractKey(data), data] as const).reverse())

    // un reverse!
    const newKeys = Array.from(kv.entries()).reverse().filter(([key]) => !derivationCursorStore.hasOwnProperty(key))
    // TODO: object.fromentries for performance?
    batch(() => {
      for (const [key, input] of newKeys) {
        const cursorReduction = createCursorReduction(
          (cursor) => map(input, cursor),
          extractCursor,
          reducer,
          initialValue()
        )
        setDerivationCursorStore(key, cursorReduction)
      }
    })

  })

  const internalMemo = createMemo(() => Object.values(derivationCursorStore).reduce(
    (acc, val) => ({
      data: merge(acc.data, val.data()),
      isDone: acc.isDone && val.isDone()
    }),
    { data: initialValue(), isDone: true }
  ))

  // we want this to feel the same in the hand as the unmapped version
  return {
    data: () => internalMemo().data,
    isDone: () => internalMemo().isDone
  }
}


export const createBskyCursor = <TProps, TResponse extends { data: { cursor?: string | undefined } }, TAccumulateValue>(
  fn: (params: TProps & { cursor: string | undefined }) => Promise<TResponse>,
  params: TProps,
  extract: (output: TResponse["data"]) => Iterable<TAccumulateValue>,
  max: number = Number.POSITIVE_INFINITY,
  predicate: (value: TAccumulateValue) => boolean = () => true
) => createCursorReduction(
  (cursor) => fn({
    ...params,
    cursor
  }),
  v => v?.data.cursor,
  (acc, val) => {
    const newVals = Array.from(extract(val.data)).filter(predicate)
    const newSet = new Set(acc)
    // we can't just trim newvals and take the union—they may not be disjoint, and then we will skip values!
    while (newSet.size < max && newVals.length > 0) {
      // we need to take off the front to maintain ordering—v8 is clever, this isn't actually that expensive
      newSet.add(newVals.shift()!)
    }
    return newSet
  },
  new Set<TAccumulateValue>(),
  (vals) => vals.size >= max
)

export const busy = (...deps: { isDone: Accessor<boolean> }[]) => deps.some(
  v => !v.isDone()
)


