<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";

import type { TaxonomyTag } from "@/types/content";
import { isTaxonomyScopeTreeNode } from "../taxonomyDirectoryUtils";
import { buildTaxonomyTreeLayout, truncateTreeLabel } from "../taxonomyTreeD3";

const props = withDefaults(
  defineProps<{
    roots: TaxonomyTag[];
    selectedTagId?: string | null;
    loading?: boolean;
    emptyHint?: string;
    variant?: "section" | "global";
  }>(),
  {
    selectedTagId: null,
    loading: false,
    emptyHint: "Нет корневых тегов в этом разделе",
    variant: "section",
  },
);

const emit = defineEmits<{
  select: [tag: TaxonomyTag];
}>();

const hostRef = ref<HTMLElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

const MARGIN = { top: 24, right: 24, bottom: 24, left: 24 };
const NODE_DX = 200;
const NODE_DY = 36;

function render() {
  const host = hostRef.value;
  const svgEl = svgRef.value;
  if (!host || !svgEl) {
    return;
  }

  const width = Math.max(host.clientWidth, 320);
  const height = Math.max(host.clientHeight, 280);

  const svg = select(svgEl);
  svg.selectAll("*").remove();
  svg.attr("width", width).attr("height", height);

  if (!props.roots.length) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#8c8c8c")
      .attr("font-size", 14)
      .text(props.emptyHint);
    return;
  }

  const { nodes, links, width: treeWidth, height: treeHeight } = buildTaxonomyTreeLayout(
    props.roots,
    { x: NODE_DX, y: NODE_DY },
  );

  const innerWidth = treeWidth + MARGIN.left + MARGIN.right;
  const innerHeight = treeHeight + MARGIN.top + MARGIN.bottom;

  const g = svg.append("g").attr("class", "taxonomy-tree-zoom-layer");

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.35, 2.5])
    .on("zoom", event => {
      g.attr("transform", event.transform.toString());
    });

  svg.call(zoomBehavior as never);

  const fitScale = Math.min(
    (width - 32) / innerWidth,
    (height - 32) / innerHeight,
    1,
  );
  const fitX = (width - innerWidth * fitScale) / 2 + MARGIN.left * fitScale;
  const fitY = (height - innerHeight * fitScale) / 2 + MARGIN.top * fitScale;
  const initial = zoomIdentity.translate(fitX, fitY).scale(fitScale);
  svg.call(zoomBehavior.transform as never, initial);

  const plot = g
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  plot
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#d9d9d9")
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("d", link => {
      const sx = link.source.y;
      const sy = link.source.x;
      const tx = link.target.y;
      const ty = link.target.x;
      const midX = (sx + tx) / 2;
      return `M${sx},${sy}C${midX},${sy} ${midX},${ty} ${tx},${ty}`;
    });

  const nodeGroups = plot
    .append("g")
    .selectAll<SVGGElement, (typeof nodes)[number]>("g")
    .data(nodes)
    .join("g")
    .attr("transform", d => `translate(${d.y},${d.x})`)
    .style("cursor", "pointer")
    .on("click", (_event, d) => {
      emit("select", d.data.tag);
    });

  nodeGroups
    .append("circle")
    .attr("r", d => (isTaxonomyScopeTreeNode(d.data.tag) ? 7 : 5))
    .attr("fill", d => {
      if (d.data.tag.id === props.selectedTagId) {
        return "#1677ff";
      }
      if (isTaxonomyScopeTreeNode(d.data.tag)) {
        return "#722ed1";
      }
      return "#595959";
    })
    .attr("stroke", d =>
      d.data.tag.id === props.selectedTagId ? "#1677ff" : "transparent",
    )
    .attr("stroke-width", 2);

  nodeGroups
    .append("text")
    .attr("dy", "0.32em")
    .attr("x", 10)
    .attr("text-anchor", "start")
    .attr("fill", d =>
      d.data.tag.id === props.selectedTagId ? "#1677ff" : "#262626",
    )
    .attr("font-size", 13)
    .attr("font-weight", d =>
      d.data.tag.id === props.selectedTagId ? "600" : "400",
    )
    .text(d => truncateTreeLabel(d.data.tag.label));

  nodeGroups
    .append("title")
    .text(d => `${d.data.tag.label}\n${d.data.tag.key}`);
}

function scheduleRender() {
  requestAnimationFrame(render);
}

onMounted(() => {
  if (hostRef.value) {
    resizeObserver = new ResizeObserver(scheduleRender);
    resizeObserver.observe(hostRef.value);
  }
  scheduleRender();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

watch(
  () => [props.roots, props.selectedTagId, props.loading] as const,
  () => scheduleRender(),
  { deep: true },
);
</script>

<template>
  <div
    ref="hostRef"
    class="taxonomy-tree-canvas"
    :class="{
      'taxonomy-tree-canvas--loading': loading,
      'taxonomy-tree-canvas--global': variant === 'global',
    }"
  >
    <svg ref="svgRef" class="taxonomy-tree-canvas__svg" role="img" aria-label="Дерево таксономии" />
    <div v-if="loading" class="taxonomy-tree-canvas__loading">Загрузка…</div>
  </div>
</template>

<style scoped>
.taxonomy-tree-canvas--global {
  min-height: 480px;
  height: 560px;
}

.taxonomy-tree-canvas {
  position: relative;
  width: 100%;
  min-height: 320px;
  height: 420px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  overflow: hidden;
}

.taxonomy-tree-canvas__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.taxonomy-tree-canvas--loading .taxonomy-tree-canvas__svg {
  opacity: 0.45;
  pointer-events: none;
}

.taxonomy-tree-canvas__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #8c8c8c;
  pointer-events: none;
}
</style>
