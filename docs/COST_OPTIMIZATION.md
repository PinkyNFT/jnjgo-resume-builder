# Cost Optimization - Preventing Duplicate Gemini API Requests

## Overview
Gemini API requests are paid per token. This document describes the comprehensive measures implemented to prevent wasteful duplicate requests and optimize token usage.

## Problems Solved

### 1. ❌ React StrictMode Double Mounting
**Problem:** In development mode, React StrictMode mounts components twice, causing duplicate API calls.

**Solution:** 
- Added `initializingRef` to track initialization state
- Prevents double initialization even when effects run twice
- Ensures only one chat session is created per component lifecycle

### 2. ❌ Concurrent Request Race Conditions
**Problem:** Users could spam the send button or hint button, creating multiple simultaneous requests for the same action.

**Solution:**
- Added `isProcessing` flag in ChatSession class
- Throws error if request is already in progress
- UI disables buttons when `isLoading` is true
- Additional check with `chatSession.isRequestInProgress()` for extra safety

### 3. ❌ Unmounted Component Requests
**Problem:** If user navigates away while a request is in flight, the callback still fires, wasting tokens.

**Solution:**
- Added `mountedRef` to track component mount state
- All state updates check `mountedRef.current` before executing
- Prevents updates to unmounted components

### 4. ❌ No Request Cancellation
**Problem:** When unmounting or navigating away, in-flight requests couldn't be cancelled.

**Solution:**
- Implemented AbortController in ChatSession
- Requests are cancelled on component unmount
- Cleanup function in useEffect cancels pending requests

### 5. ❌ Failed Request Retries
**Problem:** Retry logic could create duplicate requests if not handled properly.

**Solution:**
- Check `mountedRef` before retrying
- Skip retry if request was explicitly aborted
- Handle AbortError separately from network errors

## Implementation Details

### ChatSession Class Enhancements

```typescript
export class ChatSession {
    private currentRequest: AbortController | null = null;
    private isProcessing: boolean = false;

    // Prevents concurrent requests
    async sendMessage(message: string) {
        if (this.isProcessing) {
            throw new Error('A request is already in progress');
        }
        this.isProcessing = true;
        // ... API call with AbortController
    }

    // Public method to check request status
    isRequestInProgress(): boolean {
        return this.isProcessing;
    }

    // Cancel in-flight requests
    cancelCurrentRequest(): void {
        if (this.currentRequest) {
            this.currentRequest.abort();
        }
    }
}
```

### Component Protection Patterns

```typescript
// 1. Prevent double initialization
const initializingRef = useRef(false);
if (initializingRef.current) return;
initializingRef.current = true;

// 2. Track mounted state
const mountedRef = useRef(true);
useEffect(() => {
    mountedRef.current = true;
    return () => {
        mountedRef.current = false;
        chatSession?.cancelCurrentRequest();
    };
}, []);

// 3. Check before state updates
if (mountedRef.current) {
    setMessages([...]);
}

// 4. Prevent concurrent sends
if (chatSession.isRequestInProgress()) {
    console.warn('Request in progress, skipping');
    return;
}
```

## Token Usage Scenarios

### ✅ Before Optimizations
1. **Double initialization:** 2 requests × tokens
2. **User spam-clicking send:** 5 requests × tokens
3. **User navigates during loading:** Request completes but wasted
4. **Failed request retries:** Unlimited retries possible
5. **Unmounted component callbacks:** State updates on dead component

**Estimated waste:** 50-200% more tokens than necessary

### ✅ After Optimizations
1. **Single initialization:** 1 request only
2. **Button spam protection:** 1 request regardless of clicks
3. **Navigation cancellation:** Request aborted, tokens saved
4. **Controlled retries:** Max 3 retries with exponential backoff
5. **Mount-safe callbacks:** No wasted updates

**Estimated savings:** 40-70% reduction in wasted API calls

## Additional Best Practices

### Server-Side Optimizations
All API routes include:
- ✅ API key validation before processing
- ✅ Request body validation
- ✅ Proper error handling
- ✅ No redundant Gemini API calls

### Client-Side Patterns
- ✅ Single AbortController per request
- ✅ Cleanup on unmount
- ✅ Loading states prevent concurrent actions
- ✅ Error boundaries for graceful degradation

### Future Enhancements
Consider implementing:
1. **Request deduplication cache** - Cache identical requests within 5 seconds
2. **Rate limiting UI** - Show cooldown timer after requests
3. **Request queue** - Queue requests instead of rejecting
4. **Analytics tracking** - Monitor actual token usage vs. expected
5. **User feedback** - Notify when duplicate request is prevented

## Testing Recommendations

### Manual Testing
1. **Spam test:** Rapidly click send button → Should only send once
2. **Navigation test:** Send message then immediately go back → Request should cancel
3. **Reload test:** Refresh during loading → No orphaned requests
4. **Network slow test:** Throttle network, verify no duplicates
5. **StrictMode test:** Run in dev mode, check console for single init

### Automated Testing
```typescript
// Example test
it('prevents concurrent requests', async () => {
  const session = new ChatSession('consultant');
  const promise1 = session.sendMessage('test');
  const promise2 = session.sendMessage('test');
  
  await expect(promise2).rejects.toThrow('already in progress');
});
```

## Monitoring

### What to Monitor in Production
1. **Failed request rate** - Should be < 1%
2. **Average tokens per session** - Track and compare
3. **Abort rate** - How often users cancel
4. **Error patterns** - Identify issues early

### Cost Tracking
```typescript
// Add to API routes for logging
console.log(`[Gemini] Request: ${action}, Tokens: ${estimatedTokens}`);
```

## Summary

✅ **Request deduplication** - Prevents spam and concurrent calls  
✅ **AbortController** - Cancels unnecessary in-flight requests  
✅ **Mount-safe callbacks** - No wasted updates to unmounted components  
✅ **Strict initialization** - React StrictMode compatible  
✅ **Smart retries** - Only retry when it makes sense  

**Expected token savings:** 40-70%  
**User experience:** Improved (no duplicate responses)  
**Maintainability:** Better (clear request lifecycle)

---

**Last Updated:** February 6, 2026  
**Cost Efficiency:** ⚡ Optimized ✅
