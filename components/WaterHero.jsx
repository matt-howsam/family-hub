import { Waves } from '@phosphor-icons/react/ssr';

/* Fills the space the kids' blocks leave empty on a non-school day — see
   docs/family-hub-home-screen-brief.md, "what fills the kids' space on a
   Saturday". Static until a surf/weather source is wired in. */
export default function WaterHero() {
  return (
    <div className="water">
      <div className="water__head">
        <div>
          <div className="water__label">On the water</div>
          <div className="water__title">Beach day</div>
          <div className="water__verdict">Light SE, clean</div>
        </div>
        <Waves size={56} className="water__icon" />
      </div>
      <div className="water__stats">
        <span>Water 21°</span>
        <span>1.2m E swell, 11s</span>
        <span>High 4:12pm · Low 10:38am</span>
      </div>
      <div className="water__note">Good for the tinny after lunch.</div>
    </div>
  );
}
