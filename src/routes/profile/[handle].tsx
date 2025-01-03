import { Title } from "@solidjs/meta";
import { clientOnly } from "@solidjs/start"
import { createAsync, useParams } from "@solidjs/router";
import { batch, Component, createEffect, createMemo, createRenderEffect, createSignal, ParentComponent, Show, Suspense, untrack } from "solid-js";
import { getAuthorFeed, getFollowers, getFollows, getLikes, getProfile } from "~/agent";
import { createStore } from "solid-js/store";
import { IS_DEVELOPMENT } from "~/mode";

const Venn = clientOnly(() => import("~/components/Venn"))

const SuspenseProgress: ParentComponent = props => <Suspense fallback={<progress />}>{props.children}</Suspense>

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
    // console.log({ oldCursor: untrack(cursor), newCursor: newCursor })
    // console.log("effect", partialValue)
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


const createCursorMappingReduction = <TInput, TOutput, TAccumulator>(
  source: ReturnType<typeof createCursorReduction<unknown, Iterable<TInput>>>,
  extractKey: (value: TInput) => string,
  map: (input: TInput, cursor: string | undefined) => Promise<TOutput>,
  extractCursor: (value: TOutput | undefined) => string | undefined,
  reducer: (previous: TAccumulator, currentValue: TOutput) => TAccumulator,
  initialValue: () => TAccumulator,
  merge: (a: TAccumulator, b: TAccumulator) => TAccumulator
) => {

  const [derivationCursorStore, setDerivationCursorStore] = createStore({} as Record<string, ReturnType<typeof createCursorReduction<TOutput, TAccumulator>>>)

  createRenderEffect(() => {
    const sourceData = source.data()

    const kv = Array.from(sourceData).map(data => [extractKey(data), data] as const)
    if (IS_DEVELOPMENT && kv.length !== new Set(kv.map(([key]) => key)).size)
      throw new Error("invarient violation: key function produced duplicate keys")

    const newKeys = kv.filter(([key]) => derivationCursorStore.hasOwnProperty(key))
    // TODO: object.fromentries for performance?
    batch(() => {
      for (const [key, input] of newKeys) {
        const cursorReduction = createCursorReduction(
          (cursor) => map(input, cursor),
          extractCursor,
          reducer,
          initialValue()
        )
        setDerivationCursorStore({ [key]: cursorReduction })
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

  return {
    data: () => internalMemo().data,
    isDone: () => internalMemo().isDone
  }
}


const createBskyCursor = <I, O extends { data: { cursor?: string | undefined } }>(
  fn: (params: I & { cursor: string | undefined }) => Promise<O>,
  params: I,
  extract: (output: O["data"]) => Iterable<string>,
) => createCursorReduction(
  (cursor) => fn({
    ...params,
    cursor
  }),
  v => v?.data.cursor,
  (acc, val) => new Set([...acc, ...extract(val.data)]),
  new Set<string>()
)

const ShowRatio: Component<{
  follows?: number,
  followers?: number,
  busy?: boolean
}> = props => <p aria-busy={props.busy}>
  <sup>{props.followers} followers</sup>&frasl;<sub>{props.follows} following</sub> = {
    ((props.followers ?? 0) / (props.follows ?? 1)).toFixed(3)
  } ratio
</p>

const finiteElse = (num: number | undefined, fallback: number) => Number.isFinite(num) ? num : fallback

const CompletableProgress: Component<{
  value: number | undefined,
  max: number | undefined,
  isDone: boolean
}> = props =>
    <progress value={finiteElse(props.isDone ? props.max : props.value, 0)} max={props.max} />

export default function Handle() {
  const params = useParams<{ handle: string }>()
  const profile = createAsync(() => getProfile({
    actor: params.handle
  }))
  const followers = createBskyCursor(
    getFollowers,
    {actor: params.handle, limit: 100},
    data => data.followers.map(pview => pview.did)
  )
  const follows = createBskyCursor(
    getFollows,
    {actor: params.handle, limit: 100},
    data => data.follows.map(pview => pview.did)
  )
  const recentPosts = createAsync(async () => {
    const authorFeed = await getAuthorFeed({
      actor: params.handle,
      limit: 100,
      filter: "posts_no_replies",
    })
    // uris of recent posts made by this handle
    const postUris = authorFeed.data.feed
      .map(fvPost => fvPost.post)
      .filter(post => post.author.handle === params.handle)

    postUris.length = Math.min(postUris.length, 30)

    return postUris
  })
  const [likesCursorStore, setLikesCursorStore] = createStore<ReturnType<typeof createCursorReduction<ReturnType<typeof getLikes>, Set<string>>>[]>([])
  createRenderEffect(() => {
    const recentPostsVal = recentPosts()
    if (recentPostsVal === undefined) return
    if (untrack(() => likesCursorStore.length > 0)) throw new Error(`illegal state; recent posts changed after first fetch`)

    setLikesCursorStore(recentPostsVal.map(post => createCursorReduction(
      (cursor) => getLikes({
        uri: post.uri,
        limit: 100,
        cursor
      }),
      v => v?.data.cursor,
      (acc, val) => new Set([...acc, ...val.data.likes.map(like => like.actor.did)]),
      new Set<string>()
    )))
  })
  const maxLikes = createMemo(() => recentPosts()?.reduce((acc, post) => acc + (post.likeCount ?? 0), 0))
  const likes = createMemo(() => likesCursorStore.reduce(
    (acc, v) => ({
      data: acc.data.union(v.data()),
      isDone: acc.isDone && v.isDone()
    }),
    { data: new Set<string>(), isDone: true }
  ))

  const mutuals = createMemo(() => (follows.data()).intersection(followers.data()).size)

  return (
    <>
      <Title>{`@${params.handle}`}</Title>
      <article>
        <h2>{`@${params.handle}`}</h2>
        <h5 data-tooltip="what getProfile returns—the value you see when visiting a profile">profile stats</h5>
        <SuspenseProgress>
          <ShowRatio follows={profile()?.data.followsCount} followers={profile()?.data.followersCount} />
        </SuspenseProgress>
        <h5 data-tooltip="does not include suspended, deactivated, deleted, or blocked">true stats</h5>
        <SuspenseProgress>
          <ShowRatio follows={follows.data().size} followers={followers.data().size} busy={!(followers.isDone() && follows.isDone())} />
          <p>{mutuals()} mutual{mutuals() !== 1 ? "s" : ""}, {(mutuals() / follows.data().size * 100).toFixed(1)}% of accounts followed are mutuals</p>
        </SuspenseProgress>
        <SuspenseProgress>
          <p>{likes().data.size} unique users <span data-tooltip="union of set of actors for all engagement metrics">engaged with @{params.handle}</span> via {likes().data.size} likes on most recent <span
            data-tooltip="take most recent 100 posts/reposts, filters to only posts, and limits to 30"
          >{recentPosts()?.length ?? "..."} posts</span></p>
        </SuspenseProgress>
      </article>
      <article>
        <SuspenseProgress>
          <Show when={!(followers.isDone() && follows.isDone() && likes().isDone)}>
            <h6>followers</h6>
            <CompletableProgress value={followers.data().size} max={profile()?.data.followersCount} isDone={followers.isDone()} />
            <h6>following</h6>
            <CompletableProgress value={follows.data().size} max={profile()?.data.followsCount} isDone={follows.isDone()} />
            <h6>engaged with you</h6>
            <CompletableProgress value={likes().data.size} max={maxLikes()} isDone={likes().isDone} />
          </Show>
          <Venn data={{
            followers: followers.data(),
            following: follows.data(),
            "engaged w user": likes().data
          }} />
        </SuspenseProgress>
      </article>
    </>
  );
}
