import React, { useState } from 'react';

const DEFAULT_COLORS = [
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#8b5cf6', // purple-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#14b8a6', // teal-500
  '#64748b'  // slate-500
];

const DonutChart = ({
  data = [],
  title = '',
  centerText = '',
  centerSubtext = '',
  emptyText = 'कोणतीही माहिती उपलब्ध नाही (No Data Available)'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const validData = data.filter(d => Number(d.value || d.amount || 0) > 0);
  const total = validData.reduce((acc, d) => acc + Number(d.value || d.amount || 0), 0);

  if (!validData || validData.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-500 text-xs">
        <span>{emptyText}</span>
      </div>
    );
  }

  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke offsets
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
        <h4 className="font-semibold text-xs text-slate-200">{title}</h4>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 overflow-visible"
          >
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slices.map((slice, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Center Info Cutout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
            <span className="text-sm font-black font-mono text-white">
              {hoveredIdx !== null && slices[hoveredIdx]
                ? `₹${slices[hoveredIdx].val.toLocaleString('en-IN')}`
                : centerText || `₹${total.toLocaleString('en-IN')}`}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 max-w-[100px] truncate">
              {hoveredIdx !== null && slices[hoveredIdx]
                ? `${slices[hoveredIdx].percent}%`
                : centerSubtext || 'एकूण रक्कम'}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="w-full sm:w-auto flex-1 max-h-48 overflow-y-auto space-y-1.5 text-xs pr-1">
          {slices.map((slice, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? 'bg-slate-800' : 'hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-slate-300 truncate font-medium">
                    {slice.categoryNameMarathi || slice.label || slice.category}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-slate-100">
                    ₹{slice.val.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1.5">
                    ({slice.percent}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DonutChart;
