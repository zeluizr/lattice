import React, { type ReactNode } from "react";
import { Box, Text } from "ink";

/** A bordered card with a colored title, matching the original Dracula Pro look. */
export function Panel({
  title,
  color,
  children,
  width,
  minHeight,
}: {
  title: string;
  color: string;
  children: ReactNode;
  width?: number;
  minHeight?: number;
}): React.JSX.Element {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      marginRight={1}
      flexGrow={width ? 0 : 1}
      flexShrink={0}
      width={width}
      minHeight={minHeight}
    >
      <Text color={color} bold wrap="truncate">
        {title}
      </Text>
      {children}
    </Box>
  );
}
