import { Component, createEffect } from "solid-js";
import * as venn from "@upsetjs/venn.js";
import * as d3 from "d3"
import styles from "./Venn.module.css"

const Venn: Component = props => {
  let wrapperRef: HTMLDivElement | undefined
  let tooltipRef: HTMLDivElement | undefined

  const sets = [
    { sets: ['A'], size: 6 },
    { sets: ['B'], size: 12 },
    { sets: ['A', 'B'], size: 2 },
  ];

  createEffect(() => {
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
  })


  return <div ref={wrapperRef} >
    <div class={styles.venntooltip} ref={tooltipRef}/>
  </div>
}
export default Venn
