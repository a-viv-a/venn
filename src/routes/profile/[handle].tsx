import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { ParentComponent, Suspense } from "solid-js";
import { getFollowers, getProfile } from "~/agent";

const SuspenseArticle: ParentComponent = props => <article><Suspense fallback={<progress />}>{props.children}</Suspense></article>

export default function Handle() {
  const params = useParams<{ handle: string }>()
  const profile = createAsync(() => getProfile({
    actor: params.handle
  }))
  const followers = createAsync(() => getFollowers({
    actor: params.handle,
    limit: 100
  }))
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
        {followers()?.data.followers.map(f => f.did)}
        <p>{followers()?.data.followers.length}</p>
        <p>{followers()?.data.cursor}</p>
      </SuspenseArticle>
    </>
  );
}
