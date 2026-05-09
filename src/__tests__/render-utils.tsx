import React from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

type RawJSON =
  | string
  | number
  | { type: string; props: Record<string, unknown>; children: RawJSON[] | null }
  | null;

export type RenderedJSON = Exclude<RawJSON, null | string | number>;

export const renderToTree = (element: React.ReactElement): RenderedJSON => {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(element);
  });
  if (!renderer) {
    throw new Error('act(create()) did not assign a renderer');
  }
  const tree = (renderer as ReactTestRenderer).toJSON() as RawJSON;
  if (!tree) {
    throw new Error('Render produced an empty tree');
  }
  if (Array.isArray(tree)) {
    throw new Error(
      'Render produced multiple root nodes; wrap the test element in a single root'
    );
  }
  if (typeof tree === 'string' || typeof tree === 'number') {
    throw new Error('Render produced a primitive root, not an element');
  }
  return tree;
};

const flattenChildren = (node: RawJSON): RenderedJSON[] => {
  if (!node || typeof node === 'string' || typeof node === 'number') return [];
  const out: RenderedJSON[] = [node as RenderedJSON];
  for (const child of node.children ?? []) {
    out.push(...flattenChildren(child));
  }
  return out;
};

/**
 * Walk the rendered tree and return every node whose `type` matches.
 * Use the host-element names produced by the skia mock (e.g. `skia-text`).
 */
export const findAllByType = (
  tree: RenderedJSON,
  type: string
): RenderedJSON[] => flattenChildren(tree).filter((n) => n.type === type);

export const renderAndFind = (
  element: React.ReactElement,
  type: string
): RenderedJSON[] => findAllByType(renderToTree(element), type);
