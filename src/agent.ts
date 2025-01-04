import { Agent } from "@atproto/api";
import { query } from "@solidjs/router";

const agent = new Agent("https://public.api.bsky.app/")

/**
seroval isn't able to serialize classes, so this HOF spreads the returned promise to convert class -> object
*/
const spreadret = <A extends unknown[], O>(f: (...args: A) => Promise<O>) => async (...args: A) => ({
  ...await f(...args)
})
const spreadretrec = <A extends unknown[], O extends object>(f: (...args: A) => Promise<O>) => async (...args: A) => {
  const spread = <V>(v: V): V =>
    Array.isArray(v)
      ? v.map(keymap) as V
      : typeof v === "object" && v !== null
        ? keymap(v)
        : v

  const keymap = <T extends object>(obj: T): T => Object.fromEntries(
    Object.entries(obj)
      .map(([k, v]) => ([k, spread(v)]))
  ) as T
  return spread(await f(...args))
}

export const getProfile = query(spreadret(agent.getProfile), "agent.getProfile")
export const getFollows = query(spreadret(agent.getFollows), "agent.getFollows")
export const getFollowers = query(spreadret(agent.getFollowers), "agent.getFollowers")
export const getAuthorFeed = query(spreadretrec(agent.getAuthorFeed), "agent.getAuthorFeed")

export const getLikes = query(spreadret(agent.getLikes), "agent.getLikes")
export const getPostThread = query(spreadret(agent.getPostThread), "agent.getPostThread")
// TODO: get bsky to add CORS headers to these endpoints? hmm
// consider a cloudflare worker CORS proxy that only works for venn domains -> bsky public api
// export const getRepostedBy = query(spreadret(agent.getRepostedBy), "agent.getRepostedBy")
