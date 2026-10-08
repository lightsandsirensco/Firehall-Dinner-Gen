import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CycleStrip } from "@/components/schedule/cycle-strip";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import {
  deviceTimeZone,
  formatLocalDay,
  formatShiftTimes,
  localDateInZone,
  timeZoneLabel,
  timeZoneOptions,
} from "@/lib/schedule-format";
import { getShiftsInRange } from "@shared/schedule/engine";
import { getSchedulePreset } from "@shared/schedule/presets";
import { SCHEDULE_LIMITS } from "@shared/schedule/engine";
import type { PersonalSchedule } from "@shared/schedule/types";
import {
  MORE_ROTATION_PRESET_IDS,
  ROTATION_CHOICES,
  blocksFromCustomSteps,
  customPatternProblems,
  customStepsFromBlocks,
  describeCycle,
  formFromSchedule,
  presetsForChoice,
  scheduleFromForm,
  upcomingShifts,
  workBlockOptions,
  type CustomStep,
} from "@shared/schedule/setup";

const SUGGESTED_START_TIME = "07:00";
const DEFAULT_CUSTOM_STEPS: CustomStep[] = [
  { kind: "on", hours: 24 },
  { kind: "off", hours: 48 },
];

interface ScheduleSetupFlowProps {
  initial: PersonalSchedule | null;
  suggestedCrewSize: number;
  saving: boolean;
  error: string | null;
  /** Saved cancel/modify changes to rotation shifts — keyed by start, so a new rotation or start time drops them. */
  hasShiftChanges?: boolean;
  onSave: (schedule: PersonalSchedule) => void;
  onCancel?: () => void;
}

function choiceIdForPreset(presetId: string | null): string {
  if (!presetId) return "custom";
  const choice = ROTATION_CHOICES.find((c) => c.presetIds.includes(presetId));
  return choice?.id ?? "more";
}

function OptionCard({
  selected,
  onSelect,
  title,
  description,
  children,
  testId,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        "w-full rounded-2xl border px-4 py-3 text-left transition-colors touch-manipulation min-h-11",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary/60 bg-primary/10" : "border-border/45 bg-card/35 hover-elevate",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
        </span>
        <span
          className={cn(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
          aria-hidden
        >
          {selected ? <Check className="h-3 w-3" /> : null}
        </span>
      </span>
      {children}
    </button>
  );
}

export function ScheduleSetupFlow({
  initial,
  suggestedCrewSize,
  saving,
  error,
  hasShiftChanges,
  onSave,
  onCancel,
}: ScheduleSetupFlowProps) {
  const initialForm = useMemo(() => (initial ? formFromSchedule(initial) : null), [initial]);
  const isEdit = initial != null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const sectionRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    sectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);
  const [presetId, setPresetId] = useState<string | null>(initialForm ? initialForm.presetId : null);
  const [choiceId, setChoiceId] = useState<string | null>(() =>
    initialForm ? choiceIdForPreset(initialForm.presetId) : null,
  );
  const [showMore, setShowMore] = useState(choiceId === "more");
  const [customSteps, setCustomSteps] = useState<CustomStep[]>(() =>
    initialForm && !initialForm.presetId ? customStepsFromBlocks(initialForm.blocks) : DEFAULT_CUSTOM_STEPS,
  );
  const [timezone, setTimezone] = useState(initialForm?.timezone ?? deviceTimeZone());
  const [knownDate, setKnownDate] = useState(initialForm?.knownDate ?? "");
  const [knownBlockIndex, setKnownBlockIndex] = useState(initialForm?.knownBlockIndex ?? 0);
  const [startTime, setStartTime] = useState(initialForm?.startTime ?? SUGGESTED_START_TIME);
  const [startTimeTouched, setStartTimeTouched] = useState(isEdit);
  const [crewSize, setCrewSize] = useState(initialForm?.defaultCrewSize ?? suggestedCrewSize);

  const isCustom = choiceId === "custom";
  const customProblems = isCustom ? customPatternProblems(customSteps) : [];
  const blocks = useMemo(
    () =>
      isCustom
        ? customProblems.length
          ? []
          : blocksFromCustomSteps(customSteps)
        : (presetId ? getSchedulePreset(presetId)?.blocks : undefined) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCustom, presetId, customSteps, customProblems.length],
  );
  const workOptions = useMemo(() => workBlockOptions(blocks, startTime), [blocks, startTime]);

  useEffect(() => {
    if (workOptions.length && !workOptions.some((o) => o.blockIndex === knownBlockIndex)) {
      setKnownBlockIndex(workOptions[0]!.blockIndex);
    }
  }, [workOptions, knownBlockIndex]);

  const selectPreset = (id: string, choice: string) => {
    setChoiceId(choice);
    setPresetId(id);
    if (!startTimeTouched) setStartTime(getSchedulePreset(id)?.suggestedStartTime ?? SUGGESTED_START_TIME);
  };

  const selectChoice = (id: string) => {
    const choice = ROTATION_CHOICES.find((c) => c.id === id)!;
    if (choice.presetIds.length === 0) {
      setChoiceId("custom");
      setPresetId(null);
      return;
    }
    const keep = presetId && choice.presetIds.includes(presetId) ? presetId : choice.presetIds[0]!;
    selectPreset(keep, choice.id);
  };

  const crewValid =
    Number.isInteger(crewSize) && crewSize >= SCHEDULE_LIMITS.minCrewSize && crewSize <= SCHEDULE_LIMITS.maxCrewSize;
  const draft = useMemo(
    () =>
      blocks.length && knownDate && /^\d{2}:\d{2}$/.test(startTime) && crewValid
        ? scheduleFromForm({
            blocks,
            presetId: isCustom ? null : presetId,
            knownDate,
            knownBlockIndex,
            startTime,
            timezone,
            defaultCrewSize: crewSize,
          })
        : null,
    [blocks, isCustom, presetId, knownDate, knownBlockIndex, startTime, timezone, crewSize, crewValid],
  );
  const preview = useMemo(() => {
    if (!draft) return [];
    try {
      const now = new Date();
      const shifts = getShiftsInRange(draft, [], {
        from: new Date(now.getTime() - 86_400_000),
        to: new Date(now.getTime() + 60 * 86_400_000),
      });
      return upcomingShifts(shifts, now, 4);
    } catch {
      return [];
    }
  }, [draft]);

  const rotationShifted =
    !!initial &&
    !!draft &&
    (draft.anchorDate !== initial.anchorDate ||
      draft.startTime !== initial.startTime ||
      JSON.stringify(draft.blocks) !== JSON.stringify(initial.blocks));
  const step1Valid = blocks.length > 0;
  const step2Valid = !!knownDate && workOptions.some((o) => o.blockIndex === knownBlockIndex);
  const zones = useMemo(() => timeZoneOptions([timezone]), [timezone]);
  const today = localDateInZone(timezone, 0);
  const tomorrow = localDateInZone(timezone, 1);

  return (
    <section
      ref={sectionRef}
      className={cn(app.panel, "space-y-5 p-4 sm:p-5 scroll-mt-20")}
      data-testid="schedule-setup-flow"
    >
      <div className="flex items-center justify-between gap-3">
        <p className={app.eyebrowMuted}>Step {step} of 3</p>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="min-h-11 -mr-2">
            Cancel
          </Button>
        ) : null}
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className={app.titleCard}>What's your rotation?</h2>
            <p className={app.subtitle}>Pick the pattern you work. You can change it any time.</p>
          </div>

          <div role="radiogroup" aria-label="Rotation" className="space-y-2">
            {ROTATION_CHOICES.map((choice) => {
              const selected = choiceId === choice.id;
              const variants = presetsForChoice(choice);
              const single = variants.length === 1 ? variants[0] : undefined;
              return (
                <div key={choice.id} className="space-y-2">
                  <OptionCard
                    selected={selected}
                    onSelect={() => selectChoice(choice.id)}
                    title={choice.label}
                    description={choice.description}
                    testId={`schedule-choice-${choice.id}`}
                  >
                    {single ? <CycleStrip blocks={single.blocks} className="mt-3" /> : null}
                  </OptionCard>

                  {selected && variants.length > 1 ? (
                    <div role="radiogroup" aria-label={`${choice.label} options`} className="space-y-2 pl-3">
                      {variants.map((p) => (
                        <OptionCard
                          key={p.id}
                          selected={presetId === p.id}
                          onSelect={() => selectPreset(p.id, choice.id)}
                          title={p.label}
                          description={p.description}
                          testId={`schedule-preset-${p.id}`}
                        >
                          <CycleStrip blocks={p.blocks} className="mt-3" />
                        </OptionCard>
                      ))}
                    </div>
                  ) : null}

                  {selected && choice.id === "custom" ? (
                    <CustomPatternEditor steps={customSteps} onChange={setCustomSteps} problems={customProblems} />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={showMore}
            >
              More rotations
              <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} aria-hidden />
            </button>
            {showMore ? (
              <div role="radiogroup" aria-label="More rotations" className="space-y-2">
                {MORE_ROTATION_PRESET_IDS.map((id) => {
                  const p = getSchedulePreset(id)!;
                  return (
                    <OptionCard
                      key={id}
                      selected={choiceId === "more" && presetId === id}
                      onSelect={() => selectPreset(id, "more")}
                      title={p.label}
                      description={p.description}
                      testId={`schedule-preset-${id}`}
                    >
                      <CycleStrip blocks={p.blocks} className="mt-3" />
                    </OptionCard>
                  );
                })}
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            className="w-full min-h-11"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
            data-testid="schedule-step1-next"
          >
            Continue
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className={app.titleCard}>Pick a day you know you're working</h2>
            <p className={app.subtitle}>Any shift works — past or upcoming. We'll line the rotation up from it.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Today", value: today },
              { label: "Tomorrow", value: tomorrow },
            ].map((chip) => (
              <Button
                key={chip.label}
                type="button"
                variant={knownDate === chip.value ? "default" : "outline"}
                className="min-h-11 rounded-full"
                onClick={() => setKnownDate(chip.value)}
                aria-pressed={knownDate === chip.value}
              >
                {chip.label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-known-date">Or choose a date</Label>
            <Input
              id="schedule-known-date"
              type="date"
              value={knownDate}
              onChange={(e) => setKnownDate(e.target.value)}
              className="min-h-11"
              data-testid="schedule-known-date"
            />
          </div>

          {workOptions.length > 1 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Which shift in the rotation starts that day?</p>
              <div role="radiogroup" aria-label="Which shift" className="space-y-2">
                {workOptions.map((o) => (
                  <OptionCard
                    key={o.blockIndex}
                    selected={knownBlockIndex === o.blockIndex}
                    onSelect={() => setKnownBlockIndex(o.blockIndex)}
                    title={o.label}
                    testId={`schedule-known-block-${o.blockIndex}`}
                  />
                ))}
              </div>
              <p className={app.caption}>Times use your shift start ({startTime}); you can change it next.</p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              className="flex-1 min-h-11"
              disabled={!step2Valid}
              onClick={() => setStep(3)}
              data-testid="schedule-step2-next"
            >
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft) onSave(draft);
          }}
        >
          <div className="space-y-1">
            <h2 className={app.titleCard}>Shift details</h2>
            <p className={app.subtitle}>Check these match your hall.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-start-time">Shift start time</Label>
            <Input
              id="schedule-start-time"
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setStartTimeTouched(true);
              }}
              className="min-h-11"
              required
              data-testid="schedule-start-time"
            />
            {!startTimeTouched ? (
              <p className={app.caption}>{startTime} is just a suggestion — change it if your shift starts at a different time.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-timezone">Time zone</Label>
            <select
              id="schedule-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="schedule-timezone"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {timeZoneLabel(z)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-crew-size">Usual crew size</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={() => setCrewSize((n) => Math.max(SCHEDULE_LIMITS.minCrewSize, (n || 1) - 1))}
                aria-label="Fewer people"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="schedule-crew-size"
                type="number"
                inputMode="numeric"
                min={SCHEDULE_LIMITS.minCrewSize}
                max={SCHEDULE_LIMITS.maxCrewSize}
                value={Number.isFinite(crewSize) ? crewSize : ""}
                onChange={(e) => setCrewSize(e.target.value === "" ? NaN : Math.trunc(Number(e.target.value)))}
                className="min-h-11 w-20 text-center"
                data-testid="schedule-crew-size"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={() => setCrewSize((n) => Math.min(SCHEDULE_LIMITS.maxCrewSize, (n || 0) + 1))}
                aria-label="More people"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {!crewValid ? <p className="text-xs text-destructive">Enter 1–200 people.</p> : null}
          </div>

          {preview.length ? (
            <div className="space-y-2 rounded-2xl border border-border/45 bg-card/35 p-3" data-testid="schedule-preview">
              <p className={app.eyebrowMuted}>Your next shifts</p>
              <ul className="space-y-1">
                {preview.map((s) => (
                  <li key={s.key} className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{formatLocalDay(s.startLocal)}</span>
                    <span className="text-muted-foreground tabular-nums">{formatShiftTimes(s.startLocal, s.endLocal)}</span>
                  </li>
                ))}
              </ul>
              <p className={app.caption}>{describeCycle(blocks)}</p>
            </div>
          ) : null}

          {hasShiftChanges && rotationShifted ? (
            <p className="text-xs text-amber-300" data-testid="schedule-edit-warning">
              Changing the rotation or start time clears "Not working" and edited-shift changes. Extra shifts stay.
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 min-h-11"
              disabled={!draft || saving}
              data-testid="schedule-save"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Save schedule"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function CustomPatternEditor({
  steps,
  onChange,
  problems,
}: {
  steps: CustomStep[];
  onChange: (steps: CustomStep[]) => void;
  problems: string[];
}) {
  const update = (i: number, patch: Partial<CustomStep>) =>
    onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const valid = !problems.length;

  return (
    <div className="space-y-3 rounded-2xl border border-border/45 bg-card/20 p-3" data-testid="schedule-custom-editor">
      <p className="text-xs text-muted-foreground">Hours on and off, in order. The pattern repeats.</p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-border">
              {(["on", "off"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => update(i, { kind })}
                  aria-pressed={s.kind === kind}
                  className={cn(
                    "min-h-11 px-3 text-xs font-medium touch-manipulation",
                    s.kind === kind ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {kind === "on" ? "Work" : "Off"}
                </button>
              ))}
            </div>
            <Input
              type="number"
              inputMode="decimal"
              min={0.25}
              max={720}
              step={0.25}
              value={Number.isFinite(s.hours) ? s.hours : ""}
              onChange={(e) => update(i, { hours: e.target.value === "" ? NaN : Number(e.target.value) })}
              className="min-h-11 w-20 text-center"
              aria-label={`Step ${i + 1} hours`}
            />
            <span className="text-sm text-muted-foreground">h</span>
            {steps.length > 2 ? (
              <button
                type="button"
                onClick={() => onChange(steps.filter((_, idx) => idx !== i))}
                className="ml-auto grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                aria-label={`Remove step ${i + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {steps.length < 24 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => {
            const last = steps[steps.length - 1];
            onChange([...steps, { kind: last?.kind === "on" ? "off" : "on", hours: 24 }]);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add step
        </Button>
      ) : null}
      {valid ? (
        <>
          <CycleStrip blocks={blocksFromCustomSteps(steps)} />
          <p className={app.caption}>{describeCycle(blocksFromCustomSteps(steps))}</p>
        </>
      ) : (
        <ul className="space-y-0.5">
          {problems.map((p) => (
            <li key={p} className="text-xs text-destructive">
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
