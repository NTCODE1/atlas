import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, Plus, X } from 'lucide-react'
import { useSettings } from '../settingsContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useTodaySnapshot } from '../hooks/useTodaySnapshot'
import {
  sendAssistantTurn,
  type ChatMessage,
  type AssistantTurn,
  type ToolUseBlock,
  type ToolResultBlock,
  type TextBlock,
} from '../api/assistantAI'
import { asProposedTargets, asCalendarEvents, asHydrationLitres, asLogMeal } from '../api/assistantTools'
import type { ParsedEvent } from '../api/calendarAI'
import { addJournalEntries, newJournalId } from '../hooks/useJournalMonth'
import { useNutritionTargets, useGoalHistory } from '../nutritionTargets'
import { useHydrationGoal } from '../hooks/useHydration'
import { useMeals } from '../hooks/useMeals'
import { ENTRY_TAGS } from '../data'
import { todayISO } from '../workouts'
import Orb from '../components/assistant/Orb'
import CalendarConfirmSheet from '../components/journal/CalendarConfirmSheet'
import TargetsProposalCard from '../components/assistant/TargetsProposalCard'
import HydrationGoalProposalCard from '../components/assistant/HydrationGoalProposalCard'
import MealProposalCard from '../components/assistant/MealProposalCard'

interface AssistantProps {
  onClose: () => void
}

/** Shown when the AI call fails (unset config, network, upstream). */
const FALLBACK_REPLY =
  "I couldn't reach the assistant just now. Please check your connection and try again."

/** One assistant turn's tool_use calls awaiting confirmation, resolved one at a time. */
interface ToolQueue {
  /** The running Anthropic-format conversation, including this assistant turn. */
  turns: AssistantTurn[]
  /** Remaining tool calls from this turn, in order — calls[0] is the active one. */
  calls: ToolUseBlock[]
  /** tool_result blocks accumulated so far for this turn. */
  results: ToolResultBlock[]
}

/**
 * Full-screen assistant overlay. An empty state centres a glowing orb and a
 * greeting; on the first message it becomes a chat thread. The floating pill
 * input stays fixed at the bottom in both states.
 *
 * Actions (targets, calendar, hydration, meal logging) are real Claude tool
 * calls — the model decides when to call one (and may call several in one
 * turn to chain a request like "log this meal and remind me at 6"). Each call
 * still requires an explicit user confirmation before anything is saved; once
 * every call in a turn is resolved, its tool_result is sent back so Claude can
 * continue or finish with a text reply.
 */
export default function Assistant({ onClose }: AssistantProps) {
  const { settings } = useSettings()
  const snapshot = useTodaySnapshot()
  const { setTargets } = useNutritionTargets()
  const [, setGoalHistory] = useGoalHistory()
  const { setGoalLitres } = useHydrationGoal()
  const { addMeal } = useMeals()
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('atlas.assistant.messages', [])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [queue, setQueue] = useState<ToolQueue | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeCall = queue?.calls[0] ?? null

  const addAssistantMessage = (text: string) =>
    setMessages((prev) => [...prev, { role: 'assistant', text }])

  // Voice dictation (Web Speech API): text already typed before the mic is
  // pressed is kept as a base; the live transcript is appended to it.
  const dictationBase = useRef('')
  const speech = useSpeechRecognition((transcript) => {
    setDraft(dictationBase.current ? `${dictationBase.current} ${transcript}` : transcript)
  })

  const hasThread = messages.length > 0

  // Keep the newest message in view as the thread grows / while thinking.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending, queue])

  // Close on Escape, like the other overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Defensive: if a tool call's arguments don't validate (malformed model
  // output), skip it with an error tool_result instead of rendering a broken
  // confirm card.
  useEffect(() => {
    if (!activeCall) return
    const valid =
      (activeCall.name === 'set_nutrition_targets' && asProposedTargets(activeCall.input) !== null) ||
      (activeCall.name === 'add_calendar_events' && asCalendarEvents(activeCall.input) !== null) ||
      (activeCall.name === 'set_hydration_goal' && asHydrationLitres(activeCall.input) !== null) ||
      (activeCall.name === 'log_meal' && asLogMeal(activeCall.input) !== null)
    if (!valid) resolveCall('Invalid or missing arguments for this tool call.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.id])

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop()
      return
    }
    dictationBase.current = draft.trim()
    speech.start()
  }

  /** Send the running conversation to the assistant and handle its reply — either
   *  final text, or a tool-calling turn that opens the confirm queue. */
  const driveLoop = async (turns: AssistantTurn[]) => {
    setPending(true)
    const result = await sendAssistantTurn(turns, snapshot)

    if (!result) {
      addAssistantMessage(FALLBACK_REPLY)
      setPending(false)
      return
    }
    if (result.done) {
      addAssistantMessage(result.reply)
      setPending(false)
      return
    }

    const nextTurns: AssistantTurn[] = [...turns, { role: 'assistant', content: result.content }]
    const textBlocks = result.content.filter((b): b is TextBlock => b.type === 'text')
    if (textBlocks.length > 0) {
      addAssistantMessage(textBlocks.map((b) => b.text).join('\n\n'))
    }

    const toolUses = result.content.filter((b): b is ToolUseBlock => b.type === 'tool_use')
    if (toolUses.length === 0) {
      addAssistantMessage(FALLBACK_REPLY)
      setPending(false)
      return
    }
    setQueue({ turns: nextTurns, calls: toolUses, results: [] })
    setPending(false)
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || pending) return
    if (speech.listening) speech.stop()
    // Talking past an unresolved tool confirmation abandons it — no partial state left behind.
    if (queue) setQueue(null)

    setMessages((prev) => [...prev, { role: 'user', text }])
    setDraft('')

    const turns: AssistantTurn[] = [
      ...messages.map((m): AssistantTurn => ({ role: m.role, content: m.text })),
      { role: 'user', content: text },
    ]
    await driveLoop(turns)
  }

  /** Resolve the active tool call (calls[0]) and either move to the next one in
   *  this turn, or — once all are resolved — continue the conversation. */
  const resolveCall = (resultText: string, userFacingMessage?: string) => {
    if (!queue) return
    if (userFacingMessage) addAssistantMessage(userFacingMessage)
    const [current, ...rest] = queue.calls
    const results: ToolResultBlock[] = [
      ...queue.results,
      { type: 'tool_result', tool_use_id: current.id, content: resultText },
    ]
    if (rest.length > 0) {
      setQueue({ ...queue, calls: rest, results })
    } else {
      const turns: AssistantTurn[] = [...queue.turns, { role: 'user', content: results }]
      setQueue(null)
      void driveLoop(turns)
    }
  }

  const saveTargetsCall = () => {
    const targets = asProposedTargets(activeCall?.input)
    if (!targets) return
    setTargets({
      kcal: targets.calorieTarget,
      protein: targets.protein,
      carbs: targets.carbs,
      fat: targets.fat,
    })
    setGoalHistory((prev) => [
      ...prev,
      {
        id: newJournalId(),
        date: todayISO(),
        goal: targets.goalLabel,
        kcal: targets.calorieTarget,
        protein: targets.protein,
        carbs: targets.carbs,
        fat: targets.fat,
        reasoning: targets.reasoning,
      },
    ])
    resolveCall(
      `Targets saved: ${targets.calorieTarget} kcal, ${targets.protein}P/${targets.carbs}C/${targets.fat}F.`,
      `✅ Targets updated to ${targets.calorieTarget.toLocaleString()} kcal · ${targets.protein}P / ${targets.carbs}C / ${targets.fat}F. You'll see them on the Nutrition screen.`,
    )
  }
  const cancelTargetsCall = () =>
    resolveCall('User declined saving these targets.', 'Okay, kept your current targets.')

  const saveEventsCall = (events: ParsedEvent[]) => {
    addJournalEntries(
      events.map((e) => ({
        date: e.date,
        entry: {
          id: newJournalId(),
          text: e.title,
          time: e.time,
          tag: ENTRY_TAGS[0],
          kind: e.type,
          ...(e.type === 'task' ? { done: false } : {}),
          important: false,
        },
      })),
    )
    resolveCall(
      `Added ${events.length} item(s) to the calendar.`,
      `✅ Added ${events.length} item${events.length > 1 ? 's' : ''} to your calendar.`,
    )
  }
  const cancelEventsCall = () =>
    resolveCall('User declined adding these calendar items.', 'Okay, nothing added.')

  const saveHydrationCall = () => {
    const litres = asHydrationLitres(activeCall?.input)
    if (litres == null) return
    setGoalLitres(litres)
    resolveCall(
      `Water goal set to ${litres} L/day.`,
      `Water goal set to ${litres} L per day. You'll see it on the Home and Nutrition screens.`,
    )
  }
  const cancelHydrationCall = () =>
    resolveCall('User declined this water goal change.', 'Okay, kept your current water goal.')

  const saveMealCall = () => {
    const meal = asLogMeal(activeCall?.input)
    if (!meal) return
    addMeal(meal.mealType, meal.name, {
      kcal: meal.kcal,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    })
    resolveCall(
      `Logged meal "${meal.name}" (${meal.kcal} kcal).`,
      `✅ Logged ${meal.name} — ${meal.kcal} kcal, ${meal.protein}P / ${meal.carbs}C / ${meal.fat}F.`,
    )
  }
  const cancelMealCall = () => resolveCall('User declined logging this meal.', "Okay, didn't log that.")

  const onInputKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  // Inline proposal cards render in the thread; add_calendar_events opens a
  // full sheet instead (see below), matching CalendarConfirmSheet elsewhere.
  const targetsProposal = activeCall?.name === 'set_nutrition_targets' ? asProposedTargets(activeCall.input) : null
  const hydrationProposal = activeCall?.name === 'set_hydration_goal' ? asHydrationLitres(activeCall.input) : null
  const mealProposal = activeCall?.name === 'log_meal' ? asLogMeal(activeCall.input) : null
  const calendarProposal = activeCall?.name === 'add_calendar_events' ? asCalendarEvents(activeCall.input) : null

  return (
    <div
      className="screen-enter absolute inset-0 z-50 flex flex-col"
      style={{
        background:
          'radial-gradient(circle at 50% 42%, #000000 0%, #050505 42%, #131313 64%, #333333 80%, #6f6f6f 91%, #ffffff 100%)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Top bar: close, and a new-chat reset once a thread exists. */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="press grid h-10 w-10 place-items-center rounded-full text-white/70 hover:text-white"
        >
          <X size={22} strokeWidth={2} />
        </button>
        {hasThread && (
          <button
            type="button"
            onClick={() => {
              setMessages([])
              setDraft('')
              setQueue(null)
            }}
            aria-label="New chat"
            className="press flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:text-white"
          >
            <Plus size={15} strokeWidth={2} />
            New chat
          </button>
        )}
      </div>

      {hasThread ? (
        /* Chat thread */
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <div className="mx-auto flex max-w-[560px] flex-col gap-3 py-2">
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {pending && <ThinkingBubble />}
            {targetsProposal && (
              <TargetsProposalCard
                targets={targetsProposal}
                onSave={saveTargetsCall}
                onCancel={cancelTargetsCall}
              />
            )}
            {hydrationProposal != null && (
              <HydrationGoalProposalCard
                litres={hydrationProposal}
                onSave={saveHydrationCall}
                onCancel={cancelHydrationCall}
              />
            )}
            {mealProposal && (
              <MealProposalCard meal={mealProposal} onSave={saveMealCall} onCancel={cancelMealCall} />
            )}
          </div>
        </div>
      ) : (
        /* Empty state: orb + greeting */
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <Orb size={196} thinking={pending} />
          <p className="mt-10 text-lg text-white/45">Hello {settings.name}</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-white">
            How can I help
            <br />
            you today?
          </h1>
        </div>
      )}

      {/* Floating pill input */}
      <div
        className="px-4 pt-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div
          className="mx-auto flex max-w-[560px] items-end gap-2 rounded-[26px] border border-white/15 px-4 py-2.5 backdrop-blur-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onInputKey}
            rows={1}
            placeholder="Ask anything..."
            aria-label="Message the assistant"
            className="max-h-32 flex-1 resize-none self-center bg-transparent py-1.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
          />
          {speech.listening ? (
            // Recording: tap to stop. Pulsing red so it's clearly live.
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Stop voice input"
              className="press grid h-9 w-9 shrink-0 animate-pulse place-items-center rounded-full bg-red-500 text-white"
            >
              <Mic size={20} strokeWidth={2} />
            </button>
          ) : draft.trim() ? (
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending}
              aria-label="Send message"
              className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#0a0e1a] disabled:opacity-50"
            >
              <ArrowUp size={20} strokeWidth={2.5} />
            </button>
          ) : speech.supported ? (
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Start voice input"
              className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 hover:text-white"
            >
              <Mic size={20} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>

      {calendarProposal && (
        <CalendarConfirmSheet
          events={calendarProposal}
          onConfirm={saveEventsCall}
          onClose={cancelEventsCall}
        />
      )}
    </div>
  )
}

/** A single chat turn — user bubbles right & white, assistant left & glassy. */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`message-in max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-white text-[#0a0e1a]'
            : 'rounded-bl-md border border-white/10 bg-white/[0.07] text-white/90'
        }`}
      >
        {message.text}
      </div>
    </div>
  )
}

/** Animated "…" placeholder shown while the assistant composes a reply. */
function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="message-in flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="orb-breathe h-1.5 w-1.5 rounded-full bg-white/60"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}
