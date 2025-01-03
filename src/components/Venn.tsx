import { Component, createEffect } from "solid-js";
import * as venn from "@upsetjs/venn.js";
import * as d3 from "d3"
import styles from "./Venn.module.css"
import { throttle } from "@solid-primitives/scheduled";

const subsets = <T,>(source: T[]) => function*() {
  for (let n = 1; n < Math.pow(2, source.length); n++) {
    let subset: T[] = []
    for (let i = 0; i < source.length; i++) {
      if ((1 << i) & n) {
        subset.push(source[i])
      }
    }
    yield subset
  }
}()

const intersect = <T,>(sets: Set<T>[]) => {
  if (sets.length < 2) return sets[0]
  const newSet = sets.pop()!.intersection(sets.pop()!)
  if (newSet.size === 0) return newSet
  sets.push(newSet)
  return intersect(sets)
}

const computeSets = (data: Record<string, Set<string>>) => {
  let diagramSets: { sets: string[], size: number }[] = []
  for (const subset of subsets(Object.entries(data))) {
    const intersectionSize = intersect(subset.map(([_name, contains]) => contains)).size
    if (intersectionSize > 0) {
      diagramSets.push({
        sets: subset.map(([name, _contains]) => name),
        size: intersectionSize
      })
    }
  }
  return diagramSets
}

const Venn: Component<{
  data: Record<string, Set<string>>
}> = props => {
  let wrapperRef: HTMLDivElement | undefined
  let tooltipRef: HTMLDivElement | undefined


  const render = (sets: ReturnType<typeof computeSets>) => {
    const chart = venn.VennDiagram();
    const div = d3.select(wrapperRef!).datum(sets).call(chart);

    // add a tooltip
    const tooltip = d3.select(tooltipRef!)

    // add listeners to all the groups to display tooltip on mouseenter
    div
      .selectAll('g')
      .style("stroke-width", 3)
      .style("stroke", "rgb(255, 255, 255)")
      .style("stroke-opacity", 0)
      .on('mouseenter', function(event, d) {
        // sort all the areas relative to the current item
        venn.sortAreas(div, d);

        // Display a tooltip with the current size
        tooltip.transition().duration(400).style('opacity', 0.9);
        tooltip.text(d.size + ' users');

        // highlight the current path
        const selection = d3.select(this).transition('tooltip').duration(400);
        selection
          .select('path')
          .style('stroke-width', 3)
          .style('fill-opacity', d.sets?.length == 1 ? 0.4 : 0.1)
          .style('stroke-opacity', 1);
      })

      .on('mousemove', function(event) {
        tooltip.style('left', event.pageX + 'px').style('top', event.pageY - 50 + 'px');
      })

      .on('mouseleave', function(event, d) {
        tooltip.transition().duration(400).style('opacity', 0);
        const selection = d3.select(this).transition('tooltip').duration(400);
        selection
          .select('path')
          .style('stroke-width', 0)
          .style('fill-opacity', d.sets?.length == 1 ? 0.25 : 0.0)
          .style('stroke-opacity', 0);
      });
  }

  const triggerRender = throttle((data: typeof props.data) => {
    const sets = computeSets(data)
    render(sets)
  }, 750)

  createEffect(() => {
    triggerRender(props.data)
  })


  return <div ref={wrapperRef} >
    <div class={styles.venntooltip} ref={tooltipRef} />
  </div>
}
export default Venn
