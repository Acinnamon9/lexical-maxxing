---
description: AI agent debugging and optimization workflows
---

# AI Agent Debugging Workflow

Guide for debugging and optimizing the dual-mode AI agent system in Lexical Maxxing.

## Overview

The AI system consists of two agents (Architect & Scholar) powered by Google Gemini 2.0. This workflow helps debug issues, optimize prompts, and improve agent performance.

---

## Common Issues

### Issue: Agent Not Responding

**Symptoms**:
- AI Widget shows loading spinner indefinitely
- No response after sending message
- Network errors in console

**Debugging Steps**:

1. **Check API Key**:
   ```bash
   # Verify .env.local has the key
   cat .env.local | grep GEMINI_API_KEY
   ```

   Should show:
   ```
   GEMINI_API_KEY=AIza...
   ```

2. **Test API Key Directly**:
   ```javascript
   // In browser console
   const apiKey = 'YOUR_KEY_HERE';
   const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       contents: [{ parts: [{ text: 'Hello' }] }]
     })
   });
   console.log(await response.json());
   ```

3. **Check Network Tab**:
   - Open DevTools → Network
   - Filter by "generativelanguage"
   - Look for failed requests
   - Check status codes (429 = rate limit, 403 = invalid key)

4. **Verify Environment Variables Loaded**:
   ```javascript
   // In a server component or API route
   console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
   ```

**Solutions**:
- Invalid key → Generate new key at [Google AI Studio](https://aistudio.google.com/apikey)
- Rate limited → Wait or upgrade API tier
- Network error → Check firewall/proxy settings

---

### Issue: Architect Using Wrong Tools

**Symptoms**:
- Architect tries to explain concepts (Scholar's job)
- Tool calls fail with validation errors
- Wrong parameters passed to tools

**Debugging Steps**:

1. **Check System Prompt**:
   - Open `lib/ai/prompts.ts`
   - Verify `ARCHITECT_PROMPT` clearly defines restrictions
   - Ensure it says "NEVER explain definitions"

2. **Inspect Tool Definitions**:
   ```javascript
   // In browser console or API route
   import { TOOL_DEFINITIONS } from '@/lib/ai/prompts';
   console.log(JSON.stringify(TOOL_DEFINITIONS, null, 2));
   ```

   Verify each tool has:
   - Clear `description`
   - Correct `parameters` schema
   - Required fields marked

3. **Log Tool Calls**:
   ```typescript
   // In lib/ai/adapter.ts
   export async function executeToolCall(call: any) {
     console.log('Tool call:', JSON.stringify(call, null, 2));
     // ... rest of function
   }
   ```

4. **Test in Google AI Studio**:
   - Copy system prompt + tool definitions
   - Test with same user query
   - See what tool calls Gemini generates

**Solutions**:
- Unclear prompt → Refine system instructions
- Wrong schema → Fix parameter types/descriptions
- Model hallucinating → Add examples to prompt

---

### Issue: Scholar Modifying Database

**Symptoms**:
- Scholar mode shows tool execution logs
- Database changes when asking questions
- Scholar responses include action confirmations

**Debugging**:

1. **Verify Mode Check**:
   ```typescript
   // In lib/ai/adapter.ts
   async function sendPromptToAgent(prompt: string, mode: "ARCHITECT" | "SCHOLAR") {
     console.log('Current mode:', mode);
     
     const tools = mode === "ARCHITECT" ? TOOL_DEFINITIONS : [];
     console.log('Tools enabled:', tools.length);
     
     // ... rest of function
   }
   ```

2. **Check UI State**:
   ```typescript
   // In components/AIWidget.tsx
   const [mode, setMode] = useState<"ARCHITECT" | "SCHOLAR">("SCHOLAR");
   console.log('Widget mode:', mode);
   ```

3. **Verify Intent Router**:
   - Check if router is correctly identifying Scholar queries
   - Ensure no action keywords leak into Scholar prompts

**Solutions**:
- Mode not passed correctly → Fix function signatures
- Router failure → Improve keyword detection
- UI bug → Ensure mode toggle updates state

---

### Issue: Streaming Response Broken

**Symptoms**:
- Full response appears at once (no streaming)
- Text appears character-by-character (too slow)
- Partial responses cut off

**Debugging**:

1. **Check Streaming Implementation**:
   ```typescript
   // In lib/ai/adapter.ts
   async function* streamResponse(prompt: string, mode: string) {
     console.log('Starting stream...');
     
     for await (const chunk of response.stream) {
       const text = chunk.text();
       console.log('Chunk:', text.length, 'chars');
       yield text;
     }
     
     console.log('Stream complete');
   }
   ```

2. **Test UI Updates**:
   ```typescript
   // In components/AIWidget.tsx
   for await (const chunk of stream) {
     console.log('Received chunk:', chunk);
     setMessages(prev => {
       const updated = [...prev];
       updated[updated.length - 1].text += chunk;
       return updated;
     });
   }
   ```

3. **Check Network**:
   - Look for SSE (Server-Sent Events) in Network tab
   - Verify response is chunked, not a single payload

**Solutions**:
- Not using streaming API → Use `generateContentStream()` instead of `generateContent()`
- UI not updating → Ensure state updates trigger re-renders
- Chunk size too small/large → Adjust buffer size

---

## Prompt Engineering

### Testing Prompt Changes

1. **Edit Prompt**:
   - Modify `lib/ai/prompts.ts`
   - Update `ARCHITECT_PROMPT` or `SCHOLAR_PROMPT`

2. **Save and Reload**:
   - Changes take effect immediately (hot reload)
   - Or restart dev server: `Ctrl+C`, `npm run dev`

3. **Test with Examples**:
   ```
   Architect Tests:
   - "Create a folder called Biology"
   - "Add these 5 words: [list]"
   - "Move folder A to folder B"
   
   Scholar Tests:
   - "What does mitochondria mean?"
   - "Explain the etymology of philosophy"
   - "Give me 3 example sentences for serendipity"
   ```

4. **Measure Quality**:
   - Does it follow instructions?
   - Are tool calls correct?
   - Is the tone appropriate?
   - Any hallucinations?

---

### Prompt Optimization Techniques

#### 1. Few-Shot Examples

Add examples to guide behavior:

```markdown
# ARCHITECT_PROMPT

...

## Examples

User: "Create a Biology folder"
You: [calls CREATE_FOLDER with name="Biology"]

User: "What does DNA mean?"
You: "I'm the Architect. Please switch to Scholar mode for definitions."
```

#### 2. Explicit Constraints

Be very specific about what NOT to do:

```markdown
STRICT RULES:
1. NEVER explain word meanings - that's Scholar's job
2. NEVER make assumptions - ask for clarification
3. NEVER modify database without user request
4. ALWAYS confirm destructive actions
```

#### 3. Structured Output

Request specific formats:

```markdown
When creating folders, respond in this format:

✅ Created folder: [name]
📁 Location: [parent path]
🔢 Total folders: [count]
```

#### 4. Chain-of-Thought

Ask the model to think step-by-step:

```markdown
Before executing tools, explain your reasoning:
1. What is the user asking for?
2. What tools are needed?
3. In what order should they execute?
4. What are potential issues?

Then execute the plan.
```

---

## Performance Optimization

### Reduce Latency

**Problem**: Slow response times

**Solutions**:

1. **Use Lighter Model** (if available):
   ```typescript
   const model = genAI.getGenerativeModel({
     model: "gemini-2.0-flash-exp", // Faster, less accurate
     // vs
     model: "gemini-2.0-pro-exp",   // Slower, more accurate
   });
   ```

2. **Limit Max Tokens**:
   ```typescript
   const config = {
     maxOutputTokens: 512, // Shorter responses
   };
   ```

3. **Stream Responses**:
   - Already implemented
   - Perceived faster (shows partial results)

4. **Cache System Prompts** (future enhancement):
   - Gemini 1.5+ supports prompt caching
   - Reuse system prompt across requests

---

### Reduce Costs

**Problem**: High API usage costs

**Solutions**:

1. **Debounce User Input**:
   ```typescript
   const debouncedSend = useMemo(
     () => debounce(sendMessage, 500),
     []
   );
   ```

2. **Shorter System Prompts**:
   - Be concise but clear
   - Remove redundant instructions

3. **User Confirmation for Expensive Operations**:
   ```typescript
   if (toolCallCount > 5) {
     if (!confirm('This will use multiple tool calls. Continue?')) {
       return;
     }
   }
   ```

4. **Local Fallbacks**:
   - Simple queries (e.g., "list folders") can use local regex
   - Only call AI for complex intents

---

## Testing Agent Behavior

### Unit Tests for Tool Execution

```typescript
// __tests__/ai/tools.test.ts
import { executeToolCall } from '@/lib/ai/adapter';
import { db } from '@/lib/db';

describe('Architect Tools', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('CREATE_FOLDER creates a folder', async () => {
    const result = await executeToolCall({
      type: 'CREATE_FOLDER',
      payload: {
        name: 'Test Folder',
        parentId: null,
        emoji: '📁',
      },
    });

    expect(result.success).toBe(true);
    
    const folders = await db.folders.toArray();
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('Test Folder');
  });
});
```

---

### Integration Tests for Full Flow

```typescript
// __tests__/ai/agent.test.ts
import { sendPromptToAgent } from '@/lib/ai/adapter';

describe('Architect Agent', () => {
  it('creates folder from natural language', async () => {
    const response = await sendPromptToAgent(
      'Create a folder called Biology',
      'ARCHITECT'
    );

    // Verify tool was called
    expect(response.toolCalls).toContainEqual(
      expect.objectContaining({ type: 'CREATE_FOLDER' })
    );

    // Verify folder exists
    const folders = await db.folders.where('name').equals('Biology').toArray();
    expect(folders).toHaveLength(1);
  });
});
```

---

### Manual Testing Checklist

**Architect Mode**:
- [ ] Creates folders correctly
- [ ] Adds single words
- [ ] Bulk adds multiple words
- [ ] Moves folders/words
- [ ] Renames items
- [ ] Deletes items safely
- [ ] Rejects Scholar-type queries
- [ ] Handles errors gracefully

**Scholar Mode**:
- [ ] Provides clear definitions
- [ ] Generates example sentences
- [ ] Explains etymologies
- [ ] Answers conceptual questions
- [ ] Refuses Architect-type requests
- [ ] Formats responses well
- [ ] Cites sources (if applicable)

---

## Monitoring & Logging

### Log AI Requests

```typescript
// lib/ai/adapter.ts
export async function sendPromptToAgent(prompt: string, mode: string) {
  const startTime = Date.now();
  
  console.log('AI Request:', {
    mode,
    promptLength: prompt.length,
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await /* ... */;
    
    console.log('AI Response:', {
      duration: Date.now() - startTime,
      toolCallCount: response.toolCalls?.length || 0,
    });

    return response;
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
}
```

---

### Track Token Usage

```typescript
const result = await model.generateContent(prompt);
console.log('Tokens used:', {
  prompt: result.response.usageMetadata?.promptTokenCount,
  completion: result.response.usageMetadata?.candidatesTokenCount,
  total: result.response.usageMetadata?.totalTokenCount,
});
```

---

### Error Tracking

```typescript
try {
  await sendPromptToAgent(prompt, mode);
} catch (error) {
  // Log to external service (e.g., Sentry)
  logError({
    message: error.message,
    stack: error.stack,
    context: { mode, prompt },
  });
  
  // Show user-friendly error
  showToast('AI request failed. Please try again.');
}
```

---

## Advanced Debugging

### Capture Full Request/Response

```typescript
// lib/ai/adapter.ts
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  // Log full request
  fs.writeFileSync(
    `./logs/request-${Date.now()}.json`,
    JSON.stringify({ prompt, tools, config }, null, 2)
  );

  // Log full response
  fs.writeFileSync(
    `./logs/response-${Date.now()}.json`,
    JSON.stringify(response, null, 2)
  );
}
```

---

### Replay Failed Requests

Save failed requests to reproduce issues:

```typescript
const failedRequest = {
  prompt: "Create a folder called Test",
  mode: "ARCHITECT",
  timestamp: Date.now(),
};

localStorage.setItem('lastFailedRequest', JSON.stringify(failedRequest));

// To replay:
const saved = JSON.parse(localStorage.getItem('lastFailedRequest'));
await sendPromptToAgent(saved.prompt, saved.mode);
```

---

## Related Documentation

- [SSOT_AI_SYSTEM.md](file:///s:/lexical-maxxing/.agent/SSOT_AI_SYSTEM.md) - AI architecture overview
- [lib/ai/adapter.ts](file:///s:/lexical-maxxing/lib/ai/adapter.ts) - Implementation
- [lib/ai/prompts.ts](file:///s:/lexical-maxxing/lib/ai/prompts.ts) - Prompt definitions
- [testing.md](file:///s:/lexical-maxxing/.agent/workflows/testing.md) - General testing guide
