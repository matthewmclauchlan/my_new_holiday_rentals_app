// lib/renderRichText.tsx
import React from 'react';
import { Text, Linking } from 'react-native';

const renderRichText = (node: any): React.ReactNode => {
  if (!node) return null;

  if (node.nodeType === 'document') {
    return node.content?.map((child: any, index: number) => (
      <React.Fragment key={index}>
        {renderRichText(child)}
      </React.Fragment>
    ));
  }

  if (node.nodeType === 'paragraph') {
    return (
      <Text key={node.id || Math.random()} style={{ marginBottom: 12 }}>
        {node.content?.map((child: any, index: number) => (
          <React.Fragment key={index}>
            {renderRichText(child)}
          </React.Fragment>
        ))}
      </Text>
    );
  }

  if (node.nodeType === 'hyperlink') {
    const url = node.data.uri;
    return (
      <Text
        key={node.id || Math.random()}
        style={{ color: 'blue', textDecorationLine: 'underline' }}
        onPress={() => Linking.openURL(url)}
      >
        {node.content?.map((child: any, index: number) => (
          <React.Fragment key={index}>
            {renderRichText(child)}
          </React.Fragment>
        ))}
      </Text>
    );
  }

  if (node.nodeType === 'text') {
    return node.value;
  }

  return null;
};

export default renderRichText;
