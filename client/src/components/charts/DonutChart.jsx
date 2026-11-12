import React, { useState } from 'react';

const DEFAULT_COLORS = [
  '#ea580c', // orange-600
  '#0284c7', // sky-600
  '#059669', // emerald-600
  '#7c3aed', // violet-600
  '#d97706', // amber-600
  '#db2777', // pink-600
  '#2563eb', // blue-600
  '#0d9488', // teal-600
  '#475569'  // slate-600
];

const DonutChart = ({
  data = [],
  title = '',
  centerText = '',
  centerSubtext = '',
  emptyText = 'No data available'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const validData = data.filter(d => Number(d.value || d.amount || 0) > 0);
  const total = validData.reduce((acc, d) => acc + Number(d.value || d.amount || 0), 0);

  if (!validData || validData.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
        <span>{emptyText}</span>
      </div>
    );
  }

  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const slices = validData.map((item, idx) => {
    const val = Number(item.value || item.amount || 0);
    const percent = val / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return {
      ...item,
      color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      percent: Math.round(percent * 1000) / 10,
      strokeDasharray,
      strokeDashoffset,
      val
    };
  });

  return (
    <div className="w-full space-y-4">
      {title && (
        <h4 className="font-bold text-xs text-slate-900">{title}</h4>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
          >
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slices.map((slice, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hoveredIdx === i ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>

          {/* Center text in donut hole */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
            {hoveredIdx !== null && slices[hoveredIdx] ? (
              <>
                <span className="text-[11px] font-bold text-slate-900 truncate max-w-[100px]">
                  {slices[hoveredIdx].name || slices[hoveredIdx].label}
                </span>
                <span className="text-xs font-mono font-bold" style={{ color: slices[hoveredIdx].color }}>
                  {slices[hoveredIdx].percent}%
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {centerText || `₹${Math.round(total / 1000)}k`}
                </span>
                {centerSubtext && (
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                    {centerSubtext}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 max-h-48 overflow-y-auto space-y-1.5 text-xs pr-1">
          {slices.map((slice, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                hoveredIdx === i ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-slate-700 truncate text-[11px]">
                  {slice.name || slice.label}
                </span>
              </div>
              <div className="text-right shrink-0 font-mono text-[11px] text-slate-900">
                ₹{slice.val.toLocaleString('en-IN')}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({slice.percent}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DonutChart;
