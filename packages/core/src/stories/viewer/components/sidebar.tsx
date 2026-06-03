import { hasTag } from '@maltty/utils/tag'
import type { DOMElement } from 'ink'
import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { match } from 'ts-pattern'

import { ScrollArea } from '../../../ui/layout/scroll-area.js'
import { useSize } from '../../../ui/layout/use-size.js'
import type { Story, StoryEntry, StoryGroup } from '../../types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Sidebar} component.
 */
interface SidebarProps {
  readonly entries: ReadonlyMap<string, StoryEntry>
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
  readonly isFocused: boolean
  readonly hidden?: boolean
}

/**
 * A node in the sidebar tree. Can be a collapsible group header
 * or a selectable story leaf.
 *
 * @private
 */
interface TreeNode {
  readonly id: string
  readonly label: string
  readonly kind: 'group' | 'leaf'
  readonly indent: number
  readonly groupKey?: string
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Story browser sidebar with a collapsible directory tree. Groups can
 * be expanded/collapsed with Enter. Story leaves are selected with Enter.
 * Arrow keys navigate the visible tree.
 *
 * @param props - The sidebar props.
 * @returns A rendered sidebar element.
 */
export function Sidebar({
  entries,
  selectedId,
  onSelect,
  isFocused,
  hidden,
}: SidebarProps): ReactElement {
  const allNodes = useMemo(() => buildTreeNodes(entries), [entries])
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() =>
    initialCollapsedSet(allNodes)
  )
  const visibleNodes = useMemo(() => filterVisibleNodes(allNodes, collapsed), [allNodes, collapsed])
  const [highlightIndex, setHighlightIndex] = useState(0)

  useEffect(() => {
    setHighlightIndex((current) => {
      if (visibleNodes.length === 0) {
        return 0
      }
      if (current >= visibleNodes.length) {
        return visibleNodes.length - 1
      }
      return current
    })
  }, [visibleNodes.length])

  useInput(
    (_input, key) => {
      if (key.upArrow) {
        setHighlightIndex((current) =>
          match({ atStart: current <= 0, empty: visibleNodes.length === 0 })
            .with({ empty: true }, () => 0)
            .with({ atStart: true }, () => visibleNodes.length - 1)
            .otherwise(() => current - 1)
        )
      }
      if (key.downArrow) {
        setHighlightIndex((current) =>
          match({ atEnd: current >= visibleNodes.length - 1, empty: visibleNodes.length === 0 })
            .with({ empty: true }, () => 0)
            .with({ atEnd: true }, () => 0)
            .otherwise(() => current + 1)
        )
      }
      if (key.return) {
        const node = visibleNodes[highlightIndex]
        if (node === undefined) {
          return
        }
        if (node.kind === 'group') {
          toggleGroup(node.id, setCollapsed)
          return
        }
        onSelect(node.id)
      }
    },
    { isActive: isFocused }
  )

  const highlightedNode = visibleNodes[highlightIndex]
  const highlightedId = resolveNodeId(highlightedNode)
  const scrollRef = useRef<DOMElement>(null)
  const { height: scrollHeight } = useSize(scrollRef)

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderDimColor={!isFocused}
      borderColor={match(isFocused)
        .with(true, () => 'cyan' as const)
        .with(false, () => undefined)
        .exhaustive()}
      width="25%"
      paddingX={1}
      display={match(hidden === true)
        .with(true, () => 'none' as const)
        .with(false, () => 'flex' as const)
        .exhaustive()}
    >
      <Box marginBottom={1}>
        <Text bold dimColor={!isFocused}>
          Stories
        </Text>
      </Box>
      <Box ref={scrollRef} flexDirection="column" flexGrow={1}>
        <ScrollArea
          height={Math.max(1, scrollHeight)}
          activeIndex={Math.max(0, highlightIndex)}
          itemCount={visibleNodes.length}
          showIndicator={visibleNodes.length > scrollHeight}
        >
          {visibleNodes.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              isHighlighted={node.id === highlightedId}
              isSelected={node.id === selectedId}
              isCollapsed={collapsed.has(node.id)}
            />
          ))}
        </ScrollArea>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link TreeRow} component.
 *
 * @private
 */
interface TreeRowProps {
  readonly node: TreeNode
  readonly isHighlighted: boolean
  readonly isSelected: boolean
  readonly isCollapsed: boolean
}

/**
 * Render a single row in the sidebar tree.
 *
 * @private
 * @param props - The tree row props.
 * @returns A rendered tree row element.
 */
function TreeRow({ node, isHighlighted, isSelected, isCollapsed }: TreeRowProps): ReactElement {
  const indent = '  '.repeat(node.indent)

  if (node.kind === 'group') {
    const icon = match(isCollapsed)
      .with(true, () => '▸ 📁')
      .with(false, () => '▾ 📂')
      .exhaustive()

    return (
      <Box>
        <Text
          bold
          dimColor={!isHighlighted}
          color={match(isHighlighted)
            .with(true, () => 'cyan' as const)
            .with(false, () => undefined)
            .exhaustive()}
        >
          {indent}
          {icon} {node.label}
        </Text>
      </Box>
    )
  }

  const cursor = match(isHighlighted)
    .with(true, () => '▸ ')
    .with(false, () => '  ')
    .exhaustive()

  return (
    <Box>
      <Text
        color={match({ isHighlighted, isSelected })
          .with({ isHighlighted: true }, () => 'cyan' as const)
          .with({ isSelected: true }, () => 'green' as const)
          .otherwise(() => undefined)}
        bold={isHighlighted}
      >
        {indent}
        {cursor}
        {node.label}
      </Text>
    </Box>
  )
}

/**
 * Toggle a group's collapsed state.
 *
 * @private
 * @param groupId - The group node ID to toggle.
 * @param setCollapsed - State setter for the collapsed set.
 */
function toggleGroup(
  groupId: string,
  setCollapsed: (updater: (prev: ReadonlySet<string>) => ReadonlySet<string>) => void
): void {
  setCollapsed((prev) => {
    const next = new Set(prev)
    if (next.has(groupId)) {
      next.delete(groupId)
    } else {
      next.add(groupId)
    }
    return next
  })
}

/**
 * Build the full tree node list from registry entries. Groups produce
 * a header node followed by indented leaf nodes for each variant.
 * Single stories produce a single leaf node at indent 0.
 *
 * @private
 * @param entries - The story registry entries.
 * @returns The full (unfiltered) tree node list.
 */
function buildTreeNodes(entries: ReadonlyMap<string, StoryEntry>): readonly TreeNode[] {
  return [...entries.entries()].flatMap(([key, entry]) =>
    match(hasTag(entry, 'StoryGroup'))
      .with(true, () => groupToNodes(key, entry as StoryGroup))
      .with(false, () =>
        match(hasTag(entry, 'Story'))
          .with(true, () => [
            {
              id: key,
              label: (entry as Story).name,
              kind: 'leaf' as const,
              indent: 0,
            },
          ])
          .with(false, () => [] as readonly TreeNode[])
          .exhaustive()
      )
      .exhaustive()
  )
}

/**
 * Convert a story group into tree nodes: one group header followed by
 * indented leaf nodes for each variant.
 *
 * @private
 * @param key - The group registry key.
 * @param group - The story group entry.
 * @returns Tree nodes for the group.
 */
function groupToNodes(key: string, group: StoryGroup): readonly TreeNode[] {
  const header: TreeNode = {
    id: `group:${key}`,
    label: group.title,
    kind: 'group',
    indent: 0,
    groupKey: key,
  }
  const leaves: readonly TreeNode[] = Object.keys(group.stories).map((variantName) => ({
    id: `${key}::${variantName}`,
    label: variantName,
    kind: 'leaf' as const,
    indent: 1,
    groupKey: key,
  }))
  return [header, ...leaves]
}

/**
 * Filter the full tree to only visible nodes based on collapsed groups.
 * When a group is collapsed, its child leaves are hidden.
 *
 * @private
 * @param nodes - The full tree node list.
 * @param collapsed - The set of collapsed group node IDs.
 * @returns Only the nodes that should be visible.
 */
function filterVisibleNodes(
  nodes: readonly TreeNode[],
  collapsed: ReadonlySet<string>
): readonly TreeNode[] {
  return nodes.filter((node) => {
    if (node.kind === 'group') {
      return true
    }
    if (node.groupKey === undefined) {
      return true
    }
    return !collapsed.has(`group:${node.groupKey}`)
  })
}

/**
 * Extract the ID from a tree node, returning null when undefined.
 *
 * @private
 * @param node - The tree node to resolve.
 * @returns The node ID or null.
 */
function resolveNodeId(node: TreeNode | undefined): string | null {
  if (node === undefined) {
    return null
  }
  return node.id
}

/**
 * Build the initial collapsed set containing all group node IDs,
 * so groups start collapsed by default.
 *
 * @private
 * @param nodes - The full tree node list.
 * @returns A set of all group node IDs.
 */
function initialCollapsedSet(nodes: readonly TreeNode[]): ReadonlySet<string> {
  return new Set(nodes.filter((node) => node.kind === 'group').map((node) => node.id))
}
