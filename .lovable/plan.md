

# Add Chat History Sidebar to Ask DeriveStreet Panel

## Overview
Transform the Ask DeriveStreet panel to include a collapsible chat history sidebar that displays previous conversations across all symbols. This involves replacing the trashcan icon with a "new chat" icon, adding a hamburger menu to toggle the history sidebar, and expanding the panel width when the history view is active.

## UI Changes

### Header Modifications
- **Left side**: Replace the blue Sparkles icon with a hamburger menu (`Menu` icon) that toggles the chat history sidebar
- **Right side**: Replace the `Trash2` icon with a "new chat" icon (`SquarePen` from lucide-react - matches the reference screenshot)
- The `PanelRightClose` icon remains for closing the entire panel

### Chat History Sidebar
- Appears as a left-attached panel within the Ask DeriveStreet panel
- Shows all symbols that have conversation history stored in localStorage
- Each history item displays:
  - Symbol name (e.g., "NVDA", "AAPL")
  - First message preview (truncated)
  - Timestamp of last message
- Clicking a history item loads that symbol's conversation
- Liquid Glass styling consistent with the main panel

### Panel Width Behavior
- **History closed**: Standard width (320-480px, default 480px)
- **History open**: Panel expands by ~200px to accommodate the history sidebar
- Smooth animated transition when toggling

## Technical Implementation

### 1. Create New Component: `ChatHistorySidebar.tsx`
```text
Location: src/components/ask/ChatHistorySidebar.tsx

Purpose: Renders the list of previous conversations grouped by symbol

Features:
- Reads all conversations from localStorage (STORAGE_KEY)
- Maps symbols to preview data (first user message, last timestamp)
- Renders clickable list items with symbol badges
- Emits onSelectSymbol callback when clicked
- Delete individual conversation histories
```

### 2. Update Context: `AskDeriveStreetContext.tsx`
```text
Add new state and methods:
- isHistoryOpen: boolean - tracks if history sidebar is visible
- setHistoryOpen: (open: boolean) => void
- getAllConversations: () => returns all stored conversations for history display
- Update MAX_WIDTH constant to accommodate expanded state
```

### 3. Update Panel: `AskDeriveStreetPanel.tsx`
```text
Header changes:
- Import Menu and SquarePen icons from lucide-react
- Replace left Sparkles icon with Menu button (toggles history)
- Replace Trash2 with SquarePen (starts new chat for current symbol)

Layout changes:
- Conditionally render ChatHistorySidebar on the left
- Animate panel width expansion when history is open
- Use flex layout: [History Sidebar | Main Chat Area]

Width calculation:
- Base width: panelWidth (320-480px)
- History sidebar: +200px when open
- Total when history open: panelWidth + 200px
```

### 4. Icon Mapping
| Current | New | Purpose |
|---------|-----|---------|
| Sparkles (left header) | Menu (hamburger) | Toggle history sidebar |
| Trash2 (right header) | SquarePen | Start new chat |
| PanelRightClose | (unchanged) | Close entire panel |

## File Changes Summary

| File | Action |
|------|--------|
| `src/components/ask/ChatHistorySidebar.tsx` | CREATE - New history list component |
| `src/components/ask/AskDeriveStreetPanel.tsx` | MODIFY - New header icons, history sidebar integration, width animation |
| `src/contexts/AskDeriveStreetContext.tsx` | MODIFY - Add isHistoryOpen state and getAllConversations helper |

## Visual Layout

```text
+----------------------------------------------------+
| [≡] Ask DeriveStreet        [📝] [▶|]              |
|     NVDA Intelligence                              |
+------------+---------------------------------------+
|            |                                       |
| HISTORY    |  CONVERSATION                         |
|            |                                       |
| ● NVDA     |  [User message bubble]                |
|   Preview..|                                       |
|            |  [AI response]                        |
| ● AAPL     |                                       |
|   Preview..|  [User message bubble]                |
|            |                                       |
| ● TSLA     |                                       |
|   Preview..|                                       |
|            |                                       |
+------------+---------------------------------------+
|            | [Ask about NVDA...         ] [Send]   |
+----------------------------------------------------+

History closed: ~480px wide
History open: ~680px wide (480 + 200)
```

## Animation Details
- History sidebar slides in from left with spring animation
- Panel width expands smoothly (300ms duration)
- Matches existing Framer Motion patterns in the codebase

