import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { batch, createEffect, createSignal, ParentComponent, Suspense, untrack } from "solid-js";
import { getFollowers, getFollows, getProfile } from "~/agent";

const SuspenseArticle: ParentComponent = props => <article><Suspense fallback={<progress />}>{props.children}</Suspense></article>


const createCursorReduction = <TRetVal, TAccumulator>(
  fn: (cursor: string | undefined) => Promise<TRetVal>,
  extractCursor: (value: TRetVal | undefined) => string | undefined,
  reducer: (previous: TAccumulator, currentValue: TRetVal) => TAccumulator,
  initialValue: TAccumulator
) => {
  const [accumulator, setAccumulator] = createSignal<TAccumulator>(initialValue)
  const [cursor, setCursor] = createSignal<string | undefined>()
  const [isDone, setDone] = createSignal(false)
  const partial = createAsync(() => fn(cursor()))
  createEffect(() => {
    const partialValue = partial()
    const newCursor = extractCursor(partialValue)
    console.log({ oldCursor: untrack(cursor), newCursor: newCursor })
    console.log("effect", partialValue)
    batch(() => {
      if (partialValue !== undefined) {
        setAccumulator(previous => reducer(previous, partialValue))
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

const getDids = (pviews: { did: string }[]) => pviews.map(pview => pview.did)


export default function Handle() {
  const params = useParams<{ handle: string }>()
  const profile = createAsync(() => getProfile({
    actor: params.handle
  }))
  const followers = createCursorReduction(
    (cursor) => getFollowers({
      actor: params.handle,
      limit: 100,
      cursor
    }),
    v => v?.data.cursor,
    (acc, val) => new Set([...acc, ...getDids(val.data.followers)]),
    new Set<string>()
  )
  const follows = createCursorReduction(
    (cursor) => getFollows({
      actor: params.handle,
      limit: 100,
      cursor
    }),
    v => v?.data.cursor,
    (acc, val) => new Set([...acc, ...getDids(val.data.follows)]),
    new Set<string>()
  )
  return (
    <>
      <Title>{`@${params.handle}`}</Title>
      <SuspenseArticle>
        <h2>{`@${params.handle}`}</h2>
        <sup>{profile()?.data.followersCount} followers</sup>&frasl;<sub>{profile()?.data.followsCount} following</sub> = {
          ((profile()?.data.followersCount ?? 0) / (profile()?.data.followsCount ?? 1)).toFixed(3)
        } ratio
      </SuspenseArticle>
      <SuspenseArticle>
        <p>{followers.data().size} followers {followers.isDone() ? "true" : "false"}</p>
        <p>{follows.data().size} following {follows.isDone() ? "true" : "false"}</p>
      </SuspenseArticle>
    </>
  );
}
