import HorizontalRule from '@tiptap/extension-horizontal-rule';
import type { NodeViewProps } from '@tiptap/core';

export interface HorizontalRuleAttrs {
  color?: string;
  thickness?: number;
}

export const HorizontalRuleEx = HorizontalRule.extend({
  addAttributes() {
    return {
      color: {
        default: '#9ca3af',
        parseHTML: (element) => (element as HTMLElement).style.borderTopColor || (element.getAttribute('data-color') ?? '#9ca3af'),
        renderHTML: (attributes) => ({ 'data-color': attributes.color }),
      },
      thickness: {
        default: 1,
        parseHTML: (element) => {
          const t = (element as HTMLElement).style.borderTopWidth || element.getAttribute('data-thickness');
          const n = Number(String(t).replace('px', ''));
          return Number.isFinite(n) && n > 0 ? n : 1;
        },
        renderHTML: (attributes) => ({ 'data-thickness': attributes.thickness }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const thickness = Number(HTMLAttributes.thickness) || 1;
    const color = typeof HTMLAttributes.color === 'string' ? HTMLAttributes.color : '#9ca3af';
    const style = `border: none; border-top: ${thickness}px solid ${color}; margin: 12px 0;`;
    return ['hr', { ...HTMLAttributes, style }];
  },

  addNodeView() {
    return ({ node }: NodeViewProps) => {
      const dom = document.createElement('hr');
      const apply = (attrs: Record<string, unknown>) => {
        const thickness = Number(attrs.thickness) || 1;
        const color = typeof attrs.color === 'string' ? attrs.color : '#9ca3af';
        dom.style.border = 'none';
        dom.style.borderTop = `${thickness}px solid ${color}`;
        dom.style.margin = '12px 0';
        dom.setAttribute('data-thickness', String(thickness));
        dom.setAttribute('data-color', color);
      };
      // Apply styles on initial mount
      apply((node as unknown as { attrs?: Record<string, unknown> }).attrs || {});
      return {
        dom,
        update: (updatedNode) => {
          const n = updatedNode as unknown as { type?: { name?: string }; attrs?: Record<string, unknown> };
          if (!n.type || n.type.name !== this.name) return false;
          apply(n.attrs || {});
          return true;
        },
      };
    };
  },
});


