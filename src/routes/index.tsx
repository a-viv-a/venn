import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { HandleInput } from "~/components/HandleInput";

export default function Home() {
  return (
    <main>
      <Title>venn</Title>
      <h1>venn diagram</h1>
      <p>
        Go forth! Generate your very own venn diagram! Or go <A href="/about">read about this site.</A>
      </p>
      <HandleInput />
    </main>
  );
}
