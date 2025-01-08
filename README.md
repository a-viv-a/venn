# venn

generate bluesky venn diagrams; [venn.aviva.gay](https://venn.aviva.gay)

## Developing

install dependencies

```bash
npm i
```

use `flake.nix` or install [just](https://github.com/casey/just)

```bash
just dev

# run a local build
just build

# generate wrangler types
just typegen

# check for type errors
just check
```

## Deployment

If you wanted to deploy a fork, you should create a new cloudflare pages project
and have it run `./pages_build.sh`, and then deploy `/dist`. Kindly also host
a copy of [svg](https://github.com/a-viv-a/svg), and grep through the source to
find references to `venn.aviva.gay` and `svg.aviva.gay`.

you could definitely make this work on a different serverless platform but no
support for that usecase.

## Contributions

I'll take PRs if they are smaller/low maintenance effort but please open an
issue or reach out so we can agree on if a larger or more significant piece of
work is worth doing. I see this as a neat hack moreso than an ongoing project.
