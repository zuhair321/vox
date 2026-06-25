import React from 'react';
import { parseMarkdown } from '../../utils/markdown';

interface Props {
  text: string;
}

const RichText: React.FC<Props> = ({ text }) => {
  const nodes = parseMarkdown(text);
  return <>{nodes}</>;
};

export default RichText;
