import { Meta, Title } from "@solidjs/meta";
import { HandleInput } from "~/components/HandleInput";

export default function Home() {
  return (
    <main>
      <Title>venn</Title>
      <Meta property="og:title" content="venn diagram generator" />
      <Meta property="og:url" content="https://venn.aviva.gay" />
      <Meta property="og:site_name" content="venn.aviva.gay" />
      <Meta property="og:description" content="generate venn diagrams based on your bluesky behavior" />
      <Meta property="og:image" content="/icon-512.png" />
      <Meta property="og:image:alt" content="a blank venn diagram" />
      <h1>venn diagram</h1>
      <p>
        Go forth! Generate your very own venn diagram!
      </p>
      <HandleInput />
    </main>
  );
}
