import { Waves } from '@phosphor-icons/react/ssr';

/* Fills the space the kids' blocks leave empty on a non-school day — see
   docs/family-hub-home-screen-brief.md, "what fills the kids' space on a
   Saturday". Real data from lib/conditions.js — no card at all beats a
   confidently wrong one, which is what shipped here first (see
   docs/reviews/family-hub-review-2026-09-12.md §2.5). */
export default function WaterHero({ conditions }) {
  if (!conditions) return null;
  const { headline, windDesc, swellDesc, rainMax, waterTemp, tideLevel, tideTrend, generatedAt } = conditions;
  const generatedTime = new Date(generatedAt).toLocaleTimeString('en-AU', {
    hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney',
  });

  return (
    <div className="water">
      <div className="water__head">
        <div>
          <div className="water__label">On the water</div>
          <div className="water__title">{headline}</div>
          {windDesc && <div className="water__verdict">{windDesc}</div>}
        </div>
        <Waves size={56} className="water__icon" />
      </div>
      <div className="water__stats">
        {waterTemp != null && <span>Water {waterTemp}°</span>}
        {swellDesc && <span>{swellDesc}</span>}
        <span>{rainMax}% chance of rain</span>
        {tideLevel && <span>Tide {tideLevel}m{tideTrend ? `, ${tideTrend}` : ''}</span>}
      </div>
      <span className="water__generated">As of {generatedTime}</span>
    </div>
  );
}
