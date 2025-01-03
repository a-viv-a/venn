import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { getProfile } from "~/agent";

export default function About() {
  const params = useParams<{ handle: string }>()
  const profile = createAsync(() => getProfile({
    actor: params.handle
  }))
  return (
    <>
      <Title>{`@${params.handle}`}</Title>
      <article>
        <h2>{profile()?.data.displayName}</h2>
        <p><small><code>{profile()?.data.followersCount}</code> followers / <code>{profile()?.data.followsCount}</code> following = <code>{
          ((profile()?.data.followersCount ?? 0) / (profile()?.data.followsCount ?? 0)).toFixed(3)
        }</code></small></p>
      </article>
    </>
  );
}
