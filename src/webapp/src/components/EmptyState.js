import React from 'react';
import { Text } from './EmptyStateText'

export const EmptyState = () => {
  return (
    <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
        <Text>App is up and running in the background</Text>
    </div>
  );
}
