/* Events from the Home calendar that don't belong to a child — theirs appear
   on their own cards. Unattributed and adult events land here. */
export default function DayCard({ today, ahead }) {
  if (!today.length && !ahead.length) return null;
  return (
    <>
      {today.length > 0 && (
        <>
          <h2 className="group">On today <span className="group__count">{today.length}</span></h2>
          <div className="card">
            {today.map((e) => (
              <div className="row" key={e.uid}>
                <span className="row__main">
                  <span className="row__title">{e.label}</span>
                  {e.location && <span className="row__sub">{e.location}</span>}
                </span>
                <span className="row__end">
                  <span className="row__meta">{e.allDay ? 'All day' : e.time}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {ahead.length > 0 && (
        <>
          <h2 className="group">Coming up <span className="group__count">{ahead.length}</span></h2>
          <div className="card">
            {ahead.map((e) => (
              <div className="row row--sunken" key={e.uid}>
                <span className="row__main">
                  <span className="row__title">{e.label}</span>
                </span>
                <span className="row__end">
                  <span className="row__meta">{e.when}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
