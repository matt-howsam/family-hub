'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft } from '@phosphor-icons/react/ssr';
import { foodIcon, FOOD_ICONS } from '@/lib/foodIcons';

const SHEET_IDLE_MS = 30000;
const VIEW_IDLE_MS = 60000;
const TOAST_MS = 8000;

const dayName = (dateStr) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'long' });
const dayShort = (dateStr) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-AU', {
    timeZone: 'UTC', day: 'numeric', month: 'short',
  });

async function post(body) {
  const res = await fetch('/api/planner', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json();
}

function NightCard({ card }) {
  if (!card) return <span className="mp-night__empty">Tap to plan</span>;
  const Icon = foodIcon(card.icon);
  return (
    <span className="mp-night__card">
      <Icon size={22} className="mp-night__icon" />
      <span className="mp-night__title">{card.title}</span>
    </span>
  );
}

function PickerSheet({ night, current, library, onPick, onClear, onClose }) {
  return (
    <div className="mp-sheet-backdrop" onClick={onClose}>
      <div className="mp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mp-sheet__title">{dayName(night)}</div>

        <div className="mp-sheet__label">Not cooking</div>
        <div className="mp-grid">
          {library.notCooking.map((c) => {
            const Icon = foodIcon(c.icon);
            return (
              <button
                key={c.id}
                className={`mp-card mp-card--not-cooking${c.id === current ? ' mp-card--current' : ''}`}
                onClick={() => onPick(c)}
              >
                <Icon size={26} className="mp-card__icon" />
                <span className="mp-card__title">{c.title}</span>
              </button>
            );
          })}
        </div>

        <div className="mp-sheet__label">Meals</div>
        {library.meals.length === 0 ? (
          <p style={{ color: 'var(--fh-ink-body)' }}>No meals yet. Add them from a phone.</p>
        ) : (
          <div className="mp-grid">
            {library.meals.map((c) => {
              const Icon = foodIcon(c.icon);
              return (
                <button
                  key={c.id}
                  className={`mp-card${c.id === current ? ' mp-card--current' : ''}`}
                  onClick={() => onPick(c)}
                >
                  <Icon size={26} className="mp-card__icon" />
                  <span className="mp-card__title">{c.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {current && <button className="mp-clear" onClick={onClear}>Clear this night</button>}
      </div>
    </div>
  );
}

function AddCardForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('CookingPot');
  const [kind, setKind] = useState('meal');
  const [prepNote, setPrepNote] = useState('');
  const [prepWhen, setPrepWhen] = useState('morning');

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(), icon, kind,
      prepNote: prepNote.trim() || null,
      prepWhen: prepNote.trim() ? prepWhen : null,
    });
    setTitle(''); setPrepNote('');
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="meal">Meal</option>
        <option value="not_cooking">Not cooking</option>
      </select>

      <div className="mp-sheet__label" style={{ padding: '0 0 var(--fh-space-3)' }}>Icon</div>
      <div className="mp-grid" style={{ marginBottom: 'var(--fh-space-4)' }}>
        {Object.entries(FOOD_ICONS).map(([name, Icon]) => (
          <button
            type="button"
            key={name}
            className={`mp-card${name === icon ? ' mp-card--current' : ''}`}
            onClick={() => setIcon(name)}
          >
            <Icon size={26} className="mp-card__icon" />
          </button>
        ))}
      </div>

      <input placeholder="Prep note (optional), e.g. Take the mince out"
             value={prepNote} onChange={(e) => setPrepNote(e.target.value)} />
      {prepNote.trim() && (
        <select value={prepWhen} onChange={(e) => setPrepWhen(e.target.value)}>
          <option value="morning">Morning of</option>
          <option value="night_before">Night before</option>
        </select>
      )}
      <button type="submit" className="mp-add__submit">Add card</button>
    </form>
  );
}

export default function PlannerScreen({
  todayKey, thisMonday, nextMonday, thisWeek, nextWeek, library, role, defaultWeek,
}) {
  const router = useRouter();
  const fridge = role === 'display';
  const [week, setWeek] = useState(defaultWeek);
  const [thisPlan, setThisPlan] = useState(thisWeek);
  const [nextPlan, setNextPlan] = useState(nextWeek);
  const [lib, setLib] = useState(library);
  const [pickerNight, setPickerNight] = useState(null);
  const [toast, setToast] = useState(null);

  const sheetTimer = useRef(null);
  const viewTimer = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    if (!fridge) return undefined;
    const arm = () => {
      clearTimeout(sheetTimer.current);
      clearTimeout(viewTimer.current);
      if (pickerNight) sheetTimer.current = setTimeout(() => setPickerNight(null), SHEET_IDLE_MS);
      viewTimer.current = setTimeout(() => router.push('/'), VIEW_IDLE_MS);
    };
    arm();
    window.addEventListener('pointerdown', arm);
    return () => {
      window.removeEventListener('pointerdown', arm);
      clearTimeout(sheetTimer.current);
      clearTimeout(viewTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fridge, pickerNight]);

  const plan = week === 'this' ? thisPlan : nextPlan;
  const setPlan = week === 'this' ? setThisPlan : setNextPlan;
  const monday = week === 'this' ? thisMonday : nextMonday;

  const showToast = (message, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  const writeNight = async (date, card, previous) => {
    setPlan((cur) => cur.map((n) => (n.date === date ? { ...n, card } : n)));
    if (card) await post({ action: 'set', night: date, cardId: card.id });
    else await post({ action: 'clear', night: date });

    showToast(card ? `${card.title} planned` : 'Cleared', async () => {
      setPlan((cur) => cur.map((n) => (n.date === date ? { ...n, card: previous } : n)));
      if (previous) await post({ action: 'set', night: date, cardId: previous.id });
      else await post({ action: 'clear', night: date });
    });
  };

  const openPicker = (night) => {
    if (night.date < todayKey) return; // past nights don't respond to touch
    setPickerNight(night);
  };

  const pick = (card) => {
    const night = pickerNight;
    setPickerNight(null);
    writeNight(night.date, card, night.card);
  };

  const clearCurrent = () => {
    const night = pickerNight;
    setPickerNight(null);
    writeNight(night.date, null, night.card);
  };

  const fillable = week === 'next'
    && thisPlan.some((n) => n.card)
    && nextPlan.some((n) => !n.card && n.date >= todayKey);

  const doFill = async () => {
    const before = nextPlan;
    const { filled } = await post({ action: 'fill', monday: nextMonday });
    if (!filled?.length) return;
    setNextPlan((cur) => cur.map((n) => {
      const f = filled.find((x) => x.date === n.date);
      if (!f) return n;
      const card = lib.meals.concat(lib.notCooking).find((c) => c.id === f.cardId) ?? null;
      return { ...n, card };
    }));
    showToast(`Filled ${filled.length} night${filled.length === 1 ? '' : 's'}`, async () => {
      setNextPlan(before);
      await Promise.all(filled.map((f) => post({ action: 'clear', night: f.date })));
    });
  };

  const addCard = async (card) => {
    await post({ action: 'addCard', card });
    setLib((cur) => {
      const list = card.kind === 'meal' ? 'meals' : 'notCooking';
      return { ...cur, [list]: [...cur[list], { ...card, id: `tmp-${Date.now()}` }] };
    });
    router.refresh();
  };

  const archiveCard = async (id) => {
    await post({ action: 'archiveCard', id });
    setLib((cur) => ({
      meals: cur.meals.filter((c) => c.id !== id),
      notCooking: cur.notCooking.filter((c) => c.id !== id),
    }));
  };

  return (
    <main className="mp-page">
      <Link className="wo-back" href="/" aria-label="Back to the wall"><ArrowLeft size={24} /></Link>
      <div className="mp-header">
        <span className="mp-header__title">Dinner</span>
      </div>

      <div className="mp-switch">
        <button className={`mp-switch__seg${week === 'this' ? ' mp-switch__seg--active' : ''}`} onClick={() => setWeek('this')}>
          This week
        </button>
        <button className={`mp-switch__seg${week === 'next' ? ' mp-switch__seg--active' : ''}`} onClick={() => setWeek('next')}>
          Next week
        </button>
      </div>

      {fillable && <button className="mp-fill" onClick={doFill}>Fill empty nights from last week</button>}

      <div className="mp-nights">
        {plan.map((night) => {
          const isPast = night.date < todayKey;
          const isToday = night.date === todayKey;
          if (isPast) {
            return (
              <div className={`mp-night mp-night--past`} key={night.date}>
                <div>
                  <div className="mp-night__day">{dayName(night.date)}</div>
                  <span className="mp-night__date">{dayShort(night.date)}</span>
                </div>
                <NightCard card={night.card} />
                <span />
              </div>
            );
          }
          return (
            <button
              className={`mp-night${isToday ? ' mp-night--today' : ''}`}
              key={night.date}
              onClick={() => openPicker(night)}
            >
              <div>
                <div className="mp-night__day">{dayName(night.date)}</div>
                <span className="mp-night__date">{dayShort(night.date)}</span>
              </div>
              <NightCard card={night.card} />
              <ArrowRight size={18} className="mp-night__arrow" />
            </button>
          );
        })}
      </div>

      {!fridge && (
        <div className="mp-library">
          <div className="mp-library__label">Library</div>
          <div className="mp-lib-cards">
            {lib.meals.concat(lib.notCooking).map((c) => {
              const Icon = foodIcon(c.icon);
              return (
                <div className="mp-lib-card" key={c.id}>
                  <Icon size={20} className="mp-lib-card__icon" />
                  <span>{c.title}</span>
                  <button className="mp-lib-archive" onClick={() => archiveCard(c.id)}>Archive</button>
                </div>
              );
            })}
          </div>
          <AddCardForm onAdd={addCard} />
        </div>
      )}

      {pickerNight && (
        <PickerSheet
          night={pickerNight.date}
          current={pickerNight.card?.id}
          library={lib}
          onPick={pick}
          onClear={clearCurrent}
          onClose={() => setPickerNight(null)}
        />
      )}

      {toast && (
        <div className="mp-toast">
          <span>{toast.message}</span>
          <button className="mp-toast__undo" onClick={() => { toast.undo(); setToast(null); }}>Undo</button>
        </div>
      )}
    </main>
  );
}
