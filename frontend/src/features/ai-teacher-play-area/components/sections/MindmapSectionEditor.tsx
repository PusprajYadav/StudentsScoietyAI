import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { PlayAreaMindmapNode, PlayAreaSection } from "../../types";
import { buildMindmapDepths, createEditorId, surfaceInputClassName } from "../../utils";

export function MindmapSectionEditor({
  section,
  onChange,
}: {
  section: PlayAreaSection;
  onChange: (nextSection: PlayAreaSection) => void;
}) {
  const depthMap = buildMindmapDepths(section.nodes);
  const labelMap = new Map(section.nodes.map((node) => [node.id, node.label]));
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  function updateNode(nodeId: string, updater: (node: PlayAreaMindmapNode) => PlayAreaMindmapNode) {
    onChange({
      ...section,
      nodes: section.nodes.map((candidate) => (candidate.id === nodeId ? updater(candidate) : candidate)),
    });
  }

  function moveNode(draggedId: string, targetId: string, placement: "before" | "after") {
    if (draggedId === targetId) {
      return;
    }

    const draggedIndex = section.nodes.findIndex((candidate) => candidate.id === draggedId);
    const targetIndex = section.nodes.findIndex((candidate) => candidate.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextNodes = [...section.nodes];
    const [draggedNode] = nextNodes.splice(draggedIndex, 1);
    const targetPosition = nextNodes.findIndex((candidate) => candidate.id === targetId);
    const insertIndex = placement === "after" ? targetPosition + 1 : targetPosition;
    nextNodes.splice(insertIndex, 0, draggedNode);
    onChange({ ...section, nodes: nextNodes });
  }

  return (
    <div className="min-w-0 grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="min-w-0 rounded-[20px] border border-white/80 bg-white/84 p-3 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.32)] sm:rounded-[24px] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Node builder</p>
            <p className="mt-1 text-sm text-slate-600">Shape the hierarchy, then use the preview on the right to check the structure.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...section,
                nodes: [
                  ...section.nodes,
                  {
                    id: createEditorId("node"),
                    label: "New node",
                    parentId: section.nodes[0]?.id || null,
                    highlightColor: section.highlightColor,
                  },
                ],
              })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/92 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add node
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {section.nodes.map((node) => (
            <div
              key={node.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (!draggedNodeId) {
                  return;
                }
                const bounds = event.currentTarget.getBoundingClientRect();
                moveNode(draggedNodeId, node.id, event.clientY > bounds.top + bounds.height / 2 ? "after" : "before");
                setDraggedNodeId(null);
              }}
              className={`rounded-[18px] border bg-[#fffdfa]/95 p-3 shadow-[0_16px_28px_-28px_rgba(15,23,42,0.32)] transition sm:rounded-[20px] ${
                draggedNodeId === node.id ? "border-slate-400 opacity-65" : "border-slate-200/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedNodeId(node.id);
                    }}
                    onDragEnd={() => setDraggedNodeId(null)}
                    className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 active:cursor-grabbing sm:h-9 sm:w-9"
                    aria-label="Drag to reorder node"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <div className="mt-3 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: node.highlightColor }} />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...section,
                      nodes: section.nodes.filter((candidate) => candidate.id !== node.id),
                    })
                  }
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600 sm:h-9 sm:w-9"
                  aria-label="Remove node"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 min-w-0 space-y-2">
                <input
                  value={node.label}
                  onChange={(event) => updateNode(node.id, (current) => ({ ...current, label: event.target.value }))}
                  className="w-full rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-slate-400"
                  placeholder="Node label"
                />
                <select
                  value={node.parentId || ""}
                  onChange={(event) => updateNode(node.id, (current) => ({ ...current, parentId: event.target.value || null }))}
                  className={surfaceInputClassName}
                >
                  <option value="">Root node</option>
                  {section.nodes
                    .filter((candidate) => candidate.id !== node.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.label || "Untitled node"}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 rounded-[20px] border border-white/80 bg-white/80 p-3 shadow-[0_18px_28px_-28px_rgba(15,23,42,0.3)] sm:rounded-[24px] sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Mindmap Preview</p>
        <div className="mt-4 rounded-[18px] border border-slate-200/80 bg-white/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:rounded-[22px] sm:p-4">
          <div className="space-y-3">
            {section.nodes.map((node) => {
              const depth = depthMap.get(node.id) || 0;
              const parentLabel = node.parentId ? labelMap.get(node.parentId) || "Root node" : "Root node";

              return (
                <div key={`preview-${node.id}`} className="relative" style={{ marginLeft: `${depth * 16}px` }}>
                  {depth ? <div className="absolute -left-3 top-1/2 h-px w-3 bg-slate-200 sm:-left-4 sm:w-4" /> : null}
                  <div className="rounded-[16px] border border-slate-200 bg-[#fffdfa] px-3 py-3 shadow-[0_14px_26px_-26px_rgba(15,23,42,0.35)] sm:rounded-[18px] sm:px-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.highlightColor }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{node.label || "Untitled node"}</p>
                        <p className="mt-1 text-xs text-slate-500">{node.parentId ? `Linked to ${parentLabel}` : "Root node"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
