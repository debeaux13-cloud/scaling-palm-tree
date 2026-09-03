'use client';
import { useEffect } from 'react';
export function OneMinuteCopy() {
  useEffect(() => {
    const replace = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (!node.nodeValue) continue;
        node.nodeValue = node.nodeValue
          .replace(/60-second preview/gi, '1-minute preview')
          .replace(/60 seconds free/gi, '1 minute free')
          .replace(/first 60 seconds/gi, 'first 1 minute')
          .replace(/60-second/gi, '1-minute');
      }
    };
    replace();
    const observer = new MutationObserver(replace);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
