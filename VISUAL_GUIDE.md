# Visual Guide: Confirmation UI

## Message Types

### 1. Regular AI Message (Before)
```
┌─────────────────────────────────────────┐
│ 🤖 Bot (Purple gradient icon)          │
│                                         │
│  ┌────────────────────────────────────┐│
│  │ Tell me about your role at         ││
│  │ Company A. What were your main     ││
│  │ responsibilities?                   ││
│  └────────────────────────────────────┘│
│  White background, gray border         │
└─────────────────────────────────────────┘
```

### 2. Confirmation Message (NEW!)
```
┌─────────────────────────────────────────┐
│ 🤖 Bot (Purple gradient icon)          │
│                                         │
│  ┌────────────────────────────────────┐│
│  │ 📋 PLEASE CONFIRM                  ││
│  │                                     ││
│  │ Here's what I have so far:         ││
│  │ 1. Company A (2018-2020)           ││
│  │ 2. Company B (2020-2023)           ││
│  │                                     ││
│  │ Is this complete? Would you like   ││
│  │ to add anything before we dive     ││
│  │ into details?                       ││
│  └────────────────────────────────────┘│
│  Amber background, amber border (2px)  │
└─────────────────────────────────────────┘
```

### 3. User Message
```
┌─────────────────────────────────────────┐
│                          👤 User (Gray) │
│                                         │
│  ┌────────────────────────────────────┐│
│  │ Company A (2018-2020),             ││
│  │ Company B (2020-2023)              ││
│  └────────────────────────────────────┘│
│  Dark background, white text           │
└─────────────────────────────────────────┘
```

### 4. Hint Message
```
┌─────────────────────────────────────────┐
│ 🤖 Bot (Purple gradient icon)          │
│                                         │
│  ┌────────────────────────────────────┐│
│  │ ❓ HINT                            ││
│  │                                     ││
│  │ For example: "Led a team of 5      ││
│  │ engineers to build a scalable       ││
│  │ microservices platform"             ││
│  └────────────────────────────────────┘│
│  White background, gray border         │
└─────────────────────────────────────────┘
```

## Color Scheme

### Regular Messages
- **Background:** `bg-white` (#FFFFFF)
- **Border:** `border-slate-200/60` (Light gray, 60% opacity)
- **Text:** `text-slate-700` (Dark gray)
- **Icon:** Purple to violet gradient

### Confirmation Messages ✨
- **Background:** `bg-amber-50` (Very light orange/amber)
- **Border:** `border-amber-300` (Medium amber, 2px thick)
- **Text:** `text-slate-700` (Dark gray)
- **Label:** `text-amber-600` (Amber)
- **Icon:** `ClipboardCheck` (Lucide)

### User Messages
- **Background:** `bg-slate-900` (Very dark gray)
- **Text:** `text-white` (White)
- **Icon:** `User` in gray circle

## Conversation Flow Example

```
┌─────────────────────────────────────────────────────────┐
│ JNJGO Agent    [Imported] [Save Draft] [Generate]       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 🤖 What's your most recent company and when did you    │
│    work there?                                           │
│                                                          │
│                               Company B, 2020-2023 👤    │
│                                                          │
│ 🤖 Got it! And before Company B?                        │
│                                                          │
│                               Company A, 2018-2020 👤    │
│                                                          │
│ 🤖 Nice! Any position before that?                      │
│                                                          │
│                                        No, that's all 👤 │
│                                                          │
│ 🤖 ┌──────────────────────────────────────────────┐    │
│    │ 📋 PLEASE CONFIRM                            │    │
│    │                                               │    │
│    │ Perfect! Here's what I have:                 │    │
│    │ 1. Company A (2018-2020)                     │    │
│    │ 2. Company B (2020-2023)                     │    │
│    │                                               │    │
│    │ Does this look right? Anything missing?      │    │
│    └──────────────────────────────────────────────┘    │
│    [Amber background - stands out!]                     │
│                                                          │
│                           Actually, add Company C too! 👤│
│                                                          │
│ 🤖 ┌──────────────────────────────────────────────┐    │
│    │ 📋 PLEASE CONFIRM                            │    │
│    │                                               │    │
│    │ Updated list:                                │    │
│    │ 1. Company A (2018-2020)                     │    │
│    │ 2. Company B (2020-2023)                     │    │
│    │ 3. Company C (2023-Present)                  │    │
│    │                                               │    │
│    │ Ready to proceed with details?               │    │
│    └──────────────────────────────────────────────┘    │
│                                                          │
│                                                  Yes! 👤 │
│                                                          │
│ 🤖 Great! Let's dive into Company A. What was your     │
│    role there?                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Implementation Details

### CSS Classes for Confirmation
```tsx
className={`
  max-w-[85%] md:max-w-[75%] 
  rounded-2xl 
  px-6 py-4 
  text-sm leading-relaxed 
  shadow-sm 
  relative group 
  whitespace-pre-wrap 
  ${msg.phase === 'confirmation' 
    ? 'bg-amber-50 text-slate-700 border-2 border-amber-300 rounded-bl-none'
    : 'bg-white text-slate-700 border border-slate-200/60 rounded-bl-none'
  }
`}
```

### Label Component
```tsx
{msg.phase === 'confirmation' && (
  <div className="flex items-center gap-1.5 mb-2 text-amber-600 font-bold text-xs uppercase">
    <ClipboardCheck className="w-3 h-3" /> Please Confirm
  </div>
)}
```

## Responsive Design

### Mobile (< 768px)
- Messages: `max-w-[85%]`
- Font size: `text-sm`
- Icon size: `w-3 h-3` for labels
- Padding: `px-6 py-4`

### Desktop (>= 768px)
- Messages: `max-w-[75%]`
- All other styles remain the same

## Accessibility

- ✅ High contrast between text and background
- ✅ Clear visual distinction between message types
- ✅ Icon + text label for confirmation (not icon-only)
- ✅ Sufficient padding for touch targets
- ✅ Readable font sizes (14px base)

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

Tailwind CSS ensures broad compatibility.
