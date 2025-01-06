import { Meta, Title } from "@solidjs/meta";
import { clientOnly } from "@solidjs/start"
import { A, action, createAsync, json, useAction, useParams, useSearchParams } from "@solidjs/router";
import { batch, createEffect, createMemo, createSignal, Show, untrack } from "solid-js";
import { getAuthorFeed, getFollowers, getFollows, getLikes, getProfile } from "~/agent";
import { CompletableProgress, ShowRatio, SuspenseProgress } from "~/components/general";
import { busy, createBskyCursor, createCursorMappingReduction } from "~/bsky";
import { dbg, getLast, GetSetType, KeysOfType } from "~/utils";
import { BskyCompose } from "~/components/BskyCompose";
import { useEvent } from "~/server/serverUtils";
import { customAlphabet } from "nanoid";
import { IS_DEVELOPMENT } from "~/mode";
import { HandleInput } from "~/components/HandleInput";
import { getVennSVG } from "~/getVennSVG";

const Venn = clientOnly(() => import("~/components/Venn"))

export const route = {
  matchFilters: {
    handle: (handle: string) => URL.canParse(`https://${handle}`)
  }
}

const indefiniteNumber = (n: number) =>
  (n == 8 || n == 11 || n == 18 || n.toString().charAt(0) == "8")
    ? "an"
    : "a"

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8)
const storeSVGAction = action(async (svg: string) => {
  "use server"
  // TODO: make this bound tighter, make svg more efficient
  if (svg.length > 5_000) {
    return json({ error: "length limit exceeded" } as const, { status: 400 })
  }

  const { env } = await useEvent()
  // with size 8, 1k an hour;
  // ~87 days or 2M IDs for 1% chance of collision
  // https://zelark.github.io/nano-id-cc/
  const id = nanoid(8)
  await env.svgs.put(id, svg, {
    // when to expire the key-value pair in seconds from now
    // expire after 10 minutes
    expirationTtl: 60 * 10
  })

  return json({ id } as const)
})

export default function Handle() {
  const params = useParams<{ handle: string }>()
  const [searchParams, setSearchParams] = useSearchParams<{ og: string | string[] }>()

  const storeSVG = useAction(storeSVGAction)

  const [showLikes, setShowLikes] = createSignal(true)

  const [showDiagram, setShowDiagram] = createSignal(true)
  const [rendering, setRendering] = createSignal(false)

  createEffect(() => {
    if (!showDiagram()) setShowDiagram(true)
  })

  const profile = createAsync(() => getProfile({
    actor: params.handle
  }))
  const followers = createBskyCursor(
    getFollowers,
    { actor: params.handle, limit: 100 },
    data => data.followers.map(pview => pview.did)
  )
  const follows = createBskyCursor(
    getFollows,
    { actor: params.handle, limit: 100 },
    data => data.follows.map(pview => pview.did)
  )

  const recentPosts = createBskyCursor(
    getAuthorFeed,
    { actor: params.handle, limit: 100, filter: "posts_no_replies" },
    data => data.feed.map(fvPost => fvPost.post),
    50,
    // TODO: can people swap handles and cause issues for this? using did creates a waterfall on profile lookup
    post => post.author.handle === params.handle
  )

  type PView = GetSetType<ReturnType<typeof recentPosts["data"]>>
  const sumForMaxValue = (key: KeysOfType<PView, number | undefined>) => createMemo(() => Array.from(recentPosts.data()).reduce((acc, post) => acc + (post[key] ?? 0), 0))

  const likes = createCursorMappingReduction(
    recentPosts,
    post => post.uri,
    (post, cursor) => getLikes({ uri: post.uri, limit: 100, cursor }),
    (v) => v?.data.cursor,
    (acc, val) => acc.union(new Set(val.data.likes.map(like => like.actor.did))),
    () => new Set<string>(),
    (a, b) => a.union(b)
  )
  const maxLikes = sumForMaxValue("likeCount")

  const mutuals = createMemo(() => (follows.data()).intersection(followers.data()).size)
  const engagement = likes.data
  const ratio = (digits: number) => (followers.data().size / follows.data().size).toFixed(digits)

  return (
    <>
      <Title>{`@${params.handle}`}</Title>
      <Meta property="og:type" content="profile" />
      <Meta property="og:title" content={`@${params.handle}`} />
      <Meta property="og:url" content={`https://venn.aviva.gay/${params.handle}`} />
      <Meta property="og:site_name" content="venn.aviva.gay" />
      <Meta property="og:description" content={`venn diagram of bluesky behavior for @${params.handle}`} />
      <Meta property="profile:username" content={`@${params.handle}`} />
      <Show when={searchParams.og}>{og => <>
        <Meta property="og:image" content={`https://venn.aviva.gay/api/og/${getLast(og())}`} />
        <Meta property="og:image:alt" content="a venn diagram of followers, follows, and likes" />
      </>}</Show>
      <article>
        <div role="group" class="even">
          <h2>{`@${params.handle}`}</h2>
          <a href={`https://venn.aviva.gay/${params.handle}`}>https://venn.aviva.gay/{params.handle}</a>
          <p><small>made w/ ❤️ by <A target="_blank" href="https://bsky.app/profile/aviva.gay">@aviva.gay</A></small></p>
        </div>
        <h5 data-tooltip="what getProfile returns—the value you see when visiting a profile">profile stats</h5>
        <SuspenseProgress>
          <ShowRatio follows={profile()?.data.followsCount} followers={profile()?.data.followersCount} />
        </SuspenseProgress>
        <h5 data-tooltip="does not include suspended, deactivated, deleted, or blocked">true stats</h5>
        <SuspenseProgress>
          <ShowRatio follows={follows.data().size} followers={followers.data().size} busy={busy(follows, followers)} />
          <p aria-busy={busy(follows, followers)} style="white-space: initial">{mutuals()} mutual{mutuals() !== 1 ? "s" : ""}, {(mutuals() / follows.data().size * 100).toFixed(1)}% of accounts followed are mutuals</p>
        </SuspenseProgress>
        <SuspenseProgress>
          <p aria-busy={busy(recentPosts, likes)} style="white-space: initial">{engagement().size} unique users <span data-tooltip="union of set of actors for all engagement metrics">
            engaged with @{params.handle}</span> via likes on most recent <span
              data-tooltip={`top level posts ${params.handle} authored`}
            >{recentPosts.data().size} posts</span></p>
        </SuspenseProgress>
      </article>
      <article>
        <SuspenseProgress>
          <Show when={busy(followers, follows, likes)}>
            <h6>followers</h6>
            <CompletableProgress value={followers.data().size} max={profile()?.data.followersCount} isDone={followers.isDone()} />
            <h6>following</h6>
            <CompletableProgress value={follows.data().size} max={profile()?.data.followsCount} isDone={follows.isDone()} />
            <h6>likes on posts</h6>
            <CompletableProgress value={likes.data().size} max={maxLikes()} isDone={likes.isDone()} />
          </Show>
          <Show when={showDiagram()}>
            <Venn data={{
              ...{
                followers: followers.data(),
                following: follows.data(),
              },
              ...(
                !showLikes()
                  ? {}
                  : {
                    "likes": likes.data(),
                  })
            }} onFinishRender={() => {
              if (untrack(rendering)) setRendering(false)
            }} />
          </Show>
          <Show when={!busy(followers, follows, likes)}>
            <p>
              <BskyCompose message="share on bluesky!" postText={async () => {
                let queryParam = ""
                const svg = getVennSVG()
                if (IS_DEVELOPMENT) console.log({ svg })
                if (svg !== undefined) {
                  const response = await storeSVG(svg)
                  if (!("error" in response)) {
                    queryParam = `?og=${response.id}`
                    setSearchParams({ og: response.id })
                  }
                }
                return `I have ${indefiniteNumber(parseInt(ratio(0)))
                  } ${ratio(1)} follower/following ratio https://venn.aviva.gay/${params.handle}${queryParam}`
              }} />
            </p>
          </Show>
        </SuspenseProgress>
      </article>
      <Show when={searchParams.og}>
        <article>
          <p>generate your own venn diagram!</p>
          <HandleInput />
        </article>
      </Show>
      <article>
        <h2>config</h2>
        <fieldset>
          <label>
            <input name="showLikes" type="checkbox" role="switch" checked={showLikes()} onChange={e => setShowLikes(e.currentTarget.checked)} />
            display likes in venn diagram
          </label>
          <button class="secondary" aria-busy={rendering()} onClick={() => batch(() => {
            setShowDiagram(false)
            setRendering(true)
          })} >rerender (fix visual issues)</button>
        </fieldset>
      </article>
    </>
  );
}
