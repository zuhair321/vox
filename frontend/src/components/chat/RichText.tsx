import React from 'react';
import { parseMarkdown } from '../../utils/markdown';
import { useEmojiStore } from '../../stores/emojiStore';

interface Props {
  text: string;
  serverId?: string;
}

const RichText: React.FC<Props> = ({ text, serverId }) => {
  const getEmojiUrl = useEmojiStore((s) => s.getEmojiUrl);
  const resolver = React.useCallback(
    (name: string) => getEmojiUrl(serverId, name),
    [getEmojiUrl, serverId],
  );
  const nodes = parseMarkdown(text, resolver);
  return <>{nodes}</>;
};

export default RichText;
