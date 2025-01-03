import { Agent } from "@atproto/api";
import { query } from "@solidjs/router";

const agent = new Agent("https://public.api.bsky.app/")

/**
seroval isn't able to serialize classes, so this HOF spreads the returned promise to convert class -> object
*/
const spreadret = <A extends unknown[], O>(f: (...args: A) => Promise<O>) => async (...args: A) => ({
  ...await f(...args)
})

export const getProfile = query(spreadret(agent.getProfile), "agent.getProfile")
export const getFollows = query(spreadret(agent.getFollows), "agent.getFollows")
export const getFollowers = query(spreadret(agent.getFollowers), "agent.getFollowers")
