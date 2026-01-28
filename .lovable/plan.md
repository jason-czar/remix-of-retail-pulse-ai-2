

# Ask DeriveStreet - Conversational Intelligence Panel

## Summary

Add a conversational intelligence assistant to symbol pages that allows users to ask questions grounded exclusively in DeriveStreet's intelligence data. This is a **decision-support system**, not a general chatbot.

## Key Refinements from Review

Based on the feedback, this implementation incorporates:

1. **Naming convention**: Internal components use "Conversation" terminology, not "Chat" (e.g., `ConversationMessage`, `ConversationPanel`)
2. **Signal citation habit**: AI responses explicitly reference signal sources ("Based on dominant narratives...", "Psychology signals indicate...")
3. **Per-symbol persistence**: Conversations persist locally per symbol, reset when switching symbols
4. **Expanded trigger language**: On-demand data fetches include implicit requests like "What are people saying?" not just "show examples"
5. **Staleness guardrail**: Context includes timestamp checks; stale data (>24h) is flagged in responses

---

## UX Flow

### Phase 1: Bottom Input Bar (Collapsed State)
- Centered floating bar at bottom of symbol page
- Placeholder rotates through starter prompts
- Sends message transitions to panel state

### Phase 2: Right Panel (Active Conversation)
- Slides in from right, same position as MessagesSidebar
- MessagesSidebar and Ask panel are mutually exclusive
- Input moves to bottom of panel
- Conversation persists in localStorage per symbol

```text
Initial State:
┌─────────────────────────────────────────────────────────────┐
│                     Symbol Page                             │
│                                                             │
│              [Charts, Intelligence, Cards]                  │
│                                                             │
│     ┌─────────────────────────────────────────────┐         │
│     │  Ask about NVDA...                    [→]   │         │
│     └─────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘

Active Conversation:
┌───────────────────────────────────────────┬─────────────────┐
│             Symbol Page                   │   Ask Panel     │
│                                           │  ┌───────────┐  │
│        [Content shifts left]              │  │ User: ... │  │
│                                           │  │ AI: ...   │  │
│                                           │  ├───────────┤  │
│                                           │  │ [Input  ] │  │
│                                           │  └───────────┘  │
└───────────────────────────────────────────┴─────────────────┘
```

---

## Components to Create

| File | Purpose |
|------|---------|
| `src/contexts/AskDeriveStreetContext.tsx` | Manages panel open/close, conversation state per symbol, streaming status |
| `src/components/ask/AskDeriveStreetBar.tsx` | Bottom floating input bar with rotating placeholders |
| `src/components/ask/AskDeriveStreetPanel.tsx` | Right-side conversation panel with header, messages, input |
| `src/components/ask/ConversationMessage.tsx` | User and assistant message bubbles with markdown support |
| `src/components/ask/StarterPrompts.tsx` | Clickable example prompt chips for empty state |
| `src/components/ask/TypingIndicator.tsx` | Animated indicator during AI streaming |
| `src/hooks/use-ask-derive-street.ts` | Conversation logic, streaming handler, context building |
| `supabase/functions/ask-derive-street/index.ts` | Edge function with SSE streaming |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/SymbolPage.tsx` | Wrap in AskDeriveStreetProvider, add bar and panel components |
| `src/components/layout/SidebarLayout.tsx` | Coordinate Ask panel with MessagesSidebar (mutually exclusive) |
| `src/contexts/MessagesSidebarContext.tsx` | Add method to close sidebar when Ask panel opens |
| `supabase/config.toml` | Register new edge function |
| `package.json` | Add `react-markdown` and `remark-gfm` dependencies |

---

## Context Strategy (Lightweight and Fast)

The edge function builds context from existing data without loading raw messages:

### Always Included
- Latest lens summary for active lens
- Psychology snapshot summary (`one_liner`, `primary_risk`, `dominant_emotion`)
- Top 3 narratives with sentiment, confidence, and prevalence
- Top 3 emotions with intensity and momentum direction
- Data freshness timestamp

### Included When Available
- Decision readiness scores for current lens
- Narrative coherence score
- Active signals (capitulation, euphoria risk, etc.)

### Fetched On Demand (implicit triggers)
User questions containing phrases like:
- "What are people actually saying?"
- "Why do bulls believe this?"
- "Show me examples"
- "What's driving the optimism?"

Triggers fetch of 3-5 representative messages per top narrative.

### Staleness Check
If latest psychology snapshot is >24 hours old, the assistant explicitly notes: "Note: Intelligence data is from [timestamp]. Current sentiment may have shifted."

---

## System Prompt

```text
You are DeriveStreet's Stock Intelligence Assistant for {SYMBOL}.

Your role is to answer questions using ONLY DeriveStreet's intelligence data.
You are NOT a general market assistant. Do NOT use external knowledge.

GROUNDING SOURCES (always cite these):
- "Based on dominant narratives..." (from narrative analysis)
- "Psychology signals indicate..." (from psychology snapshots)
- "Message volume suggests..." (from activity data)
- "The {lens} lens shows..." (from decision lens summaries)

RESPONSE STYLE:
- Clear, analytical, institutional
- No hype, emojis, or trading recommendations
- Acknowledge uncertainty when signals are mixed
- Use phrasing like "Retail sentiment currently suggests..." or 
  "A minority but growing cohort believes..."

CONFIDENCE SIGNALING:
When appropriate, state confidence qualitatively:
- "High confidence: Strong signal alignment across narratives"
- "Moderate confidence: Mixed signals require validation"
- "Limited data: Sparse discussion on this topic"

If a question cannot be answered using DeriveStreet data:
- State explicitly what is missing
- Do NOT speculate beyond the platform's scope

DATA FRESHNESS:
Current context timestamp: {TIMESTAMP}
If data is stale (>24h), note this in your response.

PRIMARY GOAL:
Help users understand how retail investors are thinking, feeling, 
and positioning - and what that implies for risk and decision-making.
```

---

## Technical Details

### Streaming Implementation
The edge function streams responses using Server-Sent Events (SSE):

```typescript
// Edge function returns streaming response
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    // Stream tokens as SSE events
    for await (const chunk of aiStream) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  },
});

return new Response(stream, {
  headers: {
    ...corsHeaders,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  },
});
```

Frontend parses SSE and updates message incrementally:

```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const data = JSON.parse(line.slice(6));
      // Append to current message content
      updateStreamingMessage(data.choices?.[0]?.delta?.content || '');
    }
  }
}
```

### LocalStorage Persistence
Conversations are stored per symbol:

```typescript
const STORAGE_KEY = 'derivestreet:conversations';

// Structure: { [symbol]: ConversationMessage[] }
const getConversation = (symbol: string) => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const all = stored ? JSON.parse(stored) : {};
  return all[symbol] || [];
};

const saveConversation = (symbol: string, messages: ConversationMessage[]) => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const all = stored ? JSON.parse(stored) : {};
  all[symbol] = messages.slice(-50); // Keep last 50 messages per symbol
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};
```

### Panel Coordination
When Ask panel opens, Messages sidebar closes:

```typescript
// In AskDeriveStreetContext
const openPanel = useCallback(() => {
  messagesSidebar.setIsOpen(false); // Close messages sidebar
  setIsOpen(true);
}, [messagesSidebar]);
```

---

## Styling

### Bottom Input Bar
```typescript
// Fixed, centered, Liquid Glass styling
<motion.div
  className={cn(
    "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
    "w-full max-w-xl mx-4",
    "rounded-2xl",
    "bg-white/92 dark:bg-[hsl(0_0%_12%/0.55)]",
    "backdrop-blur-[28px] backdrop-saturate-[160%]",
    "border border-black/[0.08] dark:border-white/[0.1]",
    "shadow-lg"
  )}
>
  <Input placeholder="Ask about NVDA..." />
</motion.div>
```

### Conversation Panel
Reuses exact styling from MessagesSidebar for consistency:
- Same glass material, border, shadow
- Same animation (slide from right)
- Same resize behavior (320-480px range)

### Message Bubbles
- User: Right-aligned, subtle primary background
- Assistant: Left-aligned with DeriveStreet icon, rendered with react-markdown

---

## Starter Prompts

Displayed when conversation is empty:

```typescript
const starterPrompts = [
  "Why is {SYMBOL} consolidating here?",
  "What could cause a breakout?",
  "What risks are retail ignoring?",
  "What changed today?",
  "How do retail traders feel about earnings?",
  "Is there activist involvement?",
];
```

---

## Mobile Behavior

On mobile devices (`isMobile` hook):
- Bottom bar renders above footer with safe area padding
- Panel opens as full-screen modal overlay (not side panel)
- Swipe down or X button to dismiss
- Virtual keyboard pushes input up appropriately

---

## Error Handling

| Error | User Message | Action |
|-------|--------------|--------|
| 429 Rate Limit | "Rate limit reached. Try again in a moment." | Show retry button |
| 402 Credits | "AI credits exhausted." | Toast notification |
| Network Error | "Connection lost. Retrying..." | Auto-retry with backoff |
| Empty Response | "I couldn't generate a response. Try rephrasing." | Show in chat |

---

## Implementation Order

1. Create context provider with types and state management
2. Create edge function with SSE streaming (no UI)
3. Test edge function via curl/tool
4. Build conversation panel UI (mock data first)
5. Integrate streaming into panel
6. Build bottom input bar with transitions
7. Add react-markdown rendering
8. Implement localStorage persistence
9. Coordinate with MessagesSidebar
10. Add mobile full-screen variant
11. Polish animations and interactions

---

## Dependencies

New packages to install:
- `react-markdown` - Render AI responses with formatting
- `remark-gfm` - GitHub Flavored Markdown support (tables, strikethrough)

---

## Success Metrics

This feature succeeds when:
- Responses clearly cite DeriveStreet signals
- Users understand WHERE insights come from
- No hallucination of external market data
- Smooth streaming feels responsive
- Panel coexists naturally with existing layout

